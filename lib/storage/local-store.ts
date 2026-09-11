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
  RECIPES: "menuplanik_recipes_ca_v2",
  MEAL_PLAN: "menuplanik_meal_plan_ca_v2",
  PANTRY: "menuplanik_pantry_ca_v2",
  GROCERIES: "menuplanik_groceries_ca_v2",
  PREFERENCES: "menuplanik_preferences_ca_v2",
  FAMILY: "menuplanik_family_ca_v2",
  ALL_FAMILIES: "menuplanik_all_families_ca_v2",
  SESSION: "menuplanik_session_ca_v2",
};

export const LocalStore = {
  // --- Sessions & User Identity ---
  getCurrentSession(): UserSession {
    if (typeof window === "undefined") return DEFAULT_SESSION;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(DEFAULT_SESSION));
        return DEFAULT_SESSION;
      }
      return JSON.parse(data);
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

  switchToSuperuser() {
    this.saveCurrentSession({ ...SUPERUSER_SESSION, isAuthenticated: true });
  },

  switchToOrganizer() {
    this.saveCurrentSession({ ...DEFAULT_SESSION, isAuthenticated: true });
  },

  switchToMember() {
    const memberSession: UserSession = {
      memberId: "m-2",
      familyId: "fam-main",
      name: "Júlia",
      email: "julia@menuplanik.cat",
      role: "user",
      familyCode: "FAM-7492",
      familyName: "Família MenúPlanik",
      isAuthenticated: false,
    };
    this.saveCurrentSession(memberSession);
  },

  // --- Auth for Superadmin & Family Organizers ---
  loginAdmin(email: string, _password?: string): { success: boolean; message: string; session?: UserSession } {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if Superadmin
    if (cleanEmail === "admin@menuplanik.cat" || cleanEmail === "superadmin@menuplanik.cat") {
      const superSession: UserSession = {
        ...SUPERUSER_SESSION,
        isAuthenticated: true,
      };
      this.saveCurrentSession(superSession);
      return {
        success: true,
        message: "Sessió iniciada correctament com a Superadministrador.",
        session: superSession,
      };
    }

    // 2. Check if Organizer of any family
    const all = this.getAllFamilies();
    const targetFamily = all.find((f) => f.organizerEmail.toLowerCase() === cleanEmail);

    if (targetFamily) {
      const organizerMember = targetFamily.members.find((m) => m.role === "admin") || targetFamily.members[0];
      const organizerSession: UserSession = {
        memberId: organizerMember?.id || `m-${Date.now()}`,
        familyId: targetFamily.id,
        name: targetFamily.organizerName,
        email: targetFamily.organizerEmail,
        role: "admin",
        familyCode: targetFamily.code,
        familyName: targetFamily.name,
        isAuthenticated: true,
      };
      this.saveCurrentSession(organizerSession);
      return {
        success: true,
        message: `Benvingut/da ${targetFamily.organizerName}! Sessió d'administrador de la ${targetFamily.name} iniciada.`,
        session: organizerSession,
      };
    }

    return {
      success: false,
      message: `No s'ha trobat cap compte d'administrador amb el correu "${email}". Si vols crear una nova família, fes servir la pestanya "Registra nova família".`,
    };
  },

  signIn(email: string, password?: string): { success: boolean; message: string; session?: UserSession } {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if admin/superadmin
    const adminRes = this.loginAdmin(cleanEmail, password);
    if (adminRes.success) {
      return adminRes;
    }

    // 2. Check if member of any family
    const all = this.getAllFamilies();
    for (const fam of all) {
      const member = fam.members.find((m) => m.email.toLowerCase() === cleanEmail);
      if (member) {
        const session: UserSession = {
          memberId: member.id,
          familyId: fam.id,
          name: member.name,
          email: member.email,
          role: member.role,
          familyCode: fam.code,
          familyName: fam.name,
          isAuthenticated: true,
        };
        this.saveCurrentSession(session);
        return {
          success: true,
          message: `Benvingut/da ${member.name}!`,
          session,
        };
      }
    }

    return {
      success: false,
      message: `No s'ha trobat cap compte associat al correu "${email}". Si és una nova família, registra-la primer.`,
    };
  },

  registerAdmin(fullName: string, email: string, password?: string, familyName?: string, customCode?: string): { success: boolean; message: string; family?: Family } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.getAllFamilies().some((f) => f.organizerEmail.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        message: `Ja existeix una família registrada amb el correu ${email}. Inicia sessió o fes servir un altre correu.`,
      };
    }

    const created = this.createFamily(
      familyName?.trim() || `Família de ${fullName.trim()}`,
      fullName.trim(),
      cleanEmail,
      true,
      customCode
    );
    return {
      success: true,
      message: `Família "${created.name}" creada amb èxit! Benvingut/da a MenuPlanik.`,
      family: created,
    };
  },

  signUpUser(name: string, email: string, _password?: string, familyCode?: string): { success: boolean; message: string; session?: UserSession; family?: Family } {
    const res = this.joinFamilyWithCode(familyCode || "", name, email);
    return {
      success: res.success,
      message: res.message,
      session: this.getCurrentSession(),
      family: res.family,
    };
  },

  signUpAdmin(name: string, email: string, password?: string, familyName?: string, customCode?: string): { success: boolean; message: string; session?: UserSession; family?: Family; data?: Family } {
    const res = this.registerAdmin(name, email, password, familyName, customCode);
    return {
      success: res.success,
      message: res.message,
      session: this.getCurrentSession(),
      family: res.family,
      data: res.family,
    };
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
      const list: Family[] = JSON.parse(data);
      let changed = false;
      for (const initFam of INITIAL_FAMILIES) {
        if (!list.some((f) => f.code.toUpperCase() === initFam.code.toUpperCase() || f.id === initFam.id)) {
          list.push(initFam);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ALL_FAMILIES, JSON.stringify(list));
      }
      return list;
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

  approveFamily(familyId: string) {
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
  },

  rejectFamily(familyId: string, reason?: string) {
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
  },

  deleteFamily(familyId: string): { success: boolean; message: string } {
    const all = this.getAllFamilies();
    const filtered = all.filter((f) => f.id !== familyId);
    this.saveAllFamilies(filtered);

    // If active session belongs to this family, reset session
    const session = this.getCurrentSession();
    if (session && session.familyId === familyId) {
      this.logout();
    }
    return { success: true, message: "Família eliminada correctament." };
  },

  deleteSuperadminAccount() {
    this.logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
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

  createFamily(name: string, organizerName: string, organizerEmail: string, autoApprove: boolean = true, customCode?: string): Family {
    const familyCode = customCode?.trim().toUpperCase() || `FAM-${Math.floor(1000 + Math.random() * 9000)}`;
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
      code: familyCode,
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
      status: "active",
      familyCode,
      familyName: name,
      isAuthenticated: true,
    });

    return newFamily;
  },

  joinFamilyWithCode(code: string, name: string, email: string): { success: boolean; message: string; family?: Family } {
    const cleanCode = code.trim().toUpperCase();
    let all = this.getAllFamilies();
    let targetFamily = all.find((f) => f.code.toUpperCase() === cleanCode);

    if (!targetFamily) {
      const fallbackInit = INITIAL_FAMILIES.find((f) => f.code.toUpperCase() === cleanCode);
      if (fallbackInit) {
        targetFamily = fallbackInit;
        this.saveFamily(targetFamily);
      }
    }

    if (!targetFamily) {
      return {
        success: false,
        message: `El codi "${cleanCode}" no correspon a cap família activa. Comprova-ho amb l'organitzador o registra una nova família.`,
      };
    }

    if (targetFamily.status === "pending") {
      targetFamily.status = "approved";
      this.saveFamily(targetFamily);
    }

    if (targetFamily.status === "rejected") {
      return {
        success: false,
        message: `La família "${targetFamily.name}" ha estat desactivada.`,
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

    // Set user session as member (Authenticated)
    this.saveCurrentSession({
      memberId: member.id,
      familyId: targetFamily.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: "active",
      familyCode: targetFamily.code,
      familyName: targetFamily.name,
      isAuthenticated: true,
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
      let changed = false;
      const parsed: Recipe[] = JSON.parse(data).map((r: Recipe) => {
        if (r.moderationStatus === "pending_review") {
          changed = true;
          return { ...r, moderationStatus: "approved_public" as const, isPublic: true };
        }
        return r;
      });
      const deduplicated = this.deduplicateRecipes(parsed);
      if (deduplicated.length !== parsed.length || changed) {
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return INITIAL_RECIPES;
    }
  },

  deduplicateRecipes(recipes: Recipe[]): Recipe[] {
    const seen = new Map<string, Recipe>();

    for (const r of recipes) {
      // Key by normalized title and author
      const key = `${r.title.trim().toLowerCase()}|${(r.authorName || "").trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, r);
      } else {
        // If current has a UUID and existing has a temp custom-rec ID, prefer the UUID one
        const isCurrentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id);
        const isExistingTemp = existing.id.startsWith("custom-rec-");
        if (isCurrentUuid || isExistingTemp) {
          seen.set(key, r);
        }
      }
    }

    return Array.from(seen.values());
  },

  getRecipes(forSuperuser?: boolean): Recipe[] {
    const all = this.getAllRecipesRaw();
    const session = this.getCurrentSession();

    if (forSuperuser || session?.role === "superadmin" || (session?.role as string) === "superuser") {
      return all;
    }

    // Strict privacy: regular families only see approved public recipes OR their own family/authored recipes
    return all.filter((r) => {
      if (r.moderationStatus === "approved_public" || r.isPublic) return true;
      if (session?.familyId && r.familyId === session.familyId) return true;
      if (session?.name && r.authorName === session.name) return true;
      if (r.source === "curated") return true;
      if (r.source === "custom" && !r.familyId) return true;
      return false;
    });
  },

  getPendingRecipes(): Recipe[] {
    return this.getAllRecipesRaw().filter((r) => r.moderationStatus === "pending_review");
  },

  saveRecipes(recipes: Recipe[]) {
    if (typeof window === "undefined") return;
    const clean = this.deduplicateRecipes(recipes);
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(clean));
    window.dispatchEvent(new Event("menuplanik_recipes_changed"));
  },

  addRecipe(recipe: Recipe) {
    const session = this.getCurrentSession();
    const isPublic = Boolean(recipe.isPublic || recipe.moderationStatus === "approved_public");
    const recipeWithMeta: Recipe = {
      ...recipe,
      familyId: recipe.familyId || session?.familyId || undefined,
      authorName: recipe.authorName || session?.name || "Autor Desconegut",
      moderationStatus: isPublic ? "approved_public" : "private",
      isPublic: isPublic,
      createdAt: recipe.createdAt || new Date().toISOString(),
    };

    const list = this.getAllRecipesRaw();
    // Filter out any recipe with same ID or same title/author combination to prevent duplicates
    const filtered = list.filter(
      (r) =>
        r.id !== recipeWithMeta.id &&
        !(
          r.title.trim().toLowerCase() === recipeWithMeta.title.trim().toLowerCase() &&
          (r.authorName || "").trim().toLowerCase() === (recipeWithMeta.authorName || "").trim().toLowerCase()
        )
    );
    const updated = [recipeWithMeta, ...filtered];
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  replaceRecipe(oldId: string, newRecipe: Recipe) {
    const list = this.getAllRecipesRaw();
    const filtered = list.filter(
      (r) =>
        r.id !== oldId &&
        r.id !== newRecipe.id &&
        !(
          r.title.trim().toLowerCase() === newRecipe.title.trim().toLowerCase() &&
          (r.authorName || "").trim().toLowerCase() === (newRecipe.authorName || "").trim().toLowerCase()
        )
    );
    const updated = [newRecipe, ...filtered];
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  updateRecipe(recipe: Recipe) {
    const list = this.getAllRecipesRaw();
    const updated = list.map((r) => (r.id === recipe.id ? { ...r, ...recipe } : r));
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  deleteRecipe(recipeId: string) {
    const list = this.getAllRecipesRaw();
    const updated = list.filter((r) => r.id !== recipeId);
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  publishRecipeDirectly(recipeId: string) {
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
    return this.getRecipes();
  },

  unpublishRecipe(recipeId: string) {
    const list = this.getAllRecipesRaw();
    const updated = list.map((r) => {
      if (r.id === recipeId) {
        return {
          ...r,
          moderationStatus: "private" as const,
          isPublic: false,
        };
      }
      return r;
    });
    this.saveRecipes(updated);
    return this.getRecipes();
  },

  approveRecipePublic(recipeId: string) {
    return this.publishRecipeDirectly(recipeId);
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
    return this.getRecipes();
  },

  submitRecipeForPublicReview(recipeId: string) {
    return this.publishRecipeDirectly(recipeId);
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

