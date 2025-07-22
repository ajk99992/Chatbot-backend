require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { ChromaClient } = require('chromadb');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SECTION_HEADERS = [
  "About Us",
  "Our Services",
  "Pricing",
  "Who Is This For?",
  "Tech Stack",
  "FAQs"
];

async function getEmbedding(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

function splitBySections(lines) {
  const chunks = [];
  let currentSection = "";

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (SECTION_HEADERS.includes(line)) {
      if (currentSection.trim().length > 0) {
        chunks.push(currentSection.trim());
      }
      currentSection = `## ${line}\n`;
    } else {
      currentSection += `${line}\n`;
    }
  }

  if (currentSection.trim().length > 0) {
    chunks.push(currentSection.trim());
  }

  return chunks;
}

async function createAndSeedCollection(docxFilePath) {
  try {
    const buffer = fs.readFileSync(docxFilePath);
    const result = await mammoth.extractRawText({ buffer });
    const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);

    const chunks = splitBySections(lines);
    console.log("🔍 Structured Chunks:");
    chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i + 1}:\n${chunk}\n---`);
    });

    if (chunks.length === 0) {
      console.error("❌ No chunks found!");
      return;
    }

    const client = new ChromaClient({ path: 'http://localhost:8000' });
    const collection = await client.getOrCreateCollection({ name: 'chatbot_docs' });

    const embeddings = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      embeddings.push(embedding);
    }

    const ids = chunks.map((_, i) => `chunk_${i + 1}`);
    const metadatas = chunks.map(() => ({ source: path.basename(docxFilePath) }));

    if (
      chunks.length !== embeddings.length ||
      chunks.length !== ids.length ||
      chunks.length !== metadatas.length
    ) {
      console.error("❌ One or more arrays are mismatched in length");
      return;
    }

    await collection.add({
      ids,
      documents: chunks,
      embeddings,
      metadatas,
    });

    console.log(`✅ Successfully added ${chunks.length} structured chunks to Chroma.`);
  } catch (err) {
    console.error("❌ Error seeding collection:", err);
  }
}

createAndSeedCollection('./Techies_AI_Chatbot_Overview.docx');
