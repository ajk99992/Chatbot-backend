# Use official Node base with Python
FROM node:20-bullseye

# Install Python (ChromaDB needs it)
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN npm install
RUN pip3 install chromadb

# Expose API port
EXPOSE 3000

# Start ChromaDB and Node.js API server
CMD ["bash", "start.sh"]
