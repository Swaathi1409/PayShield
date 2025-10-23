import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_test_header(test_name):
    print("\n" + "="*60)
    print(f"TEST: {test_name}")
    print("="*60)

def print_response(response):
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

# Test 1: Health Check
def test_health_check():
    print_test_header("Health Check")
    response = requests.get(f"{BASE_URL}/")
    print_response(response)
    assert response.status_code == 200
    print("✅ PASSED")

# Test 2: Low Risk Transaction (Should APPROVE)
def test_low_risk_transaction():
    print_test_header("Low Risk Transaction - Should APPROVE")
    data = {
        "amount": 50.00,
        "type": "PAYMENT",
        "oldbalanceOrg": 10000.00,
        "newbalanceOrig": 9950.00,
        "oldbalanceDest": 5000.00,
        "newbalanceDest": 5050.00,
        "user_id": "user_test_001",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] == "APPROVE"
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 3: High Risk - Large Account Drain (Should BLOCK)
def test_high_risk_drain():
    print_test_header("High Risk - 95% Account Drain - Should BLOCK")
    data = {
        "amount": 285000.00,
        "type": "TRANSFER",
        "oldbalanceOrg": 300000.00,
        "newbalanceOrig": 15000.00,
        "oldbalanceDest": 0.00,
        "newbalanceDest": 285000.00,
        "user_id": "user_test_002",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] == "BLOCK"
    assert result["fraud_explanation"] is not None
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 4: Critical - Insufficient Funds (Should BLOCK)
def test_insufficient_funds():
    print_test_header("Critical - Insufficient Funds - Should BLOCK")
    data = {
        "amount": 50000.00,
        "type": "TRANSFER",
        "oldbalanceOrg": 30000.00,
        "newbalanceOrig": -20000.00,  # Impossible
        "oldbalanceDest": 10000.00,
        "newbalanceDest": 60000.00,
        "user_id": "user_test_003",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] == "BLOCK"
    assert "Insufficient funds" in str(result["risk_factors"])
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 5: High Value Transaction (Should BLOCK or REVIEW)
def test_high_value():
    print_test_header("High Value Transaction - $250,000 - Should BLOCK")
    data = {
        "amount": 250000.00,
        "type": "PAYMENT",
        "oldbalanceOrg": 500000.00,
        "newbalanceOrig": 250000.00,
        "oldbalanceDest": 10000.00,
        "newbalanceDest": 260000.00,
        "user_id": "user_test_004",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] in ["BLOCK", "REVIEW"]
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 6: Transfer to Empty Account (Should BLOCK)
def test_empty_destination():
    print_test_header("Transfer to Empty Account - Should BLOCK")
    data = {
        "amount": 100000.00,
        "type": "TRANSFER",
        "oldbalanceOrg": 150000.00,
        "newbalanceOrig": 50000.00,
        "oldbalanceDest": 0.00,  # Empty/new account
        "newbalanceDest": 100000.00,
        "user_id": "user_test_005",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] == "BLOCK"
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 7: Get Transaction History
def test_get_history():
    print_test_header("Get Transaction History")
    response = requests.get(f"{BASE_URL}/api/v1/transactions/history?limit=5")
    print_response(response)
    assert response.status_code == 200
    result = response.json()
    assert "transactions" in result
    print(f"✅ PASSED - Retrieved {len(result['transactions'])} transactions")

# Test 8: Get Alerts
def test_get_alerts():
    print_test_header("Get Recent Alerts")
    response = requests.get(f"{BASE_URL}/api/v1/alerts?limit=5")
    print_response(response)
    assert response.status_code == 200
    result = response.json()
    assert "alerts" in result
    print(f"✅ PASSED - Retrieved {len(result['alerts'])} alerts")

# Test 9: Get Analytics Stats
def test_get_stats():
    print_test_header("Get Analytics Statistics")
    response = requests.get(f"{BASE_URL}/api/v1/analytics/stats")
    print_response(response)
    assert response.status_code == 200
    result = response.json()
    assert "total_transactions" in result
    assert "fraud_detection_rate" in result
    print(f"✅ PASSED - Stats retrieved successfully")

# Test 10: Get User
def test_get_user():
    print_test_header("Get User by Email")
    response = requests.get(f"{BASE_URL}/api/v1/users/customer@test.com")
    print_response(response)
    assert response.status_code == 200
    result = response.json()
    assert result["email"] == "customer@test.com"
    print(f"✅ PASSED - User retrieved successfully")

# Test 11: Balance Mismatch (Should BLOCK)
def test_balance_mismatch():
    print_test_header("Critical - Balance Mismatch - Should BLOCK")
    data = {
        "amount": 1000.00,
        "type": "TRANSFER",
        "oldbalanceOrg": 10000.00,
        "newbalanceOrig": 8000.00,  # Should be 9000, mismatch detected
        "oldbalanceDest": 5000.00,
        "newbalanceDest": 6000.00,
        "user_id": "user_test_006",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] == "BLOCK"
    assert "Balance mismatch" in str(result["risk_factors"])
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

# Test 12: Medium Risk (Should REVIEW)
def test_medium_risk():
    print_test_header("Medium Risk - 85% Drain - Should REVIEW or BLOCK")
    data = {
        "amount": 85000.00,
        "type": "CASH_OUT",
        "oldbalanceOrg": 100000.00,
        "newbalanceOrig": 15000.00,
        "oldbalanceDest": 20000.00,
        "newbalanceDest": 105000.00,
        "user_id": "user_test_007",
        "email": "customer@test.com"
    }
    response = requests.post(f"{BASE_URL}/api/v1/transactions/score", json=data)
    print_response(response)
    result = response.json()
    assert response.status_code == 200
    assert result["decision"] in ["REVIEW", "BLOCK"]
    print(f"✅ PASSED - Decision: {result['decision']}, Risk Score: {result['risk_score']}")

def run_all_tests():
    """Run all tests"""
    print("\n" + "🚀"*30)
    print("PAYSHIELD API COMPREHENSIVE TEST SUITE")
    print("🚀"*30)
    print(f"Testing API at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    tests = [
        ("Health Check", test_health_check),
        ("Low Risk Transaction", test_low_risk_transaction),
        ("High Risk Account Drain", test_high_risk_drain),
        ("Insufficient Funds", test_insufficient_funds),
        ("High Value Transaction", test_high_value),
        ("Empty Destination Account", test_empty_destination),
        ("Balance Mismatch", test_balance_mismatch),
        ("Medium Risk Transaction", test_medium_risk),
        ("Get Transaction History", test_get_history),
        ("Get Alerts", test_get_alerts),
        ("Get Analytics Stats", test_get_stats),
        ("Get User", test_get_user),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"❌ FAILED - {test_name}: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"❌ ERROR - {test_name}: {str(e)}")
            failed += 1
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {len(tests)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/len(tests)*100):.1f}%")
    print("="*60)

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")