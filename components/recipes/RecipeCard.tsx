"use client";

import React from "react";
import { Recipe } from "@/types";
import { Clock, Flame, Users, Sparkles, ChefHat } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onQuickAddToPlan?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Image Thumbnail */}
        <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-500/10 to-primary-500/10 text-primary-600">
              <ChefHat className="w-10 h-10 opacity-40" />
            </div>
          )}

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap justify-end">
            {recipe.moderationStatus === "approved_public" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white rounded-full flex items-center gap-1 shadow-sm">
                🌐 Públic
              </span>
            )}
            {recipe.moderationStatus === "pending_review" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/90 backdrop-blur-md text-zinc-950 rounded-full flex items-center gap-1 shadow-sm">
                ⏳ Pendent
              </span>
            )}
            {recipe.moderationStatus === "private" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-800/90 backdrop-blur-md text-zinc-200 rounded-full flex items-center gap-1 shadow-sm">
                🔒 Privat
              </span>
            )}
            {recipe.source === "ai" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-600/90 backdrop-blur-md text-white rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" /> IA
              </span>
            )}
          </div>

          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white rounded-lg flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              {recipe.calories} kcal
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {recipe.title}
          </h3>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
        </span>

        <span className="flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-400">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          {recipe.servings} racions
        </span>
      </div>
    </div>
  );
};
