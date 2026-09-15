import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { UserSession } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Cal indicar l'usuari i la contrasenya." },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();
    const cleanIdLower = cleanId.toLowerCase();
    const cleanPass = password.trim();

    const adminClient = createAdminClient();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    if (!adminClient || !anonKey || !supabaseUrl) {
      return NextResponse.json(
        { success: false, message: "Servei de base de dades no disponible." },
        { status: 500 }
      );
    }

    let targetEmail = cleanIdLower;

    // 1. Resolve username to email if it doesn't contain '@'
    if (!cleanIdLower.includes("@")) {
      if (cleanIdLower === "admin" || cleanIdLower === "superadmin") {
        targetEmail = "admin@menuplanik.cat";
      } else {
        // Look up member in family_members or profiles
        const { data: member } = await adminClient
          .from("family_members")
          .select("email, name")
          .ilike("name", cleanId)
          .limit(1)
          .maybeSingle();

        if (member?.email) {
          targetEmail = member.email.toLowerCase();
        } else {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("email, full_name")
            .ilike("full_name", cleanId)
            .limit(1)
            .maybeSingle();

          if (profile?.email) {
            targetEmail = profile.email.toLowerCase();
          }
        }
      }
    }

    // 2. Sign in with Supabase Auth using client credentials
    const client = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: targetEmail,
      password: cleanPass,
    });

    if (authError || !authData?.user) {
      const msg = authError?.message || "";
      if (msg.includes("Invalid login credentials")) {
        return NextResponse.json(
          { success: false, message: "Usuari o contrasenya incorrectes." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, message: `Error d'accés: ${msg}` },
        { status: 400 }
      );
    }

    const user = authData.user;

    // 3. Fetch profile and family
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*, families(*)")
      .eq("id", user.id)
      .maybeSingle();

    const { data: memberRow } = await adminClient
      .from("family_members")
      .select("*, families(*)")
      .eq("user_id", user.id)
      .maybeSingle();

    const familyData = profile?.families || memberRow?.families;
    const role =
      profile?.role ||
      user.user_metadata?.role ||
      memberRow?.role ||
      (targetEmail === "admin@menuplanik.cat" ? "superadmin" : "user");
    const name =
      profile?.full_name ||
      memberRow?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      cleanId;

    // 4. Fetch full family members if family exists
    let fullFamily = null;
    if (familyData?.id) {
      const { data: famWithMembers } = await adminClient
        .from("families")
        .select("*, members:family_members(*)")
        .eq("id", familyData.id)
        .maybeSingle();

      if (famWithMembers) {
        fullFamily = {
          id: famWithMembers.id,
          name: famWithMembers.name,
          code: famWithMembers.code,
          organizerName: famWithMembers.admin_name || famWithMembers.name,
          organizerEmail: famWithMembers.admin_email || "",
          status: famWithMembers.status || "approved",
          createdAt: famWithMembers.created_at,
          members: (famWithMembers.members || []).map((m: any) => ({
            id: m.id,
            familyId: m.family_id,
            userId: m.user_id,
            name: m.name,
            email: m.email,
            role: m.role,
            color: m.color,
            joinedAt: m.joined_at,
          })),
        };
      }
    }

    const session: UserSession = {
      userId: user.id,
      memberId: memberRow?.id || user.id,
      familyId: familyData?.id || "",
      name: name,
      email: targetEmail,
      role: role,
      canModify: role === "admin" || role === "superadmin",
      status: "active",
      familyCode: familyData?.code || "",
      familyName: familyData?.name || (role === "superadmin" ? "Panell Global" : "Família"),
      isAuthenticated: true,
    };

    return NextResponse.json({
      success: true,
      message: `Benvingut/da ${name}!`,
      session,
      family: fullFamily,
      token: authData.session?.access_token,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
