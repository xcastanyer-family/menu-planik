"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocalStore } from "@/lib/storage/local-store";
import { Family, FamilyMember } from "@/types";
import { UserPlus, Copy, Check, Shield, User } from "lucide-react";
import { toast } from "sonner";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  onMemberAdded?: (member: FamilyMember) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  family,
  onMemberAdded,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("user123");
  const [canModify, setCanModify] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<FamilyMember | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("user123");
    setCanModify(false);
    setLastCreated(null);
    setIsCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Introdueix el nom o usuari del membre.");
      return;
    }

    setIsLoading(true);
    const pass = password.trim() || "user123";
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const res = LocalStore.addFamilyMember(
      family.id,
      cleanName,
      cleanEmail,
      pass,
      canModify
    );

    // Sync to Supabase in background
    fetch("/api/family/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: family.id,
        name: cleanName,
        email: cleanEmail,
        password: pass,
        canModify,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.member?.email) {
          LocalStore.updateFamilyMember(res.member?.id || "", { email: data.member.email }, family.id);
        }
      })
      .catch((err) => console.warn("Could not sync member to Supabase:", err));

    setIsLoading(false);

    if (res.success && res.member) {
      toast.success(res.message);
      setLastCreated(res.member);
      if (onMemberAdded) {
        onMemberAdded(res.member);
      }
    } else {
      toast.error(res.message);
    }
  };

  const handleCopyCredentials = () => {
    if (!lastCreated) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔑 Credencials d'accés a MenuPlanik:\n• Família: ${family.name}\n• Usuari: ${lastCreated.name} (o ${lastCreated.email})\n• Contrasenya: ${lastCreated.password || "user123"}\n• Accés: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Credencials copiades al porta-retalls!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={lastCreated ? "Membre afegit amb èxit!" : `Afegeix un membre a ${family.name}`}
      description={
        lastCreated
          ? "Pots compartir aquestes credencials amb el teu familiar perquè pugui accedir immediatament."
          : "Crea el compte d'un familiar perquè pugui consultar o gestionar el menú compartit."
      }
      maxWidth="md"
    >
      {lastCreated ? (
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
                style={{ backgroundColor: lastCreated.color || "#16a34a" }}
              >
                {lastCreated.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  {lastCreated.name}
                </h4>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  {lastCreated.email}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-900/40 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Usuari:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{lastCreated.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Contrasenya:</span>
                <strong className="text-primary-600 dark:text-primary-400">{lastCreated.password || "user123"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Permisos:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-sans">
                  {lastCreated.canModify ? "✓ Donar d'alta i modificar" : "Només consulta"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyCredentials}
              className="w-full justify-center"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {isCopied ? "Credencials copiades!" : "Copia credencials"}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleClose}
              className="w-full justify-center"
            >
              D'acord, tancar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="space-y-4 pt-2">
          <Input
            label="Nom o Àlies del Membre *"
            placeholder="ex. Pau, Marta, Avi, Mare..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helperText="Nom amb el qual iniciarà sessió a MenuPlanik"
          />

          <Input
            label="Correu Electrònic (Opcional)"
            type="email"
            placeholder="pau@exemple.cat"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Si el deixes buit, es generarà un identificador intern automàtic"
          />

          <Input
            label="Contrasenya d'accés *"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Contrasenya que farà servir per entrar (per defecte: user123)"
          />

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={canModify}
                onChange={(e) => setCanModify(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 mt-0.5"
              />
              <div>
                <strong className="block text-zinc-900 dark:text-white">
                  Permís d'edició de productes i receptes
                </strong>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Si està marcat, podrà donar d'alta i modificar articles. Si no, només podrà consultar i planificar àpats.
                </span>
              </div>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto justify-center"
            >
              Cancel·la
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full sm:w-auto justify-center font-semibold"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Afegeix Membre
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

