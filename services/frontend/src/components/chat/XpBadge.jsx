import { Sparkles } from "lucide-react";

export default function XpBadge({ xpState, levelInfo }) {
  return (
    <p className="xp-badge">
      <Sparkles size={12} />
      <span>Lvl {levelInfo?.level || 1}</span>
      <span>XP {xpState?.xp || 0}</span>
    </p>
  );
}
