#!/bin/bash
set -e

echo "🔧 Configurando ambiente de build do Vercel..."

# Clean up problematic lock files that might have OS-specific references
echo "🧹 Limpando arquivos de lock problemáticos..."
rm -f package-lock.json
rm -rf node_modules

# Configure npm to skip optional dependencies
echo "📦 Configurando npm para ignorar dependências opcionais..."
npm config set optional false

# Install dependencies without optional packages
echo "📦 Instalando dependências (ignorando opcionais)..."
npm install --omit=optional --legacy-peer-deps

# Build the project
echo "🏗️  Construindo projeto..."
npm run build

echo "✅ Build concluído com sucesso!"