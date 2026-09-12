import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDayName(day: string): string {
  const map: Record<string, string> = {
    monday: "Dilluns",
    tuesday: "Dimarts",
    wednesday: "Dimecres",
    thursday: "Dijous",
    friday: "Divendres",
    saturday: "Dissabte",
    sunday: "Diumenge",
  };
  return map[day.toLowerCase()] || day;
}

export function formatMealTypeName(type: string): string {
  const map: Record<string, string> = {
    breakfast: "Esmorzar",
    lunch: "Dinar",
    dinner: "Sopar",
    snack: "Berenar",
  };
  return map[type.toLowerCase()] || type;
}

export function formatAisleCategory(category: string): string {
  const map: Record<string, string> = {
    produce: "🥦 Fruita i Verdura",
    dairy: "🧀 Làctics i Ous",
    meat: "🥩 Carn i Peix",
    bakery: "🍞 Pa i Forn",
    pantry: "🍝 Rebost i Espècies",
    frozen: "❄️ Congelats",
    beverages: "🧃 Begudes",
    other: "📦 Altres",
  };
  return map[category.toLowerCase()] || category;
}

export interface RecipeFoodInfo {
  icon: string;
  label: string;
  bgLight: string;
  bgDark: string;
  badgeClass: string;
}

export function getRecipeFoodInfo(recipe: { title?: string; tags?: string[]; foodIcon?: string }): RecipeFoodInfo {
  if (recipe.foodIcon) {
    return {
      icon: recipe.foodIcon,
      label: "Especialitat",
      bgLight: "bg-amber-500/10",
      bgDark: "bg-amber-950/20",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    };
  }

  const text = `${recipe.title || ""} ${(recipe.tags || []).join(" ")}`.toLowerCase();

  if (/\b(?:pasta|macarr|espaguet|spaghett|tallarin|penne|ravioli|lasany|canelo|fideu)\b/.test(text)) {
    return {
      icon: "🍝",
      label: "Pasta",
      bgLight: "bg-orange-500/10",
      bgDark: "bg-orange-950/20",
      badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    };
  }
  if (/\b(?:arros|arròs|arroz|paella|risotto)\b/.test(text)) {
    return {
      icon: "🥘",
      label: "Arròs",
      bgLight: "bg-amber-500/10",
      bgDark: "bg-amber-950/20",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    };
  }
  if (/\b(?:salmo|salmó|lluc|lluç|merluza|bacalla|bacallà|orada|llobarro|lubina|sipia|sípia|calamar|peix|marisc|gamba|tonyina|atun|pop)\b/.test(text)) {
    return {
      icon: "🐟",
      label: "Peix i Marisc",
      bgLight: "bg-sky-500/10",
      bgDark: "bg-sky-950/20",
      badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    };
  }
  if (/\b(?:pollastre|pollo|chicken|gall dindi|pavo|aletes)\b/.test(text)) {
    return {
      icon: "🍗",
      label: "Aus",
      bgLight: "bg-yellow-500/10",
      bgDark: "bg-yellow-950/20",
      badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    };
  }
  if (/\b(?:vedella|ternera|carn|carne|porc|cerdo|mandonguill|hamburgues|burger|botifarra|costell|llom)\b/.test(text)) {
    return {
      icon: "🥩",
      label: "Carn",
      bgLight: "bg-rose-500/10",
      bgDark: "bg-rose-950/20",
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    };
  }
  if (/\b(?:truita|tortilla|ous|ou|frittata|remenat)\b/.test(text)) {
    return {
      icon: "🍳",
      label: "Ous",
      bgLight: "bg-amber-500/10",
      bgDark: "bg-amber-950/20",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    };
  }
  if (/\b(?:llenties|lentejas|cigrons|garbanzos|mongetes|alubias|estofat|guisat|faves|escudella|sopa|crema|pure|caldo|brou)\b/.test(text)) {
    return {
      icon: "🍲",
      label: "Cullera i Llegums",
      bgLight: "bg-teal-500/10",
      bgDark: "bg-teal-950/20",
      badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
    };
  }
  if (/\b(?:amanida|ensalada|salad|poke|carpaccio|tartar)\b/.test(text)) {
    return {
      icon: "🥗",
      label: "Amanida",
      bgLight: "bg-emerald-500/10",
      bgDark: "bg-emerald-950/20",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    };
  }
  if (/\b(?:pizza|coca|focaccia|quiche|empanada)\b/.test(text)) {
    return {
      icon: "🍕",
      label: "Forn i Pizza",
      bgLight: "bg-red-500/10",
      bgDark: "bg-red-950/20",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    };
  }
  if (/\b(?:civada|avena|porridge|pancake|crep|smoothie|iogurt|esmorzar|desayuno|torrada|pastis|galet)\b/.test(text)) {
    return {
      icon: "🥐",
      label: "Esmorzar / Dolç",
      bgLight: "bg-amber-500/10",
      bgDark: "bg-amber-950/20",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    };
  }
  if (/\b(?:verdura|verdures|espinac|carbass|albergin|escalivada|samfaina|wok|saltat)\b/.test(text)) {
    return {
      icon: "🥦",
      label: "Verdures",
      bgLight: "bg-green-500/10",
      bgDark: "bg-green-950/20",
      badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    };
  }

  return {
    icon: "🍽️",
    label: "Plat Casolà",
    bgLight: "bg-primary-500/10",
    bgDark: "bg-primary-950/20",
    badgeClass: "bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200",
  };
}

export function getRecipeComplexity(recipe: {
  complexity?: "simple" | "complex";
  difficulty?: "easy" | "medium" | "hard";
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  tags?: string[];
}): "simple" | "complex" {
  if (recipe.complexity) return recipe.complexity;
  if (recipe.difficulty === "hard") return "complex";
  if (recipe.tags?.some((t) => t.toLowerCase().includes("complex") || t.toLowerCase().includes("elaborat"))) return "complex";
  const totalMinutes = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  if (totalMinutes > 35) return "complex";
  return "simple";
}

export async function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
}) {
  if (typeof window === "undefined") return;
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti(options);
  } catch {
    // Ignore if not available
  }
}

