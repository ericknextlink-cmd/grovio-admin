# Test script for Google OAuth endpoints (PowerShell)
# Usage: .\test-google-oauth.ps1

$BACKEND_URL = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:3000" }

Write-Host "🧪 Testing Google OAuth Endpoints" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Testing OAuth Initiation (GET /api/auth/google)" -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/google" -Method GET -UseBasicParsing
    $body = $response.Content | ConvertFrom-Json
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $body | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($body.success -and $body.url) {
        Write-Host "✅ SUCCESS: OAuth URL generated" -ForegroundColor Green
        $shortUrl = $body.url.Substring(0, [Math]::Min(100, $body.url.Length))
        Write-Host "📋 OAuth URL: $shortUrl..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🌐 To test the full flow:" -ForegroundColor Yellow
        Write-Host "   Open this URL in your browser:" -ForegroundColor White
        Write-Host "   $($body.url)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  WARNING: No URL in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2️⃣  Testing Health Endpoint" -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/health" -Method GET
    $healthResponse | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "✅ Health check passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open the OAuth URL in your browser" -ForegroundColor White
Write-Host "   2. Log in with Google" -ForegroundColor White
Write-Host "   3. You'll be redirected to: $BACKEND_URL/api/auth/google/callback" -ForegroundColor White
Write-Host "   4. Then redirected to your frontend with tokens" -ForegroundColor White
Write-Host ""

