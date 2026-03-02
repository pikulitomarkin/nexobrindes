import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { currencyMask, parseCurrencyValue, formatCurrencyForInput } from "@/utils/masks";

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input monetário que aceita centavos no formato brasileiro (vírgula).
 * Preserva "5," durante a digitação para permitir "5,50".
 */
export function CurrencyInput({ value, onChange, placeholder = "0,00", maxLength, ...props }: CurrencyInputProps) {
  const [localDisplay, setLocalDisplay] = useState<string | null>(null);
  const isFocusedRef = useRef(false);

  // Nunca limitar caracteres - valores monetários podem ser longos (ex: R$ 1.234,56)
  const displayValue = localDisplay ?? (value > 0 ? formatCurrencyForInput(value) : "");

  useEffect(() => {
    if (!isFocusedRef.current && localDisplay !== null) {
      setLocalDisplay(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = currencyMask(raw);

    const clean = raw.replace(/[R$\s.]/g, "");
    const parts = clean.split(",");

    // Preserva estado intermediário para permitir digitar centavos:
    // - "5" (sem vírgula ainda, usuário pode digitar ",50")
    // - "5," ou "5,0" ou "5,5" (digitando centavos)
    const hasIncompleteDecimals = parts.length === 2 && parts[1].length < 2;
    const hasOnlyInteger = parts.length === 1 && clean.length > 0;
    if (hasIncompleteDecimals || hasOnlyInteger) {
      setLocalDisplay(masked);
      return;
    }

    const num = parseCurrencyValue(masked);
    setLocalDisplay(null);
    onChange(num);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const num = localDisplay !== null ? parseCurrencyValue(localDisplay) : value;
    setLocalDisplay(null);
    onChange(num);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
    />
  );
}
