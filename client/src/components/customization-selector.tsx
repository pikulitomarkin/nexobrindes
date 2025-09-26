
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface CustomizationSelectorProps {
  productCategory?: string | undefined;
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
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: customizations = [], isLoading } = useQuery({
    queryKey: ["/api/settings/customization-options"],
    queryFn: async () => {
      const response = await fetch('/api/settings/customization-options');
      if (!response.ok) return [];
      const allCustomizations = await response.json();

      return allCustomizations.filter((c: any) => 
        c.isActive
      );
    },
  });

  // Filtra personalizações pela categoria digitada
  const filteredCustomizations = customizations.filter((customization: any) => {
    if (!categoryFilter.trim()) return false;
    return customization.category.toLowerCase().includes(categoryFilter.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Carregando opções de personalização...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 bg-blue-50 rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="category-filter" className="text-sm font-medium">
          Buscar por Categoria
        </Label>
        <Input
          id="category-filter"
          placeholder="Digite a categoria (ex: copo, mochila, mesa...)"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full"
        />
      </div>

      {categoryFilter.trim() ? (
        filteredCustomizations.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="customization-select" className="text-sm font-medium">
              Opção de Personalização
            </Label>
            <Select 
              value={selectedCustomization || "none"} 
              onValueChange={(value) => {
                if (value === "none") {
                  onCustomizationChange(null);
                } else {
                  const customization = filteredCustomizations.find((c: any) => c.id === value);
                  onCustomizationChange(customization);
                }
              }}
            >
              <SelectTrigger id="customization-select">
                <SelectValue placeholder="Selecione uma personalização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem personalização</SelectItem>
                {filteredCustomizations.map((customization: any) => (
                  <SelectItem key={customization.id} value={customization.id}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{customization.name}</span>
                        <span className="text-xs text-gray-500">{customization.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                        <span>Min: {customization.minQuantity}</span>
                        <span className="font-medium text-green-600">
                          R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded border border-orange-200">
            Nenhuma personalização encontrada para a categoria "{categoryFilter}"
          </div>
        )
      ) : (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
          Digite uma categoria no campo acima para ver as personalizações disponíveis
        </div>
      )}
    </div>
  );
}
