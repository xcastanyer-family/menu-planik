"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { GroceryItem, GroceryCategory } from "@/types";
import { Plus } from "lucide-react";

interface AddGroceryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: GroceryItem) => void;
}

export const AddGroceryItemModal: React.FC<AddGroceryItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("unitats");
  const [category, setCategory] = useState<GroceryCategory>("produce");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: GroceryItem = {
      id: `item-${Date.now()}`,
      name: name.trim(),
      amount: Number(amount) || 1,
      unit: unit.trim() || "u",
      category,
      checked: false,
    };

    onAddItem(newItem);
    setName("");
    setAmount(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Afegeix Article a la Compra" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Nom de l'Article *"
          placeholder="ex. Llet d'ametlles, Pomes golden, Alfàbrega..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantitat"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Input
            label="Unitat de mesura"
            placeholder="ex. g, kg, l, unitats, pots"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <Select
          label="Secció / Passadís"
          value={category}
          onChange={(e) => setCategory(e.target.value as GroceryCategory)}
        >
          <option value="produce">🥦 Fruita i Verdura</option>
          <option value="dairy">🧀 Làctics i Ous</option>
          <option value="meat">🥩 Carn i Peix</option>
          <option value="bakery">🍞 Pa i Forn</option>
          <option value="pantry">🍝 Rebost i Espècies</option>
          <option value="frozen">❄️ Congelats</option>
          <option value="beverages">🧃 Begudes</option>
          <option value="other">📦 Altres</option>
        </Select>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel·la
          </Button>
          <Button type="submit" variant="primary">
            <Plus className="w-4 h-4" />
            Afegeix a la Llista
          </Button>
        </div>
      </form>
    </Modal>
  );
};
