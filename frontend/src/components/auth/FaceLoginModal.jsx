import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, ScanFace, ShieldCheck, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const API_BASE   = 'http://127.0.0.1:5000';

// ─── Chargement face-api depuis le CDN ───────────────────────────────────────
let faceApiLoaded = false;
let faceApiLoading = false;
let faceApiCallbacks = [];

function loadFaceApi() {
  return new Promise((resolve, reject) => {
    if (faceApiLoaded && window.faceapi) { resolve(); return; }
    if (faceApiLoading) { faceApiCallbacks.push({ resolve, reject }); return; }

    faceApiLoading = true;
    faceApiCallbacks.push({ resolve, reject });

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
    script.onload = async () => {
      try {
        await Promise.all([
          window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        faceApiLoaded = true;
        faceApiLoading = false;
        faceApiCallbacks.forEach(cb => cb.resolve());
        faceApiCallbacks = [];
      } catch (err) {
        faceApiLoading = false;
        faceApiCallbacks.forEach(cb => cb.reject(err));
        faceApiCallbacks = [];
      }
    };
    script.onerror = (err) => {
      faceApiLoading = false;
      faceApiCallbacks.forEach(cb => cb.reject(err));
      faceApiCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

// ─── Composant principal ──────────────────────────────────────────────────────
const FaceLoginModal = ({ mode = 'login', role = '', onSuccess, onClose, enrollData }) => {
  // mode = 'login' | 'enroll'
  // enrollData = { username, password } pour le mode enrôlement
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const detectRef  = useRef(null);

  const [step, setStep]       = useState('loading');
  // 'loading' | 'camera' | 'detecting' | 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Chargement des modèles IA...');
  const [subMsg, setSubMsg]   = useState('');
  const [faceBox, setFaceBox] = useState(null);

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (detectRef.current) clearInterval(detectRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ─── Détection continue ───────────────────────────────────────────────────
  const startDetectionLoop = useCallback(() => {
    if (detectRef.current) clearInterval(detectRef.current);
    setStep('detecting');
    setMessage('Centrez votre visage dans le cadre');
    setSubMsg('Restez immobile quelques instants...');

    detectRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !window.faceapi) return;

      try {
        const detection = await window.faceapi
          .detectSingleFace(video, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setFaceBox(null);
          return;
        }

        // Afficher le cadre de détection
        const dims = window.faceapi.matchDimensions(canvas, video, true);
        const resized = window.faceapi.resizeResults(detection, dims);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const box = resized.detection.box;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.width, box.height);
        ctx.stroke();

        // Points du visage
        const points = resized.landmarks.positions;
        ctx.fillStyle = '#22c55e';
        points.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        setFaceBox(box);
        setSubMsg('Visage détecté ✓ — Maintien en position...');

        // Capturer automatiquement après détection stable
        clearInterval(detectRef.current);
        setTimeout(() => sendDescriptor(Array.from(detection.descriptor)), 600);

      } catch {
        // Silently ignore detection errors
      }
    }, 200);
  }, []); // eslint-disable-line

  // ─── Envoi du descriptor au backend ──────────────────────────────────────
  const sendDescriptor = useCallback(async (descriptor) => {
    setStep('processing');
    setFaceBox(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    try {
      let response, data;

      if (mode === 'enroll') {
        setMessage('Enregistrement du visage...');
        response = await fetch(`${API_BASE}/api/face/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username:   enrollData?.username,
            password:   enrollData?.password,
            descriptor: descriptor,
          }),
        });
        data = await response.json();
        if (data.success) {
          setStep('success');
          setMessage('Visage enregistré avec succès !');
          setSubMsg('Vous pouvez maintenant vous connecter par reconnaissance faciale.');
          stopCamera();
          setTimeout(() => onSuccess?.(data), 2000);
        } else {
          throw new Error(data.message || 'Échec de l\'enrôlement');
        }
      } else {
        setMessage('Identification en cours...');
        response = await fetch(`${API_BASE}/api/login/face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor, role }),
        });
        data = await response.json();
        if (data.success) {
          setStep('success');
          setMessage(`Bienvenue, ${data.user.username} !`);
          setSubMsg(`Connecté en tant que ${data.user.role}`);
          stopCamera();
          setTimeout(() => onSuccess?.({ ...data.user, role: data.user.role }), 1500);
        } else {
          throw new Error(data.message || 'Visage non reconnu');
        }
      }
    } catch (err) {
      setStep('error');
      setMessage(err.message || 'Erreur de reconnaissance');
      setSubMsg('Assurez-vous que votre visage est bien enregistré.');
    }
  }, [mode, role, enrollData, stopCamera, onSuccess]);

  // ─── Démarrer la caméra ──────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startDetectionLoop();
        };
      }
    } catch {
      setStep('error');
      setMessage('Accès caméra refusé');
      setSubMsg('Veuillez autoriser l\'accès à la caméra dans votre navigateur.');
    }
  }, [startDetectionLoop]);

  // ─── Réessayer après erreur ───────────────────────────────────────────────
  const retry = useCallback(() => {
    setFaceBox(null);
    setStep('camera');
    setMessage('Caméra prête');
    startDetectionLoop();
  }, [startDetectionLoop]);

  // ─── Initialisation ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setStep('loading');
        setMessage('Chargement des modèles IA...');
        await loadFaceApi();
        if (!mounted) return;
        setStep('camera');
        setMessage('Démarrage de la caméra...');
        await startCamera();
      } catch (err) {
        if (!mounted) return;
        setStep('error');
        setMessage('Impossible de charger les modèles de reconnaissance');
        setSubMsg('Vérifiez votre connexion internet et rechargez la page.');
      }
    })();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, []); // eslint-disable-line

  // ─── Fermeture propre ─────────────────────────────────────────────────────
  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  // ─── Rendu des états ──────────────────────────────────────────────────────
  const StatusIcon = () => {
    if (step === 'loading' || step === 'processing')
      return <Loader size={32} className="animate-spin" style={{ color: '#1e5aff' }} />;
    if (step === 'success')
      return <CheckCircle size={32} style={{ color: '#22c55e' }} />;
    if (step === 'error')
      return <AlertTriangle size={32} style={{ color: '#ef4444' }} />;
    return <ScanFace size={32} style={{ color: '#1e5aff' }} />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full rounded-[24px] overflow-hidden"
        style={{
          maxWidth: '520px',
          background: 'rgba(8,12,28,0.98)',
          border: '1px solid rgba(30,90,255,0.2)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 60px rgba(30,90,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: 'rgba(30,90,255,0.06)',
            borderBottom: '1px solid rgba(30,90,255,0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(30,90,255,0.15)', border: '1px solid rgba(30,90,255,0.3)' }}
            >
              <Camera size={18} style={{ color: '#4d7fff' }} />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: '#e8eef8' }}>
                {mode === 'enroll' ? 'Enregistrement Facial' : 'Connexion par Visage'}
              </h3>
              <p className="text-[10px]" style={{ color: '#4d6080' }}>
                {mode === 'enroll' ? 'face-api.js · Technologie IA' : `Tous rôles supportés · face-api.js`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ color: '#4d6080' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Vidéo + Canvas */}
        <div className="relative mx-6 mt-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', background: '#000' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)', display: step === 'loading' || step === 'error' ? 'none' : 'block' }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scaleX(-1)', pointerEvents: 'none' }}
          />

          {/* Overlay de scan animé */}
          {(step === 'detecting' || step === 'camera') && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Coins du cadre */}
              {[['0','0','0'], ['0','auto','180deg'], ['auto','0','90deg'], ['auto','auto','-90deg']].map(
                ([top, bottom, rotate], i) => (
                  <div
                    key={i}
                    className="absolute w-8 h-8"
                    style={{
                      top: top !== 'auto' ? '12px' : 'auto',
                      bottom: bottom !== 'auto' ? '12px' : 'auto',
                      left: i % 2 === 0 ? '12px' : 'auto',
                      right: i % 2 !== 0 ? '12px' : 'auto',
                      borderTop: i < 2 ? '3px solid rgba(30,90,255,0.7)' : 'none',
                      borderBottom: i >= 2 ? '3px solid rgba(30,90,255,0.7)' : 'none',
                      borderLeft: i % 2 === 0 ? '3px solid rgba(30,90,255,0.7)' : 'none',
                      borderRight: i % 2 !== 0 ? '3px solid rgba(30,90,255,0.7)' : 'none',
                      borderRadius: '4px',
                    }}
                  />
                )
              )}

              {/* Ligne de scan */}
              <div
                className="absolute left-3 right-3"
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(30,90,255,0.8), transparent)',
                  animation: 'scanLine 2s ease-in-out infinite',
                  top: '20%',
                }}
              />
            </div>
          )}

          {/* États placeholder */}
          {(step === 'loading' || step === 'error' || step === 'success' || step === 'processing') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(5,8,20,0.92)' }}>
              <StatusIcon />
              <div className="text-center px-6">
                <p className="text-sm font-semibold" style={{ color: '#e8eef8' }}>{message}</p>
                {subMsg && <p className="text-xs mt-1" style={{ color: '#4d6080' }}>{subMsg}</p>}
              </div>
              {step === 'error' && mode === 'login' && (
                <button
                  onClick={retry}
                  className="px-6 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(30,90,255,0.2)', color: '#4d7fff', border: '1px solid rgba(30,90,255,0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,90,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(30,90,255,0.2)'}
                >
                  Réessayer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer statut */}
        <div className="px-6 py-4 flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: step === 'success' ? '#22c55e'
                : step === 'error' ? '#ef4444'
                : step === 'detecting' ? '#22c55e'
                : '#1e5aff',
              boxShadow: step === 'detecting'
                ? '0 0 8px #22c55e'
                : step === 'success'
                ? '0 0 8px #22c55e'
                : step === 'error'
                ? '0 0 8px #ef4444'
                : '0 0 8px rgba(30,90,255,0.8)',
              animation: step === 'loading' || step === 'detecting' ? 'pulse 1.5s infinite' : 'none',
            }}
          />
          <p className="text-[11px] flex-1" style={{ color: '#4d6080' }}>
            {step === 'loading'    && 'Chargement des modèles de reconnaissance...'}
            {step === 'camera'     && 'Caméra active — Positionnez votre visage'}
            {step === 'detecting'  && 'Visage détecté — Analyse en cours...'}
            {step === 'processing' && (mode === 'enroll' ? 'Enregistrement en base de données...' : 'Vérification de l\'identité...')}
            {step === 'success'    && (mode === 'enroll' ? 'Visage enregistré avec succès !' : 'Identité vérifiée !')}
            {step === 'error'      && 'Échec — Cliquez sur Réessayer ou fermez'}
          </p>
          {mode === 'login' && step !== 'success' && step !== 'error' && (
            <ShieldCheck size={14} style={{ color: '#4d6080' }} />
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 15%; opacity: 0.8; }
          50%  { top: 80%; opacity: 1;   }
          100% { top: 15%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default FaceLoginModal;
