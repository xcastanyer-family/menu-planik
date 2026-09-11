import { NextRequest, NextResponse } from "next/server";
import { suggestPantryRecipesWithAI } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pantryItems = [], dietaryPreference = "mediterranean", customApiKey } = body;

    const recipes = await suggestPantryRecipesWithAI({
      pantryItems,
      dietaryPreference,
      customApiKey,
    });

    return NextResponse.json({ success: true, recipes });
  } catch (error: any) {
    console.error("API /api/ai/pantry-recipes error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error en trobar receptes del rebost" },
      { status: 500 }
    );
  }
}
