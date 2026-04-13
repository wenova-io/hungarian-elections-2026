#!/bin/bash
# Hungary Elections Project — Setup Script
echo "🇭🇺 Hungary Elections 2026 — Project Setup"
echo "==========================================="

# Check Python
python3 --version || { echo "ERROR: Python 3 required"; exit 1; }

# Check Node
node --version || { echo "ERROR: Node.js 18+ required"; exit 1; }

# Install Python deps
echo "Installing Python dependencies..."
pip install requests beautifulsoup4 pandas scipy numpy lxml --break-system-packages 2>/dev/null || \
pip install requests beautifulsoup4 pandas scipy numpy lxml

# Create log dir
mkdir -p logs

echo ""
echo "✅ Setup complete."
echo ""
echo "Run agents in order:"
echo "  1. Open Claude Code: claude"
echo "  2. Say: 'Run Agent 1 from agents/agent1_collector.md'"
echo "  3. Wait for COLLECTION_COMPLETE.json"
echo "  4. Say: 'Run Agent 2 from agents/agent2_database.md'"
echo "  5. Continue through Agent 5"
echo ""
echo "Or run all at once:"
echo "  Say to Claude Code: 'Run all agents sequentially as defined in CLAUDE.md'"
