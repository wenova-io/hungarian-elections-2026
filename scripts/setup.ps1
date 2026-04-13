# Hungary Elections 2026 - Setup Script (Windows/PowerShell)
Write-Host "🇭🇺 Hungary Elections 2026 - Project Setup" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Yellow

# Check Python
try {
    $pyVersion = python --version 2>&1
    Write-Host "✓ Python: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python 3 not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# Check Node
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host "`nInstalling Python dependencies..." -ForegroundColor Cyan
pip install requests beautifulsoup4 pandas scipy numpy lxml

# Create log directory
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

Write-Host "`n✅ Setup complete." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Open Claude Code:  claude" -ForegroundColor White
Write-Host "  2. Paste the prompt from scripts\run_all_prompt.txt" -ForegroundColor White
Write-Host "  3. Wait for all 5 agents to complete" -ForegroundColor White
