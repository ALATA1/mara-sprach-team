"use client";

import { useEffect, useState } from "react";

type GermanPronunciationButtonProps = {
  text: string;
  label?: string;
};

export function GermanPronunciationButton({ text, label = "Écouter" }: GermanPronunciationButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const speak = () => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setUnavailable(true);
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.78;
    utterance.pitch = 1;

    const germanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("de"));
    if (!germanVoice) {
      setUnavailable(true);
      return;
    }
    utterance.voice = germanVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setUnavailable(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      className={`pronunciationButton ${speaking ? "speaking" : ""}`}
      aria-label={`${speaking ? "Arrêter" : label} : ${text}`}
      aria-pressed={speaking}
      title="Prononciation allemande lente"
      onClick={speak}
    >
      <span aria-hidden="true">{speaking ? "■" : "🔊"}</span>
      <span>{speaking ? "Arrêter" : label}</span>
      {unavailable && <span className="srOnly">Aucune voix allemande n’est disponible sur cet appareil.</span>}
    </button>
  );
}

export function GermanVoiceStatus() {
  const [status, setStatus] = useState<"checking" | "available" | "missing" | "unsupported">("checking");

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setStatus("unsupported");
      return;
    }

    const synthesis = window.speechSynthesis;
    let settled = false;
    const checkVoices = () => {
      const voices = synthesis.getVoices();
      if (!voices.length) return;
      settled = true;
      setStatus(voices.some((voice) => voice.lang.toLowerCase().startsWith("de")) ? "available" : "missing");
    };

    checkVoices();
    synthesis.addEventListener("voiceschanged", checkVoices);
    const timeout = window.setTimeout(() => {
      if (!settled) setStatus("missing");
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
      synthesis.removeEventListener("voiceschanged", checkVoices);
    };
  }, []);

  if (status === "checking" || status === "available") return null;

  return (
    <p className="voiceAvailabilityNotice" role="status">
      {status === "unsupported"
        ? "La lecture vocale n’est pas prise en charge par ce navigateur."
        : "Aucune voix allemande n’est détectée sur cet appareil. Les boutons de lecture demandent une voix de synthèse en allemand ; installez ou activez une voix de langue allemande dans les réglages du navigateur ou du système."}
    </p>
  );
}
