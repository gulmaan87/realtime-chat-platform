# LevelUp Chat – Week 0 Codebase Audit & Stabilization Plan

## 1) Current architecture snapshot

### Frontend
- **Framework / runtime**: React 18 + Vite 7 (`services/frontend/package.json`).
- **Routing**: Manual path checks in `App.jsx` using `window.location.pathname` and redirects (no React Router).
- **State management**: Local component state + localStorage session helper (`services/frontend/src/services/session.js`).
- **Styling**: Global CSS files (`index.css`, `App.css`, page CSS).
- **Chat composition**:
  - Main chat shell + input + rendering are in one large component (`pages/Chat.jsx`).
  - Sidebar contacts in `components/ContactList.jsx`.
  - Settings/profile flow in `pages/Settings.jsx`.
- **Socket integration**:
  - Socket client created in `services/socket.js`.
  - Event listeners and emit calls live directly in `Chat.jsx`.

### Backend
- **Services**:
  - `auth-service`: user auth/profile/contacts
  - `socket-gateway`: realtime websocket ingress
  - `message-worker`: queue consumer to persist/cache messages
  - `api-service`: chat history retrieval from Redis
- **Framework versions**:
  - Auth service: Express 4
  - API service: Express 5
  - Socket gateway: Express 5 + Socket.IO 4
- **Persistence/cache**:
  - MongoDB for users/contacts
  - Redis for presence and chat history cache
  - RabbitMQ queue for async message persistence fanout

## 2) What is already strong and should be preserved (A)
1. **Microservice split is clear and portfolio-worthy** (auth, api, socket, worker separation).
2. **JWT-gated websocket handshake** is implemented in socket gateway middleware.
3. **Presence model** exists (`register`, `presence_update`, `presence_snapshot`) and already supports contact-based status hydration.
4. **Async message pipeline** (gateway -> RabbitMQ -> worker -> Redis) is in place and decouples realtime from persistence.
5. **Contact model has uniqueness index** to prevent duplicate relationships.
6. **Frontend already has optimistic message append + contact selection flow + empty states**.

## 3) Must refactor now in Week 0 (B)

### Frontend stabilization
1. **Replace manual routing with robust client router (or hardened lightweight router layer)**
   - Current navigation depends on `window.location` side effects and redirects.
2. **Split `Chat.jsx` into bounded components/hooks**
   - Message list, composer, chat header, right-side details, and socket lifecycle are tightly coupled.
3. **Socket listener reliability improvements**
   - Add message ACK callbacks and de-duplication IDs to avoid duplicates with optimistic UI.
4. **Loading/error/connection UX polish**
   - Chat history load has only console errors; add visible retry/error components.
5. **Responsive + layout consistency pass**
   - Ensure rail/sidebar/details collapse patterns on tablet/mobile and improve sticky/input behavior.

### Backend stabilization
1. **Unify auth middleware strategy in auth-service**
   - Two middleware implementations currently coexist.
2. **Remove hard-coded production credentials/URLs fallback in config defaults**
   - Mongo/Redis fallback values currently include real hosted endpoints.
3. **Add message ack strategy on socket send path**
   - `private_message` currently emits without ACK/retry semantics.
4. **Harden queue consumer failure behavior**
   - Worker currently does not `nack`; failed messages can remain unacked indefinitely.
5. **Pagination + metadata on chat history endpoint**
   - History currently fixed to latest 100 Redis items, no cursor/page contract.

## 4) Defer to later weeks (C)
- AI summarizer/assistant/tone/scam detection.
- Reactions animation/sound and secret-mode puzzle unlock.
- XP/streaks/polls/minigames.
- Threads/versioning/scheduling/semantic search.
- Voice transcription and whiteboard collaboration.

## 5) Architectural constraints (D)
1. **No message DB model yet**: chat history currently Redis-only cache semantics, not durable long-term datastore model.
2. **Inconsistent Express major versions** across services can cause middleware behavior drift.
3. **Frontend lacks typed contracts** for payloads/events; brittle integration risk.
4. **Monolithic Chat page** slows safe iteration speed for feature layering.
5. **No formal API versioning**; changes must be backward-compatible with deployed clients.

## 6) Recommended migration strategy (E)

### Phase 0.1 – Safe reliability scaffolding
- Introduce shared event constants and message envelope (`messageId`, `clientMessageId`, `serverTimestamp`, `status`).
- Add ACK-based `private_message` response from gateway.
- Add frontend optimistic reconciliation by `clientMessageId`.

### Phase 0.2 – UI/UX polish without behavior change
- Break chat layout into composable presentational components.
- Add connection badge, skeleton loading, retry CTA, and improved empty states.
- Fix responsive breakpoints and input/footer sticky behavior.

### Phase 0.3 – Backend hardening
- Consolidate auth middleware in auth-service.
- Add request validation guards for send/history endpoints.
- Add indexed message persistence model (Mongo `Message` collection) while keeping Redis hot-cache.

### Phase 0.4 – Compatibility and rollout safety
- Keep existing routes/events; add new fields non-breaking.
- Gate new behavior behind feature flags/env toggles.
- Add smoke tests for login -> contact load -> message send -> history fetch.

## 7) Risk levels by change (F)
| Change | Risk | Why | Rollback |
|---|---|---|---|
| UI layout polish + component split | Low | Mostly presentational + internal structure | Revert component refactor commit only |
| Socket ACK + dedupe IDs | Medium | Touches client+gateway contract | Keep accepting legacy payloads and fallback emit path |
| Auth middleware consolidation | Medium | Auth breakage is high blast radius | Keep old middleware export during transition |
| Add Mongo message model + dual write | Medium/High | Data shape + consistency migration | Feature flag dual-write off and continue Redis-only |
| Pagination contract for history API | Medium | Frontend and API coupling | Maintain old `GET /api/chats/:roomId` default behavior |

## 8) Real-time audit checklist status
- **Events currently used**: `register`, `request_presence`, `presence_snapshot`, `presence_update`, `private_message`, `send_message`, `disconnect`.
- **Missing ACK flow**: no delivery ACK callback for `private_message`.
- **Potential duplicate risks**: optimistic local append + server echo handling not reconciled by IDs.
- **Reconnect behavior**: reconnect exists via socket.io defaults, but listener and pending-message reconciliation is basic.
- **Typing/read receipts**: not implemented.
- **Ordering guarantee**: client renders append order; no server-sequenced cursor/version.

## 9) Data-model readiness audit
Current models support:
- Users, contacts.

Missing for roadmap:
- Reactions
- Threads
- Secret mode metadata
- AI metadata (summaries, safety tags, intent tags)
- XP/streak/friendship stats
- Scheduled messages/reminders
- Voice note metadata/transcripts/emotion tags
- Whiteboard sessions
- Search metadata + semantic embeddings
- Offline reconciliation metadata

## 10) Week 0 implementation target file map (next execution sprint)

### Frontend
- `services/frontend/src/App.jsx`
- `services/frontend/src/pages/Chat.jsx`
- `services/frontend/src/components/ContactList.jsx`
- `services/frontend/src/services/socket.js`
- `services/frontend/src/services/api.js`
- `services/frontend/src/App.css`
- `services/frontend/src/index.css`

### Backend
- `services/socket-gateway/src/socket/connection.js`
- `services/socket-gateway/src/server.js`
- `services/api-service/src/controllers/chat.controller.js`
- `services/api-service/src/routes/chat.routes.js`
- `services/auth-service/src/middleware/auth.middleware.js`
- `services/auth-service/src/middleware/auth.js`
- `services/message-worker/src/queue/consumer.js`

## 11) Week 0 acceptance criteria
- Existing core chat still functional.
- Mobile/tablet/desktop layouts stable.
- Presence and realtime message flows resilient to reconnect.
- Chat history endpoint supports safe pagination path.
- No regressions in login, contact listing, messaging, and profile settings.
