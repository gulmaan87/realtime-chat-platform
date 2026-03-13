export default function MiniGameMessage({ message, onAttempt }) {
  const game = message?.miniGame;
  const choices = game?.choices || [];

  return (
    <div className="interactive-card">
      <strong>{message?.message || "Rock Paper Scissors"}</strong>
      <p>{game?.prompt || "Choose one"}</p>
      <div className="interactive-options">
        {choices.map((choice) => (
          <button key={choice} className="poll-option" onClick={() => onAttempt(message.localId, choice)}>
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
