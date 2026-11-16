import { useMabar } from "../../context/MabarContext";
import { formatDate, formatRp } from "../../lib/format";
import { cn } from "../../lib/utils";

export const FINANCE_REPORT_ID = "struk-keuangan";

/** Also exported as JPG, so it reads as a standalone document. */
export function FinanceReport() {
  const {
    pbName,
    gorName,
    matchDate,
    totalBiayaTerkumpul,
    expKokSlopQty,
    expKokSlopPrice,
    expKokSatuanQty,
    expKokSatuanPrice,
    expLapangan,
    expLain,
    totalPengeluaranKokSlop,
    totalPengeluaranKokSatuan,
    totalPengeluaran,
    saldoAkhir,
  } = useMabar();

  const expenseRows = [
    expKokSlopQty > 0 && {
      label: `Kok ${expKokSlopQty} slop @ ${formatRp(expKokSlopPrice)}`,
      amount: totalPengeluaranKokSlop,
    },
    expKokSatuanQty > 0 && {
      label: `Kok ecer ${expKokSatuanQty} pcs @ ${formatRp(expKokSatuanPrice)}`,
      amount: totalPengeluaranKokSatuan,
    },
    expLapangan > 0 && { label: "Sewa lapangan", amount: expLapangan },
    expLain > 0 && { label: "Lain-lain", amount: expLain },
  ].filter((row): row is { label: string; amount: number } => Boolean(row));

  return (
    <div
      id={FINANCE_REPORT_ID}
      className="overflow-hidden rounded-xl border border-border bg-card tabular print:rounded-none print:border-none"
    >
      <div className="border-b-4 border-brand bg-foreground px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Laporan keuangan</p>
        <p className="mt-1 text-lg font-bold">{pbName || "PB"}</p>
        <p className="text-sm text-white/70">
          {[gorName, matchDate ? formatDate(matchDate) : null].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pemasukan
          </p>
          <div className="flex justify-between py-1">
            <span>Kas masuk dari pemain</span>
            <span className="font-semibold">{formatRp(totalBiayaTerkumpul)}</span>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pengeluaran
          </p>
          {expenseRows.length === 0 ? (
            <p className="py-1 text-muted-foreground">Belum ada pengeluaran dicatat.</p>
          ) : (
            expenseRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 py-1">
                <span className="text-muted-foreground">{row.label}</span>
                <span>{formatRp(row.amount)}</span>
              </div>
            ))
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total pengeluaran</span>
            <span>{formatRp(totalPengeluaran)}</span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between px-5 py-4",
          saldoAkhir >= 0 ? "bg-success-soft" : "bg-danger-soft"
        )}
      >
        <span className="font-semibold">Saldo akhir</span>
        <span
          className={cn(
            "text-2xl font-bold",
            saldoAkhir >= 0 ? "text-success" : "text-destructive"
          )}
        >
          {formatRp(saldoAkhir)}
        </span>
      </div>
    </div>
  );
}
