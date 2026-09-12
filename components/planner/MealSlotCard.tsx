"use client";

import React from "react";
import { MealSlot, Recipe } from "@/types";
import { formatMealTypeName, triggerConfetti } from "@/lib/utils";
import { Clock, Flame, Sparkles, RefreshCw, CheckCircle2, Utensils } from "lucide-react";
import { toast } from "sonner";

interface MealSlotCardProps {
  slot: MealSlot;
  onSelectRecipe: (recipe: Recipe) => void;
  onSwapMeal: (slotId: string) => void;
  onToggleCompleted: (slotId: string) => void;
  onRegenerateWithAI: (slotId: string) => void;
  isRegenerating?: boolean;
}

export const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slot,
  onSelectRecipe,
  onSwapMeal,
  onToggleCompleted,
  onRegenerateWithAI,
  isRegenerating,
}) => {
  const recipe = slot.recipe;
  const isDone = !!slot.isCompleted;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompleted(slot.id);
    if (!isDone) {
      triggerConfetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
      });
      toast.success(`Àpat completat! Molt bona feina.`);
    }
  };

  const mealIcons: Record<string, string> = {
    breakfast: "🥐",
    lunch: "🥗",
    dinner: "🍲",
    snack: "🍎",
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDone
          ? "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-75"
          : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{slot.mealType === "breakfast" ? "💡" : mealIcons[slot.mealType] || "🍽️"}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            {slot.mealType === "breakfast" ? "Idea Esmorzar" : formatMealTypeName(slot.mealType)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggle}
            title={isDone ? "Marca com a pendent" : "Marca com a menjat"}
            className={`p-1 rounded-lg transition-colors ${
              isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isDone ? "fill-emerald-100 dark:fill-emerald-900" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      {recipe ? (
        <div
          onClick={() => onSelectRecipe(recipe)}
          className="p-3.5 cursor-pointer flex flex-col justify-between min-h-[140px]"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4
                className={`text-sm font-semibold leading-snug line-clamp-2 transition-colors ${
                  isDone
                    ? "line-through text-zinc-400 dark:text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                }`}
              >
                {recipe.title}
              </h4>
            </div>

            {recipe.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Recipe Meta Info */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Flame className="w-3.5 h-3.5" />
                {recipe.calories} kcal
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onRegenerateWithAI(slot.id)}
                disabled={isRegenerating}
                title="Regenera aquest àpat amb IA"
                className="p-1 rounded-md text-zinc-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin text-primary-600" : ""}`} />
              </button>
              <button
                onClick={() => onSwapMeal(slot.id)}
                title="Tria del receptari"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Slot State */
        <div className="p-6 text-center flex flex-col items-center justify-center min-h-[140px]">
          <Utensils className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-400 mb-3">Cap àpat planificat</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRegenerateWithAI(slot.id)}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-950/50 px-2.5 py-1 rounded-lg transition"
            >
              <Sparkles className="w-3 h-3" />
              Suggereix IA
            </button>
            <button
              onClick={() => onSwapMeal(slot.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg transition"
            >
              Tria
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
