"use client";

import React, { useState, useEffect } from "react";
import { Product, GroceryCategory } from "@/types";
import { SupabaseProductService } from "@/lib/supabase/products";
import { ContinuousProductScanner } from "@/components/products/ContinuousProductScanner";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import { Button } from "@/components/ui/Button";
import { formatAisleCategory } from "@/lib/utils";
import {
  Package,
  Plus,
  Camera,
  ScanBarcode,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Mode de vista: "scanner" (dedicada a la captura ràpida) o "catalog" (llistat de productes existents)
  const [viewMode, setViewMode] = useState<"scanner" | "catalog">("scanner");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await SupabaseProductService.getProducts();
      setProducts(res.products || []);
      setTableMissing(Boolean(res.tableMissing));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Vols eliminar el producte "${name}" de la base de dades?`)) {
      const ok = await SupabaseProductService.deleteProduct(id);
      if (ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success(`Producte "${name}" eliminat`);
      } else {
        toast.error("Error al eliminar el producte");
      }
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

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" ? true : p.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Alert if table is missing in Supabase */}
      {tableMissing && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">
              Taula &apos;products&apos; pendent de crear a Supabase
            </p>
            <p>
              Per emmagatzemar els productes a la base de dades de Supabase, executa l&apos;arxiu{" "}
              <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">
                lib/supabase/migration-products.sql
              </code>{" "}
              a l&apos;Editor SQL de Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Selector de mode superior (Pestanyes netes) */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode("scanner")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              viewMode === "scanner"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Captura Ràpida (Codi de Barres)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("catalog")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              viewMode === "catalog"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>Catàleg de Productes ({products.length})</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: PANTALLA DEDICADA DE CAPTURA RÀPIDA (MINIMALISTA, SENSE LLISTAT DE PRODUCTES) */}
      {viewMode === "scanner" && (
        <ContinuousProductScanner
          totalCatalogProducts={products.length}
          onOpenCatalog={() => setViewMode("catalog")}
          onProductSaved={(newProd) => {
            setProducts((prev) => {
              const existingIdx = prev.findIndex((p) => p.id === newProd.id);
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = newProd;
                return copy;
              }
              return [newProd, ...prev];
            });
          }}
        />
      )}

      {/* VISTA 2: CATÀLEG GENERAL DE PRODUCTES (CONSULTA, CERCA, EDICIÓ I ELIMINACIÓ) */}
      {viewMode === "catalog" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Header del Catàleg */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    Catàleg de Productes
                  </h1>
                  <p className="text-xs text-zinc-500">
                    Base de dades centralitzada de productes per a les receptes i la llista de la compra.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadProducts}
                title="Recarrega productes"
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Actualitza</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProductToEdit(null);
                  setIsCreateOpen(true);
                }}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nou Manual
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewMode("scanner")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Captura Ràpida (Codi)
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca per nom, marca o codi de barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Category selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Totes les categories ({products.length})</option>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {formatAisleCategory(cat)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin mx-auto mb-3" />
              Carregant productes de la base de dades...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {searchQuery || selectedCategory !== "all"
                    ? "Cap producte coincideix amb la cerca"
                    : "Encara no hi ha productes a la base de dades"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Dóna d&apos;alta productes enfocant el codi de barres amb el mòbil o introduint-los manualment.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="primary" size="sm" onClick={() => setViewMode("scanner")}>
                  <Camera className="w-4 h-4 mr-1.5" />
                  Inicia Captura Ràpida
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProductToEdit(null);
                    setIsCreateOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Alta Manual
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-sm hover:border-primary-400/60 dark:hover:border-primary-500/40 transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {product.name}
                        </h3>
                        {product.brand && (
                          <span className="inline-block text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md mt-0.5">
                            {product.brand}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg shrink-0">
                        {formatAisleCategory(product.category)}
                      </span>
                    </div>

                    {product.barcode && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <ScanBarcode className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{product.barcode}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
                      <span className="font-semibold">
                        Unitat: {product.defaultUnit || "u."}
                      </span>
                      {product.packageSize && (
                        <span>• Format: {product.packageSize}</span>
                      )}
                      {product.nutrition?.calories ? (
                        <span>• {product.nutrition.calories} kcal/100g</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => {
                        setProductToEdit(product);
                        setIsCreateOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Edita"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Edició / Creació Manual */}
          <CreateProductModal
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              setProductToEdit(null);
            }}
            productToEdit={productToEdit}
            onProductSaved={(saved) => {
              if (productToEdit) {
                setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
              } else {
                setProducts((prev) => [saved, ...prev]);
              }
            }}
            onOpenScan={() => setViewMode("scanner")}
          />
        </div>
      )}
    </div>
  );
}
