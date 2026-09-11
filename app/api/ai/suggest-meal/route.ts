import { NextRequest, NextResponse } from "next/server";
import { suggestMealAlternativeWithAI } from "@/lib/ai/gemini-client";
import { MealType, DayOfWeek, DietaryPreference } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mealType = "lunch",
      day = "monday",
      dietaryPreference = "mediterranean",
      notes = "",
      dishName,
      servings = 2,
      maxTimeMinutes,
      includeIngredients = [],
      excludeIngredients = [],
      customApiKey,
    } = body;

    const recipe = await suggestMealAlternativeWithAI({
      mealType: mealType as MealType,
      day: day as DayOfWeek,
      dietaryPreference: dietaryPreference as DietaryPreference,
      notes,
      dishName,
      servings: Number(servings) || 2,
      maxTimeMinutes: maxTimeMinutes ? Number(maxTimeMinutes) : undefined,
      includeIngredients: Array.isArray(includeIngredients) ? includeIngredients : [],
      excludeIngredients: Array.isArray(excludeIngredients) ? excludeIngredients : [],
      customApiKey,
    });

    return NextResponse.json({ success: true, recipe });
  } catch (error: any) {
    console.error("API /api/ai/suggest-meal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error en el suggeriment de l'àpat" },
      { status: 500 }
    );
  }
}
