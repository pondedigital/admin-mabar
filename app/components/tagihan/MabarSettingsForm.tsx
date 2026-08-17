import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useMabar } from "../../context/MabarContext";

export function MabarSettingsForm() {
  const [isOpen, setIsOpen] = useState(true);
  const {
    pbOptions,
    activePbId,
    setActivePbId,
    pbName,
    gorName,
    setGorName,
    matchDate,
    setMatchDate,
    numCourts,
    setNumCourts,
    paymentMode,
    setPaymentMode,
    shuttlecockPrice,
    setShuttlecockPrice,
    baseFee,
    setBaseFee,
    allInFee,
    setAllInFee,
  } = useMabar();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Settings2 size={20} className="text-blue-600" /> Pengaturan Mabar
        </h2>
        <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
          {isOpen ? "Sembunyikan" : "Tampilkan"}
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {!isOpen && gorName && (
        <p className="text-xs text-gray-400 mt-1">
          {pbName} • {gorName}
        </p>
      )}
      {isOpen && (
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">PB yang Ditangani</label>
          {pbOptions.length <= 1 ? (
            <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
              {pbName || "-"}
            </p>
          ) : (
            <select
              value={activePbId ?? ""}
              onChange={(e) => setActivePbId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {pbOptions.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-gray-400 mt-1">
            Beralih PB akan memuat mabar aktif milik PB tersebut (pemain, pertandingan, keuangan
            terpisah per PB).
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nama GOR</label>
          <input
            type="text"
            value={gorName}
            onChange={(e) => setGorName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Jumlah Lapangan Dipakai
          </label>
          <select
            value={numCourts}
            onChange={(e) => setNumCourts(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} Lapangan
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            Membatasi jumlah pertandingan yang bisa berjalan bersamaan.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-3 mt-1">
          <label className="block text-xs font-bold text-gray-800 mb-2">Sistem Pembayaran</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPaymentMode("lapangan_kok")}
              className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-colors ${
                paymentMode === "lapangan_kok"
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              Lapangan + Kok
            </button>
            <button
              onClick={() => setPaymentMode("all_in")}
              className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-colors ${
                paymentMode === "all_in"
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              All In (Flat)
            </button>
          </div>

          {paymentMode === "lapangan_kok" ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Harga per Kok (Rp)
                </label>
                <input
                  type="number"
                  value={shuttlecockPrice}
                  onChange={(e) => setShuttlecockPrice(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Uang Lapangan per Orang (Rp) - Opsional
                </label>
                <input
                  type="number"
                  value={baseFee}
                  onChange={(e) => setBaseFee(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Biaya All In per Orang (Rp)
                </label>
                <input
                  type="number"
                  value={allInFee}
                  onChange={(e) => setAllInFee(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
