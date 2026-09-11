"use client";

import React, { useState, useEffect } from "react";
import { PantryItem, Recipe } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { PantryManager } from "@/components/pantry/PantryManager";
import { AddPantryItemModal } from "@/components/pantry/AddPantryItemModal";
import { PantryRecipeSuggestionsModal } from "@/components/pantry/PantryRecipeSuggestionsModal";
import { CookingModeModal } from "@/components/recipes/CookingModeModal";
import { toast } from "sonner";

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const load = () => {
      setItems(LocalStore.getPantry());
    };
    load();

    window.addEventListener("menuplanik_pantry_changed", load);
    return () => window.removeEventListener("menuplanik_pantry_changed", load);
  }, []);

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    LocalStore.savePantry(updated);
    setItems(updated);
    toast.success("Ingredient eliminat del rebost");
  };

  const handleAddItem = (newItem: PantryItem) => {
    const updated = [newItem, ...items];
    LocalStore.savePantry(updated);
    setItems(updated);
    toast.success(`Afegit al rebost: ${newItem.name}`);
  };

  const handleCookWithPantry = async () => {
    if (items.length === 0) {
      toast.error("El teu rebost és buit! Afegeix primer algun ingredient.");
      return;
    }

    setIsGeneratingRecipes(true);
    try {
      const pantryNames = items.map((i) => i.name);
      const res = await fetch("/api/ai/pantry-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pantryItems: pantryNames,
          dietaryPreference: LocalStore.getPreferences().dietaryPreference,
        }),
      });

      const data = await res.json();
      if (data.success && data.recipes) {
        setSuggestedRecipes(data.recipes);
        setIsSuggestionsOpen(true);
      } else {
        toast.error("No s'han pogut trobar receptes per a aquests ingredients.");
      }
    } catch {
      toast.error("Error de connexió.");
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    LocalStore.addRecipe(recipe);
  };

  return (
    <div className="space-y-6">
      <PantryManager
        items={items}
        onDeleteItem={handleDeleteItem}
        onOpenAddItemModal={() => setIsAddOpen(true)}
        onCookWithPantry={handleCookWithPantry}
        isGeneratingRecipes={isGeneratingRecipes}
      />

      <AddPantryItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddItem={handleAddItem}
      />

      <PantryRecipeSuggestionsModal
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
        recipes={suggestedRecipes}
        onSaveRecipe={handleSaveRecipe}
        onCookRecipe={(recipe) => setCookingRecipe(recipe)}
      />

      <CookingModeModal
        recipe={cookingRecipe}
        isOpen={!!cookingRecipe}
        onClose={() => setCookingRecipe(null)}
      />
    </div>
  );
}
