"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Lightbulb,
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
  const [expandedBreakfastDays, setExpandedBreakfastDays] = useState<Record<string, boolean>>({});

  const toggleBreakfastDay = (day: string) => {
    setExpandedBreakfastDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const allBreakfastExpanded = DAYS_LIST.every((d) => !!expandedBreakfastDays[d]);

  const toggleAllBreakfast = () => {
    const nextVal = !allBreakfastExpanded;
    const updated: Record<string, boolean> = {};
    DAYS_LIST.forEach((d) => {
      updated[d] = nextVal;
    });
    setExpandedBreakfastDays(updated);
  };

  // Mobile swipe gestures & active tab auto-scroll
  const activeDayTabRef = useRef<HTMLButtonElement>(null);
  const touchStartCoords = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeAnimation, setSwipeAnimation] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (activeDayTabRef.current) {
      activeDayTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDay]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartCoords.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartCoords.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartCoords.current.x;
    const deltaY = touch.clientY - touchStartCoords.current.y;
    const elapsed = Date.now() - touchStartCoords.current.time;
    touchStartCoords.current = null;

    // Detect horizontal swipe (horizontal distance must dominate vertical distance)
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const isFastEnough = elapsed < 650;
    const isLongEnough = Math.abs(deltaX) > 40;

    if (isHorizontal && isLongEnough && isFastEnough) {
      const currentIndex = DAYS_LIST.indexOf(selectedDay);
      if (deltaX < 0) {
        // Swiped left (dragged leftwards) -> go to next day
        setSwipeAnimation("left");
        const nextDay = DAYS_LIST[(currentIndex + 1) % 7];
        setSelectedDay(nextDay);
      } else {
        // Swiped right (dragged rightwards) -> go to previous day
        setSwipeAnimation("right");
        const prevDay = DAYS_LIST[(currentIndex - 1 + 7) % 7];
        setSelectedDay(prevDay);
      }
    }
  };

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
            variant="outline"
            size="sm"
            onClick={toggleAllBreakfast}
            title={allBreakfastExpanded ? "Amaga idees d'esmorzar" : "Mostra idees d'esmorzar"}
            className="border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70"
          >
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">
              {allBreakfastExpanded ? "Amaga Esmorzars" : "Idees Esmorzar"}
            </span>
          </Button>

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
              ref={isSelected ? activeDayTabRef : undefined}
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
                {/* Main Meals: Dinar & Sopar (Comida i Sopar com a protagonistes) */}
                {daySlots
                  .filter((s) => s.mealType !== "breakfast")
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

                {/* Idea Esmorzar: Ocult/Plegat per defecte com a suggeriment del dia */}
                {(() => {
                  const bSlot = daySlots.find((s) => s.mealType === "breakfast");
                  if (!bSlot) return null;
                  const isExpanded = !!expandedBreakfastDays[day];

                  return (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleBreakfastDay(day)}
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:hover:bg-amber-900/35 border border-amber-200/60 dark:border-amber-800/40 text-left transition group text-xs"
                        title="Fes clic per veure o amagar la idea d'esmorzar"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-xs">💡</span>
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                              Idea Esmorzar
                            </span>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                              {bSlot.recipe?.title || "Suggeriment del dia"}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <MealSlotCard
                            slot={bSlot}
                            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
                            onSwapMeal={() => setSwapSlot(bSlot)}
                            onToggleCompleted={handleToggleCompleted}
                            onRegenerateWithAI={handleRegenerateSlotWithAI}
                            isRegenerating={regeneratingSlotId === bSlot.id}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Day Nutritional Summary */}
              <DayNutritionSummary slots={daySlots} targetCalories={mealPlan.targetDailyCalories} />
            </div>
          );
        })}
      </div>

      {/* Mobile Single Day View */}
      <div className="lg:hidden space-y-4">
        <div
          key={selectedDay}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-4 touch-pan-y select-none transition-all duration-200 ${
            swipeAnimation === "left"
              ? "animate-in slide-in-from-right-4 fade-in duration-200"
              : swipeAnimation === "right"
              ? "animate-in slide-in-from-left-4 fade-in duration-200"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {formatDayName(selectedDay)}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                👆 Llisca amb el dit per canviar de dia
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSwipeAnimation("right");
                  const idx = DAYS_LIST.indexOf(selectedDay);
                  setSelectedDay(DAYS_LIST[(idx - 1 + 7) % 7]);
                }}
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSwipeAnimation("left");
                  const idx = DAYS_LIST.indexOf(selectedDay);
                  setSelectedDay(DAYS_LIST[(idx + 1) % 7]);
                }}
                title="Dia següent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Main Meals: Dinar & Sopar */}
            {mealPlan.slots
              .filter((s) => s.day === selectedDay && s.mealType !== "breakfast")
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

            {/* Idea Esmorzar: Ocult/Plegat per defecte */}
            {(() => {
              const bSlot = mealPlan.slots.find(
                (s) => s.day === selectedDay && s.mealType === "breakfast"
              );
              if (!bSlot) return null;
              const isExpanded = !!expandedBreakfastDays[selectedDay];

              return (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleBreakfastDay(selectedDay)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:hover:bg-amber-900/35 border border-amber-200/60 dark:border-amber-800/40 text-left transition group text-xs"
                    title="Fes clic per veure o amagar la idea d'esmorzar"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm">💡</span>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                          Idea Esmorzar del dia
                        </span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                          {bSlot.recipe?.title || "Suggeriment del dia"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-amber-700 dark:text-amber-400 text-xs font-medium">
                      <span>{isExpanded ? "Amaga" : "Veure"}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <MealSlotCard
                        slot={bSlot}
                        onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
                        onSwapMeal={() => setSwapSlot(bSlot)}
                        onToggleCompleted={handleToggleCompleted}
                        onRegenerateWithAI={handleRegenerateSlotWithAI}
                        isRegenerating={regeneratingSlotId === bSlot.id}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
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
