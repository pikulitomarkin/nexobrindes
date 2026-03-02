
// ==================== TELEFONE (XX) XXXXX-XXXX ====================

/** Aplica máscara (XX) XXXXX-XXXX durante a digitação. Fixo: (XX) XXXX-XXXX. Celular: (XX) 9XXXX-XXXX */
export const phoneMask = (value: string): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers ? `(${numbers}` : '';
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

/** Formata valor existente (ex: do banco) para exibição (XX) XXXXX-XXXX */
export const formatPhoneForDisplay = (value: string | null | undefined): string => {
  if (!value) return '';
  return phoneMask(value.replace(/\D/g, ''));
};

// Função para aplicar máscara de valor monetário
export const currencyMask = (value: string): string => {
  if (!value) return '';
  
  // Remove tudo exceto números e vírgula
  let numbers = value.replace(/[^\d,]/g, '');
  
  // Garante apenas uma vírgula
  const parts = numbers.split(',');
  if (parts.length > 2) {
    numbers = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limita centavos a 2 dígitos
  if (parts.length === 2 && parts[1].length > 2) {
    numbers = parts[0] + ',' + parts[1].substring(0, 2);
  }
  
  // Adiciona pontos para milhares na parte inteira
  const finalParts = numbers.split(',');
  finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return 'R$ ' + finalParts.join(',');
};

// Função para converter valor com máscara para número
export const parseCurrencyValue = (value: string): number => {
  if (!value) return 0;
  
  // Remove R$, pontos e espaços, substitui vírgula por ponto
  const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
};

// Função para formatar número para exibição em campo de moeda
export const formatCurrencyForInput = (value: number): string => {
  if (!value || value === 0) return '';
  
  // Converte número para string com 2 casas decimais no formato brasileiro
  const formatted = value.toFixed(2).replace('.', ',');
  
  // Aplica a máscara de moeda
  return currencyMask(formatted);
};

// ==================== DATAS (DD/MM/AAAA) ====================

/** Aplica máscara DD/MM/AAAA enquanto o usuário digita */
export const dateMask = (value: string): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
};

/** Converte DD/MM/AAAA para YYYY-MM-DD (ISO para API/banco) */
export const parseDateBR = (value: string): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length !== 8) return '';
  const dd = numbers.slice(0, 2);
  const mm = numbers.slice(2, 4);
  const yyyy = numbers.slice(4, 8);
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10) - 1;
  const y = parseInt(yyyy, 10);
  const date = new Date(y, m, d);
  if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return '';
  return `${yyyy}-${mm}-${dd}`;
};

/** Converte YYYY-MM-DD ou ISO para DD/MM/AAAA (exibição) */
export const formatDateToBR = (isoOrYyyyMmDd: string): string => {
  if (!isoOrYyyyMmDd) return '';
  const d = new Date(isoOrYyyyMmDd.includes('T') ? isoOrYyyyMmDd : isoOrYyyyMmDd + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
