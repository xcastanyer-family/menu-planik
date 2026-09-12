import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GroceryCategory, Product } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

function mapDbToProduct(row: any): Product {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    brand: row.brand || undefined,
    barcode: row.barcode || undefined,
    category: row.category || "other",
    defaultUnit: row.default_unit || "u.",
    packageSize: row.package_size ? Number(row.package_size) : undefined,
    imageUrl: row.image_url || undefined,
    nutrition: row.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    allergens: row.allergens || [],
    notes: row.notes || undefined,
    source: row.source || "database",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

/**
 * Consulta l'API pública de Open Food Facts per obtenir informació del producte
 */
async function fetchOpenFoodFacts(barcode: string) {
  try {
    const cleanBarcode = barcode.replace(/\D/g, "");
    if (!cleanBarcode || cleanBarcode.length < 8) return null;

    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`, {
      headers: { "User-Agent": "MenuPlanik-AI/1.0 (info@menuplanik.cat)" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name =
      p.product_name_ca ||
      p.product_name_es ||
      p.product_name ||
      p.generic_name ||
      "Producte desconegut";

    // Mapeig de categoria
    const categoriesTags = (p.categories_tags || []).join(" ").toLowerCase();
    let category: GroceryCategory = "other";
    if (/dairy|milk|cheese|yogurt|lait|lacteo|leche|queso/.test(categoriesTags)) category = "dairy";
    else if (/meat|fish|poultry|viande|charcuterie|carne|pescado|pollo/.test(categoriesTags)) category = "meat";
    else if (/fruit|vegetable|legume|verdura|fruta/.test(categoriesTags)) category = "produce";
    else if (/bread|bakery|pastry|boulangerie|pan|galleta/.test(categoriesTags)) category = "bakery";
    else if (/cereal|pasta|rice|spices|epicerie|arroz|legumbre/.test(categoriesTags)) category = "pantry";
    else if (/frozen|surge|congelado/.test(categoriesTags)) category = "frozen";
    else if (/beverage|drink|boisson|bebida|agua|juice/.test(categoriesTags)) category = "beverages";

    const nutriments = p.nutriments || {};
    const calories = Math.round(Number(nutriments["energy-kcal_100g"] || (Number(nutriments["energy_100g"]) / 4.184) || 0));
    const protein = Math.round(Number(nutriments.proteins_100g || 0) * 10) / 10;
    const carbs = Math.round(Number(nutriments.carbohydrates_100g || 0) * 10) / 10;
    const fat = Math.round(Number(nutriments.fat_100g || 0) * 10) / 10;
    const fiber = Math.round(Number(nutriments.fiber_100g || 0) * 10) / 10;

    return {
      barcode: cleanBarcode,
      name,
      brand: p.brands || undefined,
      category,
      imageUrl: p.image_front_url || p.image_url || undefined,
      packageSize: p.product_quantity ? Number(p.product_quantity) : undefined,
      defaultUnit: p.quantity ? (p.quantity.includes("kg") ? "kg" : p.quantity.includes("g") ? "g" : p.quantity.includes("l") ? "l" : p.quantity.includes("ml") ? "ml" : "u.") : "u.",
      nutrition: { calories, protein, carbs, fat, fiber },
      allergens: (p.allergens_tags || []).map((a: string) => a.replace(/^[a-z]+:/i, "")),
      source: "barcode",
    };
  } catch (err) {
    console.warn("Open Food Facts fetch error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, barcode, customApiKey } = body;

    if (!imageBase64 && !barcode) {
      return NextResponse.json(
        { success: false, error: "Cal proporcionar una imatge o un codi de barres" },
        { status: 400 }
      );
    }

    // 1. Primer de tot: Comprovem si aquest producte JA existeix a la nostra base de dades!
    if (barcode) {
      const cleanBarcode = barcode.replace(/\D/g, "") || barcode.trim();
      const adminClient = createAdminClient();
      if (adminClient) {
        try {
          const { data: dbProduct } = await adminClient
            .from("products")
            .select("*")
            .eq("barcode", cleanBarcode)
            .maybeSingle();

          if (dbProduct) {
            return NextResponse.json({
              success: true,
              existsInDb: true,
              product: mapDbToProduct(dbProduct),
              source: "database",
            });
          }
        } catch (dbErr) {
          console.warn("Error consultant producte existent a la BD:", dbErr);
        }
      }

      // Si no és a la BD, intentem Open Food Facts directament (no requereix Gemini!)
      const offResult = await fetchOpenFoodFacts(cleanBarcode);
      if (offResult) {
        return NextResponse.json({
          success: true,
          existsInDb: false,
          product: offResult,
          source: "open_food_facts",
        });
      }
    }

    // 2. Anàlisi multimodal amb Gemini 1.5 Flash si hi ha clau disponible
    const apiKey = getApiKey(customApiKey);
    if (!apiKey) {
      // Si tenim codi de barres però no era a Open Food Facts, retornem plantilla de producte amb el codi
      if (barcode) {
        return NextResponse.json({
          success: true,
          existsInDb: false,
          product: {
            name: "Producte (" + barcode + ")",
            barcode,
            category: "other",
            defaultUnit: "u.",
            source: "barcode",
          },
        });
      }

      // Si no tenim codi de barres ni clau Gemini
      return NextResponse.json(
        {
          success: false,
          needBarcodeNumber: true,
          error: "No s'ha pogut llegir el codi de barres automàticament de la fotografia. Introdueix el número sota les barres (ex: 8410100...) o configura la teva clau Gemini a Perfil.",
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let detectedBarcode: string | null = barcode || null;
    let extractedProduct: any = null;

    if (imageBase64) {
      // Parse data URL if needed
      let mimeType = "image/jpeg";
      let pureBase64 = imageBase64;
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        pureBase64 = match[2];
      }

      const prompt = `
Analitza aquesta imatge que conté un codi de barres o un producte comercial d'alimentació / supermercat.
TASCA:
1. Si hi ha un codi de barres (les barres negres paral·leles o els números impresos a sota com EAN-13, UPC, etc.), llegeix exactament els dígits (ex: "8410100012345").
2. Identifica el text i disseny de l'envàs:
   - Nom del producte (ex: "Llet sencera", "Macarrons ploma", "Tomàquet triturat", "Formatge ratllat")
   - Marca (ex: "Hacendado", "Pascual", "Gallo", "Danone", "Casa Tarradellas")
   - Categoria: selecciona estrictament una d'aquestes: 'produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'beverages', 'other'.
   - Unitat per defecte: 'g', 'kg', 'ml', 'l', 'u.'
   - Mida del paquet (número en grams o mil·lilitres si surt a l'envàs, ex: 1000, 500, etc.)
   - Valors nutricionals estimats per 100g (calories, protein, carbs, fat, fiber)
   - Al·lèrgens (ex: ["gluten", "llet", "soja"])

Respon EXCLUSIVAMENT amb un objecte JSON vàlid amb aquest format:
{
  "barcode": "dígits del codi de barres o null",
  "name": "Nom comercial del producte",
  "brand": "Marca o fabricant",
  "category": "produce | dairy | meat | bakery | pantry | frozen | beverages | other",
  "defaultUnit": "g | kg | ml | l | u.",
  "packageSize": 1000,
  "calories": 65,
  "protein": 3.2,
  "carbs": 4.8,
  "fat": 3.6,
  "fiber": 0,
  "allergens": ["llet"],
  "notes": "Informació addicional rellevant de l'envàs"
}
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: pureBase64,
          },
        },
      ]);

      let text = result.response.text().trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }

      try {
        extractedProduct = JSON.parse(text);
        if (extractedProduct.barcode) {
          detectedBarcode = String(extractedProduct.barcode).replace(/\D/g, "");
        }
      } catch (parseErr) {
        console.error("Error parsejant resposta de Gemini:", parseErr, text);
      }
    }

    // 3. Si Gemini ha detectat un codi de barres, comprovem la BD primer i després Open Food Facts
    if (detectedBarcode && detectedBarcode.length >= 8) {
      const adminClient = createAdminClient();
      if (adminClient) {
        try {
          const { data: dbProduct } = await adminClient
            .from("products")
            .select("*")
            .eq("barcode", detectedBarcode)
            .maybeSingle();

          if (dbProduct) {
            return NextResponse.json({
              success: true,
              existsInDb: true,
              product: mapDbToProduct(dbProduct),
              source: "database",
            });
          }
        } catch (dbErr) {
          console.warn("Error consultant producte detectat a la BD:", dbErr);
        }
      }

      const offData = await fetchOpenFoodFacts(detectedBarcode);
      if (offData) {
        return NextResponse.json({
          success: true,
          existsInDb: false,
          product: {
            ...extractedProduct,
            ...offData,
            name: offData.name || extractedProduct?.name || "Producte desconegut",
            barcode: detectedBarcode,
            source: "barcode",
          },
          source: "open_food_facts_enriched",
        });
      }
    }

    // 4. Retornem el resultat de Gemini
    if (extractedProduct) {
      return NextResponse.json({
        success: true,
        product: {
          name: extractedProduct.name || "Producte escanejat",
          brand: extractedProduct.brand || undefined,
          barcode: detectedBarcode || undefined,
          category: extractedProduct.category || "other",
          defaultUnit: extractedProduct.defaultUnit || "u.",
          packageSize: extractedProduct.packageSize || undefined,
          nutrition: {
            calories: Number(extractedProduct.calories) || 0,
            protein: Number(extractedProduct.protein) || 0,
            carbs: Number(extractedProduct.carbs) || 0,
            fat: Number(extractedProduct.fat) || 0,
            fiber: Number(extractedProduct.fiber) || 0,
          },
          allergens: Array.isArray(extractedProduct.allergens) ? extractedProduct.allergens : [],
          notes: extractedProduct.notes || undefined,
          source: detectedBarcode ? "barcode" : "ai",
        },
        source: "gemini_vision",
      });
    }

    return NextResponse.json(
      { success: false, error: "No s'ha pogut extreure informació de la imatge proporcionada." },
      { status: 422 }
    );
  } catch (err: any) {
    console.error("Error a /api/ai/scan-product:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

