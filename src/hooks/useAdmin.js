// src/hooks/useAdmin.js
// Accès aux routes /api/admin (nécessitent le PIN administrateur).
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export function useAdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get("/admin/overview"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const toggleDisabled = useCallback(async (id, currentlyDisabled) => {
    try {
      await api.patch(`/admin/profiles/${id}`, { disabled: !currentlyDisabled });
      setData((d) => ({
        ...d,
        profiles: d.profiles.map((p) => (p.id === id ? { ...p, disabled: !currentlyDisabled } : p)),
      }));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const deleteProfile = useCallback(async (id) => {
    try {
      await api.del(`/admin/profiles/${id}`);
      await fetchOverview();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [fetchOverview]);

  return { data, loading, error, refetch: fetchOverview, toggleDisabled, deleteProfile };
}

export function useAdminLogs(limitCount = 150) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/logs?limit=${limitCount}`)
      .then((d) => setLogs(d.logs))
      .catch((e) => console.error("Erreur chargement logs:", e))
      .finally(() => setLoading(false));
  }, [limitCount]);

  return { logs, loading };
}

export const fetchProfileDetail = (id) => api.get(`/admin/profiles/${id}`);

// Téléchargement direct : le cookie de session est envoyé, le serveur répond en pièce jointe
export function exportAllData() {
  window.location.href = "/api/admin/export";
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}
