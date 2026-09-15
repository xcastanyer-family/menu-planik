import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_RECIPES } from "@/lib/storage/mock-data";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  const rawValue = match ? match.substring(SESSION_COOKIE_NAME.length + 1) : null;
  return parseSessionCookie(rawValue);
}

function mapDbToRecipe(row: any) {
  return {
    id: row.id,
    familyId: row.family_id,
    authorName: row.author_name,
    title: row.title,
    description: row.description || "",
    prepTimeMinutes: row.prep_time_minutes || 0,
    cookTimeMinutes: row.cook_time_minutes || 0,
    servings: row.servings || 2,
    calories: row.calories || 0,
    nutrition: row.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    tags: row.tags || [],
    dietaryTags: row.dietary_tags || [],
    ingredients: row.ingredients || [],
    instructions: row.instructions || [],
    imageUrl: row.image_url,
    source: row.source || "custom",
    difficulty: row.difficulty || "easy",
    moderationStatus: row.moderation_status || "private",
    isPublic: Boolean(row.is_public),
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: true, recipes: [] });
  }

  try {
    const { data, error } = await adminClient
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipes: (data || []).map(mapDbToRecipe) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminClient = createAdminClient();
  try {
    const session = getSessionFromRequest(request);
    if (session) {
      const canModify = session.role === "superadmin" || session.role === "admin" || session.canModify === true;
      if (!canModify) {
        return NextResponse.json(
          { success: false, error: "No disposes de permisos per donar d'alta o modificar receptes." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const recipe = body.recipe;
    if (!recipe || !recipe.title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    if (!adminClient) {
      return NextResponse.json({ success: true, recipe });
    }

    const payload = {
      author_name: recipe.authorName || "Anònim",
      title: recipe.title,
      description: recipe.description || "",
      prep_time_minutes: Number(recipe.prepTimeMinutes) || 0,
      cook_time_minutes: Number(recipe.cookTimeMinutes) || 0,
      servings: Number(recipe.servings) || 2,
      calories: Number(recipe.calories) || 0,
      nutrition: recipe.nutrition || {},
      tags: recipe.tags || [],
      dietary_tags: recipe.dietaryTags || [],
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      image_url: recipe.imageUrl || null,
      source: recipe.source || "custom",
      difficulty: recipe.difficulty || "easy",
      moderation_status: recipe.moderationStatus || "private",
      is_public: Boolean(recipe.isPublic),
    };

    const { data, error } = await adminClient
      .from("recipes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipe: mapDbToRecipe(data) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminClient = createAdminClient();
  try {
    const session = getSessionFromRequest(request);
    if (session) {
      const canModify = session.role === "superadmin" || session.role === "admin" || session.canModify === true;
      if (!canModify) {
        return NextResponse.json(
          { success: false, error: "No disposes de permisos per donar d'alta o modificar receptes." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const recipe = body.recipe;
    if (!recipe || !recipe.id) {
      return NextResponse.json({ success: false, error: "Recipe ID is required" }, { status: 400 });
    }

    if (!adminClient) {
      return NextResponse.json({ success: true, recipe });
    }

    const payload = {
      title: recipe.title,
      description: recipe.description || "",
      prep_time_minutes: Number(recipe.prepTimeMinutes) || 0,
      cook_time_minutes: Number(recipe.cookTimeMinutes) || 0,
      servings: Number(recipe.servings) || 2,
      calories: Number(recipe.calories) || 0,
      nutrition: recipe.nutrition || {},
      tags: recipe.tags || [],
      dietary_tags: recipe.dietaryTags || [],
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      image_url: recipe.imageUrl || null,
      difficulty: recipe.difficulty || "easy",
      moderation_status: recipe.moderationStatus || (recipe.isPublic ? "approved_public" : "private"),
      is_public: Boolean(recipe.isPublic),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe.id);
    if (isUuid) {
      const { data, error } = await adminClient
        .from("recipes")
        .update(payload)
        .eq("id", recipe.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, recipe: mapDbToRecipe(data) });
    }

    return NextResponse.json({ success: true, recipe });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminClient = createAdminClient();
  try {
    const session = getSessionFromRequest(request);
    if (session && session.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Només el Superadministrador pot eliminar receptes de la plataforma." },
        { status: 403 }
      );
    }

    const { recipeId } = await request.json();
    if (!recipeId) {
      return NextResponse.json({ success: false, error: "recipeId is required" }, { status: 400 });
    }

    if (adminClient) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId);
      if (isUuid) {
        const { error } = await adminClient.from("recipes").delete().eq("id", recipeId);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Recepta eliminada correctament." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
