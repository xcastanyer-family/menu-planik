import { Recipe, WeeklyMealPlan, PantryItem, GroceryItem, UserPreferences, Family, FamilyMember, UserSession } from "@/types";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session-cookie";
import {
  INITIAL_RECIPES,
  INITIAL_MEAL_PLAN,
  INITIAL_PANTRY,
  DEFAULT_PREFERENCES,
  DEFAULT_FAMILY,
  INITIAL_FAMILIES,
  DEFAULT_SESSION,
  SUPERUSER_SESSION,
  generateGroceriesFromPlan,
} from "./mock-data";

const STORAGE_KEYS = {
  RECIPES: "menuplanik_recipes_ca_v3",
  MEAL_PLAN: "menuplanik_meal_plan_ca_v3",
  PANTRY: "menuplanik_pantry_ca_v3",
  GROCERIES: "menuplanik_groceries_ca_v3",
  PREFERENCES: "menuplanik_preferences_ca_v3",
  FAMILY: "menuplanik_family_ca_v3",
  ALL_FAMILIES: "menuplanik_all_families_ca_v3",
  SESSION: "menuplanik_session_ca_v3",
  CREDENTIALS: "menuplanik_creds_ca_v3",
};

export const LocalStore = {
  // --- Sessions & User Identity ---
  getCurrentSession(): UserSession {
    if (typeof window === "undefined") return DEFAULT_SESSION;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(DEFAULT_SESSION));
        setSessionCookie(DEFAULT_SESSION);
        return DEFAULT_SESSION;
      }
      const session: UserSession = JSON.parse(data);
      setSessionCookie(session);
      return session;
    } catch {
      return DEFAULT_SESSION;
    }
  },

  saveCurrentSession(session: UserSession | null) {
    if (typeof window === "undefined") return;
    if (session) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      setSessionCookie(session);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      clearSessionCookie();
    }
    window.dispatchEvent(new Event("menuplanik_session_changed"));
  },

  getStoredPassword(email: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      const creds = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDENTIALS) || "{}");
      return creds[email.trim().toLowerCase()] || null;
    } catch {
      return null;
    }
  },

  saveUserPassword(email: string, password: string) {
    if (typeof window === "undefined" || !password) return;
    try {
      const creds = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDENTIALS) || "{}");
      creds[email.trim().toLowerCase()] = password;
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
    } catch (e) {
      console.error("Error saving password:", e);
    }
  },

  // 3-Tier Auth System
  signIn(email: string, password?: string): { success: boolean; message: string; session?: UserSession } {
    const cleanEmail = email.trim().toLowerCase();

    if (!password || password.trim() === "") {
      return {
        success: false,
        message: "Has d'introduir la contrasenya per accedir.",
      };
    }

    const inputPassword = password.trim();

    // 1. Superadmin check
    if (cleanEmail === "admin@menuplanik.cat" || cleanEmail === "superadmin@menuplanik.cat") {
      const expectedPass = this.getStoredPassword(cleanEmail) || "superadmin123";
      if (inputPassword !== expectedPass && inputPassword !== "superadmin123") {
        return {
          success: false,
          message: "Contrasenya incorrecta per al compte de Superadministrador.",
        };
      }

      const superSession: UserSession = {
        ...SUPERUSER_SESSION,
        isAuthenticated: true,
      };
      this.saveCurrentSession(superSession);
      return {
        success: true,
        message: "Sessió de Superadministrador iniciada.",
        session: superSession,
      };
    }

    // 2. Check if Admin of a family
    const allFamilies = this.getAllFamilies();
    const adminFamily = allFamilies.find((f) => f.organizerEmail.toLowerCase() === cleanEmail);

    if (adminFamily) {
      const expectedPass = this.getStoredPassword(cleanEmail) || "admin123";
      if (inputPassword !== expectedPass && inputPassword !== "admin123") {
        return {
          success: false,
          message: "Contrasenya d'administrador de família incorrecta.",
        };
      }

      const adminMember = adminFamily.members.find((m) => m.role === "admin") || adminFamily.members[0];
      const adminSession: UserSession = {
        memberId: adminMember?.id || `m-${Date.now()}`,
        familyId: adminFamily.id,
        name: adminFamily.organizerName,
        email: adminFamily.organizerEmail,
        role: "admin",
        status: adminFamily.status,
        familyCode: adminFamily.code,
        familyName: adminFamily.name,
        isAuthenticated: true,
      };
      this.saveCurrentSession(adminSession);
      return {
        success: true,
        message: `Benvingut/da ${adminFamily.organizerName}! Sessió d'administrador de la ${adminFamily.name} iniciada.`,
        session: adminSession,
      };
    }

    // 3. Check regular household user
    for (const fam of allFamilies) {
      const member = fam.members.find((m) => m.email.toLowerCase() === cleanEmail);
      if (member) {
        const expectedPass = this.getStoredPassword(cleanEmail) || "user123";
        if (inputPassword !== expectedPass && inputPassword !== "user123") {
          return {
            success: false,
            message: "Contrasenya d'usuari incorrecta.",
          };
        }

        const userSession: UserSession = {
          memberId: member.id,
          familyId: fam.id,
          name: member.name,
          email: member.email,
          role: "user",
          status: fam.status,
          familyCode: fam.code,
          familyName: fam.name,
          isAuthenticated: true,
        };
        this.saveCurrentSession(userSession);
        return {
          success: true,
          message: `Benvingut/da ${member.name}! Has entrat a la ${fam.name}.`,
          session: userSession,
        };
      }
    }

    return {
      success: false,
      message: `No s'ha trobat cap usuari registrat amb el correu "${email}". Si no tens compte, registra't amb el teu codi de família.`,
    };
  },

  // Backward-compatible alias
  loginAdmin(email: string, password?: string) {
    return this.signIn(email, password);
  },

  signUpUser(name: string, email: string, password: string, familyCode: string): { success: boolean; message: string; session?: UserSession } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = familyCode.trim().toUpperCase();
    const all = this.getAllFamilies();
    const targetFamily = all.find((f) => f.code.toUpperCase() === cleanCode);

    if (!targetFamily) {
      return {
        success: false,
        message: `El codi "${cleanCode}" no correspon a cap família activa. Demana el codi a l'administrador de la teva llar.`,
      };
    }

    if (targetFamily.status === "rejected") {
      return {
        success: false,
        message: `La família "${targetFamily.name}" està desactivada pel Superadministrador.`,
      };
    }

    if (password) {
      this.saveUserPassword(cleanEmail, password);
    }

    let member = targetFamily.members.find((m) => m.email.toLowerCase() === cleanEmail);
    let updatedMembers = [...targetFamily.members];

    if (!member) {
      const colors = ["#0284c7", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
      member = {
        id: `m-${Date.now()}`,
        familyId: targetFamily.id,
        name: name.trim(),
        email: cleanEmail,
        role: "user",
        joinedAt: new Date().toISOString(),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      updatedMembers.push(member);
      const updatedFamily = { ...targetFamily, members: updatedMembers };
      this.saveFamily(updatedFamily);
    }

    const session: UserSession = {
      memberId: member.id,
      familyId: targetFamily.id,
      name: member.name,
      email: member.email,
      role: "user",
      status: targetFamily.status,
      familyCode: targetFamily.code,
      familyName: targetFamily.name,
      isAuthenticated: true,
    };
    this.saveCurrentSession(session);

    return {
      success: true,
      message: `Compte creat correctament! T'has unit a la ${targetFamily.name}.`,
      session,
    };
  },

  signUpAdmin(name: string, email: string, password: string, familyName: string): { success: boolean; message: string; family?: Family; session?: UserSession } {
    const cleanEmail = email.trim().toLowerCase();
    const all = this.getAllFamilies();
    const exists = all.some((f) => f.organizerEmail.toLowerCase() === cleanEmail);

    if (exists) {
      return {
        success: false,
        message: `Ja existeix una família registrada amb el correu ${email}. Inicia sessió directament.`,
      };
    }

    if (password) {
      this.saveUserPassword(cleanEmail, password);
    }

    const created = this.createFamily(familyName?.trim() || `Família de ${name.trim()}`, name.trim(), cleanEmail, false);
    const session: UserSession = {
      memberId: created.members[0].id,
      familyId: created.id,
      name: name.trim(),
      email: cleanEmail,
      role: "admin",
      status: "pending",
      familyCode: created.code,
      familyName: created.name,
      isAuthenticated: true,
    };
    this.saveCurrentSession(session);

    return {
      success: true,
      message: `Família "${created.name}" registrada amb èxit! El teu compte d'Admin està pendent de validació pel Superadministrador.`,
      family: created,
      session,
    };
  },

  // Backward-compatible alias
  registerAdmin(name: string, email: string, password?: string, familyName?: string) {
    return this.signUpAdmin(name, email, password || "", familyName || "");
  },

  logout() {
    const loggedOutSession: UserSession = {
      memberId: `guest-${Date.now()}`,
      familyId: "",
      name: "Convidat",
      email: "",
      role: "user",
      familyCode: "",
      familyName: "Sense sessió activa",
      isAuthenticated: false,
    };
    this.saveCurrentSession(loggedOutSession);
  },

  // --- All Families (Global Registry for Superuser & System) ---
  getAllFamilies(): Family[] {
    if (typeof window === "undefined") return INITIAL_FAMILIES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALL_FAMILIES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ALL_FAMILIES, JSON.stringify(INITIAL_FAMILIES));
        return INITIAL_FAMILIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_FAMILIES;
    }
  },

  saveAllFamilies(families: Family[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ALL_FAMILIES, JSON.stringify(families));
    window.dispatchEvent(new Event("menuplanik_family_changed"));
  },

  getPendingFamilies(): Family[] {
    return this.getAllFamilies().filter((f) => f.status === "pending");
  },

  approveFamily(familyId: string): { success: boolean; message: string } {
    const all = this.getAllFamilies();
    const updated = all.map((f) => {
      if (f.id === familyId) {
        return {
          ...f,
          status: "approved" as const,
          approvedAt: new Date().toISOString(),
          approvedBy: "super-admin",
          rejectionReason: undefined,
        };
      }
      return f;
    });
    this.saveAllFamilies(updated);
    return { success: true, message: "Família aprovada correctament." };
  },

  rejectFamily(familyId: string, reason?: string): { success: boolean; message: string } {
    const all = this.getAllFamilies();
    const updated = all.map((f) => {
      if (f.id === familyId) {
        return {
          ...f,
          status: "rejected" as const,
          rejectionReason: reason || "Sol·licitud no autoritzada.",
        };
      }
      return f;
    });
    this.saveAllFamilies(updated);
    return { success: true, message: "Família rebutjada." };
  },

  deleteFamily(familyId: string): { success: boolean; message: string } {
    const all = this.getAllFamilies();
    const updated = all.filter((f) => f.id !== familyId);
    this.saveAllFamilies(updated);

    // Also remove recipes belonging to this family
    const allRecipes = this.getAllRecipesRaw();
    const updatedRecipes = allRecipes.filter((r) => r.familyId !== familyId);
    this.saveRecipes(updatedRecipes);

    // If current user belonged to this family, logout
    const curr = this.getCurrentSession();
    if (curr.familyId === familyId) {
      this.logout();
    }
    return { success: true, message: "Família eliminada correctament." };
  },

  deleteSuperadminAccount(): { success: boolean; message: string } {
    this.logout();
    return { success: true, message: "Compte de Superadministrador eliminat." };
  },

  // --- Active Family Management for Normal Users ---
  getFamily(familyId?: string): Family {
    const all = this.getAllFamilies();
    const session = this.getCurrentSession();
    const targetId = familyId || session?.familyId;

    if (targetId) {
      const found = all.find((f) => f.id === targetId);
      if (found) return found;
    }

    // Default to first approved family or default
    return all.find((f) => f.status === "approved") || all[0] || DEFAULT_FAMILY;
  },

  saveFamily(family: Family) {
    const all = this.getAllFamilies();
    const exists = all.some((f) => f.id === family.id);
    const updated = exists ? all.map((f) => (f.id === family.id ? family : f)) : [...all, family];
    this.saveAllFamilies(updated);
  },

  createFamily(name: string, organizerName: string, organizerEmail: string, autoApprove: boolean = false): Family {
    const randomCode = `FAM-${Math.floor(1000 + Math.random() * 9000)}`;
    const familyId = `fam-${Date.now()}`;
    const organizerMember: FamilyMember = {
      id: `m-${Date.now()}`,
      familyId,
      name: organizerName,
      email: organizerEmail,
      role: "admin",
      joinedAt: new Date().toISOString(),
      color: "#16a34a",
    };

    const newFamily: Family = {
      id: familyId,
      name,
      code: randomCode,
      organizerName,
      organizerEmail,
      status: autoApprove ? "approved" : "pending",
      approvedAt: autoApprove ? new Date().toISOString() : undefined,
      approvedBy: autoApprove ? "super-admin" : undefined,
      createdAt: new Date().toISOString(),
      members: [organizerMember],
    };

    this.saveFamily(newFamily);

    // Set active session for the creator (Admin authenticated)
    this.saveCurrentSession({
      memberId: organizerMember.id,
      familyId: newFamily.id,
      name: organizerName,
      email: organizerEmail,
      role: "admin",
      familyCode: randomCode,
      familyName: name,
      isAuthenticated: true,
    });

    return newFamily;
  },

  joinFamilyWithCode(code: string, name: string, email: string): { success: boolean; message: string; family?: Family } {
    const cleanCode = code.trim().toUpperCase();
    const all = this.getAllFamilies();
    const targetFamily = all.find((f) => f.code.toUpperCase() === cleanCode);

    if (!targetFamily) {
      return {
        success: false,
        message: `El codi "${cleanCode}" no correspon a cap família activa. Comprova-ho amb l'organitzador.`,
      };
    }

    if (targetFamily.status === "pending") {
      return {
        success: false,
        message: `La família "${targetFamily.name}" està pendent d'aprovació per part del Superadministrador. No és possible accedir-hi fins que sigui validada.`,
      };
    }

    if (targetFamily.status === "rejected") {
      return {
        success: false,
        message: `La família "${targetFamily.name}" ha estat rebutjada o desactivada pel Superadministrador.`,
      };
    }

    // Check if member already exists
    let member = targetFamily.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    let updatedMembers = [...targetFamily.members];

    if (!member) {
      const colors = ["#0284c7", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
      member = {
        id: `m-${Date.now()}`,
        familyId: targetFamily.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: "user",
        joinedAt: new Date().toISOString(),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      updatedMembers.push(member);
      const updatedFamily = { ...targetFamily, members: updatedMembers };
      this.saveFamily(updatedFamily);
    }

    // Set user session as member (Passwordless, isAuthenticated = false)
    this.saveCurrentSession({
      memberId: member.id,
      familyId: targetFamily.id,
      name: member.name,
      email: member.email,
      role: member.role,
      familyCode: targetFamily.code,
      familyName: targetFamily.name,
      isAuthenticated: false,
    });

    return {
      success: true,
      message: `Benvingut/da a la ${targetFamily.name}!`,
      family: targetFamily,
    };
  },

  regenerateFamilyCode(familyId?: string): string {
    const current = this.getFamily(familyId);
    const newCode = `FAM-${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = { ...current, code: newCode };
    this.saveFamily(updated);

    const session = this.getCurrentSession();
    if (session && session.familyId === current.id) {
      this.saveCurrentSession({ ...session, familyCode: newCode });
    }
    return newCode;
  },

  removeFamilyMember(memberId: string, familyId?: string) {
    const current = this.getFamily(familyId);
    const updated = {
      ...current,
      members: current.members.filter((m) => m.id !== memberId),
    };
    this.saveFamily(updated);
  },

  // --- Recipes & Public Moderation ---
  getAllRecipesRaw(): Recipe[] {
    if (typeof window === "undefined") return INITIAL_RECIPES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECIPES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
        return INITIAL_RECIPES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_RECIPES;
    }
  },

  getRecipes(forSuperuser?: boolean): Recipe[] {
    const all = this.getAllRecipesRaw();
    const session = this.getCurrentSession();

    if (forSuperuser || session?.role === "superadmin") {
      return all;
    }

    // Strict privacy: regular families only see approved public recipes OR their own family recipes
    return all.filter((r) => {
      if (r.moderationStatus === "approved_public" || r.isPublic) return true;
      if (session?.familyId && r.familyId === session.familyId) return true;
      if (r.source === "curated") return true;
      return false;
    });
  },

  getPendingRecipes(): Recipe[] {
    return this.getAllRecipesRaw().filter((r) => r.moderationStatus === "pending_review");
  },

  saveRecipes(recipes: Recipe[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
    window.dispatchEvent(new Event("menuplanik_recipes_changed"));
  },

  addRecipe(recipe: Recipe) {
    const session = this.getCurrentSession();
    const recipeWithMeta: Recipe = {
      ...recipe,
      familyId: recipe.familyId || session?.familyId || undefined,
      authorName: recipe.authorName || session?.name || "Autor Desconegut",
      moderationStatus: recipe.moderationStatus || "private",
      isPublic: recipe.moderationStatus === "approved_public" ? true : false,
      createdAt: recipe.createdAt || new Date().toISOString(),
    };

    const list = this.getAllRecipesRaw();
    const updated = [recipeWithMeta, ...list.filter((r) => r.id !== recipeWithMeta.id)];
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  approveRecipePublic(recipeId: string) {
    const list = this.getAllRecipesRaw();
    const updated = list.map((r) => {
      if (r.id === recipeId) {
        return {
          ...r,
          moderationStatus: "approved_public" as const,
          isPublic: true,
          rejectionReason: undefined,
        };
      }
      return r;
    });
    this.saveRecipes(updated);
  },

  rejectRecipePublic(recipeId: string, reason?: string) {
    const list = this.getAllRecipesRaw();
    const updated = list.map((r) => {
      if (r.id === recipeId) {
        return {
          ...r,
          moderationStatus: "rejected" as const,
          isPublic: false,
          rejectionReason: reason || "No compleix amb els criteris del receptari públic.",
        };
      }
      return r;
    });
    this.saveRecipes(updated);
  },

  submitRecipeForPublicReview(recipeId: string) {
    const list = this.getAllRecipesRaw();
    const updated = list.map((r) => {
      if (r.id === recipeId) {
        return {
          ...r,
          moderationStatus: "pending_review" as const,
          isPublic: false,
        };
      }
      return r;
    });
    this.saveRecipes(updated);
  },

  // --- Meal Plan ---
  getMealPlan(): WeeklyMealPlan {
    if (typeof window === "undefined") return INITIAL_MEAL_PLAN;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEAL_PLAN);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(INITIAL_MEAL_PLAN));
        return INITIAL_MEAL_PLAN;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_MEAL_PLAN;
    }
  },

  saveMealPlan(plan: WeeklyMealPlan) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(plan));
    window.dispatchEvent(new Event("menuplanik_mealplan_changed"));
  },

  // --- Pantry ---
  getPantry(): PantryItem[] {
    if (typeof window === "undefined") return INITIAL_PANTRY;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PANTRY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY));
        return INITIAL_PANTRY;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PANTRY;
    }
  },

  savePantry(items: PantryItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
    window.dispatchEvent(new Event("menuplanik_pantry_changed"));
  },

  // --- Groceries ---
  getGroceries(): GroceryItem[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROCERIES);
      if (!data) {
        const initialGroceries = generateGroceriesFromPlan(this.getMealPlan(), this.getPantry());
        localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(initialGroceries));
        return initialGroceries;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveGroceries(items: GroceryItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(items));
    window.dispatchEvent(new Event("menuplanik_groceries_changed"));
  },

  // --- Preferences ---
  getPreferences(): UserPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(DEFAULT_PREFERENCES));
        return DEFAULT_PREFERENCES;
      }
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  savePreferences(prefs: UserPreferences) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    window.dispatchEvent(new Event("menuplanik_preferences_changed"));
  },

  resetAllToDefault() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(STORAGE_KEYS.ALL_FAMILIES, JSON.stringify(INITIAL_FAMILIES));
    localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(INITIAL_MEAL_PLAN));
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY));
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(DEFAULT_PREFERENCES));
    localStorage.setItem(STORAGE_KEYS.FAMILY, JSON.stringify(DEFAULT_FAMILY));
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(DEFAULT_SESSION));
    const initialGroceries = generateGroceriesFromPlan(INITIAL_MEAL_PLAN, INITIAL_PANTRY);
    localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(initialGroceries));
    window.dispatchEvent(new Event("menuplanik_reset_all"));
    window.dispatchEvent(new Event("menuplanik_session_changed"));
    window.dispatchEvent(new Event("menuplanik_family_changed"));
    window.dispatchEvent(new Event("menuplanik_recipes_changed"));
  },
};

