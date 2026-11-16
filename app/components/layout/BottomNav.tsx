import { Activity, Trophy, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { TabId } from "../../types/mabar";

interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "pemain", label: "Pemain", icon: Users },
  { id: "main", label: "Main", icon: Activity },
  { id: "hasil", label: "Hasil", icon: Trophy },
  { id: "kas", label: "Kas", icon: Wallet },
];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-card pb-safe print:hidden"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-14 items-center justify-center rounded-full transition-all duration-200",
                    isActive && "surface-brand shadow-brand"
                  )}
                  style={{ transitionTimingFunction: "var(--ease-spring)" }}
                >
                  <Icon size={20} aria-hidden className={isActive ? "stroke-[2.25]" : undefined} />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
