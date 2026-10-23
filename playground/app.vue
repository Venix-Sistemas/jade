<template>
  <div class="playground">
    <header class="header">
      <h1 class="header__title">
        <img
          src="/images/jade-logo.png"
          alt=""
          class="header__logo"
          width="44"
          height="44"
        >
        Jade Playground
      </h1>
      <p class="header__subtitle">
        {{ $t('app.subtitle') }}
      </p>
    </header>

    <nav
      class="module-nav"
      :aria-label="$t('app.modules')"
    >
      <!-- Only the links scroll sideways on narrow screens: a scrolling
           container would clip the switcher's dropdown. -->
      <div class="module-nav__links">
        <a
          v-for="item in modules"
          :key="item.id"
          :href="`#${item.id}`"
          class="module-nav__link"
        >
          <span aria-hidden="true">{{ item.emoji }}</span>
          {{ $t(`modules.${item.id}.title`) }}
        </a>
      </div>
      <client-only>
        <VenixThemeSwitcher class="module-nav__switcher" />
      </client-only>
    </nav>

    <main class="content">
      <!-- ===== Colors ===== -->
      <section
        id="color"
        class="module"
      >
        <ModuleHeader
          id="color"
          emoji="🎨"
        />

        <client-only>
          <div class="demo">
            <h3 class="demo__title">
              {{ $t('color.selectorHeading') }}
            </h3>
            <p class="demo__hint">
              {{ $t('color.selectorHint') }}
            </p>

            <h4 class="demo__label">
              {{ $t('color.mode') }}
            </h4>
            <div class="chips">
              <button
                v-for="item in modes"
                :key="item.value"
                type="button"
                class="chip"
                :class="{ 'chip--active': mode.preference.value === item.value }"
                @click="mode.set(item.value)"
              >
                <VenixIcon
                  v-if="item.icon"
                  :icon="item.icon.value"
                  :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
                />
                <span>{{ item.name }}</span>
              </button>
              <button
                type="button"
                class="chip chip--outline"
                @click="mode.toggle()"
              >
                {{ $t('color.toggle') }}
              </button>
            </div>

            <!-- Built-in themes, then the ones this project adds in `color.themes` -->
            <template
              v-for="group in themeGroups"
              :key="group.key"
            >
              <h4 class="demo__label">
                {{ group.label }}
              </h4>
              <div class="chips">
                <button
                  v-for="item in group.items"
                  :key="item.value"
                  type="button"
                  class="chip"
                  :class="{ 'chip--active': theme.preference.value === item.value }"
                  @click="theme.set(item.value)"
                >
                  <VenixIcon
                    v-if="item.icon"
                    :icon="item.icon.value"
                    :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
                  />
                  <span>{{ item.name }}</span>
                </button>
              </div>
            </template>

            <p class="demo__status">
              {{ $t('color.applied') }} <code>data-theme="{{ theme.value.value }}"</code>
            </p>
          </div>

          <div class="demo">
            <h3 class="demo__title">
              {{ $t('color.paletteHeading', { theme: currentThemeName }) }}
            </h3>
            <div class="color-grid">
              <div
                v-for="color in colorList"
                :key="color.name"
                class="color-card"
              >
                <div
                  class="color-card__swatch"
                  :style="{ backgroundColor: color.value }"
                />
                <span class="color-card__name">{{ formatColorName(color.name) }}</span>
                <code class="color-card__value">{{ color.value }}</code>
              </div>
            </div>
          </div>

          <div class="demo">
            <h3 class="demo__title">
              {{ $t('color.consentHeading') }}
            </h3>
            <p class="demo__status">
              {{ $t('color.consentLabel') }}
              <strong>{{ persistence.hasConsent.value ? $t('color.granted') : $t('color.notGranted') }}</strong>
              · {{ $t('color.cookiesLabel') }}
              <strong>{{ cookiesPresent ? $t('color.written') : $t('color.absent') }}</strong>
            </p>
            <div class="chips">
              <button
                type="button"
                class="chip chip--success"
                @click="grantConsent"
              >
                {{ $t('color.grant') }}
              </button>
              <button
                type="button"
                class="chip chip--error"
                @click="revokeConsent"
              >
                {{ $t('color.revoke') }}
              </button>
            </div>
            <p class="demo__hint">
              {{ $t('color.consentHint') }}
            </p>
          </div>
        </client-only>
      </section>

      <!-- ===== Translation ===== -->
      <section
        id="translation"
        class="module"
      >
        <ModuleHeader
          id="translation"
          emoji="🌐"
        />

        <div class="demo">
          <h3 class="demo__title">
            {{ $t('translation.languageHeading') }}
          </h3>
          <div class="chips">
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              type="button"
              class="chip"
              :class="{ 'chip--active': loc.code === i18nLocale }"
              @click="changeLocale(loc.code)"
            >
              {{ loc.name }}
            </button>
          </div>
          <p class="demo__status">
            {{ $t('translation.appLocale', { pkg: '@nuxtjs/i18n' }) }} <strong>{{ i18nLocale }}</strong>
            · {{ $t('translation.themeLocale') }} <strong>{{ locale.current.value }}</strong>
          </p>
        </div>

        <client-only>
          <div class="demo">
            <h3 class="demo__title">
              {{ $t('translation.namesHeading') }}
            </h3>
            <p class="demo__hint">
              {{ $t('translation.namesHint') }}
            </p>
            <div class="chips">
              <span
                v-for="item in [...modes, ...themes]"
                :key="item.value"
                class="tag"
              >{{ item.name }}</span>
            </div>
          </div>
        </client-only>
      </section>

      <!-- ===== Icons ===== -->
      <section
        id="icon"
        class="module"
      >
        <ModuleHeader
          id="icon"
          emoji="✨"
        />

        <div class="demo">
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
        </div>
      </section>

      <!-- ===== Typography ===== -->
      <section
        id="typography"
        class="module"
      >
        <ModuleHeader
          id="typography"
          emoji="🔤"
        />

        <div class="demo">
          <client-only>
            <dl class="specs">
              <dt><code>--font-family-base</code></dt>
              <dd>{{ typography.family }}</dd>
              <dt><code>--font-size-base</code></dt>
              <dd>{{ typography.size }}</dd>
            </dl>
          </client-only>
          <div class="specimen">
            <p
              v-for="size in [2, 1.5, 1.125, 1, 0.875]"
              :key="size"
              :style="{ fontSize: `${size}rem` }"
            >
              <span class="specimen__size">{{ size }}rem</span>
              {{ $t('typography.sample') }}
            </p>
          </div>
        </div>
      </section>

      <!-- ===== Scrollbar ===== -->
      <section
        id="scrollbar"
        class="module"
      >
        <ModuleHeader
          id="scrollbar"
          emoji="📜"
        />

        <div class="demo-grid">
          <div class="demo">
            <h3 class="demo__title">
              {{ $t('scrollbar.vertical') }}
            </h3>
            <div
              class="scroll-vertical"
              data-venix-scroll
            >
              <div
                v-for="i in 20"
                :key="`vertical-${i}`"
                class="scroll-item"
              >
                {{ $t('scrollbar.item', { n: i }) }}
              </div>
            </div>
          </div>
          <div class="demo">
            <h3 class="demo__title">
              {{ $t('scrollbar.horizontal') }}
            </h3>
            <div
              class="scroll-horizontal"
              data-venix-scroll
            >
              <div
                v-for="i in 20"
                :key="`horizontal-${i}`"
                class="scroll-item scroll-item--horizontal"
              >
                {{ $t('scrollbar.item', { n: i }) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Cursor ===== -->
      <section
        id="cursor"
        class="module"
      >
        <ModuleHeader
          id="cursor"
          emoji="🖱️"
        />

        <div class="demo-grid demo-grid--three">
          <div class="demo cursor-area">
            <strong>default</strong>
            <span class="demo__hint">{{ $t('cursor.default') }}</span>
          </div>
          <button
            type="button"
            class="demo cursor-area"
          >
            <strong>pointer</strong>
            <span class="demo__hint">{{ $t('cursor.pointer') }}</span>
          </button>
          <label class="demo cursor-area">
            <strong>text</strong>
            <input
              type="text"
              class="cursor-area__input"
              :placeholder="$t('cursor.text')"
            >
          </label>
        </div>
      </section>

      <!-- ===== Vuetify ===== -->
      <section
        id="vuetify"
        class="module"
      >
        <ModuleHeader
          id="vuetify"
          emoji="🧩"
        />

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
import { ref, computed, onMounted, watch, nextTick, h, defineComponent } from 'vue'

const { theme, themes, mode, modes, locale, persistence } = useVenixTheme()

const { t, locale: i18nLocale, locales: availableLocales, setLocale: setI18nLocale } = useI18n()

useHead({
  title: 'Jade Playground',
  meta: [{ name: 'description', content: () => t('app.subtitle') }],
  link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
})

// Same order as the README's module table.
const modules = [
  { id: 'color', emoji: '🎨' },
  { id: 'translation', emoji: '🌐' },
  { id: 'icon', emoji: '✨' },
  { id: 'typography', emoji: '🔤' },
  { id: 'scrollbar', emoji: '📜' },
  { id: 'cursor', emoji: '🖱️' },
  { id: 'vuetify', emoji: '🧩' },
]

// Title, `venixTheme.<key>` badge and one-line description of a module section.
const ModuleHeader = defineComponent({
  props: {
    id: { type: String, required: true },
    emoji: { type: String, required: true },
  },
  setup(props) {
    return () => h('header', { class: 'module__header' }, [
      h('h2', { class: 'module__title' }, [
        h('span', { 'aria-hidden': 'true' }, props.emoji),
        ` ${t(`modules.${props.id}.title`)}`,
        h('code', { class: 'module__key' }, `venixTheme.${props.id}`),
      ]),
      // Component names go in as a parameter: written in the message itself,
      // vue-i18n warns about HTML in it (it's rendered as text either way).
      h('p', { class: 'module__description' }, t(`modules.${props.id}.description`, { component: '<VenixIcon>' })),
    ])
  },
})

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

// Read from the generated CSS variables, so this shows what the typography
// module actually produced (including custom fonts like Iceberg).
const typography = ref({ family: '', size: '' })

onMounted(() => {
  checkCookies()

  const rootStyle = getComputedStyle(document.documentElement)
  typography.value = {
    family: rootStyle.getPropertyValue('--font-family-base').trim() || '—',
    size: rootStyle.getPropertyValue('--font-size-base').trim() || '—',
  }
})

watch([theme.preference, mode.preference], async () => {
  await nextTick()
  checkCookies()
})

// The chosen theme and mode, e.g. "Natal · Claro".
const themeGroups = computed(() => [
  { key: 'built-in', label: t('color.theme'), items: themes.value.filter(item => !item.custom) },
  { key: 'custom', label: t('color.customTheme'), items: themes.value.filter(item => item.custom) },
].filter(group => group.items.length > 0))

const currentThemeName = computed(() => {
  return `${theme.data.value?.name} · ${mode.data.value?.name}`
})

const customSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" /></svg>'

const iconSamples = computed(() => [
  { label: t('icon.iconify'), icon: 'line-md:loading-loop' },
  { label: t('icon.emoji'), icon: '🎨' },
  { label: t('icon.svg'), icon: customSvg },
  { label: t('icon.aliasHome'), icon: 'home' },
  { label: t('icon.aliasStar'), icon: 'star' },
])

const formatColorName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

const colorList = computed(() => {
  const themeColors = theme.colors.themes[theme.value.value]

  if (!themeColors) return []

  return Object.entries(themeColors)
    .filter(([, value]) => typeof value === 'string' && value.startsWith('#'))
    .map(([name, value]) => ({
      name,
      value: value as string,
    }))
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 4.5rem;
}

body {
  font-family: var(--font-family-base, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  background: var(--color-background);
  color: var(--color-primary);
  transition: all 0.3s ease;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
}

.playground {
  min-height: 100vh;
}

/* ===== Header ===== */
.header {
  position: relative;
  text-align: center;
  padding: 1.5rem 1.5rem 1.25rem;
  background: var(--color-background2);
}

.header__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.header__logo {
  width: 2.75rem;
  height: 2.75rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}

.header__subtitle {
  color: var(--color-secondary);
}

/* ===== Module navigation ===== */
.module-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  /* Room on the right for the switcher (absolutely positioned, so the links
     stay centered on the page) */
  padding: 0.5rem 3.75rem 0.5rem 1rem;
  background: var(--color-background2);
  border-top: 1px solid var(--color-background3);
  border-bottom: 1px solid var(--color-background3);
}

.module-nav__links {
  display: flex;
  justify-content: safe center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.module-nav__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.4rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-radius: 999px;
  /* A light wash of the theme's primary color, so links read as buttons */
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.module-nav__link:hover,
.module-nav__link:focus-visible {
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.module-nav__switcher {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
}

/* ===== Content ===== */
.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.module {
  margin-bottom: 2.5rem;
}

.module__header {
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-background3);
}

.module__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.4rem;
}

.module__key {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: var(--color-background3);
  color: var(--color-secondary);
  font-size: 0.75rem;
  font-weight: normal;
}

.module__description {
  margin-top: 0.25rem;
  color: var(--color-secondary);
  font-size: 0.9rem;
}

.demo {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: var(--color-background2);
  border: 1px solid var(--color-background3);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.75rem;
}

.demo-grid--three {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.demo-grid .demo {
  margin-bottom: 0;
}

.demo__title {
  margin-bottom: 0.6rem;
  font-size: 1rem;
  color: var(--color-secondary);
}

.demo__label {
  margin: 0.75rem 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-secondary);
  opacity: 0.8;
}

.demo__hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-secondary);
  opacity: 0.85;
}

.demo__status {
  margin: 0.6rem 0;
  font-size: 0.85rem;
  color: var(--color-secondary);
}

.demo__status code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--color-background3);
  color: var(--color-primary);
}

/* ===== Chips (buttons and tags) ===== */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border: 2px solid var(--color-background3);
  border-radius: 8px;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--color-primary);
}

.chip--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.chip--outline {
  border-style: dashed;
  color: var(--color-secondary);
}

.chip--success {
  color: var(--color-success, var(--color-primary));
  border-color: var(--color-success, var(--color-background3));
}

.chip--success:hover {
  background: var(--color-success, var(--color-primary));
  color: var(--color-background);
}

.chip--error {
  color: var(--color-error, var(--color-primary));
  border-color: var(--color-error, var(--color-background3));
}

.chip--error:hover {
  background: var(--color-error, var(--color-primary));
  color: var(--color-background);
}

.tag {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--color-background3);
  font-size: 0.85rem;
}

/* ===== Colors ===== */
.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
}

.color-card {
  padding: 0.4rem;
  border-radius: 8px;
  background: var(--color-background3);
  text-align: center;
}

.color-card__swatch {
  height: 40px;
  margin-bottom: 0.35rem;
  border-radius: 6px;
  border: 2px solid var(--color-background3);
}

.color-card__name {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.7rem;
  color: var(--color-secondary);
}

.color-card__value {
  font-size: 0.65rem;
  color: var(--color-primary);
}

/* ===== Icons ===== */
.icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.icon-sample {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.icon-sample__icon {
  font-size: 1.75rem;
  color: var(--color-primary);
}

.icon-sample__label {
  font-size: 0.8rem;
  color: var(--color-secondary);
}

/* ===== Typography ===== */
.specs {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.specs dt {
  color: var(--color-secondary);
}

.specs dd {
  overflow-wrap: anywhere;
}

.specimen p {
  margin-bottom: 0.4rem;
  line-height: 1.3;
}

.specimen__size {
  display: inline-block;
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: var(--color-secondary);
  opacity: 0.7;
}

/* ===== Scrollbar ===== */
.scroll-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  height: 180px;
  padding: 0.75rem;
  overflow-y: auto;
  border-radius: 8px;
  background: var(--color-background3);
}

.scroll-horizontal {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--color-background3);
}

.scroll-item {
  flex-shrink: 0;
  padding: 0.6rem;
  border-radius: 4px;
  background: var(--color-background2);
  color: var(--color-primary);
  text-align: center;
}

.scroll-item--horizontal {
  min-width: 120px;
  padding: 2.5rem 1rem;
}

/* ===== Cursor ===== */
.cursor-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  min-height: 110px;
  font: inherit;
  color: var(--color-primary);
  text-align: left;
}

.cursor-area__input {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem 0.6rem;
  border: 2px solid var(--color-background3);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-primary);
  font: inherit;
}

@media (max-width: 600px) {
  .header__title {
    font-size: 1.5rem;
  }

  .header__logo {
    width: 2rem;
    height: 2rem;
  }

  .module__key {
    margin-left: 0;
  }
}
</style>
