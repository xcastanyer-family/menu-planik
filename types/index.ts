export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DietaryPreference =
  | "omnivore"
  | "mediterranean"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "paleo"
  | "low-carb"
  | "gluten-free"
  | "dairy-free";

export interface NutritionalInfo {
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
  fiber?: number;  // in grams
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category?: GroceryCategory;
  notes?: string;
}

export interface Recipe {
  id: string;
  familyId?: string;
  authorName?: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  calories: number;
  nutrition: NutritionalInfo;
  tags: string[];
  dietaryTags: DietaryPreference[];
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl?: string;
  source?: "curated" | "ai" | "custom";
  difficulty?: "easy" | "medium" | "hard";
  complexity?: "simple" | "complex";
  foodIcon?: string;
  moderationStatus?: RecipeModerationStatus;
  isPublic?: boolean;
  rejectionReason?: string;
  createdAt?: string;
}

export interface MealSlot {
  id: string;
  day: DayOfWeek;
  mealType: MealType;
  recipeId?: string;
  recipe?: Recipe;
  customNotes?: string;
  isCompleted?: boolean;
}

export interface WeeklyMealPlan {
  id: string;
  userId?: string;
  familyId?: string;
  weekStartDate: string; // ISO date string e.g. "2026-09-07"
  title: string;
  slots: MealSlot[];
  targetDailyCalories?: number;
  dietaryPreference?: DietaryPreference;
  householdSize: number;
  createdAt: string;
  updatedAt: string;
}

export type GroceryCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "frozen"
  | "beverages"
  | "other";

export interface GroceryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
  mealPlanId?: string;
  recipeSource?: string;
  inPantry?: boolean;
  addedBy?: string;
}

export interface PublishedShoppingList {
  id: string;
  familyId?: string;
  publishedAt: string;
  updatedAt?: string;
  items: GroceryItem[];
  notes?: string;
  isCompleted?: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: GroceryCategory;
  expiryDate?: string; // ISO date string
  isLow?: boolean;
  addedAt: string;
  addedBy?: string;
}

export interface UserPreferences {
  fullName: string;
  householdSize: number;
  dietaryPreference: DietaryPreference;
  allergies: string[];
  dislikedIngredients: string[];
  dailyCalorieTarget: number;
  macroRatio?: {
    protein: number; // percentage e.g. 30
    carbs: number;   // percentage e.g. 45
    fat: number;     // percentage e.g. 25
  };
  cookingSkillLevel: "beginner" | "intermediate" | "advanced";
  maxCookingTimeMinutes: number;
  budgetLevel: "budget" | "moderate" | "gourmet";
  geminiApiKey?: string;
}

/* =========================================================
   User Roles, Profiles, Family & Recipe Moderation Types
   ========================================================= */

export type UserRole = "superadmin" | "admin" | "user";

// Backward-compatible alias
export type FamilyRole = UserRole | "superuser" | "organizer" | "member";

export type UserAccountStatus = "pending" | "approved" | "rejected" | "active";

export type FamilyStatus = "pending" | "approved" | "rejected";

export type RecipeModerationStatus = "private" | "pending_review" | "approved_public" | "rejected";

export interface UserProfile {
  id: string; // Supabase auth.users UUID
  email: string;
  fullName: string;
  role: UserRole;
  status: UserAccountStatus;
  familyId?: string;
  familyName?: string;
  familyCode?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  joinedAt: string;
  color?: string;
}

export interface Family {
  id: string;
  name: string;
  code: string; // Unique access code e.g. "FAM-7492"
  organizerEmail: string; // Admin's email
  organizerName: string;  // Admin's full name
  adminId?: string;       // Admin's auth user ID
  status: FamilyStatus;   // 'pending' until Superadmin approves, 'approved', 'rejected'
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  members: FamilyMember[];
}

export interface UserSession {
  userId?: string;
  memberId: string;
  familyId: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserAccountStatus;
  familyCode: string;
  familyName: string;
  isAuthenticated: boolean;
}


