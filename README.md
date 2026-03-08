Starting MkhondeChain Backend Environment"

# STEP 1: Start Hardhat Local Blockchain

echo "➡️ 1. Starting Hardhat blockchain (http://127.0.0.1:8545)..."
cd ~/Desktop/INCLUDES/mkhondechain/smart-contract
-Bash ~ npx hardhat node

sleep 2

# STEP 2: Deploy Smart Contract to Local Blockchain

echo " 2. Deploying smart contract to local blockchain..."
cd ~/Desktop/INCLUDES/mkhondechain/smart-contract
Bash ~ npx hardhat run scripts/deploy.js --network localhost

# NOTE: Update your .env file manually with the contract address printed after deployment

# STEP 3: Start MongoDB service

echo " 3. Ensuring MongoDB is running..."
sudo service mongod start

# STEP 4: Start Backend Server

c
echo "4. Starting backend server..."
cd ~/Desktop/INCLUDES/mkhondechain/backend
bash ~ "npx run start"

sleep 2

# STEP 5: Start ngrok to expose backend

echo " 5. Starting ngrok tunnel (public URL for Africa's Talking)..."
bash ~ "npx ngrok http 4000; exec bash"

echo "All systems launched!"
echo "Copy the ngrok HTTPS link and paste it into Africa’s Talking Sandbox → USSD Callback URL: <ngrok-link>/ussd"
