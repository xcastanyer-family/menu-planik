"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Recipe, Ingredient, DietaryPreference } from "@/types";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: Recipe) => void;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  isOpen,
  onClose,
  onRecipeCreated,
}) => {
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestPublicModeration, setRequestPublicModeration] = useState(false);

  // Manual state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState(10);
  const [cookTime, setCookTime] = useState(15);
  const [servings, setServings] = useState(2);
  const [calories, setCalories] = useState(450);
  const [dietaryTag, setDietaryTag] = useState<DietaryPreference>("mediterranean");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: 100, unit: "g", category: "produce" },
  ]);
  const [instructionsText, setInstructionsText] = useState("");

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/suggest-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: "dinner",
          day: "monday",
          dietaryPreference: dietaryTag,
          notes: aiPrompt,
        }),
      });
      const data = await res.json();
      if (data.success && data.recipe) {
        const recipeToCreate: Recipe = {
          ...data.recipe,
          moderationStatus: requestPublicModeration ? "pending_review" : "private",
          isPublic: false,
        };
        onRecipeCreated(recipeToCreate);
        if (requestPublicModeration) {
          toast.info(`Nova recepta "${data.recipe.title}" creada i enviada a la cua de moderació del Superadministrador.`);
        } else {
          toast.success(`Nova recepta creada amb IA: ${data.recipe.title}!`);
        }
        onClose();
      } else {
        toast.error("Error durant la creació de la recepta.");
      }
    } catch {
      toast.error("Error de connexió.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: Math.random().toString(), name: "", amount: 100, unit: "g", category: "produce" },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Introdueix un títol per a la recepta");
      return;
    }

    const steps = instructionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const validIngredients = ingredients.filter((ing) => ing.name.trim() !== "");

    const newRecipe: Recipe = {
      id: `custom-rec-${Date.now()}`,
      title,
      description,
      prepTimeMinutes: Number(prepTime),
      cookTimeMinutes: Number(cookTime),
      servings: Number(servings),
      calories: Number(calories),
      nutrition: {
        calories: Number(calories),
        protein: Math.round(Number(calories) * 0.05),
        carbs: Math.round(Number(calories) * 0.1),
        fat: Math.round(Number(calories) * 0.04),
      },
      tags: ["Personalitzada"],
      dietaryTags: [dietaryTag],
      source: "custom",
      moderationStatus: requestPublicModeration ? "pending_review" : "private",
      isPublic: false,
      ingredients: validIngredients,
      instructions: steps.length > 0 ? steps : ["Preparar i cuinar segons preferència."],
    };

    onRecipeCreated(newRecipe);
    if (requestPublicModeration) {
      toast.info("Recepta desada i enviada a la cua de moderació del Superadministrador.");
    } else {
      toast.success("Recepta desada al teu receptari privat!");
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Afegeix Nova Recepta"
      description="Crea una recepta amb l'ajuda de la IA o insereix la teva recepta personalitzada."
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setTab("ai")}
            className={`flex items-center gap-2 pb-2.5 px-4 text-sm font-medium border-b-2 transition ${
              tab === "ai"
                ? "border-primary-600 text-primary-600 dark:text-primary-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Crea amb IA
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex items-center gap-2 pb-2.5 px-4 text-sm font-medium border-b-2 transition ${
              tab === "manual"
                ? "border-primary-600 text-primary-600 dark:text-primary-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            Insereix Manualment
          </button>
        </div>

        {tab === "ai" ? (
          <form onSubmit={handleAiGenerate} className="space-y-4">
            <Textarea
              label="Descriu què vols cuinar"
              placeholder="ex. 'Un risotto cremós de bolets i farigola per a 2 persones amb poc mantega', o 'Amanida rica amb cigrons cruixents i salsa tahina'..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
            />

            <Select
              label="Estil Alimentari / Dieta"
              value={dietaryTag}
              onChange={(e) => setDietaryTag(e.target.value as DietaryPreference)}
            >
              <option value="mediterranean">Mediterrània</option>
              <option value="vegetarian">Vegetariana</option>
              <option value="vegan">Vegana</option>
              <option value="pescatarian">Pescatariana</option>
              <option value="low-carb">Low Carb</option>
              <option value="keto">Cetogènica</option>
              <option value="gluten-free">Sense Gluten</option>
            </Select>

            {/* Public Moderation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requestPublicModeration}
                onChange={(e) => setRequestPublicModeration(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  🌐 Sol·licitar publicació al Receptari Públic Global
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  La recepta es trametrà al <strong>Superadministrador</strong> per ser validada abans de fer-se visible per a la resta de famílies.
                </span>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel·la
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isGenerating}
                disabled={!aiPrompt.trim()}
                className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white"
              >
                <Sparkles className="w-4 h-4" />
                Genera Recepta amb IA
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <Input
              label="Títol de la Recepta *"
              placeholder="ex. Quiche d'Espinacs i Mató"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              label="Breu Descripció"
              placeholder="Una descripció deliciosa del plat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Prep (min)"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
              />
              <Input
                label="Cocció (min)"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
              />
              <Input
                label="Racions"
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
              <Input
                label="Calories (kcal)"
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
              />
            </div>

            {/* Ingredients list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ingredients
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddIngredient}>
                  <Plus className="w-3.5 h-3.5" /> Afegeix Ingredient
                </Button>
              </div>

              {ingredients.map((ing, i) => (
                <div key={ing.id} className="flex items-center gap-2">
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
              placeholder="1. Renta i talla les verdures...&#10;2. Salta a la paella 5 minuts...&#10;3. Serveix calent."
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows={4}
            />

            {/* Public Moderation Checkbox Manual */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requestPublicModeration}
                onChange={(e) => setRequestPublicModeration(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  🌐 Sol·licitar publicació al Receptari Públic Global
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  La recepta passarà a la cua de revisió del <strong>Superadministrador</strong> abans de ser afegida al catàleg públic general.
                </span>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel·la
              </Button>
              <Button type="submit" variant="primary">
                Desa Recepta
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
