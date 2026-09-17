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
      <VenixIcon
        v-if="activeIcon"
        :key="activeIconKey"
        :icon="activeIcon.value"
        :mode="activeIcon.format === 'emote' ? undefined : activeIcon.format"
        aria-hidden="true"
      />
      <span
        v-if="showLabel"
        class="venix-theme-switcher__trigger-label"
      >{{ theme.data.value?.name }}</span>
    </button>

    <ul
      v-show="open"
      class="venix-theme-switcher__menu"
      role="menu"
      :aria-label="resolvedLabel"
      @keydown="handleMenuKeydown"
    >
      <li
        class="venix-theme-switcher__heading"
        aria-hidden="true"
      >
        {{ resolvedLabel }}
      </li>
      <li
        v-for="item in themes"
        :key="item.value"
        role="none"
      >
        <button
          type="button"
          role="menuitemradio"
          class="venix-theme-switcher__item"
          :class="{ 'venix-theme-switcher__item--active': item.value === theme.preference.value }"
          :aria-checked="item.value === theme.preference.value"
          @click="select(item.value)"
        >
          <VenixIcon
            v-if="item.icon"
            class="venix-theme-switcher__item-icon"
            :icon="item.icon.value"
            :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
            aria-hidden="true"
          />
          <span>{{ item.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useVenixTheme } from '../composables/useVenixTheme'

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

const props = defineProps<{
  /** Accessible label for the button and the menu. Without a value, uses the component's own translation based on the current locale. */
  label?: string
  /** Shows the active theme's name next to the icon on the button. */
  showLabel?: boolean
}>()

const { theme, themes, locale } = useVenixTheme()

const resolvedLabel = computed(() => props.label ?? locale.translate(LABEL_TRANSLATIONS, 'Color theme'))

const open = ref(false)
const visible = ref(false)
const announcement = ref('')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const activeIcon = computed(() => theme.data.value?.icon ?? null)
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
  const activeIndex = themes.value.findIndex(item => item.value === theme.preference.value)
  ;(items[activeIndex] ?? items[0])?.focus()
}

const close = (options: { restoreFocus?: boolean } = {}) => {
  if (!open.value) return
  open.value = false
  if (options.restoreFocus) triggerRef.value?.focus()
}

const select = (value: string) => {
  const selected = themes.value.find(item => item.value === value)
  theme.toggle(value)

  const template = locale.translate(CHANGED_ANNOUNCEMENT_TRANSLATIONS, 'Color theme changed to {theme}')
  announcement.value = template.replace('{theme}', selected?.name ?? value)

  close({ restoreFocus: true })
}

const handleMenuKeydown = (event: KeyboardEvent) => {
  const items = getMenuItems()
  const currentIndex = items.findIndex(el => el === document.activeElement)

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItemAt(currentIndex + 1)
      break
    case 'ArrowUp':
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
  min-width: 12rem;
  margin: 0;
  padding: 0.375rem;
  list-style: none;
  border-radius: 0.75rem;
  /* Fixed colors (not from the active theme): the menu needs to stay legible
     no matter which color theme is currently applied/being picked. */
  background: #1f2128;
  border: 1px solid #3a3d46;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
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
