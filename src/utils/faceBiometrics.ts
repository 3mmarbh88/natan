/**
 * NATAN Cyber Face Biometrics Engine
 * Handles camera stream acquisition, facial feature extraction,
 * perceptual difference hashing (dHash), luminance/contrast validation,
 * and biometric face template enrollment & comparison.
 */

export interface EnrolledFaceData {
  id: string;
  username?: string;
  userId?: string;
  enrolledAt: number;
  photoThumbnail: string; // Data URL thumbnail
  dHash: string;          // 64-character binary string
  histogram: number[];    // 16-bin normalized color/luminance histogram
  brightness: number;
  contrast: number;
}

export interface FaceAnalysisResult {
  valid: boolean;
  error?: string;
  warning?: string;
  brightness: number;
  contrast: number;
  dHash: string;
  histogram: number[];
  photoThumbnail: string;
}

export interface FaceComparisonResult {
  match: boolean;
  confidence: number;
  isFirstEnrollment?: boolean;
  error?: string;
}

const FACE_ENROLLED_STORAGE_PREFIX = 'natan_face_template_';
const LAST_ENROLLED_FACE_KEY = 'natan_last_enrolled_face';

/**
 * Gets enrolled face data for a specific user or fallback default
 */
export function getEnrolledFace(usernameOrId?: string): EnrolledFaceData | null {
  if (typeof window === 'undefined') return null;

  try {
    if (usernameOrId) {
      const cleanKey = usernameOrId.trim().toLowerCase();
      const raw = localStorage.getItem(`${FACE_ENROLLED_STORAGE_PREFIX}${cleanKey}`);
      if (raw) return JSON.parse(raw) as EnrolledFaceData;
    }

    // Try last enrolled general face
    const lastRaw = localStorage.getItem(LAST_ENROLLED_FACE_KEY);
    if (lastRaw) return JSON.parse(lastRaw) as EnrolledFaceData;
  } catch (err) {
    console.warn('[FaceBiometrics] Failed to read enrolled face:', err);
  }

  return null;
}

/**
 * Saves enrolled face template to local vault
 */
export function saveEnrolledFace(data: EnrolledFaceData): void {
  if (typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(LAST_ENROLLED_FACE_KEY, serialized);

    if (data.username) {
      localStorage.setItem(
        `${FACE_ENROLLED_STORAGE_PREFIX}${data.username.trim().toLowerCase()}`,
        serialized
      );
    }
    if (data.userId) {
      localStorage.setItem(
        `${FACE_ENROLLED_STORAGE_PREFIX}${data.userId.trim().toLowerCase()}`,
        serialized
      );
    }
  } catch (err) {
    console.warn('[FaceBiometrics] Failed to save enrolled face:', err);
  }
}

/**
 * Deletes enrolled face template
 */
export function deleteEnrolledFace(usernameOrId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(LAST_ENROLLED_FACE_KEY);
    if (usernameOrId) {
      localStorage.removeItem(
        `${FACE_ENROLLED_STORAGE_PREFIX}${usernameOrId.trim().toLowerCase()}`
      );
    }
  } catch (err) {
    console.warn('[FaceBiometrics] Failed to remove face:', err);
  }
}

/**
 * Captures and analyzes face features from a live video element
 */
export function analyzeFaceFrame(
  source: HTMLVideoElement | HTMLCanvasElement
): FaceAnalysisResult {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      valid: false,
      error: 'تعذر تهيئة معالج الرسوميات للتعرف على الوجه',
      brightness: 0,
      contrast: 0,
      dHash: '',
      histogram: [],
      photoThumbnail: '',
    };
  }

  const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  if (!srcWidth || !srcHeight) {
    return {
      valid: false,
      error: 'لا توجد إشارة فيديو صالحة من الكاميرا',
      brightness: 0,
      contrast: 0,
      dHash: '',
      histogram: [],
      photoThumbnail: '',
    };
  }

  // Crop square face center region
  const minDim = Math.min(srcWidth, srcHeight);
  const cropSize = Math.floor(minDim * 0.65);
  const startX = Math.floor((srcWidth - cropSize) / 2);
  const startY = Math.floor((srcHeight - cropSize) / 2);

  // 1. High-res thumbnail (128x128)
  canvas.width = 128;
  canvas.height = 128;
  ctx.drawImage(source, startX, startY, cropSize, cropSize, 0, 0, 128, 128);
  const photoThumbnail = canvas.toDataURL('image/jpeg', 0.85);

  // 2. Sample 9x8 grid for 64-bit dHash (Difference Hash)
  canvas.width = 9;
  canvas.height = 8;
  ctx.drawImage(source, startX, startY, cropSize, cropSize, 0, 0, 9, 8);
  const imgData = ctx.getImageData(0, 0, 9, 8);
  const pixels = imgData.data;

  // Convert to grayscale and compute brightness
  const grays: number[][] = [];
  let totalBrightness = 0;
  const hist = new Array(16).fill(0);

  for (let y = 0; y < 8; y++) {
    grays[y] = [];
    for (let x = 0; x < 9; x++) {
      const idx = (y * 9 + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grays[y][x] = gray;
      totalBrightness += gray;

      // Populate 16-bin histogram
      const bin = Math.min(15, Math.floor(gray / 16));
      hist[bin]++;
    }
  }

  const avgBrightness = Math.round(totalBrightness / (9 * 8));

  // Compute contrast / variance
  let varianceSum = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      varianceSum += Math.pow(grays[y][x] - avgBrightness, 2);
    }
  }
  const contrast = Math.round(Math.sqrt(varianceSum / (9 * 8)));

  // Generate 64-bit difference hash
  let dHash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // Compare left pixel with right neighbor
      dHash += grays[y][x] > grays[y][x + 1] ? '1' : '0';
    }
  }

  // Normalize histogram
  const totalPixels = 9 * 8;
  const normalizedHist = hist.map((v) => Number((v / totalPixels).toFixed(4)));

  // Quality checks
  if (avgBrightness < 30) {
    return {
      valid: false,
      warning: 'الإضاءة خافتة جداً، يرجى توجيه وجهك لمكان أكثر إنارة',
      brightness: avgBrightness,
      contrast,
      dHash,
      histogram: normalizedHist,
      photoThumbnail,
    };
  }

  if (avgBrightness > 235) {
    return {
      valid: false,
      warning: 'الإضاءة ساطعة جداً أو موجهة مباشرة للعدسة',
      brightness: avgBrightness,
      contrast,
      dHash,
      histogram: normalizedHist,
      photoThumbnail,
    };
  }

  if (contrast < 12) {
    return {
      valid: false,
      warning: 'يرجى وضع وجهك مباشرة أمام الكاميرا داخل الإطار',
      brightness: avgBrightness,
      contrast,
      dHash,
      histogram: normalizedHist,
      photoThumbnail,
    };
  }

  return {
    valid: true,
    brightness: avgBrightness,
    contrast,
    dHash,
    histogram: normalizedHist,
    photoThumbnail,
  };
}

/**
 * Computes Hamming distance between two 64-bit strings
 */
function computeHammingDistance(hashA: string, hashB: string): number {
  let diff = 0;
  const len = Math.min(hashA.length, hashB.length);
  for (let i = 0; i < len; i++) {
    if (hashA[i] !== hashB[i]) diff++;
  }
  return diff + Math.abs(hashA.length - hashB.length);
}

/**
 * Computes cosine similarity between two histograms
 */
function computeHistogramSimilarity(histA: number[], histB: number[]): number {
  if (!histA.length || !histB.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < Math.min(histA.length, histB.length); i++) {
    dot += histA[i] * histB[i];
    magA += histA[i] * histA[i];
    magB += histB[i] * histB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (!denom) return 0;
  return Math.min(1, Math.max(0, dot / denom));
}

/**
 * Compares freshly captured face features against an enrolled face template
 */
export function compareFaceFeatures(
  current: { dHash: string; histogram: number[]; brightness: number },
  enrolled: EnrolledFaceData | null
): FaceComparisonResult {
  // If no enrolled template exists on device, allow immediate enrollment verification
  if (!enrolled || !enrolled.dHash) {
    return {
      match: true,
      confidence: 100,
      isFirstEnrollment: true,
    };
  }

  // 1. Hash similarity (Hamming Distance over 64 bits)
  const hamming = computeHammingDistance(current.dHash, enrolled.dHash);
  // Max diff is 64; 0 diff is 100% similarity
  const hashSimilarity = Math.max(0, (64 - hamming) / 64);

  // 2. Color/Luminance Histogram similarity
  const histSimilarity = computeHistogramSimilarity(current.histogram, enrolled.histogram);

  // 3. Combined confidence score
  // Hash accounts for 65% (structure/features), histogram accounts for 35% (skin/light)
  const rawScore = hashSimilarity * 0.65 + histSimilarity * 0.35;
  const confidence = Math.round(rawScore * 100);

  // Matching threshold is 65%
  const isMatch = confidence >= 65;

  if (isMatch) {
    return {
      match: true,
      confidence,
    };
  }

  return {
    match: false,
    confidence,
    error: `بصمة الوجه غير مطابقة للملف المسجل (نسبة التطابق: ${confidence}%، المطلوب 65% على الأقل)`,
  };
}
