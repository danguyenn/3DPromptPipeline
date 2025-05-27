# Setup:

# Copy .env.example to .env and fill in your API keys
cp .env.example .env

# How to run (through Docker container):

# 1. Build container
docker build -t chat-app .

# 2. Run container
docker run -p 5050:5000 --env-file .env chat-app


# 3. Open site on localhost
http://localhost:5050/