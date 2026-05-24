# Gemivora CMS — Database setup helper (Windows PowerShell)
param(
  [switch]$UseDocker
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if ($UseDocker) {
  Write-Host "Starting Docker PostgreSQL on port 5433..." -ForegroundColor Cyan
  docker compose up -d
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $envContent = @"
DATABASE_URL="postgresql://postgres:password@localhost:5433/gemivora_cms?schema=public"
JWT_SECRET="change-this-to-a-long-random-secret-in-production"
JWT_EXPIRES_IN="7d"
PORT=4000
CORS_ORIGIN="http://localhost:3001"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
"@
  Set-Content -Path ".env" -Value $envContent -Encoding UTF8
  Write-Host "Wrote .env for Docker Postgres (port 5433)" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "Local PostgreSQL setup" -ForegroundColor Cyan
  Write-Host "Enter the password for the 'postgres' user (set during PostgreSQL install):"
  $secure = Read-Host -AsSecureString
  $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )

  $encodedPassword = [uri]::EscapeDataString($password)
  $dbUrl = "postgresql://postgres:${encodedPassword}@localhost:5432/gemivora_cms?schema=public"

  $envContent = @"
DATABASE_URL="$dbUrl"
JWT_SECRET="change-this-to-a-long-random-secret-in-production"
JWT_EXPIRES_IN="7d"
PORT=4000
CORS_ORIGIN="http://localhost:3001"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
"@
  Set-Content -Path ".env" -Value $envContent -Encoding UTF8
  Write-Host "Wrote .env with your PostgreSQL credentials" -ForegroundColor Green
}

Write-Host ""
Write-Host "Running migrations and seed..." -ForegroundColor Cyan
npm run db:generate
npm run db:push
npm run db:seed

Write-Host ""
Write-Host "Done! Start the API with: npm run dev" -ForegroundColor Green
