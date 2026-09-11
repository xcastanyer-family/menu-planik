"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Recipe } from "@/types";
import { Sparkles, Clock, Flame, BookPlus, Play } from "lucide-react";
import { toast } from "sonner";

interface PantryRecipeSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onSaveRecipe: (recipe: Recipe) => void;
  onCookRecipe: (recipe: Recipe) => void;
}

export const PantryRecipeSuggestionsModal: React.FC<PantryRecipeSuggestionsModalProps> = ({
  isOpen,
  onClose,
  recipes,
  onSaveRecipe,
  onCookRecipe,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receptes Recomanades amb els teus Ingredients"
      description="Aquestes receptes han estat creades per la IA per aprofitar al màxim els ingredients que ja tens a casa."
      maxWidth="3xl"
    >
      <div className="space-y-4 pt-2">
        {recipes.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 py-8">Cap suggeriment generat.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recipes.map((r, i) => (
              <div
                key={r.id || i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 p-4 flex flex-col justify-between hover:border-emerald-400 transition shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Antimalbaratament #{i + 1}
                  </div>

                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                    {r.title}
                  </h4>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {r.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/40">
                    <span className="flex items-center gap-1 font-medium text-amber-600">
                      <Flame className="w-3 h-3" /> {r.calories} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.prepTimeMinutes + r.cookTimeMinutes}m
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      onSaveRecipe(r);
                      toast.success(`Desada: ${r.title}`);
                    }}
                  >
                    <BookPlus className="w-3 h-3" /> Desa
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      onClose();
                      onCookRecipe(r);
                    }}
                  >
                    <Play className="w-3 h-3" /> Cuina
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
