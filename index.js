// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const { getCollection, getEmbedding } = require('./chroma');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let collection;

// Initialize Chroma collection on server start
(async () => {
  collection = await getCollection('chatbot_docs'); // updated to your seeded collection name
  // Optionally seed docs on first run:
  // await createCollectionWithEmbeddings();
})();

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'Message is required' });

    // Embed user query
    const queryEmbedding = await getEmbedding(userMessage);

    // Search Chroma for top 3 related docs
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 8,
      include: ['documents', 'distances'],
    });

    console.log("Chroma search results:", results.documents);

    // If no docs found, fallback to generic response
    let contextText = "Sorry, I couldn't find relevant information.";
    if (results.documents.length && results.documents[0].length) {
      contextText = results.documents.flat().join('\n---\n');
    }

    // Compose messages for chat completion with context
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant for The Techies company. Use the provided context to answer questions.',
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nQuestion: ${userMessage}`,
      },
    ];

    // Call OpenAI chat completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 700,
      temperature: 0.2,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error during chat processing:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
