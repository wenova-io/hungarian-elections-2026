# Check all prerequisites for the project
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

$ok = $true

# Python
try {
    $v = python --version 2>&1
    Write-Host "✓ $v" -ForegroundColor Green
} catch {
    Write-Host "✗ Python 3 missing - https://python.org" -ForegroundColor Red
    $ok = $false
}

# Node
try {
    $v = node --version 2>&1
    Write-Host "✓ Node.js $v" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js missing - https://nodejs.org" -ForegroundColor Red
    $ok = $false
}

# Claude Code (claude CLI)
try {
    $v = claude --version 2>&1
    Write-Host "✓ Claude Code: $v" -ForegroundColor Green
} catch {
    Write-Host "✗ Claude Code missing - npm install -g @anthropic-ai/claude-code" -ForegroundColor Red
    $ok = $false
}

# pip packages
$packages = @("requests", "beautifulsoup4", "pandas", "scipy", "numpy")
foreach ($pkg in $packages) {
    $result = pip show $pkg 2>&1
    if ($result -match "Name:") {
        Write-Host "✓ pip: $pkg" -ForegroundColor Green
    } else {
        Write-Host "✗ pip: $pkg missing (run setup.ps1)" -ForegroundColor Yellow
    }
}

if ($ok) {
    Write-Host "`n✅ All prerequisites met. Ready to run!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Fix the above issues then re-run check_prereqs.ps1" -ForegroundColor Yellow
}
