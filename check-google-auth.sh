#!/bin/bash

# Google Auth Troubleshooting Script for Other Machine

echo "🔍 Checking Google Authentication Setup..."
echo ""

# Check 1: Is backend server running?
echo "1️⃣ Checking if backend server is running on port 4000..."
if lsof -ti:4000 > /dev/null 2>&1; then
    echo "   ✅ Backend server IS running on port 4000"
else
    echo "   ❌ Backend server is NOT running on port 4000"
    echo "   👉 You need to start the server with: yarn dev"
fi
echo ""

# Check 2: Does nodemon.json exist?
echo "2️⃣ Checking if server/nodemon.json exists..."
if [ -f "server/nodemon.json" ]; then
    echo "   ✅ server/nodemon.json exists"
else
    echo "   ❌ server/nodemon.json is MISSING"
    echo "   👉 You need to pull the latest changes: git pull origin main"
fi
echo ""

# Check 3: Does .env exist and have required variables?
echo "3️⃣ Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check for required variables
    for var in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET REACT_APP_BACKEND_URL REACT_APP_API_URL; do
        if grep -q "^${var}=" .env; then
            echo "   ✅ $var is set"
        else
            echo "   ❌ $var is MISSING"
        fi
    done
else
    echo "   ❌ .env file is MISSING"
fi
echo ""

# Check 4: Are node_modules installed?
echo "4️⃣ Checking node_modules..."
if [ -d "node_modules" ] && [ -d "server/node_modules" ] && [ -d "frontend/node_modules" ]; then
    echo "   ✅ All node_modules are installed"
else
    echo "   ⚠️  Some node_modules might be missing"
    echo "   👉 Run: npm install"
fi
echo ""

echo "📋 Summary - To fix the issue, run these commands in order:"
echo "   1. git pull origin main          # Get latest changes including nodemon.json"
echo "   2. npm install                   # Install dependencies"
echo "   3. yarn dev                      # Start both servers"
echo ""


