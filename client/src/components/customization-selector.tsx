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
  customizationValue = 0,
  onCustomizationValueChange,
  customizationDescription = '',
  onCustomizationDescriptionChange,
  onValidationError
}: CustomizationSelectorProps) {

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

  // Filtra as personalizações
  const filteredCustomizations = customizations.filter((c: any) => {
    // Se tiver categoria do produto, tenta filtrar. Se não, mostra todas as ativas.
    if (productCategory && c.category) {
      return c.category.toLowerCase().includes(productCategory.toLowerCase());
    }
    return true;
  });

  if (isLoading) {
    return <div className="text-xs text-blue-600 animate-pulse">Carregando opções...</div>;
  }

  return (
    <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase text-gray-500">Tipo de Personalização</Label>
        <Select
          value={selectedCustomization || "none"}
          onValueChange={(value) => {
            if (value === "none") {
              onCustomizationChange(null);
              return;
            }
            const selected = customizations.find((c: any) => c.id === value);
            if (selected) {
              if (quantity < selected.minQuantity) {
                const msg = `Mínimo de ${selected.minQuantity} unidades para esta personalização.`;
                if (onValidationError) onValidationError(msg);
                return;
              }
              if (onValidationError) onValidationError("");
              onCustomizationChange(selected);
            }
          }}
        >
          <SelectTrigger className="h-9 text-sm bg-white">
            <SelectValue placeholder="Selecione uma personalização..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem personalização</SelectItem>
            {filteredCustomizations.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} - R$ {Number(c.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase text-gray-500">Descrição na Saída (PDF)</Label>
        <Input
          placeholder="Ex: 1 Logo Silk 1 cor"
          value={customizationDescription}
          onChange={(e) => onCustomizationDescriptionChange?.(e.target.value)}
          className="h-9 text-sm bg-white"
        />
      </div>

      {productCategory && (
        <p className="text-[10px] text-blue-400 italic">
          Filtrando por: {productCategory}
        </p>
      )}
    </div>
  );
}