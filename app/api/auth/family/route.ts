import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_FAMILIES } from "@/lib/storage/mock-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ success: false, error: "Code is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (adminClient) {
    try {
      // Look up family in Supabase (service role bypasses RLS)
      const { data: family, error } = await adminClient
        .from("families")
        .select("id, name, code, admin_id, admin_email, admin_name, status, created_at")
        .eq("code", code)
        .maybeSingle();

      if (error) {
        console.warn("Supabase family lookup error:", error);
      } else if (family) {
        // Ensure family is marked approved so members can join
        if (family.status === "pending") {
          await adminClient
            .from("families")
            .update({ status: "approved", approved_at: new Date().toISOString() })
            .eq("id", family.id);
          family.status = "approved";
        }

        return NextResponse.json({
          success: true,
          family: {
            id: family.id,
            name: family.name,
            code: family.code,
            adminName: family.admin_name,
            adminEmail: family.admin_email,
            status: family.status || "approved",
          },
        });
      }
    } catch (err: any) {
      console.warn("Error querying families from Supabase:", err);
    }
  }

  // Fallback to local default families
  const localFam = INITIAL_FAMILIES.find((f) => f.code.toUpperCase() === code);
  if (localFam) {
    return NextResponse.json({
      success: true,
      family: {
        id: localFam.id,
        name: localFam.name,
        code: localFam.code,
        adminName: localFam.organizerName,
        adminEmail: localFam.organizerEmail,
        status: "approved",
      },
    });
  }

  return NextResponse.json(
    {
      success: false,
      message: `El codi "${code}" no correspon a cap família activa. Comprova-ho amb l'administrador de la teva llar o registra una nova família.`,
    },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();
  try {
    const body = await request.json();
    const { name, adminName, adminEmail, adminId, code } = body;

    if (!name || !adminName || !adminEmail) {
      return NextResponse.json(
        { success: false, error: "name, adminName and adminEmail are required" },
        { status: 400 }
      );
    }

    const cleanCode = (code?.trim().toUpperCase()) || `FAM-${Math.floor(1000 + Math.random() * 9000)}`;

    if (adminClient) {
      // Check if code already exists
      const { data: existing } = await adminClient
        .from("families")
        .select("id")
        .eq("code", cleanCode)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { success: false, error: `El codi "${cleanCode}" ja està en ús per una altra família.` },
          { status: 400 }
        );
      }

      const { data: family, error } = await adminClient
        .from("families")
        .insert({
          name: name.trim(),
          code: cleanCode,
          admin_id: adminId || "00000000-0000-0000-0000-000000000000",
          admin_email: adminEmail.trim().toLowerCase(),
          admin_name: adminName.trim(),
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, family });
    }

    return NextResponse.json({
      success: true,
      family: {
        id: `fam-${Date.now()}`,
        name,
        code: cleanCode,
        adminName,
        adminEmail,
        status: "approved",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

