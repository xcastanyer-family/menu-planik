"use client";

import React, { useState, useEffect } from "react";
import { Recipe } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { getRecipeComplexity } from "@/lib/utils";
import { SupabaseRecipeService } from "@/lib/supabase/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeDetailModal } from "@/components/recipes/RecipeDetailModal";
import { CookingModeModal } from "@/components/recipes/CookingModeModal";
import { CreateRecipeModal } from "@/components/recipes/CreateRecipeModal";
import { Button } from "@/components/ui/Button";
import { Search, Plus, Sparkles, BookOpen } from "lucide-react";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Modals
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    // Initial immediate render from cache
    setRecipes(LocalStore.getRecipes());

    // Async sync with Supabase
    SupabaseRecipeService.getRecipes().then((res) => {
      if (res && res.length > 0) setRecipes(res);
    });

    const handleChanged = () => {
      setRecipes(LocalStore.getRecipes());
    };

    window.addEventListener("menuplanik_recipes_changed", handleChanged);
    return () => window.removeEventListener("menuplanik_recipes_changed", handleChanged);
  }, []);

  const handleRecipeCreated = async (newRecipe: Recipe) => {
    const updated = await SupabaseRecipeService.addRecipe(newRecipe);
    setRecipes(updated);
  };

  const handleRecipeUpdated = async (updatedRecipe: Recipe) => {
    const updated = await SupabaseRecipeService.updateRecipe(updatedRecipe);
    setRecipes(updated);
    setSelectedRecipe(updatedRecipe);
  };

  const handleRecipeDeleted = async (recipeId: string) => {
    const updated = await SupabaseRecipeService.deleteRecipe(recipeId);
    setRecipes(updated);
    setSelectedRecipe(null);
  };

  const filterTags = [
    { id: "all", label: "Totes les Receptes" },
    { id: "simple", label: "🟢 Senzilles" },
    { id: "complex", label: "🟣 Complexes" },
    { id: "Primers", label: "🍝 Primers" },
    { id: "Segons", label: "🥩 Segons" },
    { id: "Esmorzar", label: "🥐 Esmorzar" },
    { id: "Vegetarià", label: "🥑 Vegetarià" },
    { id: "Peix", label: "🐟 Peix" },
    { id: "Ràpid", label: "⚡ Ràpides (<20m)" },
    { id: "ai", label: "✨ Creades amb IA" },
  ];

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description.toLowerCase().includes(search.toLowerCase()) ||
      recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(search.toLowerCase()));

    let matchesFilter = true;
    if (activeFilter === "simple") {
      matchesFilter = getRecipeComplexity(recipe) === "simple";
    } else if (activeFilter === "complex") {
      matchesFilter = getRecipeComplexity(recipe) === "complex";
    } else if (activeFilter === "ai") {
      matchesFilter = recipe.source === "ai";
    } else if (activeFilter === "Ràpid") {
      matchesFilter = recipe.prepTimeMinutes + recipe.cookTimeMinutes <= 20;
    } else if (activeFilter !== "all") {
      matchesFilter =
        recipe.tags.some((t) => t.toLowerCase() === activeFilter.toLowerCase()) ||
        recipe.dietaryTags.some((d) => d.toLowerCase() === activeFilter.toLowerCase());
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-500" />
            El teu Receptari
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Explora, personalitza i crea noves receptes delicioses amb l'ajuda de la IA.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Afegeix o Genera Recepta
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Cerca per títol, ingredient o estil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filterTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(tag.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === tag.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Cap recepta trobada
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Prova de canviar els termes de cerca o bé genera una nova recepta al moment amb la IA.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Sparkles className="w-4 h-4" />
              Crea Nova Recepta
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRecipeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRecipeCreated={handleRecipeCreated}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onRecipeUpdated={handleRecipeUpdated}
        onRecipeDeleted={handleRecipeDeleted}
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
