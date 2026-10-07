<template>
  <div class="playground">
    <header class="header">
      <client-only>
        <VenixThemeSwitcher class="header__switcher" />
      </client-only>
      <h1>🎨 Nuxt Theme Playground</h1>
      <p>{{ $t('app.subtitle') }}</p>
    </header>

    <main class="content">
      <!-- Theme selector (manual, for comparison with VenixThemeSwitcher) -->
      <section class="section">
        <h2>{{ $t('themeSelector.heading') }}</h2>
        <client-only>
          <div class="theme-buttons">
            <button
              v-for="item in themes"
              :key="item.value"
              :class="{ active: isActive(item) }"
              class="theme-button"
              @click="theme.toggle(item.value)"
            >
              <VenixIcon
                v-if="item.icon"
                :icon="item.icon.value"
                :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
              />
              <span>{{ item.name }}</span>
            </button>
          </div>
        </client-only>
      </section>

      <!-- Languages + Cookie consent (side by side, right above) -->
      <div class="row">
        <section class="section row__cell">
          <h2>{{ $t('languages.heading') }}</h2>
          <p class="lang-info">
            {{ $t('languages.appLocaleLabel', { pkg: '@nuxtjs/i18n' }) }} <strong>{{ i18nLocale }}</strong>
            — {{ $t('languages.themeLocaleLabel') }} <strong>{{ locale.current.value }}</strong>
          </p>
          <div class="lang-buttons">
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              type="button"
              class="lang-button"
              :class="{ active: loc.code === i18nLocale }"
              @click="changeLocale(loc.code)"
            >
              {{ loc.name }}
            </button>
          </div>
        </section>

        <section class="section row__cell">
          <h2>{{ $t('cookieConsent.heading') }}</h2>
          <client-only>
            <p class="consent-info">
              {{ $t('cookieConsent.consentLabel') }}
              <strong>{{ persistence.hasConsent.value ? $t('cookieConsent.granted') : $t('cookieConsent.notGranted') }}</strong>
              — {{ $t('cookieConsent.cookiesLabel') }}
              <strong>{{ cookiesPresent ? $t('cookieConsent.written') : $t('cookieConsent.absent') }}</strong>
            </p>
            <div class="consent-buttons">
              <button
                type="button"
                class="consent-button consent-button--grant"
                @click="grantConsent"
              >
                {{ $t('cookieConsent.grant') }}
              </button>
              <button
                type="button"
                class="consent-button consent-button--revoke"
                @click="revokeConsent"
              >
                {{ $t('cookieConsent.revoke') }}
              </button>
            </div>
            <p class="consent-hint">
              {{ $t('cookieConsent.hint') }}
            </p>
          </client-only>
        </section>
      </div>

      <!-- Color palette -->
      <section class="section">
        <h2>{{ $t('colorPalette.heading', { theme: currentThemeName }) }}</h2>
        <client-only>
          <div class="color-grid">
            <div
              v-for="color in colorList"
              :key="color.name"
              class="color-card"
            >
              <div
                class="color-preview"
                :style="{ backgroundColor: color.value }"
              />
              <span class="color-name">{{ formatColorName(color.name) }}</span>
              <code class="color-value">{{ color.value }}</code>
            </div>
          </div>
        </client-only>
      </section>

      <!-- Icons -->
      <section class="section">
        <h2>{{ $t('icons.heading') }}</h2>
        <div class="icon-row">
          <div
            v-for="item in iconSamples"
            :key="item.label"
            class="icon-sample"
          >
            <VenixIcon
              :icon="item.icon"
              class="icon-sample__icon"
            />
            <span class="icon-sample__label">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <!-- Vertical scroll test -->
      <section class="section">
        <h2>{{ $t('scroll.verticalHeading') }}</h2>
        <div class="scroll-vertical">
          <div
            v-for="i in 20"
            :key="`vertical-${i}`"
            class="scroll-item"
          >
            {{ $t('scroll.verticalItem', { n: i }) }}
          </div>
        </div>
      </section>

      <!-- Horizontal scroll test -->
      <section class="section">
        <h2>{{ $t('scroll.horizontalHeading') }}</h2>
        <div class="scroll-horizontal">
          <div
            v-for="i in 20"
            :key="`horizontal-${i}`"
            class="scroll-item-horizontal"
          >
            {{ $t('scroll.horizontalItem', { n: i }) }}
          </div>
        </div>
      </section>

      <!-- Action buttons -->
      <section class="section">
        <h2>{{ $t('actions.heading') }}</h2>
        <client-only>
          <div class="actions">
            <button
              class="action-button"
              @click="toggleTheme"
            >
              {{ $t('actions.toggle') }}
            </button>
          </div>
        </client-only>
      </section>

      <!-- Vuetify integration (`vuetify: true`) -->
      <section class="section">
        <h2>Vuetify</h2>
        <v-card
          color="surface"
          class="pa-4"
        >
          <v-card-title>v-card (surface)</v-card-title>
          <v-card-actions>
            <v-btn color="primary">
              primary
            </v-btn>
            <v-btn color="secondary">
              secondary
            </v-btn>
            <v-btn
              color="accent"
              variant="outlined"
            >
              accent
            </v-btn>
          </v-card-actions>
        </v-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import themeData from '../src/shared/theme.json' with { type: 'json' }

const { theme, themes, locale, persistence } = useVenixTheme()

const { t, locale: i18nLocale, locales: availableLocales, setLocale: setI18nLocale } = useI18n()

// Bridges the playground's own @nuxtjs/i18n language switcher to the theme
// module's locale (theme-name translations) — normally they follow each
// other automatically via the shared `i18n_redirected` cookie
// (`translation.cookieSync`), but this playground disables i18n's browser
// auto-detection (`detectBrowserLanguage: false` in nuxt.config.ts, so the
// homepage always renders in English for screenshots), which also turns off
// its cookie persistence. Calling `locale.set()` explicitly keeps both in
// sync regardless.
const changeLocale = async (code: Parameters<typeof setI18nLocale>[0]) => {
  await setI18nLocale(code)
  locale.set(code)
}

const cookiesPresent = ref(false)

const checkCookies = () => {
  cookiesPresent.value = document.cookie.includes('venix-theme-preference=')
}

// `useCookie()` writes to `document.cookie` asynchronously (via a watcher),
// so we wait for the next tick before re-reading cookies in the browser.
const grantConsent = async () => {
  persistence.grant()
  await nextTick()
  checkCookies()
}

const revokeConsent = async () => {
  persistence.revoke()
  await nextTick()
  checkCookies()
}

const isActive = (item: { value: string }): boolean => {
  return theme.preference.value === item.value
}

const activeTheme = ref('')

onMounted(() => {
  activeTheme.value = theme.preference.value || 'dark'
  checkCookies()
})

watch(() => theme.preference.value, async (newTheme) => {
  activeTheme.value = newTheme || 'dark'
  await nextTick()
  checkCookies()
})

const currentThemeName = computed(() => {
  return theme.data.value?.name || activeTheme.value || 'dark'
})

const customSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" /></svg>'

const iconSamples = computed(() => [
  { label: t('icons.iconify'), icon: 'line-md:loading-loop' },
  { label: t('icons.emoji'), icon: '🎨' },
  { label: t('icons.svg'), icon: customSvg },
  { label: t('icons.aliasHome'), icon: 'home' },
  { label: t('icons.aliasStar'), icon: 'star' },
])

const formatColorName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

const colorList = computed(() => {
  const currentTheme = activeTheme.value || theme.preference.value || 'dark'
  const themeColors = themeData.colors.themes[currentTheme as keyof typeof themeData.colors.themes]

  if (!themeColors) return []

  return Object.entries(themeColors)
    .filter(([key]) => !['dark', 'seasonal', 'dateRange', 'translations', 'icon'].includes(key))
    .filter(([, value]) => typeof value === 'string' && value.startsWith('#'))
    .map(([name, value]) => ({
      name,
      value: value as string,
    }))
})

const toggleTheme = () => {
  theme.toggle()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family-base, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  background: var(--color-background);
  color: var(--color-primary);
  transition: all 0.3s ease;
}

.playground {
  min-height: 100vh;
}

.header {
  position: relative;
  text-align: center;
  padding: 1.25rem 1.5rem;
  background: var(--color-background2);
  border-bottom: 1px solid var(--color-background3);
}

.header__switcher {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem;
}

.section {
  background: var(--color-background2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--color-background3);
}

.section h2 {
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
  color: var(--color-secondary);
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.row__cell {
  margin-bottom: 0;
}

.theme-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.theme-button {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-background3);
  border-radius: 8px;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-button:hover {
  border-color: var(--color-primary);
}

.theme-button.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
  gap: 0.5rem;
}

.color-card {
  background: var(--color-background3);
  border-radius: 8px;
  padding: 0.4rem;
  text-align: center;
}

.color-preview {
  width: 100%;
  height: 40px;
  border-radius: 6px;
  margin-bottom: 0.35rem;
  border: 2px solid var(--color-background3);
}

.color-name {
  display: block;
  font-size: 0.7rem;
  color: var(--color-secondary);
  margin-bottom: 0.15rem;
}

.color-value {
  font-size: 0.65rem;
  color: var(--color-primary);
  font-family: monospace;
}

.squares-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.color-square {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.5rem;
  border: 3px solid var(--color-background3);
}

.square-label {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  text-align: center;
  width: 100%;
}

/* Scroll Vertical */
.scroll-vertical {
  height: 160px;
  overflow-y: auto;
  background: var(--color-background3);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.scroll-item {
  padding: 0.6rem;
  background: var(--color-background2);
  border-radius: 4px;
  color: var(--color-primary);
  text-align: center;
  flex-shrink: 0;
}

/* Scroll Horizontal */
.scroll-horizontal {
  overflow-x: auto;
  background: var(--color-background3);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  gap: 0.4rem;
  white-space: nowrap;
}

.scroll-item-horizontal {
  padding: 0.75rem 1rem;
  background: var(--color-background2);
  border-radius: 4px;
  color: var(--color-primary);
  text-align: center;
  min-width: 140px;
  flex-shrink: 0;
}

.icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.icon-sample {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.icon-sample__icon {
  font-size: 1.5rem;
  color: var(--color-primary);
}

.icon-sample__label {
  font-size: 0.8rem;
  color: var(--color-secondary);
}

.lang-info {
  margin-bottom: 0.6rem;
  color: var(--color-secondary);
  font-size: 0.85rem;
}

.lang-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.lang-button {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-background3);
  border-radius: 8px;
  background: transparent;
  color: var(--color-primary);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lang-button:hover {
  border-color: var(--color-primary);
}

.lang-button.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.consent-info {
  margin-bottom: 0.6rem;
  color: var(--color-secondary);
  font-size: 0.85rem;
}

.consent-info code {
  background: var(--color-background3);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.consent-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.consent-button {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-background3);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.consent-button--grant {
  color: var(--color-success, var(--color-primary));
  border-color: var(--color-success, var(--color-background3));
}

.consent-button--grant:hover {
  background: var(--color-success, var(--color-primary));
  color: var(--color-background);
}

.consent-button--revoke {
  color: var(--color-error, var(--color-primary));
  border-color: var(--color-error, var(--color-background3));
}

.consent-button--revoke:hover {
  background: var(--color-error, var(--color-primary));
  color: var(--color-background);
}

.consent-hint {
  font-size: 0.8rem;
  color: var(--color-secondary);
  opacity: 0.8;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-secondary);
  border-radius: 8px;
  background: transparent;
  color: var(--color-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button:hover {
  background: var(--color-secondary);
  color: var(--color-background);
}
</style>
