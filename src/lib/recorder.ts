"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "paused" | "processing" | "stopped";

const TARGET_RATE = 16000;

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

/** Decode whatever the browser recorded and re-encode it as 16 kHz mono 16-bit PCM WAV (what STT and pronunciation services expect). */
async function toWav16k(blob: Blob): Promise<{ wav: Blob; duration: number }> {
  const buf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(buf);
  await ctx.close();
  const length = Math.ceil(decoded.duration * TARGET_RATE);
  const offline = new OfflineAudioContext(1, length, TARGET_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  out.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, TARGET_RATE, true);
  out.setUint32(28, TARGET_RATE * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  w(36, "data");
  out.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return { wav: new Blob([out.buffer], { type: "audio/wav" }), duration: decoded.duration };
}

/** Browser audio recorder (MediaRecorder) with pause/resume, an input level meter and an optional automatic stop. */
export function useRecorder({ maxSec }: { maxSec?: number } = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ wav: Blob; url: string; duration: number } | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);

  const cleanupStream = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  useEffect(() => {
    if (state !== "recording") return;
    const iv = setInterval(() => setElapsed((e) => e + 0.25), 250);
    return () => clearInterval(iv);
  }, [state]);

  const stop = useCallback(() => {
    if (rec.current && rec.current.state !== "inactive") {
      setState("processing");
      rec.current.stop();
    }
  }, []);

  useEffect(() => {
    if (maxSec && state === "recording" && elapsed >= maxSec) stop();
  }, [elapsed, maxSec, state, stop]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setElapsed(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record audio. Please use a recent Chrome, Edge, Firefox or Safari.");
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      stream.current = s;
      const mime = pickMime();
      const mr = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        cleanupStream();
        try {
          const raw = new Blob(chunks.current, { type: mr.mimeType || mime || "audio/webm" });
          const { wav, duration } = await toWav16k(raw);
          setResult({ wav, url: URL.createObjectURL(wav), duration });
          setState("stopped");
        } catch {
          setError("Could not process the recording. Please try again.");
          setState("idle");
        }
      };
      mr.start(1000);
      rec.current = mr;
      // Input level meter, so students can see the microphone is working.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(peak / 128);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      setState("recording");
    } catch (e) {
      cleanupStream();
      const name = (e as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow the microphone in your browser's site settings and try again."
          : name === "NotFoundError"
            ? "No microphone was found."
            : (e as Error).message,
      );
      setState("idle");
    }
  }, [cleanupStream]);

  const pause = useCallback(() => {
    if (rec.current?.state === "recording") {
      rec.current.pause();
      setState("paused");
    }
  }, []);
  const resume = useCallback(() => {
    if (rec.current?.state === "paused") {
      rec.current.resume();
      setState("recording");
    }
  }, []);
  const reset = useCallback(() => {
    if (rec.current && rec.current.state !== "inactive") {
      rec.current.onstop = null;
      rec.current.stop();
    }
    cleanupStream();
    setResult(null);
    setElapsed(0);
    setState("idle");
  }, [cleanupStream]);

  return { state, elapsed, level, error, result, start, pause, resume, stop, reset };
}

export function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
