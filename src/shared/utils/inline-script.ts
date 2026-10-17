/**
 * JSON is valid JS, but inside an inline `<script>` a `</script>` anywhere in
 * the data (e.g. in a theme translation) would end the element early and
 * break the page. `<` is the same character to the JS parser.
 */
export function toInlineScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
