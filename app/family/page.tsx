"use client";

import React, { useState, useEffect } from "react";
import { Family, FamilyMember, UserSession } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JoinFamilyModal } from "@/components/family/JoinFamilyModal";
import { InviteMemberModal } from "@/components/family/InviteMemberModal";
import { AddMemberModal } from "@/components/family/AddMemberModal";
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
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

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

  const handleToggleMemberCanModify = (memberId: string, currentVal?: boolean) => {
    const newVal = !currentVal;
    LocalStore.updateFamilyMember(memberId, { canModify: newVal }, family.id);
    refresh();
    toast.success(`Permís de modificació ${newVal ? "activat" : "desactivat"}.`);
  };

  const handleCopyMemberCredentials = (member: FamilyMember) => {
    const pass = member.password || (member.role === "admin" ? "admin123" : "user123");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔑 Credencials d'accés a MenuPlanik:\n• Usuari: ${member.name} (o ${member.email})\n• Contrasenya: ${pass}\n• Adreça: ${origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success(`Credencials de "${member.name}" copiades al porta-retalls!`);
  };

  const handleSwitchSession = (member: FamilyMember) => {
    LocalStore.saveCurrentSession({
      memberId: member.id,
      familyId: family.id,
      name: member.name,
      email: member.email,
      role: member.role,
      canModify: member.role === "admin" || member.canModify === true,
      familyCode: family.code,
      familyName: family.name,
      isAuthenticated: true,
    });
    toast.success(`Has canviat el teu perfil actiu a: ${member.name}`);
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

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-col sm:flex-row">
          <Button
            variant="primary"
            onClick={() => setIsAddMemberOpen(true)}
            className="w-full sm:w-auto justify-center bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Afegeix Membre
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsInviteOpen(true)}
            className="w-full sm:w-auto justify-center"
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Convida per Codi
          </Button>

          <Button
            variant="ghost"
            onClick={() => setIsJoinOpen(true)}
            className="w-full sm:w-auto justify-center text-xs text-zinc-500"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1" />
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

          <Button variant="primary" size="sm" onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1" />
            Afegeix Membre
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
                      {member.role === "admin" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                          Edició de productes i receptes
                        </span>
                      ) : isOrganizer ? (
                        <button
                          type="button"
                          onClick={() => handleToggleMemberCanModify(member.id, member.canModify)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition cursor-pointer border ${
                            member.canModify
                              ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                          }`}
                          title="Fes clic per canviar permís d'edició d'aquest membre"
                        >
                          {member.canModify ? "✓ Edició de productes/receptes" : "Només consulta"}
                        </button>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          member.canModify
                            ? "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        }`}>
                          {member.canModify ? "Edició permesa" : "Només consulta"}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-zinc-400 block mt-0.5">
                      {member.email} • Afegit/da el {new Date(member.joinedAt).toLocaleDateString("ca-ES")}
                    </span>

                    {isOrganizer && (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap font-mono">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                          Usuari: <strong className="text-zinc-800 dark:text-zinc-200">{member.name}</strong>
                        </span>
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                          Pass: <strong className="text-zinc-800 dark:text-zinc-200">{member.password || (member.role === "admin" ? "admin123" : "user123")}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOrganizer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyMemberCredentials(member)}
                      className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-primary-600"
                      title="Copia les dades d'accés (usuari i contrasenya) per enviar-li"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Credencials
                    </Button>
                  )}

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

      {/* Superadmin Link / Family Info Footer */}
      {session?.role === "superadmin" ? (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Ets Superadministrador Global
            </h3>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Pots crear noves famílies, gestionar tots els membres i eliminar dades des del panell d'administració.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = "/admin"}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
          >
            Ves al Panell Global
          </Button>
        </div>
      ) : (
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-2">
          La creació o eliminació de noves famílies està restringida al Superadministrador.
        </div>
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        family={family}
        onMemberAdded={refresh}
      />

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

