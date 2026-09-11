"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Recipe, MealSlot } from "@/types";
import { Search, Sparkles, Clock, Flame } from "lucide-react";
import { formatDayName, formatMealTypeName } from "@/lib/utils";
import { toast } from "sonner";

interface SwapMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MealSlot | null;
  recipes: Recipe[];
  onSelectRecipe: (slotId: string, recipe: Recipe) => void;
}

export const SwapMealModal: React.FC<SwapMealModalProps> = ({
  isOpen,
  onClose,
  slot,
  recipes,
  onSelectRecipe,
}) => {
  const [search, setSearch] = useState("");
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);

  if (!slot) return null;

  const filtered = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAiSuggest = async () => {
    setIsSuggestingAI(true);
    try {
      const res = await fetch("/api/ai/suggest-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: slot.mealType,
          day: slot.day,
          notes: "Alguna cosa fresca, equilibrada i deliciosa en català",
        }),
      });
      const data = await res.json();
      if (data.success && data.recipe) {
        onSelectRecipe(slot.id, data.recipe);
        toast.success(`Àpat actualitzat amb: ${data.recipe.title}`);
        onClose();
      } else {
        toast.error("No s'ha pogut generar un suggeriment.");
      }
    } catch {
      toast.error("Error de connexió.");
    } finally {
      setIsSuggestingAI(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Canvia àpat: ${formatMealTypeName(slot.mealType)} (${formatDayName(slot.day)})`}
      description="Tria una recepta del catàleg o demana una alternativa a la intel·ligència artificial."
      maxWidth="xl"
    >
      <div className="space-y-4 pt-1">
        {/* Top Search & AI button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Cerca recepta o ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAiSuggest}
            isLoading={isSuggestingAI}
            className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Suggereix amb IA
          </Button>
        </div>

        {/* Recipes List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-8">Cap recepta trobada amb aquest nom.</p>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  onSelectRecipe(slot.id, r);
                  toast.success(`Assignat: ${r.title}`);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 hover:border-primary-400 cursor-pointer transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.title} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-lg">
                      🍲
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{r.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Flame className="w-3 h-3" /> {r.calories} kcal
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.prepTimeMinutes + r.cookTimeMinutes}m
                      </span>
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                  Tria
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
