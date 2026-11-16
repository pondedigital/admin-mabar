import { useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { formatNumberInput, formatRp, parseNumberInput } from "../../lib/format";
import type { PlayerStat } from "../../types/mabar";
import { buttonVariants, inputClass } from "../ui/button";
import { Field } from "../ui/Field";
import { Overlay } from "../ui/Overlay";
import { Segmented } from "../ui/Segmented";

interface AdjustPriceModalProps {
  player: PlayerStat;
  onSave: (amount: number) => void;
  onClose: () => void;
}

type AdjustmentMode = "diskon" | "tambahan";

export function AdjustPriceModal({ player, onSave, onClose }: AdjustPriceModalProps) {
  const initial = player.adjustment || 0;
  const [mode, setMode] = useState<AdjustmentMode>(initial < 0 ? "diskon" : "tambahan");
  const [amount, setAmount] = useState(Math.abs(initial));

  const signedAmount = mode === "diskon" ? -Math.abs(amount) : Math.abs(amount);
  const baseCost = player.totalCost - initial;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(signedAmount);
  };

  return (
    <Overlay
      open
      onClose={onClose}
      title="Penyesuaian harga"
      description={
        <>
          Potongan atau tambahan khusus untuk{" "}
          <span className="font-semibold text-foreground">{player.name}</span>.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Segmented
          label="Jenis penyesuaian"
          value={mode}
          onChange={setMode}
          options={[
            { value: "diskon", label: "Diskon", icon: Minus },
            { value: "tambahan", label: "Tambahan", icon: Plus },
          ]}
        />
        <Field label={`Nominal ${mode === "diskon" ? "diskon" : "tambahan"} (Rp)`}>
          {({ id }) => (
            <input
              id={id}
              type="text"
              inputMode="numeric"
              data-autofocus
              value={amount === 0 ? "" : formatNumberInput(amount)}
              onChange={(e) => setAmount(parseNumberInput(e.target.value))}
              className={`${inputClass} tabular`}
              placeholder="0"
            />
          )}
        </Field>
        <dl className="space-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm tabular">
          <div className="flex justify-between text-muted-foreground">
            <dt>Tagihan normal</dt>
            <dd>{formatRp(baseCost)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Setelah penyesuaian</dt>
            <dd>{formatRp(baseCost + signedAmount)}</dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={buttonVariants({ variant: "outline", className: "flex-1" })}
          >
            Batal
          </button>
          <button type="submit" className={buttonVariants({ variant: "ink", className: "flex-1" })}>
            Simpan
          </button>
        </div>
      </form>
    </Overlay>
  );
}
