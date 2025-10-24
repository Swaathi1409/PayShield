# Save this as backend/app.py and replace your existing file

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import joblib
import numpy as np
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PayShield Enhanced API", version="2.0.0")

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "payshield_fraud_detection")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
users_collection = db["users"]
accounts_collection = db["accounts"]
transactions_collection = db["transactions"]
alerts_collection = db["alerts"]
contacts_collection = db["contacts"]

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pay-shield.vercel.app",
    "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML models
try:
    model = joblib.load('fraud_detection_xgboost_model.pkl')
    scaler = joblib.load('fraud_detection_scaler.pkl')
    print("✅ ML Models loaded")
except Exception as e:
    print(f"⚠️ Models not loaded: {e}")
    model = None
    scaler = None

# ============= MODELS =============
class AccountCreate(BaseModel):
    account_number: str = Field(..., min_length=10, max_length=16)
    bank_name: str
    account_type: str
    expiry_date: str
    cardholder_name: str
    is_primary: bool = False

class ContactCreate(BaseModel):
    contact_name: str
    account_number: str
    bank_name: str
    nickname: Optional[str] = None

class EnhancedTransactionRequest(BaseModel):
    sender_account_id: Optional[str] = None  # ← ADD THIS LINE
    receiver_account: str
    receiver_bank: Optional[str] = None
    amount: float = Field(..., gt=0)
    payment_type: str
    cvv: str
    purpose: Optional[str] = "General"
    save_contact: bool = False
    contact_nickname: Optional[str] = None

class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    role: str
    name: str
    balance: float = 100000.0
    business_name: Optional[str] = None

class UserByEmail(BaseModel):
    email: str
    firebase_uid: str

class TransactionScoreRequest(BaseModel):
    amount: float = Field(..., gt=0)
    sender_balance: float
    receiver_balance: float = 0
    payment_type: str = "TRANSFER"
    transactions_24h: int = 0
    transactions_1h: int = 0

# ============= HELPER FUNCTIONS =============
def mask_account(account_number: str) -> str:
    """Mask account number for security"""
    if len(account_number) <= 4:
        return account_number
    return f"****{account_number[-4:]}"

def validate_expiry(expiry_date: str) -> bool:
    """Validate card expiry date (MM/YY format)"""
    try:
        month, year = map(int, expiry_date.split('/'))
        
        # Fix: Year is 2-digit (25 = 2025)
        if year < 100:
            year = 2000 + year
        
        # Get current date
        now = datetime.utcnow()
        current_year = now.year
        current_month = now.month
        
        # Card expires at END of expiry month
        if year > current_year:
            return True
        elif year == current_year and month >= current_month:
            return True
        else:
            return False
            
    except Exception as e:
        print(f"Expiry validation error: {e}")
        return False

async def validate_payment_details(account_number: str, cvv: str, expiry: str) -> dict:
    """
    Simulate payment gateway validation (Stripe, PayPal, etc.)
    In production, this would call actual payment gateway API
    Real gateways validate CVV without storing it
    
    For demo purposes:
    - Any 3-4 digit CVV is accepted (simulating successful gateway auth)
    - In production, the payment gateway validates CVV securely
    - CVV is NEVER stored in our database (PCI-DSS compliance)
    """
    try:
        # Validate CVV format
        if not cvv:
            return {"valid": False, "reason": "CVV is required"}
            
        if not cvv.isdigit():
            return {"valid": False, "reason": "CVV must be numeric"}
            
        if len(cvv) < 3 or len(cvv) > 4:
            return {"valid": False, "reason": "CVV must be 3 or 4 digits"}
        
        # Validate expiry
        if not validate_expiry(expiry):
            return {"valid": False, "reason": "Card has expired"}
        
        # Simulate payment gateway authorization
        # In real systems: stripe.PaymentIntent.create(amount, card_token)
        # The gateway validates CVV against the card network (Visa/Mastercard/etc)
        # and returns success/failure WITHOUT revealing if CVV was wrong
        
        # For demo: Accept all valid format CVVs
        # In production: Gateway does cryptographic validation
        print(f"✅ Payment gateway validated CVV format: {len(cvv)} digits")
        return {"valid": True, "reason": "Payment authorized by gateway"}
        
    except Exception as e:
        print(f"❌ Payment gateway error: {e}")
        return {"valid": False, "reason": "Payment gateway error"}
    
async def get_device_info(user_agent: str) -> dict:
    return {
        "user_agent": user_agent or "Unknown",
        "device_type": "mobile" if user_agent and "Mobile" in user_agent else "desktop",
        "browser": "chrome" if user_agent and "Chrome" in user_agent else "other"
    }

async def calculate_velocity_features(user_id: str) -> dict:
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_1h = now - timedelta(hours=1)
    
    txn_24h = await transactions_collection.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": last_24h}
    })
    
    txn_1h = await transactions_collection.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": last_1h}
    })
    
    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": last_24h}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    volume_result = await transactions_collection.aggregate(pipeline).to_list(1)
    volume_24h = volume_result[0]["total"] if volume_result else 0
    
    return {
        "transactions_24h": txn_24h,
        "transactions_1h": txn_1h,
        "volume_24h": volume_24h,
        "high_velocity": txn_1h > 5 or txn_24h > 20
    }

async def check_blacklist(account_number: str) -> bool:
    blacklist = await db.blacklist.find_one({"account_number": account_number})
    return blacklist is not None

# ============= HEALTH CHECK =============
@app.get("/")
async def root():
    return {"message": "PayShield API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    try:
        await users_collection.find_one({})
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# ============= USER ENDPOINTS =============
@app.post("/api/user/create")
async def create_user(user_data: UserCreate):
    try:
        existing = await users_collection.find_one({"email": user_data.email})
        if existing:
            existing["_id"] = str(existing["_id"])
            return {"user": existing}
        
        user_dict = {
            "firebase_uid": user_data.firebase_uid,
            "email": user_data.email,
            "role": user_data.role,
            "name": user_data.name,
            "balance": user_data.balance,
            "business_name": user_data.business_name,
            "status": "active",
            "created_at": datetime.utcnow()
        }
        
        result = await users_collection.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        
        return {"user": user_dict, "message": "User created successfully"}
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/by-email")
async def get_user_by_email(request: UserByEmail):
    try:
        # Find user by email only
        user = await users_collection.find_one({"email": request.email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ObjectId to string
        user["_id"] = str(user["_id"])
        
        # Update firebase_uid if missing or different (only during login flow)
        # This is acceptable because Firebase already authenticated the user
        if request.firebase_uid and (not user.get("firebase_uid") or user.get("firebase_uid") != request.firebase_uid):
            await users_collection.update_one(
                {"email": request.email},
                {"$set": {"firebase_uid": request.firebase_uid}}
            )
            user["firebase_uid"] = request.firebase_uid
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= ACCOUNT ENDPOINTS =============
@app.post("/api/accounts/create")
async def create_account(account: AccountCreate, authorization: str = Header(None)):
    try:
        print(f"📥 Received account creation request for: {authorization}")
        
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            print(f"❌ User not found: {user_email}")
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"✅ User found: {user['email']}")
        
        # Check if account already exists
        existing = await accounts_collection.find_one({
            "user_id": str(user["_id"]),
            "account_number": account.account_number
        })
        
        if existing:
            print(f"⚠️ Account already exists: {account.account_number}")
            raise HTTPException(status_code=400, detail="Account already exists")
        
        # Create account (CVV NOT STORED - PCI-DSS compliance)
        account_data = {
            "user_id": str(user["_id"]),
            "account_number": account.account_number,
            "bank_name": account.bank_name,
            "account_type": account.account_type,
            "expiry_date": account.expiry_date,
            "cardholder_name": account.cardholder_name,
            "is_primary": account.is_primary,
            "balance": user.get("balance", 100000.0),
            "status": "active",
            "created_at": datetime.utcnow()
            # CVV intentionally NOT stored
        }
        
        result = await accounts_collection.insert_one(account_data)
        account_data["_id"] = str(result.inserted_id)
        account_data["account_number"] = mask_account(account_data["account_number"])
        
        print(f"✅ Account created successfully: {account_data['_id']}")
        return {"message": "Account created", "account": account_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating account: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/accounts/list")
async def list_accounts(authorization: str = Header(None)):
    try:
        print(f"📥 Fetching accounts for: {authorization}")
        
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            print(f"❌ User not found: {user_email}")
            raise HTTPException(status_code=404, detail="User not found")
        
        cursor = accounts_collection.find({"user_id": str(user["_id"])})
        accounts = await cursor.to_list(length=100)
        
        for acc in accounts:
            acc["_id"] = str(acc["_id"])
            acc["account_number"] = mask_account(acc["account_number"])
            acc.pop("cvv", None)
        
        print(f"✅ Found {len(accounts)} accounts")
        return {"accounts": accounts}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error listing accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= CONTACT ENDPOINTS =============
@app.post("/api/contacts/create")
async def create_contact(contact: ContactCreate, authorization: str = Header(None)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        contact_data = {
            "user_id": str(user["_id"]),
            "contact_name": contact.contact_name,
            "account_number": contact.account_number,
            "bank_name": contact.bank_name,
            "nickname": contact.nickname or contact.contact_name,
            "created_at": datetime.utcnow()
        }
        
        result = await contacts_collection.insert_one(contact_data)
        contact_data["_id"] = str(result.inserted_id)
        
        return {"message": "Contact saved", "contact": contact_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/contacts/list")
async def list_contacts(authorization: str = Header(None)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cursor = contacts_collection.find({"user_id": str(user["_id"])})
        contacts = await cursor.to_list(length=100)
        
        for contact in contacts:
            contact["_id"] = str(contact["_id"])
        
        return {"contacts": contacts}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= TRANSACTION ENDPOINTS =============
@app.post("/api/v1/transactions/score")
async def calculate_transaction_score(request: TransactionScoreRequest):
    """
    Calculate fraud risk score for testing purposes
    Used by Developer Dashboard to test the ML model
    """
    try:
        # Calculate derived features
        sender_balance_after = request.sender_balance - request.amount
        receiver_balance_after = request.receiver_balance + request.amount
        
        drain_pct = (request.amount / request.sender_balance * 100) if request.sender_balance > 0 else 0
        
        # Business rule validation
        risk_factors = []
        rule_score = 0.0
        
        # Rule 1: Insufficient funds
        if request.amount > request.sender_balance:
            risk_factors.append(f"Insufficient funds: ${request.sender_balance:.2f} available, ${request.amount:.2f} requested")
            rule_score = 1.0
        
        # Rule 2: High velocity
        high_velocity = request.transactions_1h > 5 or request.transactions_24h > 20
        if high_velocity:
            risk_factors.append(f"High velocity: {request.transactions_1h} txns/hour, {request.transactions_24h} txns/day")
            rule_score = max(rule_score, 0.65)
        
        # Rule 3: Account drain
        if drain_pct > 90:
            risk_factors.append(f"Critical account drain: {drain_pct:.1f}%")
            rule_score = max(rule_score, 0.75)
        elif drain_pct > 70:
            risk_factors.append(f"High account drain: {drain_pct:.1f}%")
            rule_score = max(rule_score, 0.55)
        
        # Rule 4: Large transaction
        if request.amount > 50000:
            risk_factors.append(f"Large transaction: ${request.amount:,.2f}")
            rule_score = max(rule_score, 0.4)
        
        # Rule 5: Cash-out pattern
        if request.payment_type == 'CASH_OUT' and request.amount > 10000:
            risk_factors.append("Large cash-out transaction")
            rule_score = max(rule_score, 0.5)
        
        # ML Model prediction
        ml_score = 0.0
        
        if model and scaler:
            try:
                # Prepare features (same 22 features as training)
                features = np.array([[
                    request.amount,
                    request.sender_balance,
                    sender_balance_after,
                    request.receiver_balance,
                    receiver_balance_after,
                    request.amount / request.sender_balance if request.sender_balance > 0 else 0,
                    1 if request.payment_type == 'TRANSFER' else 0,
                    1 if request.payment_type == 'CASH_OUT' else 0,
                    1 if request.payment_type == 'PAYMENT' else 0,
                    1 if request.payment_type == 'DEBIT' else 0,
                    1 if request.payment_type == 'CASH_IN' else 0,
                    request.transactions_24h,
                    request.transactions_1h,
                    request.amount * request.transactions_24h,  # volume_24h approximation
                    drain_pct / 100,
                    1 if drain_pct > 90 else 0,
                    1 if drain_pct > 70 else 0,
                    1 if request.transactions_1h > 5 else 0,
                    1 if request.transactions_24h > 20 else 0,
                    abs(request.sender_balance - request.receiver_balance) / max(request.sender_balance, request.receiver_balance, 1),
                    1 if request.amount > 50000 else 0,
                    np.log1p(request.amount)
                ]])
                
                features_scaled = scaler.transform(features)
                ml_prediction = model.predict_proba(features_scaled)[0]
                ml_score = float(ml_prediction[1])
                
                print(f"✅ ML Model score: {ml_score:.3f}")
                
            except Exception as e:
                print(f"⚠️ ML prediction error: {e}")
                ml_score = 0.0
        
        
        # ===== FINAL DECISION: HYBRID SCORING =====
        # Strategy: Trust business rules when they say it's safe, even if ML disagrees
        
        if rule_score >= 0.3:
            # Business rules detected real issues → use maximum (conservative)
            final_score = max(rule_score, ml_score)
            print(f"⚙️ Conservative mode: Business rules flagged risk (rule={rule_score:.3f}, ml={ml_score:.3f}) → final={final_score:.3f}")
        
        elif ml_score > 0.5:
            # Business rules say SAFE (< 0.3) but ML suspicious (> 0.5)
            # Use weighted average: trust business rules MORE (60%) than ML 40%)
            final_score = (rule_score * 0.6) + (ml_score * 0.4)
            print(f"⚙️ Weighted scoring: Business rules safe (rule={rule_score:.3f}), ML suspicious (ml={ml_score:.3f}) → final={final_score:.3f}")
        
        else:
            # Both agree it's safe (rule < 0.3, ml <= 0.5)
            final_score = max(rule_score, ml_score)
            print(f"✅ Both systems agree: safe transaction (rule={rule_score:.3f}, ml={ml_score:.3f}) → final={final_score:.3f}")
            
        '''
        if rule_score < 0.3 and ml_score > 0.7:
            # ML thinks it's fraud, but business rules are OK
            # Use weighted average instead of maximum
            final_score = (rule_score * 0.75) + (ml_score * 0.25)
            print(f"⚙️ Applying weighted scoring: Business rules look OK, ML is suspicious")
        else:
            # Otherwise use maximum (conservative approach)
            final_score = max(rule_score, ml_score)
        '''

        # Determine decision
        if final_score > 0.7:
            decision = "BLOCK"
            risk_level = "CRITICAL"
        elif final_score > 0.5:
            decision = "REVIEW"
            risk_level = "HIGH"
        elif final_score > 0.3:
            decision = "REVIEW"
            risk_level = "MEDIUM"
        else:
            decision = "APPROVE"
            risk_level = "LOW"
        
        if not risk_factors:
            risk_factors.append("No specific risk factors detected")
        
        return {
            "decision": decision,
            "risk_level": risk_level,
            "risk_score": final_score,
            "ml_score": ml_score,
            "rule_score": rule_score,
            "risk_factors": risk_factors,
            "message": f"Transaction would be {decision.lower()}ed",
            "features": {
                "amount": request.amount,
                "sender_balance": request.sender_balance,
                "receiver_balance": request.receiver_balance,
                "amount_to_balance_ratio": request.amount / request.sender_balance if request.sender_balance > 0 else 0,
                "drain_percentage": drain_pct,
                "transactions_24h": request.transactions_24h,
                "transactions_1h": request.transactions_1h,
                "high_velocity": high_velocity
            }
        }
        
    except Exception as e:
        print(f"❌ Error calculating score: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/v2/transactions/process")
async def process_enhanced_transaction(
    txn: EnhancedTransactionRequest,
    authorization: str = Header(None),
    user_agent: str = Header(None)
):
    try:
        transaction_id = f"TXN{uuid.uuid4().hex[:12].upper()}"
        timestamp = datetime.utcnow()
        
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # ===== FIX: Use specific account if provided, otherwise use primary =====
        if hasattr(txn, 'sender_account_id') and txn.sender_account_id:
            # User explicitly selected an account
            from bson import ObjectId
            sender_account = await accounts_collection.find_one({
                "_id": ObjectId(txn.sender_account_id),
                "user_id": str(user["_id"])
            })
            if not sender_account:
                raise HTTPException(status_code=404, detail="Selected account not found")
        else:
            # Fallback to primary account (for backward compatibility)
            sender_account = await accounts_collection.find_one({
                "user_id": str(user["_id"]),
                "is_primary": True
            })
        
        if not sender_account:
            raise HTTPException(status_code=404, detail="No payment account found")
        
        # ===== PAYMENT GATEWAY VALIDATION (Simulated) =====
        payment_validation = await validate_payment_details(
            sender_account["account_number"],
            txn.cvv,
            sender_account["expiry_date"]
        )
        
        if not payment_validation["valid"]:
            return {
                "transaction_id": transaction_id,
                "decision": "BLOCK",
                "risk_level": "CRITICAL",
                "message": f"Payment declined: {payment_validation['reason']}",
                "risk_score": 1.0,
                "risk_factors": [payment_validation["reason"]]
            }
        
        # ===== BLACKLIST CHECK =====
        if await check_blacklist(txn.receiver_account):
            return {
                "transaction_id": transaction_id,
                "decision": "BLOCK",
                "risk_level": "CRITICAL",
                "message": "Receiver account blacklisted",
                "risk_score": 1.0,
                "risk_factors": ["Receiver account is blacklisted"]
            }
        
        # ===== CALCULATE VELOCITY FROM DATABASE =====
        velocity = await calculate_velocity_features(str(user["_id"]))
        
        # Get device info
        device_info = await get_device_info(user_agent)
        
        # Calculate balances
        sender_balance_before = sender_account["balance"]
        sender_balance_after = sender_balance_before - txn.amount
        
        # Get receiver account
        receiver_account = await accounts_collection.find_one({
            "account_number": txn.receiver_account
        })
        receiver_balance_before = receiver_account["balance"] if receiver_account else 0
        receiver_balance_after = receiver_balance_before + txn.amount
        
        # ===== BUSINESS RULE VALIDATION =====
        risk_factors = []
        rule_score = 0.0
        is_critical = False
        
        # Rule 1: Insufficient funds (CRITICAL)
        if txn.amount > sender_balance_before:
            risk_factors.append(f"Insufficient funds: ${sender_balance_before:.2f} available, ${txn.amount:.2f} requested")
            rule_score = 1.0
            is_critical = True
        
        # Rule 2: High velocity
        if velocity["high_velocity"]:
            risk_factors.append(f"High transaction velocity: {velocity['transactions_1h']} txns in last hour, {velocity['transactions_24h']} in last 24h")
            rule_score = max(rule_score, 0.65)
        
        # Rule 3: High account drain
        drain_pct = (txn.amount / sender_balance_before) * 100 if sender_balance_before > 0 else 0
        if drain_pct > 90:
            risk_factors.append(f"Critical account drain: {drain_pct:.1f}% of balance")
            rule_score = max(rule_score, 0.75)
        elif drain_pct > 70:
            risk_factors.append(f"High account drain: {drain_pct:.1f}% of balance")
            rule_score = max(rule_score, 0.55)
        # 3.3: Moderate drain (>50%) - Warning level
        elif drain_pct > 50:
            risk_factors.append(f"Moderate account drain: {drain_pct:.1f}% of balance")
            rule_score = max(rule_score, 0.35)
        
        # Rule 4: Large transaction
        # 3.4: Large absolute amount (even if percentage is low)
        if txn.amount > 75000:
            risk_factors.append(f"Very large transaction amount: ${txn.amount:,.2f}")
            rule_score = max(rule_score, 0.6)
        if txn.amount > 50000:
            risk_factors.append(f"Large transaction amount: ${txn.amount:,.2f}")
            rule_score = max(rule_score, 0.4)
        
        # Rule 5: Unusual transaction pattern
        if txn.payment_type == 'CASH_OUT' and txn.amount > 10000:
            risk_factors.append("Large cash-out transaction")
            rule_score = max(rule_score, 0.5)
        
        # ===== ML MODEL PREDICTION =====
        ml_score = 0.0
        ml_features = None
        
        if model and scaler:
            try:
                features = np.array([[
                    txn.amount,
                    sender_balance_before,
                    sender_balance_after,
                    receiver_balance_before,
                    receiver_balance_after,
                    txn.amount / sender_balance_before if sender_balance_before > 0 else 0,
                    1 if txn.payment_type == 'TRANSFER' else 0,
                    1 if txn.payment_type == 'CASH_OUT' else 0,
                    1 if txn.payment_type == 'PAYMENT' else 0,
                    1 if txn.payment_type == 'DEBIT' else 0,
                    1 if txn.payment_type == 'CASH_IN' else 0,
                    velocity['transactions_24h'],
                    velocity['transactions_1h'],
                    velocity['volume_24h'],
                    drain_pct / 100,
                    1 if drain_pct > 90 else 0,
                    1 if drain_pct > 70 else 0,
                    1 if velocity['transactions_1h'] > 5 else 0,
                    1 if velocity['transactions_24h'] > 20 else 0,
                    abs(sender_balance_before - receiver_balance_before) / max(sender_balance_before, receiver_balance_before, 1),
                    1 if txn.amount > 50000 else 0,
                    np.log1p(txn.amount)
                ]])
                
                features_scaled = scaler.transform(features)
                ml_prediction = model.predict_proba(features_scaled)[0]
                ml_score = float(ml_prediction[1])
                
                ml_features = {
                    "amount": txn.amount,
                    "sender_balance": sender_balance_before,
                    "drain_percentage": drain_pct,
                    "transactions_24h": velocity['transactions_24h'],
                    "transactions_1h": velocity['transactions_1h']
                }
                
                print(f"✅ ML Model prediction: {ml_score:.3f}")
                
            except Exception as e:
                print(f"⚠️ ML prediction error: {e}")
                ml_score = 0.0
        else:
            print("⚠️ ML Model not loaded, using business rules only")
        
        # ===== FINAL DECISION =====
        # Business rules override: If rule_score is low and ML is high, be lenient
        if rule_score >= 0.3:
            # Business rules detected real issues → use maximum (conservative)
            final_score = max(rule_score, ml_score)
            print(f"⚙️ Conservative mode: Business rules flagged risk (rule={rule_score:.3f}, ml={ml_score:.3f}) → final={final_score:.3f}")
        
        elif ml_score > 0.5:
            # Business rules say SAFE (< 0.3) but ML suspicious (> 0.5)
            # Use weighted average: trust business rules MORE 60%) than ML (40%)
            final_score = (rule_score * 0.6) + (ml_score * 0.4)
            print(f"⚙️ Weighted scoring: Business rules safe (rule={rule_score:.3f}), ML suspicious (ml={ml_score:.3f}) → final={final_score:.3f}")
        
        else:
            # Both agree it's safe (rule < 0.3, ml <= 0.5)
            final_score = max(rule_score, ml_score)
            print(f"✅ Both systems agree: safe transaction (rule={rule_score:.3f}, ml={ml_score:.3f}) → final={final_score:.3f}")

        print(f"""
        ╔═══════════════════════════════════════╗
        ║     TRANSACTION RISK ANALYSIS         ║
        ╠═══════════════════════════════════════╣
        ║ Amount:        ${txn.amount:>20,.2f} ║
        ║ Balance:       ${sender_balance_before:>20,.2f} ║
        ║ Drain:         {drain_pct:>20.1f}% ║
        ║ Velocity 1h:   {velocity['transactions_1h']:>20} ║
        ║ Velocity 24h:  {velocity['transactions_24h']:>20} ║
        ║ Rule Score:    {rule_score:>20.3f} ║
        ║ ML Score:      {ml_score:>20.3f} ║
        ║ Final Score:   {final_score:>20.3f} ║
        ╚═══════════════════════════════════════╝
        """)

        if is_critical or final_score > 0.7:
            decision = "BLOCK"
            risk_level = "CRITICAL"
        elif final_score > 0.5:
            decision = "REVIEW"
            risk_level = "HIGH"
        elif final_score > 0.3:
            decision = "REVIEW"
            risk_level = "MEDIUM"
        else:
            decision = "APPROVE"
            risk_level = "LOW"
        
        if not risk_factors and decision != "APPROVE":
            risk_factors.append("ML model detected suspicious patterns")
        
        # ===== SAVE TRANSACTION =====
        transaction_data = {
            "transaction_id": transaction_id,
            "user_id": str(user["_id"]),
            "email": user["email"],
            "sender_account": str(sender_account["_id"]),
            "receiver_account": txn.receiver_account,
            "amount": txn.amount,
            "payment_type": txn.payment_type,
            "purpose": txn.purpose,
            "decision": decision,
            "risk_level": risk_level,
            "risk_score": final_score,
            "rule_score": rule_score,
            "ml_score": ml_score,
            "risk_factors": risk_factors,
            "velocity_features": velocity,
            "device_info": device_info,
            "ml_features": ml_features,
            "timestamp": timestamp
        }
        
        await transactions_collection.insert_one(transaction_data)
        
        # ===== UPDATE BALANCES IF APPROVED =====
        if decision == "APPROVE":
            from bson import ObjectId
            await accounts_collection.update_one(
                {"_id": ObjectId(str(sender_account["_id"]))},
                {"$inc": {"balance": -txn.amount}}
            )
            if receiver_account:
                await accounts_collection.update_one(
                    {"_id": receiver_account["_id"]},
                    {"$inc": {"balance": txn.amount}}
                )
        
        # ===== SAVE CONTACT IF REQUESTED =====
        if txn.save_contact and decision == "APPROVE":
            await contacts_collection.insert_one({
                "user_id": str(user["_id"]),
                "account_number": txn.receiver_account,
                "bank_name": txn.receiver_bank,
                "nickname": txn.contact_nickname or "Saved Contact",
                "created_at": timestamp
            })
        
        # ===== CREATE ALERT IF NEEDED =====
        if decision in ["BLOCK", "REVIEW"]:
            await alerts_collection.insert_one({
                "transaction_id": transaction_id,
                "user_id": str(user["_id"]),
                "decision": decision,
                "risk_level": risk_level,
                "risk_score": final_score,
                "risk_factors": risk_factors,
                "amount": txn.amount,
                "timestamp": timestamp
            })
        
        return {
            "transaction_id": transaction_id,
            "decision": decision,
            "risk_level": risk_level,
            "risk_score": final_score,
            "rule_score": rule_score,
            "ml_score": ml_score,
            "risk_factors": risk_factors if risk_factors else ["No specific risk factors detected"],
            "message": f"Transaction {decision.lower()}ed",
            "new_balance": sender_balance_after if decision == "APPROVE" else sender_balance_before
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error processing transaction: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# ============= ANALYTICS ENDPOINTS =============
# Replace the get_dashboard_stats function in backend/app.py (around line 490)

@app.get("/api/v2/analytics/dashboard")
async def get_dashboard_stats():
    try:
        # Total counts (all transactions are logged for auditing)
        total_txns = await transactions_collection.count_documents({})
        blocked = await transactions_collection.count_documents({"decision": "BLOCK"})
        approved = await transactions_collection.count_documents({"decision": "APPROVE"})
        review = await transactions_collection.count_documents({"decision": "REVIEW"})
        
        # ===== FIX: Only count APPROVED transactions in volume =====
        pipeline = [
            {"$match": {"decision": "APPROVE"}},  # ← ADDED THIS LINE
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        volume_result = await transactions_collection.aggregate(pipeline).to_list(1)
        total_volume = volume_result[0]["total"] if volume_result else 0
        
        # Calculate average only from approved transactions
        avg_txn = total_volume / approved if approved > 0 else 0
        
        # Fraud detection rate (blocked out of total attempts)
        fraud_rate = (blocked / total_txns * 100) if total_txns > 0 else 0
        
        active_users = await users_collection.count_documents({"status": {"$ne": "suspended"}})
        total_accounts = await accounts_collection.count_documents({})
        
        return {
            "overview": {
                "total_transactions": total_txns,
                "total_volume": round(total_volume, 2),  # Only approved transactions
                "average_transaction": round(avg_txn, 2),  # Only approved transactions
                "fraud_detection_rate": round(fraud_rate, 2),
                "active_users": active_users,
                "total_accounts": total_accounts
            },
            "decisions": {
                "approved": approved,
                "blocked": blocked,
                "under_review": review
            }
        }
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v2/transactions/history")
async def get_user_transactions(
    authorization: str = Header(None),
    limit: int = 20
):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        user_email = authorization
        user = await users_collection.find_one({"email": user_email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cursor = transactions_collection.find({
            "user_id": str(user["_id"])
        }).sort("timestamp", -1).limit(limit)
        
        transactions = await cursor.to_list(length=limit)
        for txn in transactions:
            txn["_id"] = str(txn["_id"])
        
        return {"transactions": transactions}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/transactions/history")
async def get_all_transactions_v1(limit: int = 20):
    try:
        cursor = transactions_collection.find({}).sort("timestamp", -1).limit(limit)
        transactions = await cursor.to_list(length=limit)
        
        for txn in transactions:
            txn["_id"] = str(txn["_id"])
        
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add this new endpoint to backend/app.py (after the transaction endpoints, around line 700)

from bson import ObjectId

@app.post("/api/v2/transactions/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: str,
    authorization: str = Header(None)
):
    """
    Admin endpoint to manually approve a transaction that was under REVIEW
    Updates balances and changes transaction status to APPROVED
    """
    try:
        # Verify admin authorization
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        admin_user = await users_collection.find_one({"email": authorization})
        if not admin_user or admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find the transaction
        transaction = await transactions_collection.find_one({"transaction_id": transaction_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Check if transaction is eligible for approval
        if transaction["decision"] == "APPROVE":
            return {
                "success": False,
                "message": "Transaction already approved",
                "transaction_id": transaction_id
            }
        
        if transaction["decision"] == "BLOCK":
            raise HTTPException(
                status_code=400, 
                detail="Cannot approve blocked transaction. Security policy prevents this."
            )
        
        # Only REVIEW status can be approved
        if transaction["decision"] != "REVIEW":
            raise HTTPException(
                status_code=400,
                detail=f"Transaction status is {transaction['decision']}, only REVIEW status can be approved"
            )
        
        # Get sender account
        sender_account = await accounts_collection.find_one({"_id": ObjectId(transaction["sender_account"])})
        if not sender_account:
            raise HTTPException(status_code=404, detail="Sender account not found")
        
        # Check if sender still has sufficient balance
        if sender_account["balance"] < transaction["amount"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Current balance: ${sender_account['balance']}, Required: ${transaction['amount']}"
            )
        
        # Get receiver account (internal or external)
        receiver_account = await accounts_collection.find_one({
            "account_number": transaction["receiver_account"]
        })
        
        # ===== UPDATE BALANCES =====
        # Deduct from sender
        await accounts_collection.update_one(
            {"_id": ObjectId(transaction["sender_account"])},
            {
                "$inc": {"balance": -transaction["amount"]},
                "$set": {"last_transaction": datetime.utcnow()}
            }
        )
        
        # Add to receiver (if internal account exists)
        if receiver_account:
            await accounts_collection.update_one(
                {"_id": receiver_account["_id"]},
                {
                    "$inc": {"balance": transaction["amount"]},
                    "$set": {"last_transaction": datetime.utcnow()}
                }
            )
        
        # ===== UPDATE TRANSACTION STATUS =====
        await transactions_collection.update_one(
            {"transaction_id": transaction_id},
            {
                "$set": {
                    "decision": "APPROVE",
                    "risk_level": "ADMIN_APPROVED",
                    "approved_by": authorization,
                    "approved_at": datetime.utcnow(),
                    "original_risk_score": transaction.get("risk_score"),
                    "approval_note": "Manually approved by admin"
                }
            }
        )
        
        # ===== REMOVE FROM ALERTS =====
        await alerts_collection.delete_many({"transaction_id": transaction_id})
        
        # Get updated balance
        updated_sender = await accounts_collection.find_one({"_id": ObjectId(transaction["sender_account"])})
        new_balance = updated_sender["balance"] if updated_sender else 0
        
        print(f"""
        ╔═══════════════════════════════════════╗
        ║    TRANSACTION MANUALLY APPROVED      ║
        ╠═══════════════════════════════════════╣
        ║ Transaction ID: {transaction_id:<19} ║
        ║ Amount:        ${transaction['amount']:>20,.2f} ║
        ║ New Balance:   ${new_balance:>20,.2f} ║
        ║ Approved By:   {authorization:<20} ║
        ╚═══════════════════════════════════════╝
        """)
        
        return {
            "success": True,
            "message": "Transaction approved successfully",
            "transaction_id": transaction_id,
            "amount": transaction["amount"],
            "new_sender_balance": new_balance,
            "receiver_credited": receiver_account is not None,
            "approved_by": authorization,
            "approved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error approving transaction: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/transactions/{transaction_id}/reject")
async def reject_transaction(
    transaction_id: str,
    authorization: str = Header(None)
):
    """
    Admin endpoint to manually reject a transaction that was under REVIEW
    No balance changes occur
    """
    try:
        # Verify admin authorization
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        admin_user = await users_collection.find_one({"email": authorization})
        if not admin_user or admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find the transaction
        transaction = await transactions_collection.find_one({"transaction_id": transaction_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction["decision"] != "REVIEW":
            raise HTTPException(
                status_code=400,
                detail=f"Can only reject transactions under REVIEW status"
            )
        
        # Update transaction to BLOCK
        await transactions_collection.update_one(
            {"transaction_id": transaction_id},
            {
                "$set": {
                    "decision": "BLOCK",
                    "risk_level": "ADMIN_REJECTED",
                    "rejected_by": authorization,
                    "rejected_at": datetime.utcnow(),
                    "rejection_note": "Manually rejected by admin"
                }
            }
        )
        
        # Update alert
        await alerts_collection.update_one(
            {"transaction_id": transaction_id},
            {
                "$set": {
                    "decision": "BLOCK",
                    "rejected_by": authorization,
                    "rejected_at": datetime.utcnow()
                }
            }
        )
        
        print(f"""
        ╔═══════════════════════════════════════╗
        ║    TRANSACTION MANUALLY REJECTED      ║
        ╠═══════════════════════════════════════╣
        ║ Transaction ID: {transaction_id:<19} ║
        ║ Amount:        ${transaction['amount']:>20,.2f} ║
        ║ Rejected By:   {authorization:<20} ║
        ╚═══════════════════════════════════════╝
        """)
        
        return {
            "success": True,
            "message": "Transaction rejected successfully",
            "transaction_id": transaction_id,
            "rejected_by": authorization
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rejecting transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/alerts")
async def get_alerts_v1(limit: int = 10):
    try:
        cursor = alerts_collection.find({}).sort("timestamp", -1).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PayShield API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)