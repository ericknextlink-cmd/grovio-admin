#!/bin/bash

# Test script for Google OAuth endpoints
# Usage: bash test-google-oauth.sh

BACKEND_URL=${BACKEND_URL:-"http://localhost:3000"}

echo "🧪 Testing Google OAuth Endpoints"
echo "=================================="
echo ""

echo "1️⃣  Testing OAuth Initiation (GET /api/auth/google)"
echo "---------------------------------------------------"
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/auth/google")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Status Code: $http_code"
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
    url=$(echo "$body" | jq -r '.url' 2>/dev/null)
    if [ "$url" != "null" ] && [ ! -z "$url" ]; then
        echo "✅ SUCCESS: OAuth URL generated"
        echo "📋 OAuth URL: ${url:0:100}..."
        echo ""
        echo "🌐 To test the full flow:"
        echo "   Open this URL in your browser:"
        echo "   $url"
    else
        echo "⚠️  WARNING: No URL in response"
    fi
else
    echo "❌ FAILED: Expected status 200, got $http_code"
fi

echo ""
echo "2️⃣  Testing Health Endpoint"
echo "---------------------------------------------------"
health_response=$(curl -s "$BACKEND_URL/api/health")
echo "$health_response" | jq . 2>/dev/null || echo "$health_response"

echo ""
echo "=================================="
echo "✅ Testing Complete!"
echo ""
echo "📚 Next Steps:"
echo "   1. Open the OAuth URL in your browser"
echo "   2. Log in with Google"
echo "   3. You'll be redirected to: $BACKEND_URL/api/auth/google/callback"
echo "   4. Then redirected to your frontend with tokens"
echo ""

