import { Flame, HeartHandshake, Star } from "lucide-react";
import {
  getFriendshipTier,
} from "../../services/gamificationSocialService";

export default function FriendshipPanel({ friendshipInsight }) {
  const streakDays = friendshipInsight?.streakDays || 0;
  const interactions = friendshipInsight?.interactions || 0;
  const closeness = Math.max(8, Math.min(100, streakDays * 8 + interactions * 2));
  const tier = getFriendshipTier(friendshipInsight);

  return (
    <div className="friendship-meter friendship-compact-row">
      <div className="friendship-meter__lead">
        <div className="friendship-meter__icon">
          <HeartHandshake size={14} />
        </div>
        <strong>{tier}</strong>
      </div>

      <div className="friendship-meter__stats">
        <div className="friendship-stat">
          <Flame size={12} />
          <span>{streakDays}d</span>
        </div>
        <div className="friendship-stat">
          <Star size={12} />
          <span>{interactions}</span>
        </div>
      </div>

      <div className="friendship-meter__progress" style={{ flex: 1 }}>
        <div className="friendship-meter__track">
          <div className="friendship-meter__fill" style={{ width: `${closeness}%` }} />
        </div>
      </div>
      
      <small className="friendship-percent">{closeness}%</small>
    </div>
  );
}
