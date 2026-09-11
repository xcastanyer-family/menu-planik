"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocalStore } from "@/lib/storage/local-store";
import { Users, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !email.trim()) {
      toast.error("Omple tots els camps si us plau.");
      return;
    }

    setIsLoading(true);
    const res = LocalStore.joinFamilyWithCode(code, name, email);
    setIsLoading(false);

    if (res.success) {
      toast.success(res.message);
      setCode("");
      setName("");
      setEmail("");
      onClose();
      if (onSuccess) onSuccess();
      window.location.reload();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unir-se a una Família"
      description="Sense contrasenyes ni registres: només necessites el codi proporcionat pel teu organitzador."
      maxWidth="md"
    >
      <form onSubmit={handleJoin} className="space-y-4 pt-2">
        <Input
          label="Codi de Família *"
          placeholder="ex. FAM-7492 o PLANIK-2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          helperText="Demana el codi a l'administrador de la teva llar"
        />

        <Input
          label="El teu Nom o Àlies *"
          placeholder="ex. Júlia, Marc, Pare, Mare..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="El teu Correu Electrònic *"
          type="email"
          placeholder="julia@exemple.cat"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel·la
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="bg-primary-600 hover:bg-primary-700 text-white">
            <LogIn className="w-4 h-4" />
            Entra a la Família
          </Button>
        </div>
      </form>
    </Modal>
  );
};

