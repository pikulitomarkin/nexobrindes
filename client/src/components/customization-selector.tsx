
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CustomizationSelectorProps {
  productCategory: string | undefined;
  quantity: number;
  selectedCustomization: string | undefined;
  onCustomizationChange: (customization: any) => void;
}

export function CustomizationSelector({ 
  productCategory, 
  quantity, 
  selectedCustomization, 
  onCustomizationChange 
}: CustomizationSelectorProps) {
  const { data: customizations = [], isLoading } = useQuery({
    queryKey: ["/api/settings/customization-options", { category: productCategory, quantity }],
    queryFn: async () => {
      // Se não há categoria do produto ou categoria está vazia, busca todas as personalizações
      if (!productCategory || productCategory.trim() === '') {
        const response = await fetch('/api/settings/customization-options');
        if (!response.ok) return [];
        const allCustomizations = await response.json();
        // Filtra apenas por quantidade mínima
        return allCustomizations.filter((c: any) => c.minQuantity <= quantity && c.isActive);
      }
      
      // Se há categoria, busca por categoria específica
      const response = await fetch(`/api/settings/customization-options/category/${encodeURIComponent(productCategory)}?minQuantity=${quantity}`);
      if (!response.ok) return [];
      return response.json();
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
                  <span>{customization.name}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                    <span>Min: {customization.minQuantity}</span>
                    <span>R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-gray-500 mt-1">
          Categoria: {productCategory || 'Todas as categorias'} | Quantidade: {quantity} unidades
        </div>
      </div>

      {customizations.length === 0 && (
        <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
          <p className="font-medium mb-1">Nenhuma personalização pré-cadastrada disponível</p>
          <p className="text-xs">
            {productCategory ? 
              `Para a categoria "${productCategory}" com quantidade ${quantity}, não há opções cadastradas.` :
              `Para quantidade ${quantity}, não há opções cadastradas.`
            }
            <br />
            Você pode criar uma personalização customizada usando os campos abaixo.
          </p>
        </div>
      )}

      {customizations.length > 0 && (
        <div className="bg-gray-50 p-3 rounded text-sm">
          <h4 className="font-medium mb-2">Opções pré-cadastradas disponíveis:</h4>
          <div className="space-y-1">
            {customizations.map((customization: any) => (
              <div key={customization.id} className="flex justify-between text-xs">
                <span>{customization.name}</span>
                <span>
                  Mín: {customization.minQuantity} | R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
