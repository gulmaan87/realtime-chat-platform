export default function PollMessage({ message, onVote }) {
  const options = message?.poll?.options || [];

  return (
    <div className="interactive-card">
      <strong>{message?.poll?.question || message?.message}</strong>
      <div className="interactive-options">
        {options.map((option) => (
          <button key={option.id} className="poll-option" onClick={() => onVote(message.localId, option.id)}>
            {option.label} ({Array.isArray(option.votes) ? option.votes.length : 0})
          </button>
        ))}
      </div>
    </div>
  );
}
