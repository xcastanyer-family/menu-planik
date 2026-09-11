"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Family } from "@/types";
import { Copy, Check, MessageSquare, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  family,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const inviteMessage = `👋 Hola! T'invito a unir-te al nostre menú familiar a *MenuPlanik* per compartir el menú setmanal, la llista de la compra i el rebost.\n\n🔑 El nostre Codi de Família és: *${family.code}*\n\nNomés has d'entrar a la web, anar a Família, posar el teu nom, correu i aquest codi. No cal contrasenya!`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(family.code);
    setIsCopied(true);
    toast.success("Codi de família copiat al porta-retalls!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(inviteMessage);
    toast.success("Missatge d'invitació complet copiat!");
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convida membres a la ${family.name}`}
      description="Els teus familiars només necessiten aquest codi per accedir al menú compartit."
      maxWidth="md"
    >
      <div className="space-y-5 pt-2">
        {/* Giant Code Display */}
        <div className="p-4 bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-zinc-800 dark:to-zinc-800/80 rounded-2xl border border-primary-200 dark:border-zinc-700 text-center space-y-2">
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Codi Únic de Família
          </span>
          <div className="text-3xl font-mono font-extrabold tracking-widest text-zinc-900 dark:text-white select-all">
            {family.code}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Comparteix aquest codi amb la teva parella, fills o companys de pis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={handleCopyCode} className="w-full">
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {isCopied ? "Copiat!" : "Copia només el Codi"}
          </Button>

          <Button
            variant="primary"
            onClick={handleShareWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
          >
            <MessageSquare className="w-4 h-4" />
            Envia per WhatsApp
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={handleCopyFullMessage} className="w-full text-xs text-zinc-500">
          <Copy className="w-3 h-3 mr-1" /> Copia el text complet de la invitació
        </Button>
      </div>
    </Modal>
  );
};

