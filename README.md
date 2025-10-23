# PayShield - AI-Powered Fraud Detection System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)

> A sophisticated real-time fraud detection platform that combines machine learning with business rules to protect digital payments. Built with React, FastAPI, and MongoDB, featuring an XGBoost classifier trained on 22+ engineered features.

![PayShield Dashboard](https://img.shields.io/badge/Status-Production_Ready-success)

## What is PayShield?

PayShield is a comprehensive fraud detection system designed to protect financial transactions in real-time. It analyzes payment patterns, user behavior, and transaction characteristics to identify potentially fraudulent activities before they complete.

### Key Features

- **Real-time Fraud Detection**: Instant risk assessment using hybrid ML + rule-based approach
- **Multi-Role System**: Separate dashboards for customers, developers, and administrators
- **Secure Payment Processing**: PCI-DSS compliant payment handling (CVV never stored)
- **Transaction Management**: Complete audit trail with manual approval workflow for flagged transactions
- **Advanced Analytics**: Comprehensive dashboard with fraud metrics and trends
- **Contact Management**: Save trusted recipients for faster future payments
- **Multi-Account Support**: Manage multiple bank accounts and payment methods

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                    │
│  ┌──────────────┬─────────────┬──────────────────────────┐ │
│  │   Customer   │   Developer │      Admin Dashboard      │ │
│  │   Checkout   │   Testing   │   (Transaction Review)    │ │
│  └──────────────┴─────────────┴──────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Python)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Fraud Detection Engine                      │  │
│  │  ┌──────────────┐        ┌─────────────────┐        │  │
│  │  │ Business     │        │   ML Model      │        │  │
│  │  │ Rules (60%)  ├────────┤  XGBoost (40%)  │        │  │
│  │  └──────────────┘        └─────────────────┘        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  • Users  • Accounts  • Transactions  • Alerts  • Contacts │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **MongoDB** (local or Atlas)
- **Firebase Account** (for authentication)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Swaathi1409/payshield.git
cd payshield
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/
DB_NAME=payshield_fraud_detection
EOF

# Initialize database
python -c "from database import init_database; init_database()"

# Start the server
uvicorn app:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Configure Firebase
# Create src/firebase.js with your Firebase config:
```

```javascript
// src/firebase.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

```bash
# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 👥 User Roles & Demo Accounts

PayShield supports three user roles, each with specific capabilities:

### Customer Role
**Test Account**: `customer@test.com` / `password`

- Make secure payments with fraud protection
- Manage multiple bank accounts
- Save trusted contacts
- View transaction history
- Initial balance: **$300,000**

### 👨‍💻 Developer Role
**Test Account**: `developer@test.com` / `password`

- Test ML model predictions
- Analyze risk scores in real-time
- View feature importance
- No payment capabilities (balance: $0)

### 👑 Admin Role
**Test Account**: `admin@test.com` / `password`

- Monitor all system transactions
- Review flagged payments
- Manually approve/reject transactions
- View comprehensive analytics
- Access fraud alerts dashboard

## 🧠 How Fraud Detection Works

PayShield uses a **hybrid scoring system** that combines rule-based logic with machine learning:

### 1. Business Rules (60% weight when safe)
- **Insufficient Funds**: Blocks transactions exceeding balance
- **Velocity Checks**: Flags high transaction frequency (>5/hour or >20/day)
- **Account Drain Detection**: Alerts on transfers >70% of balance
- **Large Transactions**: Reviews amounts >$50,000
- **Cash-Out Patterns**: Monitors large cash withdrawals

### 2. Machine Learning Model (40% weight)
- **Algorithm**: XGBoost Classifier
- **Features**: 22 engineered features including:
  - Transaction amount and balance ratios
  - Payment type encoding (TRANSFER, PAYMENT, CASH_OUT, etc.)
  - Velocity metrics (1h, 24h transaction counts)
  - Account drain percentage
  - Balance disparities
  - Logarithmic amount transformations
- **Training**: Synthetic fraud dataset with class balancing

### 3. Decision Logic

```
if rule_score >= 0.3:
    final_score = max(rule_score, ml_score)  # Conservative
elif ml_score > 0.5:
    final_score = (rule_score * 0.7) + (ml_score * 0.3)  # Trust rules more
else:
    final_score = max(rule_score, ml_score)  # Both agree it's safe
```

**Risk Thresholds**:
- `score > 0.7` → **BLOCK** (Critical Risk)
- `0.5 < score ≤ 0.7` → **REVIEW** (High Risk)
- `0.3 < score ≤ 0.5` → **REVIEW** (Medium Risk)
- `score ≤ 0.3` → **APPROVE** (Low Risk)

## API Endpoints

### Authentication & Users
```http
POST /api/user/create          # Create new user
POST /api/user/by-email        # Get user by email
```

### Accounts
```http
POST /api/accounts/create      # Add payment account
GET  /api/accounts/list        # List user's accounts
```

### Transactions
```http
POST /api/v1/transactions/score        # Test fraud detection (developer)
POST /api/v2/transactions/process      # Process real payment (customer)
GET  /api/v2/transactions/history      # Get user transactions
POST /api/v2/transactions/{id}/approve # Admin approve (REVIEW → APPROVE)
POST /api/v2/transactions/{id}/reject  # Admin reject (REVIEW → BLOCK)
```

### Analytics
```http
GET /api/v2/analytics/dashboard   # System-wide statistics
GET /api/v1/alerts                # Recent fraud alerts
```

### Contacts
```http
POST /api/contacts/create      # Save contact
GET  /api/contacts/list        # List contacts
```

## 🔒 Security Features

### Payment Security
- **CVV Never Stored**: CVV is validated via simulated payment gateway and immediately discarded (PCI-DSS compliance)
- **Expiry Validation**: Card expiry dates checked before processing
- **Blacklist Checking**: Receiver accounts verified against fraud database
- **Device Fingerprinting**: User-agent tracking for suspicious device patterns

### Data Protection
- **Encrypted Storage**: MongoDB with encrypted connections
- **Firebase Authentication**: Industry-standard OAuth 2.0
- **Account Masking**: Account numbers displayed as `****1234`
- **Audit Trail**: Complete transaction logging with timestamps

### Fraud Prevention
- **Real-time Analysis**: Sub-second risk assessment
- **Multi-factor Validation**: CVV + expiry + balance checks
- **Velocity Limits**: Transaction frequency monitoring
- **Admin Review Queue**: Manual verification for suspicious transactions

## 📈 Transaction Workflow

```
Customer Initiates Payment
         ↓
    Select Account
         ↓
  Enter CVV + Amount
         ↓
  Submit Transaction
         ↓
Payment Gateway Validation
    ↙          ↘
Invalid      Valid
   ↓            ↓
BLOCK      Blacklist Check
              ↙    ↘
          Found   Clear
            ↓       ↓
          BLOCK  Fraud Detection Engine
                    ↓
          ┌─────────┴─────────┐
    Business Rules     ML Model
          └─────────┬─────────┘
                    ↓
            Hybrid Scoring
                    ↓
              Risk Score?
          ↙       ↓       ↘
    >0.7      0.3-0.7    ≤0.3
      ↓          ↓         ↓
   BLOCK     REVIEW    APPROVE
              ↓           ↓
         Admin Queue   Process
           ↙    ↘         ↓
      Approve Reject  Update Balances
         ↓      ↓
      Process BLOCK
```

## Screenshots

### Customer Payment Interface
Clean, intuitive checkout experience with real-time fraud protection and saved contacts.
<img width="834" height="624" alt="image" src="https://github.com/user-attachments/assets/831dbe4d-3678-46a6-a1e2-bc9cd2b03e7c" />
<img width="811" height="625" alt="image" src="https://github.com/user-attachments/assets/f561507f-869f-482a-9405-042810586611" />
<img width="840" height="622" alt="image" src="https://github.com/user-attachments/assets/ce43affb-0a7b-4763-ad67-b52a596cf2f2" />

### Developer Testing Dashboard
Interactive fraud detection testing with detailed risk analysis and feature visualization.
<img width="848" height="615" alt="image" src="https://github.com/user-attachments/assets/037a359c-0528-4d7b-bd03-598166c5c1b3" />
<img width="804" height="625" alt="image" src="https://github.com/user-attachments/assets/a9014e1a-8085-408b-bf2f-a6e944bf7673" />
<img width="803" height="623" alt="image" src="https://github.com/user-attachments/assets/7547c98f-9746-4340-9c21-290151c527a1" />

### Admin Control Panel
Comprehensive monitoring dashboard with transaction review capabilities and system analytics.
<img width="955" height="629" alt="image" src="https://github.com/user-attachments/assets/ee4ee977-853d-46a5-b6ba-61066f3628e8" />
<img width="973" height="615" alt="image" src="https://github.com/user-attachments/assets/27eeb76d-1095-44ab-8542-df08538cc6b2" />


## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icon set
- **Vite** - Lightning-fast build tool

### Backend
- **FastAPI** - High-performance Python API framework
- **Motor** - Async MongoDB driver
- **Joblib** - ML model serialization
- **XGBoost** - Gradient boosting classifier
- **Scikit-learn** - ML preprocessing and evaluation
- **NumPy/Pandas** - Data manipulation

### Database & Auth
- **MongoDB** - NoSQL document database
- **Firebase Auth** - User authentication
- **Python-dotenv** - Environment configuration

### DevOps
- **Uvicorn** - ASGI server
- **CORS Middleware** - Cross-origin requests
- **Pydantic** - Data validation

## Project Structure

```
payshield/
├── backend/
│   ├── app.py                          # FastAPI application
│   ├── database.py                     # MongoDB connection & utilities
│   ├── fraud_detection_xgboost_model.pkl   # Trained ML model
│   ├── fraud_detection_scaler.pkl      # Feature scaler
│   ├── requirements.txt                # Python dependencies
│   └── .env                            # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Main app component
│   │   ├── Login.jsx                   # Login page
│   │   ├── Signup.jsx                  # Registration page
│   │   ├── EnhancedPaymentWidget.jsx   # Customer checkout
│   │   ├── TestingUI.jsx               # Developer testing dashboard
│   │   ├── AdminDashboard.jsx          # Admin control panel
│   │   ├── AccountManagement.jsx       # Account management
│   │   ├── ProtectedRoute.jsx          # Route guards
│   │   ├── auth.js                     # Authentication logic
│   │   └── firebase.js                 # Firebase configuration
│   ├── public/
│   │   └── videos/
│   │       └── background.mp4          # Background video
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🧪 Testing the System

### Test Scenario 1: Normal Transaction (Should APPROVE)
```javascript
{
  "amount": 5000,
  "sender_balance": 100000,
  "receiver_balance": 50000,
  "payment_type": "TRANSFER",
  "transactions_24h": 2,
  "transactions_1h": 0
}
```
**Expected**: ✅ APPROVE (Low Risk ~15%)

### Test Scenario 2: High Velocity (Should REVIEW)
```javascript
{
  "amount": 10000,
  "sender_balance": 80000,
  "receiver_balance": 20000,
  "payment_type": "TRANSFER",
  "transactions_24h": 25,
  "transactions_1h": 6
}
```
**Expected**: ⚠️ REVIEW (High Risk ~65%)

### Test Scenario 3: Account Drain (Should BLOCK)
```javascript
{
  "amount": 95000,
  "sender_balance": 100000,
  "receiver_balance": 5000,
  "payment_type": "CASH_OUT",
  "transactions_24h": 1,
  "transactions_1h": 1
}
```
**Expected**: 🚫 BLOCK (Critical Risk ~85%)

### Test Scenario 4: Insufficient Funds (Should BLOCK)
```javascript
{
  "amount": 150000,
  "sender_balance": 100000,
  "receiver_balance": 50000,
  "payment_type": "TRANSFER"
}
```
**Expected**: 🚫 BLOCK (Critical Risk 100%)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint rules for JavaScript/React
- Write descriptive commit messages
- Add tests for new features
- Update documentation as needed

## Known Issues & Limitations

- **CVV Validation**: Currently simulated; integrate real payment gateway (Stripe/PayPal) for production
- **ML Model**: Trained on synthetic data; retrain with real fraud data for better accuracy
- **Session Management**: Firebase tokens expire after 1 hour
- **Scalability**: MongoDB connection pooling needs optimization for high traffic
- **Real-time Updates**: Consider WebSockets for live dashboard updates

## Roadmap

- [ ] **v2.0**: Real payment gateway integration (Stripe/Razorpay)
- [ ] **v2.1**: Advanced ML models (Neural Networks, Ensemble methods)
- [ ] **v2.2**: Behavioral biometrics (typing patterns, mouse movements)
- [ ] **v2.3**: Multi-currency support
- [ ] **v2.4**: Mobile applications (React Native)
- [ ] **v2.5**: Blockchain transaction verification
- [ ] **v3.0**: Open banking API integration

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 Swaathi1409

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 Author

**Swaathi1409**
- GitHub: [@Swaathi1409](https://github.com/Swaathi1409)
- Email: [swaathi1409@gmail.com](swaathi1409@gmail.com)

## Acknowledgments

- XGBoost community for the excellent gradient boosting library
- FastAPI team for the modern Python web framework
- MongoDB for the flexible NoSQL database
- Firebase for authentication services
- Tailwind CSS for the beautiful UI components

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Swaathi1409/payshield/issues) page
2. Create a new issue with detailed description
3. Contact the author via GitHub

---

<div align="center">

**Built with ❤️ by Swaathi1409**

If you find this project useful, please consider giving it a ⭐!

</div>
