export function snakeSlotForPick(args: {
  pickNumber: number; // 1-based
  teamCount: number;
}): { round: number; slot: number } {
  const { pickNumber, teamCount } = args;
  const round = Math.floor((pickNumber - 1) / teamCount) + 1;
  const posInRound = (pickNumber - 1) % teamCount; // 0..teamCount-1
  const isReverse = round % 2 === 0;
  const slot = isReverse ? (teamCount - posInRound) : (posInRound + 1);
  return { round, slot };
}

export function totalPicks(teamCount: number, rounds: number) {
  return teamCount * rounds;
}
