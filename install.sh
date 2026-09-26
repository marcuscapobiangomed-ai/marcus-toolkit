#!/bin/bash

# Marcus Toolkit Installer
# Usage: bash install.sh /path/to/project

if [ -z "$1" ]; then
  echo "Usage: bash install.sh /path/to/project"
  echo "Example: bash install.sh ~/projects/my-app"
  exit 1
fi

PROJECT_DIR="$1"
TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory not found: $PROJECT_DIR"
  exit 1
fi

echo "📦 Installing Marcus Toolkit into $PROJECT_DIR"

# Create .claude directory structure
mkdir -p "$PROJECT_DIR/.claude/agents"
mkdir -p "$PROJECT_DIR/.claude/skills"

# Copy files
echo "📋 Copying general agents..."
cp -r "$TOOLKIT_DIR/agents/"* "$PROJECT_DIR/.claude/agents/" 2>/dev/null || echo "⚠️  No general agents found"

echo "📋 Copying academic review agents..."
cp -r "$TOOLKIT_DIR/ESCRITOS ARTIGOS V2/revisao-literatura-ia/agents/"* "$PROJECT_DIR/.claude/agents/" 2>/dev/null || echo "⚠️  No academic agents found"

echo "📋 Copying skills..."
cp -r "$TOOLKIT_DIR/skills/"* "$PROJECT_DIR/.claude/skills/" 2>/dev/null || echo "⚠️  No skills found"

echo "✅ Toolkit installed successfully!"
echo "📍 Location: $PROJECT_DIR/.claude/"
