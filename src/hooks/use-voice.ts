import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export type VoiceLog = {
  id: number;
  text: string;
  timestamp: Date;
  status: "completed" | "listening";
};

export function useVoiceRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const idRef = useRef(0);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec: SpeechRecognitionLike = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal && transcript) {
          idRef.current += 1;
          setLogs((prev) =>
            [
              {
                id: idRef.current,
                text: transcript.toUpperCase(),
                timestamp: new Date(),
                status: "completed" as const,
              },
              ...prev,
            ].slice(0, 8)
          );
          interimText = "";
        } else {
          interimText += transcript + " ";
        }
      }
      setInterim(interimText.trim());
    };

    rec.onerror = (e: any) => {
      setError(e?.error || "voice_error");
    };

    rec.onend = () => {
      // Auto-restart if user still wants to listen (continuous mode auto-stops)
      if (shouldListenRef.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      shouldListenRef.current = false;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setError(null);
    shouldListenRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      // already started
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    shouldListenRef.current = false;
    try {
      rec.stop();
    } catch {
      /* noop */
    }
    setListening(false);
    setInterim("");
  }, []);

  return { supported, listening, interim, logs, error, start, stop };
}
