import { createClient } from "./client";
import { Recipe } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { INITIAL_RECIPES } from "@/lib/storage/mock-data";

function mapDbToRecipe(row: any): Recipe {
  return {
    id: row.id,
    familyId: row.family_id,
    authorName: row.author_name,
    title: row.title,
    description: row.description || "",
    prepTimeMinutes: row.prep_time_minutes || 0,
    cookTimeMinutes: row.cook_time_minutes || 0,
    servings: row.servings || 2,
    calories: row.calories || 0,
    nutrition: row.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    tags: row.tags || [],
    dietaryTags: row.dietary_tags || [],
    ingredients: row.ingredients || [],
    instructions: row.instructions || [],
    imageUrl: row.image_url,
    source: row.source || "custom",
    difficulty: row.difficulty || "easy",
    moderationStatus: row.moderation_status || "private",
    isPublic: Boolean(row.is_public),
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

function mapRecipeToDb(recipe: Recipe, userId?: string, familyId?: string) {
  const isUuid = recipe.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe.id);
  return {
    ...(isUuid ? { id: recipe.id } : {}),
    user_id: userId || null,
    family_id: familyId || recipe.familyId || null,
    author_name: recipe.authorName || "Anònim",
    title: recipe.title,
    description: recipe.description || "",
    prep_time_minutes: recipe.prepTimeMinutes || 0,
    cook_time_minutes: recipe.cookTimeMinutes || 0,
    servings: recipe.servings || 2,
    calories: recipe.calories || 0,
    nutrition: recipe.nutrition || {},
    tags: recipe.tags || [],
    dietary_tags: recipe.dietaryTags || [],
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    image_url: recipe.imageUrl || null,
    source: recipe.source || "custom",
    difficulty: recipe.difficulty || "easy",
    moderation_status: recipe.moderationStatus || "private",
    is_public: Boolean(recipe.isPublic),
    rejection_reason: recipe.rejectionReason || null,
  };
}

export const SupabaseRecipeService = {
  /**
   * Fetches recipes from Supabase if connected, falls back to LocalStore
   */
  async getRecipes(forSuperuser?: boolean): Promise<Recipe[]> {
    const supabase = createClient();
    if (!supabase) {
      return LocalStore.getRecipes(forSuperuser);
    }

    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching recipes from Supabase, falling back:", error.message);
        return LocalStore.getRecipes(forSuperuser);
      }

      // If database is completely empty, seed initial curated recipes
      if (!data || data.length === 0) {
        await this.seedCuratedRecipes();
        return LocalStore.getRecipes(forSuperuser);
      }

      const recipes = data.map(mapDbToRecipe);
      // Synchronize local cache
      LocalStore.saveRecipes(recipes);
      return recipes;
    } catch (err) {
      console.warn("Supabase connection error in getRecipes:", err);
      return LocalStore.getRecipes(forSuperuser);
    }
  },

  /**
   * Adds a new recipe to Supabase and LocalStore
   */
  async addRecipe(recipe: Recipe): Promise<Recipe[]> {
    const supabase = createClient();
    const session = LocalStore.getCurrentSession();

    // 1. Optimistic save in LocalStore
    const localUpdated = LocalStore.addRecipe(recipe);

    if (supabase) {
      try {
        const payload = mapRecipeToDb(recipe, session?.userId, session?.familyId);
        const { error } = await supabase.from("recipes").insert(payload);
        if (error) {
          console.warn("Error saving recipe to Supabase:", error.message);
        }
      } catch (err) {
        console.warn("Supabase insert error:", err);
      }
    }

    return localUpdated;
  },

  /**
   * Seeds initial curated recipes into Supabase
   */
  async seedCuratedRecipes(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const payload = INITIAL_RECIPES.map((r) => ({
        author_name: "MenúPlanik",
        title: r.title,
        description: r.description,
        prep_time_minutes: r.prepTimeMinutes,
        cook_time_minutes: r.cookTimeMinutes,
        servings: r.servings,
        calories: r.calories,
        nutrition: r.nutrition,
        tags: r.tags,
        dietary_tags: r.dietaryTags,
        ingredients: r.ingredients,
        instructions: r.instructions,
        image_url: r.imageUrl,
        source: "curated",
        difficulty: r.difficulty,
        moderation_status: "approved_public",
        is_public: true,
      }));

      await supabase.from("recipes").insert(payload);
    } catch (err) {
      console.warn("Could not seed recipes:", err);
    }
  },
};
