
// Função para aplicar máscara de telefone
export const phoneMask = (value: string): string => {
  if (!value) return '';
  
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara baseada no tamanho
  if (numbers.length <= 10) {
    // Telefone fixo: (11) 1234-5678
    return numbers.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').replace(/\-$/, '');
  } else {
    // Celular: (11) 91234-5678
    return numbers.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').replace(/\-$/, '');
  }
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
