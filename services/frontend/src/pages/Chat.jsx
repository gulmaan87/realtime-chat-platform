import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, LogOut, PanelRightOpen, PanelLeftOpen } from "lucide-react";
import ContactList from "../components/ContactList";
import ChatHeader from "../components/chat/ChatHeader";
import MessageTimeline from "../components/chat/MessageTimeline";
import MessageComposer from "../components/chat/MessageComposer";
import AssistantRail from "../components/chat/AssistantRail";
import CallPanel from "../components/chat/CallPanel";
import { createSocket } from "../services/socket";
import { addContact, fetchChatHistory, fetchContacts, fetchUsers } from "../services/api";
import { createCallId, createPeerConnection, getCallMediaStream, stopStream } from "../services/callService";
import { clearSession, getSession, getUserId } from "../services/session";
import "../App.css";

function normalizeMessage(entry, fallbackIndex = 0) {
  const timestamp = Number(entry?.timestamp || Date.now());
  return {
    ...entry,
    localId: entry?.localId || `msg-${timestamp}-${fallbackIndex}`,
    message: typeof entry === "string" ? entry : entry.message,
    timestamp,
  };
}

function toTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts) {
  if (!ts) return "Just now";
  const diffMinutes = Math.max(0, Math.round((Date.now() - Number(ts)) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function deriveMoodLabel(messages) {
  const sample = messages.slice(-3).map((item) => item.message?.toLowerCase() || "").join(" ");
  if (/(great|love|awesome|nice|thanks|perfect)/.test(sample)) return "Positive and collaborative";
  if (/(urgent|asap|issue|problem|stuck|delay)/.test(sample)) return "Needs quick attention";
  return "Steady and conversational";
}

function buildQuickReplies(activeChatUser, messages) {
  const name = activeChatUser?.username || "there";
  if (!messages.length) {
    return [`Hey ${name}, want to sync?`, "I just pushed an update.", "Can you review this today?"];
  }

  const lastMessage = messages[messages.length - 1]?.message?.toLowerCase() || "";
  if (lastMessage.includes("?")) {
    return ["On it.", "I can take that.", "Give me 10 minutes."];
  }
  if (/(thanks|thank you)/.test(lastMessage)) {
    return ["Anytime.", "Happy to help.", "We are aligned."];
  }
  return ["Looks good.", "Let me check.", "I will follow up shortly."];
}

function mergeContacts(primaryContacts, fallbackUsers, currentUserId) {
  const merged = new Map();

  [...primaryContacts, ...fallbackUsers].forEach((item) => {
    const id = String(item?.id || item?._id || "");
    if (!id || id === String(currentUserId)) return;
    if (!merged.has(id)) {
      merged.set(id, { ...item });
    }
  });

  return Array.from(merged.values());
}

function createDefaultCallState() {
  return {
    status: "idle",
    mode: "audio",
    callId: "",
    peerUser: null,
    peerUserId: "",
    initiator: false,
    isMuted: false,
    isCameraOff: false,
    message: "",
  };
}

export default function Chat({ activeChatUser, setActiveChatUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [chatError, setChatError] = useState("");
  const [addContactBusy, setAddContactBusy] = useState(false);
  const [callState, setCallState] = useState(createDefaultCallState);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const draftsRef = useRef({});
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callStateRef = useRef(createDefaultCallState());

  const { token, user } = getSession();
  const userId = getUserId(user);
  const activeChatId = String(activeChatUser?.id || activeChatUser?._id || "");

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const getInitials = useCallback((name = "") => name.slice(0, 2).toUpperCase(), []);
  const getAvatarColor = useCallback((name = "") => {
    const palette = ["#8b5cf6", "#22d3ee", "#f97316", "#ec4899", "#10b981"];
    const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[seed % palette.length];
  }, []);

  const getContactById = useCallback((targetUserId) => {
    const normalizedId = String(targetUserId || "");
    return contacts.find((contact) => String(contact.id || contact._id) === normalizedId) || null;
  }, [contacts]);

  const resetCallUi = useCallback(() => {
    setCallState(createDefaultCallState());
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const destroyCallResources = useCallback(() => {
    peerConnectionRef.current?.close?.();
    peerConnectionRef.current = null;
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const endCall = useCallback((options = {}) => {
    const {
      notifyPeer = true,
      reason = "ended",
      nextMessage = "",
      keepError = false,
    } = options;

    const peerUserId = callStateRef.current.peerUserId;
    const callId = callStateRef.current.callId;

    if (notifyPeer && peerUserId && callId) {
      socketRef.current?.emit("call_end", {
        callId,
        toUserId: peerUserId,
        reason,
      });
    }

    destroyCallResources();
    resetCallUi();

    if (nextMessage) {
      setChatError(nextMessage);
    } else if (!keepError) {
      setChatError("");
    }
  }, [destroyCallResources, resetCallUi]);

  const initializePeerConnection = useCallback(async ({ mode, peerUserId, callId }) => {
    if (!localStreamRef.current) {
      throw new Error("Local media is not ready.");
    }

    peerConnectionRef.current?.close?.();

    const nextPeerConnection = createPeerConnection({
      localStream: localStreamRef.current,
      onRemoteTrack: (stream) => {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      },
      onIceCandidate: (candidate) => {
        socketRef.current?.emit("webrtc_signal", {
          callId,
          toUserId: peerUserId,
          signal: {
            type: "ice-candidate",
            candidate,
          },
        });
      },
      onConnectionStateChange: (state) => {
        if (state === "connected") {
          setCallState((prev) => ({ ...prev, status: "active", message: "Secure peer connection established." }));
        } else if (state === "failed" || state === "disconnected" || state === "closed") {
          endCall({
            notifyPeer: state !== "closed",
            reason: "connection_lost",
            nextMessage: "Call disconnected.",
          });
        }
      },
    });

    peerConnectionRef.current = nextPeerConnection;
    setCallState((prev) => ({
      ...prev,
      mode,
      peerUserId,
      callId,
      status: "connecting",
      message: "Negotiating audio and video channels...",
    }));

    return nextPeerConnection;
  }, [endCall]);

  const ensureLocalMedia = useCallback(async (mode) => {
    const stream = await getCallMediaStream(mode);
    localStreamRef.current = stream;
    setLocalStream(stream);

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    setCallState((prev) => ({
      ...prev,
      isMuted: audioTracks.length ? !audioTracks[0].enabled : false,
      isCameraOff: mode === "video" ? !(videoTracks[0]?.enabled ?? true) : true,
    }));

    return stream;
  }, []);

  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;

    async function loadContacts() {
      setLoadingContacts(true);
      try {
        const [savedContacts, allUsers] = await Promise.all([fetchContacts(), fetchUsers()]);
        if (cancelled) return;
        const merged = mergeContacts(savedContacts, allUsers, userId);
        setContacts(merged);
        if (!activeChatUser && merged.length) {
          setActiveChatUser(merged[0]);
        }
      } catch {
        if (!cancelled) {
          setChatError("Unable to load contacts right now.");
        }
      } finally {
        if (!cancelled) {
          setLoadingContacts(false);
        }
      }
    }

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [activeChatUser, setActiveChatUser, token, userId]);

  useEffect(() => {
    if (!userId || !token) return;
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register");
      setIsConnected(true);
      setChatError("");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("private_message", (msg) => {
      const normalized = normalizeMessage(msg);
      const incomingId = String(normalized.fromUserId || normalized.toUserId || "");
      setMessages((prev) => [...prev, normalized]);
      setContacts((prev) =>
        prev.map((contact) => {
          const contactId = String(contact.id || contact._id);
          if (contactId !== incomingId && contactId !== String(normalized.toUserId || "")) {
            return contact;
          }

          return {
            ...contact,
            lastMessagePreview: normalized.message,
            lastMessageAt: normalized.timestamp,
            unreadCount:
              incomingId === activeChatId || String(normalized.fromUserId) === String(userId)
                ? 0
                : Number(contact.unreadCount || 0) + 1,
          };
        })
      );
    });

    socket.on("presence_update", ({ userId: presenceUserId, status }) => {
      setOnlineStatuses((prev) => ({ ...prev, [String(presenceUserId)]: status === "online" }));
    });

    socket.on("call_invite", async ({ callId, fromUserId, mode, fromUsername }) => {
      if (!callId || !fromUserId) return;

      if (callStateRef.current.status !== "idle") {
        socket.emit("call_decline", {
          callId,
          toUserId: fromUserId,
          reason: "busy",
        });
        return;
      }

      const caller = getContactById(fromUserId) || {
        id: fromUserId,
        _id: fromUserId,
        username: fromUsername || "Contact",
      };

      setCallState({
        status: "incoming",
        mode: mode === "video" ? "video" : "audio",
        callId: String(callId),
        peerUser: caller,
        peerUserId: String(fromUserId),
        initiator: false,
        isMuted: false,
        isCameraOff: mode !== "video",
        message: `${caller.username} wants to start a ${mode === "video" ? "video" : "voice"} call.`,
      });
    });

    socket.on("call_accept", async ({ callId, fromUserId, mode }) => {
      if (callStateRef.current.callId !== String(callId) || !callStateRef.current.initiator) return;

      try {
        const peer = await initializePeerConnection({
          mode: mode === "video" ? "video" : "audio",
          peerUserId: String(fromUserId),
          callId: String(callId),
        });
        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video",
        });
        await peer.setLocalDescription(offer);

        socket.emit("webrtc_signal", {
          callId,
          toUserId: fromUserId,
          signal: {
            type: "offer",
            sdp: offer,
          },
        });
      } catch {
        endCall({
          notifyPeer: true,
          reason: "setup_failed",
          nextMessage: "Unable to start the call.",
        });
      }
    });

    socket.on("call_decline", ({ callId, reason }) => {
      if (callStateRef.current.callId !== String(callId)) return;

      const message = reason === "busy" ? "Contact is already on another call." : "Call declined.";
      endCall({
        notifyPeer: false,
        nextMessage: message,
      });
    });

    socket.on("call_end", ({ callId, reason }) => {
      if (callStateRef.current.callId !== String(callId)) return;
      const message = reason === "declined" ? "Call declined." : "Call ended.";
      endCall({
        notifyPeer: false,
        nextMessage: message,
      });
    });

    socket.on("webrtc_signal", async ({ callId, fromUserId, signal }) => {
      if (callStateRef.current.callId !== String(callId) || !signal) return;

      try {
        if (!peerConnectionRef.current) {
          await initializePeerConnection({
            mode: callStateRef.current.mode,
            peerUserId: String(fromUserId),
            callId: String(callId),
          });
        }

        const peer = peerConnectionRef.current;
        if (!peer) return;

        if (signal.type === "offer" && signal.sdp) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("webrtc_signal", {
            callId,
            toUserId: fromUserId,
            signal: {
              type: "answer",
              sdp: answer,
            },
          });
        } else if (signal.type === "answer" && signal.sdp) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        endCall({
          notifyPeer: true,
          reason: "signaling_failed",
          nextMessage: "Call signaling failed.",
        });
      }
    });

    socket.connect();
    return () => {
      destroyCallResources();
      socket.disconnect();
    };
  }, [
    activeChatId,
    destroyCallResources,
    endCall,
    getContactById,
    initializePeerConnection,
    token,
    userId,
  ]);

  useEffect(() => {
    if (!activeChatUser || !userId) return;
    let ignore = false;

    fetchChatHistory(userId, activeChatUser.id || activeChatUser._id)
      .then((data) => {
        if (ignore) return;
        const nextMessages = (data.messages || []).map((m, i) => normalizeMessage(m, i));
        setMessages(nextMessages);
        setText(draftsRef.current[activeChatId] || "");
        setContacts((prev) =>
          prev.map((contact) => {
            const contactId = String(contact.id || contact._id);
            if (contactId !== activeChatId) return contact;
            return {
              ...contact,
              unreadCount: 0,
              lastMessagePreview:
                nextMessages[nextMessages.length - 1]?.message || contact.lastMessagePreview,
              lastMessageAt:
                nextMessages[nextMessages.length - 1]?.timestamp || contact.lastMessageAt,
            };
          })
        );
      })
      .catch(() => {
        if (!ignore) {
          setMessages([]);
          setChatError("Conversation history could not be loaded.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeChatId, activeChatUser, userId]);

  useEffect(() => {
    draftsRef.current[activeChatId] = text;
  }, [activeChatId, text]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => {
    destroyCallResources();
  }, [destroyCallResources]);

  const sendMessage = useCallback(() => {
    if (!text.trim() || !activeChatUser) return;
    const payload = {
      toUserId: activeChatUser.id || activeChatUser._id,
      message: text.trim().slice(0, 500),
      timestamp: Date.now(),
    };
    socketRef.current?.emit("private_message", payload);
    setMessages((prev) => [...prev, { ...payload, fromUserId: userId, self: true }]);
    setContacts((prev) =>
      prev.map((contact) => {
        const contactId = String(contact.id || contact._id);
        if (contactId !== activeChatId) return contact;
        return {
          ...contact,
          lastMessagePreview: payload.message,
          lastMessageAt: payload.timestamp,
          unreadCount: 0,
        };
      })
    );
    setText("");
    draftsRef.current[activeChatId] = "";
    inputRef.current?.focus();
  }, [activeChatId, activeChatUser, text, userId]);

  const handleApplyQuickReply = useCallback((reply) => {
    setText(reply);
    inputRef.current?.focus();
  }, []);

  const handleAddContact = useCallback(async () => {
    const identifier = window.prompt("Enter a username or email to add to your contacts.");
    if (!identifier) return;

    setAddContactBusy(true);
    setChatError("");
    try {
      const createdContact = await addContact(identifier.trim());
      if (!createdContact) return;

      setContacts((prev) => {
        const next = mergeContacts([createdContact], prev, userId);
        return next;
      });
      setActiveChatUser(createdContact);
    } catch (error) {
      setChatError(error.message || "Failed to add contact.");
    } finally {
      setAddContactBusy(false);
    }
  }, [setActiveChatUser, userId]);

  const startCall = useCallback(async (mode) => {
    if (!activeChatUser || callState.status !== "idle") return;

    const peerUserId = String(activeChatUser.id || activeChatUser._id || "");
    if (!peerUserId) return;

    try {
      setChatError("");
      await ensureLocalMedia(mode);
      const nextCallId = createCallId();
      setRemoteStream(null);
      remoteStreamRef.current = null;
      setCallState({
        status: "outgoing",
        mode,
        callId: nextCallId,
        peerUser: activeChatUser,
        peerUserId,
        initiator: true,
        isMuted: false,
        isCameraOff: mode !== "video",
        message: `Waiting for ${activeChatUser.username} to answer...`,
      });

      socketRef.current?.emit("call_invite", {
        callId: nextCallId,
        toUserId: peerUserId,
        mode,
        fromUsername: user?.username || user?.email || "User",
      });
    } catch (error) {
      destroyCallResources();
      resetCallUi();
      setChatError(error.message || `Unable to access your ${mode === "video" ? "camera" : "microphone"}.`);
    }
  }, [activeChatUser, callState.status, destroyCallResources, ensureLocalMedia, resetCallUi, user?.email, user?.username]);

  const acceptIncomingCall = useCallback(async () => {
    if (callState.status !== "incoming" || !callState.peerUserId) return;

    try {
      setChatError("");
      await ensureLocalMedia(callState.mode);
      await initializePeerConnection({
        mode: callState.mode,
        peerUserId: callState.peerUserId,
        callId: callState.callId,
      });

      setCallState((prev) => ({
        ...prev,
        status: "connecting",
        message: "Accepted. Finalizing secure connection...",
      }));

      socketRef.current?.emit("call_accept", {
        callId: callState.callId,
        toUserId: callState.peerUserId,
        mode: callState.mode,
      });
    } catch (error) {
      endCall({
        notifyPeer: true,
        reason: "setup_failed",
        nextMessage: error.message || "Unable to answer the call.",
      });
    }
  }, [callState.callId, callState.mode, callState.peerUserId, callState.status, endCall, ensureLocalMedia, initializePeerConnection]);

  const declineIncomingCall = useCallback(() => {
    if (callState.status === "incoming" && callState.peerUserId && callState.callId) {
      socketRef.current?.emit("call_decline", {
        callId: callState.callId,
        toUserId: callState.peerUserId,
        reason: "declined",
      });
    }
    destroyCallResources();
    resetCallUi();
  }, [callState.callId, callState.peerUserId, callState.status, destroyCallResources, resetCallUi]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks?.()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks?.()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setCallState((prev) => ({ ...prev, isCameraOff: !videoTrack.enabled }));
  }, []);

  const visibleContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const mapped = contacts
      .map((contact) => ({
        ...contact,
        unreadCount: Number(contact.unreadCount || 0),
        lastMessagePreview: contact.lastMessagePreview || contact.status || "Start a conversation",
      }))
      .sort((a, b) => Number(b.lastMessageAt || 0) - Number(a.lastMessageAt || 0));

    if (!normalizedQuery) return mapped;
    return mapped.filter((contact) =>
      [contact.username, contact.email, contact.lastMessagePreview]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [contacts, query]);

  const conversationMeta = useMemo(() => {
    const totalMessages = messages.length;
    const ownMessages = messages.filter((item) => item.self || String(item.fromUserId) === String(userId)).length;
    const responseLabel =
      totalMessages === 0
        ? "No replies yet"
        : ownMessages >= Math.ceil(totalMessages / 2)
          ? "You are driving this thread"
          : "Balanced back-and-forth";
    const insightTitle =
      totalMessages > 8 ? "Momentum is healthy" : "Conversation can use a nudge";
    const insightBody =
      totalMessages > 8
        ? "This thread already has enough context for quick decisions. Keep replies short and actionable."
        : "A short check-in or decision-oriented opener would make this conversation easier to restart.";

    return {
      totalMessages,
      moodLabel: deriveMoodLabel(messages),
      responseLabel,
      insightTitle,
      insightBody,
    };
  }, [messages, userId]);

  const quickReplies = useMemo(
    () => buildQuickReplies(activeChatUser, messages),
    [activeChatUser, messages]
  );

  const draftLabel = activeChatId && draftsRef.current[activeChatId]
    ? "Draft saved for this conversation"
    : isConnected
      ? "Realtime connection active"
      : "Reconnecting to realtime service";

  return (
    <div className="chat-app">
      <div className="chat-backdrop" aria-hidden="true" />
      <div className="chat-container">
        <aside className="app-rail">
          <div className="rail-top">
            <div className="rail-top-logo">LU</div>
            <button className="rail-button active" type="button" title="Messages">
              <MessageCircle size={20} />
            </button>
            <button
              className="rail-button"
              type="button"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              {sidebarOpen ? <PanelLeftOpen size={20} /> : <PanelRightOpen size={20} />}
            </button>
          </div>
          <div className="rail-bottom">
            <button
              className="rail-button"
              type="button"
              title="Sign out"
              onClick={() => {
                clearSession();
                window.location.href = "/login";
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </aside>

        <div className={`contact-list-sidebar ${sidebarOpen ? "is-open" : "is-collapsed"}`}>
          <ContactList
            onSelect={(contact) => {
              setActiveChatUser(contact);
              setSidebarOpen(false);
            }}
            activeChatUser={activeChatUser}
            contacts={visibleContacts}
            onlineStatuses={onlineStatuses}
            query={query}
            onQueryChange={setQuery}
            onAddContact={handleAddContact}
            addContactBusy={addContactBusy}
          />
        </div>

        <div className="chat-main">
          <ChatHeader
            activeChatUser={activeChatUser}
            activeChatOnline={activeChatUser ? onlineStatuses[activeChatId] : false}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            onToggleSidebar={() => setSidebarOpen((value) => !value)}
            onToggleDetails={() => setDetailsOpen((value) => !value)}
            onOpenSettings={() => {
              window.location.href = "/settings";
            }}
            statusLabel={activeChatUser?.status}
            onStartAudioCall={() => startCall("audio")}
            onStartVideoCall={() => startCall("video")}
          />

          <div className="chat-banner-row">
            <div className={`connection-pill ${isConnected ? "connected" : ""}`}>
              <span className="connection-dot" />
              {isConnected ? "Realtime synced" : "Connecting..."}
            </div>
            {loadingContacts ? <span className="chat-helper-copy">Loading contacts...</span> : null}
            {chatError ? <span className="chat-helper-copy chat-helper-copy--error">{chatError}</span> : null}
          </div>

          <MessageTimeline
            messages={messages}
            isOwnMessage={(m) => m.self || String(m.fromUserId) === String(userId)}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            toTime={toTime}
            messagesEndRef={messagesEndRef}
            emptyTitle={activeChatUser ? `No messages with ${activeChatUser.username} yet` : "No conversation selected"}
            emptyDescription={
              activeChatUser
                ? "Start with a quick update, ask a direct question, or use one of the suggested replies below."
                : "Pick a contact from the left to open a thread."
            }
          />

          <MessageComposer
            text={text}
            setText={setText}
            sendMessage={sendMessage}
            inputRef={inputRef}
            draftLabel={draftLabel}
            quickReplies={activeChatUser ? quickReplies : []}
            onApplyQuickReply={handleApplyQuickReply}
          />
        </div>

        <div className={`assistant-panel ${detailsOpen ? "is-open" : "is-collapsed"}`}>
          <AssistantRail
            activeChatUser={activeChatUser}
            conversationMeta={conversationMeta}
            lastActiveLabel={timeAgo(messages[messages.length - 1]?.timestamp)}
          />
        </div>
      </div>

      <CallPanel
        callState={callState}
        activeUser={activeChatUser}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptIncomingCall}
        onDecline={declineIncomingCall}
        onEnd={() => endCall({ notifyPeer: true, reason: "ended", nextMessage: "Call ended." })}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
    </div>
  );
}
