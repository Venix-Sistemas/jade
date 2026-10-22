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
        ref="menuRef"
        class="venix-theme-switcher__menu"
        role="menu"
        tabindex="-1"
        :aria-label="resolvedLabel"
        @keydown="handleMenuKeydown"
      >
        <div
          v-if="view === 'settings'"
          key="settings"
          class="venix-theme-switcher__view venix-theme-switcher__view--settings"
        >
          <div class="venix-theme-switcher__header">
            <button
              type="button"
              role="menuitem"
              class="venix-theme-switcher__icon-button"
              :aria-label="backLabel"
              :title="backLabel"
              @click="showView('main')"
            >
              <span
                v-if="icons.back?.format === 'emote'"
                class="venix-icon venix-icon--emoji"
                aria-hidden="true"
              >{{ icons.back.value }}</span>
              <VenixIcon
                v-else-if="icons.back"
                :icon="icons.back.value"
                :mode="icons.back.format"
                aria-hidden="true"
              />
            </button>
            <div
              class="venix-theme-switcher__heading"
              aria-hidden="true"
            >
              {{ settingsHeading }}
            </div>
          </div>

          <div
            class="venix-theme-switcher__separator"
            role="separator"
          />

          <div
            class="venix-theme-switcher__group"
            role="group"
            :aria-label="settingsHeading"
          >
            <button
              v-for="option in settingsOptions"
              :key="option.key"
              type="button"
              role="menuitemcheckbox"
              class="venix-theme-switcher__item venix-theme-switcher__item--toggle"
              :class="{ 'venix-theme-switcher__item--on': option.enabled }"
              :aria-checked="option.enabled"
              @click="option.toggle()"
            >
              <span
                v-if="option.icon?.format === 'emote'"
                class="venix-icon venix-icon--emoji venix-theme-switcher__item-icon"
                aria-hidden="true"
              >{{ option.icon.value }}</span>
              <VenixIcon
                v-else-if="option.icon"
                class="venix-theme-switcher__item-icon"
                :icon="option.icon.value"
                :mode="option.icon.format"
                aria-hidden="true"
              />
              <span class="venix-theme-switcher__item-text">
                <span class="venix-theme-switcher__item-title">{{ option.title }}</span>
                <span
                  v-if="option.description"
                  class="venix-theme-switcher__item-description"
                >{{ option.description }}</span>
              </span>
              <span
                class="venix-theme-switcher__switch"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div
          v-else
          key="main"
          class="venix-theme-switcher__view"
        >
          <div class="venix-theme-switcher__header">
            <div
              class="venix-theme-switcher__heading"
              aria-hidden="true"
            >
              {{ resolvedLabel }}
            </div>
            <button
              v-if="settingsOptions.length > 0"
              type="button"
              role="menuitem"
              class="venix-theme-switcher__icon-button"
              :aria-label="settingsHeading"
              :title="settingsHeading"
              @click="showView('settings')"
            >
              <span
                v-if="icons.settings?.format === 'emote'"
                class="venix-icon venix-icon--emoji"
                aria-hidden="true"
              >{{ icons.settings.value }}</span>
              <VenixIcon
                v-else-if="icons.settings"
                :icon="icons.settings.value"
                :mode="icons.settings.format"
                aria-hidden="true"
              />
            </button>
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

          <template
            v-for="section in themeSections"
            :key="section.key"
          >
            <div
              class="venix-theme-switcher__separator"
              role="separator"
            />

            <div
              class="venix-theme-switcher__group"
              role="group"
              :aria-label="section.heading"
            >
              <div
                class="venix-theme-switcher__subheading"
                aria-hidden="true"
              >
                {{ section.heading }}
              </div>
              <button
                v-for="item in section.items"
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
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRuntimeConfig } from '#app'
import { useVenixTheme } from '../composables/useVenixTheme'
import { getDefaultSelection } from '../../shared/utils/theme-resolve'
import { resolveThemeIcon } from '../../shared/utils/icon'
import type { ResolvedThemeIcon, ThemeIconFormat } from '../../shared/utils/icon'
import { SWITCHER_ICONS } from '../../shared/constants'
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
  'pt-BR': 'Cores do site',
  'en-US': 'Website color',
  'es-ES': 'Color del sitio',
  'fr-FR': 'Couleur du site',
  'de-DE': 'Website-Farbe',
  'it-IT': 'Colore del sito',
  'ja-JP': 'サイトの色',
  'ko-KR': '사이트 색상',
  'zh-CN': '网站颜色',
}

const CHANGED_ANNOUNCEMENT_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Cores do site alteradas para {theme}',
  'en-US': 'Website color changed to {theme}',
  'es-ES': 'Color del sitio cambiado a {theme}',
  'fr-FR': 'Couleur du site changée pour {theme}',
  'de-DE': 'Website-Farbe geändert zu {theme}',
  'it-IT': 'Colore del sito cambiato in {theme}',
  'ja-JP': 'サイトの色が{theme}に変更されました',
  'ko-KR': '사이트 색상이 {theme}(으)로 변경되었습니다',
  'zh-CN': '网站颜色已更改为{theme}',
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

const CUSTOM_HEADING_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Tema personalizado',
  'en-US': 'Custom theme',
  'es-ES': 'Tema personalizado',
  'fr-FR': 'Thème personnalisé',
  'de-DE': 'Eigenes Thema',
  'it-IT': 'Tema personalizzato',
  'ja-JP': 'カスタムテーマ',
  'ko-KR': '사용자 지정 테마',
  'zh-CN': '自定义主题',
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

const SETTINGS_HEADING_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Configurações',
  'en-US': 'Settings',
  'es-ES': 'Configuración',
  'fr-FR': 'Paramètres',
  'de-DE': 'Einstellungen',
  'it-IT': 'Impostazioni',
  'ja-JP': '設定',
  'ko-KR': '설정',
  'zh-CN': '设置',
}

const BACK_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Voltar',
  'en-US': 'Back',
  'es-ES': 'Volver',
  'fr-FR': 'Retour',
  'de-DE': 'Zurück',
  'it-IT': 'Indietro',
  'ja-JP': '戻る',
  'ko-KR': '뒤로',
  'zh-CN': '返回',
}

// The settings' titles are kept short: they never wrap (see
// `.venix-theme-switcher__item-title`).
const SAVE_TITLE_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Salvar alterações',
  'en-US': 'Save changes',
  'es-ES': 'Guardar cambios',
  'fr-FR': 'Enregistrer',
  'de-DE': 'Speichern',
  'it-IT': 'Salva modifiche',
  'ja-JP': '変更を保存',
  'ko-KR': '변경 사항 저장',
  'zh-CN': '保存更改',
}

const SAVE_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Lembrar suas escolhas ao voltar ao site (usa cookies)',
  'en-US': 'Remember your choices next time you visit (uses cookies)',
  'es-ES': 'Recordar tus elecciones la próxima vez (usa cookies)',
  'fr-FR': 'Retrouver vos choix à la prochaine visite (cookies)',
  'de-DE': 'Deine Auswahl beim nächsten Besuch behalten (Cookies)',
  'it-IT': 'Ricordare le tue scelte alla prossima visita (usa cookie)',
  'ja-JP': '次回のアクセス時も選択を保持します（Cookieを使用）',
  'ko-KR': '다음 방문 때도 선택을 유지합니다 (쿠키 사용)',
  'zh-CN': '下次访问时保留你的选择（使用 Cookie）',
}

const SCROLLBAR_TITLE_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Rolagem personalizada',
  'en-US': 'Custom scrollbar',
  'es-ES': 'Scroll personalizado',
  'fr-FR': 'Défilement stylisé',
  'de-DE': 'Eigene Scrollleiste',
  'it-IT': 'Scroll personalizzato',
  'ja-JP': 'カスタムスクロールバー',
  'ko-KR': '사용자 지정 스크롤바',
  'zh-CN': '自定义滚动条',
}

const CURSOR_TITLE_TRANSLATIONS: Record<string, string> = {
  'pt-BR': 'Cursor personalizado',
  'en-US': 'Custom cursor',
  'es-ES': 'Cursor personalizado',
  'fr-FR': 'Curseur stylisé',
  'de-DE': 'Eigener Mauszeiger',
  'it-IT': 'Cursore personalizzato',
  'ja-JP': 'カスタムカーソル',
  'ko-KR': '사용자 지정 커서',
  'zh-CN': '自定义光标',
}

const props = defineProps<{
  /** Accessible label for the button and the menu. Without a value, uses the component's own translation based on the current locale. */
  label?: string
  /** Shows the active theme's and mode's names next to the icon on the button. */
  showLabel?: boolean
  /** Hides "Save changes" in the settings, for a site whose own cookie banner already records consent. */
  hideConsent?: boolean
}>()

const { theme, themes, mode, modes, locale, persistence, scrollbar, cursor } = useVenixTheme()

const resolvedLabel = computed(() => props.label ?? locale.translate(LABEL_TRANSLATIONS, 'Website color'))
const modeHeading = computed(() => locale.translate(MODE_HEADING_TRANSLATIONS, 'Mode'))
const themeHeading = computed(() => locale.translate(THEME_HEADING_TRANSLATIONS, 'Theme'))
// Built-in themes (and "Automatic") first; the project's own themes, if
// any, below a divider under their own heading.
const themeSections = computed(() => [
  { key: 'built-in', heading: themeHeading.value, items: themes.value.filter(item => !item.custom) },
  { key: 'custom', heading: locale.translate(CUSTOM_HEADING_TRANSLATIONS, 'Custom theme'), items: themes.value.filter(item => item.custom) },
].filter(section => section.items.length > 0))
const triggerLabel = computed(() => [theme.data.value?.name, mode.data.value?.name].filter(Boolean).join(' · '))
const settingsHeading = computed(() => locale.translate(SETTINGS_HEADING_TRANSLATIONS, 'Settings'))
const backLabel = computed(() => locale.translate(BACK_TRANSLATIONS, 'Back'))

// The controls' own icons, in the format the themes' use.
const iconFormat = (useRuntimeConfig().public.venixTheme?.iconFormat ?? 'svg') as ThemeIconFormat
const icons = {
  settings: resolveThemeIcon(SWITCHER_ICONS.settings, iconFormat),
  back: resolveThemeIcon(SWITCHER_ICONS.back, iconFormat),
}

interface SettingsOption {
  key: string
  icon: ResolvedThemeIcon | null
  title: string
  description?: string
  enabled: boolean
  toggle: () => void
}

// Only what applies to this site: "Save changes" when changes need consent
// to be saved (`color.requireConsent`), and the scrollbar/cursor when the
// project has them on. With none, the gear isn't shown.
const settingsOptions = computed(() => {
  const options: SettingsOption[] = []

  if (persistence.required && !props.hideConsent) {
    options.push({
      key: 'save',
      icon: resolveThemeIcon(SWITCHER_ICONS.save, iconFormat),
      title: locale.translate(SAVE_TITLE_TRANSLATIONS, 'Save changes'),
      description: locale.translate(SAVE_DESCRIPTION_TRANSLATIONS, 'Remember your choices next time you visit (uses cookies)'),
      enabled: persistence.hasConsent.value,
      toggle: () => persistence.hasConsent.value ? persistence.revoke() : persistence.grant(),
    })
  }

  if (scrollbar.available) {
    options.push({
      key: 'scrollbar',
      icon: resolveThemeIcon(SWITCHER_ICONS.scrollbar, iconFormat),
      title: locale.translate(SCROLLBAR_TITLE_TRANSLATIONS, 'Custom scrollbar'),
      enabled: scrollbar.enabled.value,
      toggle: () => scrollbar.set(!scrollbar.enabled.value),
    })
  }

  if (cursor.available) {
    options.push({
      key: 'cursor',
      icon: resolveThemeIcon(SWITCHER_ICONS.cursor, iconFormat),
      title: locale.translate(CURSOR_TITLE_TRANSLATIONS, 'Custom cursor'),
      enabled: cursor.enabled.value,
      toggle: () => cursor.set(!cursor.enabled.value),
    })
  }

  return options
})

// The theme used outside any season (e.g. Venix)
const baseTheme = getDefaultSelection(theme.colors).fallbackTheme

const open = ref(false)
const view = ref<'main' | 'settings'>('main')
const visible = ref(false)
const announcement = ref('')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

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

// In document order: the header's button (settings/back) first.
const getMenuItems = (): HTMLButtonElement[] => {
  return Array.from(rootRef.value?.querySelectorAll<HTMLButtonElement>('.venix-theme-switcher__icon-button, .venix-theme-switcher__item') ?? [])
}

const focusItemAt = (index: number) => {
  const items = getMenuItems()
  if (items.length === 0) return
  items[(index + items.length) % items.length]?.focus()
}

const toggleOpen = async () => {
  open.value = !open.value
  if (!open.value) return

  view.value = 'main'
  await nextTick()
  const items = getMenuItems()
  ;(items.find(el => el.getAttribute('aria-checked') === 'true') ?? items[0])?.focus()
}

// Settings: focus goes to the first option; back: to the settings button.
const showView = async (next: 'main' | 'settings') => {
  // The clicked button leaves the DOM with its view: without moving focus to
  // the menu first, it would fall to <body> and close the menu (see
  // handleFocusOut).
  menuRef.value?.focus()
  view.value = next

  await nextTick()
  const items = getMenuItems()
  ;(next === 'settings' ? items[1] : items[0])?.focus()
}

const close = (options: { restoreFocus?: boolean } = {}) => {
  if (!open.value) return
  open.value = false
  if (options.restoreFocus) triggerRef.value?.focus()
}

const selectTheme = (value: string) => {
  const selected = themes.value.find(item => item.value === value)
  theme.set(value)

  const template = locale.translate(CHANGED_ANNOUNCEMENT_TRANSLATIONS, 'Website color changed to {theme}')
  announcement.value = template.replace('{theme}', selected?.name ?? value)
}

// Like selectTheme, keeps the menu open: picking the mode and then the theme
// (or vice versa) is the common flow. Only the button, a click outside or Esc
// close it.
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

const isInside = (rect: DOMRect, event: MouseEvent): boolean =>
  event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom

// While a theme switch animates (View Transitions), the browser sends every
// press and click to <html> instead of what's under the pointer. Over the
// open menu, that would read as a click outside and lose the option picked
// in quick succession, so these find it by position instead.
const isTransitionHitOnMenu = (event: MouseEvent): boolean =>
  open.value
  && event.target === document.documentElement
  && !!menuRef.value && isInside(menuRef.value.getBoundingClientRect(), event)

// Keeps focus where it is: moving to <body> would close the menu (see
// handleFocusOut).
const handleMouseDown = (event: MouseEvent) => {
  if (isTransitionHitOnMenu(event)) event.preventDefault()
}

// By the path the click took, not `contains(target)`: the settings and back
// buttons leave the DOM (Vue re-renders between listeners) before the click
// reaches `document`, and a detached target would read as a click outside.
const handleClickOutside = (event: MouseEvent) => {
  if (isTransitionHitOnMenu(event)) {
    const control = getMenuItems().find(el => isInside(el.getBoundingClientRect(), event))
    control?.focus()
    control?.click()
    return
  }

  if (!rootRef.value || !event.composedPath().includes(rootRef.value)) close()
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

  document.addEventListener('mousedown', handleMouseDown, true)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown, true)
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
  /* Fits the settings' one-line titles too, so the menu keeps its width when
     switching views. */
  min-width: 16rem;
  margin: 0;
  padding: 0.375rem;
  border-radius: 0.75rem;
  /* Set here so the layout doesn't depend on the page around the switcher
     (e.g. a centered header vs. a left-aligned toolbar). */
  text-align: left;
  /* Fixed neutral colors (not from the active theme): the menu needs to stay
     legible no matter which color theme is currently applied/being picked.
     Dark palette here; the @supports block below switches to the light one
     when the page is in light mode. */
  --venix-switcher-bg: #1f2128;
  --venix-switcher-border: #3a3d46;
  /* Headings in the strong color and options a step softer, so the sections
     stand out; an option lights up on hover and when selected. */
  --venix-switcher-text: rgba(245, 245, 247, 0.7);
  --venix-switcher-text-strong: #ffffff;
  --venix-switcher-heading: #ffffff;
  --venix-switcher-subheading: #f5f5f7;
  --venix-switcher-hover: rgba(255, 255, 255, 0.1);
  --venix-switcher-active: rgba(255, 255, 255, 0.16);
  --venix-switcher-description: rgba(245, 245, 247, 0.45);
  --venix-switcher-switch-off: #3a3d46;
  --venix-switcher-knob-off: #9a9ca5;
  --venix-switcher-switch-on: #f5f5f7;
  --venix-switcher-shadow: rgba(0, 0, 0, 0.25);
  background: var(--venix-switcher-bg);
  border: 1px solid var(--venix-switcher-border);
  box-shadow: 0 8px 24px var(--venix-switcher-shadow);
  transform-origin: top right;
}

/* Focusable (tabindex="-1") only so a click on a heading, separator or the
   padding keeps focus inside and doesn't close the menu; never shown. */
.venix-theme-switcher__menu:focus {
  outline: none;
}

/* `light-dark()` follows the `color-scheme` each theme sets on :root, so the
   menu matches the mode (light/dark) without depending on the theme's colors.
   Guarded because custom properties don't fall back on unsupported values:
   older browsers keep the dark palette above. */
@supports (color: light-dark(#fff, #000)) {
  .venix-theme-switcher__menu {
    --venix-switcher-bg: light-dark(#ffffff, #1f2128);
    --venix-switcher-border: light-dark(#e2e4ea, #3a3d46);
    --venix-switcher-text: light-dark(rgba(31, 33, 40, 0.7), rgba(245, 245, 247, 0.7));
    --venix-switcher-text-strong: light-dark(#000000, #ffffff);
    --venix-switcher-heading: light-dark(#000000, #ffffff);
    --venix-switcher-subheading: light-dark(#1f2128, #f5f5f7);
    --venix-switcher-hover: light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.1));
    --venix-switcher-active: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.16));
    --venix-switcher-description: light-dark(rgba(31, 33, 40, 0.5), rgba(245, 245, 247, 0.45));
    --venix-switcher-switch-off: light-dark(#d5d7de, #3a3d46);
    --venix-switcher-knob-off: light-dark(#ffffff, #9a9ca5);
    --venix-switcher-switch-on: light-dark(#1f2128, #f5f5f7);
    --venix-switcher-shadow: light-dark(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.25));
  }
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

/* Switching between the main view and the settings: the new one slides in a
   little from the side it comes from. */
.venix-theme-switcher__view {
  animation: venix-theme-switcher-view-in 0.18s cubic-bezier(0, 0, 0.2, 1);
  --venix-switcher-view-from: -0.5rem;
}

.venix-theme-switcher__view--settings {
  --venix-switcher-view-from: 0.5rem;
}

@keyframes venix-theme-switcher-view-in {
  from {
    opacity: 0;
    transform: translateX(var(--venix-switcher-view-from));
  }
}

@media (prefers-reduced-motion: reduce) {
  .venix-theme-switcher-menu-enter-active,
  .venix-theme-switcher-menu-leave-active {
    transition: none;
  }

  .venix-theme-switcher__view {
    animation: none;
  }
}

/* Title centered between two equal columns: the back button on the left, the
   settings button on the right. */
.venix-theme-switcher__header {
  display: grid;
  grid-template-columns: 1.75rem 1fr 1.75rem;
  align-items: center;
  gap: 0.25rem;
}

.venix-theme-switcher__header .venix-theme-switcher__heading {
  grid-column: 2;
  grid-row: 1;
}

.venix-theme-switcher__heading + .venix-theme-switcher__icon-button {
  grid-column: 3;
}

.venix-theme-switcher__icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--venix-switcher-text);
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.venix-theme-switcher__icon-button:hover,
.venix-theme-switcher__icon-button:focus-visible {
  background: var(--venix-switcher-hover);
  color: var(--venix-switcher-text-strong);
}

.venix-theme-switcher__heading {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--venix-switcher-heading);
  text-align: center;
}

.venix-theme-switcher__subheading {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--venix-switcher-subheading);
  text-align: center;
}

.venix-theme-switcher__modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
}

.venix-theme-switcher__separator {
  height: 1px;
  margin: 0.375rem 0.25rem;
  background: var(--venix-switcher-border);
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
  color: var(--venix-switcher-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
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
  background: var(--venix-switcher-hover);
  color: var(--venix-switcher-text-strong);
}

.venix-theme-switcher__item--active {
  background: var(--venix-switcher-active);
  color: var(--venix-switcher-text-strong);
  font-weight: 600;
}

.venix-theme-switcher__item-icon {
  flex-shrink: 0;
}

.venix-theme-switcher__item--on {
  color: var(--venix-switcher-text-strong);
}

.venix-theme-switcher__item-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

/* One line, always: the menu widens to fit instead. */
.venix-theme-switcher__item-title {
  white-space: nowrap;
}

/* At most two lines. */
.venix-theme-switcher__item-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  color: var(--venix-switcher-description);
  font-size: 0.6875rem;
  line-height: 1.3;
}

.venix-theme-switcher__switch {
  position: relative;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1rem;
  border-radius: 999px;
  background: var(--venix-switcher-switch-off);
  transition: background-color 0.15s ease;
}

.venix-theme-switcher__switch::after {
  content: "";
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--venix-switcher-knob-off);
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.venix-theme-switcher__item--on .venix-theme-switcher__switch {
  background: var(--venix-switcher-switch-on);
}

.venix-theme-switcher__item--on .venix-theme-switcher__switch::after {
  background: var(--venix-switcher-bg);
  transform: translateX(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .venix-theme-switcher__switch,
  .venix-theme-switcher__switch::after {
    transition: none;
  }
}
</style>
