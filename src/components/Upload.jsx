// src/components/Upload.jsx
import { useState, useRef, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../firebase/config";

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const MAX_IMAGE_DIMENSION = 1800;
const MAX_FILE_SIZE_MB = 4.5;

// Compression côté client
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
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(blob);
        },
        "image/jpeg",
        0.82
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

const STEPS = ["idle", "compressing", "uploading", "summarizing", "generating_quiz", "done", "error"];

export default function Upload({ user, onComplete }) {
  const [step, setStep] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const processFile = useCallback(
    async (file) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Fichier invalide. Utilise une image (JPG, PNG, WEBP).");
        return;
      }

      // Prévisualisation
      const objectURL = URL.createObjectURL(file);
      setPreview(objectURL);
      setStep("compressing");
      setProgress(10);

      let compressed;
      try {
        compressed = await compressImage(file);
        const sizeMB = compressed.size / 1_000_000;
        if (sizeMB > MAX_FILE_SIZE_MB) {
          throw new Error(`Image encore trop lourde après compression (${sizeMB.toFixed(1)}MB).`);
        }
      } catch (e) {
        setError(e.message);
        setStep("error");
        return;
      }

      // Upload Firebase Storage
      setStep("uploading");
      setProgress(25);
      let downloadURL;
      try {
        const storageRef = ref(storage, `courses/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
        downloadURL = await getDownloadURL(storageRef);
      } catch (e) {
        setError("Erreur upload : " + e.message);
        setStep("error");
        return;
      }

      // Créer le doc Firestore (état "processing")
      let courseRef;
      try {
        courseRef = await addDoc(collection(db, "users", user.uid, "courses"), {
          imageURL: downloadURL,
          status: "processing",
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        setError("Erreur base de données : " + e.message);
        setStep("error");
        return;
      }

      // Appel Worker : résumé
      setStep("summarizing");
      setProgress(45);
      let summary;
      try {
        const base64 = await blobToBase64(compressed);
        const res = await fetch(`${WORKER_URL}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Firebase-UID": user.uid,
          },
          body: JSON.stringify({
            action: "summarize",
            imageBase64: base64,
            imageMediaType: "image/jpeg",
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

      // Sauvegarder le résumé
      await updateDoc(courseRef, { summary, status: "summarized" });
      setProgress(65);

      // Appel Worker : quiz
      setStep("generating_quiz");
      setProgress(75);
      let quizData;
      try {
        const summaryText = JSON.stringify(summary);
        const res = await fetch(`${WORKER_URL}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Firebase-UID": user.uid,
          },
          body: JSON.stringify({
            action: "generate_quiz",
            summaryText,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Erreur génération quiz");
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

      // Notifier le parent
      setTimeout(() => {
        onComplete({
          courseId: courseRef.id,
          quizId: quizRef.id,
          summary,
          imageURL: downloadURL,
        });
      }, 800);
    },
    [user, onComplete]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const STEP_LABELS = {
    idle: "",
    compressing: "Compression de l'image…",
    uploading: "Envoi vers le serveur…",
    summarizing: "Claude analyse le cours…",
    generating_quiz: "Génération du quiz…",
    done: "Prêt ! 🎉",
    error: "Une erreur est survenue",
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
          aria-label="Zone d'upload de cours"
        >
          <div className="drop-zone-icon">📸</div>
          <p className="drop-zone-title">Prends en photo ton cours</p>
          <p className="drop-zone-sub">ou glisse-dépose une image ici</p>
          <p className="drop-zone-hint">JPG, PNG, WEBP · max 4.5 MB</p>
          {error && <p className="upload-error">{error}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="processing-card">
          {preview && (
            <img src={preview} alt="Aperçu du cours" className="preview-img" />
          )}
          <div className="processing-info">
            <p className="processing-label">{STEP_LABELS[step]}</p>
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
