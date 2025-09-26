
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
      if (!productCategory) return [];
      
      const response = await fetch(`/api/settings/customization-options/category/${encodeURIComponent(productCategory)}?minQuantity=${quantity}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!productCategory && quantity > 0,
  });

  if (!productCategory) {
    return (
      <div className="text-sm text-gray-500">
        Selecione um produto para ver as opções de personalização
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Carregando opções de personalização...
      </div>
    );
  }

  if (customizations.length === 0) {
    return (
      <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
        Nenhuma personalização disponível para a categoria "{productCategory}" com quantidade {quantity}.
        <br />
        <span className="text-xs">Verifique se há opções cadastradas com quantidade mínima menor ou igual a {quantity}.</span>
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
          Categoria: {productCategory} | Quantidade: {quantity} unidades
        </div>
      </div>

      {customizations.length > 0 && (
        <div className="bg-gray-50 p-3 rounded text-sm">
          <h4 className="font-medium mb-2">Opções disponíveis:</h4>
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
