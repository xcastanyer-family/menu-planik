"use client";

import React from "react";
import Link from "next/link";
import { GroceryItem, GroceryCategory, PublishedShoppingList } from "@/types";
import { formatAisleCategory, triggerConfetti } from "@/lib/utils";
import { Check, Trash2, Plus, Share2, RefreshCw, ShoppingBag, Send, CheckCircle2, ShoppingCart, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface GroceryListViewProps {
  items: GroceryItem[];
  publishedList?: PublishedShoppingList | null;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
  onSyncFromMealPlan: () => void;
  onPublishList: () => void;
  onOpenAddItemModal: () => void;
  onOpenMultiAddModal: () => void;
  onOpenShareModal: () => void;
}

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  items,
  publishedList,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onSyncFromMealPlan,
  onPublishList,
  onOpenAddItemModal,
  onOpenMultiAddModal,
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
      triggerConfetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.7 },
      });
      toast.success("Compra completada al 100%! Molt bé!");
    }
  };

  const publishedPendingCount = publishedList ? publishedList.items.filter((i) => !i.checked).length : 0;

  return (
    <div className="space-y-6">
      {/* Published List Status Banner */}
      {publishedList && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Llista activa publicada per anar al supermercat
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Activa
                </span>
              </div>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                Publicada el {new Date(publishedList.publishedAt).toLocaleDateString("ca-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} • {publishedPendingCount} productes pendents de comprar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onPublishList}
              className="border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/60 text-xs flex-1 sm:flex-initial"
              title="Actualitza la llista publicada amb els canvis que hagis fet aquí"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualitza Publicació
            </Button>
            <Link href="/compra" className="flex-1 sm:flex-initial">
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm font-semibold"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Ves a Compra
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Top Header & Summary Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-600" />
              Revisió de la Llista de Compra
            </h2>
            <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-700/50">
              Borrador editable
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Revisa i personalitza els ingredients abans de publicar la llista definitiva per anar al supermercat.
          </p>

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
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncFromMealPlan}
            title="Recalcula la compra des del menú actual"
            className="text-xs justify-center"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Actualitza</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenShareModal}
            className="text-xs justify-center"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            <span>Comparteix</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAddItemModal}
            className="text-xs justify-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Article Individual</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenMultiAddModal}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm text-xs justify-center"
            title="Afegeix múltiples articles del catàleg de cop"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            <span>Afegir Múltiples</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onPublishList}
            className="col-span-2 sm:col-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 font-semibold text-xs justify-center"
            title="Publica la llista perquè estigui disponible a la pantalla de Compra al supermercat"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>Publicar Llista</span>
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
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="sm" onClick={onOpenMultiAddModal} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm">
              <LayoutGrid className="w-3.5 h-3.5 mr-1" />
              Afegir Múltiples
            </Button>
            <Button variant="outline" size="sm" onClick={onSyncFromMealPlan}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Importa del Menú
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenAddItemModal}>
              <Plus className="w-3.5 h-3.5 mr-1" />
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
