export function roundRobinSchedule(userIds: string[]) {
  // Classic circle method. Returns weeks of pairings.
  const ids = userIds.slice();
  const isOdd = ids.length % 2 === 1;
  if (isOdd) ids.push("BYE");

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  const weeks: Array<Array<{ home: string; away: string }>> = [];
  let arr = ids.slice();

  for (let r = 0; r < rounds; r++) {
    const pairs: Array<{ home: string; away: string }> = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        // alternate home/away to avoid bias
        const even = r % 2 === 0;
        pairs.push({ home: even ? a : b, away: even ? b : a });
      }
    }
    weeks.push(pairs);

    // rotate all but first
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  return weeks;
}
