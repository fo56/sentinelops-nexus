"""
Knowledge Crystal - Test Script
Tests the main functionality of the Knowledge Crystal feature
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.knowledge_crystal.services import (
    KBPageService, KBChatService, KBSearchService, KBDocumentService
)
from app.knowledge_crystal.models import (
    KBPageCreate, ChatQueryRequest, SearchQuery, 
    KBDocumentUpload, DocumentCategory
)


async def test_knowledge_crystal():
    """Test the Knowledge Crystal functionality"""
    
    # Connect to MongoDB
    print(" Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    try:
        # Test 1: Create an Agent Document
        print("\n Test 1: Creating Agent Document...")
        page_service = KBPageService(db)
        
        agent_doc = KBPageCreate(
            title="Mission Report: Operation Phoenix - Germany",
            content="""
            Mission Operation Phoenix was conducted in Berlin, Germany from January 15-30, 2025.
            
            Objective: Secure diplomatic facility and protect high-value target during summit.
            
            Team: 5 agents deployed with specialized equipment including:
            - Advanced surveillance gear
            - Secure encrypted communication devices
            - Secure access systems
            - Night vision equipment
            
            Key Outcomes:
            - Mission completed successfully
            - No incidents reported
            - All objectives achieved
            - Diplomatic summit concluded safely
            
            Lessons Learned:
            - Local language skills proved invaluable
            - Weather conditions required equipment adjustments
            - Coordination with local authorities was excellent
            
            Resources Used:
            - Safe houses in Berlin districts
            - Local transport network
            - Embassy support facilities
            """,
            category=DocumentCategory.AGENT,
            mission_id="MS-2025-001",
            country="Germany",
            tags=["mission", "completed", "2025", "europe", "diplomatic"],
            visibility="public",
            author="admin"
        )
        
        result = await page_service.create_page(agent_doc)
        if result.get("success"):
            print(f" Agent document created: {result['page_id']}")
            agent_doc_id = result['page_id']
        else:
            print(f" Failed to create agent document: {result.get('error')}")
            return
        
        # Test 2: Create a Technician Document
        print("\n Test 2: Creating Technician Document...")
        
        tech_doc = KBPageCreate(
            title="CCTV Camera System Setup and Configuration",
            content="""
            HQ CCTV System Documentation
            
            Equipment: Hikvision DS-2CD2185FWD-I 8MP Network Cameras
            Location: Headquarters Building - All floors
            
            Installation Procedure:
            1. Mount cameras at height of 2.5 meters
            2. Ensure 30-degree downward angle
            3. Connect to PoE network switch
            4. Configure static IP addresses (192.168.10.x range)
            5. Set recording quality to 4K at 15fps
            
            Network Configuration:
            - VLAN: 10 (Security Systems)
            - Gateway: 192.168.10.1
            - DNS: 192.168.10.2
            - NTP Server: pool.ntp.org
            
            Access Credentials:
            - Admin user setup via web interface
            - Default port: 80 (HTTP), 554 (RTSP)
            - Enable HTTPS on port 443
            
            Common Issues:
            1. Connection Timeout:
               - Check network cable
               - Verify PoE power supply
               - Restart camera and switch
            
            2. Poor Image Quality:
               - Adjust focus ring
               - Check lighting conditions
               - Update firmware
            
            3. Recording Failures:
               - Check NVR storage capacity
               - Verify recording schedule
               - Test network bandwidth
            
            Maintenance Schedule:
            - Weekly: Check camera feeds
            - Monthly: Clean camera lenses
            - Quarterly: Firmware updates
            - Annually: Full system inspection
            """,
            category=DocumentCategory.TECHNICIAN,
            tags=["cctv", "setup", "security", "network", "troubleshooting"],
            visibility="public",
            author="admin"
        )
        
        result = await page_service.create_page(tech_doc)
        if result.get("success"):
            print(f" Technician document created: {result['page_id']}")
            tech_doc_id = result['page_id']
        else:
            print(f" Failed to create technician document: {result.get('error')}")
            return
        
        # Wait for indexing
        print("\n Waiting for documents to be indexed...")
        await asyncio.sleep(3)
        
        # Test 3: Agent Chat Query
        print("\n Test 3: Agent Chat Query...")
        chat_service = KBChatService(db)
        
        agent_query = ChatQueryRequest(
            query="What missions were conducted in Germany?",
            user_role="agent",
            limit=5
        )
        
        response = await chat_service.chat_query(agent_query)
        print(f" Agent Query Response:")
        print(f"   Answer: {response.answer[:200]}...")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        print(f"   Confidence: {response.confidence:.2f}")
        
        if response.matched_documents:
            doc = response.matched_documents[0]
            print(f"\n    First Document:")
            print(f"      Title: {doc.title}")
            print(f"      Mission ID: {doc.mission_id}")
            print(f"      Country: {doc.country}")
            print(f"      Matched Points: {len(doc.matched_points)}")
            for i, point in enumerate(doc.matched_points[:3], 1):
                print(f"         {i}. {point}")
        
        # Test 4: Technician Chat Query
        print("\n Test 4: Technician Chat Query...")
        
        tech_query = ChatQueryRequest(
            query="How do I fix CCTV connection timeout issues?",
            user_role="technician",
            limit=5
        )
        
        response = await chat_service.chat_query(tech_query)
        print(f" Technician Query Response:")
        print(f"   Answer: {response.answer[:200]}...")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        print(f"   Confidence: {response.confidence:.2f}")
        
        if response.matched_documents:
            doc = response.matched_documents[0]
            print(f"\n    First Document:")
            print(f"      Title: {doc.title}")
            print(f"      Category: {doc.category}")
            print(f"      Matched Points: {len(doc.matched_points)}")
            for i, point in enumerate(doc.matched_points[:3], 1):
                print(f"         {i}. {point}")
        
        # Test 5: Access Control - Agent trying to access Technician docs
        print("\n Test 5: Testing Access Control...")
        
        agent_tech_query = ChatQueryRequest(
            query="CCTV setup instructions",
            user_role="agent",  # Agent trying to access tech docs
            limit=5
        )
        
        response = await chat_service.chat_query(agent_tech_query)
        print(f" Agent trying to access tech docs:")
        print(f"   Matched Documents: {len(response.matched_documents)}")
        if len(response.matched_documents) == 0:
            print(f"    Access control working! Agent cannot see technician docs.")
        else:
            print(f"    Access control issue! Agent should not see technician docs.")
            # Debug: show what categories were returned
            for doc in response.matched_documents:
                print(f"      - {doc.title} (Category: {doc.category})")
        
        # Test 6: Search by Country
        print("\n Test 6: Search by Country (Agent)...")
        search_service = KBSearchService(db)
        
        search_query = SearchQuery(
            query="missions",
            category=DocumentCategory.AGENT,
            country="Germany",
            limit=5
        )
        
        results = await search_service.search(search_query, limit=5)
        print(f" Search Results for Germany missions: {len(results)} documents")
        for i, result in enumerate(results, 1):
            print(f"   {i}. {result.title} (Score: {result.similarity_score:.2f})")
        
        # Test 7: Statistics
        print("\n Test 7: Getting Statistics...")
        stats = {
            "total": await page_service.collection.count_documents({}),
            "agent": await page_service.collection.count_documents({"category": "agent"}),
            "technician": await page_service.collection.count_documents({"category": "technician"})
        }
        print(f" Knowledge Crystal Statistics:")
        print(f"   Total Documents: {stats['total']}")
        print(f"   Agent Documents: {stats['agent']}")
        print(f"   Technician Documents: {stats['technician']}")
        
        print("\n All tests completed successfully!")
        
    except Exception as e:
        print(f"\n Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()
        print("\n MongoDB connection closed")


if __name__ == "__main__":
    print(" Starting Knowledge Crystal Tests...\n")
    asyncio.run(test_knowledge_crystal())
