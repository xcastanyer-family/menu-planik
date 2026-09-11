import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyPlanWithAI } from "@/lib/ai/gemini-client";
import { DietaryPreference } from "@/types";

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
      customApiKey,
    } = body;

    const plan = await generateWeeklyPlanWithAI({
      dietaryPreference: dietaryPreference as DietaryPreference,
      targetCalories: Number(targetCalories),
      householdSize: Number(householdSize),
      allergies,
      dislikes,
      notes,
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
