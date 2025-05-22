# PowerShell script to verify SSM parameters

$params = @(
    "/rdcircuitry/nextauth/secret",
    "/rdcircuitry/encryption/key",
    "/rdcircuitry/jwt/secret",
    "/rdcircuitry/mongodb/uri",
    "/rdcircuitry/twitter/api_key",
    "/rdcircuitry/twitter/api_secret",
    "/rdcircuitry/twitter/access_token",
    "/rdcircuitry/twitter/access_secret",
    "/rdcircuitry/twitter/bearer_token",
    "/rdcircuitry/webhook/secret"
)

Write-Host "Verifying SSM Parameters..."
Write-Host "------------------------"

foreach ($param in $params) {
    Write-Host "Checking parameter: $param"
    try {
        $result = aws ssm get-parameter --name $param --with-decryption --region us-west-2
        Write-Host "✅ Parameter exists and is accessible" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Parameter not found or not accessible" -ForegroundColor Red
    }
    Write-Host "------------------------"
} 