import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_google_vertexai import VertexAIEmbeddings

# 1. Load Environment Variables
load_dotenv()

print("--- REMINISCE AI: INFRASTRUCTURE SMOKE TEST ---\n")

# 2. Check Google Cloud Connection (Vertex AI)
print("1. Testing Google Cloud (Vertex AI)...")
try:
    project_id = os.getenv("GCP_PROJECT_ID")
    if not project_id:
        raise ValueError("GCP_PROJECT_ID is missing from .env")
    
    # Initialize Embedding Model
    embeddings = VertexAIEmbeddings(
        model_name="text-embedding-004",
        project=project_id
    )
    
    # Try to embed a simple sentence
    test_text = "Hello, I am testing the Reminisce brain."
    vector = embeddings.embed_query(test_text)
    
    print(f"   ✅ SUCCESS: Generated vector with {len(vector)} dimensions.")
    
    # Verify dimensions match Pinecone requirement (768)
    if len(vector) != 768:
        print(f"   ⚠️ WARNING: Model produced {len(vector)} dims, but Pinecone needs 768!")
    else:
        print("   ✅ Dimensions match (768).")

except Exception as e:
    print(f"   ❌ FAILED: {str(e)}")
    print("   (Did you run 'gcloud auth application-default login'?)")
    exit(1)

# 3. Check Pinecone Connection
print("\n2. Testing Pinecone Vector DB...")
try:
    pc_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME")
    
    if not pc_key:
        raise ValueError("PINECONE_API_KEY is missing from .env")

    # Initialize Pinecone
    pc = Pinecone(api_key=pc_key)
    
    # Check if index exists
    existing_indexes = [i.name for i in pc.list_indexes()]
    print(f"   Found indexes: {existing_indexes}")
    
    if index_name not in existing_indexes:
        print(f"   ❌ FAILED: Index '{index_name}' not found. Please create it in the Console.")
        exit(1)
    
    index = pc.Index(index_name)
    stats = index.describe_index_stats()
    print(f"   ✅ SUCCESS: Connected to '{index_name}'.")
    print(f"   Current Vector Count: {stats.total_vector_count}")

    # 4. Integration Test (Upsert)
    print("\n3. Testing Integration (Upserting Test Vector)...")
    upsert_response = index.upsert(
        vectors=[
            ("test-id-001", vector, {"text": test_text, "type": "smoke_test"})
        ]
    )
    print("   ✅ SUCCESS: Test vector uploaded to Pinecone.")
    
    # Wait a moment for consistency
    time.sleep(1)
    
    # 5. Retrieval Test
    print("\n4. Testing Retrieval...")
    query_response = index.query(
        vector=vector,
        top_k=1,
        include_metadata=True
    )
    
    if query_response.matches:
        print(f"   ✅ SUCCESS: Retrieved memory: '{query_response.matches[0].metadata['text']}'")
    else:
        print("   ⚠️ WARNING: Uploaded vector not found yet (might be eventual consistency).")

except Exception as e:
    print(f"   ❌ FAILED: {str(e)}")
    exit(1)

print("\n--- TEST COMPLETE: ALL SYSTEMS GO ---")