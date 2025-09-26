
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CustomizationSelectorProps {
  productCategory?: string | undefined; // Mantido para compatibilidade, mas não usado
  quantity: number;
  selectedCustomization: string | undefined;
  onCustomizationChange: (customization: any) => void;
}

export function CustomizationSelector({ 
  productCategory, // Parâmetro ignorado - sempre mostra todas as personalizações
  quantity, 
  selectedCustomization, 
  onCustomizationChange 
}: CustomizationSelectorProps) {
  const { data: customizations = [], isLoading } = useQuery({
    queryKey: ["/api/settings/customization-options", quantity],
    queryFn: async () => {
      // Busca TODAS as personalizações ativas do sistema - INDEPENDENTE da categoria do produto
      const response = await fetch('/api/settings/customization-options');
      if (!response.ok) return [];
      const allCustomizations = await response.json();
      
      // Filtra APENAS por quantidade mínima e status ativo
      // NÃO filtra por categoria - mostra TUDO que está ativo
      return allCustomizations.filter((c: any) => 
        c.isActive && c.minQuantity <= quantity
      );
    },
    enabled: quantity > 0,
  });

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Carregando opções de personalização...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Opção de Personalização</Label>
        <Select 
          value={selectedCustomization || "none"} 
          onValueChange={(value) => {
            if (value === "none") {
              onCustomizationChange(null);
            } else {
              const customization = customizations.find((c: any) => c.id === value);
              onCustomizationChange(customization);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma personalização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem personalização</SelectItem>
            {customizations.map((customization: any) => (
              <SelectItem key={customization.id} value={customization.id}>
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{customization.name}</span>
                    <span className="text-xs text-gray-500">{customization.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                    <span>Min: {customization.minQuantity}</span>
                    <span className="font-medium text-green-600">R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-gray-500 mt-1">
          Mostrando TODAS as personalizações ativas (todas as categorias) para quantidade: {quantity} unidades
        </div>
      </div>

      {customizations.length === 0 && !isLoading && (
        <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
          <p className="font-medium mb-1">Nenhuma personalização disponível</p>
          <p className="text-xs">
            {quantity > 0 ? 
              `Para quantidade ${quantity}, não há personalizações ativas cadastradas no sistema com quantidade mínima adequada.` :
              'Defina uma quantidade para ver as personalizações disponíveis.'
            }
            <br />
            Todas as personalizações ativas são exibidas, independente da categoria do produto.
          </p>
        </div>
      )}

      {customizations.length > 0 && (
        <div className="bg-blue-50 p-3 rounded text-sm border border-blue-200">
          <h4 className="font-medium mb-2 text-blue-800">
            {customizations.length} personalização(ões) disponível(eis) - Todas as categorias:
          </h4>
          <div className="space-y-1">
            {customizations.map((customization: any) => (
              <div key={customization.id} className="flex justify-between text-xs">
                <span className="font-medium">{customization.name}</span>
                <span className="text-gray-600">
                  {customization.category} | Mín: {customization.minQuantity} | R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
