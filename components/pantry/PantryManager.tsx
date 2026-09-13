"use client";

import React, { useState } from "react";
import { PantryItem } from "@/types";
import { Plus, Trash2, Sparkles, Package, AlertTriangle, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PantryManagerProps {
  items: PantryItem[];
  onDeleteItem: (id: string) => void;
  onOpenAddItemModal: () => void;
  onCookWithPantry: () => void;
  isGeneratingRecipes?: boolean;
}

export const PantryManager: React.FC<PantryManagerProps> = ({
  items,
  onDeleteItem,
  onOpenAddItemModal,
  onCookWithPantry,
  isGeneratingRecipes,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const exp = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = (exp - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 4;
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    const exp = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return exp < now;
  };

  const expiringCount = items.filter((i) => isExpiringSoon(i.expiryDate) || isExpired(i.expiryDate)).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            El teu Rebost
          </h2>

          {expiringCount > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {expiringCount} {expiringCount === 1 ? "ingredient a punt de caducar" : "ingredients a punt de caducar"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-col sm:flex-row">
          <Button
            variant="primary"
            onClick={onCookWithPantry}
            isLoading={isGeneratingRecipes}
            className="w-full sm:w-auto justify-center bg-gradient-to-r from-emerald-600 to-primary-600 hover:from-emerald-700 hover:to-primary-700 text-white shadow-md shadow-emerald-600/20"
          >
            <Sparkles className="w-4 h-4 text-emerald-100 mr-1.5" />
            Què cuino amb això?
          </Button>

          <Button variant="outline" onClick={onOpenAddItemModal} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-1.5" />
            Afegeix Ingredient
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Cerca ingredient al rebost..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
        >
          <option value="all">Totes les seccions</option>
          <option value="produce">🥦 Fruita i Verdura</option>
          <option value="dairy">🧀 Làctics i Ous</option>
          <option value="meat">🥩 Carn i Peix</option>
          <option value="pantry">🍝 Rebost i Espècies</option>
          <option value="bakery">🍞 Pa i Forn</option>
          <option value="frozen">❄️ Congelats</option>
        </select>
      </div>

      {/* Pantry Grid List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Cap ingredient trobat
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Afegeix els aliments que tens a la nevera o al rebost per rebre receptes d'aprofitament amb la IA.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={onOpenAddItemModal}>
              <Plus className="w-4 h-4" />
              Afegeix el primer ingredient
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const expiring = isExpiringSoon(item.expiryDate);
            const expired = isExpired(item.expiryDate);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 shadow-sm hover:border-emerald-400 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </h4>
                    {expired ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded">
                        Caducat
                      </span>
                    ) : expiring ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                        A punt de caducar
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {item.amount} {item.unit}
                    </span>
                    {item.expiryDate && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        Caducitat: {item.expiryDate}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
