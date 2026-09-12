import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmptyMealPlan, INITIAL_PANTRY } from "@/lib/storage/mock-data";

export async function POST() {
  return handleInit();
}

export async function GET() {
  return handleInit();
}

async function handleInit() {
  const adminClient = createAdminClient();
  const emptyPlan = createEmptyMealPlan();

  if (!adminClient) {
    return NextResponse.json({
      success: true,
      mode: "local_only",
      message: "Supabase no està configurat; dades netejades per a LocalStore.",
      data: {
        recipes: [],
        mealPlan: emptyPlan,
        pantry: INITIAL_PANTRY,
        groceries: [],
      },
    });
  }

  try {
    // 1. DELETE All Meal Slots first (references meal_plans and recipes)
    const { error: slotErr } = await adminClient
      .from("meal_slots")
      .delete()
      .neq("day", "___none___");
    if (slotErr) console.warn("Avís eliminant meal_slots:", slotErr.message);

    // 2. DELETE All Grocery Items
    const { error: grocErr } = await adminClient
      .from("grocery_items")
      .delete()
      .neq("name", "___none___");
    if (grocErr) console.warn("Avís eliminant grocery_items:", grocErr.message);

    // 3. DELETE All Meal Plans
    const { error: planErr } = await adminClient
      .from("meal_plans")
      .delete()
      .neq("title", "___none___");
    if (planErr) console.warn("Avís eliminant meal_plans:", planErr.message);

    // 4. DELETE All Recipes
    const { error: recErr } = await adminClient
      .from("recipes")
      .delete()
      .neq("title", "___none___");
    if (recErr) throw new Error("Error eliminant receptes: " + recErr.message);

    // 5. Ensure Families exist
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

    return NextResponse.json({
      success: true,
      message: "Base de dades inicialitzada amb èxit: s'han eliminat totes les receptes, menús planificats i llista de la compra.",
      stats: {
        recipesRemaining: 0,
        mealPlansRemaining: 0,
        groceryItemsRemaining: 0,
        families: families?.length || 0,
      },
      data: {
        recipes: [],
        mealPlan: emptyPlan,
        pantry: INITIAL_PANTRY,
        groceries: [],
      },
    });
  } catch (error: any) {
    console.error("Error al inicialitzar la base de dades:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
