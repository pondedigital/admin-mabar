import { useEffect, useState } from "react";
import { MabarProvider } from "../context/MabarContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { onAuthStateChange, signOut } from "../lib/auth";
import { supabase } from "../lib/supabase/client";
import type { TabId } from "../types/mabar";
import { LoginPage } from "./LoginPage";
import { AppHeader } from "./layout/AppHeader";
import { BottomNav } from "./layout/BottomNav";
import { AppModal } from "./modals/AppModal";
import { PemainTab } from "./pemain/PemainTab";
import { PertandinganTab } from "./pertandingan/PertandinganTab";
import { RekapTab } from "./rekap/RekapTab";
import { KlasemenTab } from "./klasemen/KlasemenTab";
import { TagihanTab } from "./tagihan/TagihanTab";
import { KeuanganTab } from "./keuangan/KeuanganTab";

export function MabarApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = usePersistentState<TabId>("activeTab", "pemain");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(data.session !== null);
    });
    return onAuthStateChange((session) => setIsAuthenticated(session !== null));
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    signOut();
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <MabarProvider>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24 shadow-xl border-x border-gray-100 font-sans relative print:max-w-none print:bg-white print:shadow-none print:border-none print:pb-0">
        <AppHeader onLogout={handleLogout} />

        <main className="print:p-0">
          {activeTab === "pemain" && <PemainTab />}
          {activeTab === "pertandingan" && <PertandinganTab />}
          {activeTab === "rekap" && <RekapTab />}
          {activeTab === "klasemen" && <KlasemenTab />}
          {activeTab === "tagihan" && <TagihanTab />}
          {activeTab === "keuangan" && <KeuanganTab />}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        <AppModal />
      </div>
    </MabarProvider>
  );
}
