import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function mapDbToProduct(row: any) {
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
    source: row.source || "manual",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: true, products: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (barcode) {
      const { data, error } = await adminClient
        .from("products")
        .select("*")
        .eq("barcode", barcode.trim())
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        product: data ? mapDbToProduct(data) : null,
      });
    }

    const { data, error } = await adminClient
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json({
          success: true,
          products: [],
          tableMissing: true,
          message: "La taula 'products' no existeix a Supabase. Executa migration-products.sql a l'editor SQL.",
        });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      products: (data || []).map(mapDbToProduct),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const p = body.product;
    if (!p || !p.name?.trim()) {
      return NextResponse.json({ success: false, error: "El nom del producte és obligatori" }, { status: 400 });
    }

    const payload = {
      family_id: p.familyId || null,
      name: p.name.trim(),
      brand: p.brand?.trim() || null,
      barcode: p.barcode?.trim() || null,
      category: p.category || "other",
      default_unit: p.defaultUnit || "u.",
      package_size: p.packageSize ? Number(p.packageSize) : null,
      image_url: p.imageUrl || null,
      nutrition: p.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      allergens: p.allergens || [],
      notes: p.notes || null,
      source: p.source || "manual",
    };

    const { data, error } = await adminClient
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json(
          {
            success: false,
            tableMissing: true,
            error: "Cal crear la taula 'products' a Supabase executant lib/supabase/migration-products.sql a l'editor SQL de Supabase.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: mapDbToProduct(data) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const p = body.product;
    if (!p || !p.id) {
      return NextResponse.json({ success: false, error: "ID de producte necessari" }, { status: 400 });
    }

    const payload = {
      name: p.name.trim(),
      brand: p.brand?.trim() || null,
      barcode: p.barcode?.trim() || null,
      category: p.category || "other",
      default_unit: p.defaultUnit || "u.",
      package_size: p.packageSize ? Number(p.packageSize) : null,
      image_url: p.imageUrl || null,
      nutrition: p.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      allergens: p.allergens || [],
      notes: p.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await adminClient
      .from("products")
      .update(payload)
      .eq("id", p.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: mapDbToProduct(data) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 });
    }

    const { error } = await adminClient.from("products").delete().eq("id", productId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

