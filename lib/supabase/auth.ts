import { createClient } from "./client";
import { LocalStore } from "@/lib/storage/local-store";
import { UserProfile, UserRole, UserSession, Family } from "@/types";

export interface SignUpUserParams {
  email: string;
  password?: string;
  fullName: string;
  familyCode: string;
}

export interface SignUpAdminParams {
  email: string;
  password?: string;
  fullName: string;
  familyName: string;
}

export interface SignInParams {
  email: string;
  password?: string;
}

export interface AuthResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  session?: UserSession;
}

export const SupabaseAuthService = {
  /**
   * Registers a new User (Household Member) and links them to a family via Family Code
   */
  async signUpUser(params: SignUpUserParams): Promise<AuthResponse> {
    const supabase = createClient();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanCode = params.familyCode.trim().toUpperCase();

    // 1. If Supabase is connected, execute Supabase Auth
    if (supabase) {
      try {
        // Verify that the family code exists in Supabase
        const { data: family, error: famError } = await supabase
          .from("families")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (famError || !family) {
          return {
            success: false,
            message: `El codi "${cleanCode}" no correspon a cap família activa a Supabase. Comprova el codi amb l'administrador de la teva llar.`,
          };
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password || "Password123!",
          options: {
            data: {
              role: "user",
              full_name: params.fullName.trim(),
              family_code: cleanCode,
            },
          },
        });

        if (error) {
          return { success: false, message: `Error de registre Supabase: ${error.message}` };
        }

        if (data.user) {
          const session: UserSession = {
            userId: data.user.id,
            memberId: data.user.id,
            familyId: family.id,
            name: params.fullName.trim(),
            email: cleanEmail,
            role: "user",
            status: family.status || "active",
            familyCode: family.code,
            familyName: family.name,
            isAuthenticated: true,
          };
          LocalStore.saveCurrentSession(session);
          return {
            success: true,
            message: `Compte creat correctament! T'has unit a la ${family.name}.`,
            session,
          };
        }
      } catch (err: any) {
        console.warn("Supabase Auth error, fallbacking to local store:", err);
      }
    }

    // 2. Fallback to LocalStore if Supabase not configured
    return LocalStore.signUpUser(params.fullName.trim(), cleanEmail, params.password || "", cleanCode);
  },

  /**
   * Registers a new Family Admin (Organizer) in 'pending' status awaiting Superadmin validation
   */
  async signUpAdmin(params: SignUpAdminParams): Promise<AuthResponse<Family>> {
    const supabase = createClient();
    const cleanEmail = params.email.trim().toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password || "Password123!",
          options: {
            data: {
              role: "admin",
              full_name: params.fullName.trim(),
              family_name: params.familyName.trim(),
            },
          },
        });

        if (error) {
          return { success: false, message: `Error de registre Supabase: ${error.message}` };
        }

        if (data.user) {
          // Fetch family created by trigger
          const { data: family } = await supabase
            .from("families")
            .select("*")
            .eq("admin_id", data.user.id)
            .maybeSingle();

          const session: UserSession = {
            userId: data.user.id,
            memberId: data.user.id,
            familyId: family?.id || "",
            name: params.fullName.trim(),
            email: cleanEmail,
            role: "admin",
            status: "pending",
            familyCode: family?.code || "",
            familyName: family?.name || params.familyName.trim(),
            isAuthenticated: true,
          };
          LocalStore.saveCurrentSession(session);
          return {
            success: true,
            message: `Família "${session.familyName}" registrada amb èxit! El teu compte està pendent de validació.`,
            session,
          };
        }
      } catch (err: any) {
        console.warn("Supabase Auth error, fallbacking to local store:", err);
      }
    }

    return LocalStore.signUpAdmin(params.fullName.trim(), cleanEmail, params.password || "", params.familyName.trim());
  },

  /**
   * Signs in any user (Superadmin, Family Admin, or Regular User)
   */
  async signIn(params: SignInParams): Promise<AuthResponse> {
    const supabase = createClient();
    const cleanEmail = params.email.trim().toLowerCase();

    // 1. If Supabase is connected, attempt Supabase authentication
    if (supabase && params.password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });

        if (error) {
          // If demo accounts, fallback to LocalStore
          if (
            cleanEmail.endsWith("@menuplanik.cat") ||
            cleanEmail.endsWith("@exemple.cat")
          ) {
            return LocalStore.signIn(cleanEmail, params.password);
          }
          return { success: false, message: `Error d'accés: ${error.message}` };
        }

        if (data?.user) {
          // Fetch profile and associated family
          const { data: profile } = await supabase
            .from("profiles")
            .select("*, families(*)")
            .eq("id", data.user.id)
            .maybeSingle();

          const family = (profile as any)?.families;
          const role = profile?.role || data.user.user_metadata?.role || "user";
          const status = profile?.status || family?.status || "active";

          const session: UserSession = {
            userId: data.user.id,
            memberId: data.user.id,
            familyId: family?.id || profile?.family_id || "",
            name: profile?.full_name || data.user.user_metadata?.full_name || cleanEmail.split("@")[0],
            email: cleanEmail,
            role: role as UserRole,
            status: status,
            familyCode: family?.code || data.user.user_metadata?.family_code || "",
            familyName: family?.name || data.user.user_metadata?.family_name || "",
            isAuthenticated: true,
          };

          LocalStore.saveCurrentSession(session);
          return {
            success: true,
            message: `Benvingut/da ${session.name}! Sessió iniciada.`,
            session,
          };
        }
      } catch (err: any) {
        console.warn("Supabase Auth connection error:", err);
      }
    }

    // 2. Validate and load session through LocalStore fallback
    return LocalStore.signIn(cleanEmail, params.password);
  },

  /**
   * Signs out the current user
   */
  async signOut(): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase signOut error:", err);
      }
    }
    LocalStore.logout();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  },

  /**
   * Superadmin approves an admin user / family
   */
  async approveAdmin(familyId: string): Promise<AuthResponse> {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase
          .from("families")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", familyId);
      } catch (err) {
        console.warn("Supabase approve error:", err);
      }
    }
    LocalStore.approveFamily(familyId);
    return { success: true, message: "Família aprovada correctament." };
  },

  /**
   * Superadmin rejects an admin user / family
   */
  async rejectAdmin(familyId: string, reason?: string): Promise<AuthResponse> {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase
          .from("families")
          .update({ status: "rejected", rejection_reason: reason })
          .eq("id", familyId);
      } catch (err) {
        console.warn("Supabase reject error:", err);
      }
    }
    LocalStore.rejectFamily(familyId, reason);
    return { success: true, message: "Família rebutjada." };
  },

  /**
   * Fetches all registered families from Supabase with LocalStore fallback
   */
  async getAllFamilies(): Promise<Family[]> {
    try {
      const res = await fetch("/api/admin/family");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.families && json.families.length > 0) {
          LocalStore.saveAllFamilies(json.families);
          return json.families;
        }
      }
    } catch (e) {
      console.warn("Could not fetch families from API:", e);
    }
    return LocalStore.getAllFamilies();
  },

  /**
   * Superadmin permanently deletes a family and its cascade data
   */
  async deleteFamily(familyId: string): Promise<AuthResponse> {
    try {
      await fetch("/api/admin/family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
    } catch (err) {
      console.warn("API delete family error:", err);
    }
    return LocalStore.deleteFamily(familyId);
  },

  /**
   * Superadmin permanently deletes their own account
   */
  async deleteSuperadminAccount(): Promise<AuthResponse> {
    const session = LocalStore.getCurrentSession();
    try {
      await fetch("/api/admin/superadmin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId }),
      });
    } catch (err) {
      console.warn("API delete superadmin error:", err);
    }
    LocalStore.deleteSuperadminAccount();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return { success: true, message: "Compte eliminat correctament." };
  },
};
