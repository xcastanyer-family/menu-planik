import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request) {
  const adminClient = createAdminClient();
  try {
    const { userId } = await request.json();

    if (adminClient && userId) {
      // Delete from profiles
      await adminClient.from("profiles").delete().eq("id", userId);
      // Delete from Supabase Auth
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch (e) {
        console.warn("Could not delete superadmin auth user:", e);
      }
    }

    return NextResponse.json({ success: true, message: "Compte de superadministrador eliminat." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
