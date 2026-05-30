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
  
  // Search within the specific project
  const results = await vectorStore.similaritySearch(query, k, {
    preFilter: { projectId: { $eq: projectId } }
  });
  
  return results;
};
