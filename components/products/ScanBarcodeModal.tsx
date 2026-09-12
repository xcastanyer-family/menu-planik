"use client";

import React, { useState, useRef } from "react";
import { Product, GroceryCategory } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SupabaseProductService } from "@/lib/supabase/products";
import { formatAisleCategory } from "@/lib/utils";
import {
  Camera,
  Upload,
  ScanBarcode,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Tag,
  Scale,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface ScanBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: Product) => void;
}

export const ScanBarcodeModal: React.FC<ScanBarcodeModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Partial<Product> | null>(null);

  const resetState = () => {
    setSelectedImage(null);
    setManualBarcode("");
    setIsScanning(false);
    setIsSaving(false);
    setScannedProduct(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Convert File to base64
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
      scanImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const scanImage = async (imageBase64: string, barcodeVal?: string) => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/ai/scan-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          barcode: barcodeVal || manualBarcode || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.product) {
        setScannedProduct({
          name: data.product.name || "",
          brand: data.product.brand || "",
          barcode: data.product.barcode || barcodeVal || "",
          category: data.product.category || "other",
          defaultUnit: data.product.defaultUnit || "u.",
          packageSize: data.product.packageSize,
          imageUrl: data.product.imageUrl || selectedImage || undefined,
          nutrition: data.product.nutrition,
          allergens: data.product.allergens || [],
          source: data.product.source || "barcode",
        });
        toast.success("Producte identificat amb èxit!");
      } else {
        toast.error(data.error || "No s'ha pogut reconèixer el codi o producte.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al connectar amb el servei d'identificació.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    scanImage("", manualBarcode.trim());
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct || !scannedProduct.name?.trim()) {
      toast.error("El nom del producte és obligatori.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await SupabaseProductService.addProduct(scannedProduct);
      if (saved) {
        toast.success(`Producte "${saved.name}" desat a la base de dades!`);
        if (onProductCreated) {
          onProductCreated(saved);
        }
        handleClose();
      } else {
        toast.error("Error al desar el producte a la base de dades.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperat desant el producte.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Escaneja Codi de Barres amb el Mòbil" maxWidth="lg">
      <div className="space-y-5">
        {/* Hidden Camera input with environment capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {!scannedProduct ? (
          <div className="space-y-4">
            {/* Action buttons to trigger mobile camera or file upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-800/80 bg-primary-50/50 dark:bg-primary-950/20 hover:bg-primary-100/60 dark:hover:bg-primary-900/30 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-600/30 group-hover:scale-110 transition-transform mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Obre la Càmera del Mòbil
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Apunta directament al codi de barres
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Puja una Foto
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Des de la teva galeria d&apos;imatges
                </span>
              </button>
            </div>

            {/* Direct barcode input option */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <form onSubmit={handleManualBarcodeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="O escriu el número de codi de barres (ex: 8410100...)"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" disabled={isScanning || !manualBarcode.trim()}>
                  Cerca Codi
                </Button>
              </form>
            </div>

            {/* Loading Indicator while scanning */}
            {isScanning && (
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center text-center space-y-3 animate-in fade-in">
                <div className="w-10 h-10 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    Analitzant amb IA i cercant informació...
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Llegint codi de barres, marca, categoria i valors nutricionals a la base de dades.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Scanned Product Confirmation Form */
          <form onSubmit={handleSaveProduct} className="space-y-4 animate-in fade-in">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Producte identificat! Revisa les dades abans de desar.
              </span>
              <button
                type="button"
                onClick={() => setScannedProduct(null)}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Tornar a escanejar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom del Producte *
                </label>
                <input
                  type="text"
                  required
                  value={scannedProduct.name || ""}
                  onChange={(e) =>
                    setScannedProduct({ ...scannedProduct, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Marca / Fabricant
                </label>
                <input
                  type="text"
                  placeholder="Ex: Hacendado, Gallo, Danone"
                  value={scannedProduct.brand || ""}
                  onChange={(e) =>
                    setScannedProduct({ ...scannedProduct, brand: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Codi de Barres
                </label>
                <input
                  type="text"
                  value={scannedProduct.barcode || ""}
                  onChange={(e) =>
                    setScannedProduct({ ...scannedProduct, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria de Passadís
                </label>
                <select
                  value={scannedProduct.category || "other"}
                  onChange={(e) =>
                    setScannedProduct({
                      ...scannedProduct,
                      category: e.target.value as GroceryCategory,
                    })
                  }
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

              {/* Default Unit & Package size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Unitat
                  </label>
                  <input
                    type="text"
                    value={scannedProduct.defaultUnit || "u."}
                    onChange={(e) =>
                      setScannedProduct({
                        ...scannedProduct,
                        defaultUnit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Mida / Format
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1000"
                    value={scannedProduct.packageSize || ""}
                    onChange={(e) =>
                      setScannedProduct({
                        ...scannedProduct,
                        packageSize: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Nutrients summary pills if present */}
            {scannedProduct.nutrition && (
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs flex items-center justify-around text-zinc-600 dark:text-zinc-400">
                <span>🔥 {scannedProduct.nutrition.calories || 0} kcal</span>
                <span>🥩 {scannedProduct.nutrition.protein || 0}g proteïna</span>
                <span>🍞 {scannedProduct.nutrition.carbs || 0}g carbohidrats</span>
                <span>🥑 {scannedProduct.nutrition.fat || 0}g greixos</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setScannedProduct(null)}>
                Cancel·la
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSaving ? "Desant a la BD..." : "Desa a la Base de Dades"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
