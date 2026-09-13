"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GroceryItem, PublishedShoppingList } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { generateGroceriesFromPlan } from "@/lib/storage/mock-data";
import { SupabaseProductService } from "@/lib/supabase/products";
import { GroceryListView } from "@/components/groceries/GroceryListView";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { AddMultipleGroceriesModal } from "@/components/groceries/AddMultipleGroceriesModal";
import { ShareGroceryModal } from "@/components/groceries/ShareGroceryModal";
import { toast } from "sonner";

export default function GroceriesPage() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [publishedList, setPublishedList] = useState<PublishedShoppingList | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMultiAddOpen, setIsMultiAddOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(LocalStore.getGroceries());
      setPublishedList(LocalStore.getPublishedShoppingList());
    };
    load();

    window.addEventListener("menuplanik_groceries_changed", load);
    window.addEventListener("menuplanik_published_groceries_changed", load);
    return () => {
      window.removeEventListener("menuplanik_groceries_changed", load);
      window.removeEventListener("menuplanik_published_groceries_changed", load);
    };
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

  const handleSyncFromMealPlan = async () => {
    const currentPlan = LocalStore.getMealPlan();
    const currentPantry = LocalStore.getPantry();
    const { products } = await SupabaseProductService.getProducts();
    const generated = generateGroceriesFromPlan(currentPlan, currentPantry, products);
    LocalStore.saveGroceries(generated);
    setItems(generated);
    toast.success("Llista de la compra vinculada amb els productes de la base de dades!");
  };

  const handleAddItem = (newItem: GroceryItem) => {
    const updated = [newItem, ...items];
    LocalStore.saveGroceries(updated);
    setItems(updated);
    toast.success(`Afegit: ${newItem.name}`);
  };

  const handleApplyMultipleItems = (updated: GroceryItem[]) => {
    LocalStore.saveGroceries(updated);
    setItems(updated);
  };

  const handlePublishList = () => {
    if (items.length === 0) {
      toast.error("La llista està buida. Afegeix productes o importa'ls del menú abans de publicar.");
      return;
    }
    const published = LocalStore.publishShoppingList(items);
    setPublishedList(published);
    toast.success("Llista de la compra publicada amb èxit! Ja la tens disponible a 'Compra'.", {
      action: {
        label: "Ves a Compra",
        onClick: () => router.push("/compra"),
      },
    });
  };

  return (
    <div className="space-y-6">
      <GroceryListView
        items={items}
        publishedList={publishedList}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        onClearCompleted={handleClearCompleted}
        onSyncFromMealPlan={handleSyncFromMealPlan}
        onPublishList={handlePublishList}
        onOpenAddItemModal={() => setIsAddOpen(true)}
        onOpenMultiAddModal={() => setIsMultiAddOpen(true)}
        onOpenShareModal={() => setIsShareOpen(true)}
      />

      <AddMultipleGroceriesModal
        isOpen={isMultiAddOpen}
        onClose={() => setIsMultiAddOpen(false)}
        currentItems={items}
        onApplyItems={handleApplyMultipleItems}
        onOpenCreateProduct={() => setIsAddOpen(true)}
      />

      <AddGroceryItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddItem={handleAddItem}
        onOpenMultiAdd={() => {
          setIsAddOpen(false);
          setIsMultiAddOpen(true);
        }}
      />

      <ShareGroceryModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        items={items}
      />
    </div>
  );
}
