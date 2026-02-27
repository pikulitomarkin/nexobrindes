Write-Host "🔧 Configurando ambiente de build do Vercel..." -ForegroundColor Cyan

# Clean up problematic lock files that might have OS-specific references
Write-Host "🧹 Limpando arquivos de lock problemáticos..." -ForegroundColor Yellow
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Install dependencies without optional packages
Write-Host "📦 Instalando dependências (ignorando opcionais)..." -ForegroundColor Cyan
npm install --omit=optional --legacy-peer-deps

# Build the project
Write-Host "🏗️  Construindo projeto..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green