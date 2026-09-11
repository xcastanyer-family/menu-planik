import { GoogleGenerativeAI } from "@google/generative-ai";
import { Recipe, WeeklyMealPlan, MealSlot, DayOfWeek, MealType, DietaryPreference } from "@/types";
import { INITIAL_RECIPES } from "@/lib/storage/mock-data";
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
  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey) {
    // Generate intelligent simulated plan using available recipe database and permutations
    return generateFallbackPlan(params);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const userRecipesSummary =
      params.recipes && params.recipes.length > 0
        ? `\nRECEPTES DISPONIBLES AL RECEPTARI DE L'USUARI (PRIORITZA-LES I FES-LES SERVIR):\n` +
          params.recipes
            .slice(0, 20)
            .map((r) => `- "${r.title}" (tags: ${r.tags?.join(", ") || ""})`)
            .join("\n")
        : "";

    const prompt = `
Ets un xef i nutricionista expert de màxima precisió. Genera un pla de menjars setmanal (de Dilluns a Diumenge) complet i equilibrat.
IMPORTANTÍSSIM: Els àpats clau i protagonistes de l'aplicació són el DINAR i el SOPAR. L'Esmorzar ha de ser una idea/suggeriment ràpid i senzill d'esmorzar del dia (ex: torrades amb alvocat, iogurt amb nous i fruita, civada, ous remenats).
Tots els textos (títols, descripcions, ingredients, instruccions) han d'estar en CATALÀ.

Preferències de l'usuari:
- Dieta: ${params.dietaryPreference}
- Calories diàries estimades per persona: aprox ${params.targetCalories} kcal
- Nombre de persones (racions): ${params.householdSize}
- Al·lèrgies a evitar estrictament: ${params.allergies?.join(", ") || "Cap"}
- Ingredients no desitjats: ${params.dislikes?.join(", ") || "Cap"}
- NOTES I INSTRUCCIONS ESPECÍFIQUES DE L'USUARI: ${params.notes || "Cap"}
${userRecipesSummary}

INSTRUCCIONS DE MÀXIMA OBLIGACIÓ:
1. Si l'usuari a les NOTES demana un plat concret o freqüència (per exemple: "todos los dias macarrones", "tots els dies macarrons", "dilluns i dimecres salmó", etc.):
   HAS D'INCLOURE AQUEST PLAT EXACTAMENT EN TOTS ELS DIES/ÀPATS INDICATS.
2. Si un plat demanat coincideix amb una recepta existent del receptari de l'usuari (ex: macarrons), UTILITZA EXACTAMENT aquest títol.
3. No ignoris mai el que l'usuari ha demanat a les notes.

Respon EXCLUSIVAMENT amb un JSON vàlid estructurat de la següent manera, sense markdown ni text addicional:
{
  "title": "Títol descriptiu del menú setmanal",
  "days": [
    {
      "day": "monday",
      "breakfast": {
        "title": "Nom esmorzar",
        "description": "Descripció breu",
        "prepTimeMinutes": 5,
        "cookTimeMinutes": 5,
        "calories": 350,
        "protein": 15,
        "carbs": 45,
        "fat": 10,
        "ingredients": [{"name": "Flocs de civada", "amount": 50, "unit": "g", "category": "pantry"}],
        "instructions": ["Pas 1", "Pas 2"]
      },
      "lunch": {
        "title": "Nom dinar",
        "description": "Descripció breu",
        "prepTimeMinutes": 10,
        "cookTimeMinutes": 15,
        "calories": 600,
        "protein": 30,
        "carbs": 70,
        "fat": 18,
        "ingredients": [{"name": "Pasta integral", "amount": 80, "unit": "g", "category": "pantry"}],
        "instructions": ["Pas 1", "Pas 2"]
      },
      "dinner": {
        "title": "Nom sopar",
        "description": "Descripció breu",
        "prepTimeMinutes": 10,
        "cookTimeMinutes": 15,
        "calories": 500,
        "protein": 35,
        "carbs": 25,
        "fat": 20,
        "ingredients": [{"name": "Filet de salmó", "amount": 180, "unit": "g", "category": "meat"}],
        "instructions": ["Pas 1", "Pas 2"]
      }
    }
  ]
}
Assegura't d'incloure els 7 dies: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".
Cada ingredient ha de tenir una "category" escollida entre: "produce", "dairy", "meat", "bakery", "pantry", "frozen", "beverages", "other".
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
      const dayData = parsed.days?.find((d: { day: string }) => d.day.toLowerCase() === dayKey) || parsed.days?.[daysOrder.indexOf(dayKey)];
      if (!dayData) return;

      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];
      mealTypes.forEach((mType) => {
        const meal = dayData[mType];
        if (!meal) return;

        // Check if meal title matches an existing user recipe
        const matchedExisting = params.recipes?.find(
          (r) => r.title.trim().toLowerCase() === meal.title.trim().toLowerCase()
        );

        const recipeId = matchedExisting?.id || `ai-rec-${Math.random().toString(36).substring(2, 9)}`;
        const recipe: Recipe = matchedExisting || {
          id: recipeId,
          title: meal.title,
          description: meal.description || `Deliciosa opció per a ${mType}`,
          prepTimeMinutes: meal.prepTimeMinutes || 10,
          cookTimeMinutes: meal.cookTimeMinutes || 15,
          servings: params.householdSize,
          calories: meal.calories || 450,
          nutrition: {
            calories: meal.calories || 450,
            protein: meal.protein || 20,
            carbs: meal.carbs || 50,
            fat: meal.fat || 15,
          },
          tags: [meal.title, mType, params.dietaryPreference],
          dietaryTags: [params.dietaryPreference],
          source: "ai",
          ingredients: (meal.ingredients || []).map((ing: { name: string; amount?: number; unit?: string; category?: string }, idx: number) => ({
            id: `ing-ai-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: ing.name,
            amount: ing.amount || 100,
            unit: ing.unit || "g",
            category: (ing.category as any) || "pantry",
          })),
          instructions: Array.isArray(meal.instructions) ? meal.instructions : ["Preparar els ingredients i coure."],
        };

        slots.push({
          id: `slot-${dayKey}-${mType}-${Math.random().toString(36).substring(2, 7)}`,
          day: dayKey,
          mealType: mType,
          recipeId: recipe.id,
          recipe: recipe,
        });
      });
    });

    return {
      id: `plan-${Date.now()}`,
      title: parsed.title || `Menú ${params.dietaryPreference} (${params.targetCalories} kcal)`,
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
      : INITIAL_RECIPES.slice(0, 3);
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
      : INITIAL_RECIPES.slice(0, 3);
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
  const slots: MealSlot[] = [];

  // Build unified recipe catalog
  const catalog = [...(params.recipes || []), ...INITIAL_RECIPES];
  const uniqueCatalog: Recipe[] = [];
  const seenKeys = new Set<string>();
  for (const r of catalog) {
    const key = r.title.trim().toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCatalog.push(r);
    }
  }

  // Parse notes to detect dishes requested and frequencies
  const rawNotes = (params.notes || "").trim();
  const normNotes = rawNotes
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Check frequency
  const isEveryDay = /(?:tots?\s+els?\s+dies|todos?\s+los?\s+dias|cada\s+dia|diari|diario|sempre|siempre|all\s+days|every\s+day)/i.test(normNotes);

  // Check target meal type
  let targetMealType: "lunch" | "dinner" | "breakfast" | "both_lunch_dinner" = "lunch";
  if (/\b(?:sopar|sopars|cena|cenas|dinner)\b/i.test(normNotes)) {
    targetMealType = "dinner";
  } else if (/\b(?:esmorzar|esmorzars|desayuno|desayunos|breakfast)\b/i.test(normNotes)) {
    targetMealType = "breakfast";
  } else if (/\b(?:dinar\s+i\s+sopar|comida\s+y\s+cena|ambdos|ambdós)\b/i.test(normNotes)) {
    targetMealType = "both_lunch_dinner";
  }

  // Find requested recipe
  let requestedRecipe: Recipe | null = null;

  if (normNotes.length > 0) {
    // 1. Direct match by words from title in user catalog first
    for (const r of uniqueCatalog) {
      const normTitle = r.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const words = normTitle.split(/\s+/).filter((w) => w.length >= 4);
      if (words.some((w) => normNotes.includes(w))) {
        requestedRecipe = r;
        break;
      }
    }

    // 2. Keyword match (e.g. "macarrones", "macarrons", "pasta", "arros")
    if (!requestedRecipe) {
      if (normNotes.includes("macarr") || normNotes.includes("pasta")) {
        const pastaRec = uniqueCatalog.find((r) => {
          const t = r.title.toLowerCase();
          return t.includes("macarr") || t.includes("pasta") || t.includes("espagueti");
        });
        if (pastaRec) {
          requestedRecipe = pastaRec;
        } else {
          requestedRecipe = generateSmartRecipeFromPrompt({
            notes: "Macarrons casolans amb salsa de tomàquet i carn",
            dietaryPreference: params.dietaryPreference,
          });
        }
      } else {
        requestedRecipe = generateSmartRecipeFromPrompt({
          notes: rawNotes,
          dietaryPreference: params.dietaryPreference,
        });
      }
    }
  }

  // Filter remaining recipes
  const breakfasts = uniqueCatalog.filter(
    (r) => r.tags.some((t) => t.toLowerCase().includes("esmorzar") || t.toLowerCase().includes("brunch") || t.toLowerCase().includes("dolç"))
  );
  const fallbackBreakfasts = breakfasts.length > 0 ? breakfasts : INITIAL_RECIPES.slice(3, 4);

  const mains = uniqueCatalog.filter(
    (r) => !r.tags.some((t) => t.toLowerCase().includes("esmorzar") || t.toLowerCase().includes("brunch"))
  );
  const fallbackMains = mains.length > 0 ? mains : INITIAL_RECIPES;

  days.forEach((day, index) => {
    // Breakfast
    const bRecipe = fallbackBreakfasts[index % fallbackBreakfasts.length];
    slots.push({
      id: `slot-${day}-b-${index}`,
      day: day,
      mealType: "breakfast",
      recipeId: bRecipe.id,
      recipe: bRecipe,
    });

    // Lunch
    let lRecipe: Recipe;
    if (requestedRecipe && (isEveryDay || normNotes.includes("dinar") || normNotes.includes("comida") || (!normNotes.includes("sopar") && !normNotes.includes("cena")))) {
      lRecipe = requestedRecipe;
    } else {
      lRecipe = fallbackMains[(index * 2) % fallbackMains.length];
    }

    slots.push({
      id: `slot-${day}-l-${index}`,
      day: day,
      mealType: "lunch",
      recipeId: lRecipe.id,
      recipe: lRecipe,
    });

    // Dinner
    let dRecipe: Recipe;
    if (requestedRecipe && (targetMealType === "dinner" || targetMealType === "both_lunch_dinner")) {
      dRecipe = requestedRecipe;
    } else {
      // Pick a dinner different from lunch
      const candidates = fallbackMains.filter((m) => m.id !== lRecipe.id);
      dRecipe = (candidates.length > 0 ? candidates : fallbackMains)[(index * 2 + 1) % (candidates.length || fallbackMains.length)];
    }

    slots.push({
      id: `slot-${day}-d-${index}`,
      day: day,
      mealType: "dinner",
      recipeId: dRecipe.id,
      recipe: dRecipe,
    });
  });

  return {
    id: `plan-${Date.now()}`,
    title: `Menú Setmanal ${params.dietaryPreference.toUpperCase()} (${params.targetCalories} kcal)`,
    weekStartDate: new Date().toISOString().split("T")[0],
    householdSize: params.householdSize,
    targetDailyCalories: params.targetCalories,
    dietaryPreference: params.dietaryPreference,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slots,
  };
}
