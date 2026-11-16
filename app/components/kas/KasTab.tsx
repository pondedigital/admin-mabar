import { useState } from "react";
import { Image as ImageIcon, Printer } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { useDownloadJpg } from "../../hooks/useDownloadJpg";
import { usePersistentState } from "../../hooks/usePersistentState";
import { formatRp } from "../../lib/format";
import type { KasView, PlayerStat } from "../../types/mabar";
import { AdjustPriceModal } from "../modals/AdjustPriceModal";
import { ImagePreviewModal } from "../modals/ImagePreviewModal";
import { buttonVariants } from "../ui/button";
import { SectionHeader } from "../ui/Section";
import { Segmented } from "../ui/Segmented";
import { ExpenseForm } from "./ExpenseForm";
import { FinanceReport, FINANCE_REPORT_ID } from "./FinanceReport";
import { getBilledPlayers, ResumeReceipt, RESUME_RECEIPT_ID } from "./ResumeReceipt";

interface KasTabProps {
  onOpenSettings: () => void;
}

export function KasTab({ onOpenSettings }: KasTabProps) {
  const [view, setView] = usePersistentState<KasView>("kasView", "tagihan");
  const { showAlert } = useMabar();
  const { isDownloading, generatedImage, downloadJpg, clearImage } = useDownloadJpg(() =>
    showAlert("Gagal membuat gambar JPG. Coba pakai Cetak PDF sebagai gantinya.")
  );

  return (
    <div className="space-y-4 p-4 print:space-y-0 print:p-0">
      <Segmented
        label="Tampilan kas"
        value={view}
        onChange={setView}
        options={[
          { value: "tagihan", label: "Tagihan" },
          { value: "keuangan", label: "Keuangan" },
        ]}
        className="print:hidden"
      />

      {view === "tagihan" ? (
        <TagihanView
          onOpenSettings={onOpenSettings}
          isDownloading={isDownloading}
          onDownload={() => downloadJpg(RESUME_RECEIPT_ID)}
        />
      ) : (
        <KeuanganView
          isDownloading={isDownloading}
          onDownload={() => downloadJpg(FINANCE_REPORT_ID)}
        />
      )}

      {generatedImage && (
        <ImagePreviewModal
          image={generatedImage}
          fileName={view === "tagihan" ? "resume-mabar" : "laporan-keuangan"}
          onClose={clearImage}
        />
      )}
    </div>
  );
}

interface ExportProps {
  isDownloading: boolean;
  onDownload: () => void;
}

function TagihanView({
  onOpenSettings,
  isDownloading,
  onDownload,
}: ExportProps & { onOpenSettings: () => void }) {
  const { playerStats, setPlayerAdjustment, isSessionLocked } = useMabar();
  const [adjustTarget, setAdjustTarget] = useState<PlayerStat | null>(null);

  const billed = getBilledPlayers(playerStats);
  const paid = billed.filter((p) => p.paid);
  const outstanding = billed
    .filter((p) => !p.paid)
    .reduce((sum, p) => sum + p.totalCost, 0);

  return (
    <>
      <div className="print:hidden">
        <SectionHeader
          title="Pembayaran"
          meta={billed.length > 0 ? `${paid.length}/${billed.length} lunas` : undefined}
          action={
            <button
              type="button"
              onClick={onOpenSettings}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ubah harga
            </button>
          }
        />
        {outstanding > 0 && (
          <p className="-mt-1 mb-1 px-1 text-sm text-muted-foreground tabular">
            Belum masuk: <span className="font-semibold text-foreground">{formatRp(outstanding)}</span>
          </p>
        )}
      </div>

      <fieldset disabled={isSessionLocked} className="min-w-0">
        <legend className="sr-only">Tagihan pemain</legend>
        <ResumeReceipt onAdjustPlayer={setAdjustTarget} />
      </fieldset>

      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className={buttonVariants({ variant: "primary", className: "flex-1" })}
        >
          <ImageIcon size={18} aria-hidden /> {isDownloading ? "Membuat gambar…" : "Simpan JPG"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonVariants({ variant: "outline", className: "flex-1" })}
        >
          <Printer size={18} aria-hidden /> Cetak PDF
        </button>
      </div>

      {adjustTarget && (
        <AdjustPriceModal
          player={adjustTarget}
          onSave={(amount) => {
            setPlayerAdjustment(adjustTarget.id, amount);
            setAdjustTarget(null);
          }}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </>
  );
}

function KeuanganView({ isDownloading, onDownload }: ExportProps) {
  return (
    <>
      <section aria-labelledby="expense-title" className="print:hidden">
        <SectionHeader id="expense-title" title="Catat pengeluaran" />
        <ExpenseForm />
      </section>
      <section aria-labelledby="report-title">
        <div className="print:hidden">
          <SectionHeader id="report-title" title="Laporan" />
        </div>
        <FinanceReport />
      </section>
      <button
        type="button"
        onClick={onDownload}
        disabled={isDownloading}
        className={buttonVariants({ variant: "primary", className: "w-full print:hidden" })}
      >
        <ImageIcon size={18} aria-hidden /> {isDownloading ? "Membuat gambar…" : "Simpan laporan JPG"}
      </button>
    </>
  );
}
