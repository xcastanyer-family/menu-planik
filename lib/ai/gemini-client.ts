import { GoogleGenerativeAI } from "@google/generative-ai";
import { Recipe, WeeklyMealPlan, MealSlot, DayOfWeek, MealType, DietaryPreference } from "@/types";
import { createEmptyMealPlan } from "@/lib/storage/mock-data";
import { getRecipeComplexity } from "@/lib/utils";
import { generateSmartRecipeFromPrompt, generateSmartPantryRecipes } from "./smart-recipe-generator";

function getApiKey(customKey?: string): string | null {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (
    !key ||
    key === "your-gemini-api-key-here" ||
    key === "placeholder-gemini-key" ||
    key.includes("placeholder") ||
    key.trim() === ""
  ) {
    return null;
  }
  return key.trim();
}

export async function generateWeeklyPlanWithAI(params: {
  dietaryPreference: DietaryPreference;
  targetCalories: number;
  householdSize: number;
  allergies?: string[];
  dislikes?: string[];
  notes?: string;
  recipes?: Recipe[];
  customApiKey?: string;
}): Promise<WeeklyMealPlan> {
  const availableRecipes = params.recipes || [];

  // CRITICAL: If no recipes in database, leave entire menu blank
  if (availableRecipes.length === 0) {
    return createEmptyMealPlan();
  }

  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey) {
    // Generate simulated plan strictly using available database recipes
    return generateFallbackPlan(params);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const catalogForPrompt = availableRecipes.map((r) => ({
      id: r.id,
      title: r.title,
      complexity: r.complexity || "simple",
      tags: r.tags || [],
      dietaryTags: r.dietaryTags || [],
      isBreakfast:
        r.tags?.some((t) => /esmorzar|desayuno|breakfast/i.test(t)) ||
        /torrad|iogurt|cereal|porridge|pancake|ov/i.test(r.title),
    }));

    const prompt = `
Ets un organitzador de menús i nutricionista expert. Tens la tasca d'organitzar el menú setmanal (Dilluns a Diumenge: esmorzar, dinar i sopar).

REGLA D'OR ABSOLUTA I INNEGOCIABLE DE L'USUARI:
"NO GENERIS EL MENÚ AMB RECETES QUE NO ESTIGUIN A LA BASE DE DADES. SI NO POTS COMPLETAR EL MENÚ, DEIXA L'ÀPAT EN BLANC."

Això implica:
1. NOMÉS i EXCLUSIVAMENT pots escollir receptes d'aquest CATÀLEG DE LA BASE DE DADES:
${JSON.stringify(catalogForPrompt, null, 2)}

2. ESTÀ TOTALMENT PROHIBIT inventar cap recepta o plat que no figuri al catàleg superior.
3. Si no hi ha receptes suficients o adequades per a un àpat (per exemple, si no hi ha receptes d'esmorzar, o no hi ha prou varietat per a tots els dinars/sopars), HAS DE DEIXAR L'ÀPAT EN BLANC (posant "recipeId": null).
4. Receptes senzilles: Prioritza les receptes amb complexity: "simple" per a la planificació setmanal regular.
5. Si l'usuari a les notes demana un plat concret ("${params.notes || ""}") i existeix a la base de dades, assigna'l exactament.

Respon EXCLUSIVAMENT amb un JSON vàlid amb aquesta estructura:
{
  "title": "Menú Setmanal (${params.dietaryPreference})",
  "days": [
    {
      "day": "monday",
      "breakfast": { "recipeId": "id-de-la-recepta-o-null" },
      "lunch": { "recipeId": "id-de-la-recepta-o-null" },
      "dinner": { "recipeId": "id-de-la-recepta-o-null" }
    }
  ]
}
Inclou els 7 dies: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".
Per a qualsevol àpat que no puguis omplir amb les receptes existents, posa {"recipeId": null}.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let responseText = result.response.text().trim();
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(responseText);

    const slots: MealSlot[] = [];
    const daysOrder: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    daysOrder.forEach((dayKey) => {
      const dayData =
        parsed.days?.find((d: { day: string }) => d.day?.toLowerCase() === dayKey) ||
        parsed.days?.[daysOrder.indexOf(dayKey)];

      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];
      mealTypes.forEach((mType) => {
        const meal = dayData ? dayData[mType] : null;
        let matchedRecipe: Recipe | undefined = undefined;

        if (meal && meal.recipeId) {
          matchedRecipe = availableRecipes.find((r) => r.id === meal.recipeId);
        }
        if (!matchedRecipe && meal && meal.title) {
          matchedRecipe = availableRecipes.find(
            (r) => r.title.trim().toLowerCase() === meal.title.trim().toLowerCase()
          );
        }

        // ONLY use database recipes. If none matched, leave BLANK!
        slots.push({
          id: `slot-${dayKey}-${mType}-${Math.random().toString(36).substring(2, 7)}`,
          day: dayKey,
          mealType: mType,
          recipeId: matchedRecipe ? matchedRecipe.id : undefined,
          recipe: matchedRecipe,
          isCompleted: false,
        });
      });
    });

    return {
      id: `plan-${Date.now()}`,
      title: parsed.title || `Menú ${params.dietaryPreference}`,
      weekStartDate: new Date().toISOString().split("T")[0],
      householdSize: params.householdSize,
      targetDailyCalories: params.targetCalories,
      dietaryPreference: params.dietaryPreference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slots,
    };
  } catch (error) {
    console.error("Gemini AI plan generation error, falling back to built-in generator:", error);
    return generateFallbackPlan(params);
  }
}

export async function suggestMealAlternativeWithAI(params: {
  mealType?: MealType;
  day?: DayOfWeek;
  dietaryPreference?: DietaryPreference;
  notes?: string;
  dishName?: string;
  complexity?: "simple" | "complex";
  servings?: number;
  maxTimeMinutes?: number;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  customApiKey?: string;
}): Promise<Recipe> {
  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey) {
    // Generate intelligent customized recipe strictly based on the prompt
    return generateSmartRecipeFromPrompt(params);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const mealTypeStr = params.mealType || "lunch";
    const servingsCount = params.servings || 2;
    const userIdea = params.dishName?.trim() || params.notes?.trim() || "Plat equilibrat";
    const additionalNotes = params.notes?.trim() && params.notes !== userIdea ? params.notes.trim() : "";

    const prompt = `
Ets un xef d'alta cuina i assistent culinari de màxima precisió.
L'usuari t'ha proporcionat la següent IDEA O CONCEPTE per a un plat:
"${userIdea}"
${additionalNotes ? `- Especificacions o preferències addicionals: "${additionalNotes}"` : ""}

Context de l'àpat:
- Tipus d'àpat: "${mealTypeStr}"
- Racions: ${servingsCount} persones
- Preferència alimentària: "${params.dietaryPreference || "mediterranean"}"
${params.complexity ? `- Complexitat demanada: ${params.complexity === "complex" ? "Complexa / Elaborada (recepta rica, de cap de setmana o ocasions especials)" : "Senzilla / Ràpida (fàcil, del dia a dia, temps màxim 30 minuts)"}` : ""}
${params.maxTimeMinutes ? `- Temps màxim disponible: aprox ${params.maxTimeMinutes} minuts` : ""}
${params.includeIngredients && params.includeIngredients.length > 0 ? `- Ingredients que CAL incloure obligatòriament: ${params.includeIngredients.join(", ")}` : ""}
${params.excludeIngredients && params.excludeIngredients.length > 0 ? `- Ingredients o al·lèrgens a EVITAR estrictament: ${params.excludeIngredients.join(", ")}` : ""}

REGLES DE MÀXIMA IMPORTÀNCIA PER AL TÍTOL ("title"):
1. L'usuari ha escrit la seva IDEA O DESIG (pot haver posat coses com: "algo con pollo y arroz", "pasta con tomate", "vull salmó per sopar", "recepta fàcil amb ous", "sopar ràpid", etc.).
2. NO COPIÏS MAI LA FRASE DE L'USUARI COM A TÍTOL!
3. Tu com a xef has de TROBAR la millor recepta i CREAR UN TÍTOL GASTRONÒMIC PROFESSIONAL I APETITÓS en català (per exemple: "Arròs melós de pollastre amb verdures de l'horta", "Tallarines fresques amb sofregit casolà de tomàquet i alfàbrega", "Suprema de salmó a la planxa amb guarnició cítrica", "Truita de patates tradicional ben suculenta").
4. Tot el contingut (títol, descripció, ingredients, passos) ha d'estar escrit en CATALÀ.
5. Quantitats realistes en grams, ml o unitats ajustades exactament per a ${servingsCount} persones.
6. Instruccions clares, pas a pas, fàcils de seguir.
7. Respon EXCLUSIVAMENT amb un JSON vàlid estructurat exactament així:
{
  "title": "Títol gastronòmic professional creat per tu (NO el text de l'usuari)",
  "description": "Descripció breu i molt atractiva",
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "servings": ${servingsCount},
  "calories": 450,
  "protein": 25,
  "carbs": 40,
  "fat": 15,
  "tags": ["Casolà", "Saludable"],
  "ingredients": [
    {"name": "Ingredient", "amount": 100, "unit": "g", "category": "produce"}
  ],
  "instructions": [
    "Pas 1", "Pas 2"
  ]
}
Categories vàlides per als ingredients: "produce", "dairy", "meat", "bakery", "pantry", "frozen", "beverages", "other".
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    let rawText = result.response.text().trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(rawText);

    // Ensure title is an authentic gastronomic title, never the user's raw prompt
    let finalTitle = parsed.title?.trim();
    if (!finalTitle || finalTitle.toLowerCase() === userIdea.toLowerCase()) {
      finalTitle = generateSmartRecipeFromPrompt({ ...params, dishName: userIdea }).title;
    }

    return {
      id: `rec-ai-${Date.now()}`,
      title: finalTitle,
      description: parsed.description || "Recepta personalitzada generada per la IA",
      complexity: params.complexity || (parsed.prepTimeMinutes + parsed.cookTimeMinutes > 35 ? "complex" : "simple"),
      prepTimeMinutes: parsed.prepTimeMinutes || 10,
      cookTimeMinutes: parsed.cookTimeMinutes || 15,
      servings: parsed.servings || servingsCount,
      calories: parsed.calories || 450,
      nutrition: {
        calories: parsed.calories || 450,
        protein: parsed.protein || 20,
        carbs: parsed.carbs || 45,
        fat: parsed.fat || 15,
      },
      tags: parsed.tags || [mealTypeStr, params.dietaryPreference || "mediterranean"],
      dietaryTags: [params.dietaryPreference || "mediterranean"],
      source: "ai",
      ingredients: (parsed.ingredients || []).map((ing: any, i: number) => ({
        id: `ing-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: ing.name,
        amount: ing.amount || 100,
        unit: ing.unit || "g",
        category: ing.category || "pantry",
      })),
      instructions: parsed.instructions || ["Cuinar i servir calent."],
    };
  } catch (error) {
    console.warn("Gemini API call failed or key invalid, using bespoke smart recipe generator:", error);
    return generateSmartRecipeFromPrompt(params);
  }
}

export async function suggestPantryRecipesWithAI(params: {
  pantryItems: string[];
  dietaryPreference?: string;
  customApiKey?: string;
}): Promise<Recipe[]> {
  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey || params.pantryItems.length === 0) {
    return params.pantryItems.length > 0
      ? generateSmartPantryRecipes(params)
      : [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Ets un xef especialitzat en cuina d'aprofitament i antimalbaratament.
L'usuari té els següents ingredients al seu rebost/nevera:
${params.pantryItems.join(", ")}

Tots els textos han d'estar en CATALÀ.
Preferència alimentària: ${params.dietaryPreference || "Sense preferència específica"}.

Suggereix 3 receptes delicioses i fàcils que aprofitin prioritàriament aquests ingredients disponibles, minimitzant la necessitat de comprar més coses.

Respon EXCLUSIVAMENT amb un array JSON de 3 receptes:
[
  {
    "title": "Títol de la recepta",
    "description": "Descripció",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 15,
    "servings": 2,
    "calories": 420,
    "protein": 20,
    "carbs": 50,
    "fat": 14,
    "tags": ["Aprofitament", "Ràpid"],
    "ingredients": [
      {"name": "Nom", "amount": 100, "unit": "g", "category": "pantry"}
    ],
    "instructions": ["Pas 1", "Pas 2"]
  }
]
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    let rawText = result.response.text().trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(rawText);

    return parsed.map((item: any, idx: number) => ({
      id: `pantry-rec-${idx}-${Date.now()}`,
      title: item.title,
      description: item.description,
      prepTimeMinutes: item.prepTimeMinutes || 10,
      cookTimeMinutes: item.cookTimeMinutes || 15,
      servings: item.servings || 2,
      calories: item.calories || 450,
      nutrition: {
        calories: item.calories || 450,
        protein: item.protein || 20,
        carbs: item.carbs || 50,
        fat: item.fat || 15,
      },
      tags: item.tags || ["Aprofitament"],
      dietaryTags: [params.dietaryPreference as DietaryPreference || "mediterranean"],
      source: "ai",
      ingredients: (item.ingredients || []).map((ing: any, i: number) => ({
        id: `ing-p-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: ing.name,
        amount: ing.amount || 100,
        unit: ing.unit || "g",
        category: ing.category || "pantry",
      })),
      instructions: item.instructions || ["Preparar i cuinar."],
    }));
  } catch (error) {
    console.warn("Pantry recipes AI error, using smart pantry generator fallback:", error);
    return params.pantryItems.length > 0
      ? generateSmartPantryRecipes(params)
      : [];
  }
}

function generateFallbackPlan(params: {
  dietaryPreference: DietaryPreference;
  targetCalories: number;
  householdSize: number;
  allergies?: string[];
  dislikes?: string[];
  notes?: string;
  recipes?: Recipe[];
}): WeeklyMealPlan {
  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const userCatalog = params.recipes || [];

  // CRITICAL REQUIREMENT: "nO ENERES EL MENUCON RECETAS QUE NO ESTEN EN BASE DE DATOS. Si no puedes completar el menu dejalo en blanco"
  if (userCatalog.length === 0) {
    return createEmptyMealPlan();
  }

  // Deduplicate by ID / title
  const uniqueCatalog: Recipe[] = [];
  const seenIds = new Set<string>();
  for (const r of userCatalog) {
    if (r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      uniqueCatalog.push(r);
    }
  }

  if (uniqueCatalog.length === 0) {
    return createEmptyMealPlan();
  }

  // Parse notes to detect dishes requested and frequencies
  const rawNotes = (params.notes || "").trim();
  const normNotes = rawNotes
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const isEveryDay = /(?:tots?\s+els?\s+dies|todos?\s+los?\s+dias|cada\s+dia|diari|diario|sempre|siempre|all\s+days|every\s+day)/i.test(normNotes);

  let targetMealType: "lunch" | "dinner" | "breakfast" | "both_lunch_dinner" = "lunch";
  if (/\b(?:sopar|sopars|cena|cenas|dinner)\b/i.test(normNotes)) {
    targetMealType = "dinner";
  } else if (/\b(?:esmorzar|esmorzars|desayuno|desayunos|breakfast)\b/i.test(normNotes)) {
    targetMealType = "breakfast";
  } else if (/\b(?:dinar\s+i\s+sopar|comida\s+y\s+cena|ambdos|ambdós)\b/i.test(normNotes)) {
    targetMealType = "both_lunch_dinner";
  }

  // Find requested recipe ONLY from the database
  let requestedRecipe: Recipe | null = null;
  if (normNotes.length > 0) {
    for (const r of uniqueCatalog) {
      const normTitle = r.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const words = normTitle.split(/\s+/).filter((w) => w.length >= 4);
      if (words.some((w) => normNotes.includes(w)) || normNotes.includes(normTitle)) {
        requestedRecipe = r;
        break;
      }
    }
  }

  // Filter recipes from database: breakfasts vs mains
  const breakfasts = uniqueCatalog.filter(
    (r) =>
      r.tags?.some((t) => /esmorzar|desayuno|breakfast|dolç/i.test(t)) ||
      /iogurt|torrad|cereal|porridge|pancake/i.test(r.title)
  );

  const allMains = uniqueCatalog.filter(
    (r) => !r.tags?.some((t) => /esmorzar|desayuno|breakfast/i.test(t))
  );

  // Prioritize simple recipes for weekly plan
  const simpleMains = allMains.filter((r) => (r.complexity || "simple") === "simple");
  const mainsPool = simpleMains.length > 0 ? simpleMains : allMains;

  const slots: MealSlot[] = [];
  let mainIndex = 0;

  days.forEach((day, dayIndex) => {
    // 1. Breakfast: ONLY if breakfast recipes exist in user database, else leave BLANK
    let bRecipe: Recipe | undefined = undefined;
    if (breakfasts.length > 0) {
      bRecipe = breakfasts[dayIndex % breakfasts.length];
    }

    slots.push({
      id: `slot-${day}-b-${dayIndex}`,
      day,
      mealType: "breakfast",
      recipeId: bRecipe ? bRecipe.id : undefined,
      recipe: bRecipe,
      isCompleted: false,
    });

    // 2. Lunch:
    let lRecipe: Recipe | undefined = undefined;
    if (requestedRecipe && (isEveryDay || normNotes.includes("dinar") || normNotes.includes("comida") || (!normNotes.includes("sopar") && !normNotes.includes("cena")))) {
      lRecipe = requestedRecipe;
    } else if (requestedRecipe && dayIndex === 0) {
      lRecipe = requestedRecipe;
    } else if (mainsPool.length > 0) {
      lRecipe = mainsPool[mainIndex % mainsPool.length];
      mainIndex++;
    }

    slots.push({
      id: `slot-${day}-l-${dayIndex}`,
      day,
      mealType: "lunch",
      recipeId: lRecipe ? lRecipe.id : undefined,
      recipe: lRecipe,
      isCompleted: false,
    });

    // 3. Dinner:
    let dRecipe: Recipe | undefined = undefined;
    if (requestedRecipe && (isEveryDay || targetMealType === "dinner" || targetMealType === "both_lunch_dinner") && (normNotes.includes("sopar") || normNotes.includes("cena") || targetMealType === "dinner")) {
      dRecipe = requestedRecipe;
    } else if (mainsPool.length > 1) {
      const candidates = mainsPool.filter((m) => m.id !== lRecipe?.id);
      if (candidates.length > 0) {
        dRecipe = candidates[mainIndex % candidates.length];
        mainIndex++;
      } else {
        dRecipe = mainsPool[mainIndex % mainsPool.length];
        mainIndex++;
      }
    } else if (mainsPool.length === 1 && !lRecipe) {
      dRecipe = mainsPool[0];
    }
    // If not enough recipes, leaves BLANK

    slots.push({
      id: `slot-${day}-d-${dayIndex}`,
      day,
      mealType: "dinner",
      recipeId: dRecipe ? dRecipe.id : undefined,
      recipe: dRecipe,
      isCompleted: false,
    });
  });

  return {
    id: `plan-${Date.now()}`,
    title: `Menú Setmanal (${params.dietaryPreference})`,
    weekStartDate: new Date().toISOString().split("T")[0],
    householdSize: params.householdSize,
    targetDailyCalories: params.targetCalories,
    dietaryPreference: params.dietaryPreference,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slots,
  };
}

// --- URL RECIPE EXTRACTION HELPERS & FUNCTION ---

function extractJsonLdRecipes(html: string): any[] {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const recipes: any[] = [];
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (
          item &&
          (item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe")))
        ) {
          recipes.push(item);
        }
      }
    } catch {
      // ignore JSON parse error in individual script tag
    }
  }
  return recipes;
}

function extractCleanPageText(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|article|section)>/gi, "\n");
  text = text.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n+/g, "\n\n");
  return text.trim().slice(0, 15000);
}

function parseIsoDuration(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== "string") return null;
  const match = durationStr.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

export async function extractRecipeFromUrlWithAI(params: {
  url: string;
  customApiKey?: string;
  servings?: number;
  complexity?: "simple" | "complex";
}): Promise<Recipe> {
  const trimmedUrl = params.url.trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error("L'adreça URL no és vàlida. Ha de començar per http:// o https://");
  }

  // 1. Fetch webpage
  let html = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(trimmedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ca,es;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`El servidor ha respost amb el codi d'estat ${res.status}`);
    }
    html = await res.text();
  } catch (fetchErr: any) {
    throw new Error(
      `No s'ha pogut accedir a la URL indicada (${fetchErr.message || "error de connexió"}). Comprova que l'enllaç sigui públic i estigui actiu.`
    );
  }

  // 2. Extract structured JSON-LD recipes if available
  const jsonLdRecipes = extractJsonLdRecipes(html);
  const jsonLdData = jsonLdRecipes.length > 0 ? JSON.stringify(jsonLdRecipes[0], null, 2) : "";

  // 3. Extract cleaned text content
  const pageText = extractCleanPageText(html);

  // 4. Try AI generation with Gemini
  const apiKey = getApiKey(params.customApiKey);
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Ets un xef professional i expert culinari multilingüe de màxima precisió.
L'usuari t'ha proporcionat l'enllaç web d'una recepta: "${trimmedUrl}"

Hem extret les dades i el contingut de la pàgina web:
${jsonLdData ? `--- METADADES DE RECEPTA DETECTADES (JSON-LD) ---\n${jsonLdData.slice(0, 5000)}\n------------------------------------------------` : ""}
--- TEXT DE LA PÀGINA WEB ---
${pageText.slice(0, 10000)}
-----------------------------

INSTRUCCIONS DE MÀXIMA IMPORTÀNCIA:
1. Analitza la informació de la recepta i extreu-ne tots els detalls.
2. Tradueix o redacta tot el contingut en CATALÀ natural i correcte (títol, descripció, ingredients, passos).
3. Adapta les racions a: ${params.servings || 2} persones (ajustant proporcionalment les quantitats dels ingredients).
4. El títol ha de ser clar, gastronòmic i professional (ex: "Arròs negre amb sípia i allioli", "Pollastre al curri amb llet de coco", etc.).
5. No incloguis mai fotografies ni enllaços d'imatge a la resposta.
6. Avalua la complexitat: si la recepta requereix tècniques avançades o més de 35 minuts posa "complex", si és fàcil i ràpida del dia a dia posa "simple".${params.complexity ? ` (L'usuari ha demanat preferentment complexitat "${params.complexity}")` : ""}
7. Detecta el tipus d'aliment per a l'atribut "foodIcon": "pasta", "rice", "fish", "meat", "legumes", "salad", "soup", "eggs", "vegetables", "dessert", "breakfast", o "other".
8. Classifica cada ingredient en una categoria: "produce", "dairy", "meat", "bakery", "pantry", "frozen", "beverages", o "other".

Respon EXCLUSIVAMENT amb un JSON vàlid amb aquesta estructura exacta:
{
  "title": "Nom de la recepta en català",
  "description": "Breu resum atractiu del plat",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "servings": ${params.servings || 2},
  "calories": 450,
  "protein": 22,
  "carbs": 45,
  "fat": 16,
  "complexity": "${params.complexity || "simple"}",
  "foodIcon": "pasta",
  "tags": ["Pasta", "Casolà"],
  "dietaryTags": ["mediterranean"],
  "ingredients": [
    { "name": "Nom ingredient", "amount": 100, "unit": "g", "category": "produce" }
  ],
  "instructions": [
    "Primer pas detallat...",
    "Segon pas detallat..."
  ]
}
`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      let rawText = result.response.text().trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(rawText);

      return {
        id: `rec-url-${Date.now()}`,
        title: parsed.title || "Recepta importada",
        description: parsed.description || `Recepta importada des de ${new URL(trimmedUrl).hostname}`,
        prepTimeMinutes: Number(parsed.prepTimeMinutes) || 15,
        cookTimeMinutes: Number(parsed.cookTimeMinutes) || 20,
        servings: Number(parsed.servings) || params.servings || 2,
        calories: Number(parsed.calories) || 450,
        nutrition: {
          calories: Number(parsed.calories) || 450,
          protein: Number(parsed.protein) || 20,
          carbs: Number(parsed.carbs) || 45,
          fat: Number(parsed.fat) || 15,
        },
        complexity: params.complexity || parsed.complexity || "simple",
        foodIcon: parsed.foodIcon || "other",
        tags: Array.isArray(parsed.tags) ? parsed.tags : ["Importada"],
        dietaryTags: Array.isArray(parsed.dietaryTags) ? parsed.dietaryTags : ["mediterranean"],
        source: "custom",
        ingredients: (parsed.ingredients || []).map((ing: any, i: number) => ({
          id: `ing-url-${i}-${Math.random().toString(36).substring(2, 6)}`,
          name: ing.name || "Ingredient",
          amount: Number(ing.amount) || 1,
          unit: ing.unit || "unitat",
          category: ing.category || "pantry",
        })),
        instructions:
          Array.isArray(parsed.instructions) && parsed.instructions.length > 0
            ? parsed.instructions
            : ["Preparar i cuinar seguint les indicacions originals."],
      };
    } catch (aiErr) {
      console.warn("Error en el processament de Gemini per a la URL, passant al processador de seguretat:", aiErr);
    }
  }

  // 5. Fallback: If no Gemini key or Gemini had an issue, extract directly from JSON-LD schema
  if (jsonLdRecipes.length > 0) {
    const raw = jsonLdRecipes[0];
    const prepMinutes = parseIsoDuration(raw.prepTime) || 15;
    const cookMinutes = parseIsoDuration(raw.cookTime) || 20;

    let steps: string[] = [];
    if (Array.isArray(raw.recipeInstructions)) {
      steps = raw.recipeInstructions
        .map((step: any) => (typeof step === "string" ? step : step.text || step.name || ""))
        .filter(Boolean);
    } else if (typeof raw.recipeInstructions === "string") {
      steps = raw.recipeInstructions.split("\n").map((s: string) => s.trim()).filter(Boolean);
    }

    const rawIngredients: string[] = Array.isArray(raw.recipeIngredient) ? raw.recipeIngredient : [];
    const parsedIngredients = rawIngredients.map((item, idx) => {
      const match = item.match(/^([\d.,\/\s]+)?\s*([a-zA-Zà-úÀ-Ú]+)?\s+(?:de\s+)?(.+)$/);
      return {
        id: `ing-jsonld-${idx}`,
        name: match ? match[3].trim() : item,
        amount: match && match[1] ? parseFloat(match[1].replace(",", ".")) || 1 : 1,
        unit: match && match[2] ? match[2].trim() : "unitat",
        category: "pantry" as const,
      };
    });

    const isComplex = prepMinutes + cookMinutes > 35 || steps.length > 6;

    let host = "";
    try {
      host = new URL(trimmedUrl).hostname;
    } catch {
      host = trimmedUrl;
    }

    return {
      id: `rec-url-${Date.now()}`,
      title: raw.name || "Recepta importada",
      description: raw.description || `Recepta importada des de ${host}`,
      prepTimeMinutes: prepMinutes,
      cookTimeMinutes: cookMinutes,
      servings: params.servings || parseInt(raw.recipeYield) || 2,
      calories: parseInt(raw.nutrition?.calories) || 450,
      nutrition: {
        calories: parseInt(raw.nutrition?.calories) || 450,
        protein: 20,
        carbs: 45,
        fat: 15,
      },
      complexity: params.complexity || (isComplex ? "complex" : "simple"),
      tags: ["Importada"],
      dietaryTags: ["mediterranean"],
      source: "custom",
      ingredients:
        parsedIngredients.length > 0
          ? parsedIngredients
          : [{ id: "1", name: "Ingredients segons la recepta", amount: 1, unit: "unitat", category: "other" }],
      instructions: steps.length > 0 ? steps : ["Seguir les instruccions de la font."],
    };
  }

  throw new Error(
    "No s'ha pogut extreure automàticament la recepta d'aquesta pàgina web. Comprova que l'enllaç sigui correcte o introdueix la teva clau de Gemini a Configuració per a una extracció intel·ligent avançada."
  );
}
