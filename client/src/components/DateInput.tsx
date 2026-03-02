import { useState, useRef, useEffect } from "react";
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
 * Valor interno e onChange usam YYYY-MM-DD para compatibilidade com API.
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
  const [localDisplay, setLocalDisplay] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const displayValue = localDisplay ?? (value ? formatDateToBR(value) : "");

  useEffect(() => {
    if (!open && localDisplay !== null) {
      setLocalDisplay(null);
    }
  }, [value, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = dateMask(raw);

    if (raw.length < 10) {
      setLocalDisplay(masked);
      return;
    }

    const iso = parseDateBR(masked);
    if (iso) {
      setLocalDisplay(null);
      onChange(iso);
    } else {
      setLocalDisplay(masked);
    }
  };

  const handleBlur = () => {
    const iso = localDisplay ? parseDateBR(localDisplay) : value;
    setLocalDisplay(null);
    if (iso) onChange(iso);
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    setLocalDisplay(null);
    onChange(iso);
    setOpen(false);
  };

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
