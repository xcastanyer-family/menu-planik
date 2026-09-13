"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Recipe, Ingredient, DietaryPreference, MealType } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { getRecipeFoodInfo, getRecipeComplexity } from "@/lib/utils";
import {
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Flame,
  Users,
  Check,
  RotateCcw,
  ChefHat,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: Recipe) => Promise<void> | void;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  isOpen,
  onClose,
  onRecipeCreated,
}) => {
  // Tab Mode: "ai" (default), "url", or "manual"
  const [activeTab, setActiveTab] = useState<"ai" | "url" | "manual">("ai");

  // URL Import State
  const [urlInput, setUrlInput] = useState("");

  // AI Specifications State
  const [dishName, setDishName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [complexity, setComplexity] = useState<"simple" | "complex">("simple");
  const [servings, setServings] = useState(2);
  const [maxTimeMinutes, setMaxTimeMinutes] = useState(30);
  const [dietaryTag, setDietaryTag] = useState<DietaryPreference>("mediterranean");
  const [includeIngredientsText, setIncludeIngredientsText] = useState("");
  const [excludeIngredientsText, setExcludeIngredientsText] = useState("");
  const [notes, setNotes] = useState("");
  const [publishPublicly, setPublishPublicly] = useState(false);

  // Generation & Preview State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);

  // Manual fallback state
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPrepTime, setManualPrepTime] = useState(10);
  const [manualCookTime, setManualCookTime] = useState(15);
  const [manualServings, setManualServings] = useState(2);
  const [manualCalories, setManualCalories] = useState(450);
  const [manualIngredients, setManualIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: 100, unit: "g", category: "produce" },
  ]);
  const [manualInstructions, setManualInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    setDishName("");
    setNotes("");
    setUrlInput("");
    setIncludeIngredientsText("");
    setExcludeIngredientsText("");
    setGeneratedRecipe(null);
    setActiveTab("ai");
  };

  const handleCloseModal = () => {
    handleReset();
    onClose();
  };

  const handleUrlGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Introdueix una adreça URL vàlida.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("L'adreça URL ha de començar per http:// o https://");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Llegint la pàgina web i extraient la recepta amb IA...");
    try {
      const userPrefs = typeof window !== "undefined" ? LocalStore.getPreferences() : null;
      const res = await fetch("/api/ai/recipe-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          servings: Number(servings) || 2,
          complexity,
          customApiKey: userPrefs?.geminiApiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.recipe) {
        setGeneratedRecipe({ ...data.recipe, complexity: data.recipe.complexity || complexity });
        toast.success(`Recepta "${data.recipe.title}" extreta amb èxit! Revisa-la abans de desar.`, { id: toastId });
      } else {
        toast.error(data.error || "No s'ha pogut extreure la recepta d'aquesta URL.", { id: toastId });
      }
    } catch {
      toast.error("Error de connexió en analitzar la URL.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim() && !notes.trim()) {
      toast.error("Indica com a mínim el nom o idea del plat.");
      return;
    }

    setIsGenerating(true);
    try {
      const userPrefs = typeof window !== "undefined" ? LocalStore.getPreferences() : null;
      const includeIngredients = includeIngredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludeIngredients = excludeIngredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/ai/suggest-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishName: dishName.trim(),
          mealType,
          complexity,
          dietaryPreference: dietaryTag,
          servings: Number(servings) || 2,
          maxTimeMinutes: Number(maxTimeMinutes) || undefined,
          includeIngredients,
          excludeIngredients,
          notes: notes.trim(),
          customApiKey: userPrefs?.geminiApiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.recipe) {
        setGeneratedRecipe({ ...data.recipe, complexity: data.recipe.complexity || complexity });
        toast.success(`Recepta "${data.recipe.title}" generada! Revisa-la abans de desar.`);
      } else {
        toast.error(data.error || "No s'ha pogut generar la recepta.");
      }
    } catch {
      toast.error("Error de connexió en generar la recepta.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedRecipe) return;
    setIsSaving(true);
    try {
      const recipeToCreate: Recipe = {
        ...generatedRecipe,
        complexity: generatedRecipe.complexity || complexity,
        moderationStatus: publishPublicly ? "approved_public" : "private",
        isPublic: publishPublicly,
      };
      await onRecipeCreated(recipeToCreate);
      if (publishPublicly) {
        toast.success(`Nova recepta "${generatedRecipe.title}" creada i publicada al Receptari Públic!`);
      } else {
        toast.success(`Recepta "${generatedRecipe.title}" afegida al teu receptari!`);
      }
      handleCloseModal();
    } catch {
      toast.error("Error en desar la recepta.");
    } finally {
      setIsSaving(false);
    }
  };

  // Manual fallback handlers
  const handleAddManualIngredient = () => {
    setManualIngredients((prev) => [
      ...prev,
      { id: Math.random().toString(), name: "", amount: 100, unit: "g", category: "produce" },
    ]);
  };

  const handleRemoveManualIngredient = (index: number) => {
    setManualIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManualIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    setManualIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      toast.error("Introdueix un títol per a la recepta");
      return;
    }

    const steps = manualInstructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const validIngredients = manualIngredients.filter((ing) => ing.name.trim() !== "");

    const newRecipe: Recipe = {
      id: `custom-rec-${Date.now()}`,
      title: manualTitle.trim(),
      description: manualDescription.trim(),
      prepTimeMinutes: Number(manualPrepTime) || 10,
      cookTimeMinutes: Number(manualCookTime) || 15,
      servings: Number(manualServings) || 2,
      calories: Number(manualCalories) || 450,
      nutrition: {
        calories: Number(manualCalories) || 450,
        protein: Math.round((Number(manualCalories) || 450) * 0.05),
        carbs: Math.round((Number(manualCalories) || 450) * 0.1),
        fat: Math.round((Number(manualCalories) || 450) * 0.04),
      },
      tags: ["Personalitzada"],
      dietaryTags: [dietaryTag],
      complexity,
      source: "custom",
      moderationStatus: publishPublicly ? "approved_public" : "private",
      isPublic: publishPublicly,
      ingredients: validIngredients.length > 0 ? validIngredients : [
        { id: "1", name: "Ingredients variats", amount: 1, unit: "unitat", category: "other" },
      ],
      instructions: steps.length > 0 ? steps : ["Preparar i cuinar segons preferència."],
    };

    setIsSaving(true);
    try {
      await onRecipeCreated(newRecipe);
      toast.success(`Recepta "${newRecipe.title}" desada correctament!`);
      handleCloseModal();
    } catch {
      toast.error("Error en desar la recepta.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={
        generatedRecipe
          ? "Revisa la Recepta Generada"
          : activeTab === "url"
          ? "Importa Recepta des d'URL Web"
          : activeTab === "manual"
          ? "Nova Recepta Manual"
          : "Crea Nova Recepta amb IA"
      }
      description={
        generatedRecipe
          ? "La IA ha elaborat aquesta recepta seguint totes les teves especificacions. Revisa-la i desa-la."
          : activeTab === "url"
          ? "Enganxa l'enllaç web d'una recepta i la IA n'extraurà automàticament tots els ingredients i passos."
          : activeTab === "manual"
          ? "Introdueix manualment els detalls de la teva recepta."
          : "Indica les especificacions que vols i la IA generarà una recepta detallada i a mida."
      }
      maxWidth="2xl"
    >
      <div className="pt-2">
        {!generatedRecipe && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeTab === "ai"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 rounded-t-xl"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Idea amb IA</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeTab === "url"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 rounded-t-xl"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Des d&apos;URL Web</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeTab === "manual"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 rounded-t-xl"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Manual</span>
            </button>
          </div>
        )}

        {/* VIEW 1: PREVIEW OF GENERATED RECIPE */}
        {generatedRecipe ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Header info */}
            {(() => {
              const foodInfo = getRecipeFoodInfo(generatedRecipe);
              const comp = generatedRecipe.complexity || complexity;
              return (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-14 h-14 rounded-2xl ${foodInfo.bgLight} ${foodInfo.bgDark} flex items-center justify-center text-3xl shrink-0 border border-emerald-300/40`}>
                      {foodInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3" /> Generada per la IA
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${foodInfo.badgeClass}`}>
                          {foodInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGeneratedRecipe({ ...generatedRecipe, complexity: comp === "simple" ? "complex" : "simple" })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                            comp === "complex"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300/60"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300/60"
                          }`}
                        >
                          {comp === "complex" ? "🟣 Complexa (clica per canviar)" : "🟢 Senzilla (clica per canviar)"}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                          Títol creat per la IA (pots retocar-lo si vols):
                        </label>
                        <input
                          type="text"
                          value={generatedRecipe.title}
                          onChange={(e) =>
                            setGeneratedRecipe({ ...generatedRecipe, title: e.target.value })
                          }
                          className="w-full text-base sm:text-lg font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                        />
                      </div>
                      {generatedRecipe.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {generatedRecipe.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick stats pills */}
                  <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300 pt-2 flex-wrap border-t border-emerald-200/50 dark:border-emerald-800/30">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {generatedRecipe.prepTimeMinutes + generatedRecipe.cookTimeMinutes} minuts
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      {generatedRecipe.servings} racions
                    </span>
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      {generatedRecipe.calories} kcal
                    </span>
                    <span className="text-[11px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                      {dietaryTag}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Ingredients */}
            <div className="bg-zinc-50 dark:bg-zinc-850 rounded-xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-primary-600" />
                Ingredients ({generatedRecipe.ingredients.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {generatedRecipe.ingredients.map((ing, i) => (
                  <div
                    key={ing.id || i}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                  >
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">
                      {ing.name}
                    </span>
                    <span className="text-zinc-500 font-semibold shrink-0 ml-2">
                      {ing.amount} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-zinc-50 dark:bg-zinc-850 rounded-xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Passos de preparació
              </h4>
              <ol className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                {generatedRecipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Public publication check */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishPublicly}
                onChange={(e) => setPublishPublicly(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  🌐 Publicar directament al Receptari Públic Global
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Visible per a tothom immediatament sense aprovació prèvia.
                </span>
              </div>
            </label>

            {/* Actions for generated recipe */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGeneratedRecipe(null)}
                className="w-full sm:w-auto justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Ajustar especificacions
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" size="sm" onClick={handleCloseModal} className="flex-1 sm:flex-initial justify-center">
                  Cancel·la
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isSaving}
                  onClick={handleSaveGenerated}
                  className="flex-1 sm:flex-initial justify-center bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-semibold shadow-sm"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Desa Recepta
                </Button>
              </div>
            </div>
          </div>
        ) : activeTab === "url" ? (
          /* VIEW 2: URL IMPORT FORM */
          <form onSubmit={handleUrlGenerate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Extracció Intel·ligent des de qualsevol Web
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Enganxa l&apos;enllaç d&apos;una recepta de qualsevol web o blog de cuina. La IA n&apos;analitzarà el contingut, extreurà els ingredients exactes, el temps i les instruccions, i en redactarà la recepta en català.
                </p>
              </div>
            </div>

            <div>
              <Input
                label="Enllaç web de la recepta (URL) *"
                type="url"
                placeholder="https://www.directoalpaladar.com/... o https://cuina.cat/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-primary-600" />
                <span>Format admès: http:// o https://</span>
              </p>
            </div>

            {/* Complexity Selector */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Tipus de recepta / Complexitat
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setComplexity("simple")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "simple"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟢 Senzilla (dia a dia, ràpida)
                </button>
                <button
                  type="button"
                  onClick={() => setComplexity("complex")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "complex"
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟣 Complexa (elaborada)
                </button>
              </div>
            </div>

            {/* Servings */}
            <div>
              <Select
                label="Adapta les racions a"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              >
                <option value={1}>1 ració (individual)</option>
                <option value={2}>2 racions (parella)</option>
                <option value={4}>4 racions (família)</option>
                <option value={6}>6 racions (reunió familiar)</option>
              </Select>
            </div>

            {/* Public Direct Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishPublicly}
                onChange={(e) => setPublishPublicly(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  🌐 Publicar directament al Receptari Públic Global
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Visible per a tothom immediatament sense necessitat d&apos;aprovació.
                </span>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto justify-center">
                Cancel·la
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isGenerating}
                disabled={!urlInput.trim()}
                className="w-full sm:w-auto justify-center bg-gradient-to-r from-primary-600 to-emerald-600 text-white shadow-md shadow-primary-500/20"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Importa Recepta amb IA
              </Button>
            </div>
          </form>
        ) : activeTab === "manual" ? (
          /* VIEW 3: MANUAL FORM FALLBACK */
          <form onSubmit={handleManualSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Mode Manual
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tornar a generar amb IA
              </button>
            </div>

            <Input
              label="Títol de la Recepta *"
              placeholder="ex. Quiche d\x27Espinacs i Mató"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              required
            />

            <Textarea
              label="Breu Descripció"
              placeholder="Una descripció deliciosa del plat..."
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              rows={2}
            />

            <div>
              <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Complexitat de la recepta
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setComplexity("simple")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "simple"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟢 Senzilla (dia a dia, ràpida)
                </button>
                <button
                  type="button"
                  onClick={() => setComplexity("complex")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "complex"
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟣 Complexa (elaborada)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Prep (min)"
                type="number"
                value={manualPrepTime}
                onChange={(e) => setManualPrepTime(Number(e.target.value))}
              />
              <Input
                label="Cocció (min)"
                type="number"
                value={manualCookTime}
                onChange={(e) => setManualCookTime(Number(e.target.value))}
              />
              <Input
                label="Racions"
                type="number"
                value={manualServings}
                onChange={(e) => setManualServings(Number(e.target.value))}
              />
              <Input
                label="Calories (kcal)"
                type="number"
                value={manualCalories}
                onChange={(e) => setManualCalories(Number(e.target.value))}
              />
            </div>

            {/* Ingredients list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ingredients
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddManualIngredient}>
                  <Plus className="w-3.5 h-3.5" /> Afegeix Ingredient
                </Button>
              </div>

              {manualIngredients.map((ing, i) => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nom ingredient"
                    value={ing.name}
                    onChange={(e) => handleManualIngredientChange(i, "name", e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qtat"
                    value={ing.amount}
                    onChange={(e) => handleManualIngredientChange(i, "amount", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Unitat"
                    value={ing.unit}
                    onChange={(e) => handleManualIngredientChange(i, "unit", e.target.value)}
                    className="w-16 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveManualIngredient(i)}
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
              placeholder="1. Renta i talla les verdures...\n2. Salta a la paella 5 minuts...\n3. Serveix calent."
              value={manualInstructions}
              onChange={(e) => setManualInstructions(e.target.value)}
              rows={4}
            />

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto justify-center">
                Cancel·la
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving} className="w-full sm:w-auto justify-center">
                Desa Recepta Manual
              </Button>
            </div>
          </form>
        ) : (
          /* VIEW 3: AI SPECIFICATIONS FORM (DEFAULT) */
          <form onSubmit={handleAiGenerate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Dish Idea / Concept */}
            <div>
              <Input
                label="Idea o concepte del plat *"
                placeholder="ex. 'Vull un arròs melós amb marisc', 'Alguna cosa amb pollastre i salsa cremosa', 'Pasta ràpida amb tomàquet fresca'..."
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                required
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                💡 Posa aquí la teva idea, desig o combinació que et vingui de gust; la IA trobarà la recepta adequada i en crearà el títol professional.
              </p>
            </div>

            {/* Complexity Selector */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Tipus de recepta / Complexitat
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComplexity("simple");
                    setMaxTimeMinutes(25);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "simple"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟢 Senzilla (dia a dia, ràpida)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComplexity("complex");
                    setMaxTimeMinutes(50);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    complexity === "complex"
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-800 dark:text-purple-300 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  🟣 Complexa (elaborada)
                </button>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Select
                label="Tipus d&apos;àpat"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                <option value="lunch">🥗 Dinar (Plat principal de migdia)</option>
                <option value="dinner">🍲 Sopar (Plat de vespre)</option>
                <option value="breakfast">💡 Esmorzar (Començar el dia)</option>
                <option value="snack">🍎 Berenar / Postres</option>
              </Select>

              <Select
                label="Racions (persones)"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              >
                <option value={1}>1 ració (individual)</option>
                <option value={2}>2 racions (parella)</option>
                <option value={4}>4 racions (família)</option>
                <option value={6}>6 racions (reunió familiar)</option>
              </Select>

              <Select
                label="Temps disponible"
                value={maxTimeMinutes}
                onChange={(e) => setMaxTimeMinutes(Number(e.target.value))}
              >
                <option value={20}>⚡ Ràpid (fins a 20 minuts)</option>
                <option value={35}>⏱️ Mitjà (30 a 40 minuts)</option>
                <option value={60}>🍳 Elaborat (45 a 60 minuts)</option>
              </Select>

              <Select
                label="Estil Alimentari / Dieta"
                value={dietaryTag}
                onChange={(e) => setDietaryTag(e.target.value as DietaryPreference)}
              >
                <option value="mediterranean">🥗 Dieta Mediterrània</option>
                <option value="omnivore">🥩 Omnívora Equilibrada</option>
                <option value="vegetarian">🥑 Vegetariana</option>
                <option value="vegan">🌱 Vegana 100%</option>
                <option value="pescatarian">🐟 Pescatariana</option>
                <option value="low-carb">🥑 Baixa en carbohidrats (Low Carb)</option>
                <option value="gluten-free">🌾 Sense Gluten</option>
              </Select>
            </div>

            {/* Ingredient specific requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Ingredients a incloure obligatòriament (opcional)"
                placeholder="ex. all, ceba, xampinyons, gambes..."
                value={includeIngredientsText}
                onChange={(e) => setIncludeIngredientsText(e.target.value)}
              />
              <Input
                label="Ingredients o al·lèrgens a evitar (opcional)"
                placeholder="ex. sense picant, sense làctics, sense gluten..."
                value={excludeIngredientsText}
                onChange={(e) => setExcludeIngredientsText(e.target.value)}
              />
            </div>

            {/* Additional notes */}
            <Textarea
              label="Indicacions addicionals per a la IA (opcional)"
              placeholder="ex. Vull que quedi amb una salsa espessa i saborosa, amb herbes fresques i baix en greix..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            {/* Public Direct Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishPublicly}
                onChange={(e) => setPublishPublicly(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  🌐 Publicar directament al Receptari Públic Global
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  La recepta es publicarà al catàleg general i serà visible immediatament per a tothom, sense necessitat d&apos;aprovació de ningú.
                </span>
              </div>
            </label>

            {/* Footer / Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline text-center sm:text-left py-1"
              >
                Crear manualment sense IA
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1 sm:flex-initial justify-center">
                  Cancel·la
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isGenerating}
                  disabled={!dishName.trim() && !notes.trim()}
                  className="flex-1 sm:flex-initial justify-center bg-gradient-to-r from-primary-600 to-emerald-600 text-white shadow-md shadow-primary-500/20 text-xs font-semibold"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Genera amb IA
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
