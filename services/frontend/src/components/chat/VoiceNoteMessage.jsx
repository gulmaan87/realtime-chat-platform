import { Mic, Play } from "lucide-react";

function formatDuration(durationMs = 0) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VoiceNoteMessage({ message }) {
  const voiceNote = message?.voiceNote || {};
  const waveform = Array.isArray(voiceNote.waveform) ? voiceNote.waveform : [];
  const transcript = String(voiceNote.transcript || "").trim();
  const audioSrc = String(voiceNote.audioDataUrl || "");

  return (
    <div className="voice-note-card">
      <div className="voice-note-card__top">
        <div className="voice-note-card__meta">
          <div className="interactive-card__badge">
            <Mic size={14} />
            <span>Voice note</span>
          </div>
          <div className="voice-note-emotion-tag">{voiceNote.emotionTag || "Neutral"}</div>
        </div>
        <strong>{formatDuration(voiceNote.durationMs)}</strong>
      </div>

      <div className="voice-waveform" aria-hidden="true">
        {waveform.length > 0
          ? waveform.map((level, index) => (
              <span
                key={`${message.localId}-wave-${index}`}
                style={{ height: `${Math.max(20, Math.round(level * 44))}px` }}
              />
            ))
          : Array.from({ length: 20 }, (_, index) => (
              <span key={`${message.localId}-empty-${index}`} style={{ height: "20px" }} />
            ))}
      </div>

      {audioSrc ? (
        <audio className="voice-note-audio" controls preload="metadata" src={audioSrc}>
          Your browser does not support audio playback.
        </audio>
      ) : (
        <div className="voice-note-fallback">
          <Play size={14} />
          <span>Audio playback unavailable on this device.</span>
        </div>
      )}

      <div className="voice-note-transcript voice-note-transcript--message">
        <strong>Transcript</strong>
        <p>{transcript || message.message || "Voice note shared without transcript."}</p>
      </div>
    </div>
  );
}
