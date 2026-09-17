/**
 * Resolves a module option in `boolean | Partial<Config>` form against a base
 * config. `false` disables the feature, an object enables it and merges in
 * customizations, `true` forces the feature enabled (even if the base comes
 * disabled, e.g. `theme.customCursor.enabled: false`), and `undefined` leaves
 * the base config untouched.
 */
export function resolveFeatureOption<T extends { enabled: boolean }>(
  option: boolean | Partial<T> | undefined,
  base: T,
): T {
  if (option === false) {
    return { ...base, enabled: false }
  }

  if (option === true) {
    return { ...base, enabled: true }
  }

  if (typeof option === 'object' && option !== null) {
    return { ...base, ...option, enabled: option.enabled ?? true }
  }

  return base
}
