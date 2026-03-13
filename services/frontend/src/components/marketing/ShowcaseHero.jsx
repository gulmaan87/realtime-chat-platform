import "./ShowcaseHero.css";

function FloatingCard({ className, eyebrow, title, children }) {
  return (
    <article className={`showcase-floating-card ${className || ""}`.trim()}>
      <p className="showcase-floating-card__eyebrow">{eyebrow}</p>
      <h4>{title}</h4>
      <div className="showcase-floating-card__body">{children}</div>
    </article>
  );
}

export default function ShowcaseHero() {
  return (
    <section className="showcase-hero">
      <div className="showcase-hero__ambient" aria-hidden="true" />
      <div className="showcase-hero__content">
        <div className="showcase-hero__copy">
          <p className="showcase-hero__eyebrow">Premium social messaging showcase</p>
          <h1>LevelUp Chat feels like a game, an assistant, and a messenger in one place.</h1>
          <p className="showcase-hero__lede">
            The composition below is a separate marketing preview. The real app remains a
            clean product experience inside the actual chat route.
          </p>
          <div className="showcase-hero__actions">
            <a href="/login" className="showcase-hero__cta showcase-hero__cta--primary">
              Open app
            </a>
            <a href="/signup" className="showcase-hero__cta showcase-hero__cta--secondary">
              Create account
            </a>
          </div>
        </div>

        <div className="showcase-stage">
          <div className="showcase-stage__desktop">
            <div className="showcase-stage__desktop-frame">
              <div className="showcase-stage__desktop-topbar">
                <span />
                <span />
                <span />
              </div>

              <div className="desktop-preview">
                <aside className="desktop-preview__sidebar">
                  <div className="desktop-preview__brand">
                    <div className="desktop-preview__logo">L</div>
                    <div>
                      <strong>LevelUp Chat</strong>
                      <span>Realtime social chat</span>
                    </div>
                  </div>

                  <div className="desktop-preview__sidebar-label">Messages</div>

                  <div className="desktop-preview__threads">
                    <div className="desktop-preview__thread desktop-preview__thread--active">
                      <div className="thread-avatar thread-avatar--violet">AN</div>
                      <div>
                        <strong>Annie Case</strong>
                        <span>Unlocked secret note</span>
                      </div>
                      <small>2</small>
                    </div>
                    <div className="desktop-preview__thread">
                      <div className="thread-avatar thread-avatar--cyan">JS</div>
                      <div>
                        <strong>Jordan</strong>
                        <span>Voice note ready</span>
                      </div>
                    </div>
                    <div className="desktop-preview__thread">
                      <div className="thread-avatar thread-avatar--pink">MK</div>
                      <div>
                        <strong>Mika</strong>
                        <span>Poll response pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="desktop-preview__level-card">
                    <span>Level 12</span>
                    <div className="desktop-preview__level-bar">
                      <i />
                    </div>
                    <small>1,280 XP · 82% to next</small>
                  </div>
                </aside>

                <main className="desktop-preview__conversation">
                  <header className="desktop-preview__header">
                    <div className="thread-avatar thread-avatar--violet">AN</div>
                    <div>
                      <strong>Annie Case</strong>
                      <span>online · upbeat tone</span>
                    </div>
                  </header>

                  <div className="desktop-preview__messages">
                    <div className="desktop-message desktop-message--received">
                      We should turn this trip plan into a challenge for the group.
                    </div>
                    <div className="desktop-message desktop-message--sent">
                      I can set up the mini game and keep our streak alive.
                    </div>
                    <div className="desktop-message desktop-message--secret">
                      <span>Secret unlock</span>
                      Hidden meetup code available once.
                    </div>
                    <div className="desktop-message desktop-message--voice">
                      <span>Voice note</span>
                      0:18 playback preview
                    </div>
                    <div className="desktop-preview__chip-row">
                      <span>Follow up</span>
                      <span>Friendly rewrite</span>
                      <span>Save summary</span>
                    </div>
                    <div className="desktop-preview__typing">Annie is typing...</div>
                  </div>

                  <div className="desktop-preview__composer">
                    <span>Type a message or /command</span>
                    <button type="button">Send</button>
                  </div>
                </main>

                <aside className="desktop-preview__assistant">
                  <div className="desktop-preview__assistant-card">
                    <small>Unread summary</small>
                    <strong>Trip planning now includes a challenge, a speaker, and a secret meetup clue.</strong>
                  </div>
                  <div className="desktop-preview__assistant-card">
                    <small>Tone converter</small>
                    <strong>"Come fast." to "Come through when you can, I have a surprise."</strong>
                  </div>
                  <div className="desktop-preview__assistant-search">
                    <span>Semantic search</span>
                    <div>Find "voice note" or "speaker"</div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="showcase-stage__phone">
              <div className="phone-preview">
                <div className="phone-preview__frame-top">
                  <div className="phone-preview__speaker" />
                </div>
                <div className="phone-preview__header">
                  <strong>Annie</strong>
                  <span>Online now</span>
                </div>
                <div className="phone-preview__messages">
                  <div className="phone-message phone-message--received">Unlocked it.</div>
                  <div className="phone-message phone-message--sent">Sending the clue now.</div>
                  <div className="phone-message phone-message--secret">Secret card</div>
                  <div className="phone-message phone-message--voice">Voice 0:08</div>
                  <div className="phone-preview__summary">Summary: trip plan and challenge ready.</div>
                </div>
                <div className="phone-preview__composer">Reply...</div>
              </div>
            </div>

            <div className="showcase-stage__floaters" aria-hidden="true">
              <FloatingCard
                className="showcase-floating-card--xp"
                eyebrow="XP / gamification"
                title="Level 12 unlocked"
              >
                <div className="xp-mini">
                  <div className="xp-mini__avatar">AN</div>
                  <div className="xp-mini__meta">
                    <strong>1,280 XP</strong>
                    <div className="xp-mini__bar">
                      <i />
                    </div>
                    <small>82% progress</small>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                className="showcase-floating-card--streak"
                eyebrow="Friendship streak"
                title="7 day streak active"
              >
                <p>Tonight's mini game keeps the streak alive and unlocks bonus closeness.</p>
              </FloatingCard>

              <FloatingCard
                className="showcase-floating-card--tone"
                eyebrow="AI tone"
                title="Rewrite ready"
              >
                <p>Original: "Come fast."</p>
                <p>Rewrite: "Come through when you can, I have a surprise."</p>
              </FloatingCard>

              <FloatingCard
                className="showcase-floating-card--summary"
                eyebrow="Unread summary"
                title="2 action items"
              >
                <p>Pending question: who brings the speaker?</p>
              </FloatingCard>

              <FloatingCard
                className="showcase-floating-card--warning"
                eyebrow="Safety warning"
                title="Payment request flagged"
              >
                <p>External transfer request detected. Verify before sending money.</p>
              </FloatingCard>

              <FloatingCard
                className="showcase-floating-card--search"
                eyebrow="Utility"
                title="Secret pattern search"
              >
                <p>Search clue: north gate · midnight key</p>
              </FloatingCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
