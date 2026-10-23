// runtime/plugins/overlay-scrollbars.client.ts
//
// The browser draws its own scrollbars outside the page and ignores CSS
// `cursor`, so hovering one shows the system cursor instead of the custom
// one. OverlayScrollbars draws them as page elements instead, which the
// custom cursor applies to (see shared/css/cursor.ts). Styled by
// shared/css/scrollbar.ts (`os-theme-jade`).
import { defineNuxtPlugin } from '#app'
import { OverlayScrollbars, ClickScrollPlugin } from 'overlayscrollbars'
import type { PartialOptions } from 'overlayscrollbars'
import { OVERLAY_SCROLLBAR_THEME, SCROLL_CONTAINER_ATTRIBUTE, SCROLLBAR_ATTRIBUTE } from '../../shared/constants'

// The elements that actually scroll in Vuetify's components (checked against
// vuetify 4.2.4), plus the project's own, marked with `data-venix-scroll`.
const CONTAINERS = [
  '.v-navigation-drawer__content',
  '.v-dialog--scrollable .v-card-text',
  '.v-select__content .v-list',
  '.v-table__wrapper',
  `[${SCROLL_CONTAINER_ATTRIBUTE}]`,
].join(', ')

const OPTIONS: PartialOptions = {
  scrollbars: { theme: OVERLAY_SCROLLBAR_THEME, autoHide: 'never', clickScroll: true },
}

/** Vuetify's class on the scroll containers behind an open dialog (its `block` scroll strategy). */
const SCROLL_BLOCKED_CLASS = 'v-overlay-scroll-blocked'

const isOn = () => document.documentElement.getAttribute(SCROLLBAR_ATTRIBUTE) !== 'off'

// Vuetify locks the page and containers behind a dialog with that class,
// whose `overflow: hidden` loses to OverlayScrollbars' own CSS on the
// elements it manages. Locks those through OverlayScrollbars meanwhile.
function followScrollBlock(instance: OverlayScrollbars, el: HTMLElement) {
  let previous: PartialOptions['overflow'] | undefined
  const sync = () => {
    const blocked = el.classList.contains(SCROLL_BLOCKED_CLASS)
    if (blocked && !previous) {
      previous = { ...instance.options().overflow }
      instance.options({ overflow: { x: 'hidden', y: 'hidden' } })
    }
    else if (!blocked && previous) {
      instance.options({ overflow: previous })
      previous = undefined
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(el, { attributes: true, attributeFilter: ['class'] })
  instance.on('destroyed', () => observer.disconnect())
}

// The page itself. OverlayScrollbars keeps `window.scrollTo` & co. working,
// and turns `<html>` into the element that scrolls.
function initPage() {
  if (OverlayScrollbars(document.body)) return
  const instance = OverlayScrollbars(document.body, OPTIONS)
  followScrollBlock(instance, document.documentElement)
}

// Init in "viewport mode": the existing element is target AND viewport, so
// OverlayScrollbars doesn't move children owned by Vue (or Vuetify) into
// wrappers of its own.
//
// The scrollbars go in the parent (`slot`), not in the viewport: inside the
// viewport they'd scroll away with the content and only be moved back by JS
// on the next frame, so they visibly jump while scrolling.
function initContainer(el: HTMLElement) {
  const slot = el.parentElement
  if (OverlayScrollbars(el) || !slot) return
  if (getComputedStyle(slot).position === 'static') slot.style.position = 'relative'

  const instance = OverlayScrollbars({ target: el, elements: { viewport: el }, scrollbars: { slot } }, OPTIONS)
  alignScrollbars(instance, el, slot)
  followScrollBlock(instance, el)
}

// In the parent, the scrollbars would span the parent's whole box (e.g. a
// v-card's title too); clamp them to the viewport's box instead.
function alignScrollbars(instance: OverlayScrollbars, el: HTMLElement, slot: HTMLElement) {
  const { scrollbarVertical, scrollbarHorizontal } = instance.elements()
  // OverlayScrollbars transitions top/right/bottom/left; keep only the fades
  // so the bars don't visibly slide into place on mount
  for (const { scrollbar } of [scrollbarVertical, scrollbarHorizontal]) {
    scrollbar.style.transition = 'opacity 0.15s, visibility 0.15s'
  }

  const align = () => {
    const top = el.offsetTop
    const left = el.offsetLeft
    const bottom = slot.clientHeight - top - el.offsetHeight
    const right = slot.clientWidth - left - el.offsetWidth
    Object.assign(scrollbarVertical.scrollbar.style, { top: `${top}px`, bottom: `${bottom}px`, right: `${right}px` })
    Object.assign(scrollbarHorizontal.scrollbar.style, { left: `${left}px`, right: `${right}px`, bottom: `${bottom}px` })
  }
  align()

  const observer = new ResizeObserver(align)
  observer.observe(el)
  observer.observe(slot)
  instance.on('destroyed', () => observer.disconnect())
}

function containersIn(root: Element): HTMLElement[] {
  const found = [...root.querySelectorAll<HTMLElement>(CONTAINERS)]
  return root.matches(CONTAINERS) ? [root as HTMLElement, ...found] : found
}

function initAll() {
  initPage()
  containersIn(document.body).forEach(initContainer)
}

function destroyAll() {
  containersIn(document.body).forEach(el => OverlayScrollbars(el)?.destroy())
  OverlayScrollbars(document.body)?.destroy()
}

export default defineNuxtPlugin((nuxtApp) => {
  OverlayScrollbars.plugin(ClickScrollPlugin)

  // After hydration: OverlayScrollbars adds elements to the page, which
  // would otherwise not match the server-rendered HTML.
  nuxtApp.hook('app:mounted', () => {
    if (isOn()) initAll()

    // Containers that come and go (dialogs, menus, pages)
    new MutationObserver((mutations) => {
      if (!isOn()) return
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => node instanceof Element && containersIn(node).forEach(initContainer))
        mutation.removedNodes.forEach(node => node instanceof Element && containersIn(node).forEach(el => OverlayScrollbars(el)?.destroy()))
      }
    }).observe(document.body, { childList: true, subtree: true })

    // The visitor turning the custom scrollbar off and on (`scrollbar.set()`)
    new MutationObserver(() => (isOn() ? initAll() : destroyAll()))
      .observe(document.documentElement, { attributes: true, attributeFilter: [SCROLLBAR_ATTRIBUTE] })
  })
})
