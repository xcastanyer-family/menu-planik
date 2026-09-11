"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SupabaseAuthService } from "@/lib/supabase/auth";
import { LocalStore } from "@/lib/storage/local-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  UtensilsCrossed,
  ShieldCheck,
  Users,
  KeyRound,
  LogIn,
  Crown,
  Sparkles,
  Lock,
  Mail,
  UserPlus,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";

  const [activeTab, setActiveTab] = useState<"login" | "register-user" | "register-admin">("login");

  // Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // User Sign Up state
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userFamilyCode, setUserFamilyCode] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(false);

  // Admin Sign Up state
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFamilyName, setAdminFamilyName] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const navigateAfterAuth = (defaultPath: string) => {
    const target = redirectPath || defaultPath;
    window.location.href = target;
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setIsLoginLoading(true);
    const result = await SupabaseAuthService.signIn({
      email,
      password: pass,
    });
    setIsLoginLoading(false);

    if (result.success) {
      toast.success(result.message);
      if (result.session?.role === "superadmin") {
        navigateAfterAuth("/admin");
      } else if (result.session?.role === "admin" && result.session?.status === "pending") {
        navigateAfterAuth("/family");
      } else {
        navigateAfterAuth("/planner");
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      toast.error("Introdueix el teu correu electrònic.");
      return;
    }
    if (!loginPassword.trim()) {
      toast.error("Introdueix la contrasenya.");
      return;
    }

    setIsLoginLoading(true);
    const result = await SupabaseAuthService.signIn({
      email: loginEmail,
      password: loginPassword,
    });
    setIsLoginLoading(false);

    if (result.success) {
      toast.success(result.message);
      if (result.session?.role === "superadmin") {
        navigateAfterAuth("/admin");
      } else if (result.session?.role === "admin" && result.session?.status === "pending") {
        navigateAfterAuth("/family");
      } else {
        navigateAfterAuth("/planner");
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleUserSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName.trim() || !userEmail.trim() || !userPassword.trim() || !userFamilyCode.trim()) {
      toast.error("Omple tots els camps obligatoris.");
      return;
    }

    setIsUserLoading(true);
    const result = await SupabaseAuthService.signUpUser({
      email: userEmail,
      password: userPassword,
      fullName: userFullName,
      familyCode: userFamilyCode,
    });
    setIsUserLoading(false);

    if (result.success) {
      toast.success(result.message);
      navigateAfterAuth("/planner");
    } else {
      toast.error(result.message);
    }
  };

  const handleAdminSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPassword.trim() || !adminFamilyName.trim()) {
      toast.error("Omple tots els camps obligatoris.");
      return;
    }

    setIsAdminLoading(true);
    const result = await SupabaseAuthService.signUpAdmin({
      email: adminEmail,
      password: adminPassword,
      fullName: adminFullName,
      familyName: adminFamilyName,
    });
    setIsAdminLoading(false);

    if (result.success) {
      toast.success(result.message);
      navigateAfterAuth("/family");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-8 px-4">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20 mb-3">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Menu<span className="text-primary-600 dark:text-primary-400">Planik</span>
        </h1>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
        {/* Tab Headers */}
        <div className="grid grid-cols-3 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("login")}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "login"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Inicia Sessió
          </button>

          <button
            onClick={() => setActiveTab("register-user")}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "register-user"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Nou Usuari
          </button>

          <button
            onClick={() => setActiveTab("register-admin")}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "register-admin"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Nou Admin
          </button>
        </div>

        {/* Tab 1: Inicia Sessió */}
        {activeTab === "login" && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input
                label="Correu Electrònic"
                type="email"
                placeholder="el-teu-correu@exemple.cat"
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
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Inicia Sessió
              </Button>
            </form>

            {/* Quick Demo Access */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 text-center">
                Comptes de Demostració (1 clic)
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  disabled={isLoginLoading}
                  onClick={() => handleQuickLogin("xavi@menuplanik.cat", "admin123")}
                  className="w-full text-left px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Admin Família</span>
                    <span className="text-[10px] text-zinc-400 ml-1.5">(Xavi)</span>
                    <div className="text-[10px] text-zinc-400">xavi@menuplanik.cat • admin123</div>
                  </div>
                  <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">Entrar →</span>
                </button>

                <button
                  type="button"
                  disabled={isLoginLoading}
                  onClick={() => handleQuickLogin("julia@menuplanik.cat", "user123")}
                  className="w-full text-left px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Membre Família</span>
                    <span className="text-[10px] text-zinc-400 ml-1.5">(Júlia)</span>
                    <div className="text-[10px] text-zinc-400">julia@menuplanik.cat • user123</div>
                  </div>
                  <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">Entrar →</span>
                </button>

                <button
                  type="button"
                  disabled={isLoginLoading}
                  onClick={() => handleQuickLogin("admin@menuplanik.cat", "superadmin123")}
                  className="w-full text-left px-3 py-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border border-amber-200/60 dark:border-amber-900/40 transition text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" /> Superadmin
                    </span>
                    <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">admin@menuplanik.cat • superadmin123</div>
                  </div>
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Entrar →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Nou Usuari amb Codi de Família */}
        {activeTab === "register-user" && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleUserSignUpSubmit} className="space-y-4">
              <div>
                <Input
                  label="Codi de Família"
                  placeholder="FAM-XXXX"
                  value={userFamilyCode}
                  onChange={(e) => setUserFamilyCode(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-[10px] text-zinc-400 mt-1">Codi per a proves: <strong className="text-zinc-600 dark:text-zinc-300 font-mono">FAM-7492</strong></p>
              </div>

              <Input
                label="Nom Complet"
                placeholder="El teu nom"
                value={userFullName}
                onChange={(e) => setUserFullName(e.target.value)}
                required
              />

              <Input
                label="Correu Electrònic"
                type="email"
                placeholder="el-teu-correu@exemple.cat"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />

              <Input
                label="Contrasenya"
                type="password"
                placeholder="••••••••"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isUserLoading}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Uneix-te a la Família
              </Button>
            </form>
          </div>
        )}

        {/* Tab 3: Nou Admin de Família */}
        {activeTab === "register-admin" && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleAdminSignUpSubmit} className="space-y-4">
              <Input
                label="Nom de la Família"
                placeholder="ex. Família Garcia"
                value={adminFamilyName}
                onChange={(e) => setAdminFamilyName(e.target.value)}
                required
              />

              <Input
                label="Nom de l'Administrador"
                placeholder="El teu nom"
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                required
              />

              <Input
                label="Correu Electrònic"
                type="email"
                placeholder="el-teu-correu@exemple.cat"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />

              <Input
                label="Contrasenya"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isAdminLoading}
                className="w-full"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Registra la Família
              </Button>
            </form>
          </div>
        )}
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
