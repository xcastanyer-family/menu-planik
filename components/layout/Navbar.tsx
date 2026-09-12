"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Calendar,
  BookOpen,
  ShoppingCart,
  ClipboardList,
  ScanBarcode,
  Package,
  Settings,
  Users,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Crown,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LocalStore } from "@/lib/storage/local-store";
import { UserSession } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Navbar: React.FC<{ onOpenGenerateModal?: () => void }> = ({ onOpenGenerateModal }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [publishedPendingCount, setPublishedPendingCount] = useState(0);

  const loadData = () => {
    const currentSession = LocalStore.getCurrentSession();
    setSession(currentSession);
    const pFam = LocalStore.getPendingFamilies().length;
    const pRec = LocalStore.getPendingRecipes().length;
    setPendingCount(pFam + pRec);

    const published = LocalStore.getPublishedShoppingList();
    if (published) {
      const pending = published.items.filter((i) => !i.checked).length;
      setPublishedPendingCount(pending);
    } else {
      setPublishedPendingCount(0);
    }
  };

  useEffect(() => {
    loadData();

    window.addEventListener("menuplanik_session_changed", loadData);
    window.addEventListener("menuplanik_family_changed", loadData);
    window.addEventListener("menuplanik_recipes_changed", loadData);
    window.addEventListener("menuplanik_published_groceries_changed", loadData);
    return () => {
      window.removeEventListener("menuplanik_session_changed", loadData);
      window.removeEventListener("menuplanik_family_changed", loadData);
      window.removeEventListener("menuplanik_recipes_changed", loadData);
      window.removeEventListener("menuplanik_published_groceries_changed", loadData);
    };
  }, []);

  const handleResetData = () => {
    if (confirm("Vols restablir totes les dades (receptes, menús, rebost, famílies) als valors inicials?")) {
      setIsResetting(true);
      LocalStore.resetAllToDefault();
      toast.success("Dades restablertes als valors inicials amb èxit!");
      setTimeout(() => {
        setIsResetting(false);
        window.location.reload();
      }, 500);
    }
  };

  const handleLogout = () => {
    LocalStore.logout();
    toast.success("Sessió tancada correctament.");
    setIsRoleMenuOpen(false);
    router.push("/login");
  };

  const isSuperadmin = session?.role === "superadmin";
  const isAdmin = session?.role === "admin";
  const isAuthenticated = session?.isAuthenticated;

  // On login screen, don't show navbar so only login interface is visible
  if (pathname === "/login") {
    return null;
  }

  const navLinks = [
    { href: "/planner", label: "Planificador", icon: Calendar },
    { href: "/recipes", label: "Receptari", icon: BookOpen },
    { href: "/products", label: "Productes", icon: ScanBarcode },
    { href: "/groceries", label: "Llista de Compra", icon: ClipboardList },
    {
      href: "/compra",
      label: "Compra",
      icon: ShoppingCart,
      badge: publishedPendingCount > 0 ? publishedPendingCount : undefined,
    },
    { href: "/pantry", label: "Rebost", icon: Package },
    { href: "/family", label: "Família", icon: Users },
    ...(isSuperadmin
      ? [
          {
            href: "/admin",
            label: "Superadmin",
            icon: ShieldCheck,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
        ]
      : []),
    { href: "/settings", label: "Configuració", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href={isAuthenticated ? "/planner" : "/login"} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                Menu<span className="text-primary-600 dark:text-primary-400">Planik</span>
              </span>
              <span className="block text-[10px] text-zinc-400 font-medium tracking-wider uppercase">
                AI Meal Assistant
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1 ml-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary-600 dark:text-primary-400" : "text-zinc-400")} />
                    {link.label}
                    {link.badge && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-zinc-950 font-bold rounded-full text-[10px] animate-pulse">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              {/* User Account / Session */}
              <div className="relative">
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 border border-zinc-200/60 dark:border-zinc-700/40 text-xs transition"
                >
                  {isSuperadmin ? (
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  ) : isAdmin ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {session?.name || "Usuari"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    ({isSuperadmin ? "Superadmin" : isAdmin ? "Admin" : "Usuari"})
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
                </button>

                {/* User Dropdown */}
                {isRoleMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsRoleMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 z-50 animate-in fade-in space-y-1">
                      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{session?.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{session?.email || "Sense correu"}</p>
                      </div>

                      <Link
                        href="/settings"
                        onClick={() => setIsRoleMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Configuració
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-semibold text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Tanca la Sessió
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleResetData}
                disabled={isResetting}
                title="Restableix dades inicials"
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition"
              >
                <RotateCcw className={cn("w-4 h-4", isResetting && "animate-spin")} />
              </button>

              {onOpenGenerateModal && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenGenerateModal}
                  className="hidden sm:inline-flex bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 shadow-md shadow-primary-500/20"
                >
                  <Sparkles className="w-4 h-4 text-emerald-100" />
                  <span>Genera amb IA</span>
                </Button>
              )}
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                <LogIn className="w-4 h-4 mr-1.5" />
                Inicia Sessió
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

