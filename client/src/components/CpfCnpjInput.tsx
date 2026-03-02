import { Input } from "@/components/ui/input";
import { cpfCnpjMask, formatCpfCnpjForDisplay } from "@/utils/masks";

interface CpfCnpjInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Input de CPF/CNPJ com máscara automática.
 * CPF: 000.000.000-00 | CNPJ: 00.000.000/0001-00
 * Compatível com react-hook-form via {...field}.
 */
export function CpfCnpjInput({
  value,
  onChange,
  placeholder = "00.000.000/0001-00",
  maxLength = 18,
  ...props
}: CpfCnpjInputProps) {
  const displayValue = value ? formatCpfCnpjForDisplay(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = cpfCnpjMask(e.target.value);
    onChange(masked);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}
