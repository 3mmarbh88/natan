import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanFace,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FlipHorizontal,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Sun,
  Lock,
} from 'lucide-react';
import {
  analyzeFaceFrame,
  compareFaceFeatures,
  getEnrolledFace,
  saveEnrolledFace,
  EnrolledFaceData,
  FaceAnalysisResult,
} from '../utils/faceBiometrics';
import {
  getSavedBiometricSession,
  saveBiometricSession,
} from '../utils/biometricAuth';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { useLanguage } from '../utils/i18n';
import type { AppAuthSession } from '../types';

interface CameraFaceScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AppAuthSession) => void;
  currentSession?: AppAuthSession | null;
  targetUsername?: string;
  onSwitchToFingerprint?: () => void;
}

export const CameraFaceScanner: React.FC<CameraFaceScannerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentSession,
  targetUsername,
  onSwitchToFingerprint,
}) => {
  const { isAr } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [enrolledFace, setEnrolledFace] = useState<EnrolledFaceData | null>(null);

  const [status, setStatus] = useState<
    'starting' | 'aligning' | 'analyzing' | 'success' | 'mismatch' | 'error'
  >('starting');
  const [statusText, setStatusText] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [lightingStatus, setLightingStatus] = useState<'good' | 'low' | 'bright'>('good');
  const [capturedThumb, setCapturedThumb] = useState<string>('');

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
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
    setCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError('');
    setStatus('starting');
    setStatusText(isAr ? 'جارٍ تشغيل الكاميرا الأمامية...' : 'Starting camera...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          isAr
            ? 'متصفحك لا يدعم الوصول المباشر لكاميرا الويب.'
            : 'Camera API is not supported in this browser.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraActive(true);
          setStatus('aligning');
          setStatusText(
            isAr
              ? 'وجّه وجهك داخل الإطار الدائري لبدء المقارنة'
              : 'Position your face inside the circle'
          );
        };
      }
    } catch (err: any) {
      console.error('[CameraFaceScanner] Error starting camera:', err);
      let errMsg = isAr
        ? 'تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن.'
        : 'Could not access camera. Please allow permission.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = isAr
          ? 'تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح أو التطبيق.'
          : 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = isAr
          ? 'لم يتم العثور على كاميرا في هذا الجهاز.'
          : 'No camera found on this device.';
      }

      setCameraError(errMsg);
      setStatus('error');
      setStatusText(errMsg);
      haptics.vibrateAlert();
    }
  }, [facingMode, isAr, stopCamera]);

  // Load enrolled face on mount/open
  useEffect(() => {
    if (isOpen) {
      const enrolled = getEnrolledFace(targetUsername || currentSession?.username || currentSession?.userId);
      setEnrolledFace(enrolled);
      setConfidenceScore(null);
      setCapturedThumb('');
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, targetUsername, currentSession, facingMode, startCamera, stopCamera]);

  // Toggle front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
    haptics.vibrateTick();
  };

  // Execute Face Comparison
  const handleVerifyFace = () => {
    if (!videoRef.current || !cameraActive || status === 'analyzing' || status === 'success') {
      return;
    }

    haptics.vibrateTick();
    setStatus('analyzing');
    setStatusText(isAr ? 'جارٍ فحص ومطابقة ملامح الوجه...' : 'Scanning and matching facial features...');
    setScanProgress(0);

    // Smooth scan progress animation
    let curProgress = 0;
    const progressInterval = setInterval(() => {
      curProgress += 16;
      if (curProgress >= 90) {
        clearInterval(progressInterval);
      }
      setScanProgress(Math.min(curProgress, 90));
    }, 70);

    setTimeout(() => {
      clearInterval(progressInterval);
      if (!videoRef.current) return;

      const analysis: FaceAnalysisResult = analyzeFaceFrame(videoRef.current);

      if (analysis.brightness < 30) {
        setLightingStatus('low');
      } else if (analysis.brightness > 235) {
        setLightingStatus('bright');
      } else {
        setLightingStatus('good');
      }

      if (!analysis.valid && analysis.warning) {
        setStatus('error');
        setStatusText(analysis.warning);
        haptics.vibrateAlert();
        soundFX.playAlert();
        return;
      }

      setCapturedThumb(analysis.photoThumbnail);

      // Compare with enrolled template
      const compResult = compareFaceFeatures(analysis, enrolledFace);
      setConfidenceScore(compResult.confidence);
      setScanProgress(100);

      if (compResult.match) {
        setStatus('success');
        haptics.vibrateCapture();
        soundFX.playSuccess();

        const matchMsg = compResult.isFirstEnrollment
          ? (isAr ? 'تم توثيق وحفظ بصمة الوجه لأول مرة بنجاح!' : 'Face enrolled & verified successfully!')
          : (isAr ? `تمت مطابقة بصمة الوجه بنجاح! (نسبة التطابق: ${compResult.confidence}%)` : `Face match verified! (${compResult.confidence}% confidence)`);

        setStatusText(matchMsg);

        // Retrieve or generate authenticated session
        const session = currentSession || getSavedBiometricSession() || {
          token: 'face-auth-token-' + Date.now(),
          userId: enrolledFace?.userId || 'user-face',
          username: enrolledFace?.username || targetUsername || 'عضو NATAN',
          fullName: 'مستخدم بصمة الوجه',
          email: 'face@natan.smart',
          phone: '966500000000',
          isAuthenticated: true,
          isActivated: true,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          planName: 'NATAN VIP Pro',
          licenseKey: 'NATAN-FACE-KEY',
          maxDevices: 2,
        };

        // If first enrollment or updating, save the template
        if (compResult.isFirstEnrollment || !enrolledFace) {
          const newTemplate: EnrolledFaceData = {
            id: 'face_' + Date.now(),
            username: session.username,
            userId: session.userId,
            enrolledAt: Date.now(),
            photoThumbnail: analysis.photoThumbnail,
            dHash: analysis.dHash,
            histogram: analysis.histogram,
            brightness: analysis.brightness,
            contrast: analysis.contrast,
          };
          saveEnrolledFace(newTemplate);
          setEnrolledFace(newTemplate);
        }

        saveBiometricSession(session, 'face');

        setTimeout(() => {
          stopCamera();
          onSuccess(session);
          onClose();
        }, 1100);
      } else {
        setStatus('mismatch');
        haptics.vibrateAlert();
        soundFX.playAlert();
        setStatusText(
          compResult.error ||
            (isAr
              ? `بصمة الوجه غير مطابقة للمستخدم المسجل (${compResult.confidence}%)`
              : `Face does not match registered profile (${compResult.confidence}%)`)
        );
      }
    }, 600);
  };

  // Auto-scan after camera stabilizes
  useEffect(() => {
    if (cameraActive && status === 'aligning') {
      const timer = setTimeout(() => {
        handleVerifyFace();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [cameraActive, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-5 overflow-hidden text-center">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        {/* Top bar controls */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-bold text-cyan-300">
            <ScanFace className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{isAr ? 'المقارنة الحيوية ببصمة الوجه' : 'Face Biometric Matcher'}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleCamera}
            disabled={!cameraActive}
            className="p-2 text-slate-400 hover:text-cyan-300 rounded-full bg-slate-800/80 transition cursor-pointer disabled:opacity-40"
            title={isAr ? 'تبديل الكاميرا' : 'Switch Camera'}
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-white mb-0.5">
          {isAr ? 'تسجيل الدخول ببصمة الوجه' : 'Face Recognition Sign In'}
        </h3>
        <p className="text-[11px] text-slate-400 mb-3">
          {enrolledFace
            ? (isAr ? 'يتم مطابقة صورتك الحالية مع بصمة الوجه المحفوظة للجهاز' : 'Matching your face against the registered device template')
            : (isAr ? 'سيتم مسح ملامح وجهك وتوثيق الحساب للمرات القادمة' : 'Your face will be scanned & enrolled for instant login')}
        </p>

        {/* Camera Viewport Frame with Cyber Reticle */}
        <div className="relative mx-auto w-56 h-56 sm:w-60 sm:h-60 rounded-3xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Loading or Error placeholder when camera isn't active */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 text-center">
              {cameraError ? (
                <>
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-2 animate-bounce" />
                  <p className="text-xs text-rose-400 font-bold px-2">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إعادة تشغيل الكاميرا' : 'Retry Camera'}</span>
                  </button>
                </>
              ) : (
                <>
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-400">{statusText}</p>
                </>
              )}
            </div>
          )}

          {/* Cyberpunk HUD Overlay on top of video */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Corner targeting brackets */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

              {/* Central Face Oval Guide */}
              <div
                className={`w-36 h-44 sm:w-40 sm:h-48 rounded-[50%] border-2 transition-all duration-300 ${
                  status === 'success'
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]'
                    : status === 'mismatch' || status === 'error'
                    ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : status === 'analyzing'
                    ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] border-dashed'
                    : 'border-cyan-500/50'
                }`}
              >
                {/* Horizontal laser scan beam */}
                {status === 'analyzing' && (
                  <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,1)] transition-all duration-150"
                    style={{ marginTop: `${scanProgress}%` }}
                  />
                )}
              </div>

              {/* Status Icons in center */}
              {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/40 backdrop-blur-[2px]">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                </div>
              )}
              {status === 'mismatch' && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-950/40 backdrop-blur-[2px]">
                  <AlertCircle className="w-16 h-16 text-rose-400 animate-pulse" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status & Feedback message */}
        <div className="mt-3.5 mb-2 min-h-[44px] flex flex-col items-center justify-center">
          <p
            className={`text-xs font-bold leading-relaxed px-2 transition-colors ${
              status === 'success'
                ? 'text-emerald-400'
                : status === 'mismatch' || status === 'error'
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {statusText}
          </p>

          {/* Confidence and lighting metrics */}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            {confidenceScore !== null && (
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold ${
                  confidenceScore >= 65
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isAr ? `تطابق الملامح: ${confidenceScore}%` : `Match: ${confidenceScore}%`}
              </span>
            )}
            {enrolledFace && (
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>{isAr ? 'البصمة مسجلة مسبقاً' : 'Template enrolled'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-3">
          <button
            type="button"
            onClick={handleVerifyFace}
            disabled={!cameraActive || status === 'analyzing' || status === 'success'}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/30 transition active:scale-95 disabled:opacity-50 min-h-[46px] cursor-pointer"
          >
            {status === 'analyzing' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جارٍ مقارنة البصمة...' : 'Matching Face...'}</span>
              </>
            ) : status === 'mismatch' ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{isAr ? 'إعادة المحاولة والمقارنة' : 'Retry Face Match'}</span>
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                <span>{isAr ? 'فحص ومطابقة الوجه الآن' : 'Verify & Compare Face'}</span>
              </>
            )}
          </button>

          {/* Switch to fingerprint fallback button */}
          {onSwitchToFingerprint && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onSwitchToFingerprint();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition min-h-[38px] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'التبديل إلى بصمة الإصبع' : 'Switch to Fingerprint'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
