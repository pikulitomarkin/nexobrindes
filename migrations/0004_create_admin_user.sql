-- Criar usuário administrador padrão para o sistema
-- Execute este script no SQL Editor do Supabase ou via drizzle-kit
-- ATENÇÃO: Esta versão é compatível com a estrutura atual da tabela users no Supabase

INSERT INTO users (
  username,
  password,
  role,
  name,
  email,
  phone,
  vendor_id,
  is_active,
  specialty,
  address
) VALUES (
  'admin',
  '123456', -- Senha em texto plano (o sistema atual não usa hash)
  'admin',
  'Administrador do Sistema',
  'admin@nexobrindes.com',
  '+55 (11) 99999-9999',
  NULL, -- vendor_id (não aplicável para admin)
  true, -- is_active
  NULL, -- specialty (não aplicável para admin)
  NULL  -- address
)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  vendor_id = EXCLUDED.vendor_id,
  is_active = EXCLUDED.is_active,
  specialty = EXCLUDED.specialty,
  address = EXCLUDED.address;

-- Verificar se o usuário foi criado
SELECT id, username, role, name, email, is_active FROM users WHERE username = 'admin';