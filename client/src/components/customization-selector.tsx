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
  const filteredCustomizations = (customizations as any[]).filter((c: any) => {
    // Ignora itens sem ID (evita crash no SelectItem)
    if (c.id == null) return false;
    // Se tiver categoria do produto, tenta filtrar. Se não, mostra todas as ativas.
    if (productCategory && c.category) {
      return c.category.toLowerCase().includes(productCategory.toLowerCase());
    }
    return true;
  });

  if (isLoading) {
    return <div className="text-xs text-blue-600 animate-pulse">Carregando opções...</div>;
  }

  // Garante que o valor selecionado seja sempre string
  const selectValue = selectedCustomization ? String(selectedCustomization) : "none";

  return (
    <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase text-gray-500">Tipo de Personalização</Label>
        <Select
          value={selectValue}
          onValueChange={(value) => {
            if (value === "none") {
              onCustomizationChange(null);
              return;
            }
            // Comparação por string para funcionar com IDs numéricos ou textuais da API
            const selected = (customizations as any[]).find((c: any) => String(c.id) === String(value));
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
              // Coerce ID para string — SelectItem requer value string não-vazio
              <SelectItem key={String(c.id)} value={String(c.id)}>
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