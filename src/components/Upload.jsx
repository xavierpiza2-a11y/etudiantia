// src/components/Upload.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../firebase/config";

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const MAX_IMAGE_DIMENSION = 1800;
const MAX_FILES = 5;

function compressImage(file, maxDimension = MAX_IMAGE_DIMENSION) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
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
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg", 0.82
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
        (b) => b ? resolve(b) : reject(new Error("Compression failed")),
        "image/jpeg", 0.82
      );
    };
    img.onerror = reject;
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
  uploading: "Envoi vers le serveur…",
  summarizing: "Claude analyse le cours…",
  generating_quiz: "Génération du quiz…",
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
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        videoRef.current.srcObject = stream;
        setReady(true);
      } catch (e) {
        setError("Impossible d'accéder à la caméra : " + e.message);
      }
    };
    start();
    return () => {
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
              />
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
export default function Upload({ user, onComplete }) {
  const [step, setStep] = useState("idle");
  const [capturedBlobs, setCapturedBlobs] = useState([]); // Blobs des images
  const [previews, setPreviews] = useState([]);            // URLs de préview
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef();

  // Ajouter des fichiers à la sélection
  const addFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!validFiles.length) return;

    setCapturedBlobs(prev => {
      const next = [...prev, ...validFiles].slice(0, MAX_FILES);
      // Mettre à jour les previews
      const urls = next.map(f => URL.createObjectURL(f));
      setPreviews(old => { old.forEach(u => URL.revokeObjectURL(u)); return urls; });
      return next;
    });
    setError(null);
  }, []);

  // Ajouter une photo prise par la caméra
  const handleCameraCapture = useCallback((blob) => {
    setCapturedBlobs(prev => {
      if (prev.length >= MAX_FILES) return prev;
      const next = [...prev, blob];
      const urls = next.map(b => URL.createObjectURL(b));
      setPreviews(old => { old.forEach(u => URL.revokeObjectURL(u)); return urls; });
      return next;
    });
    setShowCamera(false);
  }, []);

  // Supprimer une image de la sélection
  const removeImage = (index) => {
    setCapturedBlobs(prev => {
      const next = prev.filter((_, i) => i !== index);
      const urls = next.map(b => URL.createObjectURL(b));
      setPreviews(old => { old.forEach(u => URL.revokeObjectURL(u)); return urls; });
      return next;
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // Lancer l'analyse
  const handleAnalyze = useCallback(async () => {
    if (!capturedBlobs.length) return;
    setError(null);
    setStep("compressing");
    setProgress(10);

    // Compression
    let compressedBlobs;
    try {
      compressedBlobs = await Promise.all(capturedBlobs.map(b => compressBlob(b)));
    } catch (e) {
      setError("Erreur compression : " + e.message);
      setStep("error");
      return;
    }

    // Upload Firebase Storage
    setStep("uploading");
    setProgress(25);
    let downloadURLs;
    try {
      downloadURLs = await Promise.all(
        compressedBlobs.map(async (blob, i) => {
          const storageRef = ref(storage, `courses/${user.uid}/${Date.now()}_${i}.jpg`);
          await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );
    } catch (e) {
      setError("Erreur upload : " + e.message);
      setStep("error");
      return;
    }

    // Créer doc Firestore
    let courseRef;
    try {
      courseRef = await addDoc(collection(db, "users", user.uid, "courses"), {
        imageURL: downloadURLs[0],
        imageURLs: downloadURLs,
        pageCount: compressedBlobs.length,
        status: "processing",
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setError("Erreur base de données : " + e.message);
      setStep("error");
      return;
    }

    // Analyse Claude
    setStep("summarizing");
    setProgress(45);
    let summary;
    try {
      const imagesPayload = await Promise.all(
        compressedBlobs.map(async (blob) => ({
          base64: await blobToBase64(blob),
          mediaType: "image/jpeg",
        }))
      );
      const res = await fetch(`${WORKER_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Firebase-UID": user.uid },
        body: JSON.stringify({ action: "summarize", images: imagesPayload }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur résumé");
      summary = json.data;
    } catch (e) {
      setError("Erreur analyse : " + e.message);
      setStep("error");
      return;
    }

    await updateDoc(courseRef, { summary, status: "summarized" });
    setProgress(70);

    // Sauvegarder sans quiz (le quiz sera généré après config)
    try {
      await updateDoc(courseRef, { status: "ready_for_quiz" });
    } catch (e) {
      console.error(e);
    }

    setProgress(100);
    setStep("done");
    previews.forEach(u => URL.revokeObjectURL(u));

    setTimeout(() => {
      onComplete({
        courseId: courseRef.id,
        summary,
        imageURL: downloadURLs[0],
        needsQuizConfig: true, // signal pour afficher la config
      });
    }, 800);

  }, [capturedBlobs, user, onComplete, previews]);

  const handleReset = () => {
    previews.forEach(u => URL.revokeObjectURL(u));
    setStep("idle");
    setCapturedBlobs([]);
    setPreviews([]);
    setProgress(0);
    setError(null);
  };

  const isProcessing = !["idle", "error"].includes(step);

  return (
    <div className="upload-container">
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {!isProcessing ? (
        <div className="upload-panel">
          {/* Zone de drop */}
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
                  <div key={i} className="preview-item">
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

          {/* Boutons d'action */}
          <div className="upload-actions">
            <button
              className="btn-camera"
              onClick={() => setShowCamera(true)}
              disabled={capturedBlobs.length >= MAX_FILES}
            >
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

          {capturedBlobs.length > 0 && (
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
        </div>
      ) : (
        <div className="processing-card">
          {previews.length > 0 && (
            <div className={`previews-grid previews-${Math.min(previews.length, 5)}`}>
              {previews.map((url, i) => (
                <img key={i} src={url} alt={`Page ${i + 1}`} className="preview-thumb" />
              ))}
            </div>
          )}
          <div className="processing-info">
            <div className="processing-header">
              <p className="processing-label">{STEP_LABELS[step]}</p>
              {previews.length > 1 && (
                <span className="processing-pages">{previews.length} pages</span>
              )}
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