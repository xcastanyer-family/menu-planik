"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PantryItem, GroceryCategory } from "@/types";
import { Plus } from "lucide-react";

interface AddPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: PantryItem) => void;
}

export const AddPantryItemModal: React.FC<AddPantryItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("unitats");
  const [category, setCategory] = useState<GroceryCategory>("pantry");
  const [expiryDate, setExpiryDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: PantryItem = {
      id: `pantry-${Date.now()}`,
      name: name.trim(),
      amount: Number(amount) || 1,
      unit: unit.trim() || "u",
      category,
      expiryDate: expiryDate ? expiryDate : undefined,
      addedAt: new Date().toISOString().split("T")[0],
    };

    onAddItem(newItem);
    setName("");
    setAmount(1);
    setExpiryDate("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Afegeix al Rebost o Nevera" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Nom de l'Aliment *"
          placeholder="ex. Arròs carnaroli, Tomàquets, Ous..."
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

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value as GroceryCategory)}
          >
            <option value="pantry">🍝 Rebost i Cereals</option>
            <option value="produce">🥦 Fruita i Verdura</option>
            <option value="dairy">🧀 Làctics i Ous</option>
            <option value="meat">🥩 Carn i Peix</option>
            <option value="bakery">🍞 Pa i Forn</option>
            <option value="frozen">❄️ Congelats</option>
            <option value="beverages">🧃 Begudes</option>
          </Select>

          <Input
            label="Data de Caducitat (Opcional)"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto justify-center">
            Cancel·la
          </Button>
          <Button type="submit" variant="primary" className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-1.5" />
            Desa al Rebost
          </Button>
        </div>
      </form>
    </Modal>
  );
};
