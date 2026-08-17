import { Calendar, Lock, LogIn } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { formatDate } from "../../lib/format";

interface AppHeaderProps {
  onLogout: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const { pbName, matchDate, isSessionLocked, endSession, startNewSession } = useMabar();

  return (
    <div className="bg-black text-yellow-400 p-3 sticky top-0 z-10 shadow-md flex flex-col items-center justify-center border-b-2 border-yellow-400 print:hidden relative">
      <button
        onClick={onLogout}
        className="absolute right-3 top-3 bg-zinc-800 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
        title="Logout"
      >
        <LogIn size={18} className="rotate-180" />
      </button>
      <div className="flex items-center gap-3">
        <img
          src="https://ui-avatars.com/api/?name=Ponde&background=000000&color=facc15&rounded=true&bold=true&size=128"
          alt="Logo Ponde"
          className="w-10 h-10 rounded-full border-2 border-yellow-400 shadow-sm object-cover bg-black"
        />
        <h1 className="text-xl font-black tracking-wide uppercase">{pbName || "NAMA PB"}</h1>
      </div>

      <div className="mt-3 w-full flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-yellow-200/80 flex items-center gap-1.5">
          <Calendar size={12} />
          {matchDate ? formatDate(matchDate) : "Tanggal Belum Diatur"}
        </span>

        {!isSessionLocked && (
          <button
            onClick={endSession}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-b from-red-500 to-red-700 px-3.5 py-1.5 rounded-full shadow-md shadow-red-950/40 ring-1 ring-red-400/30 hover:from-red-400 hover:to-red-600 active:scale-95 transition-all"
          >
            <Lock size={12} /> Akhiri Mabar
          </button>
        )}
      </div>

      {isSessionLocked && (
        <div className="mt-3 w-full flex flex-col items-center gap-2 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2">
          <p className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
            <Lock size={12} /> SESI DITUTUP — DATA TERKUNCI
          </p>
          <button
            onClick={startNewSession}
            className="w-full bg-yellow-400 text-black font-black text-xs py-2 rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Mulai Mabar Baru
          </button>
        </div>
      )}
    </div>
  );
}
