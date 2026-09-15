"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SupabaseAuthService } from "@/lib/supabase/auth";
import { LocalStore } from "@/lib/storage/local-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  UtensilsCrossed,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";

  // Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const navigateAfterAuth = (defaultPath: string) => {
    const target = redirectPath || defaultPath;
    window.location.href = target;
  };


  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      toast.error("Introdueix el teu usuari o correu electrònic.");
      return;
    }
    if (!loginPassword.trim()) {
      toast.error("Introdueix la contrasenya.");
      return;
    }

    setIsLoginLoading(true);

    // 1. Check local session/store first (instant and supports username/email)
    const localResult = LocalStore.signIn(loginEmail.trim(), loginPassword.trim());
    if (localResult.success) {
      setIsLoginLoading(false);
      toast.success(localResult.message);
      if (localResult.session?.role === "superadmin") {
        navigateAfterAuth("/admin");
      } else {
        navigateAfterAuth("/planner");
      }
      return;
    }

    // If local account was matched but password was wrong, abort immediately
    if (localResult.message.toLowerCase().includes("contrasenya incorrecta")) {
      setIsLoginLoading(false);
      toast.error(localResult.message);
      return;
    }

    // 2. Otherwise try Supabase
    const result = await SupabaseAuthService.signIn({
      email: loginEmail,
      password: loginPassword,
    });
    setIsLoginLoading(false);

    if (result.success) {
      toast.success(result.message);
      if (result.session?.role === "superadmin") {
        navigateAfterAuth("/admin");
      } else {
        navigateAfterAuth("/planner");
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-8 px-4">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 mb-3">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Menu<span className="text-primary-600 dark:text-primary-400">Planik</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Planificació de menús, rebost i compra col·laborativa
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <LogIn className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Inici de Sessió
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Accedeix amb les teves credencials de família o superadministrador.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Usuari o Correu Electrònic"
              type="text"
              placeholder="ex. xavi@menuplanik.cat o Xavi"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />

            <Input
              label="Contrasenya"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoginLoading}
              className="w-full py-2.5 font-medium"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entra a MenuPlanik
            </Button>
          </form>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Per sol·licitar una nova família o canvis de permisos, contacta amb el superadministrador.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
