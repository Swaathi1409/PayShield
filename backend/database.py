from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "payshield_fraud_detection")

# Async client for FastAPI
async_client = AsyncIOMotorClient(MONGODB_URI)
async_db = async_client[DB_NAME]

# Sync client for initialization
sync_client = MongoClient(MONGODB_URI)
sync_db = sync_client[DB_NAME]

# Collections - MAKE SURE THESE ARE EXPORTED
transactions_collection = async_db.transactions
alerts_collection = async_db.alerts
users_collection = async_db.users  # This is critical!
accounts_collection = async_db.accounts
contacts_collection = async_db.contacts
blacklist_collection = async_db.blacklist

def init_database():
    """Initialize database with indexes and sample data"""
    try:
        # Create indexes
        sync_db.transactions.create_index([("transaction_id", 1)], unique=True)
        sync_db.transactions.create_index([("timestamp", -1)])
        sync_db.transactions.create_index([("user_id", 1)])
        sync_db.transactions.create_index([("decision", 1)])
        sync_db.transactions.create_index([("risk_level", 1)])
        
        sync_db.alerts.create_index([("timestamp", -1)])
        sync_db.alerts.create_index([("transaction_id", 1)])
        
        sync_db.users.create_index([("email", 1)], unique=True)
        sync_db.users.create_index([("firebase_uid", 1)], unique=True, sparse=True)

        sync_db.accounts.create_index([("user_id", 1)])
        sync_db.accounts.create_index([("account_number", 1)], unique=True)
        sync_db.accounts.create_index([("is_primary", 1)])

        sync_db.contacts.create_index([("user_id", 1)])
        sync_db.contacts.create_index([("account_number", 1)])

        sync_db.blacklist.create_index([("account_number", 1)], unique=True)


        
        print("✅ Database indexes created successfully")
        
        # Create sample users if not exist
        sample_users = [
            {
                "email": "developer@test.com",
                "role": "developer",
                "name": "Dev User",
                "balance": 0.00,
                "created_at": datetime.utcnow()
            },
            {
                "email": "customer@test.com",
                "role": "customer",
                "name": "Customer User",
                "balance": 100000.00,
                "created_at": datetime.utcnow()
            },
            {
                "email": "admin@test.com",
                "role": "admin",
                "name": "Admin User",
                "balance": 0.00,
                "created_at": datetime.utcnow()
            }
        ]
        
        for user in sample_users:
            sync_db.users.update_one(
                {"email": user["email"]},
                {"$setOnInsert": user},
                upsert=True
            )
        
        print("✅ Sample users created")
        
    except Exception as e:
        print(f"⚠️  Database initialization error: {e}")

async def save_transaction(transaction_data):
    """Save transaction to MongoDB"""
    try:
        transaction_data["timestamp"] = datetime.utcnow()
        result = await transactions_collection.insert_one(transaction_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error saving transaction: {e}")
        return None

async def save_alert(alert_data):
    """Save fraud alert to MongoDB"""
    try:
        alert_data["timestamp"] = datetime.utcnow()
        result = await alerts_collection.insert_one(alert_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error saving alert: {e}")
        return None

async def get_transaction_history(limit=10, skip=0, filters=None):
    """Get transaction history with optional filters"""
    try:
        query = filters or {}
        cursor = transactions_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        transactions = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for txn in transactions:
            txn["_id"] = str(txn["_id"])
        
        return transactions
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        return []

async def get_alerts(limit=5, skip=0):
    """Get recent alerts"""
    try:
        cursor = alerts_collection.find({}).sort("timestamp", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        
        return alerts
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return []

async def get_analytics_stats():
    """Get analytics statistics"""
    try:
        total = await transactions_collection.count_documents({})
        
        blocked = await transactions_collection.count_documents({"decision": "BLOCK"})
        approved = await transactions_collection.count_documents({"decision": "APPROVE"})
        review = await transactions_collection.count_documents({"decision": "REVIEW"})
        
        # Calculate total volume
        pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        volume_result = await transactions_collection.aggregate(pipeline).to_list(1)
        total_volume = volume_result[0]["total"] if volume_result else 0
        
        # Calculate fraud detection rate
        fraud_rate = (blocked / total * 100) if total > 0 else 0
        
        return {
            "total_transactions": total,
            "decisions": {
                "blocked": blocked,
                "approved": approved,
                "review": review
            },
            "total_volume": round(total_volume, 2),
            "fraud_detection_rate": round(fraud_rate, 2)
        }
    except Exception as e:
        print(f"Error calculating stats: {e}")
        return {
            "total_transactions": 0,
            "decisions": {"blocked": 0, "approved": 0, "review": 0},
            "total_volume": 0,
            "fraud_detection_rate": 0
        }

async def get_user_by_email(email):
    """Get user by email"""
    try:
        user = await users_collection.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None