#!/bin/bash

# AI Assistant Testing Script
# Usage: ./test-ai-assistant.sh

BASE_URL="http://localhost:9587"
API_URL="${BASE_URL}/api/ai-assistant/chat"

echo "=========================================="
echo "AI Assistant Testing Script"
echo "=========================================="
echo ""

# Test 1: Simple greeting
echo "Test 1: Simple greeting"
echo "----------------------"
curl -s --location "${API_URL}" \
--header 'Content-Type: application/json' \
--data '{"message": "Halo, siapa kamu dan apa yang bisa kamu bantu?"}' | python3 -m json.tool
echo ""
echo ""

# Test 2: Ask about capabilities
echo "Test 2: Ask about capabilities"
echo "----------------------"
curl -s --location "${API_URL}" \
--header 'Content-Type: application/json' \
--data '{"message": "Apa saja yang bisa kamu lakukan?"}' | python3 -m json.tool
echo ""
echo ""

# Test 3: Test with session ID
echo "Test 3: Test with session ID"
echo "----------------------"
curl -s --location "${API_URL}" \
--header 'Content-Type: application/json' \
--data '{"message": "Halo", "sessionId": "test-session-123"}' | python3 -m json.tool
echo ""
echo ""

# Test 4: Test conversation history
echo "Test 4: Test conversation history (follow-up)"
echo "----------------------"
SESSION_ID="test-session-$(date +%s)"
curl -s --location "${API_URL}" \
--header 'Content-Type: application/json' \
--data "{\"message\": \"Nama saya adalah John\", \"sessionId\": \"${SESSION_ID}\"}" | python3 -m json.tool > /dev/null

echo "Follow-up question:"
curl -s --location "${API_URL}" \
--header 'Content-Type: application/json' \
--data "{\"message\": \"Siapa nama saya?\", \"sessionId\": \"${SESSION_ID}\"}" | python3 -m json.tool
echo ""
echo ""

echo "=========================================="
echo "Testing completed!"
echo "=========================================="

