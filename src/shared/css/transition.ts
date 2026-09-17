// src/shared/css/transition.ts

/** Duration of the native cross-fade (View Transitions API) when switching themes. */
export function generateThemeTransitionCSS(): string {
  return `\n/* ============================================ */\n`
    + `/* Theme transition                              */\n`
    + `/* ============================================ */\n\n`
    + `::view-transition-old(root),\n`
    + `::view-transition-new(root) {\n`
    + `  animation-duration: 0.3s;\n`
    + `}\n\n`
    // Without this, the transition's overlay layer (which covers the whole
    // screen while animating) intercepts pointer hit-testing — the custom
    // cursor (and hover on elements underneath) "freezes" at the OS default
    // cursor until the mouse moves again. `pointer-events: none` lets
    // hit-testing pass straight through to the real content underneath, as
    // if the overlay didn't exist. Applied at every level of the
    // pseudo-element tree (not just the root) with `!important`, so it
    // doesn't depend on inheritance working the same way across browsers in
    // this special tree.
    + `::view-transition,\n`
    + `::view-transition-group(*),\n`
    + `::view-transition-image-pair(*),\n`
    + `::view-transition-old(*),\n`
    + `::view-transition-new(*) {\n`
    + `  pointer-events: none !important;\n`
    + `}\n`
}
