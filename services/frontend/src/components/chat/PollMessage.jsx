import { BarChart3, Trophy } from "lucide-react";

function getWinningOption(options) {
  if (!Array.isArray(options) || options.length === 0) return null;

  let winner = null;
  let maxVotes = -1;

  for (const option of options) {
    const count = Array.isArray(option.votes) ? option.votes.length : 0;
    if (count > maxVotes) {
      maxVotes = count;
      winner = option;
    }
  }

  return winner;
}

export default function PollMessage({ message, currentUserId, onVote }) {
  const poll = message?.poll;
  const options = poll?.options || [];
  const selectedOptionId = options.find((option) =>
    Array.isArray(option.votes) && option.votes.includes(String(currentUserId))
  )?.id;
  const totalVotes = options.reduce(
    (sum, option) => sum + (Array.isArray(option.votes) ? option.votes.length : 0),
    0
  );
  const winningOption = poll?.closed ? getWinningOption(options) : null;

  return (
    <div className="interactive-card interactive-card--poll">
      <div className="interactive-card__header">
        <div className="interactive-card__badge">
          <BarChart3 size={14} />
          <span>Poll</span>
        </div>
        {poll?.closed ? (
          <div className="interactive-card__badge interactive-card__badge--success">
            <Trophy size={14} />
            <span>Closed</span>
          </div>
        ) : null}
      </div>

      <strong>{poll?.question || message?.message}</strong>

      {poll?.closed && winningOption ? (
        <div className="interactive-result-card">
          <strong>Winner: {winningOption.label}</strong>
          <p>{Array.isArray(winningOption.votes) ? winningOption.votes.length : 0} votes</p>
          <span>{totalVotes} total votes</span>
        </div>
      ) : null}

      <div className="interactive-options interactive-options--stacked">
        {options.map((option) => {
          const votes = Array.isArray(option.votes) ? option.votes.length : 0;
          const isSelected = selectedOptionId === option.id;
          const isWinner = poll?.closed && winningOption?.id === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`poll-option poll-option--rich ${
                isSelected ? "poll-option--selected" : ""
              } ${isWinner ? "poll-option--winner" : ""}`}
              onClick={() => onVote(message.localId, option.id)}
              disabled={Boolean(poll?.closed)}
            >
              <span>{option.label}</span>
              <small>{votes} votes</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
