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
      } catch (err: any) {
        console.warn("Supabase Auth warning, fallbacking to local store:", err);
      }
    }

    // 2. Synchronize / persist locally
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
      } catch (err: any) {
        console.warn("Supabase Auth warning, fallbacking to local store:", err);
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

    if (supabase && params.password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });

        if (error) {
          console.warn("Supabase signIn error:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase Auth connection error:", err);
      }
    }

    // Validate and load session through LocalStore
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
    return LocalStore.approveFamily(familyId);
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
    return LocalStore.rejectFamily(familyId, reason);
  },
};

