"""
Knowledge Crystal - Access Control Test Only
Quick test to verify role-based access control
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.knowledge_crystal.services import KBChatService
from app.knowledge_crystal.models import ChatQueryRequest


async def test_access_control():
    """Test access control only"""
    
    # Connect to MongoDB
    print(" Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    try:
        chat_service = KBChatService(db)
        
        # Test 1: Agent trying to access Technician docs
        print("\n Test 1: Agent trying to access Technician documents...")
        
        agent_tech_query = ChatQueryRequest(
            query="How do I setup CCTV cameras?",
            user_role="agent",
            limit=5
        )
        
        response = await chat_service.chat_query(agent_tech_query)
        print(f"   Query: '{agent_tech_query.query}'")
        print(f"   User Role: {agent_tech_query.user_role}")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        
        if len(response.matched_documents) == 0:
            print(f"    PASS: Agent cannot see technician docs")
        else:
            print(f"    FAIL: Agent should not see technician docs")
            print(f"   Found documents:")
            for doc in response.matched_documents:
                print(f"      - '{doc.title}' (Category: {doc.category})")
        
        # Test 2: Technician trying to access Agent docs
        print("\n Test 2: Technician trying to access Agent documents...")
        
        tech_agent_query = ChatQueryRequest(
            query="What missions were conducted in Germany?",
            user_role="technician",
            limit=5
        )
        
        response = await chat_service.chat_query(tech_agent_query)
        print(f"   Query: '{tech_agent_query.query}'")
        print(f"   User Role: {tech_agent_query.user_role}")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        
        if len(response.matched_documents) == 0:
            print(f"    PASS: Technician cannot see agent docs")
        else:
            print(f"    FAIL: Technician should not see agent docs")
            print(f"   Found documents:")
            for doc in response.matched_documents:
                print(f"      - '{doc.title}' (Category: {doc.category})")
        
        # Test 3: Agent querying Agent docs (should work)
        print("\n Test 3: Agent accessing Agent documents...")
        
        agent_query = ChatQueryRequest(
            query="What missions were conducted in Germany?",
            user_role="agent",
            limit=5
        )
        
        response = await chat_service.chat_query(agent_query)
        print(f"   Query: '{agent_query.query}'")
        print(f"   User Role: {agent_query.user_role}")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        
        if len(response.matched_documents) > 0:
            print(f"    PASS: Agent can access agent docs")
            for doc in response.matched_documents:
                print(f"      - '{doc.title}' (Category: {doc.category})")
        else:
            print(f"     WARNING: No agent documents found (might be empty DB)")
        
        # Test 4: Technician querying Technician docs (should work)
        print("\n Test 4: Technician accessing Technician documents...")
        
        tech_query = ChatQueryRequest(
            query="How do I troubleshoot CCTV connection issues?",
            user_role="technician",
            limit=5
        )
        
        response = await chat_service.chat_query(tech_query)
        print(f"   Query: '{tech_query.query}'")
        print(f"   User Role: {tech_query.user_role}")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        
        if len(response.matched_documents) > 0:
            print(f"    PASS: Technician can access technician docs")
            for doc in response.matched_documents:
                print(f"      - '{doc.title}' (Category: {doc.category})")
        else:
            print(f"     WARNING: No technician documents found (might be empty DB)")
        
        print("\n" + "="*70)
        print("ACCESS CONTROL TEST COMPLETED")
        print("="*70)
        
    except Exception as e:
        print(f"\n Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()
        print("\n MongoDB connection closed")


if __name__ == "__main__":
    print(" Starting Access Control Tests...\n")
    asyncio.run(test_access_control())
