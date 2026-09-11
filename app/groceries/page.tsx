"use client";

import React, { useState, useEffect } from "react";
import { GroceryItem } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { generateGroceriesFromPlan } from "@/lib/storage/mock-data";
import { GroceryListView } from "@/components/groceries/GroceryListView";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { ShareGroceryModal } from "@/components/groceries/ShareGroceryModal";
import { toast } from "sonner";

export default function GroceriesPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(LocalStore.getGroceries());
    };
    load();

    window.addEventListener("menuplanik_groceries_changed", load);
    return () => window.removeEventListener("menuplanik_groceries_changed", load);
  }, []);

  const handleToggleItem = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    LocalStore.saveGroceries(updated);
    setItems(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    LocalStore.saveGroceries(updated);
    setItems(updated);
    toast.success("Article eliminat");
  };

  const handleClearCompleted = () => {
    const updated = items.filter((item) => !item.checked);
    LocalStore.saveGroceries(updated);
    setItems(updated);
    toast.success("Articles completats eliminats!");
  };

  const handleSyncFromMealPlan = () => {
    const currentPlan = LocalStore.getMealPlan();
    const currentPantry = LocalStore.getPantry();
    const generated = generateGroceriesFromPlan(currentPlan, currentPantry);
    LocalStore.saveGroceries(generated);
    setItems(generated);
    toast.success("Llista de la compra recarregada des del menú setmanal!");
  };

  const handleAddItem = (newItem: GroceryItem) => {
    const updated = [newItem, ...items];
    LocalStore.saveGroceries(updated);
    setItems(updated);
    toast.success(`Afegit: ${newItem.name}`);
  };

  return (
    <div className="space-y-6">
      <GroceryListView
        items={items}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        onClearCompleted={handleClearCompleted}
        onSyncFromMealPlan={handleSyncFromMealPlan}
        onOpenAddItemModal={() => setIsAddOpen(true)}
        onOpenShareModal={() => setIsShareOpen(true)}
      />

      <AddGroceryItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddItem={handleAddItem}
      />

      <ShareGroceryModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        items={items}
      />
    </div>
  );
}
