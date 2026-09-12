import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromUrlWithAI } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, servings = 2, complexity, customApiKey } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { success: false, error: "Cal proporcionar una adreça URL vàlida." },
        { status: 400 }
      );
    }

    const recipe = await extractRecipeFromUrlWithAI({
      url: url.trim(),
      servings: Number(servings) || 2,
      complexity: complexity === "complex" || complexity === "simple" ? complexity : undefined,
      customApiKey,
    });

    return NextResponse.json({ success: true, recipe });
  } catch (error: any) {
    console.error("API /api/ai/recipe-from-url error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error extraient la recepta de la URL proporcionada.",
      },
      { status: 500 }
    );
  }
}

