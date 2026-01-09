#!/bin/bash

echo "=== Phase 1 Integration Test Suite ==="
echo ""

# Test 1: Security Headers
echo "Test 1: Checking Security Headers..."
HEADERS=$(curl -sI http://localhost:3001/health 2>&1)

if echo "$HEADERS" | grep -q "x-frame-options"; then
    echo "✅ X-Frame-Options header present"
else
    echo "❌ X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -q "x-content-type-options"; then
    echo "✅ X-Content-Type-Options header present"
else
    echo "❌ X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -q "strict-transport-security"; then
    echo "✅ Strict-Transport-Security header present"
else
    echo "❌ Strict-Transport-Security header missing"
fi

if echo "$HEADERS" | grep -q "content-security-policy"; then
    echo "✅ Content-Security-Policy header present"
else
    echo "❌ Content-Security-Policy header missing"
fi

echo ""

# Test 2: Server Health
echo "Test 2: Checking Server Health..."
HEALTH=$(curl -s http://localhost:3001/health 2>&1)

if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Server is healthy"
else
    echo "❌ Server health check failed"
fi

echo ""

# Test 3: Argon2 Service Tests
echo "Test 3: Running Argon2 Service Unit Tests..."
cd /Users/ayushns01/Desktop/Repositories/Walletrix/backend
npm test -- argon2Service.test.js --silent 2>&1 | grep -E "(PASS|FAIL|Tests:|✓|✕)"

echo ""

# Test 4: Test Registration with Argon2 (manual API test)
echo "Test 4: Testing User Registration with Argon2..."
TEST_EMAIL="test-argon2-$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\",\"displayName\":\"Test User\"}" 2>&1)

if echo "$REGISTER_RESPONSE" | grep -q "success"; then
    echo "✅ User registration successful"
    
    # Extract access token
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    # Test login
    echo "Test 5: Testing Login with Argon2..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}" 2>&1)
    
    if echo "$LOGIN_RESPONSE" | grep -q "success"; then
        echo "✅ Login successful with Argon2 hash"
    else
        echo "❌ Login failed"
    fi
else
    echo "❌ User registration failed"
    echo "Response: $REGISTER_RESPONSE"
fi

echo ""
echo "=== Test Suite Complete ==="
