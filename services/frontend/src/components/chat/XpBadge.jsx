export default function XpBadge({ xpState, levelInfo }) {
  return <p className="xp-badge">Lvl {levelInfo?.level || 1} · XP {xpState?.xp || 0}</p>;
}
