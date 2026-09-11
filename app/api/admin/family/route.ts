import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ success: true, families: [] });
  }

  try {
    const { data: families, error } = await adminClient
      .from("families")
      .select("*, members:family_members(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = (families || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      code: f.code,
      organizerName: f.admin_name || f.name,
      organizerEmail: f.admin_email || "",
      adminId: f.admin_id,
      status: f.status,
      createdAt: f.created_at,
      approvedAt: f.approved_at,
      approvedBy: f.approved_by,
      rejectionReason: f.rejection_reason,
      members: (f.members || []).map((m: any) => ({
        id: m.id,
        familyId: m.family_id,
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        joinedAt: m.joined_at,
        color: m.color,
      })),
    }));

    return NextResponse.json({ success: true, families: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminClient = createAdminClient();
  try {
    const { familyId } = await request.json();
    if (!familyId) {
      return NextResponse.json({ success: false, error: "familyId is required" }, { status: 400 });
    }

    if (adminClient) {
      // 1. Get family members to delete their auth accounts
      const { data: members } = await adminClient
        .from("family_members")
        .select("user_id")
        .eq("family_id", familyId);

      // 2. Delete the family (PostgreSQL cascade deletes members, recipes, meal plans, etc.)
      const { error: delError } = await adminClient
        .from("families")
        .delete()
        .eq("id", familyId);

      if (delError) {
        return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
      }

      // 3. Delete auth users in Supabase Auth
      if (members && members.length > 0) {
        for (const m of members) {
          if (m.user_id) {
            try {
              await adminClient.auth.admin.deleteUser(m.user_id);
            } catch (e) {
              console.warn("Could not delete auth user:", m.user_id, e);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Família i usuaris eliminats correctament." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
