const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function createCallId() {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getCallMediaStream(mode = "audio") {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices are unavailable on this device.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: mode === "video",
  });
}

export function createPeerConnection({
  localStream,
  onRemoteTrack,
  onIceCandidate,
  onConnectionStateChange,
}) {
  const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams || [];
    if (remoteStream) {
      onRemoteTrack?.(remoteStream);
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate?.(event.candidate);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    onConnectionStateChange?.(peerConnection.connectionState);
  };

  return peerConnection;
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
