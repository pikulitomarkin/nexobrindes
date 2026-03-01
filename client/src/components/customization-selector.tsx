import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  customizationDescription = '',
  onCustomizationDescriptionChange,
  onValidationError
}: CustomizationSelectorProps) {
  // Inicialização VAZIA ao invés de productCategory para evitar auto-preenchimento
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: customizations = [], isLoading } = useQuery({
    queryKey: ["/api/settings/customization-options"],
    queryFn: async () => {
      const response = await fetch('/api/settings/customization-options');
      if (!response.ok) return [];
      const allCustomizations = await response.json();
      return allCustomizations.filter((c: any) => c.isActive);
    },
    refetchInterval: 30000,
  });

  // Filtra as personalizações por categoria digitada e quantidade mínima
  const filteredCustomizations = (customizations as any[]).filter((c: any) => {
    if (c.id == null) return false;

    // Filtro por categoria (só se algo for digitado)
    const matchesCategory = categoryFilter.trim()
      ? (c.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
      : true;

    return matchesCategory;
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500 p-4 animate-pulse">Carregando opções de personalização...</div>;
  }

  // Garante que o valor selecionado seja sempre string
  const selectValue = selectedCustomization ? String(selectedCustomization) : "none";

  return (
    <div className="w-full space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="space-y-4">
        {/* Busca por Categoria */}
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

        {/* Lista de Personalizações (Select estável) */}
        {categoryFilter.trim() && filteredCustomizations.length > 0 && (
          <div className="w-full space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-gray-500">
                Personalizações Disponíveis ({filteredCustomizations.length})
              </Label>
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  if (value === "none") {
                    onCustomizationChange(null);
                    if (onValidationError) onValidationError("");
                    return;
                  }

                  const selected = (customizations as any[]).find((c: any) => String(c.id) === String(value));
                  if (!selected) return;

                  if (quantity < selected.minQuantity) {
                    const msg = `Esta personalização requer no mínimo ${selected.minQuantity} unidades. Quantidade atual: ${quantity}`;
                    if (onValidationError) onValidationError(msg);
                    return;
                  }

                  if (onValidationError) onValidationError("");
                  onCustomizationChange(selected);
                }}
              >
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="Nenhuma personalização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma personalização</SelectItem>
                  {filteredCustomizations.map((c: any) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.name} - R$ {Number(c.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {c.minQuantity > 1 && ` (mín. ${c.minQuantity})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição da Personalização */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-gray-500">
                Descrição da Personalização (Saída PDF)
              </Label>
              <Input
                placeholder="Ex: 1 Logo Silk 1 cor"
                value={customizationDescription}
                onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
          </div>
        )}

        {/* Mensagem quando não há personalizações para a categoria */}
        {categoryFilter.trim() && filteredCustomizations.length === 0 && (
          <div className="w-full text-xs text-orange-700 bg-orange-100 p-2 rounded border border-orange-300">
            <strong>Nenhuma personalização disponível</strong> para a categoria "{categoryFilter}" com {quantity} unidades.
            <br />
            As personalizações disponíveis podem exigir quantidade mínima maior que {quantity} unidades.
            <br />
            Tente outras palavras como: copo, mochila, mesa, camiseta, etc.
          </div>
        )}

        {/* Instrução quando nenhuma categoria foi digitada */}
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
    </div>
  );
}