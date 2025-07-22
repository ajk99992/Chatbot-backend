#!/bin/bash

# Start ChromaDB in background
python3 -m chromadb.run --path ./chroma_db &

# Wait a bit to ensure ChromaDB is ready
sleep 3

# Start Node server
node index.js
