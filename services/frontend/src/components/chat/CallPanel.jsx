import { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";

export default function CallPanel({
  callState,
  activeUser,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const isVisible = callState.status !== "idle";
  const isVideoCall = callState.mode === "video";

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (!isVisible) return null;

  const contactName = callState.peerUser?.username || activeUser?.username || "Contact";
  const heading =
    callState.status === "incoming"
      ? `${contactName} is calling`
      : callState.status === "outgoing"
        ? `Calling ${contactName}`
        : callState.status === "active"
          ? `In ${isVideoCall ? "video" : "audio"} call`
          : `Connecting to ${contactName}`;

  return (
    <div className="call-panel-overlay">
      <div className={`call-panel ${isVideoCall ? "call-panel--video" : "call-panel--audio"}`}>
        <div className="call-panel__header">
          <div>
            <p className="call-panel__eyebrow">{isVideoCall ? "Video call" : "Audio call"}</p>
            <h3>{heading}</h3>
            <span>{callState.message}</span>
          </div>
          {callState.status === "active" ? (
            <div className="call-status-live">
              <span className="call-status-live__dot" />
              Live
            </div>
          ) : null}
        </div>

        <div className="call-panel__stage">
          <div className="call-video-card call-video-card--remote">
            {remoteStream && isVideoCall ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="call-video" />
            ) : (
              <div className="call-avatar-fallback">
                {contactName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <strong>{contactName}</strong>
          </div>

          <div className="call-video-card call-video-card--local">
            {localStream && isVideoCall ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="call-video" />
            ) : (
              <div className="call-avatar-fallback call-avatar-fallback--local">
                You
              </div>
            )}
            <small>{callState.isMuted ? "Muted" : "Mic on"}</small>
          </div>
        </div>

        <div className="call-panel__actions">
          {callState.status === "incoming" ? (
            <>
              <button type="button" className="call-action-button call-action-button--accept" onClick={onAccept}>
                <Phone size={18} />
                Accept
              </button>
              <button type="button" className="call-action-button call-action-button--end" onClick={onDecline}>
                <PhoneOff size={18} />
                Decline
              </button>
            </>
          ) : (
            <>
              <button type="button" className="call-action-button" onClick={onToggleMute}>
                {callState.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {callState.isMuted ? "Unmute" : "Mute"}
              </button>
              {isVideoCall ? (
                <button type="button" className="call-action-button" onClick={onToggleCamera}>
                  {callState.isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                  {callState.isCameraOff ? "Camera off" : "Camera on"}
                </button>
              ) : null}
              <button type="button" className="call-action-button call-action-button--end" onClick={onEnd}>
                <PhoneOff size={18} />
                End call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
