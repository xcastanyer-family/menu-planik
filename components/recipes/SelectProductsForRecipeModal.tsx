"use client";

import React, { useState, useMemo } from "react";
import { Product, GroceryCategory, Ingredient } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatAisleCategory } from "@/lib/utils";
import { Search, Plus, Check, ScanLine, X, Package } from "lucide-react";

interface SelectProductsForRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentIngredients: Ingredient[];
  onSelectProducts: (selectedProducts: Product[]) => void;
  onOpenCreateProduct: () => void;
  onOpenScan: () => void;
}

export const SelectProductsForRecipeModal: React.FC<SelectProductsForRecipeModalProps> = ({
  isOpen,
  onClose,
  products,
  currentIngredients,
  onSelectProducts,
  onOpenCreateProduct,
  onOpenScan,
}) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Track selected product IDs in this modal session
  // Initially include products already present in the recipe
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    currentIngredients.forEach((ing) => {
      if (ing.productId) set.add(ing.productId);
    });
    return set;
  });

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

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === "all" || p.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  const toggleProduct = (prod: Product) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(prod.id)) {
        next.delete(prod.id);
      } else {
        next.add(prod.id);
      }
      return next;
    });
  };

  const handleApply = () => {
    const selectedProds = products.filter((p) => selectedIds.has(p.id));
    onSelectProducts(selectedProds);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cerca i Tria Productes per a la Recepta"
      description="Cerca fàcilment per nom o marca i selecciona els productes de la base de dades que porta la recepta."
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Cerca per nom o marca (ex: tomàquet, oli, ceba, arròs...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filters Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition ${
              categoryFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            Tots ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition flex items-center gap-1 ${
                  categoryFilter === cat
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <span>{formatAisleCategory(cat)}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Action Shortcuts: If product is not in database */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">
            No trobes el producte que necessites?
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenScan();
              }}
              className="text-xs h-7 px-2"
            >
              <ScanLine className="w-3 h-3 mr-1 text-primary-600" />
              Escanejar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenCreateProduct();
              }}
              className="text-xs h-7 px-2 text-emerald-600 dark:text-emerald-400"
            >
              <Plus className="w-3 h-3 mr-1" />
              Crear Nou
            </Button>
          </div>
        </div>

        {/* Product Cards Grid / List */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
              <Package className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium">
                {search
                  ? `No s'ha trobat cap producte coincident amb "${search}".`
                  : "No hi ha productes en aquesta categoria."}
              </p>
              {search && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onOpenCreateProduct();
                  }}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Crear producte &quot;{search}&quot;
                </Button>
              )}
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const isSelected = selectedIds.has(prod.id);
              return (
                <div
                  key={prod.id}
                  onClick={() => toggleProduct(prod)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-xs"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {prod.name}
                        </span>
                        {prod.brand && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            ({prod.brand})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <span>{formatAisleCategory(prod.category || "other")}</span>
                        <span>•</span>
                        <span>Unitat per defecte: {prod.defaultUnit || "u."}</span>
                        {prod.packageSize ? <span>({prod.packageSize} {prod.defaultUnit})</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-lg">
                        Afegit
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium hover:text-emerald-600">
                        + Afegir
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with summary and action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-3">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <strong>{selectedIds.size}</strong> producte{selectedIds.size !== 1 ? "s" : ""} seleccionat{selectedIds.size !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel·la
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Aplica a la Recepta
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

