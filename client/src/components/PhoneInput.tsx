import { Input } from "@/components/ui/input";
import { phoneMask, formatPhoneForDisplay } from "@/utils/masks";

interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Input de telefone com máscara automática (XX) XXXXX-XXXX.
 * Compatível com react-hook-form via {...field}.
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = "(11) 99999-9999",
  maxLength = 15,
  ...props
}: PhoneInputProps) {
  const displayValue = value ? formatPhoneForDisplay(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = phoneMask(e.target.value);
    onChange(masked);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="tel"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}
