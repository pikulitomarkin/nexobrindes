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
  onValidationError?: (error: string) => void;
}

export function CustomizationSelector({ 
  productCategory,
  quantity, 
  selectedCustomization, 
  onCustomizationChange,
  customizationValue = 0,
  onCustomizationValueChange,
  customizationDescription = '',
  onCustomizationDescriptionChange,
  onValidationError
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

  // Filtra personalizações pela categoria digitada - TODAS da categoria
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
    <div className="w-full space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="space-y-4">
        <div className="w-full">
          <Label htmlFor="category-filter" className="text-sm font-semibold text-blue-900 mb-2 block">
            Buscar por Categoria
          </Label>
          <Input
            id="category-filter"
            placeholder="Digite a categoria (ex: copo, mochila, mesa...)"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-10 text-base"
          />
          <p className="text-xs text-blue-600 mt-1">
            Digite o tipo de produto para ver as personalizações disponíveis
          </p>
        </div>

        {categoryFilter.trim() && filteredCustomizations.length > 0 && (
          <div className="w-full">
            <Label htmlFor="customization-select" className="text-sm font-semibold text-blue-900 mb-2 block">
              Personalizações Disponíveis ({filteredCustomizations.length})
            </Label>
            <Select 
              value={selectedCustomization || "none"} 
              onValueChange={(value) => {
                if (!value || value === "none") {
                  // Se valor vazio ou 'none', limpar seleção
                  onCustomizationChange(null);
                  if (onCustomizationValueChange) {
                    onCustomizationValueChange(0);
                  }
                  if (onCustomizationDescriptionChange) {
                    onCustomizationDescriptionChange("");
                  }
                  // Limpar erro de validação se deselecionar
                  if (onValidationError) {
                    onValidationError("");
                  }
                  return;
                }

                const customization = filteredCustomizations.find((c: any) => c.id === value);
                if (customization) {
                  // Validar quantidade mínima
                  if (quantity < customization.minQuantity) {
                    const errorMessage = `Esta personalização requer no mínimo ${customization.minQuantity} unidades. Quantidade atual: ${quantity}`;
                    if (onValidationError) {
                      onValidationError(errorMessage);
                    }
                    // Não permite selecionar se não atender à quantidade mínima, mas mantém a seleção visualmente
                    // A lógica de "não permitir" fica com o disabled no SelectItem
                  } else {
                    // Limpar erro de validação se a nova seleção for válida
                    if (onValidationError) {
                      onValidationError("");
                    }
                  }

                  onCustomizationChange(customization);
                  // Auto-preenche os valores
                  if (onCustomizationValueChange) {
                    onCustomizationValueChange(parseFloat(customization.price) || 0);
                  }
                  if (onCustomizationDescriptionChange) {
                    onCustomizationDescriptionChange(customization.name);
                  }
                }
              }}
            >
              <SelectTrigger id="customization-select" className="w-full h-10">
                <SelectValue placeholder="Selecione uma personalização (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500 italic">Nenhuma personalização</span>
                </SelectItem>
                {filteredCustomizations.map((customization: any) => (
                  <SelectItem 
                    key={customization.id} 
                    value={customization.id}
                    disabled={quantity < customization.minQuantity}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <span className={quantity < customization.minQuantity ? "text-gray-400" : ""}>
                          {customization.name}
                        </span>
                        {quantity < customization.minQuantity && (
                          <span className="text-xs text-red-500">
                            Requer mín. {customization.minQuantity} unidades
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${quantity < customization.minQuantity ? "text-gray-400" : "text-gray-500"}`}>
                        R$ {parseFloat(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {customization.minQuantity > 1 && ` (mín. ${customization.minQuantity})`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {categoryFilter.trim() && filteredCustomizations.length === 0 && (
          <div className="w-full text-sm text-orange-700 bg-orange-100 p-3 rounded border border-orange-300">
            <strong>Nenhuma personalização encontrada</strong> para a categoria "{categoryFilter}".
            <br />
            Tente outras palavras como: copo, mochila, mesa, camiseta, etc.
          </div>
        )}

        {!categoryFilter.trim() && (
          <div className="w-full text-sm text-blue-700 bg-blue-100 p-3 rounded border border-blue-300">
            <strong>Como funciona:</strong>
            <br />
            1. Digite uma categoria no campo acima
            <br />
            2. Escolha a personalização disponível
          </div>
        )}
      </div>

      {/* Resumo da personalização selecionada */}
      {selectedCustomizationData && (
        <div className="w-full p-4 bg-white rounded-lg border border-blue-300 shadow-sm">
          <h4 className="text-base font-semibold text-blue-900 mb-3">
            ✅ {selectedCustomizationData.name}
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Categoria:</span>
              <p className="font-medium">{selectedCustomizationData.category}</p>
            </div>
            <div>
              <span className="text-gray-600">Quantidade Mínima:</span>
              <p className="font-medium">{selectedCustomizationData.minQuantity} unidades</p>
            </div>
            <div>
              <span className="text-gray-600">Valor Unitário:</span>
              <p className="font-medium text-green-700">
                R$ {parseFloat(selectedCustomizationData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Descrição:</span>
              <p className="font-medium">{selectedCustomizationData.description || 'N/A'}</p>
            </div>
          </div>

          {/* Campo para observações */}
          <div className="mt-4">
            <Label htmlFor="customization-notes" className="text-sm font-medium text-gray-700">
              Observações Adicionais (Opcional)
            </Label>
            <Input
              id="customization-notes"
              value={customizationDescription}
              onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
              placeholder="Observações sobre a personalização..."
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}