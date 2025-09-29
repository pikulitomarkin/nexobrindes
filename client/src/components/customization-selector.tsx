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
  customizationValue?: number;
  onCustomizationValueChange?: (value: number) => void;
  customizationDescription?: string;
  onCustomizationDescriptionChange?: (description: string) => void;
}

export function CustomizationSelector({ 
  productCategory,
  quantity, 
  selectedCustomization, 
  onCustomizationChange,
  customizationValue = 0,
  onCustomizationValueChange,
  customizationDescription = '',
  onCustomizationDescriptionChange
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

  const selectedCustomizationData = filteredCustomizations.find((c: any) => c.id === selectedCustomization);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Carregando opções de personalização...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6 bg-blue-50 rounded-lg border border-blue-200 min-h-[300px]">
      <div className="space-y-5">
        <div className="w-full">
          <Label htmlFor="category-filter" className="text-sm font-semibold text-blue-900 mb-2 block">
            Buscar por Categoria
          </Label>
          <Input
            id="category-filter"
            placeholder="Digite a categoria (ex: copo, mochila, mesa...)"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-11 text-base"
          />
          <p className="text-xs text-blue-600 mt-1">
            Digite o tipo de produto para ver as personalizações disponíveis
          </p>
        </div>

        {categoryFilter.trim() && filteredCustomizations.length > 0 && (
          <div className="w-full">
            <Label htmlFor="customization-select" className="text-sm font-semibold text-blue-900 mb-2 block">
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
                  // Auto-preenche o valor se disponível
                  if (customization && onCustomizationValueChange) {
                    onCustomizationValueChange(parseFloat(customization.price) || 0);
                  }
                  if (customization && onCustomizationDescriptionChange) {
                    onCustomizationDescriptionChange(customization.name);
                  }
                }
              }}
            >
              <SelectTrigger id="customization-select" className="w-full h-11">
                <SelectValue placeholder="Selecione uma personalização" />
              </SelectTrigger>
              <SelectContent className="max-h-80 w-full min-w-[400px]">
                <SelectItem value="none" className="py-3">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-600">Sem personalização</span>
                  </div>
                </SelectItem>
                {filteredCustomizations.map((customization: any) => (
                  <SelectItem key={customization.id} value={customization.id} className="py-3">
                    <div className="flex flex-col gap-2 w-full">
                      <span className="font-semibold text-base">{customization.name}</span>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span className="bg-blue-100 px-2 py-1 rounded">
                          Categoria: {customization.category}
                        </span>
                        <span className="bg-orange-100 px-2 py-1 rounded">
                          Min: {customization.minQuantity} unidades
                        </span>
                        <span className="bg-green-100 px-2 py-1 rounded font-semibold text-green-700">
                          R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {categoryFilter.trim() && filteredCustomizations.length === 0 && (
          <div className="w-full text-sm text-orange-700 bg-orange-100 p-4 rounded border border-orange-300">
            <strong>Nenhuma personalização encontrada</strong> para a categoria "{categoryFilter}".
            <br />
            Tente outras palavras como: copo, mochila, mesa, camiseta, etc.
          </div>
        )}

        {!categoryFilter.trim() && (
          <div className="w-full text-sm text-blue-700 bg-blue-100 p-4 rounded border border-blue-300">
            <strong>Como funciona:</strong>
            <br />
            1. Digite uma categoria no campo acima (ex: copo, mochila, mesa)
            <br />
            2. Escolha a personalização desejada no dropdown que aparecer
            <br />
            3. Configure a quantidade e valores abaixo
          </div>
        )}
      </div>

      {/* Campos de configuração da personalização */}
      {selectedCustomizationData && (
          <div className="w-full mt-6 p-5 bg-white rounded-lg border border-blue-300 shadow-sm">
            <h4 className="text-lg font-semibold text-blue-900 mb-4 border-b border-blue-200 pb-2">
              Configuração: {selectedCustomizationData.name}
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
              <div className="space-y-2">
                <Label htmlFor="customization-value" className="text-sm font-semibold text-gray-700">
                  Valor Unitário (R$)
                </Label>
                <Input
                  id="customization-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customizationValue}
                  onChange={(e) => onCustomizationValueChange?.(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="h-11"
                />
                <p className="text-xs text-gray-500">
                  Preço sugerido: R$ {parseFloat(selectedCustomizationData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customization-description" className="text-sm font-semibold text-gray-700">
                  Descrição
                </Label>
                <Input
                  id="customization-description"
                  value={customizationDescription}
                  onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
                  placeholder="Ex: Serigrafia 1 cor"
                  className="h-11"
                />
                <p className="text-xs text-gray-500">
                  Mínimo: {selectedCustomizationData.minQuantity} unidades
                </p>
              </div>
            </div>

            {/* Resumo simples */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    ✅ Personalização: {selectedCustomizationData.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    Categoria: {selectedCustomizationData.category} • Valor: R$ {customizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}