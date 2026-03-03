import { useState, useRef } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateMask, parseDateBR, formatDateToBR } from "@/utils/masks";

interface DateInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  /** Valor em YYYY-MM-DD (formato ISO para API) */
  value: string;
  /** Retorna YYYY-MM-DD */
  onChange: (value: string) => void;
  /** Data mínima em YYYY-MM-DD */
  min?: string;
  /** Data máxima em YYYY-MM-DD */
  max?: string;
  /** Usar calendário popover (true) ou apenas input com máscara (false) */
  showCalendar?: boolean;
}

/**
 * Input de data no formato brasileiro DD/MM/AAAA.
 * Usa abordagem focus/blur desacoplada (igual ao CurrencyInput) para
 * evitar que re-renders externos interfiram na digitação.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  showCalendar = true,
  placeholder = "DD/MM/AAAA",
  className,
  ...props
}: DateInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const [open, setOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const localValueRef = useRef(localValue);
  localValueRef.current = localValue;

  const formattedExternal = value ? formatDateToBR(value) : "";

  const handleFocus = () => {
    setLocalValue(formattedExternal);
    localValueRef.current = formattedExternal;
    setFocused(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = dateMask(e.target.value);
    setLocalValue(masked);
    localValueRef.current = masked;

    if (masked.length === 10) {
      const iso = parseDateBR(masked);
      if (iso) {
        onChangeRef.current(iso);
      }
    }
  };

  const handleBlur = () => {
    const current = localValueRef.current;
    setFocused(false);
    if (current && current.length === 10) {
      const iso = parseDateBR(current);
      if (iso) onChangeRef.current(iso);
    }
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    setLocalValue("");
    localValueRef.current = "";
    setFocused(false);
    onChangeRef.current(iso);
    setOpen(false);
  };

  const displayValue = focused ? localValue : formattedExternal;

  const selectedDate = value ? new Date(value + "T12:00:00") : undefined;
  const minDate = min ? new Date(min + "T00:00:00") : undefined;
  const maxDate = max ? new Date(max + "T23:59:59") : undefined;

  const inputElement = (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(showCalendar && "pr-9", className)}
      maxLength={10}
    />
  );

  if (!showCalendar) {
    return inputElement;
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            {inputElement}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setOpen(!open)}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
