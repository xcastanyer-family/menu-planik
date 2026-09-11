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
