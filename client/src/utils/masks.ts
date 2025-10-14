
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
  
  // Remove caracteres não numéricos exceto vírgula e ponto
  let numbers = value.replace(/[^\d,]/g, '');
  
  // Se não tem vírgula, adiciona ,00 no final se necessário
  if (!numbers.includes(',') && numbers.length > 0) {
    // Se o usuário digitou apenas números, considera como reais
    if (numbers.length <= 3) {
      numbers = numbers + ',00';
    } else {
      // Separa os centavos
      const reais = numbers.slice(0, -2);
      const centavos = numbers.slice(-2);
      numbers = reais + ',' + centavos;
    }
  }
  
  // Adiciona pontos para milhares
  const parts = numbers.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return 'R$ ' + parts.join(',');
};

// Função para converter valor com máscara para número
export const parseCurrencyValue = (value: string): number => {
  if (!value) return 0;
  
  // Remove R$, pontos e espaços, substitui vírgula por ponto
  const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
};
