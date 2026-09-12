/**
 * Utilitats per a l'escaneig de codis de barres (EAN-13, EAN-8, UPC-A, Code-128, etc.)
 * Utilitza BarcodeDetector natiu (si està disponible) i @zxing/library amb rotacions i escalat.
 */

// So de confirmació en detectar un codi
export function playBeepSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // Nota B5 (clara i neta)
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    // Silenci si el navegador no permet àudio automàtic
  }
}

// Vibració hàptica al mòbil
export function triggerHapticFeedback() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([100, 40, 100]);
    } catch (e) {
      // Ignora si no és permès
    }
  }
}

/**
 * Intenta detectar el codi de barres mitjançant el BarcodeDetector natiu del navegador
 */
async function detectWithNativeDetector(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<string | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }
  try {
    const detector = new (window as any).BarcodeDetector({
      formats: [
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "code_39",
        "itf",
        "qr_code",
      ],
    });
    const results = await detector.detect(source);
    if (results && results.length > 0 && results[0].rawValue) {
      const code = results[0].rawValue.trim();
      if (code) return code;
    }
  } catch (err) {
    // El format pot no estar suportat o l'element no està llest
  }
  return null;
}

/**
 * Detecta codi de barres a partir d'un frame d'un element Video en temps real
 */
export async function scanBarcodeFromVideoFrame(
  video: HTMLVideoElement,
  zxingReader?: any
): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return null;
  }

  // 1. Intent amb BarcodeDetector natiu (molt ràpid en Android / Chrome)
  const nativeCode = await detectWithNativeDetector(video);
  if (nativeCode) return nativeCode;

  // 2. Intent amb ZXing sobre canvas central retallat (zona del visor)
  try {
    const {
      MultiFormatReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      DecodeHintType,
      BarcodeFormat,
    } = await import("@zxing/library");

    const reader = zxingReader || new MultiFormatReader();
    if (!zxingReader) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);
      reader.setHints(hints);
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Retallem la zona central (~75% d'amplada i alçada) on apunta l'usuari
    const cropW = Math.round(vw * 0.75);
    const cropH = Math.round(vh * 0.55);
    const startX = Math.round((vw - cropW) / 2);
    const startY = Math.round((vh - cropH) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(640, cropW);
    canvas.height = Math.round(cropH * (canvas.width / cropW));

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(
      video,
      startX,
      startY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const int32Buffer = new Int32Array(imgData.data.buffer);
    const lumSource = new RGBLuminanceSource(
      int32Buffer,
      canvas.width,
      canvas.height
    );
    const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
    const result = reader.decode(bitmap);

    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch (err) {
    // NotFoundException habitual mentre s'enfoca
  }

  return null;
}

/**
 * Analitza una imatge estàtica (pujada o foto) fent proves multi-resolució i multi-orientació (0°, 90°, 270°, 180°)
 */
export async function decodeBarcodeFromImageSrc(
  imageSrc: string
): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No s'ha pogut carregar la imatge"));
    img.src = imageSrc;
  });

  // 1. Intent inicial directe amb BarcodeDetector natiu sobre la imatge sencera
  const initialNative = await detectWithNativeDetector(img);
  if (initialNative) return initialNative;

  const {
    MultiFormatReader,
    RGBLuminanceSource,
    BinaryBitmap,
    HybridBinarizer,
    DecodeHintType,
    BarcodeFormat,
  } = await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);

  // Escales per provar: les càmeres de mòbil tenen 12-48MP on les barres són massa amples per ZXing.
  // Escalat a 1000px, 750px i 1400px garanteix una amplada de barra ideal (~2-5px)
  const targetSizes = [1000, 750, 1400];
  const angles = [0, 90, 270, 180];

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  for (const maxDim of targetSizes) {
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const targetW = Math.round(origW * scale);
    const targetH = Math.round(origH * scale);

    for (const angle of angles) {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) continue;

        if (angle === 90 || angle === 270) {
          canvas.width = targetH;
          canvas.height = targetW;
        } else {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();

        // Prova BarcodeDetector natiu sobre el canvas orientat
        const rotatedNative = await detectWithNativeDetector(canvas);
        if (rotatedNative) return rotatedNative;

        // Prova ZXing
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const int32Buffer = new Int32Array(imgData.data.buffer);
        const lumSource = new RGBLuminanceSource(
          int32Buffer,
          canvas.width,
          canvas.height
        );
        const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
        const result = reader.decode(bitmap);

        if (result && result.getText()) {
          return result.getText().trim();
        }
      } catch (e) {
        // Segueix provant la següent rotació / mida
      }
    }
  }

  // Si encara no s'ha trobat, provar un retall central (on sol estar el codi en fotos centrades)
  try {
    const cropCanvas = document.createElement("canvas");
    const cropSize = Math.min(origW, origH) * 0.7;
    cropCanvas.width = 600;
    cropCanvas.height = 600;
    const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
    if (cropCtx) {
      cropCtx.drawImage(
        img,
        (origW - cropSize) / 2,
        (origH - cropSize) / 2,
        cropSize,
        cropSize,
        0,
        0,
        600,
        600
      );
      const cropNative = await detectWithNativeDetector(cropCanvas);
      if (cropNative) return cropNative;

      const cropData = cropCtx.getImageData(0, 0, 600, 600);
      const int32Buffer = new Int32Array(cropData.data.buffer);
      const lum = new RGBLuminanceSource(int32Buffer, 600, 600);
      const bitmap = new BinaryBitmap(new HybridBinarizer(lum));
      const res = reader.decode(bitmap);
      if (res && res.getText()) {
        return res.getText().trim();
      }
    }
  } catch (e) {
    // Ignora
  }

  return null;
}

