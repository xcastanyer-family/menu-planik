import React from "react";
import { MealSlot } from "@/types";
import { Flame } from "lucide-react";

interface DayNutritionSummaryProps {
  slots: MealSlot[];
  targetCalories?: number;
}

export const DayNutritionSummary: React.FC<DayNutritionSummaryProps> = ({
  slots,
  targetCalories = 2000,
}) => {
  const totals = slots.reduce(
    (acc, slot) => {
      if (slot.recipe) {
        acc.calories += slot.recipe.calories || 0;
        acc.protein += slot.recipe.nutrition?.protein || 0;
        acc.carbs += slot.recipe.nutrition?.carbs || 0;
        acc.fat += slot.recipe.nutrition?.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calPercentage = Math.min(Math.round((totals.calories / targetCalories) * 100), 100);

  return (
    <div className="bg-zinc-50/80 dark:bg-zinc-800/40 rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>{totals.calories}</span>
          <span className="text-zinc-400 font-normal">/ {targetCalories} kcal</span>
        </div>
        <span className="text-[11px] font-medium text-zinc-500">{calPercentage}% objectiu</span>
      </div>

      {/* Mini Progress Bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            totals.calories > targetCalories * 1.1
              ? "bg-amber-500"
              : totals.calories >= targetCalories * 0.85
              ? "bg-emerald-500"
              : "bg-primary-500"
          }`}
          style={{ width: `${calPercentage}%` }}
        />
      </div>

      {/* Macro Pills */}
      <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-center">
        <div className="bg-white dark:bg-zinc-800/80 rounded-md py-1 px-1.5 border border-zinc-100 dark:border-zinc-700/50">
          <span className="text-zinc-400 block text-[10px]">Prot</span>
          <span className="font-semibold text-sky-600 dark:text-sky-400">{totals.protein}g</span>
        </div>
        <div className="bg-white dark:bg-zinc-800/80 rounded-md py-1 px-1.5 border border-zinc-100 dark:border-zinc-700/50">
          <span className="text-zinc-400 block text-[10px]">Carb</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">{totals.carbs}g</span>
        </div>
        <div className="bg-white dark:bg-zinc-800/80 rounded-md py-1 px-1.5 border border-zinc-100 dark:border-zinc-700/50">
          <span className="text-zinc-400 block text-[10px]">Greixos</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">{totals.fat}g</span>
        </div>
      </div>
    </div>
  );
};
