import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { currencyMask, parseCurrencyValue, formatCurrencyForInput } from "@/utils/masks";

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input monetário brasileiro (vírgula decimal).
 * Totalmente desacoplado do pai durante foco — usa refs para evitar
 * closures stale e re-renders que truncam a digitação.
 */
export function CurrencyInput({ value, onChange, placeholder = "0,00", maxLength, ...props }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const localValueRef = useRef(localValue);
  localValueRef.current = localValue;

  const formattedExternal = value > 0 ? formatCurrencyForInput(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = currencyMask(e.target.value);
    setLocalValue(masked);
    localValueRef.current = masked;
  };

  const handleFocus = () => {
    setLocalValue(formattedExternal);
    localValueRef.current = formattedExternal;
    setFocused(true);
  };

  const handleBlur = () => {
    const num = parseCurrencyValue(localValueRef.current);
    setFocused(false);
    onChangeRef.current(num);
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={focused ? localValue : formattedExternal}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
    />
  );
}
