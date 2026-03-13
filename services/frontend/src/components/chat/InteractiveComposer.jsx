import { useState } from "react";
import { Gamepad2, Sparkles } from "lucide-react";

export default function InteractiveComposer({
  onSendPoll,
  onSendMiniGame,
  disabled,
  triggerClassName = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("Yes\nNo");

  const handleSendPoll = () => {
    const options = optionsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);

    onSendPoll({ question: question.trim(), options });

    setQuestion("");
    setOptionsText("Yes\nNo");
    setExpanded(false);
  };

  const handleSendMiniGame = () => {
    onSendMiniGame();
    setExpanded(false);
  };

  return (
    <>
      <div className="interactive-composer-toggle">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          disabled={disabled}
          className={triggerClassName}
          type="button"
          title="Interactive tools"
          aria-label="Interactive tools"
        >
          <Sparkles size={14} />
        </button>
      </div>

      {expanded ? (
        <div className="interactive-composer-panel">
          <div className="interactive-composer-panel__header">
            <div>
              <p className="interactive-composer-panel__eyebrow">Special message</p>
              <h4>Interactive messages</h4>
            </div>
            <div className="interactive-card__badge">
              <Gamepad2 size={14} />
              <span>Live</span>
            </div>
          </div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            disabled={disabled}
          />
          <textarea
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="One option per line"
            rows={3}
            disabled={disabled}
          />
          <div className="interactive-actions">
            <button onClick={handleSendPoll} disabled={disabled}>
              Send Poll
            </button>
            <button onClick={handleSendMiniGame} disabled={disabled}>
              Send Mini Game
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
