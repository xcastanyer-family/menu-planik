"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Recipe, Ingredient } from "@/types";
import { Clock, Flame, Users, Check, Play, Globe, Pencil, Trash2, Plus, ArrowLeft, Lock } from "lucide-react";
import { LocalStore } from "@/lib/storage/local-store";
import { cn, getRecipeFoodInfo, getRecipeComplexity } from "@/lib/utils";
import { toast } from "sonner";

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onStartCooking?: (recipe: Recipe) => void;
  onRecipeUpdated?: (recipe: Recipe) => Promise<void> | void;
  onRecipeDeleted?: (recipeId: string) => Promise<void> | void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onStartCooking,
  onRecipeUpdated,
  onRecipeDeleted,
}) => {
  const [servings, setServings] = useState<number>(recipe?.servings || 2);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  const [session, setSession] = useState(LocalStore.getCurrentSession());
  useEffect(() => {
    const updateSession = () => setSession(LocalStore.getCurrentSession());
    window.addEventListener("menuplanik_session_changed", updateSession);
    return () => window.removeEventListener("menuplanik_session_changed", updateSession);
  }, []);

  const isSuperadmin = session?.role === "superadmin";
  const canModify = isSuperadmin || session?.role === "admin" || session?.canModify === true;

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editComplexity, setEditComplexity] = useState<"simple" | "complex">("simple");
  const [editPrepTime, setEditPrepTime] = useState(10);
  const [editCookTime, setEditCookTime] = useState(15);
  const [editServings, setEditServings] = useState(2);
  const [editCalories, setEditCalories] = useState(450);
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editInstructionsText, setEditInstructionsText] = useState("");

  // Initialize or reset edit state whenever recipe changes or modal opens
  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings || 2);
      setEditTitle(recipe.title || "");
      setEditDescription(recipe.description || "");
      setEditComplexity(recipe.complexity || getRecipeComplexity(recipe));
      setEditPrepTime(recipe.prepTimeMinutes || 10);
      setEditCookTime(recipe.cookTimeMinutes || 15);
      setEditServings(recipe.servings || 2);
      setEditCalories(recipe.calories || 450);
      setEditIngredients(recipe.ingredients ? [...recipe.ingredients] : []);
      setEditInstructionsText((recipe.instructions || []).join("\n"));
    }
    setIsEditing(false);
    setCheckedIngredients({});
  }, [recipe, isOpen]);

  if (!recipe) return null;

  const originalServings = recipe.servings || 1;
  const ratio = servings / originalServings;

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCurrentlyPublic = Boolean(recipe?.isPublic || recipe?.moderationStatus === "approved_public");

  const handleTogglePublic = async () => {
    if (!recipe) return;

    if (isCurrentlyPublic) {
      LocalStore.unpublishRecipe(recipe.id);
      try {
        await fetch("/api/recipes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe: { ...recipe, moderationStatus: "private", isPublic: false },
          }),
        });
      } catch (e) {
        console.error(e);
      }
      const updated: Recipe = { ...recipe, moderationStatus: "private", isPublic: false };
      if (onRecipeUpdated) onRecipeUpdated(updated);
      toast.info(`"${recipe.title}" s'ha marcat com a recepta privada.`);
      onClose();
    } else {
      LocalStore.publishRecipeDirectly(recipe.id);
      try {
        await fetch("/api/recipes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe: { ...recipe, moderationStatus: "approved_public", isPublic: true },
          }),
        });
      } catch (e) {
        console.error(e);
      }
      const updated: Recipe = { ...recipe, moderationStatus: "approved_public", isPublic: true };
      if (onRecipeUpdated) onRecipeUpdated(updated);
      toast.success(`"${recipe.title}" s'ha publicat directament al catàleg públic!`);
      onClose();
    }
  };

  const handleAddIngredient = () => {
    setEditIngredients((prev) => [
      ...prev,
      { id: Math.random().toString(), name: "", amount: 100, unit: "g", category: "produce" },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    setEditIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error("Introdueix un títol");
      return;
    }

    const steps = editInstructionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const validIngredients = editIngredients.filter((ing) => ing.name.trim() !== "");

    const updatedRecipe: Recipe = {
      ...recipe,
      title: editTitle.trim(),
      description: editDescription.trim(),
      complexity: editComplexity,
      prepTimeMinutes: Number(editPrepTime) || 10,
      cookTimeMinutes: Number(editCookTime) || 15,
      servings: Number(editServings) || 2,
      calories: Number(editCalories) || 450,
      nutrition: {
        calories: Number(editCalories) || 450,
        protein: Math.round((Number(editCalories) || 450) * 0.05),
        carbs: Math.round((Number(editCalories) || 450) * 0.1),
        fat: Math.round((Number(editCalories) || 450) * 0.04),
      },
      ingredients: validIngredients.length > 0 ? validIngredients : recipe.ingredients,
      instructions: steps.length > 0 ? steps : recipe.instructions,
    };

    if (!canModify) {
      toast.error("No disposes de permisos per modificar receptes.");
      return;
    }

    setIsSaving(true);
    try {
      if (onRecipeUpdated) {
        await onRecipeUpdated(updatedRecipe);
      }
      toast.success("Recepta modificada correctament!");
      setIsEditing(false);
    } catch {
      toast.error("Error al modificar la recepta.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isSuperadmin) {
      toast.error("Només el Superadministrador pot eliminar receptes.");
      return;
    }

    if (!confirm(`Segur que vols eliminar la recepta "${recipe.title}"? Aquesta acció no es pot desfer.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      if (onRecipeDeleted) {
        await onRecipeDeleted(recipe.id);
      }
      toast.success("Recepta eliminada!");
      onClose();
    } catch {
      toast.error("Error al eliminar la recepta.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary-600" />
              Edita la Recepta
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Torna enrere
            </Button>
          </div>

          <Input
            label="Títol de la Recepta *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <Textarea
            label="Descripció"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={2}
          />

          <div>
            <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Complexitat de la Recepta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditComplexity("simple")}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition",
                  editComplexity === "simple"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                )}
              >
                🟢 Senzilla (dia a dia, ràpida)
              </button>
              <button
                type="button"
                onClick={() => setEditComplexity("complex")}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition",
                  editComplexity === "complex"
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-300 shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                )}
              >
                🟣 Complexa (elaborada)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Prep (min)"
              type="number"
              value={editPrepTime}
              onChange={(e) => setEditPrepTime(Number(e.target.value))}
            />
            <Input
              label="Cocció (min)"
              type="number"
              value={editCookTime}
              onChange={(e) => setEditCookTime(Number(e.target.value))}
            />
            <Input
              label="Racions"
              type="number"
              value={editServings}
              onChange={(e) => setEditServings(Number(e.target.value))}
            />
            <Input
              label="Calories (kcal)"
              type="number"
              value={editCalories}
              onChange={(e) => setEditCalories(Number(e.target.value))}
            />
          </div>

          {/* Ingredients list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Ingredients
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddIngredient}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Afegeix Ingredient
              </Button>
            </div>

            {editIngredients.map((ing, i) => (
              <div key={ing.id || i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nom ingredient"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(i, "name", e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Qtat"
                  value={ing.amount}
                  onChange={(e) => handleIngredientChange(i, "amount", Number(e.target.value))}
                  className="w-20 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Unitat"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(i, "unit", e.target.value)}
                  className="w-16 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(i)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <Textarea
            label="Instruccions de preparació (una línia per a cada pas)"
            value={editInstructionsText}
            onChange={(e) => setEditInstructionsText(e.target.value)}
            rows={5}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel·la
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Desa Canvis
            </Button>
          </div>
        </form>
      ) : (
        /* Normal View */
        <div className="space-y-6">
          {/* Recipe Banner & Title */}
          <div className="space-y-3">
            {(() => {
              const foodInfo = getRecipeFoodInfo(recipe);
              const complexity = getRecipeComplexity(recipe);
              return (
                <div className={`relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden ${foodInfo.bgLight} ${foodInfo.bgDark} flex flex-col items-center justify-center border border-zinc-200/60 dark:border-zinc-800`}>
                  <div className="text-6xl sm:text-7xl select-none transform hover:scale-110 transition-transform duration-200">
                    {foodInfo.icon}
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-xs ${foodInfo.badgeClass}`}>
                      {foodInfo.label}
                    </span>
                    {complexity === "complex" ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 rounded-lg border border-purple-300/50 shadow-xs">
                        🟣 Cuina Puntual
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-lg border border-emerald-300/50 shadow-xs">
                        🟢 Menú (BD)
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-lg text-zinc-700 dark:text-zinc-200 shadow-xs">
                      {recipe.source === "ai" ? "✨ Creat amb IA" : "Selecció del Xef"}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1 text-amber-700 dark:text-amber-400 shadow-xs">
                      <Flame className="w-3.5 h-3.5" />
                      {Math.round(recipe.calories * ratio)} kcal / ració
                    </span>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isCurrentlyPublic ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                    🌐 Catàleg Públic Global
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-full">
                    🔒 Recepta Privada de la Família
                  </span>
                )}
                {recipe.authorName && (
                  <span className="text-xs text-zinc-400">
                    per <strong>{recipe.authorName}</strong>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {recipe.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {recipe.description}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
              <div>
                <span className="text-[11px] text-zinc-400 block">Temps Total</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary-600" />
                  {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Preparació</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {recipe.prepTimeMinutes} min
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Cocció</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {recipe.cookTimeMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Nutritional Macros Breakdown */}
          {recipe.nutrition && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Valors Nutricionals per ració
              </h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/40 text-center">
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 block">Calories</span>
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{recipe.nutrition.calories} kcal</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/40 text-center">
                  <span className="text-[10px] font-medium text-sky-700 dark:text-sky-300 block">Proteïnes</span>
                  <span className="text-sm font-bold text-sky-900 dark:text-sky-100">{recipe.nutrition.protein}g</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/40 text-center">
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 block">Carbohidrats</span>
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{recipe.nutrition.carbs}g</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/40 text-center">
                  <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300 block">Greixos</span>
                  <span className="text-sm font-bold text-rose-900 dark:text-rose-100">{recipe.nutrition.fat}g</span>
                </div>
              </div>
            </div>
          )}

          {/* Servings Adjuster */}
          <div className="flex items-center justify-between py-2 px-3 bg-zinc-100/70 dark:bg-zinc-800/70 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Users className="w-4 h-4 text-zinc-500" />
              <span>Racions desitjades:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
              >
                -
              </button>
              <span className="w-6 text-center font-bold text-zinc-900 dark:text-white">{servings}</span>
              <button
                onClick={() => setServings(servings + 1)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Ingredients Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Ingredients ({recipe.ingredients.length})
            </h4>
            <div className="space-y-2">
              {recipe.ingredients.map((ing) => {
                const adjustedAmount = Math.round(ing.amount * ratio * 10) / 10;
                const isChecked = !!checkedIngredients[ing.id];
                return (
                  <div
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60 line-through"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-primary-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        {ing.name}
                        {ing.productId && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 rounded border border-emerald-300 dark:border-emerald-800">
                            ✓ BD
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {adjustedAmount} {ing.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Instruccions de preparació
            </h4>
            <div className="space-y-3">
              {recipe.instructions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
            {onStartCooking && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onStartCooking(recipe);
                }}
                className="w-full sm:order-last sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white justify-center font-semibold shadow-sm text-xs"
              >
                <Play className="w-4 h-4 fill-white mr-1.5" />
                Inicia Mode Cuina
              </Button>
            )}

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs justify-center">
                Tanca
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTogglePublic}
                className={cn(
                  "text-xs transition justify-center",
                  isCurrentlyPublic
                    ? "text-zinc-600 hover:bg-zinc-100 border-zinc-200 dark:text-zinc-300 dark:border-zinc-700"
                    : "text-emerald-600 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
                )}
              >
                {isCurrentlyPublic ? (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    <span>Privada</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 mr-1" />
                    <span>Publica</span>
                  </>
                )}
              </Button>

              {onRecipeUpdated && canModify && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 justify-center"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  <span>Edita</span>
                </Button>
              )}

              {onRecipeDeleted && isSuperadmin && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 justify-center"
                  title="Elimina (Exclusiu Superadmin)"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Elimina</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
