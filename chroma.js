// chroma.js
require('dotenv').config();
const { OpenAI } = require('openai');
const { ChromaClient } = require('chromadb');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Connect to the Chroma server running on localhost:8000
const client = new ChromaClient({ path: 'http://localhost:8000' });

// Create or get collection
async function getCollection(name = 'chatbot_docs') {
  return await client.getOrCreateCollection({ name });
}

// Generate embedding for a given text
async function getEmbedding(text) {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return embeddingRes.data[0].embedding;
}

// Optional: create & seed collection with example documents & embeddings
async function createCollectionWithEmbeddings() {
  const collection = await getCollection();

  const texts = [
    "Chroma is an open-source vector database.",
    "OpenAI embeddings can be used for semantic search.",
    "This is a test document for AI RAG chatbots."
  ];

  const embeddings = await Promise.all(texts.map(getEmbedding));
  const ids = texts.map((_, i) => `doc${i + 1}`);

  await collection.add({
    ids,
    documents: texts,
    embeddings,
  });

  console.log("Documents and embeddings added to Chroma!");
}

module.exports = {
  getCollection,
  getEmbedding,
  createCollectionWithEmbeddings,
};
