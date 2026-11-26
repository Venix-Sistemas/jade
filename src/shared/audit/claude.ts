// src/shared/audit/claude.ts
// `venix-jade claude`: points a project's CLAUDE.md at the guide in the package.

export const CLAUDE_START = '<!-- jade:start -->'
export const CLAUDE_END = '<!-- jade:end -->'

/** The block that imports the guide: `@path` is how CLAUDE.md pulls a file in. */
export const CLAUDE_BLOCK = `${CLAUDE_START}
## Colors (Jade)

Follow @node_modules/@venix-sistemas/jade/AI.md. After changing any color, style or markup,
run \`npx venix-jade audit\` and fix every error before finishing.
${CLAUDE_END}`

/** CLAUDE.md with the block added, or brought up to date. What is outside it stays. */
export function withClaudeBlock(content: string): string {
  const start = content.indexOf(CLAUDE_START)
  const end = content.indexOf(CLAUDE_END)
  if (start >= 0 && end > start) return content.slice(0, start) + CLAUDE_BLOCK + content.slice(end + CLAUDE_END.length)
  const before = content.trimEnd()
  return `${before ? `${before}\n\n` : ''}${CLAUDE_BLOCK}\n`
}
