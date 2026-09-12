"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, BookOpen, ClipboardList, ShoppingCart, Package, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalStore } from "@/lib/storage/local-store";
import { UserSession } from "@/types";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const [session, setSession] = useState<UserSession | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = () => {
    setSession(LocalStore.getCurrentSession());
    const published = LocalStore.getPublishedShoppingList();
    if (published) {
      const pending = published.items.filter((i) => !i.checked).length;
      setPendingCount(pending);
    } else {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("menuplanik_session_changed", loadData);
    window.addEventListener("menuplanik_published_groceries_changed", loadData);
    return () => {
      window.removeEventListener("menuplanik_session_changed", loadData);
      window.removeEventListener("menuplanik_published_groceries_changed", loadData);
    };
  }, []);

  if (pathname === "/login" || !session?.isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/planner", label: "Menú", icon: Calendar },
    { href: "/recipes", label: "Receptes", icon: BookOpen },
    { href: "/groceries", label: "Llista", icon: ClipboardList },
    { href: "/compra", label: "Compra", icon: ShoppingCart, badge: pendingCount > 0 ? pendingCount : undefined },
    { href: "/pantry", label: "Rebost", icon: Package },
    { href: "/family", label: "Família", icon: Users },
    { href: "/settings", label: "Perfil", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200/90 dark:border-zinc-800 px-1 py-1">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 text-[9.5px] font-medium",
                isActive
                  ? "text-primary-600 dark:text-primary-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <div
                className={cn(
                  "relative p-1 rounded-lg mb-0.5 transition-colors",
                  isActive ? "bg-primary-50 dark:bg-primary-950/60" : "bg-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary-600 dark:text-primary-400" : "text-zinc-400")} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] bg-emerald-600 text-white font-bold rounded-full text-[8px] flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[42px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

