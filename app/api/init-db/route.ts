import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  INITIAL_RECIPES,
  INITIAL_MEAL_PLAN,
  INITIAL_PANTRY,
  generateGroceriesFromPlan,
} from "@/lib/storage/mock-data";

export async function POST() {
  return handleInit();
}

export async function GET() {
  return handleInit();
}

async function handleInit() {
  const adminClient = createAdminClient();
  const groceries = generateGroceriesFromPlan(INITIAL_MEAL_PLAN, INITIAL_PANTRY);

  if (!adminClient) {
    return NextResponse.json({
      success: true,
      mode: "local_only",
      message: "Supabase no està configurat; dades preparades per a LocalStore.",
      data: {
        recipes: INITIAL_RECIPES,
        mealPlan: INITIAL_MEAL_PLAN,
        pantry: INITIAL_PANTRY,
        groceries,
      },
    });
  }

  try {
    // 1. Initialise / Seed RECIPES
    // Clean up old recipes
    await adminClient.from("recipes").delete().neq("title", "");

    const recipePayload = INITIAL_RECIPES.map((r) => ({
      author_name: r.authorName || "MenúPlanik",
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
      source: r.source || "curated",
      difficulty: r.difficulty || "easy",
      moderation_status: "approved_public",
      is_public: true,
    }));

    const { data: insertedRecipes, error: rErr } = await adminClient
      .from("recipes")
      .insert(recipePayload)
      .select("*");

    if (rErr) throw new Error("Error inserint receptes: " + rErr.message);

    // Map recipes by title for slot references
    const recipeMap = new Map<string, string>();
    (insertedRecipes || []).forEach((r: any) => {
      recipeMap.set(r.title.trim().toLowerCase(), r.id);
    });

    // 2. FAMILIES
    let { data: families } = await adminClient.from("families").select("*");
    if (!families || families.length === 0) {
      const { data: newFams } = await adminClient
        .from("families")
        .insert([
          {
            name: "Família Castanyer",
            code: "CAS-BAR",
            admin_name: "Xavi",
            admin_email: "xcastanyer@gmail.com",
            status: "approved",
          },
          {
            name: "Família MenúPlanik",
            code: "FAM-7492",
            admin_name: "Marc Planik",
            admin_email: "marc@menuplanik.cat",
            status: "approved",
          },
        ])
        .select();
      families = newFams || [];
    }

    let totalPlans = 0;
    let totalSlots = 0;
    let totalPantry = 0;
    let totalGroceries = 0;

    // 3. For each family: Seed Meal Plans, Slots, Pantry, Groceries
    for (const fam of families || []) {
      // Clear previous meal plans, pantry, and groceries for this family
      await adminClient.from("pantry_items").delete().eq("family_id", fam.id);
      await adminClient.from("grocery_items").delete().eq("family_id", fam.id);
      await adminClient.from("meal_plans").delete().eq("family_id", fam.id);

      // A) Meal Plan
      const today = new Date().toISOString().split("T")[0];
      const { data: createdPlan, error: pErr } = await adminClient
        .from("meal_plans")
        .insert({
          family_id: fam.id,
          week_start_date: today,
          title: `Menú Setmanal de la ${fam.name}`,
          household_size: 2,
          target_daily_calories: 2000,
          dietary_preference: "mediterranean",
        })
        .select()
        .single();

      if (pErr) throw new Error("Error creant pla de menú: " + pErr.message);
      totalPlans++;

      // B) Meal Slots
      if (createdPlan) {
        const slotsPayload = INITIAL_MEAL_PLAN.slots.map((slot) => {
          let recId = null;
          if (slot.recipe?.title) {
            recId = recipeMap.get(slot.recipe.title.trim().toLowerCase()) || null;
          }
          if (!recId && insertedRecipes && insertedRecipes.length > 0) {
            recId = insertedRecipes[0].id;
          }
          return {
            plan_id: createdPlan.id,
            day: slot.day,
            meal_type: slot.mealType,
            recipe_id: recId,
            is_completed: false,
          };
        });

        const { data: slots, error: sErr } = await adminClient
          .from("meal_slots")
          .insert(slotsPayload)
          .select();
        if (sErr) throw new Error("Error inserint àpats (slots): " + sErr.message);
        totalSlots += slots?.length || 0;

        // C) Groceries
        const groceryPayload = groceries.map((g) => ({
          family_id: fam.id,
          meal_plan_id: createdPlan.id,
          name: g.name,
          amount: g.amount,
          unit: g.unit,
          category: g.category,
          checked: false,
          recipe_source: g.recipeSource || null,
        }));

        const { data: grocs, error: gErr } = await adminClient
          .from("grocery_items")
          .insert(groceryPayload)
          .select();
        if (gErr) throw new Error("Error inserint llista compra: " + gErr.message);
        totalGroceries += grocs?.length || 0;
      }

      // D) Pantry Items
      const pantryPayload = INITIAL_PANTRY.map((item) => ({
        family_id: fam.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiryDate || null,
        is_low: Boolean(item.isLow),
      }));

      const { data: pantries, error: paErr } = await adminClient
        .from("pantry_items")
        .insert(pantryPayload)
        .select();
      if (paErr) throw new Error("Error inserint rebost: " + paErr.message);
      totalPantry += pantries?.length || 0;
    }

    return NextResponse.json({
      success: true,
      message: "Base de dades inicialitzada amb èxit a Supabase!",
      stats: {
        recipes: insertedRecipes?.length || 0,
        families: families?.length || 0,
        mealPlans: totalPlans,
        mealSlots: totalSlots,
        pantryItems: totalPantry,
        groceryItems: totalGroceries,
      },
      data: {
        recipes: (insertedRecipes || []).map((r: any) => ({
          ...r,
          id: r.id,
          prepTimeMinutes: r.prep_time_minutes,
          cookTimeMinutes: r.cook_time_minutes,
          moderationStatus: r.moderation_status,
          isPublic: r.is_public,
        })),
        mealPlan: INITIAL_MEAL_PLAN,
        pantry: INITIAL_PANTRY,
        groceries,
      },
    });
  } catch (error: any) {
    console.error("Error al inicialitzar la base de dades:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
