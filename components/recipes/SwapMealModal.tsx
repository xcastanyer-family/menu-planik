"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Recipe, MealSlot, DayOfWeek } from "@/types";
import { Search, Sparkles, Clock, Flame, ArrowUpDown } from "lucide-react";
import { formatDayName, formatMealTypeName, getRecipeFoodInfo, getRecipeComplexity } from "@/lib/utils";
import { LocalStore } from "@/lib/storage/local-store";
import { toast } from "sonner";

interface SwapMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MealSlot | null;
  recipes: Recipe[];
  onSelectRecipe: (slotId: string, recipe: Recipe) => void;
  oppositeSlot?: MealSlot | null;
  onSwapLunchDinner?: (day: DayOfWeek) => void;
}

export const SwapMealModal: React.FC<SwapMealModalProps> = ({
  isOpen,
  onClose,
  slot,
  recipes,
  onSelectRecipe,
  oppositeSlot,
  onSwapLunchDinner,
}) => {
  const [search, setSearch] = useState("");
  const [complexityFilter, setComplexityFilter] = useState<"simple" | "complex" | "all">("simple");
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);

  if (!slot) return null;

  const simpleCount = recipes.filter((r) => getRecipeComplexity(r) === "simple").length;
  const complexCount = recipes.filter((r) => getRecipeComplexity(r) === "complex").length;

  const filtered = recipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (complexityFilter === "simple") return getRecipeComplexity(r) === "simple";
    if (complexityFilter === "complex") return getRecipeComplexity(r) === "complex";
    return true;
  });

  const handleAiSuggest = async () => {
    setIsSuggestingAI(true);
    try {
      const userPrefs = typeof window !== "undefined" ? LocalStore.getPreferences() : null;
      const res = await fetch("/api/ai/suggest-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: slot.mealType,
          day: slot.day,
          notes: "Alguna cosa fresca, equilibrada i deliciosa en català",
          customApiKey: userPrefs?.geminiApiKey,
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
      description="Tria una recepta del menú setmanal (basada en productes BD) o una recepta puntual complexa."
      maxWidth="xl"
    >
      <div className="space-y-3.5 pt-1">
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
            className="w-full sm:w-auto justify-center bg-gradient-to-r from-primary-600 to-emerald-600 text-white shrink-0 font-semibold"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Suggereix amb IA
          </Button>
        </div>

        {/* Complexity Selector Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl">
          <button
            type="button"
            onClick={() => setComplexityFilter("simple")}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
              complexityFilter === "simple"
                ? "bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            🟢 Receptes del Menú ({simpleCount})
          </button>
          <button
            type="button"
            onClick={() => setComplexityFilter("complex")}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
              complexityFilter === "complex"
                ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            🟣 Receptes Complexes ({complexCount})
          </button>
          <button
            type="button"
            onClick={() => setComplexityFilter("all")}
            className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg transition ${
              complexityFilter === "all"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Totes ({recipes.length})
          </button>
        </div>

        {/* Quick direct swap with opposite meal (Lunch <-> Dinner) */}
        {(slot.mealType === "lunch" || slot.mealType === "dinner") && oppositeSlot && onSwapLunchDinner && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Intercanvi directe amb el {formatMealTypeName(oppositeSlot.mealType)}
              </span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {oppositeSlot.recipe ? oppositeSlot.recipe.title : "Cap plat assignat"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onSwapLunchDinner(slot.day);
                onClose();
              }}
              className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              Intercanvia Dinar ⇄ Sopar
            </Button>
          </div>
        )}

        {/* Recipes List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-8">Cap recepta trobada.</p>
          ) : (
            filtered.map((r) => {
              const foodInfo = getRecipeFoodInfo(r);
              const complexity = getRecipeComplexity(r);
              return (
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
                    <div className={`w-12 h-12 rounded-xl ${foodInfo.bgLight} ${foodInfo.bgDark} flex items-center justify-center text-2xl shrink-0 border border-zinc-200/50 dark:border-zinc-700/50`}>
                      {foodInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${foodInfo.badgeClass}`}>
                          {foodInfo.label}
                        </span>
                        {complexity === "complex" ? (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 rounded border border-purple-300/40">
                            🟣 Complexa
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded border border-emerald-300/40">
                            🟢 Senzilla
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {r.title}
                      </h4>
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

                  <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 shrink-0">
                    Sustitueix
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
