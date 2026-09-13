"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Product, GroceryCategory } from "@/types";
import { SupabaseProductService } from "@/lib/supabase/products";
import { LocalStore } from "@/lib/storage/local-store";
import {
  scanBarcodeFromVideoFrame,
  decodeBarcodeFromImageSrc,
  playBeepSound,
  triggerHapticFeedback,
} from "@/lib/barcode/scanner";
import { formatAisleCategory } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Camera,
  ScanBarcode,
  Zap,
  ZapOff,
  SwitchCamera,
  X,
  Check,
  Trash2,
  Database,
  Sparkles,
  AlertCircle,
  Plus,
  Play,
  Square,
  Package,
  ScanLine,
  ArrowRight,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface ContinuousProductScannerProps {
  onProductSaved?: (product: Product) => void;
  onOpenCatalog?: () => void;
  totalCatalogProducts?: number;
}

export const ContinuousProductScanner: React.FC<ContinuousProductScannerProps> = ({
  onProductSaved,
  onOpenCatalog,
  totalCatalogProducts = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estat del cicle de càmera
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Estat de detecció i cerca
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>("");

  // Producte actiu detectat
  const [activeProduct, setActiveProduct] = useState<Partial<Product> | null>(null);
  const [isExistingInDb, setIsExistingInDb] = useState(false);

  // Mètrica de sessió
  const [sessionCount, setSessionCount] = useState(0);

  // Entrada manual opcional
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Atura el flux de la càmera
  const stopCameraStream = useCallback(() => {
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
    setIsCameraRunning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Inicia la càmera en directe
  const startCameraStream = useCallback(
    async (mode: "environment" | "user" = facingMode) => {
      stopCameraStream();
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("El teu navegador no permet l'accés directe a la càmera.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
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

        setIsCameraRunning(true);

        // Comprova si suporta torxa
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : null;
        if (capabilities && "torch" in capabilities) {
          setTorchAvailable(true);
        }

        // Bucle de detecció en temps real (<150ms)
        let isProcessingFrame = false;
        scanIntervalRef.current = setInterval(async () => {
          if (isProcessingFrame || !videoRef.current || !streamRef.current) return;
          isProcessingFrame = true;

          try {
            const detected = await scanBarcodeFromVideoFrame(videoRef.current);
            if (detected && detected.length >= 4) {
              // Codi detectat!
              playBeepSound();
              triggerHapticFeedback();
              // Pausa el bucle de detecció
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
              setLastScannedBarcode(detected);
              await handleLookupBarcode(detected);
            }
          } catch (e) {
            // Silenci per fotograma
          } finally {
            isProcessingFrame = false;
          }
        }, 150);
      } catch (err: any) {
        console.error("Error accedint a la càmera:", err);
        setCameraError(
          err.name === "NotAllowedError"
            ? "Permís de càmera denegat. Pots habilitar-lo als paràmetres del navegador o escriure el codi manualment."
            : err.message || "No s'ha pogut iniciar la càmera."
        );
        setIsCameraRunning(false);
      }
    },
    [facingMode, stopCameraStream]
  );

  // Neteja quan es desmunta el component
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Cerca informació del codi (Supabase primer, després Open Food Facts / AI)
  const handleLookupBarcode = async (barcode: string) => {
    setIsSearching(true);
    try {
      const prefs = LocalStore.getPreferences();
      const res = await fetch("/api/ai/scan-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode.trim(),
          customApiKey: prefs.geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.product) {
        const isDb = Boolean(
          data.existsInDb || data.product.id || data.source === "database"
        );
        setIsExistingInDb(isDb);
        setActiveProduct({
          id: data.product.id,
          name: data.product.name || "",
          brand: data.product.brand || "",
          barcode: barcode.trim(),
          category: data.product.category || "other",
          defaultUnit: data.product.defaultUnit || "u.",
          packageSize: data.product.packageSize,
          imageUrl: data.product.imageUrl,
          nutrition: data.product.nutrition,
          allergens: data.product.allergens || [],
          notes: data.product.notes || undefined,
        });

        if (isDb) {
          toast.info(`Producte existent: ${data.product.name}`);
        } else {
          toast.success(`Informació trobada: ${data.product.name}`);
        }
      } else {
        // Codi nou no present ni a la BD ni a Open Food Facts
        setIsExistingInDb(false);
        setActiveProduct({
          name: "",
          brand: "",
          barcode: barcode.trim(),
          category: "other",
          defaultUnit: "u.",
        });
        toast.info("Codi nou detectat. Introdueix el nom per guardar-lo.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error en la cerca del producte.");
      setIsExistingInDb(false);
      setActiveProduct({
        name: "",
        brand: "",
        barcode: barcode.trim(),
        category: "other",
        defaultUnit: "u.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Reanuda la captura contínua
  const resumeContinuousScanning = useCallback(() => {
    setActiveProduct(null);
    setIsExistingInDb(false);
    setLastScannedBarcode("");
    setManualCode("");
    // Torna a iniciar la càmera de seguida
    startCameraStream(facingMode);
  }, [facingMode, startCameraStream]);

  // Guardar producte i seguir amb la captura
  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeProduct || !activeProduct.name?.trim()) {
      toast.error("Si us plau, indica un nom per al producte.");
      return;
    }

    setIsSaving(true);
    try {
      let saved: Product | null = null;
      if (activeProduct.id) {
        saved = await SupabaseProductService.updateProduct(activeProduct as Product);
      } else {
        saved = await SupabaseProductService.addProduct(activeProduct);
      }

      if (saved) {
        const prodName = saved.name;
        setSessionCount((prev) => prev + 1);
        toast.success(`✅ Guardat: ${prodName}`);
        if (onProductSaved) {
          onProductSaved(saved);
        }
        // Continua de seguida amb la captura!
        resumeContinuousScanning();
      } else {
        toast.error("Error en desar a la base de dades.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperat en desar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Descartar i continuar amb la captura immediatament
  const handleDiscardProduct = () => {
    toast.info("Article descartat.");
    resumeContinuousScanning();
  };

  // Alterna llanterna
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
      console.warn("Error amb la llanterna:", e);
    }
  };

  // Canvia càmera frontal/posterior
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  // Processament de foto pujada
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    setIsSearching(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const detected = await decodeBarcodeFromImageSrc(base64);
        if (detected) {
          playBeepSound();
          triggerHapticFeedback();
          setLastScannedBarcode(detected);
          await handleLookupBarcode(detected);
        } else {
          toast.error("No s'ha trobat cap codi de barres nítid a la imatge.");
        }
      } catch (err) {
        toast.error("Error analitzant la imatge.");
      } finally {
        setIsSearching(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopCameraStream();
    setLastScannedBarcode(manualCode.trim());
    handleLookupBarcode(manualCode.trim());
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Capçalera Minimalista */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
              Captura de Productes
            </h1>
            <p className="text-[11px] text-zinc-500">
              Escaneig continu de codis de barres per al rebost i la compra
            </p>
          </div>
        </div>

        {/* Comptador de sessió & Botó Catàleg */}
        <div className="flex items-center gap-2">
          {sessionCount > 0 && (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1 shrink-0 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {sessionCount} desats
            </span>
          )}

          {onOpenCatalog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCatalog}
              className="text-xs shrink-0 rounded-xl"
              title="Veure el llistat complet de productes"
            >
              <Package className="w-3.5 h-3.5 mr-1 text-primary-600" />
              Catàleg ({totalCatalogProducts})
            </Button>
          )}
        </div>
      </div>

      {/* ERROR DE CÀMERA (SI HI HA) */}
      {cameraError && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{cameraError}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCameraStream("environment")}
                className="text-xs bg-white dark:bg-zinc-900"
              >
                Torna a provar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-white dark:bg-zinc-900"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Puja Foto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CAS 1: ESCANEJANT O ESPERANT PRODUCTE (SENSE PRODUCTE DETECTAT) */}
      {!activeProduct && (
        <div className="space-y-3">
          {/* Zona de vídeo de la càmera */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border-2 border-zinc-800 shadow-2xl flex flex-col items-center justify-center min-h-[340px] sm:min-h-[400px]">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-84 sm:h-96 object-cover ${
                isCameraRunning ? "opacity-100" : "opacity-20 pointer-events-none"
              }`}
            />

            {/* Marc de punteria làser en viu */}
            {isCameraRunning && !isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <div className="relative w-64 sm:w-72 h-36 sm:h-44 border-2 border-dashed border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                  {/* Làser animat */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#34d399] animate-bounce" />

                  {/* Cantoneres */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400" />
                </div>

                <div className="mt-3 px-3.5 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-white text-xs font-medium flex items-center gap-2 shadow-lg">
                  <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Apunta el codi de barres</span>
                </div>
              </div>
            )}

            {/* Spinner de cerca de dades */}
            {isSearching && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-3 z-20 animate-in fade-in">
                <div className="w-10 h-10 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin" />
                <div>
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Buscant dades del producte...
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Codi: {lastScannedBarcode}
                  </p>
                </div>
              </div>
            )}

            {/* Estat de càmera aturada (amb botó d'inici ràpid) */}
            {!isCameraRunning && !isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30 shadow-lg">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Captura ràpida amb la càmera
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Inicia la càmera per escanejar codis de barres un darrere l&apos;altre sense interrupcions.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => startCameraStream("environment")}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-2xl shadow-xl shadow-emerald-900/40 text-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Inicia la Càmera
                </Button>
              </div>
            )}

            {/* Controls superiors de càmera (quan està en marxa) */}
            {isCameraRunning && (
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
                  onClick={stopCameraStream}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
                  title="Aturar càmera"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Opcions ràpides d'alternativa (manual o foto) */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-zinc-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center gap-1"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              {showManualInput ? "Amagar codi manual" : "Escriure codi manualment"}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-zinc-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Pujar foto
            </button>
          </div>

          {/* Formulari d'entrada manual de codi */}
          {showManualInput && (
            <form
              onSubmit={handleManualSubmit}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 flex gap-2 animate-in fade-in"
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="Escriu els números del codi (ex: 8480000...)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!manualCode.trim() || isSearching}
              >
                Cerca
              </Button>
            </form>
          )}
        </div>
      )}

      {/* CAS 2: PRODUCTE JA EXISTENT A LA BASE DE DADES */}
      {activeProduct && isExistingInDb && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border-2 border-blue-500/40 dark:border-blue-500/30 p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
          {/* Missatge net indicant que ja existeix */}
          <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-300">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 block">
                Producte ja registrat
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Aquest producte ja forma part de la teva base de dades.
              </p>
            </div>
          </div>

          {/* Dades del producte existent de manera neta */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              {activeProduct.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {activeProduct.brand && (
                <span className="font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md">
                  {activeProduct.brand}
                </span>
              )}
              <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md">
                {formatAisleCategory(activeProduct.category || "other")}
              </span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                {activeProduct.barcode}
              </span>
            </div>

            {activeProduct.nutrition?.calories ? (
              <p className="text-[11px] text-zinc-500 pt-1">
                🔥 {activeProduct.nutrition.calories} kcal/100g
              </p>
            ) : null}
          </div>

          {/* Botó d'acció ràpida per continuar escanejant sense haver de reiniciar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={resumeContinuousScanning}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Continuar Escanejant</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* CAS 3: PRODUCTE NOU (DETALL RÀPID AMB GUARDAR O DESECHAR) */}
      {activeProduct && !isExistingInDb && (
        <form
          onSubmit={handleSaveProduct}
          className="bg-white dark:bg-zinc-900 rounded-3xl border-2 border-emerald-500/40 dark:border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in"
        >
          {/* Encapçalament del producte nou */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 block">
                  Nou Producte Detectat
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Codi: {activeProduct.barcode}
                </span>
              </div>
            </div>
          </div>

          {/* Formulari ràpid i clar per a mòbil */}
          <div className="space-y-3">
            {/* Nom */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Nom del Producte *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Llet semidesnatada, Arròs bomba..."
                value={activeProduct.name || ""}
                onChange={(e) =>
                  setActiveProduct({ ...activeProduct, name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Marca i Categoria */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  placeholder="Ex: Hacendado, Gallo..."
                  value={activeProduct.brand || ""}
                  onChange={(e) =>
                    setActiveProduct({ ...activeProduct, brand: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Categoria
                </label>
                <select
                  value={activeProduct.category || "other"}
                  onChange={(e) =>
                    setActiveProduct({
                      ...activeProduct,
                      category: e.target.value as GroceryCategory,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="produce">🥦 Fruita i Verdura</option>
                  <option value="dairy">🧀 Làctics i Ous</option>
                  <option value="meat">🥩 Carn i Peix</option>
                  <option value="bakery">🍞 Pa i Forn</option>
                  <option value="pantry">🍝 Rebost</option>
                  <option value="frozen">❄️ Congelats</option>
                  <option value="beverages">🧃 Begudes</option>
                  <option value="other">📦 Altres</option>
                </select>
              </div>
            </div>

            {/* Format i unitat */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Unitat per defecte
                </label>
                <input
                  type="text"
                  value={activeProduct.defaultUnit || "u."}
                  onChange={(e) =>
                    setActiveProduct({ ...activeProduct, defaultUnit: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Format (g / ml)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 1000"
                  value={activeProduct.packageSize || ""}
                  onChange={(e) =>
                    setActiveProduct({
                      ...activeProduct,
                      packageSize: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Nutrició resumida */}
            {activeProduct.nutrition?.calories ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-[11px] flex items-center justify-around text-zinc-600 dark:text-zinc-400">
                <span>🔥 {activeProduct.nutrition.calories} kcal</span>
                <span>🥩 {activeProduct.nutrition.protein || 0}g prot.</span>
                <span>🍞 {activeProduct.nutrition.carbs || 0}g carbs</span>
                <span>🥑 {activeProduct.nutrition.fat || 0}g greix</span>
              </div>
            ) : null}
          </div>

          {/* BOTONS GRANS DESDE EL MÒBIL: DESECHAR O GUARDAR */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDiscardProduct}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition font-bold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Desechar</span>
            </button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSaving || !activeProduct.name?.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Desant..." : "Guardar"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
