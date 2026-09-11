"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalStore } from "@/lib/storage/local-store";
import { UserSession, UserRole, FamilyRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, ShieldCheck, Lock, LogIn, ArrowLeft, Crown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | FamilyRole;
  requireAuth?: boolean;
  requireFamily?: boolean;
  customTitle?: string;
  customMessage?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole,
  requireAuth = false,
  requireFamily = false,
  customTitle,
  customMessage,
}) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  const checkSession = () => {
    const curr = LocalStore.getCurrentSession();
    setSession(curr);
  };

  useEffect(() => {
    checkSession();
    setIsMounted(true);

    window.addEventListener("menuplanik_session_changed", checkSession);
    return () => {
      window.removeEventListener("menuplanik_session_changed", checkSession);
    };
  }, []);

  // Loading state during hydration
  if (!isMounted || !session) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 p-8">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-xs text-zinc-400 font-medium animate-pulse">Verificant credencials i permisos de seguretat...</p>
      </div>
    );
  }

  // Check authorization
  let isAuthorized = true;
  let reason = "";

  const isSuperadmin = session.role === "superadmin";
  const isAdmin = session.role === "admin" || isSuperadmin;

  if (requiredRole === "superadmin" || (requiredRole as string) === "superuser") {
    if (!isSuperadmin) {
      isAuthorized = false;
      reason = "Aquesta àrea és d'accés exclusiu per al Superadministrador de la plataforma.";
    } else if (requireAuth && !session.isAuthenticated) {
      isAuthorized = false;
      reason = "Cal que tinguis una sessió autenticada amb credencials de Superadministrador.";
    }
  } else if (requiredRole === "admin" || (requiredRole as string) === "organizer") {
    if (!isAdmin) {
      isAuthorized = false;
      reason = "Cal ser Administrador de la família per accedir a aquesta secció.";
    }
  }

  if (requireAuth && !session.isAuthenticated && !isSuperadmin) {
    isAuthorized = false;
    reason = "Aquesta acció requereix una sessió autenticada amb credencials.";
  }

  if (requireFamily && !session.familyId && !isSuperadmin) {
    isAuthorized = false;
    reason = "No estàs associat a cap família activa. Introdueix un codi de família o registra'n una de nova.";
  }

  // If authorized, render protected content
  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
        <Lock className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          {customTitle || "Accés Restringit"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {customMessage || reason}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
        <Link href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="w-full sm:w-auto">
          <Button variant="primary" className="w-full">
            <LogIn className="w-4 h-4 mr-1.5" />
            Inicia la Sessió
          </Button>
        </Link>

        <Link href="/planner" className="w-full sm:w-auto">
          <Button variant="ghost" className="w-full text-zinc-500">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Planificador
          </Button>
        </Link>
      </div>
    </div>
  );
};
