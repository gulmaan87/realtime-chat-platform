import { Flame, HeartHandshake, Star } from "lucide-react";
import {
  getFriendshipTier,
  getStreakNudge,
} from "../../services/gamificationSocialService";

export default function FriendshipPanel({ friendshipInsight, contactName }) {
  const streakDays = friendshipInsight?.streakDays || 0;
  const interactions = friendshipInsight?.interactions || 0;
  const closeness = Math.max(8, Math.min(100, streakDays * 8 + interactions * 2));
  const tier = getFriendshipTier(friendshipInsight);
  const nudge = getStreakNudge(friendshipInsight, contactName || "this contact");

  return (
    <div className="friendship-meter friendship-meter--expanded">
      <div className="friendship-meter__lead">
        <div className="friendship-meter__icon">
          <HeartHandshake size={16} />
        </div>
        <div>
          <strong>Friendship streak</strong>
          <span>{tier} connection. Keep the momentum going with one thoughtful reply.</span>
        </div>
      </div>

      <div className="friendship-meter__stats">
        <div className="friendship-stat">
          <Flame size={14} />
          <span>{streakDays} day streak</span>
        </div>
        <div className="friendship-stat">
          <Star size={14} />
          <span>{interactions} interactions</span>
        </div>
        <div className="friendship-stat friendship-stat--accent">
          <HeartHandshake size={14} />
          <span>{tier} tier</span>
        </div>
      </div>

      <div className="friendship-meter__progress">
        <div className="friendship-meter__progress-meta">
          <span>Closeness level</span>
          <span>{closeness}%</span>
        </div>
        <div className="friendship-meter__track">
          <div className="friendship-meter__fill" style={{ width: `${closeness}%` }} />
        </div>
      </div>

      <div className={`friendship-nudge friendship-nudge--${nudge.tone}`}>
        <strong>{nudge.title}</strong>
        <span>{nudge.description}</span>
        <small>{nudge.cta}</small>
      </div>
    </div>
  );
}
