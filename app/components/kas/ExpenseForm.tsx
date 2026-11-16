import type { ReactNode } from "react";
import { useMabar } from "../../context/MabarContext";
import { formatNumberInput, formatRp, parseNumberInput } from "../../lib/format";
import { cn } from "../../lib/utils";
import { inputClass } from "../ui/button";
import { cardClass } from "../ui/Section";

interface MoneyInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
}

function NumberInput({ id, label, value, onChange, prefix }: MoneyInputProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : formatNumberInput(value)}
          onChange={(e) => onChange(parseNumberInput(e.target.value))}
          placeholder="0"
          className={cn(inputClass, "tabular", prefix && "pl-9")}
        />
      </div>
    </div>
  );
}

export function ExpenseForm() {
  const {
    isSessionLocked,
    expKokSlopQty,
    setExpKokSlopQty,
    expKokSlopPrice,
    setExpKokSlopPrice,
    expKokSatuanQty,
    setExpKokSatuanQty,
    expKokSatuanPrice,
    setExpKokSatuanPrice,
    expLapangan,
    setExpLapangan,
    expLain,
    setExpLain,
    totalPengeluaranKokSlop,
    totalPengeluaranKokSatuan,
  } = useMabar();

  const group = (title: string, subtotal: number | null, children: ReactNode) => (
    <div className="space-y-2 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {subtotal !== null && subtotal > 0 && (
          <p className="text-sm text-muted-foreground tabular">{formatRp(subtotal)}</p>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <fieldset
      disabled={isSessionLocked}
      className={cn(cardClass, "min-w-0 divide-y divide-border print:hidden")}
    >
      <legend className="sr-only">Catat pengeluaran</legend>
      {group(
        "Kok per slop",
        totalPengeluaranKokSlop,
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <NumberInput id="exp-slop-qty" label="Jumlah slop" value={expKokSlopQty} onChange={setExpKokSlopQty} />
          <NumberInput id="exp-slop-price" label="Harga per slop" prefix="Rp" value={expKokSlopPrice} onChange={setExpKokSlopPrice} />
        </div>
      )}
      {group(
        "Kok satuan (ecer)",
        totalPengeluaranKokSatuan,
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <NumberInput id="exp-pcs-qty" label="Jumlah pcs" value={expKokSatuanQty} onChange={setExpKokSatuanQty} />
          <NumberInput id="exp-pcs-price" label="Harga per pcs" prefix="Rp" value={expKokSatuanPrice} onChange={setExpKokSatuanPrice} />
        </div>
      )}
      {group(
        "Lainnya",
        null,
        <div className="grid grid-cols-2 gap-2">
          <NumberInput id="exp-court" label="Sewa lapangan total" prefix="Rp" value={expLapangan} onChange={setExpLapangan} />
          <NumberInput id="exp-other" label="Minum, parkir, dll." prefix="Rp" value={expLain} onChange={setExpLain} />
        </div>
      )}
    </fieldset>
  );
}
