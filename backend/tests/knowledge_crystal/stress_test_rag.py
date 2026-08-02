import asyncio
import os
import shutil
import time
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import settings
from app.knowledge_crystal.models import (
    KBPageCreate, DocumentCategory, ChatQueryRequest
)
from app.knowledge_crystal.services import (
    KBPageService, KBChatService
)
from app.knowledge_crystal.vector_store import get_vector_store

ARTIFACT_PATH = r"C:\Users\gauri\.gemini\antigravity-ide\brain\2871eaca-0d8c-4011-9f1a-add5769f72c3\rag_stress_test_results.md"

SYNTHETIC_DOCS = [
    # ---- AGENT DOCUMENTS ----
    {
        "title": "Mission Report: Operation Desert Falcon - UAE",
        "category": DocumentCategory.AGENT,
        "country": "UAE",
        "mission_id": "MS-2026-041",
        "tags": ["evacuation", "vip", "middle-east"],
        "content": "Operation Desert Falcon was executed in Dubai, UAE on March 15, 2026. The objective was the emergency evacuation of a VIP diplomatic asset from a compromised hotel. Protocol Alpha-7 was initiated. The extraction team utilized unmarked vehicles and secured the asset at the secondary safehouse before airlift. No hostile contact was made. All agents successfully exfiltrated."
    },
    {
        "title": "Mission Report: Operation Desert Storm - UAE",
        "category": DocumentCategory.AGENT,
        "country": "UAE",
        "mission_id": "MS-2026-042",
        "tags": ["asset-recovery", "data", "middle-east"],
        "content": "Operation Desert Storm took place in Abu Dhabi, UAE on April 2, 2026. The objective was the recovery of a stolen encrypted hard drive. This was NOT an evacuation mission. The extraction team infiltrated the target facility, recovered the asset, and exfiltrated via maritime routes. Hostile engagement occurred but resulted in zero friendly casualties."
    },
    {
        "title": "Mission Report: Operation Winter Snake - Russia",
        "category": DocumentCategory.AGENT,
        "country": "Russia",
        "mission_id": "MS-2025-099",
        "tags": ["infiltration", "covert"],
        "content": "Operation Winter Snake involved deep infiltration into a secure facility in Moscow. Agents bypassed the biometric terminals using cloned signatures and recovered the intelligence. Covert extraction was delayed due to heavy snowfall."
    },
    {
        "title": "Mission Report: Operation Echo - UK",
        "category": DocumentCategory.AGENT,
        "country": "UK",
        "mission_id": "MS-2026-005",
        "tags": ["surveillance", "covert"],
        "content": "Mission Echo involved setting up a long-term surveillance operation in London. Agents monitored the target for 14 days using remote audio drops and visual feeds. The surveillance van was operated by technical support while agents remained on foot."
    },
    {
        "title": "Agent Field Equipment Loadout and Hardware Guide",
        "category": DocumentCategory.AGENT,
        "country": "Global",
        "mission_id": "",
        "tags": ["equipment", "hardware", "cctv"],
        "content": "Standard agent field loadout includes a Glock 19, encrypted comms device, and a mini-CCTV jammer. The CCTV jammer is strictly for field agents to bypass civilian cameras. Do not attempt to repair the jammer yourself; hand it to a technician upon returning to HQ. This guide is for field operatives only."
    },
    
    # ---- TECHNICIAN DOCUMENTS ----
    {
        "title": "Surveillance Van Setup for Mission Echo",
        "category": DocumentCategory.TECHNICIAN,
        "country": "UK",
        "mission_id": "MS-2026-005",
        "tags": ["van", "hardware", "setup"],
        "content": "Technical specifications for outfitting the surveillance van used in Mission Echo. Technicians must install the high-gain directional microphones on the roof, route the cables through the EMP-shielded conduit, and connect them to the primary audio rack. The van requires 220V shore power or must run the internal generator every 6 hours."
    },
    {
        "title": "CCTV Camera System Setup and Configuration Protocol",
        "category": DocumentCategory.TECHNICIAN,
        "country": "HQ",
        "mission_id": "",
        "tags": ["cctv", "hardware", "hq"],
        "content": "To set up the HQ CCTV system, technicians must ensure all cameras are PoE powered. If a camera times out, check the Ethernet cable integrity, then verify the switch port is active. Finally, log into the admin panel at 192.168.1.100 and reset the video feed buffer. This is strictly HQ maintenance protocol."
    },
    {
        "title": "Biometric Terminal Maintenance Manual",
        "category": DocumentCategory.TECHNICIAN,
        "country": "HQ",
        "mission_id": "",
        "tags": ["biometrics", "hardware", "maintenance"],
        "content": "Routine maintenance of the HQ biometric terminals. If the terminal fails to read a fingerprint, wipe the glass with isopropyl alcohol. Do NOT attempt to pry the terminal open, as it will trigger the tamper alarm. For internal wiring faults, use the override key located in the server room lockbox."
    },
    {
        "title": "Encrypted Communication Device Flashing Guide",
        "category": DocumentCategory.TECHNICIAN,
        "country": "HQ",
        "mission_id": "",
        "tags": ["comms", "flashing", "hardware"],
        "content": "When an agent returns an encrypted comms device, technicians must immediately wipe and re-flash the firmware. Connect the device via USB-C to the flashing rig, run the `flash_firmware.sh` script, and verify the cryptographic keys have been rotated. Do not hand an unflashed device back to an agent."
    },
    {
        "title": "Server Room Cooling Protocol",
        "category": DocumentCategory.TECHNICIAN,
        "country": "HQ",
        "mission_id": "",
        "tags": ["server", "cooling", "maintenance"],
        "content": "The HQ server room must remain below 20 degrees Celsius. If the primary HVAC fails, technicians must manually engage the backup chiller system on the roof."
    }
]

TEST_QUERIES = [
    {
        "name": "Clean Match (Agent)",
        "role": "agent",
        "query": "What is the protocol for VIP evacuation during Operation Desert Falcon?",
        "expected_behavior": "Should cleanly retrieve 'Operation Desert Falcon' and summarize the evacuation protocol."
    },
    {
        "name": "Near-Miss (Agent)",
        "role": "agent",
        "query": "What happened during the VIP evacuation in Abu Dhabi during Operation Desert Storm?",
        "expected_behavior": "Should recognize that Desert Storm was NOT an evacuation (unlike Desert Falcon) and answer accurately based on Desert Storm's data."
    },
    {
        "name": "Cross-Category Leak Test (Technician)",
        "role": "technician",
        "query": "How do I set up the surveillance van for Mission Echo?",
        "expected_behavior": "Should retrieve the tech document 'Surveillance Van Setup for Mission Echo'. MUST NOT retrieve the Agent 'Mission Report: Operation Echo'."
    },
    {
        "name": "Cross-Category Leak Test (Agent)",
        "role": "agent",
        "query": "How do I fix or repair the biometric terminal if it fails?",
        "expected_behavior": "Should FAIL to find the tech manual and return a fallback message, proving agent role cannot leak tech docs."
    },
    {
        "name": "No Match / Hallucination Check",
        "role": "agent",
        "query": "What is the recipe for baking chocolate chip cookies?",
        "expected_behavior": "Should return a fallback message saying no relevant documents were found."
    }
]

async def run_stress_test():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    print("Wiping existing kb_pages...")
    await db["kb_pages"].delete_many({})
    
    # Re-initialize vector store
    vector_store = get_vector_store()
    
    print("Wiping ChromaDB collection...")
    try:
        vector_store.client.delete_collection("kb_pages")
        print("Collection deleted.")
    except Exception as e:
        print("Collection doesn't exist or couldn't be deleted:", e)
        
    # FORCE recreation of the collection object in the singleton
    vector_store.collection = vector_store.client.get_or_create_collection(
        name="kb_pages",
        metadata={"hnsw:space": "cosine"}
    )
    
    page_service = KBPageService(db)
    chat_service = KBChatService(db)
    
    print(f"Seeding {len(SYNTHETIC_DOCS)} synthetic documents...")
    for doc in SYNTHETIC_DOCS:
        print(f"  Ingesting: {doc['title']} (Role: {doc['category']})")
        await page_service.create_page(KBPageCreate(
            title=doc["title"],
            content=doc["content"],
            category=doc["category"],
            country=doc["country"],
            mission_id=doc["mission_id"],
            tags=doc["tags"]
        ))
        
    print("\\nDocuments ingested! Waiting 5 seconds for vector indexing to settle...")
    time.sleep(5)
    
    print("\\nExecuting Queries...")
    
    md_output = [
        "# RAG Retrieval & Access Boundary Stress Test Results",
        "\\nThis report validates the system's ability to semantically discriminate between near-misses and strictly enforce RBAC access boundaries at the vector retrieval layer.",
        "\\n---"
    ]
    
    for i, test in enumerate(TEST_QUERIES, 1):
        print(f"Running Test {i}: {test['name']}")
        req = ChatQueryRequest(
            query=test['query'],
            user_role=test['role'],
            limit=3
        )
        
        t0 = time.time()
        res = await chat_service.chat_query(req)
        t1 = time.time()
        
        md_output.append(f"## Test {i}: {test['name']}")
        md_output.append(f"**Query**: `{test['query']}`")
        md_output.append(f"**Role Executing**: `{test['role']}`")
        md_output.append(f"**Expected Behavior**: {test['expected_behavior']}")
        md_output.append("")
        md_output.append("### Results")
        md_output.append(f"**Execution Time**: {t1-t0:.2f} seconds")
        md_output.append(f"**Confidence Score**: {res.confidence:.2f}")
        md_output.append("")
        md_output.append("**LLM Answer**:")
        md_output.append(f"> {res.answer}")
        md_output.append("")
        md_output.append("**Documents Retrieved by Vector DB**:")
        if res.matched_documents:
            for d in res.matched_documents:
                md_output.append(f"- `{d.title}` (Category: `{d.category}`, Similarity: `{d.similarity_score:.3f}`)")
        else:
            md_output.append("- *No documents retrieved (Access denied or no semantic match)*")
        
        md_output.append("\\n---\\n")

    print("\\nWriting artifact report...")
    with open(ARTIFACT_PATH, "w", encoding="utf-8") as f:
        f.write("\\n".join(md_output))
        
    print("Done! Test complete.")

if __name__ == "__main__":
    asyncio.run(run_stress_test())
