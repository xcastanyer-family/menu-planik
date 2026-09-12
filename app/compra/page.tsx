"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GroceryItem, GroceryCategory, PublishedShoppingList } from "@/types";
import { LocalStore } from "@/lib/storage/local-store";
import { formatAisleCategory, triggerConfetti } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  ShoppingBag,
  Check,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowLeft,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Clock,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

export default function CompraPage() {
  const router = useRouter();
  const [publishedList, setPublishedList] = useState<PublishedShoppingList | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickAmount, setQuickAmount] = useState("1");
  const [quickUnit, setQuickUnit] = useState("u.");
  const [quickCategory, setQuickCategory] = useState<GroceryCategory>("other");

  const loadData = () => {
    setPublishedList(LocalStore.getPublishedShoppingList());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("menuplanik_published_groceries_changed", loadData);
    return () => {
      window.removeEventListener("menuplanik_published_groceries_changed", loadData);
    };
  }, []);

  const items = publishedList?.items || [];
  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const pendingCount = totalCount - checkedCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleToggle = (item: GroceryItem) => {
    LocalStore.togglePublishedItem(item.id);
    if (!item.checked && checkedCount + 1 === totalCount && totalCount > 0) {
      triggerConfetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
      toast.success("Molt bé! Has comprat el 100% de la llista! 🎉");
    }
  };

  const handleRemoveItem = (id: string, name: string) => {
    LocalStore.removePublishedItem(id);
    toast.success(`Eliminat: ${name}`);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const newItem: GroceryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: quickName.trim(),
      amount: parseFloat(quickAmount) || 1,
      unit: quickUnit.trim() || "u.",
      category: quickCategory,
      checked: false,
      addedBy: LocalStore.getCurrentSession()?.name || "Família",
    };

    LocalStore.addPublishedItem(newItem);
    setQuickName("");
    setQuickAmount("1");
    setIsQuickAddOpen(false);
    toast.success(`Afegit a la compra: ${newItem.name}`);
  };

  const handleFinishShopping = () => {
    if (confirm("Vols finalitzar aquesta compra? La llista es retirarà de la pantalla de compra.")) {
      LocalStore.unpublishShoppingList();
      toast.success("Compra finalitzada amb èxit!");
    }
  };

  const categories: GroceryCategory[] = [
    "produce",
    "dairy",
    "meat",
    "bakery",
    "pantry",
    "frozen",
    "beverages",
    "other",
  ];

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesFilter =
      filter === "all" ? true : filter === "pending" ? !item.checked : item.checked;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Empty State when no list is published */}
      {!publishedList || items.length === 0 ? (
        <div className="max-w-2xl mx-auto mt-6 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 sm:p-12 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/60 flex items-center justify-center mx-auto text-primary-600 dark:text-primary-400">
            <Store className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              No hi ha cap llista de compra publicada
            </h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
              Quan tinguis planificat el menú, revisa els ingredients necessaris, ajusta les quantitats a la teva mida i fes clic a <strong>"Publicar Llista"</strong>.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-primary-500" />
              Com funciona el procés de compra:
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Planifica la setmana al <strong>Planificador</strong>.</li>
              <li>A <strong>Llista de Compra</strong> pots afegir o eliminar productes.</li>
              <li>Prem <strong>Publicar Llista</strong> i tindràs aquesta pantalla llesta per anar marcant al supermercat!</li>
            </ol>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/groceries">
              <Button variant="primary" size="md" className="w-full sm:w-auto shadow-md">
                <ClipboardList className="w-4 h-4" />
                Ves a Llista de Compra per publicar-la
              </Button>
            </Link>
            <Link href="/planner">
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                Ves al Menú Setmanal
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Header Card for In-Store Shopping */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    Compra al Supermercat
                  </h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Publicada el {new Date(publishedList.publishedAt).toLocaleDateString("ca-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Afegeix Producte
                </Button>

                <Link href="/groceries">
                  <Button variant="outline" size="sm" className="text-xs" title="Modifica la llista borrador">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Edita Borrador
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFinishShopping}
                  className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Finalitza Compra
                </Button>
              </div>
            </div>

            {/* Quick in-store Add Form */}
            {isQuickAddOpen && (
              <form
                onSubmit={handleQuickAdd}
                className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/60 animate-in fade-in space-y-3"
              >
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Afegeix un producte ràpid mentre compres:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nom del producte (ex: Cafè, Sucre)"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      className="w-16 px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                    />
                    <input
                      type="text"
                      placeholder="u., kg, l"
                      value={quickUnit}
                      onChange={(e) => setQuickUnit(e.target.value)}
                      className="flex-1 px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value as GroceryCategory)}
                    className="px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="produce">Fruita i Verdura</option>
                    <option value="dairy">Làctics i Ous</option>
                    <option value="meat">Carn i Peix</option>
                    <option value="bakery">Pa i Forn</option>
                    <option value="pantry">Rebost</option>
                    <option value="frozen">Congelats</option>
                    <option value="beverages">Begudes</option>
                    <option value="other">Altres</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="text-xs"
                  >
                    Cancel·la
                  </Button>
                  <Button type="submit" variant="primary" size="sm" className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Afegir al carro
                  </Button>
                </div>
              </form>
            )}

            {/* Shopping Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {checkedCount} de {totalCount} productes al carro
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === "all"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Tots ({totalCount})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === "pending"
                    ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Pendents ({pendingCount})
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === "completed"
                    ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Comprats ({checkedCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca producte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Grouped Category Sections */}
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center text-zinc-500 text-sm">
              {searchQuery
                ? `Cap producte coincideix amb "${searchQuery}"`
                : filter === "pending"
                ? "🎉 Felicitats! Has comprat tots els productes de la llista!"
                : "Cap producte comprat encara."}
            </div>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => {
                const categoryItems = filteredItems.filter((i) => i.category === cat);
                if (categoryItems.length === 0) return null;

                const catChecked = categoryItems.filter((i) => i.checked).length;

                return (
                  <div
                    key={cat}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                        {formatAisleCategory(cat)}
                      </h3>
                      <span className="text-xs font-semibold text-zinc-400">
                        {catChecked} / {categoryItems.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggle(item)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            item.checked
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 opacity-70"
                              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-700/60 hover:border-emerald-400 hover:bg-white dark:hover:bg-zinc-800 active:scale-[0.99]"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Big Touch-friendly Checkbox */}
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                item.checked
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                  : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>

                            <div>
                              <span
                                className={`text-sm font-semibold transition-all ${
                                  item.checked
                                    ? "line-through text-zinc-400 dark:text-zinc-500"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.inPantry && !item.checked && (
                                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  (Al rebost)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700">
                              {item.amount} {item.unit}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id, item.name);
                              }}
                              className="text-zinc-300 hover:text-rose-500 p-1 transition"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
