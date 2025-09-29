
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
  customizationQuantity?: number;
  onCustomizationQuantityChange?: (quantity: number) => void;
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
  customizationQuantity = 0,
  onCustomizationQuantityChange,
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
            Configuração da Personalização: {selectedCustomizationData.name}
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="customization-quantity" className="text-sm font-semibold text-gray-700">
                Quantidade a Personalizar
              </Label>
              <Input
                id="customization-quantity"
                type="number"
                min={selectedCustomizationData.minQuantity}
                max={quantity}
                value={customizationQuantity}
                onChange={(e) => {
                  const qty = parseInt(e.target.value) || 0;
                  onCustomizationQuantityChange?.(qty);
                  
                  // Auto-calcular o valor baseado na quantidade mínima
                  if (qty >= selectedCustomizationData.minQuantity) {
                    onCustomizationValueChange?.(parseFloat(selectedCustomizationData.price) || 0);
                  }
                }}
                placeholder={`Mínimo: ${selectedCustomizationData.minQuantity}`}
                className={`h-11 ${customizationQuantity > 0 && customizationQuantity < selectedCustomizationData.minQuantity ? 'border-red-500' : ''}`}
              />
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  Mínimo: {selectedCustomizationData.minQuantity} / Máximo: {quantity} unidades
                </p>
                {customizationQuantity > 0 && customizationQuantity < selectedCustomizationData.minQuantity && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded">
                    ⚠️ Quantidade insuficiente! Mínimo necessário: {selectedCustomizationData.minQuantity} unidades
                  </p>
                )}
              </div>
            </div>

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
                disabled={customizationQuantity < selectedCustomizationData.minQuantity}
              />
              <p className="text-xs text-gray-500">
                Preço sugerido: R$ {parseFloat(selectedCustomizationData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customization-description" className="text-sm font-semibold text-gray-700">
                Descrição da Personalização
              </Label>
              <Input
                id="customization-description"
                value={customizationDescription}
                onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
                placeholder="Ex: Serigrafia 1 cor"
                className="h-11"
              />
              <p className="text-xs text-gray-500">
                Descreva detalhes da personalização
              </p>
            </div>
          </div>

          {/* Resumo da personalização */}
          <div className="mt-5 pt-4 border-t border-gray-200">
            {customizationQuantity >= selectedCustomizationData.minQuantity && customizationValue > 0 ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      ✅ Personalização Válida
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      {customizationQuantity} × R$ {customizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                      <span className="ml-2 text-xl">R$ {(customizationQuantity * customizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">Total da personalização</p>
                  </div>
                </div>
              </div>
            ) : customizationQuantity > 0 && customizationQuantity < selectedCustomizationData.minQuantity ? (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">
                  ❌ Quantidade Insuficiente
                </p>
                <p className="text-sm text-red-700">
                  Esta personalização requer no mínimo <strong>{selectedCustomizationData.minQuantity} unidades</strong>.
                </p>
                <p className="text-sm text-red-700 mt-2">
                  <strong>Valor mínimo seria:</strong> {selectedCustomizationData.minQuantity} × R$ {parseFloat(selectedCustomizationData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                  <strong className="ml-1">R$ {(selectedCustomizationData.minQuantity * parseFloat(selectedCustomizationData.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  Configure a quantidade e valores acima para ver o total da personalização
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
