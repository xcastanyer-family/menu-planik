import { Recipe } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";

export const SupabaseRecipeService = {
  /**
   * Fetches recipes from cloud API with local fallback
   */
  async getRecipes(forSuperuser?: boolean): Promise<Recipe[]> {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.recipes && json.recipes.length > 0) {
          LocalStore.saveRecipes(json.recipes);
          return LocalStore.getRecipes(forSuperuser);
        }
      }
    } catch (err) {
      console.warn("API error fetching recipes, using local fallback:", err);
    }
    return LocalStore.getRecipes(forSuperuser);
  },

  /**
   * Adds a new recipe to cloud API and LocalStore
   */
  async addRecipe(recipe: Recipe): Promise<Recipe[]> {
    const session = LocalStore.getCurrentSession();
    const recipeWithMeta: Recipe = {
      ...recipe,
      familyId: recipe.familyId || session?.familyId || undefined,
      authorName: recipe.authorName || session?.name || "Autor Desconegut",
    };

    // 1. Optimistic save in LocalStore
    LocalStore.addRecipe(recipeWithMeta);

    // 2. Save in cloud API
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe: recipeWithMeta }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.recipe) {
          LocalStore.addRecipe(json.recipe);
        }
      }
    } catch (err) {
      console.warn("API error creating recipe:", err);
    }

    return LocalStore.getRecipes();
  },

  /**
   * Updates an existing recipe in cloud API and LocalStore
   */
  async updateRecipe(recipe: Recipe): Promise<Recipe[]> {
    LocalStore.updateRecipe(recipe);

    try {
      await fetch("/api/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
    } catch (err) {
      console.warn("API error updating recipe:", err);
    }

    return LocalStore.getRecipes();
  },

  /**
   * Deletes a recipe from cloud API and LocalStore
   */
  async deleteRecipe(recipeId: string): Promise<Recipe[]> {
    LocalStore.deleteRecipe(recipeId);

    try {
      await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
    } catch (err) {
      console.warn("API error deleting recipe:", err);
    }

    return LocalStore.getRecipes();
  },
};
