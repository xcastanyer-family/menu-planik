import { GoogleGenerativeAI } from "@google/generative-ai";
import { Recipe, WeeklyMealPlan, MealSlot, DayOfWeek, MealType, DietaryPreference } from "@/types";
import { INITIAL_RECIPES } from "@/lib/storage/mock-data";

function getApiKey(customKey?: string): string | null {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key-here" || key.trim() === "") {
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

    const prompt = `
Ets un xef i nutricionista expert. Genera un pla de menjars setmanal (de Dilluns a Diumenge) complet i equilibrat amb Esmorzar, Dinar i Sopar per a cada dia.
Tots els textos (títols, descripcions, ingredients, instruccions) han d'estar en CATALÀ.

Preferències de l'usuari:
- Dieta: ${params.dietaryPreference}
- Calories diàries estimades per persona: aprox ${params.targetCalories} kcal
- Nombre de persones (racions): ${params.householdSize}
- Al·lèrgies a evitar estrictament: ${params.allergies?.join(", ") || "Cap"}
- Ingredients no desitjats: ${params.dislikes?.join(", ") || "Cap"}
- Notes especials: ${params.notes || "Cap"}

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

    const responseText = result.response.text();
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

        const recipeId = `ai-rec-${Math.random().toString(36).substring(2, 9)}`;
        const recipe: Recipe = {
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
  mealType: MealType;
  day: DayOfWeek;
  dietaryPreference: DietaryPreference;
  notes?: string;
  customApiKey?: string;
}): Promise<Recipe> {
  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey) {
    // Pick or alter curated recipe
    const matches = INITIAL_RECIPES.filter((r) => r.dietaryTags.includes(params.dietaryPreference) || r.dietaryTags.includes("mediterranean"));
    const selected = matches[Math.floor(Math.random() * matches.length)] || INITIAL_RECIPES[0];
    return {
      ...selected,
      id: `rec-alt-${Date.now()}`,
      title: `${selected.title} (Suggeriment del Xef)`,
      source: "ai",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Ets un xef expert. Suggereix una única recepta per a un àpat de tipus "${params.mealType}" per al dia "${params.day}".
Tot el contingut ha d'estar escrit en CATALÀ.
Preferència alimentària: ${params.dietaryPreference}.
Notes especials de l'usuari: ${params.notes || "Una opció saborosa, ràpida i equilibrada"}.

Respon EXCLUSIVAMENT amb un JSON vàlid estructurat així:
{
  "title": "Títol de la recepta",
  "description": "Descripció breu i atractiva",
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "servings": 2,
  "calories": 450,
  "protein": 25,
  "carbs": 40,
  "fat": 15,
  "tags": ["Ràpid", "Saludable"],
  "ingredients": [
    {"name": "Ingredient", "amount": 100, "unit": "g", "category": "produce"}
  ],
  "instructions": [
    "Pas 1", "Pas 2"
  ]
}
Categories possibles per als ingredients: "produce", "dairy", "meat", "bakery", "pantry", "frozen", "beverages", "other".
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(result.response.text());
    return {
      id: `rec-ai-${Date.now()}`,
      title: parsed.title,
      description: parsed.description || "Recepta recomanada per la IA",
      prepTimeMinutes: parsed.prepTimeMinutes || 10,
      cookTimeMinutes: parsed.cookTimeMinutes || 15,
      servings: parsed.servings || 2,
      calories: parsed.calories || 450,
      nutrition: {
        calories: parsed.calories || 450,
        protein: parsed.protein || 20,
        carbs: parsed.carbs || 45,
        fat: parsed.fat || 15,
      },
      tags: parsed.tags || [params.mealType, params.dietaryPreference],
      dietaryTags: [params.dietaryPreference],
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
    console.error("Meal alternative AI error:", error);
    const fallback = INITIAL_RECIPES[0];
    return { ...fallback, id: `rec-fallback-${Date.now()}`, source: "ai" };
  }
}

export async function suggestPantryRecipesWithAI(params: {
  pantryItems: string[];
  dietaryPreference?: string;
  customApiKey?: string;
}): Promise<Recipe[]> {
  const apiKey = getApiKey(params.customApiKey);

  if (!apiKey || params.pantryItems.length === 0) {
    return INITIAL_RECIPES.slice(0, 3);
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

    const parsed = JSON.parse(result.response.text());
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
    console.error("Pantry recipes AI error:", error);
    return INITIAL_RECIPES.slice(0, 3);
  }
}

function generateFallbackPlan(params: {
  dietaryPreference: DietaryPreference;
  targetCalories: number;
  householdSize: number;
}): WeeklyMealPlan {
  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const slots: MealSlot[] = [];

  const breakfasts = INITIAL_RECIPES.filter((r) => r.tags.includes("Esmorzar") || r.tags.includes("Brunch"));
  const mains = INITIAL_RECIPES.filter((r) => !r.tags.includes("Esmorzar") && !r.tags.includes("Brunch"));

  days.forEach((day, index) => {
    const bRecipe = breakfasts[index % breakfasts.length] || INITIAL_RECIPES[3];
    const lRecipe = mains[(index * 2) % mains.length] || INITIAL_RECIPES[0];
    const dRecipe = mains[(index * 2 + 1) % mains.length] || INITIAL_RECIPES[1];

    slots.push({
      id: `slot-${day}-b-${index}`,
      day: day,
      mealType: "breakfast",
      recipeId: bRecipe.id,
      recipe: bRecipe,
    });
    slots.push({
      id: `slot-${day}-l-${index}`,
      day: day,
      mealType: "lunch",
      recipeId: lRecipe.id,
      recipe: lRecipe,
    });
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
