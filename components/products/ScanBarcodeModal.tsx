"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Product, GroceryCategory } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SupabaseProductService } from "@/lib/supabase/products";
import { LocalStore } from "@/lib/storage/local-store";
import {
  decodeBarcodeFromImageSrc,
  scanBarcodeFromVideoFrame,
  playBeepSound,
  triggerHapticFeedback,
} from "@/lib/barcode/scanner";
import {
  Camera,
  Upload,
  ScanBarcode,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Zap,
  ZapOff,
  SwitchCamera,
  X,
  ScanLine,
  Database,
} from "lucide-react";
import { toast } from "sonner";

interface ScanBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: Product) => void;
}

type ScanMode = "idle" | "live" | "photo" | "manual";

export const ScanBarcodeModal: React.FC<ScanBarcodeModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [scanMode, setScanMode] = useState<ScanMode>("idle");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Partial<Product> | null>(null);
  const [isExistingInDb, setIsExistingInDb] = useState(false);
  const [needBarcodeHelper, setNeedBarcodeHelper] = useState(false);

  // Controls de càmera en directe
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Atura el flux de vídeo i el bucle de detecció
  const stopLiveCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const resetState = useCallback(() => {
    stopLiveCamera();
    setSelectedImage(null);
    setManualBarcode("");
    setIsScanning(false);
    setIsSaving(false);
    setScannedProduct(null);
    setIsExistingInDb(false);
    setNeedBarcodeHelper(false);
    setScanMode("idle");
    setCameraError(null);
  }, [stopLiveCamera]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Neteja quan es tanca el modal
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // Consulta les dades del producte (primer a la nostra BD, després a Open Food Facts)
  const queryProductData = useCallback(
    async (imageBase64?: string, barcodeVal?: string) => {
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
          const isDb = Boolean(
            data.existsInDb || data.product.id || data.source === "database"
          );
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
            toast.success("Producte existent trobat a la teva base de dades!");
          } else {
            toast.success("Informació del producte recuperada!");
          }
        } else if (data.needBarcodeNumber) {
          setNeedBarcodeHelper(true);
          setScanMode("manual");
          toast.info(data.error);
        } else {
          toast.error(data.error || "No s'ha trobat el producte a la base de dades.");
          setNeedBarcodeHelper(true);
          setScanMode("manual");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al connectar amb el servei de cerca.");
        setNeedBarcodeHelper(true);
      } finally {
        setIsScanning(false);
      }
    },
    [manualBarcode, selectedImage]
  );

  // Inicia la càmera en directe per escanejar en temps real (<150ms)
  const startLiveCamera = async (facing: "environment" | "user" = facingMode) => {
    stopLiveCamera();
    setCameraError(null);
    setScanMode("live");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("El teu navegador no permet l'accés directe a la càmera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Comprovar si té llanterna (torch)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : null;
      if (capabilities && "torch" in capabilities) {
        setTorchAvailable(true);
      }

      // Bucle d'escaneig fotograma a fotograma en temps real
      let isCheckingFrame = false;
      scanIntervalRef.current = setInterval(async () => {
        if (isCheckingFrame || !videoRef.current) return;
        isCheckingFrame = true;

        try {
          const detected = await scanBarcodeFromVideoFrame(videoRef.current);
          if (detected) {
            // Èxit! Barcode detectat en directe
            playBeepSound();
            triggerHapticFeedback();
            stopLiveCamera();
            setManualBarcode(detected);
            toast.success(`Codi detectat: ${detected}`);
            await queryProductData(undefined, detected);
          }
        } catch (e) {
          // Ignora errors puntuals per fotograma
        } finally {
          isCheckingFrame = false;
        }
      }, 150);
    } catch (err: any) {
      console.error("Error obrint la càmera:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "No s'ha donat permís per accedir a la càmera. Pots pujar una foto o escriure el codi manualment."
          : err.message || "No s'ha pogut iniciar la càmera."
      );
      setScanMode("idle");
    }
  };

  // Alterna la llanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Error alternant llanterna:", e);
    }
  };

  // Canvia càmera frontal / posterior
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  // Processament d'imatge estàtica (pujada de fitxer o foto capturada)
  const processImageFile = async (file: File) => {
    stopLiveCamera();
    setIsScanning(true);
    setScanMode("photo");
    setNeedBarcodeHelper(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);

      // Reconeixement robust amb escalat i rotacions (0°, 90°, 270°, 180°)
      let detectedBarcode: string | null = null;
      try {
        detectedBarcode = await decodeBarcodeFromImageSrc(base64);
        if (detectedBarcode) {
          playBeepSound();
          triggerHapticFeedback();
          setManualBarcode(detectedBarcode);
          toast.success(`Codi de barres trobat: ${detectedBarcode}`);
        }
      } catch (err) {
        console.warn("Error en descodificar imatge:", err);
      }

      // Cerca dades del producte a la BD o a Open Food Facts
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

  const handleManualBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    stopLiveCamera();
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
        // Actualització a la BD del producte existent
        saved = await SupabaseProductService.updateProduct(scannedProduct as Product);
        if (saved) {
          toast.success(`Producte "${saved.name}" actualitzat a la base de dades!`);
        }
      } else {
        // Creació de nou producte a la BD
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
      <div className="space-y-4">
        {/* Input ocult per fitxer / foto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* 1. VISOR DE CÀMERA EN DIRECTE (TEMPS REAL) */}
        {scanMode === "live" && (
          <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col items-center justify-center min-h-[300px] sm:min-h-[360px]">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-72 sm:h-84 object-cover"
            />

            {/* Marc de punteria (reticle) per al codi de barres */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
              <div className="relative w-64 sm:w-72 h-36 sm:h-44 border-2 border-dashed border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden">
                {/* Línia làser animada */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />

                {/* Cantoneres estil escàner */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>

              <div className="mt-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full border border-white/10 text-white text-xs flex items-center gap-1.5 shadow-md">
                <ScanLine className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Apunta i centra el codi de barres</span>
              </div>
            </div>

            {/* Barra superior de controls de càmera */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              {torchAvailable && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md transition ${
                    torchOn
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                      : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                  title="Llanterna"
                >
                  {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
                title="Canviar càmera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setScanMode("idle");
                }}
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
                title="Tancar càmera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. MENÚ PRINCIPAL D'OPCIONS QUAN NO HI HA PRODUCTE DETECTAT */}
        {!scannedProduct && scanMode !== "live" && (
          <div className="space-y-4">
            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Opcions d'acció */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botó 1: Càmera en Directe (instantani) */}
              <button
                type="button"
                onClick={() => startLiveCamera("environment")}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-primary-500/30 dark:border-primary-500/20 bg-gradient-to-br from-primary-50/80 to-emerald-50/50 dark:from-primary-950/40 dark:to-emerald-950/20 hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/10 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-600/30 group-hover:scale-110 transition-transform mb-2.5">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Obre Càmera en Directe
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Reconeixement instantani en temps real
                </span>
              </button>

              {/* Botó 2: Capturar foto o Galeria */}
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center group-hover:scale-110 transition-transform mb-2.5">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Captura o Puja Foto
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Des de la càmera o galeria del telèfon
                </span>
              </button>
            </div>

            {/* Imatge capturada (si n'hi ha) */}
            {selectedImage && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                <img
                  src={selectedImage}
                  alt="Codi de barres"
                  className="w-16 h-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0"
                />
                <div className="text-xs flex-1">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Foto carregada</p>
                  <p className="text-zinc-500">
                    {manualBarcode
                      ? `Codi detectat: ${manualBarcode}`
                      : "Si la foto està una mica borrosa, pots escriure els números directament a sota."}
                  </p>
                </div>
              </div>
            )}

            {/* Formulari per introduir codi manualment */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                O introdueix el número del codi de barres directament:
              </label>
              <form onSubmit={handleManualBarcodeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 8480000123456"
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
              <p className="text-[11px] text-zinc-400">
                💡 Cerca a la teva pròpia base de dades i a Open Food Facts gratuïtament.
              </p>
            </div>

            {/* Spinner mentre escaneja */}
            {isScanning && (
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center text-center space-y-3 animate-in fade-in">
                <div className="w-9 h-9 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    Cercant informació del producte...
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Consultant base de dades local i catàleg d&apos;aliments.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. FITXA DE CONFIRMACIÓ I EDICIÓ DEL PRODUCTE TROBAT */}
        {scannedProduct && (
          <form onSubmit={handleSaveProduct} className="space-y-4 animate-in fade-in">
            {isExistingInDb ? (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">Aquest producte ja existeix a la teva base de dades!</span>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                      Es mostren les dades que tens guardades. Pots actualitzar-les o fer servir el producte directament.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScannedProduct(null);
                    setIsExistingInDb(false);
                    setScanMode("idle");
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
                  Producte identificat! Revisa i completa abans de desar.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setScannedProduct(null);
                    setIsExistingInDb(false);
                    setScanMode("idle");
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
                    Format (g / ml)
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
                  setScanMode("idle");
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
                    ? "Actualitza dades a la BD"
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
