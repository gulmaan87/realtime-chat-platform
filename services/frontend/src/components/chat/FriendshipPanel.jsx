export default function FriendshipPanel({ friendshipInsight }) {
  return (
    <div className="friendship-meter">
      <strong>Friendship streak</strong>
      <span>
        {friendshipInsight?.streakDays || 0} day streak · {friendshipInsight?.interactions || 0} interactions
      </span>
    </div>
  );
}
