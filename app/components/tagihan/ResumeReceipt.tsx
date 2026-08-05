import { CheckCircle2, Circle, Settings2 } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { formatDate, formatRp } from "../../lib/format";
import type { PaymentMethod, PlayerStat } from "../../types/mabar";

export const RESUME_RECEIPT_ID = "struk-resume";

interface ResumeReceiptProps {
  onAdjustPlayer: (player: PlayerStat) => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
};

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

  const billedPlayers = Object.values(playerStats)
    .filter((p) => p.present || p.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div
      id={RESUME_RECEIPT_ID}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400 print:hidden"></div>

      <div className="text-center mb-6 mt-2">
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wide">Resume</h2>
        {pbName && <p className="text-base font-bold text-gray-900 mt-2">{pbName}</p>}
        {gorName && <p className="text-sm font-semibold text-gray-600">{gorName}</p>}
        {matchDate && <p className="text-xs text-gray-500 mt-1">{formatDate(matchDate)}</p>}
        <span className="inline-block mt-3 text-[10px] bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200 uppercase font-bold tracking-wider">
          Sistem: {paymentMode === "all_in" ? "All In (Flat)" : "Lapangan + Kok"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
          <div className="text-gray-600 font-medium text-xs mb-1">Total Kok</div>
          <div className="text-xl font-black text-gray-800">
            {totalKokUsed} <span className="text-xs font-normal">pcs</span>
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-center">
          <div className="text-yellow-700 font-medium text-xs mb-1">Total Kas</div>
          <div className="text-xl font-black text-yellow-900">{formatRp(totalBiayaTerkumpul)}</div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 pt-4 mb-2">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 text-center">
          Rincian Pembayaran
        </h2>
        <div className="space-y-0">
          {billedPlayers.map((player, index, arr) => (
            <div
              key={player.id}
              className={`py-3 ${index !== arr.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlayerPaid(player.id, !player.paid)}
                    className="text-gray-300 hover:text-emerald-500 print:hidden transition-colors shrink-0"
                    title={player.paid ? "Tandai belum bayar" : "Tandai sudah bayar"}
                  >
                    {player.paid ? (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <div>
                    <div className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                      {player.name}
                      {player.paid && (
                        <span className="hidden print:inline text-emerald-600">✓</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                      Main: {player.matchesPlayed} kali
                      {player.adjustment !== 0 && (
                        <span className="ml-1 text-blue-600 font-bold">
                          (Adj: {formatRp(player.adjustment)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <button
                    onClick={() => onAdjustPlayer(player)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-md border border-gray-200 print:hidden transition-colors"
                    title="Penyesuaian Harga"
                  >
                    <Settings2 size={14} />
                  </button>
                  <div className="font-black text-gray-800 text-lg w-24 text-right">
                    {formatRp(player.totalCost)}
                  </div>
                </div>
              </div>

              {player.paid && (
                <div className="flex items-center gap-1.5 mt-2 ml-7">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mr-1">
                    Bayar:
                  </span>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPlayerPaymentMethod(player.id, method)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors print:border-none ${
                        player.paymentMethod === method
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:border-emerald-300 print:hidden"
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-dashed border-gray-300 text-center">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
          Terima Kasih - Salam Olahraga
        </p>
      </div>
    </div>
  );
}
