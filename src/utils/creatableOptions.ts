/** Merge preset suggestions with values already used in the app (unique, sorted). */
export function mergeOptions(presets: string[], ...extraLists: string[][]) {
  const set = new Set<string>();
  for (const list of [presets, ...extraLists]) {
    for (const item of list) {
      const t = item?.trim();
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
