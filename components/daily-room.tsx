"use client";

import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";

type DailyRoomProps = {
  roomUrl: string;
  onJoined: () => void;
  onReadyToClose: () => void;
};

type TokenResponse = {
  token?: unknown;
  error?: unknown;
};

const getRoomName = (value: string) => {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".daily.co") ||
      segments.length !== 1 ||
      !/^[a-zA-Z0-9_-]+$/.test(segments[0])
    ) {
      return null;
    }
    return segments[0];
  } catch {
    return null;
  }
};

export function DailyRoom({ roomUrl, onJoined, onReadyToClose }: DailyRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onJoined, onReadyToClose });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    callbacksRef.current = { onJoined, onReadyToClose };
  }, [onJoined, onReadyToClose]);

  useEffect(() => {
    let cancelled = false;
    let closeHandled = false;
    let call: DailyCall | null = null;
    const roomName = getRoomName(roomUrl);
    setLoading(true);
    setError("");

    const handleJoined = () => callbacksRef.current.onJoined();
    const handleLeft = () => {
      if (cancelled || closeHandled) return;
      closeHandled = true;
      callbacksRef.current.onReadyToClose();
    };

    const joinRoom = async () => {
      if (!roomName) {
        setError("L’adresse de cette salle Daily est invalide.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/live/daily-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
          cache: "no-store",
        });
        const result = (await response.json()) as TokenResponse;
        if (!response.ok || typeof result.token !== "string") {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Impossible de préparer la salle vidéo.",
          );
        }
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) throw new Error("La salle vidéo ne peut pas être affichée.");

        call = DailyIframe.createFrame(container, {
          lang: "fr",
          showLeaveButton: true,
          iframeStyle: { width: "100%", height: "100%", border: "0" },
        });
        call.on("joined-meeting", handleJoined);
        call.on("left-meeting", handleLeft);
        await call.join({ url: roomUrl, token: result.token });
      } catch (joinError) {
        if (!cancelled) {
          setError(
            joinError instanceof Error
              ? joinError.message
              : "La salle vidéo n’a pas pu être ouverte.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void joinRoom();

    return () => {
      cancelled = true;
      if (call) {
        call.off("joined-meeting", handleJoined);
        call.off("left-meeting", handleLeft);
        void call.destroy().catch((destroyError: unknown) => {
          console.error("Daily room cleanup failed:", destroyError);
        });
      }
    };
  }, [roomUrl, retry]);

  return (
    <section className="dailyRoom" aria-label="Salle de visioconférence">
      {loading && <p className="dailyRoomStatus" role="status">Préparation de la salle vidéo…</p>}
      {error && (
        <div className="dailyRoomMessage" role="alert">
          <p>{error}</p>
          <button type="button" className="btn secondary" onClick={() => setRetry((current) => current + 1)}>
            Réessayer
          </button>
        </div>
      )}
      <div ref={containerRef} className={`dailyRoomFrame ${error ? "hidden" : ""}`} />
    </section>
  );
}
