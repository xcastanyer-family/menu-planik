"use client";

import React, { useState, useEffect } from "react";
import { UserPreferences, DietaryPreference, UserSession } from "@/types";
import { useRouter } from "next/navigation";
import { LocalStore } from "@/lib/storage/local-store";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Settings,
  Save,
  Key,
  Shield,
  Download,
  Upload,
  RotateCcw,
  HeartHandshake,
  LogOut,
  User,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences>(LocalStore.getPreferences());
  const [session, setSession] = useState<UserSession>(LocalStore.getCurrentSession());
  const [allergiesText, setAllergiesText] = useState("");
  const [dislikesText, setDislikesText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const refreshSession = () => {
    setSession(LocalStore.getCurrentSession());
  };

  useEffect(() => {
    const p = LocalStore.getPreferences();
    setPrefs(p);
    setAllergiesText(p.allergies.join(", "));
    setDislikesText(p.dislikedIngredients.join(", "));
    refreshSession();

    window.addEventListener("menuplanik_session_changed", refreshSession);
    return () => {
      window.removeEventListener("menuplanik_session_changed", refreshSession);
    };
  }, []);

  const handleLogout = () => {
    LocalStore.logout();
    toast.success("Sessió tancada correctament.");
    router.push("/login");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const allergies = allergiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const dislikes = dislikesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: UserPreferences = {
      ...prefs,
      allergies,
      dislikedIngredients: dislikes,
    };

    LocalStore.savePreferences(updated);
    setPrefs(updated);
    toast.success("Configuració desada amb èxit!");
  };

  const handleExportBackup = () => {
    const fullData = {
      preferences: LocalStore.getPreferences(),
      recipes: LocalStore.getRecipes(),
      mealPlan: LocalStore.getMealPlan(),
      pantry: LocalStore.getPantry(),
      groceries: LocalStore.getGroceries(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menuplanik-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Còpia de seguretat exportada amb èxit!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.recipes) LocalStore.saveRecipes(parsed.recipes);
        if (parsed.mealPlan) LocalStore.saveMealPlan(parsed.mealPlan);
        if (parsed.pantry) LocalStore.savePantry(parsed.pantry);
        if (parsed.groceries) LocalStore.saveGroceries(parsed.groceries);
        if (parsed.preferences) {
          LocalStore.savePreferences(parsed.preferences);
          setPrefs(parsed.preferences);
        }
        toast.success("Dades restaurades amb èxit des de la còpia de seguretat!");
        setTimeout(() => window.location.reload(), 600);
      } catch {
        toast.error("Fitxer de còpia de seguretat no vàlid o malmès.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (!confirm("Segur que vols inicialitzar la base de dades (receptes, menús, rebost i compra) i restablir tant el núvol com les dades locals?")) {
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading("Inicialitzant la base de dades...");
    try {
      await fetch("/api/init-db", { method: "POST" });
      LocalStore.resetAllToDefault();
      toast.success("Base de dades i dades locals inicialitzades amb èxit!", { id: toastId });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      console.error(e);
      LocalStore.resetAllToDefault();
      toast.success("Dades restablertes localment.", { id: toastId });
      setTimeout(() => window.location.reload(), 600);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            Preferències i Configuració
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Personalitza el teu perfil nutricional, les racions i les claus d'IA.
          </p>
        </div>
      </div>

      {/* User Session & Account Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {session.role === "superadmin" ? (
              <Crown className="w-5 h-5 text-amber-500" />
            ) : session.role === "admin" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            ) : (
              <User className="w-5 h-5 text-sky-500" />
            )}
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Sessió Activa: {session.name}
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {session.role === "superadmin" ? "Superadmin" : session.role === "admin" ? "Admin Família" : "Usuari"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Correu: <span className="font-medium text-zinc-700 dark:text-zinc-300">{session.email || "Sense correu"}</span>
            {session.familyName && session.familyName !== "Sense sessió activa" && (
              <span> • Família: <span className="font-medium text-zinc-700 dark:text-zinc-300">{session.familyName}</span></span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {session.isAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Tanca la Sessió
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto"
            >
              Inicia la Sessió
            </Button>
          )}
        </div>
      </div>

      {/* Family Quick Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            Entitat Família & Codi d'Accés
          </h2>
          <p className="text-xs text-zinc-500">
            Gestiona els membres de la teva llar i el codi d'accés sense contrasenya.
          </p>
        </div>

        <a href="/family">
          <Button type="button" variant="primary" size="sm">
            Gestiona la Família →
          </Button>
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dietary Preferences Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <HeartHandshake className="w-4 h-4 text-primary-600" />
            Perfil Nutricional i Dieta
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Estil Alimentari Predeterminat"
              value={prefs.dietaryPreference}
              onChange={(e) =>
                setPrefs({ ...prefs, dietaryPreference: e.target.value as DietaryPreference })
              }
            >
              <option value="mediterranean">🥗 Dieta Mediterrània</option>
              <option value="omnivore">🥩 Omnívora Equilibrada</option>
              <option value="vegetarian">🥑 Vegetariana</option>
              <option value="vegan">🌱 Vegana</option>
              <option value="pescatarian">🐟 Pescatariana</option>
              <option value="low-carb">📉 Baixa en Carbohidrats (Low Carb)</option>
              <option value="keto">🥑 Cetogènica (Keto)</option>
              <option value="gluten-free">🌾 Sense Gluten</option>
              <option value="dairy-free">🥛 Sense Lactosa</option>
            </Select>

            <Input
              label="Nombre de persones (Racions per àpat)"
              type="number"
              min={1}
              max={12}
              value={prefs.householdSize}
              onChange={(e) => setPrefs({ ...prefs, householdSize: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Objectiu de Calories Diàries (kcal)"
              type="number"
              step={50}
              min={1200}
              max={4500}
              value={prefs.dailyCalorieTarget}
              onChange={(e) => setPrefs({ ...prefs, dailyCalorieTarget: Number(e.target.value) })}
            />

            <Input
              label="Temps Màxim de Preparació (min)"
              type="number"
              value={prefs.maxCookingTimeMinutes}
              onChange={(e) => setPrefs({ ...prefs, maxCookingTimeMinutes: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Al·lèrgies o Intol·leràncies"
              placeholder="ex. Gluten, Fruits secs, Lactosa..."
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              helperText="Separades per comes"
            />

            <Input
              label="Ingredients a excloure (Dislikes)"
              placeholder="ex. Coriandre, Fetge, Ceba crua..."
              value={dislikesText}
              onChange={(e) => setDislikesText(e.target.value)}
              helperText="Separades per comes"
            />
          </div>
        </div>

        {/* Gemini API Key Configuration */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Key className="w-4 h-4 text-amber-500" />
            Clau Google Gemini AI (Opcional)
          </h2>

          <Input
            label="Clau d'API Gemini"
            type="password"
            placeholder="AIzaSy..."
            value={prefs.geminiApiKey || ""}
            onChange={(e) => setPrefs({ ...prefs, geminiApiKey: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" className="px-8">
            <Save className="w-4 h-4" />
            Desa la Configuració
          </Button>
        </div>
      </form>

      {/* Backup & Reset Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <Shield className="w-4 h-4 text-emerald-600" />
          Còpia de Seguretat i Restauració
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Button variant="outline" onClick={handleExportBackup} className="w-full">
            <Download className="w-4 h-4" />
            Exporta Còpia JSON
          </Button>

          <label className="w-full">
            <span className="inline-flex items-center justify-center font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2.5 gap-2 cursor-pointer w-full transition duration-150">
              <Upload className="w-4 h-4" />
              Restaura des de JSON
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <Button
            variant="danger"
            onClick={handleResetData}
            isLoading={isResetting}
            disabled={isResetting}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4" />
            Inicialitza Base de Dades
          </Button>
        </div>
      </div>
    </div>
  );
}
