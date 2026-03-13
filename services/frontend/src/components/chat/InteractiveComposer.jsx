import { useState } from "react";

export default function InteractiveComposer({ onSendPoll, onSendMiniGame, disabled }) {
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
        <button onClick={() => setExpanded((prev) => !prev)} disabled={disabled}>Interactive +</button>
      </div>

      {expanded ? (
        <div className="interactive-composer-panel">
          <h4>Interactive messages</h4>
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
            <button onClick={handleSendPoll} disabled={disabled}>Send Poll</button>
            <button onClick={handleSendMiniGame} disabled={disabled}>Send Mini Game</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
