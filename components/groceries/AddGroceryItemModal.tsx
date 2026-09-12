"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GroceryItem, GroceryCategory, Product } from "@/types";
import { SupabaseProductService } from "@/lib/supabase/products";
import { ScanBarcodeModal } from "@/components/products/ScanBarcodeModal";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import { Plus, Camera, Search, Package, Check, Sparkles } from "lucide-react";
import { formatAisleCategory } from "@/lib/utils";
import { toast } from "sonner";

interface AddGroceryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: GroceryItem) => void;
}

export const AddGroceryItemModal: React.FC<AddGroceryItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("u.");
  const [category, setCategory] = useState<GroceryCategory>("produce");

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      SupabaseProductService.getProducts().then((res) => {
        setProducts(res.products || []);
      });
      setSelectedProduct(null);
      setSearchQuery("");
      setAmount(1);
      setUnit("u.");
      setCategory("produce");
    }
  }, [isOpen]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setCategory(product.category || "other");
    setUnit(product.defaultUnit || "u.");
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = selectedProduct ? selectedProduct.name : searchQuery.trim();
    if (!finalName) {
      toast.error("El nom del producte és obligatori.");
      return;
    }

    setIsSaving(true);
    try {
      let productRef = selectedProduct;

      // Si no ha seleccionat un producte existent de la llista, assegurem que es dóna d'alta a la BD de productes!
      if (!productRef) {
        const foundOrCreated = await SupabaseProductService.findOrCreateProduct(
          finalName,
          category,
          unit
        );
        productRef = foundOrCreated;
      }

      const newItem: GroceryItem = {
        id: `item-${Date.now()}`,
        productId: productRef?.id,
        brand: productRef?.brand,
        barcode: productRef?.barcode,
        name: finalName,
        amount: Number(amount) || 1,
        unit: unit.trim() || productRef?.defaultUnit || "u.",
        category: category || productRef?.category || "other",
        checked: false,
      };

      onAddItem(newItem);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al desar l'article.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Afegeix Producte a la Llista de Compra" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Barcode scan / Quick add product from database */}
          <div className="bg-primary-50/60 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 p-3 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-primary-900 dark:text-primary-200">
              <Package className="w-4 h-4 text-primary-600" />
              <span>La llista de la compra fa servir productes de la base de dades.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsScanOpen(true)}
              className="text-xs shrink-0 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              Escaneja Codi
            </Button>
          </div>

          {/* Search Product in Database */}
          <div className="space-y-1.5 relative">
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Cerca o Tria un Producte de la BD *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Ex: Llet sencera, Macarrons, Tomàquet..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedProduct && e.target.value !== selectedProduct.name) {
                    setSelectedProduct(null);
                  }
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Dropdown Suggestions from Products table */}
            {searchQuery && !selectedProduct && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-48 overflow-y-auto p-1 space-y-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {p.name}
                      </span>
                      {p.brand && (
                        <span className="ml-2 text-[10px] text-primary-600 dark:text-primary-400 font-medium">
                          ({p.brand})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {formatAisleCategory(p.category)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Product Badge */}
            {selectedProduct && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Producte vinculat a la BD: {selectedProduct.name} {selectedProduct.brand ? `(${selectedProduct.brand})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Canvia
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Quantitat
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Unitat
              </label>
              <input
                type="text"
                required
                placeholder="g, kg, l, u."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Secció / Passadís
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GroceryCategory)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="produce">🥦 Fruita i Verdura</option>
              <option value="dairy">🧀 Làctics i Ous</option>
              <option value="meat">🥩 Carn i Peix</option>
              <option value="bakery">🍞 Pa i Forn</option>
              <option value="pantry">🍝 Rebost i Espècies</option>
              <option value="frozen">❄️ Congelats</option>
              <option value="beverages">🧃 Begudes</option>
              <option value="other">📦 Altres</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs text-primary-600 dark:text-primary-400"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nou producte manual
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel·la
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                <Plus className="w-4 h-4 mr-1" />
                {isSaving ? "Guardant..." : "Afegeix a la Llista"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal for barcode scanning */}
      <ScanBarcodeModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onProductCreated={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          handleSelectProduct(newProd);
        }}
      />

      {/* Modal for manual product registration */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onProductSaved={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          handleSelectProduct(newProd);
        }}
        onOpenScan={() => setIsScanOpen(true)}
      />
    </>
  );
};
