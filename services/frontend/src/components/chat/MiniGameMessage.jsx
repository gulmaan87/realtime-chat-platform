import { Gamepad2, Trophy } from "lucide-react";

export default function MiniGameMessage({ message, currentUserId, onAttempt }) {
  const game = message?.miniGame;
  const choices = game?.choices || [];
  const attempts = game?.attempts || {};
  const hasPlayed = Boolean(attempts[String(currentUserId)]);
  const winnerId = game?.winnerId ? String(game.winnerId) : "";
  const currentUserWon = winnerId && winnerId === String(currentUserId);
  const isResolved = Boolean(game?.winnerId);
  const attemptsCount = Object.keys(attempts).length;

  return (
    <div className="interactive-card interactive-card--game">
      <div className="interactive-card__header">
        <div className="interactive-card__badge">
          <Gamepad2 size={14} />
          <span>Mini game</span>
        </div>
        {isResolved ? (
          <div className="interactive-card__badge interactive-card__badge--success">
            <Trophy size={14} />
            <span>{currentUserWon ? "You won" : "Resolved"}</span>
          </div>
        ) : null}
      </div>

      <strong>{message?.message || "Guess the number"}</strong>
      <p>{game?.prompt || "Choose one"}</p>

      {isResolved ? (
        <div className="interactive-result-card">
          <strong>{currentUserWon ? "You guessed closest." : "Game completed."}</strong>
          <p>Correct answer: {game?.answer}</p>
          <span>{attemptsCount} players joined</span>
        </div>
      ) : (
        <div className="interactive-options">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={`poll-option poll-option--rich ${
                attempts[String(currentUserId)] === choice ? "poll-option--selected" : ""
              }`}
              onClick={() => onAttempt(message.localId, choice)}
              disabled={hasPlayed}
            >
              <span>{choice}</span>
            </button>
          ))}
        </div>
      )}

      <div className="interactive-meta-row">
        <span>{attemptsCount} attempt{attemptsCount === 1 ? "" : "s"}</span>
        {hasPlayed && !isResolved ? <span>Your pick: {attempts[String(currentUserId)]}</span> : null}
      </div>
    </div>
  );
}
