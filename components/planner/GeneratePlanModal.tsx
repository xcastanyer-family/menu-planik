"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { DietaryPreference, WeeklyMealPlan, UserPreferences } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated: (newPlan: WeeklyMealPlan) => void;
  currentPreferences: UserPreferences;
}

export const GeneratePlanModal: React.FC<GeneratePlanModalProps> = ({
  isOpen,
  onClose,
  onPlanGenerated,
  currentPreferences,
}) => {
  const [diet, setDiet] = useState<DietaryPreference>(currentPreferences.dietaryPreference || "mediterranean");
  const [calories, setCalories] = useState<number>(currentPreferences.dailyCalorieTarget || 2000);
  const [household, setHousehold] = useState<number>(currentPreferences.householdSize || 2);
  const [allergiesText, setAllergiesText] = useState<string>(currentPreferences.allergies.join(", "));
  const [dislikesText, setDislikesText] = useState<string>(currentPreferences.dislikedIngredients.join(", "));
  const [notes, setNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const allergies = allergiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const dislikes = dislikesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const userRecipes = typeof window !== "undefined" ? LocalStore.getRecipes() : [];

      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietaryPreference: diet,
          targetCalories: calories,
          householdSize: household,
          allergies,
          dislikes,
          notes,
          recipes: userRecipes,
          customApiKey: currentPreferences.geminiApiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.plan) {
        onPlanGenerated(data.plan);
        const filledSlots = data.plan.slots.filter((s: any) => s.recipeId);
        if (filledSlots.length === 0) {
          toast.warning("No s'han trobat receptes a la base de dades. Els àpats s'han deixat en blanc.");
        } else if (filledSlots.length < data.plan.slots.length) {
          toast.success(`Menú generat amb les receptes existents (${filledSlots.length} àpats assignats; la resta en blanc).`);
        } else {
          toast.success("Nou menú setmanal generat amb èxit!");
        }
        onClose();
      } else {
        toast.error(data.error || "No s'ha pogut generar el menú setmanal.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error de connexió durant la generació.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Genera Menú Setmanal amb IA"
      description="La intel·ligència artificial organitzarà el menú setmanal únicament a partir de les receptes basades en els teus productes emmagatzemats."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Dietary style and household size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Estil Alimentari / Dieta"
            value={diet}
            onChange={(e) => setDiet(e.target.value as DietaryPreference)}
          >
            <option value="mediterranean">🥗 Dieta Mediterrània</option>
            <option value="omnivore">🥩 Omnívora Equilibrada</option>
            <option value="vegetarian">🥑 Vegetariana</option>
            <option value="vegan">🌱 Vegana 100%</option>
            <option value="pescatarian">🐟 Pescatariana</option>
            <option value="low-carb">📉 Baixa en Carbohidrats (Low Carb)</option>
            <option value="keto">🥑 Cetogènica (Keto)</option>
            <option value="gluten-free">🌾 Sense Gluten</option>
          </Select>

          <Input
            label="Nombre de persones (Racions)"
            type="number"
            min={1}
            max={12}
            value={household}
            onChange={(e) => setHousehold(Number(e.target.value))}
          />
        </div>

        {/* Calories and Prep Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Objectiu de Calories Diàries (kcal)"
            type="number"
            step={50}
            min={1200}
            max={4500}
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            helperText="Mitjana recomanada: 1800 - 2400 kcal"
          />

          <Input
            label="Al·lèrgies o Intol·leràncies"
            placeholder="ex. Gluten, Lactosa, Marisc..."
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
            helperText="Separades per comes"
          />
        </div>

        {/* Dislikes and special requests */}
        <Input
          label="Ingredients a evitar / No desitjats"
          placeholder="ex. Ceba crua, Bolets, Coriandre..."
          value={dislikesText}
          onChange={(e) => setDislikesText(e.target.value)}
        />

        <Textarea
          label="Instruccions especials o desitjos del Xef"
          placeholder="ex. 'Àpats ràpids de menys de 20 minuts per dinar', 'Inclou més llegums', 'Poca sal'..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {/* Action buttons */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="w-full sm:w-auto justify-center"
          >
            Cancel·la
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isGenerating}
            className="w-full sm:w-auto justify-center bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white shadow-sm font-semibold"
          >
            <Sparkles className="w-4 h-4 text-emerald-100 mr-1.5" />
            {isGenerating ? "Generant menú..." : "Genera Menú Setmanal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
