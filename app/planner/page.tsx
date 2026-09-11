"use client";

import React, { useState, useEffect } from "react";
import {
  WeeklyMealPlan,
  Recipe,
  DayOfWeek,
  MealSlot,
} from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { SupabaseRecipeService } from "@/lib/supabase/recipes";
import { generateGroceriesFromPlan } from "@/lib/storage/mock-data";
import { formatDayName, formatMealTypeName } from "@/lib/utils";
import { MealSlotCard } from "@/components/planner/MealSlotCard";
import { DayNutritionSummary } from "@/components/planner/DayNutritionSummary";
import { GeneratePlanModal } from "@/components/planner/GeneratePlanModal";
import { SwapMealModal } from "@/components/recipes/SwapMealModal";
import { RecipeDetailModal } from "@/components/recipes/RecipeDetailModal";
import { CookingModeModal } from "@/components/recipes/CookingModeModal";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  ShoppingCart,
  Printer,
  ChevronLeft,
  ChevronRight,
  Flame,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const DAYS_LIST: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function PlannerPage() {
  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState<string | null>(null);

  useEffect(() => {
    setMealPlan(LocalStore.getMealPlan());
    setRecipes(LocalStore.getRecipes());

    // Async sync with Supabase
    SupabaseRecipeService.getRecipes().then((res) => {
      if (res && res.length > 0) setRecipes(res);
    });

    const handlePlanChanged = () => setMealPlan(LocalStore.getMealPlan());
    const handleRecipesChanged = () => setRecipes(LocalStore.getRecipes());

    window.addEventListener("menuplanik_mealplan_changed", handlePlanChanged);
    window.addEventListener("menuplanik_recipes_changed", handleRecipesChanged);

    return () => {
      window.removeEventListener("menuplanik_mealplan_changed", handlePlanChanged);
      window.removeEventListener("menuplanik_recipes_changed", handleRecipesChanged);
    };
  }, []);

  const handleUpdateSlot = (slotId: string, recipe: Recipe) => {
    if (!mealPlan) return;
    const updatedSlots = mealPlan.slots.map((s) =>
      s.id === slotId ? { ...s, recipeId: recipe.id, recipe: recipe } : s
    );
    const updatedPlan = { ...mealPlan, slots: updatedSlots, updatedAt: new Date().toISOString() };
    LocalStore.saveMealPlan(updatedPlan);
    setMealPlan(updatedPlan);

    // Also update groceries
    const updatedGroceries = generateGroceriesFromPlan(updatedPlan, LocalStore.getPantry());
    LocalStore.saveGroceries(updatedGroceries);
  };

  const handleToggleCompleted = (slotId: string) => {
    if (!mealPlan) return;
    const updatedSlots = mealPlan.slots.map((s) =>
      s.id === slotId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    const updatedPlan = { ...mealPlan, slots: updatedSlots, updatedAt: new Date().toISOString() };
    LocalStore.saveMealPlan(updatedPlan);
    setMealPlan(updatedPlan);
  };

  const handleRegenerateSlotWithAI = async (slotId: string) => {
    if (!mealPlan) return;
    const targetSlot = mealPlan.slots.find((s) => s.id === slotId);
    if (!targetSlot) return;

    setRegeneratingSlotId(slotId);
    try {
      const res = await fetch("/api/ai/suggest-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: targetSlot.mealType,
          day: targetSlot.day,
          dietaryPreference: mealPlan.dietaryPreference || "mediterranean",
        }),
      });
      const data = await res.json();
      if (data.success && data.recipe) {
        handleUpdateSlot(slotId, data.recipe);
        toast.success(`Nova opció per a ${formatMealTypeName(targetSlot.mealType)}: ${data.recipe.title}!`);
      } else {
        toast.error("Error en la regeneració de l'àpat.");
      }
    } catch {
      toast.error("Error de connexió.");
    } finally {
      setRegeneratingSlotId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSyncGroceries = () => {
    if (!mealPlan) return;
    const grocs = generateGroceriesFromPlan(mealPlan, LocalStore.getPantry());
    LocalStore.saveGroceries(grocs);
    toast.success("Llista de la compra sincronitzada amb èxit a partir del menú!");
  };

  if (!mealPlan) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              {mealPlan.title}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-zinc-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              {mealPlan.householdSize} Racions per àpat
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Objectiu: ~{mealPlan.targetDailyCalories || 2000} kcal/dia
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <Button
            variant="primary"
            onClick={() => setIsGenerateOpen(true)}
            className="bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            Regenera Setmana amb IA
          </Button>

          <Button variant="outline" size="sm" onClick={handleSyncGroceries} title="Sincronitza llista de la compra">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Actualitza Compra</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} title="Imprimeix o desa en PDF">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimeix</span>
          </Button>
        </div>
      </div>

      {/* Mobile Day Selector Tabs */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-1">
        {DAYS_LIST.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {formatDayName(day)}
            </button>
          );
        })}
      </div>

      {/* Desktop 7-Columns Grid */}
      <div className="hidden lg:grid lg:grid-cols-7 gap-3.5 items-start">
        {DAYS_LIST.map((day) => {
          const daySlots = mealPlan.slots.filter((s) => s.day === day);
          return (
            <div key={day} className="space-y-3">
              {/* Day Column Header */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-200/80 dark:border-zinc-800 text-center shadow-sm">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  {formatDayName(day)}
                </h3>
              </div>

              {/* Day Slots */}
              <div className="space-y-2.5">
                {daySlots.map((slot) => (
                  <MealSlotCard
                    key={slot.id}
                    slot={slot}
                    onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
                    onSwapMeal={() => setSwapSlot(slot)}
                    onToggleCompleted={handleToggleCompleted}
                    onRegenerateWithAI={handleRegenerateSlotWithAI}
                    isRegenerating={regeneratingSlotId === slot.id}
                  />
                ))}
              </div>

              {/* Day Nutritional Summary */}
              <DayNutritionSummary slots={daySlots} targetCalories={mealPlan.targetDailyCalories} />
            </div>
          );
        })}
      </div>

      {/* Mobile Single Day View */}
      <div className="lg:hidden space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {formatDayName(selectedDay)}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const idx = DAYS_LIST.indexOf(selectedDay);
                  setSelectedDay(DAYS_LIST[(idx - 1 + 7) % 7]);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const idx = DAYS_LIST.indexOf(selectedDay);
                  setSelectedDay(DAYS_LIST[(idx + 1) % 7]);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {mealPlan.slots
              .filter((s) => s.day === selectedDay)
              .map((slot) => (
                <MealSlotCard
                  key={slot.id}
                  slot={slot}
                  onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
                  onSwapMeal={() => setSwapSlot(slot)}
                  onToggleCompleted={handleToggleCompleted}
                  onRegenerateWithAI={handleRegenerateSlotWithAI}
                  isRegenerating={regeneratingSlotId === slot.id}
                />
              ))}
          </div>

          <DayNutritionSummary
            slots={mealPlan.slots.filter((s) => s.day === selectedDay)}
            targetCalories={mealPlan.targetDailyCalories}
          />
        </div>
      </div>

      {/* Modals */}
      <GeneratePlanModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        currentPreferences={LocalStore.getPreferences()}
        onPlanGenerated={(newPlan) => {
          LocalStore.saveMealPlan(newPlan);
          setMealPlan(newPlan);
          const newGroceries = generateGroceriesFromPlan(newPlan, LocalStore.getPantry());
          LocalStore.saveGroceries(newGroceries);
        }}
      />

      <SwapMealModal
        isOpen={!!swapSlot}
        onClose={() => setSwapSlot(null)}
        slot={swapSlot}
        recipes={recipes}
        onSelectRecipe={handleUpdateSlot}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onStartCooking={(recipe) => {
          setSelectedRecipe(null);
          setCookingRecipe(recipe);
        }}
      />

      <CookingModeModal
        recipe={cookingRecipe}
        isOpen={!!cookingRecipe}
        onClose={() => setCookingRecipe(null)}
      />
    </div>
  );
}
