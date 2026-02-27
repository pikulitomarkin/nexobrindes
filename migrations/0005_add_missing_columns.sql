-- Adicionar colunas faltantes na tabela users do Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna is_commissioned (boolean com default true)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_commissioned BOOLEAN DEFAULT true;

-- 2. Adicionar coluna photo_url (text)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Atualizar valor padrão para usuários existentes
UPDATE users 
SET is_commissioned = true 
WHERE is_commissioned IS NULL;

-- 4. Verificar alterações
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Verificar dados
SELECT id, username, role, is_active, is_commissioned FROM users;