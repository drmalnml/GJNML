export function leagueWeek(startedAt: string | null | undefined, now = new Date()) {
  const start = startedAt ? new Date(startedAt) : now;
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}
