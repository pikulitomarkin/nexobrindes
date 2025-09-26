
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
      <div className="text-sm text-gray-500 p-2">
        Carregando opções de personalização...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="space-y-3">
        <div>
          <Label htmlFor="category-filter" className="text-sm font-medium text-blue-900">
            Buscar por Categoria
          </Label>
          <Input
            id="category-filter"
            placeholder="Digite a categoria (ex: copo, mochila, mesa...)"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1"
          />
        </div>

        {categoryFilter.trim() && filteredCustomizations.length > 0 && (
          <div>
            <Label htmlFor="customization-select" className="text-sm font-medium text-blue-900">
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
              <SelectTrigger id="customization-select" className="mt-1">
                <SelectValue placeholder="Selecione uma personalização" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">Sem personalização</SelectItem>
                {filteredCustomizations.map((customization: any) => (
                  <SelectItem key={customization.id} value={customization.id}>
                    <div className="flex flex-col py-1">
                      <span className="font-medium">{customization.name}</span>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span>Categoria: {customization.category}</span>
                        <span>Min: {customization.minQuantity} un</span>
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
        )}

        {categoryFilter.trim() && filteredCustomizations.length === 0 && (
          <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded border border-orange-300">
            Nenhuma personalização encontrada para a categoria "{categoryFilter}"
          </div>
        )}

        {!categoryFilter.trim() && (
          <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded border border-blue-300">
            Digite uma categoria no campo acima para ver as personalizações disponíveis
          </div>
        )}
      </div>

      {/* Campos de configuração da personalização */}
      {selectedCustomizationData && (
        <div className="mt-4 p-3 bg-white rounded border border-blue-300">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Configuração da Personalização</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="customization-quantity" className="text-sm font-medium">
                Qtd. a Personalizar
              </Label>
              <Input
                id="customization-quantity"
                type="number"
                min="1"
                max={quantity}
                value={customizationQuantity}
                onChange={(e) => onCustomizationQuantityChange?.(parseInt(e.target.value) || 0)}
                placeholder={`Máx: ${quantity}`}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mín: {selectedCustomizationData.minQuantity} / Máx: {quantity} unidades
              </p>
            </div>

            <div>
              <Label htmlFor="customization-value" className="text-sm font-medium">
                Valor Unit. (R$)
              </Label>
              <Input
                id="customization-value"
                type="number"
                step="0.01"
                min="0"
                value={customizationValue}
                onChange={(e) => onCustomizationValueChange?.(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customization-description" className="text-sm font-medium">
                Descrição
              </Label>
              <Input
                id="customization-description"
                value={customizationDescription}
                onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
                placeholder="Ex: Serigrafia 1 cor"
                className="mt-1"
              />
            </div>
          </div>

          {customizationQuantity > 0 && customizationValue > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Total da Personalização:</strong> {customizationQuantity} × R$ {customizationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                <strong className="ml-1">R$ {(customizationQuantity * customizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
