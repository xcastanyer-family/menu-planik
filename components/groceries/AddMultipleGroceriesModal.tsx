"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Product, GroceryCategory, GroceryItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SupabaseProductService } from "@/lib/supabase/products";
import { formatAisleCategory } from "@/lib/utils";
import { triggerHapticFeedback } from "@/lib/barcode/scanner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  Package,
  ShoppingBag,
  SlidersHorizontal,
  X,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface AddMultipleGroceriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItems: GroceryItem[];
  onApplyItems: (updatedItems: GroceryItem[]) => void;
  onOpenCreateProduct?: () => void;
}

export const AddMultipleGroceriesModal: React.FC<AddMultipleGroceriesModalProps> = ({
  isOpen,
  onClose,
  currentItems,
  onApplyItems,
  onOpenCreateProduct,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlySelected, setOnlySelected] = useState(false);

  // Map of productId -> current quantity in this modal session
  // Also keeps track of items that were already in the grocery list
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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

  // Load products and initialize quantities from currentItems
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await SupabaseProductService.getProducts();
        const allProducts = res.products || [];
        setProducts(allProducts);

        // Pre-populate quantities from current grocery items
        const initialQty: Record<string, number> = {};

        currentItems.forEach((item) => {
          if (item.productId) {
            initialQty[item.productId] = (initialQty[item.productId] || 0) + item.amount;
          } else {
            // Match by name if productId isn't explicitly set
            const match = allProducts.find(
              (p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
            );
            if (match) {
              initialQty[match.id] = (initialQty[match.id] || 0) + item.amount;
            }
          }
        });

        setQuantities(initialQty);
      } catch (err) {
        console.error("Error carregant productes:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setSearchQuery("");
    setSelectedCategory("all");
    setOnlySelected(false);
  }, [isOpen, currentItems]);

  // Click on product card: if 0 -> 1; if >= 1 -> increment +1
  const handleCardClick = (product: Product) => {
    triggerHapticFeedback();
    setQuantities((prev) => {
      const current = prev[product.id] || 0;
      return {
        ...prev,
        [product.id]: current + 1,
      };
    });
  };

  // Explicit increment button
  const handleIncrement = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    triggerHapticFeedback();
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  // Explicit decrement button
  const handleDecrement = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    triggerHapticFeedback();
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: current - 1,
      };
    });
  };

  // Clear / remove item
  const handleRemove = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    triggerHapticFeedback();
    setQuantities((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    if (confirm("Vols desmarcar tots els productes seleccionats?")) {
      setQuantities({});
    }
  };

  // Total selected products and units
  const selectedEntries = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const totalSelectedCount = selectedEntries.length;
  const totalSelectedUnits = selectedEntries.reduce((sum, [, qty]) => sum + qty, 0);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "all" || p.category === selectedCategory;

      const matchesSelected = !onlySelected || (quantities[p.id] || 0) > 0;

      return matchesSearch && matchesCat && matchesSelected;
    });
  }, [products, searchQuery, selectedCategory, onlySelected, quantities]);

  // Apply changes to the shopping list
  const handleApply = () => {
    // 1. Build a lookup of selected quantities
    const selectedMap = new Map<string, number>();
    Object.entries(quantities).forEach(([prodId, qty]) => {
      if (qty > 0) {
        selectedMap.set(prodId, qty);
      }
    });

    // 2. We start from currentItems:
    // Update items that are in selectedMap, and track which products have been handled
    const handledProductIds = new Set<string>();
    const updatedList: GroceryItem[] = [];

    currentItems.forEach((item) => {
      const matchedProdId =
        item.productId ||
        products.find(
          (p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        )?.id;

      if (matchedProdId) {
        if (selectedMap.has(matchedProdId)) {
          // Update quantity
          const newQty = selectedMap.get(matchedProdId)!;
          updatedList.push({
            ...item,
            amount: newQty,
          });
          handledProductIds.add(matchedProdId);
        } else {
          // If the user removed this product (qty = 0) in the modal, we do NOT include it!
          // (It gets removed from the grocery list)
          handledProductIds.add(matchedProdId);
        }
      } else {
        // Custom manual item without matching product in catalog: keep as is
        updatedList.push(item);
      }
    });

    // 3. Add any newly selected products that weren't in the list before
    const newItems: GroceryItem[] = [];
    selectedMap.forEach((qty, prodId) => {
      if (!handledProductIds.has(prodId)) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          newItems.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            productId: prod.id,
            brand: prod.brand,
            barcode: prod.barcode,
            name: prod.name,
            amount: qty,
            unit: prod.defaultUnit || "u.",
            category: prod.category || "other",
            checked: false,
          });
        }
      }
    });

    const finalList = [...newItems, ...updatedList];
    onApplyItems(finalList);
    toast.success(
      `Llista de la compra actualitzada (${totalSelectedCount} productes seleccionats)`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Afegir Múltiples Articles a la Compra"
      maxWidth="4xl"
    >
      <div className="flex flex-col h-[75vh] max-h-[750px] -mx-6 -my-4">
        {/* Top Control Bar: Search and Category Filter */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cerca per nom, marca o codi de barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter: Only Selected */}
            <button
              type="button"
              onClick={() => setOnlySelected(!onlySelected)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 shrink-0 ${
                onlySelected
                  ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              <span>Només seleccionats</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  onlySelected
                    ? "bg-white/25 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {totalSelectedCount}
              </span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-sm"
                  : "bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Tots ({products.length})
            </button>
            {categories.map((cat) => {
              const countInCat = products.filter((p) => p.category === cat).length;
              if (countInCat === 0) return null;
              const selectedInCat = products.filter(
                (p) => p.category === cat && (quantities[p.id] || 0) > 0
              ).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-primary-600 text-white font-semibold shadow-sm"
                      : "bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <span>{formatAisleCategory(cat)}</span>
                  {selectedInCat > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {selectedInCat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-9 h-9 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-500">Carregant el catàleg de productes...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8">
              <Package className="w-10 h-10 text-zinc-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {onlySelected
                    ? "Encara no has seleccionat cap producte"
                    : searchQuery
                    ? "Cap producte coincideix amb la cerca"
                    : "No hi ha productes en aquesta categoria"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  {onlySelected
                    ? "Fes clic a qualsevol producte del catàleg per començar a afegir-ne a la llista."
                    : "Pots afegir nous productes al catàleg des de la secció de Productes o escanejant el codi de barres."}
                </p>
              </div>
              {onOpenCreateProduct && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenCreateProduct();
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Donar d&apos;Alta un Producte Nou
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const qty = quantities[product.id] || 0;
                const isSelected = qty > 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleCardClick(product)}
                    className={`relative rounded-2xl p-3.5 border transition cursor-pointer select-none flex flex-col justify-between group ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-400/30"
                        : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Top part of card */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                          {formatAisleCategory(product.category).split(" ")[0]}
                          {product.brand && (
                            <span className="truncate max-w-[120px] font-semibold text-zinc-600 dark:text-zinc-300">
                              • {product.brand}
                            </span>
                          )}
                        </span>

                        {/* Visual Badge when selected */}
                        {isSelected && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                            {qty} {product.defaultUnit || "u."}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm font-bold leading-snug line-clamp-2 ${
                          isSelected
                            ? "text-emerald-950 dark:text-emerald-100"
                            : "text-zinc-900 dark:text-white group-hover:text-primary-600 transition-colors"
                        }`}
                      >
                        {product.name}
                      </h4>

                      {product.packageSize && (
                        <p className="text-[11px] text-zinc-400">
                          Format: {product.packageSize} {product.defaultUnit || "g"}
                        </p>
                      )}
                    </div>

                    {/* Bottom controls */}
                    <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                      {isSelected ? (
                        /* Stepper Controls */
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => handleDecrement(e, product.id)}
                              className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs transition"
                              title="Reduir unitat (-1)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="w-8 text-center text-xs font-bold text-emerald-900 dark:text-emerald-200">
                              {qty}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleIncrement(e, product.id)}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs transition shadow-xs"
                              title="Afegir unitat (+1)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemove(e, product.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Treure de la llista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Add Button */
                        <div className="flex items-center justify-between w-full text-zinc-400 text-xs">
                          <span>Unitat: {product.defaultUnit || "u."}</span>
                          <span className="flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400 group-hover:underline">
                            <Plus className="w-3.5 h-3.5" />
                            Afegir
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Bottom Summary Bar */}
        <div className="p-4 sm:p-5 border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  {totalSelectedCount === 0
                    ? "Cap article seleccionat"
                    : `${totalSelectedCount} productes (${totalSelectedUnits} unitats)`}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {totalSelectedCount === 0
                    ? "Toca els productes de dalt per seleccionar-los"
                    : "Fes clic a Aplicar per guardar els canvis a la llista"}
                </p>
              </div>
            </div>

            {totalSelectedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-zinc-400 hover:text-red-500 underline ml-2"
              >
                Buidar tot
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancel·la
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApply}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Aplicar a la Llista ({totalSelectedCount})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
