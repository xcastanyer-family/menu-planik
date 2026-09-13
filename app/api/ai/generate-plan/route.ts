import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyPlanWithAI } from "@/lib/ai/gemini-client";
import { DietaryPreference, Recipe } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

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
    complexity: row.complexity || "simple",
    moderationStatus: row.moderation_status || "private",
    isPublic: Boolean(row.is_public),
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dietaryPreference = "mediterranean",
      targetCalories = 2000,
      householdSize = 2,
      allergies = [],
      dislikes = [],
      notes = "",
      recipes = [],
      customApiKey,
    } = body;

    let allRecipes: Recipe[] = Array.isArray(recipes) ? [...recipes] : [];

    // Query Supabase for cloud recipes if available
    try {
      const adminClient = createAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient
          .from("recipes")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const dbRecipes = data.map(mapDbToRecipe);
          const existingIds = new Set(allRecipes.map((r) => r.id));
          for (const dbr of dbRecipes) {
            if (!existingIds.has(dbr.id)) {
              allRecipes.push(dbr);
              existingIds.add(dbr.id);
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn("Could not query Supabase in generate-plan route:", dbErr);
    }

    // Només les receptes manuals / senzilles basades en productes BD conformen el menú setmanal
    const menuEligibleRecipes = allRecipes.filter(
      (r) => (r.complexity || "simple") !== "complex"
    );

    const plan = await generateWeeklyPlanWithAI({
      dietaryPreference: dietaryPreference as DietaryPreference,
      targetCalories: Number(targetCalories),
      householdSize: Number(householdSize),
      allergies,
      dislikes,
      notes,
      recipes: menuEligibleRecipes,
      customApiKey,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("API /api/ai/generate-plan error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error en la generació del menú" },
      { status: 500 }
    );
  }
}
