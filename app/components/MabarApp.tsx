import { useEffect, useState } from "react";
import { MabarProvider } from "../context/MabarContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { onAuthStateChange, signOut } from "../lib/auth";
import { supabase } from "../lib/supabase/client";
import type { TabId } from "../types/mabar";
import { LoginPage } from "./auth/LoginPage";
import { FullScreenMessage } from "./layout/FullScreenMessage";
import { AppHeader } from "./layout/AppHeader";
import { BottomNav } from "./layout/BottomNav";
import { AppModal } from "./modals/AppModal";
import { SessionSettingsSheet } from "./settings/SessionSettingsSheet";
import { PemainTab } from "./pemain/PemainTab";
import { MainTab } from "./pertandingan/MainTab";
import { HasilTab } from "./hasil/HasilTab";
import { KasTab } from "./kas/KasTab";

const TAB_IDS: TabId[] = ["pemain", "main", "hasil", "kas"];

/** Tabs saved by the old 6-tab layout map onto the tab that now holds that screen. */
const LEGACY_TAB: Record<string, TabId> = {
  pertandingan: "main",
  rekap: "hasil",
  klasemen: "hasil",
  tagihan: "kas",
  keuangan: "kas",
};

function normalizeTab(tab: string): TabId {
  if ((TAB_IDS as string[]).includes(tab)) return tab as TabId;
  return LEGACY_TAB[tab] ?? "pemain";
}

export function MabarApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [storedTab, setActiveTab] = usePersistentState<string>("activeTab", "pemain");
  const activeTab = normalizeTab(storedTab);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(data.session !== null);
    });
    return onAuthStateChange((session) => setIsAuthenticated(session !== null));
  }, []);

  if (isAuthenticated === null) {
    return <FullScreenMessage title="Memuat…" />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <MabarProvider>
      <AuthenticatedApp activeTab={activeTab} setActiveTab={setActiveTab} onLogout={signOut} />
    </MabarProvider>
  );
}

function AuthenticatedApp({
  activeTab,
  setActiveTab,
  onLogout,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onLogout: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  const changeTab = (tab: TabId) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="relative mx-auto min-h-dvh max-w-md bg-background pb-24 text-foreground print:max-w-none print:bg-white print:pb-0">
      <AppHeader onLogout={onLogout} onOpenSettings={openSettings} />

      <main key={activeTab} className="animate-rise print:animate-none print:p-0">
        {activeTab === "pemain" && <PemainTab />}
        {activeTab === "main" && <MainTab onOpenSettings={openSettings} />}
        {activeTab === "hasil" && <HasilTab />}
        {activeTab === "kas" && <KasTab onOpenSettings={openSettings} />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={changeTab} />

      <SessionSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AppModal />
    </div>
  );
}
