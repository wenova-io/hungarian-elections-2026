#!/bin/bash
# Run all agents sequentially via Claude Code
# Usage: Open Claude Code in this directory, then paste the prompt below

cat << 'PROMPT'
You are the orchestrator for the Hungary Elections 2026 research project.
Read CLAUDE.md for the full project description and hypotheses.

Run all 5 agents in strict sequential order:
1. agents/agent1_collector.md — collect all data, wait for COLLECTION_COMPLETE.json
2. agents/agent2_database.md — build SQLite DB, wait for DATABASE_COMPLETE.json
3. agents/agent3_analyzer.md — run all analyses, wait for ANALYSIS_COMPLETE.json
4. agents/agent4_webapp.md  — build Next.js app, wait for BUILD_COMPLETE.json
5. agents/agent5_writer.md  — write articles, produce ARTICLE_COMPLETE.json

Do not proceed to the next agent until the current one's completion signal exists.
Log all activity to logs/orchestrator.log.
PROMPT
