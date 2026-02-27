import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, ChevronDown } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: customizations = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/settings/customization-options"],
    queryFn: async () => {
      const response = await fetch('/api/settings/customization-options');
      if (!response.ok) return [];
      const allCustomizations = await response.json();

      return allCustomizations.filter((c: any) =>
        c.isActive
      );
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos para garantir dados atualizados
  });

  // Filtra personalizações pela categoria digitada E pela quantidade mínima
  const filteredCustomizations = customizations.filter((customization: any) => {
    if (!categoryFilter.trim()) return false;
    const matchesCategory = customization.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const meetsQuantityRequirement = customization.minQuantity <= quantity;
    return matchesCategory && meetsQuantityRequirement;
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
          <div className="w-full space-y-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                Tipo de Personalização
              </Label>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-full justify-between h-8 text-sm font-normal border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all px-2"
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      <Search className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="truncate">
                        {selectedCustomizationData
                          ? selectedCustomizationData.name
                          : "Buscar personalização..."}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="flex flex-col">
                    <div className="flex items-center border-b px-2 h-9">
                      <Search className="mr-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                      <input
                        className="flex h-full w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Filtrar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-48 overflow-y-auto">
                      <div className="p-1">
                        {isLoading ? (
                          <div className="p-2 text-center text-xs text-gray-500">
                            Carregando...
                          </div>
                        ) : filteredCustomizations?.length === 0 ? (
                          <div className="p-2 text-center text-xs text-gray-500">
                            Nenhuma personalização encontrada.
                          </div>
                        ) : (
                          filteredCustomizations?.map((customization) => (
                            <div
                              key={customization.id}
                              className={`flex items-center justify-between px-2 py-1.5 text-xs rounded-sm cursor-pointer transition-colors ${selectedCustomization === customization.id
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "hover:bg-gray-50 text-gray-700"
                                }`}
                              onClick={() => {
                                if (quantity < customization.minQuantity) {
                                  const errorMessage = `Esta personalização requer no mínimo ${customization.minQuantity} unidades. Quantidade atual: ${quantity}`;
                                  if (onValidationError) {
                                    onValidationError(errorMessage);
                                  }
                                  return;
                                }

                                if (onValidationError) {
                                  onValidationError("");
                                }

                                onCustomizationChange(customization);
                                if (onCustomizationValueChange) {
                                  onCustomizationValueChange(parseFloat(customization.price.toString()) || 0);
                                }
                                if (onCustomizationDescriptionChange) {
                                  onCustomizationDescriptionChange(customization.name);
                                }
                                setIsOpen(false);
                                setSearchTerm("");
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{customization.name}</span>
                                <span className="text-[9px] text-gray-500">
                                  Preço base: R$ {Number(customization.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  {customization.minQuantity > 1 && ` (mín. ${customization.minQuantity})`}
                                </span>
                              </div>
                              {selectedCustomization === customization.id && (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                Descrição da Personalização (Saída PDF)
              </Label>
              <Input
                placeholder="Ex: 1 Logo Silk 1 cor"
                value={customizationDescription}
                onChange={(e) => onCustomizationDescriptionChange && onCustomizationDescriptionChange(e.target.value)}
                className="h-8 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {categoryFilter.trim() && filteredCustomizations.length === 0 && (
          <div className="w-full text-xs text-orange-700 bg-orange-100 p-2 rounded border border-orange-300">
            <strong>Nenhuma personalização disponível</strong> para a categoria "{categoryFilter}" com {quantity} unidades.
            <br />
            As personalizações disponíveis podem exigir quantidade mínima maior que {quantity} unidades.
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

    </div>
  );
}