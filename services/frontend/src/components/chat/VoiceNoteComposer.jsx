import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, PauseCircle, Send, Square, Waves } from "lucide-react";
import {
  blobToDataUrl,
  createWaveformSnapshot,
  detectVoiceEmotionTag,
  getVoiceTranscriptPreview,
} from "../../services/voiceCollaborationService";

const MAX_RECORDING_MS = 45_000;

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceNoteComposer({ disabled, onSendVoiceNote }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(0);
  const levelHistoryRef = useRef([]);
  const isRecorderClosingRef = useRef(false);

  const transcriptPreview = useMemo(
    () => getVoiceTranscriptPreview(transcript),
    [transcript]
  );
  const emotionTag = useMemo(
    () =>
      detectVoiceEmotionTag({
        transcript,
        averageLevel: audioLevel,
      }),
    [audioLevel, transcript]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      recognitionRef.current?.stop?.();
      mediaRecorderRef.current?.stop?.();
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      audioContextRef.current?.close?.();
    };
  }, []);

  const stopLevelTracking = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    analyserRef.current = null;
    audioContextRef.current?.close?.();
    audioContextRef.current = null;
    setAudioLevel(0);
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore speech stop errors
      }
      recognitionRef.current = null;
    }
  };

  const resetComposer = () => {
    setIsRecording(false);
    setIsProcessing(false);
    setDurationMs(0);
    setTranscript("");
    setAudioLevel(0);
    setError("");
    audioChunksRef.current = [];
    levelHistoryRef.current = [];
    isRecorderClosingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopSpeechRecognition();
    stopLevelTracking();
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const handleSendRecording = async () => {
    const blob = audioChunksRef.current.length
      ? new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" })
      : null;

    if (!blob || blob.size === 0) {
      setError("No audio captured. Try recording again.");
      setIsProcessing(false);
      return;
    }

    const waveform = createWaveformSnapshot(levelHistoryRef.current);
    const averageLevel =
      waveform.reduce((sum, value) => sum + value, 0) / Math.max(1, waveform.length || 1);
    const resolvedEmotion = detectVoiceEmotionTag({
      transcript,
      averageLevel,
    });

    try {
      const audioDataUrl = await blobToDataUrl(blob);
      await onSendVoiceNote?.({
        audioDataUrl,
        mimeType: blob.type || "audio/webm",
        durationMs,
        transcript: transcript.trim(),
        emotionTag: resolvedEmotion,
        waveform,
        previewText: transcriptPreview,
      });
      resetComposer();
    } catch {
      setError("Unable to prepare this voice note.");
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording || isRecorderClosingRef.current) return;
    isRecorderClosingRef.current = true;
    setIsProcessing(true);
    setIsRecording(false);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    stopSpeechRecognition();
    stopLevelTracking();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      handleSendRecording();
    }
  };

  const startLevelTracking = async (stream) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const average =
        data.reduce((sum, value) => sum + value, 0) / Math.max(1, data.length) / 255;
      setAudioLevel(average);
      levelHistoryRef.current.push(average);
      if (levelHistoryRef.current.length > 160) {
        levelHistoryRef.current.shift();
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let nextTranscript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        nextTranscript += `${event.results[index][0]?.transcript || ""} `;
      }
      setTranscript(nextTranscript.trim());
    };

    recognition.onerror = () => {
      setError("Live transcription is unavailable on this browser.");
    };

    recognition.onend = () => {
      if (isRecording && !isRecorderClosingRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore restart failures
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startRecording = async () => {
    if (disabled || isRecording || isProcessing) return;

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        throw new Error("recording_not_supported");
      }

      setError("");
      setTranscript("");
      setDurationMs(0);
      levelHistoryRef.current = [];
      audioChunksRef.current = [];
      isRecorderClosingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        handleSendRecording();
      };

      await startLevelTracking(stream);
      startSpeechRecognition();

      startedAtRef.current = Date.now();
      setIsRecording(true);
      mediaRecorder.start(300);

      timerRef.current = setInterval(() => {
        const nextDuration = Date.now() - startedAtRef.current;
        setDurationMs(nextDuration);
        if (nextDuration >= MAX_RECORDING_MS) {
          stopRecording();
        }
      }, 200);
    } catch {
      setError("Microphone access is blocked or unavailable.");
      resetComposer();
    }
  };

  return (
    <>
      <div className="composer-toolbar composer-toolbar--inline">
        <button
          type="button"
          className={`voice-note-trigger utility-trigger ${isRecording ? "active" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing}
          title={isRecording ? "Stop voice note" : "Voice note"}
          aria-label={isRecording ? "Stop voice note" : "Voice note"}
        >
          {isRecording ? <PauseCircle size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {isRecording || isProcessing || error ? (
        <div className="voice-note-panel">
          <div className="voice-note-panel__header">
            <div>
              <p className="interactive-composer-panel__eyebrow">Voice note</p>
              <h4>{isProcessing ? "Preparing voice note" : "Recording with live transcript"}</h4>
            </div>
            <div className="interactive-card__badge">
              <Waves size={14} />
              <span>{formatDuration(durationMs)}</span>
            </div>
          </div>

          <div className="voice-note-status-row">
            <div className={`voice-note-live-pill ${isRecording ? "active" : ""}`}>
              <span className="voice-note-live-dot" />
              <strong>{isRecording ? "Recording live" : "Ready to send"}</strong>
            </div>
            <div className="voice-note-emotion-tag">{emotionTag}</div>
          </div>

          <div className="voice-note-level-meter" aria-hidden="true">
            <div
              className="voice-note-level-meter__fill"
              style={{ width: `${Math.max(8, Math.round(audioLevel * 100))}%` }}
            />
          </div>

          <div className="voice-note-transcript">
            <strong>Transcript</strong>
            <p>{transcriptPreview}</p>
          </div>

          {error ? <p className="voice-note-error">{error}</p> : null}

          <div className="interactive-actions">
            {isRecording ? (
              <button type="button" onClick={stopRecording} disabled={isProcessing}>
                <Square size={14} />
                Stop and send
              </button>
            ) : null}
            {!isRecording && !isProcessing ? (
              <button type="button" onClick={resetComposer}>
                Dismiss
              </button>
            ) : null}
            {isProcessing ? (
              <button type="button" disabled>
                <Send size={14} />
                Sending...
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
