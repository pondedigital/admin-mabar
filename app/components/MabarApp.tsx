import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MabarProvider } from "../context/MabarContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { isPlatformAdmin } from "../lib/admin";
import { onAuthStateChange, signOut } from "../lib/auth";
import { supabase } from "../lib/supabase/client";
import type { TabId } from "../types/mabar";
import { AdminPanel } from "./admin/AdminPanel";
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

/** Login-intent handoff between LoginPage and the routing above (see LoginPage). */
export const LOGIN_MODE_KEY = "ponde_login_mode";
export const ADMIN_REJECTED_KEY = "ponde_admin_rejected";

function readLoginMode(): string | null {
  try {
    return sessionStorage.getItem(LOGIN_MODE_KEY);
  } catch {
    return null;
  }
}

function clearLoginMode() {
  try {
    sessionStorage.removeItem(LOGIN_MODE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

/** undefined = not yet checked, null = signed out. */
type AuthState = Session | null | undefined;
type Role = "loading" | "admin" | "user";

export function MabarApp() {
  const [session, setSession] = useState<AuthState>(undefined);
  const [role, setRole] = useState<Role>("loading");
  const [storedTab, setActiveTab] = usePersistentState<string>("activeTab", "pemain");
  const activeTab = normalizeTab(storedTab);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return onAuthStateChange((next) => setSession(next));
  }, []);

  // Platform admins land on the admin panel; everyone else on the app.
  // Someone who chose "Admin" at login but isn't one is signed back out, so the
  // admin entrance can't be used to reach anything without the admin role.
  useEffect(() => {
    if (!session) {
      setRole("loading");
      return;
    }
    let cancelled = false;
    setRole("loading");
    isPlatformAdmin()
      .then((admin) => {
        if (cancelled) return;
        if (admin) {
          clearLoginMode();
          setRole("admin");
          return;
        }
        if (readLoginMode() === "admin") {
          try {
            sessionStorage.setItem(ADMIN_REJECTED_KEY, "1");
          } catch {
            /* ignore storage errors */
          }
          clearLoginMode();
          signOut(); // → session null → LoginPage shows the rejection; stay on "loading" meanwhile.
          return;
        }
        clearLoginMode();
        setRole("user");
      })
      .catch(() => !cancelled && setRole("user"));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session === undefined) {
    return <FullScreenMessage title="Memuat…" />;
  }

  if (session === null) {
    return <LoginPage onLoginSuccess={() => undefined} />;
  }

  if (role === "loading") {
    return <FullScreenMessage title="Memuat…" />;
  }

  if (role === "admin") {
    return <AdminPanel email={session.user.email ?? null} />;
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
