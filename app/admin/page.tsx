"use client";

import React, { useState, useEffect } from "react";
import { Family, Recipe, UserSession } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { getRecipeFoodInfo, getRecipeComplexity } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RecipeDetailModal } from "@/components/recipes/RecipeDetailModal";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Sparkles,
  KeyRound,
  AlertTriangle,
  FileCheck2,
  Layers,
  Search,
  LogOut,
  LogIn,
  Trash2,
  Plus,
  UserPlus,
  UserMinus,
  Shield,
  X,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { SupabaseAuthService } from "@/lib/supabase/auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession>(LocalStore.getCurrentSession());
  const [families, setFamilies] = useState<Family[]>(LocalStore.getAllFamilies());
  const [recipes, setRecipes] = useState<Recipe[]>(LocalStore.getAllRecipesRaw());
  const [activeTab, setActiveTab] = useState<"pending-families" | "pending-recipes" | "all-families" | "all-recipes">("pending-families");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Family Form Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyCode, setNewFamilyCode] = useState("");
  const [newOrganizerName, setNewOrganizerName] = useState("");
  const [newOrganizerEmail, setNewOrganizerEmail] = useState("");

  // Manage Family Members Modal
  const [managingFamily, setManagingFamily] = useState<Family | null>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("user123");
  const [newMemberCanModify, setNewMemberCanModify] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);

  const refresh = async () => {
    setSession(LocalStore.getCurrentSession());
    setRecipes(LocalStore.getAllRecipesRaw());
    const fams = await SupabaseAuthService.getAllFamilies();
    setFamilies(fams);
  };

  useEffect(() => {
    refresh();
    window.addEventListener("menuplanik_family_changed", refresh);
    window.addEventListener("menuplanik_recipes_changed", refresh);
    window.addEventListener("menuplanik_session_changed", refresh);
    return () => {
      window.removeEventListener("menuplanik_family_changed", refresh);
      window.removeEventListener("menuplanik_recipes_changed", refresh);
      window.removeEventListener("menuplanik_session_changed", refresh);
    };
  }, []);

  const isSuperuser = session?.role === "superadmin";

  const pendingFamilies = families.filter((f) => f.status === "pending");
  const pendingRecipes = recipes.filter((r) => r.moderationStatus === "pending_review");
  const approvedPublicRecipes = recipes.filter((r) => r.moderationStatus === "approved_public" || r.isPublic);

  const handleApproveFamily = (familyId: string, name: string) => {
    LocalStore.approveFamily(familyId);
    toast.success(`Família "${name}" aprovada amb èxit! Ja poden accedir amb el seu codi.`);
  };

  const handleRejectFamily = (familyId: string, name: string) => {
    const reason = prompt(`Indica el motiu pel qual es rebutja la família "${name}":`, "Informació de contacte no verificada.");
    if (reason !== null) {
      LocalStore.rejectFamily(familyId, reason);
      toast.error(`Família "${name}" rebutjada.`);
    }
  };

  const handleDeleteFamily = async (familyId: string, name: string) => {
    if (
      confirm(
        `ATENCIÓ: Estàs a punt d'eliminar definitivament la "${name}" i tots els seus membres, receptes i dades de la plataforma.\nVols continuar?`
      )
    ) {
      await SupabaseAuthService.deleteFamily(familyId);
      refresh();
      toast.success(`Família "${name}" eliminada definitivament.`);
    }
  };

  const handleDeleteSuperadmin = async () => {
    const confirmText = prompt(
      'ATENCIÓ CRÍTICA: Estàs a punt d\'eliminar definitivament el teu compte de Superadministrador.\nPer confirmar l\'acció, escriu exactament "ELIMINAR":'
    );
    if (confirmText === "ELIMINAR") {
      await SupabaseAuthService.deleteSuperadminAccount();
      toast.success("Compte de Superadministrador eliminat.");
    }
  };

  const handleCreateFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim() || !newOrganizerName.trim() || !newOrganizerEmail.trim()) {
      toast.error("Omple tots els camps obligatoris.");
      return;
    }

    LocalStore.createFamily(
      newFamilyName.trim(),
      newOrganizerName.trim(),
      newOrganizerEmail.trim().toLowerCase(),
      true,
      newFamilyCode.trim() || undefined,
      false // do not overwrite active superadmin session
    );

    setIsCreateModalOpen(false);
    setNewFamilyName("");
    setNewFamilyCode("");
    setNewOrganizerName("");
    setNewOrganizerEmail("");
    refresh();
    toast.success(`Família "${newFamilyName}" creada correctament!`);
  };

  const handleAddMemberToFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingFamily || !newMemberName.trim()) return;

    const pass = newMemberPassword.trim() || "user123";
    const cleanName = newMemberName.trim();
    const cleanEmail = newMemberEmail.trim();

    const res = LocalStore.addFamilyMember(
      managingFamily.id,
      cleanName,
      cleanEmail,
      pass,
      newMemberCanModify
    );

    // Sync to Supabase in background
    fetch("/api/family/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: managingFamily.id,
        name: cleanName,
        email: cleanEmail,
        password: pass,
        canModify: newMemberCanModify,
      }),
    }).catch((err) => console.warn("Could not sync member to Supabase:", err));

    if (res.success && res.member) {
      const updatedFamily = LocalStore.getFamily(managingFamily.id);
      setManagingFamily(updatedFamily);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("user123");
      setNewMemberCanModify(false);
      await refresh();
      toast.success(`Membre "${res.member.name}" afegit! Accés: usuari "${res.member.name}", contrasenya "${res.member.password}".`);
    } else {
      toast.error(res.message);
    }
  };

  const handleCopyMemberCredentials = (member: { name: string; email: string; password?: string; role: string; id: string }) => {
    const pass = member.password || (member.role === "admin" ? "admin123" : "user123");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔑 Credencials d'accés a MenuPlanik:\n• Usuari: ${member.name} (o ${member.email})\n• Contrasenya: ${pass}\n• Adreça: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedMemberId(member.id);
    toast.success(`Credencials de "${member.name}" copiades al porta-retalls!`);
    setTimeout(() => setCopiedMemberId(null), 2500);
  };

  const handleToggleMemberCanModify = (memberId: string, currentVal?: boolean) => {
    if (!managingFamily) return;
    const newVal = !currentVal;
    LocalStore.updateFamilyMember(memberId, { canModify: newVal }, managingFamily.id);
    const updatedFamily = LocalStore.getFamily(managingFamily.id);
    setManagingFamily(updatedFamily);
    refresh();
    toast.success(`Permís de modificació ${newVal ? "activat" : "desactivat"}.`);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!managingFamily) return;
    if (confirm(`Vols treure el membre "${memberName}" de la família?`)) {
      LocalStore.removeFamilyMember(memberId, managingFamily.id);
      const updatedFamily = LocalStore.getFamily(managingFamily.id);
      setManagingFamily(updatedFamily);
      refresh();
      toast.success(`Membre "${memberName}" eliminat de la família.`);
    }
  };

  const handleResetMemberPassword = (member: { id: string; name: string; email: string }) => {
    if (!managingFamily) return;
    const newPass = prompt(`Introdueix la nova contrasenya per a ${member.name} (${member.email}):`, "admin123");
    if (!newPass || !newPass.trim()) return;

    LocalStore.updateFamilyMember(member.id, { password: newPass.trim() }, managingFamily.id);
    const updatedFamily = LocalStore.getFamily(managingFamily.id);
    setManagingFamily(updatedFamily);
    refresh();
    toast.success(`Contrasenya de "${member.name}" actualitzada a: ${newPass.trim()}`);
  };

  const handleApproveRecipe = (recipeId: string, title: string) => {
    LocalStore.approveRecipePublic(recipeId);
    toast.success(`Recepta "${title}" aprovada i publicada al Catàleg Global!`);
  };

  const handleRejectRecipe = (recipeId: string, title: string) => {
    const reason = prompt(`Indica el motiu del rebuig per a "${title}":`, "Ingredients incomplets o duplicada.");
    if (reason !== null) {
      LocalStore.rejectRecipePublic(recipeId, reason);
      toast.error(`Recepta "${title}" rebutjada.`);
    }
  };

  const handleLogout = () => {
    LocalStore.logout();
    toast.success("Sessió tancada correctament.");
    router.push("/login");
  };

  const filteredFamilies = families.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.organizerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecipes = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.authorName && r.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AuthGuard requiredRole="superadmin" requireAuth>
      <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner / Security Context */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-7 h-7" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                  Panell de Superadministrador
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold uppercase tracking-wider border border-amber-400/30">
                    Control Global
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Valida nous administradors de família, modera el receptari públic i supervisa l'aïllament del sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-2 bg-zinc-800/90 rounded-2xl border border-zinc-700/60 text-xs flex items-center gap-2 text-zinc-300">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Sessió: <strong>{session.name}</strong> ({session.email})
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Tanca Sessió
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSuperadmin}
              className="text-xs border-rose-900/60 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200"
              title="Elimina el compte de Superadministrador"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
              Elimina Compte
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Families */}
        <div
          onClick={() => setActiveTab("pending-families")}
          className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === "pending-families"
              ? "bg-amber-500/10 border-amber-500/50 dark:bg-amber-950/20"
              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Famílies Pendents
            </span>
            <div className={`p-2 rounded-xl ${pendingFamilies.length > 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {pendingFamilies.length}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">
              {pendingFamilies.length > 0 ? "⚠️ Requereixen aprovació" : "Tot al dia"}
            </span>
          </div>
        </div>

        {/* Pending Recipes */}
        <div
          onClick={() => setActiveTab("pending-recipes")}
          className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === "pending-recipes"
              ? "bg-sky-500/10 border-sky-500/50 dark:bg-sky-950/20"
              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Cua Receptes Públiques
            </span>
            <div className={`p-2 rounded-xl ${pendingRecipes.length > 0 ? "bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-400" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {pendingRecipes.length}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">
              {pendingRecipes.length > 0 ? "⏳ Pendents de revisió" : "Catàleg actualitzat"}
            </span>
          </div>
        </div>

        {/* Total Families */}
        <div
          onClick={() => setActiveTab("all-families")}
          className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === "all-families"
              ? "bg-emerald-500/10 border-emerald-500/50 dark:bg-emerald-950/20"
              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Total Famílies
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {families.length}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">
              Aïllades entre si
            </span>
          </div>
        </div>

        {/* Approved Public Recipes */}
        <div
          onClick={() => setActiveTab("all-recipes")}
          className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === "all-recipes"
              ? "bg-purple-500/10 border-purple-500/50 dark:bg-purple-950/20"
              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Receptes Globals Públiques
            </span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {approvedPublicRecipes.length}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">
              Visibles per a tothom
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("pending-families")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "pending-families"
              ? "bg-amber-500 text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Aprovació de Famílies
          {pendingFamilies.length > 0 && (
            <span className="px-1.5 py-0.2 bg-zinc-950 text-amber-400 rounded-full text-[10px]">
              {pendingFamilies.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("pending-recipes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "pending-recipes"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Cua de Validació de Receptes
          {pendingRecipes.length > 0 && (
            <span className="px-1.5 py-0.2 bg-white text-sky-700 rounded-full text-[10px]">
              {pendingRecipes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("all-families")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "all-families"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Totes les Famílies ({families.length})
        </button>

        <button
          onClick={() => setActiveTab("all-recipes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "all-recipes"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Totes les Receptes ({recipes.length})
        </button>
      </div>

      {/* Tab 1: Cua d'Aprovació de Famílies */}
      {activeTab === "pending-families" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Famílies Pendents d'Aprovació
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Els nous organitzadors no podran convidar membres ni accedir fins que tu autoritzis la seva entitat.
              </p>
            </div>
          </div>

          {pendingFamilies.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Cap família pendent de validació
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Totes les sol·licituds de noves famílies han estat revisades i aprovades.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingFamilies.map((fam) => (
                <div
                  key={fam.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                          {fam.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="warning" size="sm">
                            Pendent d'Aprovació
                          </Badge>
                          <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {fam.code}
                          </span>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0">
                        {fam.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Organitzador:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{fam.organizerName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Correu Electrònic:</span>
                        <span className="font-mono">{fam.organizerEmail}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Data de Sol·licitud:</span>
                        <span>{new Date(fam.createdAt).toLocaleString("ca-ES")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Membres Inicials:</span>
                        <span>{fam.members.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApproveFamily(fam.id, fam.name)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Aprova Família
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectFamily(fam.id, fam.name)}
                      className="text-amber-600 hover:bg-amber-50 border-amber-200"
                      title="Rebutja sol·licitud"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Rebutja
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFamily(fam.id, fam.name)}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                      title="Elimina definitivament la família"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Cua de Validació de Receptes Públiques */}
      {activeTab === "pending-recipes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-500" />
                Cua de Validació de Receptes Públiques
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Receptes enviades per les famílies que sol·liciten ser incloses al catàleg públic per a la resta d'usuaris.
              </p>
            </div>
          </div>

          {pendingRecipes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-sky-500 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Cap recepta pendent de moderació
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No hi ha noves propostes de receptes públiques a la cua.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-sky-200 dark:border-sky-900/60 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const foodInfo = getRecipeFoodInfo(recipe);
                        return (
                          <div className={`w-16 h-16 rounded-xl ${foodInfo.bgLight} ${foodInfo.bgDark} flex items-center justify-center text-3xl shrink-0 border border-zinc-200 dark:border-zinc-800`}>
                            {foodInfo.icon}
                          </div>
                        );
                      })()}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="info" size="sm">
                            Pendent de Moderació
                          </Badge>
                          <span className="text-[11px] text-zinc-400">
                            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min • {recipe.calories} kcal
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1">
                          {recipe.title}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Enviada per:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{recipe.authorName || "Família privada"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Ingredients:</span>
                        <span>{recipe.ingredients.length} ingredients</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Passos de preparació:</span>
                        <span>{recipe.instructions.length} passos</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRecipe(recipe)}
                      className="w-full text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Previsualitza Detall i Ingredients
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveRecipe(recipe.id, recipe.title)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Aprova per al Catàleg Públic
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectRecipe(recipe.id, recipe.title)}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Rebutja
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Totes les Famílies (Aïllament & Gestió) */}
      {activeTab === "all-families" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Registre Global de Famílies ({families.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Com a Superadministrador, ets l'únic amb permisos per crear noves famílies, eliminar-les i gestionar els seus membres.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cerca família o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nova Família
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="p-3.5 font-semibold">Nom de la Família</th>
                    <th className="p-3.5 font-semibold">Codi d'Accés</th>
                    <th className="p-3.5 font-semibold">Organitzador</th>
                    <th className="p-3.5 font-semibold">Estat</th>
                    <th className="p-3.5 font-semibold">Membres</th>
                    <th className="p-3.5 font-semibold">Data Creació</th>
                    <th className="p-3.5 font-semibold text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-200">
                  {filteredFamilies.map((fam) => (
                    <tr key={fam.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition">
                      <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                        {fam.name}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] text-primary-700 dark:text-primary-400">
                          {fam.code}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 block">{fam.organizerName}</span>
                          <span className="text-zinc-400 text-[11px]">{fam.organizerEmail}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            fam.status === "approved"
                              ? "success"
                              : fam.status === "pending"
                              ? "warning"
                              : "destructive"
                          }
                          size="sm"
                        >
                          {fam.status === "approved"
                            ? "Aprovada"
                            : fam.status === "pending"
                            ? "Pendent"
                            : "Rebutjada"}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setManagingFamily(fam)}
                          className="font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-xs"
                          title="Gestionar membres d'aquesta família"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {fam.members.length} membres
                        </button>
                      </td>
                      <td className="p-3.5 text-zinc-400">
                        {new Date(fam.createdAt).toLocaleDateString("ca-ES")}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManagingFamily(fam)}
                          className="text-[11px] py-1 px-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Gestionar membres i permisos"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Membres
                        </Button>
                        {fam.status === "pending" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveFamily(fam.id, fam.name)}
                            className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Aprova
                          </Button>
                        )}
                        {fam.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectFamily(fam.id, fam.name)}
                            className="text-[11px] py-1 px-2.5 text-amber-600 hover:bg-amber-50 border-amber-200"
                            title="Desactiva família"
                          >
                            Desactiva
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFamily(fam.id, fam.name)}
                          className="text-[11px] py-1 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                          title="Elimina definitivament la família i les seves dades"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Elimina
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Totes les Receptes (Auditoria i Moderació) */}
      {activeTab === "all-recipes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Auditoria Global de Receptes ({recipes.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Gestiona l'estat de moderació i la visibilitat de totes les receptes registrades a la plataforma.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cerca per títol o autor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="p-3.5 font-semibold">Títol Recepta</th>
                    <th className="p-3.5 font-semibold">Autor / Origen</th>
                    <th className="p-3.5 font-semibold">Estat Moderació</th>
                    <th className="p-3.5 font-semibold">Temps / Kcal</th>
                    <th className="p-3.5 font-semibold">Ingredients</th>
                    <th className="p-3.5 font-semibold text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-200">
                  {filteredRecipes.map((recipe) => (
                    <tr key={recipe.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition">
                      <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const foodInfo = getRecipeFoodInfo(recipe);
                            return (
                              <div className={`w-7 h-7 rounded-lg ${foodInfo.bgLight} ${foodInfo.bgDark} flex items-center justify-center text-sm shrink-0 border border-zinc-200 dark:border-zinc-800`}>
                                {foodInfo.icon}
                              </div>
                            );
                          })()}
                          <span>{recipe.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {recipe.authorName || (recipe.source === "curated" ? "Catàleg Oficial" : "Família")}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            recipe.moderationStatus === "approved_public" || recipe.isPublic
                              ? "success"
                              : recipe.moderationStatus === "pending_review"
                              ? "info"
                              : recipe.moderationStatus === "rejected"
                              ? "destructive"
                              : "default"
                          }
                          size="sm"
                        >
                          {recipe.moderationStatus === "approved_public" || recipe.isPublic
                            ? "🌐 Pública Aprovada"
                            : recipe.moderationStatus === "pending_review"
                            ? "⏳ Pendent Revisió"
                            : recipe.moderationStatus === "rejected"
                            ? "❌ Rebutjada"
                            : "🔒 Privada"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-zinc-500">
                        {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m • {recipe.calories} kcal
                      </td>
                      <td className="p-3.5 text-zinc-500">
                        {recipe.ingredients.length} ing.
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecipe(recipe)}
                          className="text-[11px] py-1 px-2"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detall
                        </Button>
                        {recipe.moderationStatus !== "approved_public" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveRecipe(recipe.id, recipe.title)}
                            className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Aprova Pública
                          </Button>
                        )}
                        {recipe.moderationStatus === "approved_public" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectRecipe(recipe.id, recipe.title)}
                            className="text-[11px] py-1 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                          >
                            Retira
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Preview Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />

      {/* Modal 1: Crear Nova Família (Exclusiu Superadmin) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Crear Nova Família
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFamilySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom de la Família *
                </label>
                <input
                  type="text"
                  placeholder="ex. Família Garcia"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Codi d'Accés Personalitzat (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ex. GARCIA (o buit per auto-generar FAM-XXXX)"
                  value={newFamilyCode}
                  onChange={(e) => setNewFamilyCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom de l'Organitzador/a *
                </label>
                <input
                  type="text"
                  placeholder="ex. Maria Garcia"
                  value={newOrganizerName}
                  onChange={(e) => setNewOrganizerName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Correu Electrònic de l'Organitzador/a *
                </label>
                <input
                  type="email"
                  placeholder="ex. maria@exemple.cat"
                  value={newOrganizerEmail}
                  onChange={(e) => setNewOrganizerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel·la
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Crea Família
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Gestió de Membres de la Família */}
      {managingFamily && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Membres de {managingFamily.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Codi d'accés: <strong className="font-mono text-zinc-700 dark:text-zinc-200">{managingFamily.code}</strong> • {managingFamily.members.length} membres
                </p>
              </div>
              <button
                onClick={() => setManagingFamily(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulari per afegir membre */}
            <form onSubmit={handleAddMemberToFamily} className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-primary-600" />
                Afegeix un nou membre a la família
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nom o usuari *"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  required
                />
                <input
                  type="email"
                  placeholder="Correu electrònic (opcional)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Contrasenya (ex: user123)"
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  title="Contrasenya per defecte: user123"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={newMemberCanModify}
                    onChange={(e) => setNewMemberCanModify(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                  />
                  <span>Permís per donar d'alta i modificar productes/receptes</span>
                </label>
                <Button type="submit" variant="primary" size="sm" className="text-xs py-1 px-3">
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Afegir
                </Button>
              </div>
            </form>

            {/* Llista de membres actuals */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Membres actuals ({managingFamily.members.length})
              </span>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
                {managingFamily.members.map((member) => {
                  const canMod = member.role === "admin" || member.canModify === true;
                  return (
                    <div
                      key={member.id}
                      className="p-3 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0"
                          style={{ backgroundColor: member.color || "#16a34a" }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            {member.name}
                            {member.role === "admin" && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                                Organitzador
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">{member.email}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap font-mono">
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                              Usuari: <strong className="text-zinc-800 dark:text-zinc-200">{member.name}</strong>
                            </span>
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                              Pass: <strong className="text-zinc-800 dark:text-zinc-200">{member.password || (member.role === "admin" ? "admin123" : "user123")}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyMemberCredentials(member)}
                          className="p-1.5 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition"
                          title="Copia les dades d'accés (usuari i contrasenya) per enviar-li"
                        >
                          {copiedMemberId === member.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetMemberPassword(member)}
                          className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          title="Canvia o restableix la contrasenya d'aquest membre"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {member.role === "admin" ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                            Edició autoritzada (Admin)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleMemberCanModify(member.id, member.canModify)}
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition cursor-pointer border ${
                              member.canModify
                                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                            }`}
                            title="Fes clic per canviar permís d'edició"
                          >
                            {member.canModify ? "✓ Edició permesa" : "Només consulta"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Treure membre"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManagingFamily(null)}
              >
                Tanca
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AuthGuard>
);
}

