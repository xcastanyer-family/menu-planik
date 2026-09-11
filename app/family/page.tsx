"use client";

import React, { useState, useEffect } from "react";
import { Family, FamilyMember, UserSession } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { JoinFamilyModal } from "@/components/family/JoinFamilyModal";
import { InviteMemberModal } from "@/components/family/InviteMemberModal";
import {
  Users,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Copy,
  Check,
  MessageSquare,
  RotateCcw,
  Trash2,
  Sparkles,
  LogOut,
  UserCheck,
  Home,
} from "lucide-react";
import { toast } from "sonner";

export default function FamilyPage() {
  const [family, setFamily] = useState<Family>(LocalStore.getFamily());
  const [session, setSession] = useState<UserSession>(LocalStore.getCurrentSession());
  const [isCopied, setIsCopied] = useState(false);

  // Modals
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Create new family form
  const [newFamilyName, setNewFamilyName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");

  const refresh = () => {
    setFamily(LocalStore.getFamily());
    setSession(LocalStore.getCurrentSession());
  };

  useEffect(() => {
    refresh();
    window.addEventListener("menuplanik_family_changed", refresh);
    window.addEventListener("menuplanik_session_changed", refresh);
    return () => {
      window.removeEventListener("menuplanik_family_changed", refresh);
      window.removeEventListener("menuplanik_session_changed", refresh);
    };
  }, []);

  const isOrganizer = session?.role === "admin" || session?.role === "superadmin";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(family.code);
    setIsCopied(true);
    toast.success("Codi de família copiat!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRegenerateCode = () => {
    if (confirm("Vols generar un nou codi de família? Els membres actuals mantindran l'accés, però els nous hauran de fer servir el codi nou.")) {
      const newCode = LocalStore.regenerateFamilyCode();
      toast.success(`Nou codi generat: ${newCode}`);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Segur que vols treure a ${memberName} de la família?`)) {
      LocalStore.removeFamilyMember(memberId);
      toast.success(`${memberName} ha estat eliminat/da de la família.`);
    }
  };

  const handleSwitchSession = (member: FamilyMember) => {
    LocalStore.saveCurrentSession({
      memberId: member.id,
      familyId: family.id,
      name: member.name,
      email: member.email,
      role: member.role,
      familyCode: family.code,
      familyName: family.name,
      isAuthenticated: true,
    });
    toast.success(`Has canviat el teu perfil actiu a: ${member.name}`);
  };

  const handleCreateFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim() || !organizerName.trim() || !organizerEmail.trim()) {
      toast.error("Omple tots els camps si us plau.");
      return;
    }

    const created = LocalStore.createFamily(newFamilyName.trim(), organizerName.trim(), organizerEmail.trim());
    toast.success(`Nova família "${created.name}" creada amb èxit!`);
    setIsCreatingNew(false);
    setNewFamilyName("");
    setOrganizerName("");
    setOrganizerEmail("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner / Family Identity */}
      <div className="bg-gradient-to-br from-white to-emerald-50/40 dark:from-zinc-900 dark:to-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600">
              <Home className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                {family.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">
                  Usuari actiu: <strong className="text-zinc-800 dark:text-zinc-200">{session?.name || "Convidat"}</strong> ({session?.email})
                </span>
                <Badge variant={isOrganizer ? "success" : "info"} size="sm">
                  {isOrganizer ? "Organitzador (Admin)" : "Membre"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="primary" onClick={() => setIsInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="w-4 h-4" />
            Convida Membre
          </Button>

          <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
            <KeyRound className="w-4 h-4" />
            Entra amb un altre Codi
          </Button>
        </div>
      </div>

      {/* Family Code Sharing Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-600" />
              Codi d'Accés per a la Família
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Els membres de la llar només necessiten aquest codi per accedir sense contrasenya.
            </p>
          </div>

          {isOrganizer && (
            <button
              onClick={handleRegenerateCode}
              title="Regenera el codi"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenera Codi
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-primary-700 dark:text-primary-400 bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-inner">
              {family.code}
            </div>
            <div className="hidden sm:block text-xs text-zinc-500">
              <span>Comparteix aquest codi amb la teva parella o fills</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="flex-1 sm:flex-none">
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {isCopied ? "Copiat!" : "Copia Codi"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteOpen(true)}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="w-4 h-4" />
              Envia per WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Members List Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Membres de la Família ({family.members.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tots els membres comparteixen el mateix menú setmanal, llista de la compra i rebost.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Afegir
          </Button>
        </div>

        <div className="space-y-2">
          {family.members.map((member) => {
            const isCurrent = session?.memberId === member.id;
            return (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                  isCurrent
                    ? "bg-primary-50/50 dark:bg-primary-950/20 border-primary-300 dark:border-primary-800"
                    : "bg-zinc-50/50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                    style={{ backgroundColor: member.color || "#16a34a" }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {member.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                          Tu
                        </span>
                      )}
                      <Badge variant={member.role === "admin" ? "success" : "default"} size="sm">
                        {member.role === "admin" ? "Administrador" : "Membre"}
                      </Badge>
                    </div>

                    <span className="text-xs text-zinc-400 block mt-0.5">
                      {member.email} • Afegit/da el {new Date(member.joinedAt).toLocaleDateString("ca-ES")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwitchSession(member)}
                      className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-primary-600"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Activa aquest perfil
                    </Button>
                  )}

                  {isOrganizer && member.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Elimina membre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create New Family Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Crear una Nova Família
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Vols començar una família independent per a una altra llar?
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
          >
            {isCreatingNew ? "Amaga Formulari" : "Crea Nova Família"}
          </Button>
        </div>

        {isCreatingNew && (
          <form onSubmit={handleCreateFamilySubmit} className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in">
            <Input
              label="Nom de la Família o Llar *"
              placeholder="ex. Família Garcia, Pis d'Estudiants Gràcia..."
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom de l'Organitzador *"
                placeholder="ex. Xavi"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                required
              />

              <Input
                label="Correu de l'Organitzador *"
                type="email"
                placeholder="xavi@exemple.cat"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreatingNew(false)}>
                Cancel·la
              </Button>
              <Button type="submit" variant="primary">
                <Sparkles className="w-4 h-4" />
                Crea Família i Genera Codi
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Modals */}
      <JoinFamilyModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={refresh}
      />

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        family={family}
      />
    </div>
  );
}

