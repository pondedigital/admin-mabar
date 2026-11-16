import { SlidersHorizontal } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { formatDate, formatRp } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { PaymentMethod, PlayerStat } from "../../types/mabar";
import { buttonVariants } from "../ui/button";
import { Segmented } from "../ui/Segmented";

export const RESUME_RECEIPT_ID = "struk-resume";

interface ResumeReceiptProps {
  onAdjustPlayer: (player: PlayerStat) => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
};

type PaymentChoice = "belum" | PaymentMethod;

const PAYMENT_OPTIONS: { value: PaymentChoice; label: string }[] = [
  { value: "belum", label: "Belum" },
  ...(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => ({
    value: method,
    label: PAYMENT_METHOD_LABELS[method],
  })),
];

export function getBilledPlayers(playerStats: Record<number, PlayerStat>) {
  return Object.values(playerStats)
    .filter((p) => p.present || p.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * The receipt doubles as the exported JPG / printed PDF. Controls carry
 * data-html2canvas-ignore so the shared image shows only the bill.
 */
export function ResumeReceipt({ onAdjustPlayer }: ResumeReceiptProps) {
  const {
    pbName,
    gorName,
    matchDate,
    paymentMode,
    playerStats,
    totalKokUsed,
    totalBiayaTerkumpul,
    setPlayerPaid,
    setPlayerPaymentMethod,
  } = useMabar();

  const billedPlayers = getBilledPlayers(playerStats);

  return (
    <div
      id={RESUME_RECEIPT_ID}
      className="overflow-hidden rounded-xl border border-border bg-card print:rounded-none print:border-none"
    >
      <div className="border-b-4 border-brand bg-foreground px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Resume mabar</p>
        <p className="mt-1 text-lg font-bold">{pbName || "PB"}</p>
        <p className="text-sm text-white/70">
          {[gorName, matchDate ? formatDate(matchDate) : null].filter(Boolean).join(" · ")}
        </p>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-border border-b border-border tabular">
        <div className="px-3 py-3">
          <dt className="text-xs text-muted-foreground">Sistem</dt>
          <dd className="text-sm font-semibold">
            {paymentMode === "all_in" ? "All in" : "Lap + kok"}
          </dd>
        </div>
        <div className="px-3 py-3">
          <dt className="text-xs text-muted-foreground">Total kok</dt>
          <dd className="text-sm font-semibold">{totalKokUsed} pcs</dd>
        </div>
        <div className="px-3 py-3">
          <dt className="text-xs text-muted-foreground">Total kas</dt>
          <dd className="text-sm font-bold">{formatRp(totalBiayaTerkumpul)}</dd>
        </div>
      </dl>

      {billedPlayers.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Belum ada pemain hadir untuk ditagih.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {billedPlayers.map((player) => (
            <li key={player.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{player.name}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    Main {player.matchesPlayed}x
                    {player.adjustment !== 0 && (
                      <>
                        {" · "}
                        {player.adjustment < 0 ? "diskon " : "tambahan "}
                        {formatRp(Math.abs(player.adjustment))}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular">{formatRp(player.totalCost)}</p>
                  {player.paid && (
                    <p className="text-xs font-semibold text-success">
                      Lunas · {PAYMENT_METHOD_LABELS[player.paymentMethod]}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-html2canvas-ignore
                  onClick={() => onAdjustPlayer(player)}
                  aria-label={`Sesuaikan harga ${player.name}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon", className: "size-9" }),
                    "-mr-2 print:hidden"
                  )}
                >
                  <SlidersHorizontal size={16} aria-hidden />
                </button>
              </div>
              <div data-html2canvas-ignore className="mt-2 print:hidden">
                <Segmented
                  label={`Status bayar ${player.name}`}
                  size="sm"
                  value={player.paid ? player.paymentMethod : "belum"}
                  onChange={(choice) =>
                    choice === "belum"
                      ? setPlayerPaid(player.id, false)
                      : setPlayerPaymentMethod(player.id, choice)
                  }
                  options={PAYMENT_OPTIONS}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-dashed border-input py-3 text-center text-xs uppercase tracking-widest text-muted-foreground">
        Terima kasih · Salam olahraga
      </p>
    </div>
  );
}
