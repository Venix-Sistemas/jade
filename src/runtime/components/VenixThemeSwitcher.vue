<template>
  <div
    ref="rootRef"
    class="venix-theme-switcher"
    @focusout="handleFocusOut"
  >
    <span
      class="venix-theme-switcher__sr-only"
      role="status"
      aria-live="polite"
    >{{ announcement }}</span>

    <button
      ref="triggerRef"
      type="button"
      class="venix-theme-switcher__trigger"
      :class="{ 'venix-theme-switcher__trigger--visible': visible }"
      :aria-label="resolvedLabel"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggleOpen"
    >
      <template v-if="activeIcon">
        <span
          v-if="activeIcon.format === 'emote'"
          :key="activeIconKey"
          class="venix-icon venix-icon--emoji"
          aria-hidden="true"
        >{{ activeIcon.value }}</span>
        <VenixIcon
          v-else
          :key="activeIconKey"
          :icon="activeIcon.value"
          :mode="activeIcon.format"
          aria-hidden="true"
        />
      </template>
      <span
        v-if="showLabel"
        class="venix-theme-switcher__trigger-label"
      >{{ triggerLabel }}</span>
    </button>

    <Transition name="venix-theme-switcher-menu">
      <div
        v-show="open"
        class="venix-theme-switcher__menu"
        role="menu"
        :aria-label="resolvedLabel"
        @keydown="handleMenuKeydown"
      >
        <div
          class="venix-theme-switcher__heading"
          aria-hidden="true"
        >
          {{ resolvedLabel }}
        </div>

        <div
          class="venix-theme-switcher__separator"
          role="separator"
        />

        <div
          class="venix-theme-switcher__group"
          role="group"
          :aria-label="modeHeading"
        >
          <div
            class="venix-theme-switcher__subheading"
            aria-hidden="true"
          >
            {{ modeHeading }}
          </div>
          <div class="venix-theme-switcher__modes">
            <button
              v-for="item in modes"
              :key="item.value"
              type="button"
              role="menuitemradio"
              class="venix-theme-switcher__item venix-theme-switcher__item--mode"
              :class="{ 'venix-theme-switcher__item--active': item.value === mode.preference.value }"
              :aria-checked="item.value === mode.preference.value"
              @click="selectMode(item.value)"
            >
              <span
                v-if="item.icon?.format === 'emote'"
                class="venix-icon venix-icon--emoji venix-theme-switcher__item-icon"
                aria-hidden="true"
              >{{ item.icon.value }}</span>
              <VenixIcon
                v-else-if="item.icon"
                class="venix-theme-switcher__item-icon"
                :icon="item.icon.value"
                :mode="item.icon.format"
                aria-hidden="true"
              />
              <span>{{ item.name }}</span>
            </button>
          </div>
        </div>

        <div
          class="venix-theme-switcher__separator"
          role="separator"
        />

        <div
          class="venix-theme-switcher__group"
          role="group"
          :aria-label="themeHeading"
        >
          <div
            class="venix-theme-switcher__subheading"
            aria-hidden="true"
          >
            {{ themeHeading }}
          </div>
          <button
            v-for="item in themes"
            :key="item.value"
            type="button"
            role="menuitemradio"
            class="venix-theme-switcher__item"
            :class="{ 'venix-theme-switcher__item--active': item.value === theme.preference.value }"
            :aria-checked="item.value === theme.preference.value"
            @click="selectTheme(item.value)"
          >
            <span
              v-if="item.icon?.format === 'emote'"
              class="venix-icon venix-icon--emoji venix-theme-switcher__item-icon"
              aria-hidden="true"
            >{{ item.icon.value }}</span>
            <VenixIcon
              v-else-if="item.icon"
              class="venix-theme-switcher__item-icon"
              :icon="item.icon.value"
              :mode="item.icon.format"
              aria-hidden="true"
            />
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useVenixTheme } from '../composables/useVenixTheme'
import { getDefaultSelection } from '../../shared/utils/theme-resolve'
import type { ThemeModePreference } from '../../shared/types'
// Imported directly (not auto-imported) so the switcher still works with
// `icon: false`: <VenixIcon> isn't registered then, and theme icons all
// resolve to emoji, which render as plain text above without needing it.
import VenixIcon from './VenixIcon.vue'

// The component's own strings (default label and screen-reader announcement)
// — translated into the same languages theme-name translations already
// support (see LOCALE_MAP in shared/constants.ts), via the module's own
// locale mechanism (`locale.translate`). An explicit `label` prop always
// takes priority.
const LABEL_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Tema de cor',
  'en-US': 'Color theme',
  'es-ES': 'Tema de color',
  'fr-FR': 'Thème de couleur',
  'de-DE': 'Farbthema',
  'it-IT': 'Tema colore',
  'ja-JP': 'カラーテーマ',
  'ko-KR': '색상 테마',
  'zh-CN': '颜色主题',
}

const CHANGED_ANNOUNCEMENT_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Tema de cor alterado para {theme}',
  'en-US': 'Color theme changed to {theme}',
  'es-ES': 'Tema de color cambiado a {theme}',
  'fr-FR': 'Thème de couleur changé pour {theme}',
  'de-DE': 'Farbthema geändert zu {theme}',
  'it-IT': 'Tema colore cambiato in {theme}',
  'ja-JP': 'カラーテーマが{theme}に変更されました',
  'ko-KR': '색상 테마가 {theme}(으)로 변경되었습니다',
  'zh-CN': '颜色主题已更改为{theme}',
}

const MODE_HEADING_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Modo',
  'en-US': 'Mode',
  'es-ES': 'Modo',
  'fr-FR': 'Mode',
  'de-DE': 'Modus',
  'it-IT': 'Modalità',
  'ja-JP': 'モード',
  'ko-KR': '모드',
  'zh-CN': '模式',
}

const THEME_HEADING_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Tema',
  'en-US': 'Theme',
  'es-ES': 'Tema',
  'fr-FR': 'Thème',
  'de-DE': 'Thema',
  'it-IT': 'Tema',
  'ja-JP': 'テーマ',
  'ko-KR': '테마',
  'zh-CN': '主题',
}

const MODE_CHANGED_ANNOUNCEMENT_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Modo alterado para {mode}',
  'en-US': 'Mode changed to {mode}',
  'es-ES': 'Modo cambiado a {mode}',
  'fr-FR': 'Mode changé pour {mode}',
  'de-DE': 'Modus geändert zu {mode}',
  'it-IT': 'Modalità cambiata in {mode}',
  'ja-JP': 'モードが{mode}に変更されました',
  'ko-KR': '모드가 {mode}(으)로 변경되었습니다',
  'zh-CN': '模式已更改为{mode}',
}

const props = defineProps<{
  /** Accessible label for the button and the menu. Without a value, uses the component's own translation based on the current locale. */
  label?: string
  /** Shows the active theme's and mode's names next to the icon on the button. */
  showLabel?: boolean
}>()

const { theme, themes, mode, modes, locale } = useVenixTheme()

const resolvedLabel = computed(() => props.label ?? locale.translate(LABEL_TRANSLATIONS, 'Color theme'))
const modeHeading = computed(() => locale.translate(MODE_HEADING_TRANSLATIONS, 'Mode'))
const themeHeading = computed(() => locale.translate(THEME_HEADING_TRANSLATIONS, 'Theme'))
const triggerLabel = computed(() => [theme.data.value?.name, mode.data.value?.name].filter(Boolean).join(' · '))

// The theme used outside any season (e.g. Venix Sistemas)
const baseTheme = getDefaultSelection(theme.colors).fallbackTheme

const open = ref(false)
const visible = ref(false)
const announcement = ref('')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

// The button shows what's in effect: a seasonal or explicitly chosen theme's
// own icon, or — on the base theme — the mode's (sun, moon, light/dark).
const activeIcon = computed(() => {
  const effectiveTheme = theme.preference.value === 'system'
    ? theme.activeSeasonalTheme.value
    : theme.preference.value

  if (!effectiveTheme || effectiveTheme === baseTheme) return mode.data.value?.icon ?? null
  return themes.value.find(item => item.value === effectiveTheme)?.icon ?? null
})
// Changes on every theme switch to force Vue to recreate <VenixIcon> (instead
// of just updating props), restarting the new theme's icon CSS/SVG animation.
const activeIconKey = computed(() => `${theme.value.value}:${activeIcon.value?.format ?? ''}:${activeIcon.value?.value ?? ''}`)

const getMenuItems = (): HTMLButtonElement[] => {
  return Array.from(rootRef.value?.querySelectorAll<HTMLButtonElement>('.venix-theme-switcher__item') ?? [])
}

const focusItemAt = (index: number) => {
  const items = getMenuItems()
  if (items.length === 0) return
  items[(index + items.length) % items.length]?.focus()
}

const toggleOpen = async () => {
  open.value = !open.value
  if (!open.value) return

  await nextTick()
  const items = getMenuItems()
  ;(items.find(el => el.getAttribute('aria-checked') === 'true') ?? items[0])?.focus()
}

const close = (options: { restoreFocus?: boolean } = {}) => {
  if (!open.value) return
  open.value = false
  if (options.restoreFocus) triggerRef.value?.focus()
}

const selectTheme = (value: string) => {
  const selected = themes.value.find(item => item.value === value)
  theme.set(value)

  const template = locale.translate(CHANGED_ANNOUNCEMENT_TRANSLATIONS, 'Color theme changed to {theme}')
  announcement.value = template.replace('{theme}', selected?.name ?? value)

  close({ restoreFocus: true })
}

// Keeps the menu open: picking the mode and then the theme (or vice versa)
// is the common flow.
const selectMode = (value: ThemeModePreference) => {
  const selected = modes.value.find(item => item.value === value)
  mode.set(value)

  const template = locale.translate(MODE_CHANGED_ANNOUNCEMENT_TRANSLATIONS, 'Mode changed to {mode}')
  announcement.value = template.replace('{mode}', selected?.name ?? value)
}

const handleMenuKeydown = (event: KeyboardEvent) => {
  const items = getMenuItems()
  const currentIndex = items.findIndex(el => el === document.activeElement)

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault()
      focusItemAt(currentIndex + 1)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault()
      focusItemAt(currentIndex - 1)
      break
    case 'Home':
      event.preventDefault()
      focusItemAt(0)
      break
    case 'End':
      event.preventDefault()
      focusItemAt(items.length - 1)
      break
  }
}

const handleFocusOut = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget as Node | null
  if (!nextTarget || !rootRef.value?.contains(nextTarget)) close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!rootRef.value?.contains(event.target as Node)) close()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close({ restoreFocus: true })
}

onMounted(() => {
  // Double rAF: makes sure the browser paints the initial state (opacity: 0)
  // before triggering the transition to opacity: 1.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      visible.value = true
    })
  })

  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
.venix-theme-switcher {
  position: relative;
  display: inline-block;
}

.venix-theme-switcher__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.venix-theme-switcher__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.3s ease, background-color 0.2s ease;
}

.venix-theme-switcher__trigger--visible {
  opacity: 1;
}

.venix-theme-switcher__trigger:hover,
.venix-theme-switcher__trigger:focus-visible {
  background: var(--color-background3, rgba(128, 128, 128, 0.15));
}

.venix-theme-switcher__trigger-label {
  font-size: 0.875rem;
}

.venix-theme-switcher__menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 50;
  min-width: 15rem;
  margin: 0;
  padding: 0.375rem;
  border-radius: 0.75rem;
  /* Fixed colors (not from the active theme): the menu needs to stay legible
     no matter which color theme is currently applied/being picked. */
  background: #1f2128;
  border: 1px solid #3a3d46;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transform-origin: top right;
}

/* Opening: grows from ~30% of its size, anchored at the button's corner (top
   right), fast at first and settling at the end — like Vuetify's menus.
   Closing: just fades out. */
.venix-theme-switcher-menu-enter-active {
  transition:
    transform 0.22s cubic-bezier(0, 0, 0.2, 1),
    opacity 0.12s ease-out;
}

.venix-theme-switcher-menu-leave-active {
  transition: opacity 0.2s ease-in;
}

.venix-theme-switcher-menu-enter-from {
  transform: scale(0.3);
  opacity: 0;
}

.venix-theme-switcher-menu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .venix-theme-switcher-menu-enter-active,
  .venix-theme-switcher-menu-leave-active {
    transition: none;
  }
}

.venix-theme-switcher__heading {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(245, 245, 247, 0.6);
  text-align: center;
}

.venix-theme-switcher__subheading {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(245, 245, 247, 0.45);
}

.venix-theme-switcher__modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
}

.venix-theme-switcher__separator {
  height: 1px;
  margin: 0.375rem 0.25rem;
  background: #3a3d46;
}

.venix-theme-switcher__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #f5f5f7;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.venix-theme-switcher__item--mode {
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  font-size: 0.75rem;
  text-align: center;
}

.venix-theme-switcher__item--mode .venix-theme-switcher__item-icon {
  font-size: 1.125rem;
}

.venix-theme-switcher__item:hover,
.venix-theme-switcher__item:focus-visible {
  background: rgba(255, 255, 255, 0.08);
}

.venix-theme-switcher__item--active {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-weight: 600;
}

.venix-theme-switcher__item-icon {
  flex-shrink: 0;
}
</style>
