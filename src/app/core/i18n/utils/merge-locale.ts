export function mergeLocale(
  ...parts: ReadonlyArray<Readonly<Record<string, string>>>
): Readonly<Record<string, string>> {
  return Object.assign({}, ...parts);
}
