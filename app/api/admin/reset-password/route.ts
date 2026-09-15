import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: "email and newPassword are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const adminClient = createAdminClient();

    if (adminClient) {
      // 1. Check if user exists in Supabase Auth
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const user = usersData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

      if (user) {
        const { error } = await adminClient.auth.admin.updateUserById(user.id, {
          password: cleanPassword,
        });
        if (error) {
          console.warn("Supabase password update error:", error);
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Contrasenya per a "${cleanEmail}" actualitzada correctament.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

