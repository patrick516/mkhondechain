#!/bin/bash

# Start your Node.js server (adjust if you're using nodemon)
echo "Starting backend server..."
nohup node server.js > server.log 2>&1 &

# Give server time to start
sleep 2

# Start ngrok in background on port 4000 (your backend port)
echo "Starting ngrok tunnel..."
nohup ngrok http 4000 > ngrok.log 2>&1 &

# Give ngrok time to start
sleep 3

# Get the public URL from ngrok API
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels \
  | grep -o 'https://[a-zA-Z0-9.-]*\.ngrok-free\.app' \
  | head -n1)

# Display the URL to the user
echo " Copy this URL and paste it in Africa's Talking callback:"
echo "$NGROK_URL/ussd"
