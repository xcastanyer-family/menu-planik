import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { success: false, message: "Client de base de dades no disponible." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { familyId, name, email, password, role = "user", canModify = false } = body;

    if (!familyId || !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "El codi de família i el nom són obligatoris." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanPassword = (password || "user123").trim();

    // 1. Fetch the family from Supabase
    const { data: family, error: famErr } = await adminClient
      .from("families")
      .select("id, name, code")
      .or(`id.eq.${familyId},code.eq.${familyId}`)
      .maybeSingle();

    if (famErr || !family) {
      return NextResponse.json(
        { success: false, message: "Família no trobada a la base de dades." },
        { status: 404 }
      );
    }

    // 2. Determine member email
    const cleanEmail =
      email?.trim() ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}@${family.code.toLowerCase()}.menuplanik.cat`;

    // 3. Create or update auth user in Supabase Auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let user = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (!user) {
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          name: cleanName,
          role: role,
          family_id: family.id,
          family_code: family.code,
        },
      });

      if (createErr) {
        return NextResponse.json(
          { success: false, message: `Error creant usuari a Supabase: ${createErr.message}` },
          { status: 400 }
        );
      }
      user = created.user;
    } else {
      // Update password
      await adminClient.auth.admin.updateUserById(user.id, {
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          full_name: cleanName,
          name: cleanName,
          role: role,
          family_id: family.id,
          family_code: family.code,
        },
      });
    }

    // 4. Insert or update into family_members
    const colors = ["#0284c7", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const { data: existingMember } = await adminClient
      .from("family_members")
      .select("id")
      .eq("family_id", family.id)
      .eq("user_id", user.id)
      .maybeSingle();

    let memberResult;
    if (existingMember) {
      const { data: updated, error: updErr } = await adminClient
        .from("family_members")
        .update({
          name: cleanName,
          email: cleanEmail,
          role: role,
        })
        .eq("id", existingMember.id)
        .select()
        .single();
      if (updErr) throw updErr;
      memberResult = updated;
    } else {
      const { data: inserted, error: insErr } = await adminClient
        .from("family_members")
        .insert({
          family_id: family.id,
          user_id: user.id,
          name: cleanName,
          email: cleanEmail,
          role: role,
          color,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      memberResult = inserted;
    }

    return NextResponse.json({
      success: true,
      message: `Membre "${cleanName}" creat amb èxit a Supabase!`,
      member: {
        id: memberResult.id,
        familyId: family.id,
        userId: user.id,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: role,
        canModify: canModify,
        joinedAt: memberResult.joined_at || new Date().toISOString(),
        color: memberResult.color || color,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Error intern creant membre." },
      { status: 500 }
    );
  }
}
