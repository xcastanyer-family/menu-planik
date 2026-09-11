"use client";

import React from "react";
import { GroceryItem, GroceryCategory } from "@/types";
import { formatAisleCategory } from "@/lib/utils";
import { Check, Trash2, Plus, Share2, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface GroceryListViewProps {
  items: GroceryItem[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
  onSyncFromMealPlan: () => void;
  onOpenAddItemModal: () => void;
  onOpenShareModal: () => void;
}

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  items,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onSyncFromMealPlan,
  onOpenAddItemModal,
  onOpenShareModal,
}) => {
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

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleToggle = (item: GroceryItem) => {
    onToggleItem(item.id);
    if (!item.checked && checkedCount + 1 === totalCount && totalCount > 0) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.7 },
      });
      toast.success("Compra completada al 100%! Molt bé!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            Llista de la Compra
          </h2>

          {/* Shopping Progress Bar */}
          {totalCount > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-48 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {checkedCount} de {totalCount} agafats ({progressPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onSyncFromMealPlan} title="Recalcula la compra des del menú actual">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualitza del Menú
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenShareModal}>
            <Share2 className="w-3.5 h-3.5" />
            Comparteix
          </Button>

          <Button variant="primary" size="sm" onClick={onOpenAddItemModal}>
            <Plus className="w-4 h-4" />
            Afegeix Article
          </Button>
        </div>
      </div>

      {/* Main List grouped by Aisle */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Cap article a la llista de la compra
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
            Pots sincronitzar els ingredients del teu pla setmanal amb un sol clic o afegir articles manualment.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="primary" size="sm" onClick={onSyncFromMealPlan}>
              <RefreshCw className="w-3.5 h-3.5" />
              Importa del Menú
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenAddItemModal}>
              <Plus className="w-3.5 h-3.5" />
              Afegeix Article
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const categoryItems = items.filter((i) => i.category === cat);
            if (categoryItems.length === 0) return null;

            return (
              <div key={cat} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    {formatAisleCategory(cat)}
                  </h3>
                  <span className="text-xs font-medium text-zinc-400">
                    {categoryItems.length} {categoryItems.length === 1 ? "article" : "articles"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggle(item)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                        item.checked
                          ? "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60"
                          : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800/80 hover:border-primary-400 hover:bg-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                            item.checked
                              ? "bg-primary-600 border-primary-600 text-white"
                              : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              item.checked
                                ? "line-through text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.inPantry && !item.checked && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              (Disponible al rebost)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-700">
                          {item.amount} {item.unit}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item.id);
                          }}
                          className="text-zinc-400 hover:text-red-500 p-1 transition"
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

          {/* Bottom Actions */}
          {checkedCount > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={onClearCompleted} className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
                Elimina articles completats ({checkedCount})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
