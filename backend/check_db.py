from pymongo import MongoClient

try:
    # Connect to MongoDB
    client = MongoClient("mongodb://localhost:27017/")
    
    # List all databases
    print("📊 Available Databases:")
    print(client.list_database_names())
    
    # Check your specific database
    db = client['payshield_fraud_detection']
    print("\n📁 Collections in 'payshield_fraud_detection':")
    print(db.list_collection_names())
    
    # Check if collections have data
    print("\n📈 Document Counts:")
    for collection_name in db.list_collection_names():
        count = db[collection_name].count_documents({})
        print(f"  - {collection_name}: {count} documents")
    
    print("\n✅ MongoDB is connected and working!")
    
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    print("\n💡 Make sure MongoDB is running:")
    print("   - Linux/Mac: sudo systemctl start mongod")
    print("   - Or run: mongod")

finally:
    client.close()