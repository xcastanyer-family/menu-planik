"use client";

import React, { useState, useRef } from "react";
import { Product, GroceryCategory } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SupabaseProductService } from "@/lib/supabase/products";
import { LocalStore } from "@/lib/storage/local-store";
import {
  decodeBarcodeFromImageSrc,
  playBeepSound,
  triggerHapticFeedback,
} from "@/lib/barcode/scanner";
import {
  Camera,
  Upload,
  ScanBarcode,
  Sparkles,
  Check,
  RefreshCw,
  Search,
  Database,
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
  const [isExistingInDb, setIsExistingInDb] = useState(false);
  const [needBarcodeHelper, setNeedBarcodeHelper] = useState(false);

  const resetState = () => {
    setSelectedImage(null);
    setManualBarcode("");
    setIsScanning(false);
    setIsSaving(false);
    setScannedProduct(null);
    setIsExistingInDb(false);
    setNeedBarcodeHelper(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Convert File to base64 i analitza
  const processImageFile = async (file: File) => {
    setIsScanning(true);
    setNeedBarcodeHelper(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);

      // Reconeixement robust de codi de barres al navegador
      let detectedBarcode: string | null = null;
      try {
        detectedBarcode = await decodeBarcodeFromImageSrc(base64);
        if (detectedBarcode) {
          playBeepSound();
          triggerHapticFeedback();
          setManualBarcode(detectedBarcode);
          toast.success(`Codi de barres detectat: ${detectedBarcode}`);
        }
      } catch (err) {
        console.warn("Error detectant codi localment:", err);
      }

      // Crida a la cerca de dades (comprova BD primer, després Open Food Facts)
      await queryProductData(base64, detectedBarcode || undefined);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const queryProductData = async (imageBase64?: string, barcodeVal?: string) => {
    setIsScanning(true);
    try {
      const prefs = LocalStore.getPreferences();
      const res = await fetch("/api/ai/scan-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || selectedImage || undefined,
          barcode: barcodeVal || manualBarcode || undefined,
          customApiKey: prefs.geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.product) {
        const isDb = Boolean(data.existsInDb || data.product.id || data.source === "database");
        setIsExistingInDb(isDb);
        setScannedProduct({
          id: data.product.id,
          familyId: data.product.familyId,
          name: data.product.name || "",
          brand: data.product.brand || "",
          barcode: data.product.barcode || barcodeVal || manualBarcode || "",
          category: data.product.category || "other",
          defaultUnit: data.product.defaultUnit || "u.",
          packageSize: data.product.packageSize,
          imageUrl: data.product.imageUrl || selectedImage || undefined,
          nutrition: data.product.nutrition,
          allergens: data.product.allergens || [],
          notes: data.product.notes || undefined,
          source: data.product.source || (isDb ? "database" : "barcode"),
        });
        setNeedBarcodeHelper(false);
        if (isDb) {
          toast.success("Aquest producte ja existeix a la teva base de dades!");
        } else {
          toast.success("Informació del producte recuperada!");
        }
      } else if (data.needBarcodeNumber) {
        setNeedBarcodeHelper(true);
        toast.info(data.error);
      } else {
        toast.error(data.error || "No s'ha pogut reconèixer el producte.");
        setNeedBarcodeHelper(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al connectar amb el servei de cerca.");
      setNeedBarcodeHelper(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    queryProductData(selectedImage || undefined, manualBarcode.trim());
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct || !scannedProduct.name?.trim()) {
      toast.error("El nom del producte és obligatori.");
      return;
    }

    setIsSaving(true);
    try {
      let saved: Product | null = null;
      if (scannedProduct.id) {
        // Actualitza el producte existent a la BD
        saved = await SupabaseProductService.updateProduct(scannedProduct as Product);
        if (saved) {
          toast.success(`Producte "${saved.name}" actualitzat a la base de dades!`);
        }
      } else {
        // Desa com a nou producte a la BD
        saved = await SupabaseProductService.addProduct(scannedProduct);
        if (saved) {
          toast.success(`Producte "${saved.name}" desat a la base de dades!`);
        }
      }

      if (saved) {
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Escaneja Codi de Barres amb el Mòbil"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Input ocult per capturar foto amb la càmera del mòbil o fitxer */}
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
            {/* Botons principals d'activació: Càmera del mòbil o Galeria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
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
                  Des de la galeria del telèfon o ordinador
                </span>
              </button>
            </div>

            {/* Imatge seleccionada (si n'hi ha) */}
            {selectedImage && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                <img
                  src={selectedImage}
                  alt="Codi de barres"
                  className="w-16 h-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                />
                <div className="text-xs flex-1">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Foto capturada</p>
                  <p className="text-zinc-500">
                    {manualBarcode
                      ? `Codi detectat: ${manualBarcode}`
                      : "Pots introduir els dígits del codi a sota per recuperar la fitxa."}
                  </p>
                </div>
              </div>
            )}

            {/* Cercador directe de codi de barres */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                O introdueix el número del codi de barres:
              </label>
              <form onSubmit={handleManualBarcodeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Escriu els dígits (ex: 8480000123456)"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isScanning || !manualBarcode.trim()}
                >
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Cercar Dades
                </Button>
              </form>
            </div>

            {/* Spinner mentre escaneja */}
            {isScanning && (
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center text-center space-y-3 animate-in fade-in">
                <div className="w-10 h-10 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    Llegint codi i cercant informació del producte...
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Comprovant base de dades local i catàleg d&apos;aliments.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Formulari de confirmació del producte escanejat */
          <form onSubmit={handleSaveProduct} className="space-y-4 animate-in fade-in">
            {isExistingInDb ? (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">Aquest producte ja existeix a la teva base de dades!</span>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                      Es mostren les dades que tens guardades. Pots modificar-les o fer-lo servir directament.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScannedProduct(null);
                    setIsExistingInDb(false);
                  }}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-medium text-xs flex items-center gap-1 shrink-0 ml-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Nou escaneig
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Producte identificat! Revisa les dades abans de desar.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setScannedProduct(null);
                    setIsExistingInDb(false);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tornar a escanejar
                </button>
              </div>
            )}

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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
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
                    Mida / Format (g / ml)
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

            {/* Resum Nutricional */}
            {scannedProduct.nutrition && (
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs flex items-center justify-around text-zinc-600 dark:text-zinc-400">
                <span>🔥 {scannedProduct.nutrition.calories || 0} kcal</span>
                <span>🥩 {scannedProduct.nutrition.protein || 0}g proteïna</span>
                <span>🍞 {scannedProduct.nutrition.carbs || 0}g carbohidrats</span>
                <span>🥑 {scannedProduct.nutrition.fat || 0}g greixos</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setScannedProduct(null);
                  setIsExistingInDb(false);
                }}
              >
                Cancel·la
              </Button>
              <div className="flex items-center gap-2">
                {isExistingInDb && onProductCreated && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (scannedProduct && onProductCreated) {
                        onProductCreated(scannedProduct as Product);
                        handleClose();
                      }
                    }}
                    className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium"
                  >
                    Selecciona aquest producte
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  className={
                    isExistingInDb
                      ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  }
                >
                  {isSaving
                    ? "Desant..."
                    : isExistingInDb
                    ? "Actualitza a la BD"
                    : "Desa a la Base de Dades"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
