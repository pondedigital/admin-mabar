import { useState } from "react";
import { Lock, LogOut, MoreVertical, SlidersHorizontal } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { formatDate } from "../../lib/format";
import { buttonVariants } from "../ui/button";
import { Overlay } from "../ui/Overlay";

interface AppHeaderProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

const iconButton =
  "flex size-10 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white";

export function AppHeader({ onLogout, onOpenSettings }: AppHeaderProps) {
  const { pbName, gorName, matchDate, isSessionLocked, endSession, startNewSession } = useMabar();
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = [matchDate ? formatDate(matchDate) : null, gorName || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="surface-ink sticky top-0 z-20 text-white shadow-pop print:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden
          className="surface-brand flex size-9 shrink-0 items-center justify-center rounded-full text-base font-black text-foreground shadow-brand"
        >
          {(pbName || "P").replace(/^PB\s+/i, "").charAt(0).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={onOpenSettings}
          className="min-w-0 flex-1 text-left"
          aria-label={`Pengaturan sesi ${pbName}`}
        >
          <h1 className="truncate text-base font-bold leading-tight">{pbName || "PB"}</h1>
          <p className="truncate text-xs text-white/65">
            {meta || "Atur tanggal & GOR"}
          </p>
        </button>
        <button type="button" onClick={onOpenSettings} className={iconButton} aria-label="Pengaturan sesi">
          <SlidersHorizontal size={20} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`${iconButton} -mr-2`}
          aria-label="Menu lainnya"
        >
          <MoreVertical size={20} aria-hidden />
        </button>
      </div>

      {isSessionLocked && (
        <div className="flex items-center gap-3 border-t border-white/10 bg-white/5 px-4 py-2.5">
          <Lock size={16} className="shrink-0 text-brand" aria-hidden />
          <p className="flex-1 text-xs text-white/80">
            Sesi ditutup. Data hanya bisa dilihat.
          </p>
          <button
            type="button"
            onClick={startNewSession}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Mulai mabar baru
          </button>
        </div>
      )}

      <Overlay open={menuOpen} onClose={() => setMenuOpen(false)} variant="sheet" title="Menu">
        <div className="space-y-2">
          {!isSessionLocked && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                endSession();
              }}
              className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-muted"
            >
              <Lock size={20} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
              <span>
                <span className="block font-semibold text-destructive">Akhiri mabar</span>
                <span className="block text-sm text-muted-foreground">
                  Kunci rekap, tagihan, dan keuangan sesi ini.
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
          >
            <LogOut size={20} className="shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>
      </Overlay>
    </header>
  );
}
