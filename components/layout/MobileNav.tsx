"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, BookOpen, ShoppingCart, Package, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalStore } from "@/lib/storage/local-store";
import { UserSession } from "@/types";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(LocalStore.getCurrentSession());
    const handleSession = () => setSession(LocalStore.getCurrentSession());
    window.addEventListener("menuplanik_session_changed", handleSession);
    return () => window.removeEventListener("menuplanik_session_changed", handleSession);
  }, []);

  if (pathname === "/login" || !session?.isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/planner", label: "Menú", icon: Calendar },
    { href: "/recipes", label: "Receptes", icon: BookOpen },
    { href: "/groceries", label: "Compra", icon: ShoppingCart },
    { href: "/pantry", label: "Rebost", icon: Package },
    { href: "/family", label: "Família", icon: Users },
    { href: "/settings", label: "Perfil", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 text-[10px] font-medium",
                isActive
                  ? "text-primary-600 dark:text-primary-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg mb-0.5 transition-colors",
                  isActive ? "bg-primary-50 dark:bg-primary-950/60" : "bg-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary-600 dark:text-primary-400" : "text-zinc-400")} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

