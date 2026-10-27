// src/components/Upload.jsx
// Scan d'un cours : compression côté navigateur → enregistrement sur le serveur (/data)
// → analyse IA seulement si ce cours n'est pas déjà connu (cache).
import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../lib/api";

const MAX_IMAGE_DIMENSION = 1800;
const MAX_FILES = 5;

// Caméra intégrée disponible uniquement en HTTPS ou sur localhost.
// Sinon on bascule sur l'appareil photo natif du téléphone (input capture).
const HAS_LIVE_CAMERA =
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

function compressBlob(blob, maxDimension = MAX_IMAGE_DIMENSION) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Compression impossible"))),
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible (format non pris en charge par ce navigateur)"));
    };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const STEP_LABELS = {
  idle: "",
  compressing: "Compression des images…",
  uploading: "Enregistrement sur le serveur…",
  summarizing: "Claude analyse le cours…",
  done: "Prêt ! 🎉",
  error: "Une erreur est survenue",
};

// ── Composant Caméra ─────────────────────────────────
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    let cancelled = false;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        setReady(true);
      } catch (e) {
        setError("Impossible d'accéder à la caméra : " + e.message);
      }
    };
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="camera-overlay">
      <div className="camera-modal">
        <div className="camera-header">
          <span className="camera-title">📷 Appareil photo</span>
          <button className="camera-close" onClick={onClose}>✕</button>
        </div>
        {error ? (
          <div className="camera-error">
            <p>{error}</p>
            <button className="btn-reset" onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <>
            <div className="camera-viewfinder">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              {!ready && <div className="camera-loading">Démarrage de la caméra…</div>}
              <div className="camera-frame" />
            </div>
            <div className="camera-controls">
              <button
                className="camera-shutter"
                onClick={capture}
                disabled={!ready}
                aria-label="Prendre la photo"
              >
                <div className="shutter-inner" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Composant principal Upload ───────────────────────
export default function Upload({ onComplete }) {
  const [step, setStep] = useState("idle");
  const [capturedBlobs, setCapturedBlobs] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCourseId, setRetryCourseId] = useState(null); // cours enregistré mais analyse échouée
  const [cachedNote, setCachedNote] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  // Progression « douce » pendant l'analyse (l'API ne renvoie pas d'avancement réel)
  useEffect(() => {
    if (step !== "summarizing") return;
    const t = setInterval(() => setProgress((p) => (p < 92 ? p + 1 : p)), 700);
    return () => clearInterval(t);
  }, [step]);

  const syncPreviews = (blobs) => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    setPreviews((old) => {
      old.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
  };

  const addFiles = useCallback((files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!valid.length) return;
    setCapturedBlobs((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_FILES);
      syncPreviews(next);
      return next;
    });
    setError(null);
    setRetryCourseId(null);
  }, []);

  const handleCameraCapture = useCallback((blob) => {
    setCapturedBlobs((prev) => {
      if (prev.length >= MAX_FILES) return prev;
      const next = [...prev, blob];
      syncPreviews(next);
      return next;
    });
    setShowCamera(false);
  }, []);

  const removeImage = (index) => {
    setCapturedBlobs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncPreviews(next);
      return next;
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = ""; // permet de re-sélectionner la même photo
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const openCamera = () => {
    if (HAS_LIVE_CAMERA) setShowCamera(true);
    else cameraInputRef.current?.click();
  };

  const finish = (course, activity, fromCache) => {
    setProgress(100);
    setCachedNote(fromCache);
    setStep("done");
    setTimeout(() => onComplete({ course, activity }), fromCache ? 1400 : 800);
  };

  // Analyse d'un cours déjà enregistré (1re tentative ou « Réessayer »)
  const runSummarize = async (courseId, creationActivity) => {
    setStep("summarizing");
    setProgress(45);
    try {
      const { course, activity } = await api.post(`/courses/${courseId}/summarize`);
      finish(course, activity || creationActivity, false);
    } catch (e) {
      setError("Erreur analyse : " + e.message);
      setRetryCourseId(courseId);
      setStep("error");
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!capturedBlobs.length) return;
    setError(null);
    setRetryCourseId(null);
    setStep("compressing");
    setProgress(10);

    let payload;
    try {
      const compressed = await Promise.all(capturedBlobs.map((b) => compressBlob(b)));
      payload = await Promise.all(compressed.map(async (b) => ({ base64: await blobToBase64(b) })));
    } catch (e) {
      setError("Erreur compression : " + e.message);
      setStep("error");
      return;
    }

    setStep("uploading");
    setProgress(25);
    let created;
    try {
      created = await api.post("/courses", { images: payload });
    } catch (e) {
      setError("Erreur enregistrement : " + e.message);
      setStep("error");
      return;
    }

    if (!created.needsAnalysis) {
      // Cours déjà analysé auparavant : aucun appel à l'IA
      finish(created.course, created.activity, true);
      return;
    }
    await runSummarize(created.course.id, created.activity);
  }, [capturedBlobs, onComplete]);

  const handleReset = () => {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setStep("idle");
    setCapturedBlobs([]);
    setPreviews([]);
    setProgress(0);
    setError(null);
    setRetryCourseId(null);
    setCachedNote(false);
  };

  const isProcessing = !["idle", "error"].includes(step);

  return (
    <div className="upload-container">
      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      {!isProcessing ? (
        <div className="upload-panel">
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${capturedBlobs.length > 0 ? "has-images" : ""}`}
            onClick={() => capturedBlobs.length < MAX_FILES && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            {capturedBlobs.length === 0 ? (
              <>
                <div className="drop-zone-icon">📄</div>
                <p className="drop-zone-title">Glisse tes images ici</p>
                <p className="drop-zone-sub">ou utilise les boutons ci-dessous</p>
                <p className="drop-zone-hint">JPG, PNG, WEBP · max {MAX_FILES} pages</p>
              </>
            ) : (
              <div className={`previews-grid previews-${Math.min(capturedBlobs.length, 5)}`}>
                {previews.map((url, i) => (
                  <div key={url} className="preview-item">
                    <img src={url} alt={`Page ${i + 1}`} className="preview-thumb" />
                    <button
                      className="preview-remove"
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      aria-label={`Supprimer page ${i + 1}`}
                    >
                      ✕
                    </button>
                    <span className="preview-label">Page {i + 1}</span>
                  </div>
                ))}
                {capturedBlobs.length < MAX_FILES && (
                  <div className="preview-add" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <span>+</span>
                    <span className="preview-add-label">Ajouter</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="upload-actions">
            <button className="btn-camera" onClick={openCamera} disabled={capturedBlobs.length >= MAX_FILES}>
              📷 Caméra
            </button>
            <button
              className="btn-file"
              onClick={() => fileInputRef.current?.click()}
              disabled={capturedBlobs.length >= MAX_FILES}
            >
              🖼️ Fichier
            </button>
            {capturedBlobs.length > 0 && (
              <button className="btn-reset-sm" onClick={handleReset}>
                🗑 Tout effacer
              </button>
            )}
          </div>

          <p className="upload-count">
            {capturedBlobs.length} / {MAX_FILES} page{capturedBlobs.length > 1 ? "s" : ""}
          </p>

          {error && <p className="upload-error">{error}</p>}

          {retryCourseId && (
            <button className="btn-analyze" onClick={() => runSummarize(retryCourseId, null)}>
              🔄 Réessayer l'analyse (images déjà enregistrées)
            </button>
          )}

          {!retryCourseId && capturedBlobs.length > 0 && (
            <button className="btn-analyze" onClick={handleAnalyze}>
              Analyser {capturedBlobs.length > 1 ? `les ${capturedBlobs.length} pages` : "la page"} →
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="processing-card">
          {previews.length > 0 && (
            <div className={`previews-grid previews-${Math.min(previews.length, 5)}`}>
              {previews.map((url, i) => (
                <img key={url} src={url} alt={`Page ${i + 1}`} className="preview-thumb" />
              ))}
            </div>
          )}
          <div className="processing-info">
            <div className="processing-header">
              <p className="processing-label">
                {step === "done" && cachedNote
                  ? "Cours déjà connu — récupéré sans appel IA 💾"
                  : STEP_LABELS[step]}
              </p>
              {previews.length > 1 && <span className="processing-pages">{previews.length} pages</span>}
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="progress-pct">{progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
