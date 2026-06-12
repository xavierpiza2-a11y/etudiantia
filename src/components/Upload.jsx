// src/components/Upload.jsx
import { useState, useRef, useCallback } from "react";
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

export default function Upload({ user, onComplete }) {
  const [step, setStep] = useState("idle");
  const [previews, setPreviews] = useState([]); // URLs de prévisualisation
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const processFiles = useCallback(async (files) => {
    setError(null);

    // Validation
    const validFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      setError("Aucune image valide sélectionnée.");
      return;
    }
    if (validFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images à la fois.`);
      return;
    }

    // Prévisualisations
    const objectURLs = validFiles.map(f => URL.createObjectURL(f));
    setPreviews(objectURLs);
    setStep("compressing");
    setProgress(10);

    // Compression de toutes les images
    let compressedBlobs;
    try {
      compressedBlobs = await Promise.all(validFiles.map(f => compressImage(f)));
    } catch (e) {
      setError("Erreur compression : " + e.message);
      setStep("error");
      return;
    }

    // Upload toutes les images sur Firebase Storage
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

    // Créer le doc Firestore
    let courseRef;
    try {
      courseRef = await addDoc(collection(db, "users", user.uid, "courses"), {
        imageURL: downloadURLs[0],      // image principale pour la vignette
        imageURLs: downloadURLs,        // toutes les images
        pageCount: validFiles.length,
        status: "processing",
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setError("Erreur base de données : " + e.message);
      setStep("error");
      return;
    }

    // Préparer toutes les images en base64 pour le Worker
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
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-UID": user.uid,
        },
        body: JSON.stringify({
          action: "summarize",
          images: imagesPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur résumé");
      summary = json.data;
    } catch (e) {
      setError("Erreur analyse du cours : " + e.message);
      setStep("error");
      return;
    }

    await updateDoc(courseRef, { summary, status: "summarized" });
    setProgress(65);

    // Génération du quiz
    setStep("generating_quiz");
    setProgress(75);
    let quizData;
    try {
      const res = await fetch(`${WORKER_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-UID": user.uid,
        },
        body: JSON.stringify({
          action: "generate_quiz",
          summaryText: JSON.stringify(summary),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur quiz");
      quizData = json.data;
    } catch (e) {
      setError("Erreur génération du quiz : " + e.message);
      setStep("error");
      return;
    }

    // Sauvegarder le quiz
    let quizRef;
    try {
      quizRef = await addDoc(collection(db, "users", user.uid, "quizzes"), {
        questions: quizData.questions,
        courseId: courseRef.id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(courseRef, { quizId: quizRef.id, status: "ready" });
    } catch (e) {
      setError("Erreur sauvegarde quiz : " + e.message);
      setStep("error");
      return;
    }

    setProgress(100);
    setStep("done");

    // Nettoyer les object URLs
    objectURLs.forEach(url => URL.revokeObjectURL(url));

    setTimeout(() => {
      onComplete({
        courseId: courseRef.id,
        quizId: quizRef.id,
        summary,
        imageURL: downloadURLs[0],
      });
    }, 800);

  }, [user, onComplete]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handleReset = () => {
    setStep("idle");
    setPreviews([]);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="upload-container">
      {step === "idle" || step === "error" ? (
        <div
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          <div className="drop-zone-icon">📸</div>
          <p className="drop-zone-title">Prends en photo ton cours</p>
          <p className="drop-zone-sub">ou glisse-dépose tes images ici</p>
          <p className="drop-zone-hint">JPG, PNG, WEBP · max {MAX_FILES} pages · 4.5 MB chacune</p>
          {error && <p className="upload-error">{error}</p>}
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
          {/* Grille de prévisualisations */}
          {previews.length > 0 && (
            <div className={`previews-grid previews-${previews.length}`}>
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
            {step === "error" && (
              <button className="btn-reset" onClick={handleReset}>
                Réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
