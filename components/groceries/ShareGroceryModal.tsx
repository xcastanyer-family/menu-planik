"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GroceryItem } from "@/types";
import { formatAisleCategory } from "@/lib/utils";
import { Copy, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ShareGroceryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
}

export const ShareGroceryModal: React.FC<ShareGroceryModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Group items
  const categories = Array.from(new Set(items.map((i) => i.category)));

  let formattedText = `🛒 *LLISTA DE LA COMPRA - MenuPlanik*\n\n`;
  categories.forEach((cat) => {
    const catItems = items.filter((i) => i.category === cat && !i.checked);
    if (catItems.length > 0) {
      formattedText += `*${formatAisleCategory(cat)}*\n`;
      catItems.forEach((item) => {
        formattedText += `• ${item.name} (${item.amount} ${item.unit})\n`;
      });
      formattedText += `\n`;
    }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    toast.success("Llista de la compra copiada al porta-retalls!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedText)}`;
    window.open(url, "_blank");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comparteix Llista de la Compra" maxWidth="md">
      <div className="space-y-4 pt-2">
        <p className="text-xs sm:text-sm text-zinc-500">
          Copia el text amb el format llest o envia'l directament per WhatsApp per fer la compra fàcilment.
        </p>

        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
          {formattedText}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="primary" onClick={handleCopy} className="flex-1">
            {isCopied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            {isCopied ? "Copiat!" : "Copia al Porta-retalls"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleShareWhatsApp}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <MessageSquare className="w-4 h-4" />
            Envia per WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
