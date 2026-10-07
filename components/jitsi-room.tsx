"use client";

import { useEffect, useRef, useState } from "react";

type JitsiApi = {
  addListener: (event: string, listener: () => void) => void;
  dispose: () => void;
};

type JitsiApiConstructor = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    width: string;
    height: string;
    lang: string;
    configOverwrite: {
      enableClosePage: boolean;
      disableDeepLinking: boolean;
      prejoinConfig: { enabled: boolean };
    };
    userInfo: { displayName: string };
  },
) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiApiConstructor;
  }
}

type JitsiRoomProps = {
  roomUrl: string;
  displayName: string;
  onJoined: () => void;
  onReadyToClose: () => void;
};

export function JitsiRoom({ roomUrl, displayName, onJoined, onReadyToClose }: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const callbacksRef = useRef({ onJoined, onReadyToClose });
  const [loadError, setLoadError] = useState(false);
  const [unsupportedRoom, setUnsupportedRoom] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    callbacksRef.current = { onJoined, onReadyToClose };
  }, [onJoined, onReadyToClose]);

  useEffect(() => {
    let cancelled = false;
    let closeHandled = false;
    let api: JitsiApi | null = null;
    let script: HTMLScriptElement | null = null;

    const parsedUrl = new URL(roomUrl);
    if (parsedUrl.hostname !== "meet.jit.si" || !parsedUrl.pathname.replace(/^\/+/, "")) {
      setUnsupportedRoom(true);
      setLoadError(false);
      return;
    }

    setUnsupportedRoom(false);
    setLoadError(false);

    const createMeeting = () => {
      if (cancelled) return;
      const ExternalApi = window.JitsiMeetExternalAPI;
      const container = containerRef.current;
      if (!ExternalApi || !container) {
        setLoadError(true);
        return;
      }

      api = new ExternalApi(parsedUrl.hostname, {
        roomName: parsedUrl.pathname.replace(/^\/+/, ""),
        parentNode: container,
        width: "100%",
        height: "100%",
        lang: "fr",
        configOverwrite: {
          enableClosePage: false,
          disableDeepLinking: true,
          prejoinConfig: { enabled: true },
        },
        userInfo: { displayName },
      });
      apiRef.current = api;
      api.addListener("videoConferenceJoined", () => callbacksRef.current.onJoined());
      const handleConferenceClose = () => {
        if (cancelled || closeHandled) return;
        closeHandled = true;
        api?.dispose();
        apiRef.current = null;
        callbacksRef.current.onReadyToClose();
      };
      api.addListener("videoConferenceLeft", handleConferenceClose);
      api.addListener("readyToClose", handleConferenceClose);
    };

    const handleLoadError = () => {
      if (!cancelled) setLoadError(true);
    };

    if (window.JitsiMeetExternalAPI) {
      createMeeting();
    } else {
      script = document.querySelector<HTMLScriptElement>("#jitsi-external-api");
      if (!script) {
        script = document.createElement("script");
        script.id = "jitsi-external-api";
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", createMeeting, { once: true });
      script.addEventListener("error", handleLoadError, { once: true });
    }

    return () => {
      cancelled = true;
      if (script) {
        script.removeEventListener("load", createMeeting);
        script.removeEventListener("error", handleLoadError);
      }
      api?.dispose();
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [roomUrl, displayName, retry]);

  if (unsupportedRoom) {
    return (
      <section className="jitsiRoomMessage">
        <p>Cette salle utilise un service externe qui ne peut pas être intégré dans l’application.</p>
        <a className="btn secondary" href={roomUrl} target="_blank" rel="noreferrer">Ouvrir la salle</a>
      </section>
    );
  }

  return (
    <section className="jitsiRoom" aria-label="Salle de visioconférence">
      {loadError && (
        <div className="jitsiRoomMessage" role="alert">
          <p>La salle Jitsi n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.</p>
          <button type="button" className="btn secondary" onClick={() => setRetry((current) => current + 1)}>Réessayer</button>
        </div>
      )}
      <div ref={containerRef} className={`jitsiRoomFrame ${loadError ? "hidden" : ""}`} />
    </section>
  );
}
