import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { CohereEmbeddings } from "@langchain/cohere";
import { Document } from "@langchain/core/documents";

let vectorStoreInstance = null;
let client = null;

export const initVectorStore = async () => {
  if (vectorStoreInstance) return vectorStoreInstance;

  const mongoUri = process.env.AI_MONGO_URI;
  if (!mongoUri) {
    throw new Error("AI_MONGO_URI is not defined.");
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  
  const collection = client.db("ai").collection("code_embeddings");

  // Using Cohere for embeddings, which works well for code
  const embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0"
  });

  vectorStoreInstance = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: "vector_index", // Make sure this matches the index in Atlas UI
    textKey: "text",
    embeddingKey: "embedding",
  });

  return vectorStoreInstance;
};

export const embedCodebase = async (projectId, files) => {
  const vectorStore = await initVectorStore();
  
  // First, delete old embeddings for this project to prevent duplicates
  await client.db("ai").collection("code_embeddings").deleteMany({ projectId });

  const docs = files.map((file) => {
    return new Document({
      pageContent: `File: ${file.path}\n\n${file.content}`,
      metadata: {
        projectId,
        path: file.path
      }
    });
  });

  if (docs.length > 0) {
    await vectorStore.addDocuments(docs);
  }
};

export const searchCodebase = async (projectId, query, k = 5) => {
  const vectorStore = await initVectorStore();
  
  // 1. Fetch top 20 candidates from vector search
  const results = await vectorStore.similaritySearch(query, 20, {
    preFilter: { projectId: { $eq: projectId } }
  });

  if (results.length === 0) return [];

  // 2. Prepare documents for Cohere Re-rank
  const documents = results.map(doc => doc.pageContent);

  try {
    // 3. Call Cohere Re-rank API
    const response = await fetch("https://api.cohere.ai/v1/rerank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: "rerank-english-v3.0",
        query: query,
        documents: documents,
        top_n: k
      })
    });

    if (!response.ok) {
      console.warn("Cohere Re-rank failed, falling back to original vector search results", await response.text());
      return results.slice(0, k);
    }

    const rerankData = await response.json();
    
    // 4. Map the re-ranked indices back to the original documents
    const rerankedResults = rerankData.results.map(r => results[r.index]);
    
    return rerankedResults;

  } catch (error) {
    console.error("Error during Cohere re-ranking:", error);
    // Fallback to basic vector search on error
    return results.slice(0, k);
  }
};
