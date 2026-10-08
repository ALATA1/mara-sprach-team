"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type RequestStatus = "submitted" | "assigned" | "in_progress" | "resolved" | "closed";
type SupportRequest = {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  description: string;
  status: RequestStatus;
  volunteer_id: string | null;
  created_at: string;
  requester_name: string;
};
type Volunteer = { id: string; name: string };
type DashboardData = {
  role: "volunteer" | "admin";
  currentUserId: string;
  requests: SupportRequest[];
  volunteers: Volunteer[];
};

const statusLabels: Record<RequestStatus, string> = {
  submitted: "Nouvelle",
  assigned: "Attribuée",
  in_progress: "En cours",
  resolved: "Résolue",
  closed: "Clôturée",
};

export function StaffDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support-requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de charger les demandes.");
      setData(result as DashboardData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const updateRequest = async (
    request: SupportRequest,
    changes: { status?: RequestStatus; volunteerId?: string | null },
  ) => {
    setBusyId(request.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/support-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, ...changes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de mettre à jour la demande.");
      setMessage("Demande mise à jour.");
      await loadRequests();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de mettre à jour la demande.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="shell staffDashboard">
      <header className="staffDashboardHeader">
        <div>
          <p className="eyebrow">Espace équipe</p>
          <h1>Demandes d’accompagnement</h1>
          <p className="muted">Consultez, attribuez et suivez les demandes des étudiants.</p>
        </div>
        <div className="staffFormActions">
          <Link className="btn ghost" href="/">Accueil</Link>
          {data?.role === "admin" && <Link className="btn ghost" href="/staff/teaching">Gestion des cours et LIVE</Link>}
          {data?.role === "admin" && <Link className="btn ghost" href="/staff/admin">Administration</Link>}
          <button className="btn secondary" type="button" onClick={() => void loadRequests()} disabled={loading}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </div>
      </header>

      {error && <p className="authError" role="alert">{error}</p>}
      {message && <p className="staffSuccess" role="status">{message}</p>}
      {loading && <p role="status">Chargement des demandes…</p>}
      {!loading && data?.requests.length === 0 && <section className="card">Aucune demande à traiter.</section>}

      <div className="staffRequestList">
        {data?.requests.map((request) => {
          const isBusy = busyId === request.id;
          const isAssignedToCurrentUser = request.volunteer_id === data.currentUserId;
          const canClaim = data.role === "volunteer" && !request.volunteer_id;
          const canManage = data.role === "admin" || isAssignedToCurrentUser;

          return (
            <article className="card staffRequest" key={request.id}>
              <div className="staffRequestHeading">
                <div>
                  <p className="eyebrow">{request.type} · {request.requester_name || "Étudiant"}</p>
                  <h2>{request.subject}</h2>
                  <p className="muted">{new Date(request.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <span className="pill">{statusLabels[request.status]}</span>
              </div>
              <p className="staffRequestDescription">{request.description}</p>
              <div className="staffRequestControls">
                {data.role === "admin" ? (
                  <label className="field">
                    Bénévole responsable
                    <select
                      value={request.volunteer_id ?? ""}
                      disabled={isBusy}
                      onChange={(event) => void updateRequest(request, { volunteerId: event.target.value || null })}
                    >
                      <option value="">Non attribuée</option>
                      {data.volunteers.map((volunteer) => (
                        <option value={volunteer.id} key={volunteer.id}>{volunteer.name}</option>
                      ))}
                    </select>
                  </label>
                ) : canClaim ? (
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={isBusy}
                    onClick={() => void updateRequest(request, { volunteerId: data.currentUserId, status: "assigned" })}
                  >
                    {isBusy ? "Attribution…" : "M’attribuer"}
                  </button>
                ) : (
                  <p className="muted">Attribuée à votre compte</p>
                )}
                {canManage && (
                  <label className="field">
                    État
                    <select
                      value={request.status}
                      disabled={isBusy}
                      onChange={(event) => void updateRequest(request, { status: event.target.value as RequestStatus })}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
