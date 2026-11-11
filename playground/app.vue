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
          <div class="demo demo--tabs">
            <div class="tabs">
              <div
                class="tabs__list"
                role="tablist"
                :aria-label="$t('modules.color.title')"
              >
                <button
                  v-for="item in colorTabs"
                  :id="`color-tab-${item}`"
                  :key="item"
                  type="button"
                  role="tab"
                  class="tab"
                  :class="{ 'tab--active': colorTab === item }"
                  :aria-selected="colorTab === item"
                  :aria-controls="`color-panel-${item}`"
                  :tabindex="colorTab === item ? 0 : -1"
                  @click="colorTab = item"
                  @keydown="onTabKeydown"
                >
                  {{ $t(`color.tabs.${item}`) }}
                </button>
              </div>
              <span class="tabs__status">{{ currentThemeName }}</span>
              <button
                type="button"
                class="help"
                :aria-expanded="colorHelpOpen"
                :aria-label="$t('app.help')"
                @click="colorHelpOpen = !colorHelpOpen"
              >
                ?
              </button>
            </div>
            <p
              v-if="colorHelpOpen"
              class="tabs__help"
            >
              {{ $t(`color.help.${colorTab}`) }}
            </p>

            <!-- Theme and mode -->
            <div
              v-if="colorTab === 'theme'"
              id="color-panel-theme"
              role="tabpanel"
              aria-labelledby="color-tab-theme"
              class="panel panel--compact"
            >
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

              <!-- The original model's palette: one variable per color -->
              <h4 class="demo__label">
                {{ $t('color.palette') }}
              </h4>
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

              <p class="demo__status">
                {{ $t('color.applied') }} <code>data-theme="{{ theme.value.value }}"</code>
              </p>
            </div>

            <!-- Semantic tokens (experimental): a spec sheet -->
            <div
              v-else-if="colorTab === 'tokens'"
              id="color-panel-tokens"
              role="tabpanel"
              aria-labelledby="color-tab-tokens"
              class="panel"
            >
              <template v-if="!tokens.current.value">
                <p class="demo__status">
                  {{ $t('color.tokens.pick') }}
                </p>
                <div class="chips">
                  <button
                    v-for="item in tokenThemes"
                    :key="item.value"
                    type="button"
                    class="chip"
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

              <div
                v-else
                class="sheet"
              >
                <div
                  class="sheet__nav"
                  role="group"
                  :aria-label="$t('color.tabs.tokens')"
                >
                  <!-- Contrast first and apart: it is what the tokens are for, and the
                       count says at a glance whether every pair passes. -->
                  <button
                    type="button"
                    class="sheet__navitem sheet__navitem--featured"
                    :class="{ 'sheet__navitem--active': tokenView === 'contrast' }"
                    :aria-pressed="tokenView === 'contrast'"
                    @click="tokenView = 'contrast'"
                  >
                    <span>{{ $t('color.tokens.view.contrast') }}</span>
                    <span
                      class="sheet__count"
                      :class="contrastSummary.failed ? 'pairs__fail' : 'sheet__count--pass'"
                    >{{ contrastSummary.failed ? `✗ ${contrastSummary.failed}` : `✓ ${contrastSummary.total}` }}</span>
                  </button>
                  <hr class="sheet__divider">
                  <button
                    v-for="item in sheetNav"
                    :key="item.key"
                    type="button"
                    class="sheet__navitem"
                    :class="{ 'sheet__navitem--active': tokenView === item.key }"
                    :aria-pressed="tokenView === item.key"
                    @click="tokenView = item.key"
                  >
                    <span>{{ $t(`color.tokens.view.${item.key}`) }}</span>
                    <span
                      v-if="item.count"
                      class="sheet__count"
                    >{{ item.count }}</span>
                  </button>
                </div>

                <div class="sheet__body">
                  <!-- One group of tokens: swatch, variable, value and use -->
                  <template v-if="tokenView === 'neutral' || tokenView === 'primary' || tokenView === 'secondary'">
                    <div
                      v-for="token in tokenRows"
                      :key="token.name"
                      class="token-row"
                    >
                      <span
                        class="token-row__swatch"
                        :style="{ backgroundColor: token.value }"
                      />
                      <code class="token-row__name">{{ token.name }}</code>
                      <code class="token-row__value">{{ token.value }}</code>
                      <span class="token-row__use">{{ $t(`color.tokens.usage.${token.usage}`) }}</span>
                    </div>
                  </template>

                  <!-- The focus ring on each surface or component -->
                  <template v-else-if="tokenView === 'focus'">
                    <p class="sheet__caption">
                      {{ $t('color.tokens.focusHint') }}
                    </p>
                    <div class="focus-grid">
                      <div
                        v-for="tile in focusTiles"
                        :key="tile.name"
                        class="focus-tile"
                      >
                        <div
                          class="focus-tile__box"
                          :style="{ backgroundColor: tile.value }"
                        />
                        <code class="focus-tile__name">{{ tile.name }}</code>
                        <span :class="tile.pass ? 'pairs__pass' : 'pairs__fail'">{{ tile.ratio }}:1 {{ tile.pass ? '✓' : '✗' }}</span>
                      </div>
                    </div>
                  </template>

                  <!-- Contrast of the pairs -->
                  <template v-else-if="tokenView === 'contrast'">
                    <p class="sheet__caption">
                      {{ $t('color.tokens.pairsHint') }}
                    </p>
                    <div class="pairs-wrapper">
                      <table class="pairs">
                        <thead>
                          <tr>
                            <th />
                            <th>{{ $t('color.tokens.text') }}</th>
                            <th>{{ $t('color.tokens.surface') }}</th>
                            <th>{{ $t('color.tokens.ratio') }}</th>
                            <th>{{ $t('color.tokens.needs') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="row in tokenPairs"
                            :key="`${row.text}-${row.surface}`"
                            :class="{ 'pairs__row--original': row.original }"
                          >
                            <td>
                              <span
                                class="pairs__sample"
                                :style="{ color: row.textColor, backgroundColor: row.surfaceColor }"
                              >Aa</span>
                            </td>
                            <td><code>{{ row.text }}</code></td>
                            <td><code>{{ row.surface }}</code></td>
                            <td :class="row.pass ? 'pairs__pass' : 'pairs__fail'">
                              {{ row.ratio }}:1 {{ row.pass ? '✓' : '✗' }}
                            </td>
                            <td>{{ row.min }}:1</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>

                  <!-- The tokens in use -->
                  <div
                    v-else
                    class="token-use"
                  >
                    <div class="token-use__card">
                      <strong class="token-use__title">{{ $t('color.tokens.cardTitle') }}</strong>
                      <p class="token-use__body">
                        {{ $t('color.tokens.cardBody') }}<a
                          href="#color"
                          class="token-use__link"
                        >{{ $t('color.tokens.link') }}</a>.
                      </p>
                      <p class="token-use__muted">
                        {{ $t('color.tokens.muted') }}
                      </p>
                      <p class="token-use__disabled">
                        {{ $t('color.tokens.disabled') }}
                      </p>
                      <div class="token-use__row">
                        <span class="token-badge">{{ $t('color.tokens.badge') }}</span>
                        <span class="token-badge token-badge--secondary">{{ $t('color.tokens.badge') }}</span>
                      </div>
                    </div>
                    <div class="token-use__card">
                      <div class="token-use__row">
                        <button
                          type="button"
                          class="token-btn"
                        >
                          {{ $t('color.tokens.fill') }}
                        </button>
                        <button
                          type="button"
                          class="token-btn token-btn--secondary"
                        >
                          {{ $t('color.tokens.fillSecondary') }}
                        </button>
                        <button
                          type="button"
                          class="token-btn token-btn--outlined"
                        >
                          {{ $t('color.tokens.outlined') }}
                        </button>
                      </div>
                      <label class="token-use__field">
                        <span>{{ $t('color.tokens.field') }}</span>
                        <input
                          type="text"
                          :placeholder="$t('color.tokens.fieldPlaceholder')"
                        >
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Saving the choice (cookie consent) -->
            <div
              v-else
              id="color-panel-saving"
              role="tabpanel"
              aria-labelledby="color-tab-saving"
              class="panel"
            >
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
            </div>
          </div>
        </client-only>
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

      <!-- ===== Translation ===== -->
      <section
        id="translation"
        class="module"
      >
        <ModuleHeader
          id="translation"
          emoji="🌐"
        />

        <!-- Kept short: how it works with @nuxtjs/i18n is shown under Plugins. -->
        <div class="demo panel--compact">
          <h4 class="demo__label">
            {{ $t('translation.languageHeading') }}
          </h4>
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

          <client-only>
            <h4 class="demo__label">
              {{ $t('translation.namesHeading') }}
            </h4>
            <div class="chips">
              <span
                v-for="item in [...modes, ...themes]"
                :key="item.value"
                class="tag"
              >{{ item.name }}</span>
            </div>
          </client-only>
        </div>
      </section>

      <!-- ===== Plugins ===== -->
      <section
        id="plugins"
        class="module"
      >
        <ModuleHeader
          id="plugins"
          emoji="🧩"
          key-label="venixTheme.vuetify · venixTheme.icon · venixUnoPreset()"
        />

        <div class="demo-grid demo-grid--plugins">
          <!-- Vuetify: the color themes registered with it, and its colors kept in sync -->
          <article class="demo plugin">
            <header class="plugin__header">
              <span
                class="plugin__logo plugin__logo--letter"
                aria-hidden="true"
              >V</span>
              <div class="plugin__heading">
                <h3 class="plugin__title">
                  Vuetify
                </h3>
                <p class="plugin__tagline">
                  {{ $t('plugins.vuetify.tagline') }}
                </p>
              </div>
              <code class="plugin__option">vuetify: true</code>
            </header>

            <div class="plugin__stage">
              <v-card
                color="surface"
                variant="flat"
                border
                class="plugin__vcard"
              >
                <v-card-title>{{ $t('plugins.vuetify.cardTitle') }}</v-card-title>
                <v-card-text>{{ $t('plugins.vuetify.cardText') }}</v-card-text>
                <div class="plugin__chips">
                  <v-chip
                    v-for="name in vuetifyColors"
                    :key="name"
                    :color="name"
                    size="small"
                    variant="flat"
                  >
                    {{ name }}
                  </v-chip>
                </div>
                <v-text-field
                  :label="$t('plugins.vuetify.field')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="plugin__field"
                />
                <v-card-actions>
                  <!-- Filled, so the text on them is Vuetify's `on-primary` / `on-secondary`:
                       the tokens' on-colors on a theme with `tokens: true`. -->
                  <v-btn
                    color="primary"
                    variant="flat"
                  >
                    primary
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                  >
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
            </div>
          </article>

          <!-- UnoCSS: the preset's token classes, which are plain rules -->
          <article class="demo plugin">
            <header class="plugin__header">
              <span
                class="plugin__logo"
                aria-hidden="true"
              >⚡</span>
              <div class="plugin__heading">
                <h3 class="plugin__title">
                  UnoCSS
                </h3>
                <p class="plugin__tagline">
                  {{ $t('plugins.uno.tagline') }}
                </p>
              </div>
              <code class="plugin__option">venixUnoPreset()</code>
            </header>

            <div class="plugin__stage">
              <ul class="uno-list">
                <li
                  v-for="sample in unoSamples"
                  :key="sample.key"
                  class="uno-row"
                >
                  <span
                    class="uno-box"
                    :class="[sample.classes, { 'uno-box--outlined': sample.outlined }]"
                  >{{ $t(`plugins.uno.${sample.key}`) }}</span>
                  <code class="uno-code">{{ sample.classes }}</code>
                </li>
              </ul>
            </div>
            <p class="plugin__note">
              {{ $t('plugins.unoHint') }}
            </p>
          </article>

          <!-- Iconify: <VenixIcon> renders an emoji, an Iconify icon or an inline SVG -->
          <article class="demo plugin">
            <header class="plugin__header">
              <span
                class="plugin__logo plugin__logo--icon"
                aria-hidden="true"
              >
                <VenixIcon icon="line-md:loading-loop" />
              </span>
              <div class="plugin__heading">
                <h3 class="plugin__title">
                  Iconify
                </h3>
                <p class="plugin__tagline">
                  {{ $t('plugins.icon.tagline') }}
                </p>
              </div>
              <code class="plugin__option">icon: true</code>
            </header>

            <div class="plugin__stage">
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
          </article>

          <!-- i18n: the locale cookie shared with the theme module -->
          <article class="demo plugin">
            <header class="plugin__header">
              <span
                class="plugin__logo plugin__logo--letter"
                aria-hidden="true"
              >文</span>
              <div class="plugin__heading">
                <h3 class="plugin__title">
                  @nuxtjs/i18n
                </h3>
                <p class="plugin__tagline">
                  {{ $t('plugins.i18n.tagline') }}
                </p>
              </div>
              <code class="plugin__option">translation.cookieSync</code>
            </header>

            <div class="plugin__stage">
              <client-only>
                <dl class="specs specs--flush">
                  <dt>{{ $t('plugins.i18n.cookie') }}</dt>
                  <dd><code>i18n_redirected</code> = <strong>{{ i18nCookie }}</strong></dd>
                  <dt>{{ $t('plugins.i18n.app') }}</dt>
                  <dd><strong>{{ i18nLocale }}</strong></dd>
                  <dt>{{ $t('plugins.i18n.jade') }}</dt>
                  <dd><strong>{{ locale.current.value }}</strong></dd>
                </dl>
              </client-only>
            </div>
            <p class="plugin__note">
              {{ $t('plugins.i18n.note') }}
            </p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, h, defineComponent } from 'vue'

import { contrastRatio } from '../src/shared/utils/contrast'

const { theme, themes, mode, modes, locale, persistence, tokens } = useVenixTheme()

const { t, locale: i18nLocale, locales: availableLocales, setLocale: setI18nLocale } = useI18n()

useHead({
  title: 'Jade Playground',
  meta: [{ name: 'description', content: () => t('app.subtitle') }],
  link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
})

// The order of the sections below, and of the links at the top.
const modules = [
  { id: 'color', emoji: '🎨' },
  { id: 'cursor', emoji: '🖱️' },
  { id: 'scrollbar', emoji: '📜' },
  { id: 'typography', emoji: '🔤' },
  { id: 'translation', emoji: '🌐' },
  { id: 'plugins', emoji: '🧩' },
]

// The theme colors Vuetify gets, shown as chips.
const vuetifyColors = ['primary', 'secondary', 'accent', 'success', 'error']

// What the UnoCSS preset gives: the token classes (`jade-<token>`), which are
// plain rules, so they work here without any utility preset. They only have a
// value on a theme with tokens (every built-in one). Written out in full so
// UnoCSS finds them when it scans this file.
const unoSamples = [
  { key: 'card', classes: 'jade-bg-subtle jade-text' },
  { key: 'fill', classes: 'jade-fill-primary jade-on-primary' },
  { key: 'soft', classes: 'jade-bg-primary jade-text-primary' },
  { key: 'field', classes: 'jade-bg jade-text-muted jade-border-strong', outlined: true },
]

// Title, `venixTheme.<key>` badge and, behind a help button, the description of a module section.
const ModuleHeader = defineComponent({
  props: {
    id: { type: String, required: true },
    emoji: { type: String, required: true },
    // The badge on the right, `venixTheme.<id>` unless the section covers more than one module.
    keyLabel: { type: String, default: '' },
  },
  setup(props) {
    // The description is one click away, not always on screen.
    const open = ref(false)

    return () => h('header', { class: 'module__header' }, [
      h('h2', { class: 'module__title' }, [
        h('span', { 'aria-hidden': 'true' }, props.emoji),
        ` ${t(`modules.${props.id}.title`)}`,
        h('button', {
          'type': 'button',
          'class': 'help',
          'aria-expanded': open.value,
          'aria-label': t('app.help'),
          'onClick': () => { open.value = !open.value },
        }, '?'),
        h('code', { class: 'module__key' }, props.keyLabel || `venixTheme.${props.id}`),
      ]),
      // Component names go in as a parameter: written in the message itself,
      // vue-i18n warns about HTML in it (it's rendered as text either way).
      open.value ? h('p', { class: 'module__description' }, t(`modules.${props.id}.description`, { component: '<VenixIcon>' })) : null,
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
  await nextTick()
  readI18nCookie()
}

// The locale cookie both share (`translation.cookieSync`, `i18n_redirected` by default).
// Like the theme cookies, it is only written with consent.
const i18nCookie = ref('—')

const readI18nCookie = () => {
  const match = document.cookie.match(/(?:^|; )i18n_redirected=([^;]*)/)
  i18nCookie.value = match?.[1] ? decodeURIComponent(match[1]) : '—'
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
  readI18nCookie()

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

// ===== Tabs of the Colors module =====

const colorTabs = ['theme', 'tokens', 'saving'] as const
type ColorTab = typeof colorTabs[number]
const colorTab = ref<ColorTab>('theme')
const colorHelpOpen = ref(false)

// Arrow keys move between tabs, as in a tab list.
const onTabKeydown = (event: KeyboardEvent) => {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!step) return

  event.preventDefault()
  const next = colorTabs[(colorTabs.indexOf(colorTab.value) + step + colorTabs.length) % colorTabs.length]!
  colorTab.value = next
  nextTick(() => document.getElementById(`color-tab-${next}`)?.focus())
}

// ===== Semantic tokens (experimental) =====

// The themes with `tokens: true`, to offer when the current one has none.
const tokenThemes = computed(() => themes.value.filter(item => theme.colors.groups[item.value]?.tokens === true))

const FOCUS_TOKEN = 'border-focus'

type TokenView = 'neutral' | 'primary' | 'secondary' | 'focus' | 'contrast' | 'use'
const tokenView = ref<TokenView>('contrast')

// The current theme's tokens, split by role: neutral ones first, then each role.
// `usage` is the translation key of the token's one-line description.
interface TokenEntry { name: string, value: string, usage: string }
const tokenGroups = computed(() => {
  const groups: Record<'neutral' | 'primary' | 'secondary', TokenEntry[]> = { neutral: [], primary: [], secondary: [] }
  const current = tokens.current.value
  if (!current) return groups

  let focusEntry: TokenEntry | undefined
  for (const [name, value] of Object.entries(current)) {
    // `border-focus` has no role in its name, but its color is the primary's
    // (step 11), so it is listed with the Primary tokens, after the others.
    const role = FOCUS_TOKEN === name || /(?:^|-)primary(?:-|$)/.test(name) ? 'primary' : /(?:^|-)secondary(?:-|$)/.test(name) ? 'secondary' : 'neutral'
    const short = role === 'neutral' ? name : name.replace(`-${role}`, '')
    const entry = { name: `--jade-${name}`, value, usage: `${role === 'neutral' ? 'neutral' : 'role'}.${short}` }
    if (name === FOCUS_TOKEN) focusEntry = entry
    else groups[role].push(entry)
  }
  if (focusEntry) groups.primary.push(focusEntry)

  return groups
})

const tokenRows = computed(() => {
  const view = tokenView.value
  return view === 'neutral' || view === 'primary' || view === 'secondary' ? tokenGroups.value[view] : []
})

const TEXT_MIN = 4.5
const OUTLINE_MIN = 3

// What the focus ring can sit against: the surfaces, then the components of each
// role. The ring is drawn right on the edge of its tile, so what it has to stand
// out from is the tile's own color.
const FOCUS_CONTEXTS = ['bg', 'bg-subtle', 'bg-muted', 'bg-primary', 'fill-primary', 'bg-secondary', 'fill-secondary']

// Truncated, not rounded, so 4.496 never reads as a pass against 4.5.
const formatRatio = (ratio: number) => (Math.floor(ratio * 100) / 100).toFixed(2)

const focusTiles = computed(() => {
  const current = tokens.current.value
  const ring = current?.[FOCUS_TOKEN]
  if (!current || !ring) return []

  return FOCUS_CONTEXTS
    .filter(name => current[name])
    .map((name) => {
      const ratio = contrastRatio(ring, current[name]!)
      return { name: `--jade-${name}`, value: current[name]!, ratio: formatRatio(ratio), pass: ratio >= OUTLINE_MIN }
    })
})

// Token pairs worth showing, as [text or outline, what it sits on, the minimum].
const TOKEN_PAIRS: Array<[string, string, number]> = [
  ['text', 'bg', TEXT_MIN],
  ['text-muted', 'bg-muted', TEXT_MIN],
  ['text-primary', 'bg', TEXT_MIN],
  ['text-primary', 'bg-primary', TEXT_MIN],
  ['text-primary-strong', 'bg-primary-active', TEXT_MIN],
  ['on-primary', 'fill-primary', TEXT_MIN],
  ['on-primary', 'fill-primary-hover', TEXT_MIN],
  ['text-secondary', 'bg-secondary', TEXT_MIN],
  ['on-secondary', 'fill-secondary', TEXT_MIN],
  ['border-strong', 'bg', OUTLINE_MIN],
  ['border-focus', 'bg-subtle', OUTLINE_MIN],
]

// The original model's pair first (`primary` text on the `background`), so the
// page shows the contrast problem the tokens solve, then the token pairs.
const tokenPairs = computed(() => {
  const current = tokens.current.value
  if (!current) return []

  const rows: Array<{ text: string, surface: string, textColor: string, surfaceColor: string, min: number, original?: boolean }> = []
  const original = theme.colors.themes[theme.value.value]
  if (original?.primary && original.background) {
    rows.push({ text: '--color-primary', surface: '--color-background', textColor: original.primary, surfaceColor: original.background, min: TEXT_MIN, original: true })
  }
  for (const [text, surface, min] of TOKEN_PAIRS) {
    const textColor = current[text]
    const surfaceColor = current[surface]
    if (textColor && surfaceColor) rows.push({ text: `--jade-${text}`, surface: `--jade-${surface}`, textColor, surfaceColor, min })
  }

  return rows.map((row) => {
    const ratio = contrastRatio(row.textColor, row.surfaceColor)
    return { ...row, ratio: formatRatio(ratio), pass: ratio >= row.min }
  })
})

// The views after Contrast, which has its own button at the top of the list.
const sheetNav = computed(() => [
  { key: 'neutral', count: tokenGroups.value.neutral.length },
  { key: 'primary', count: tokenGroups.value.primary.length },
  { key: 'secondary', count: tokenGroups.value.secondary.length },
  { key: 'focus', count: focusTiles.value.length },
  { key: 'use', count: 0 },
] as const)

// How many of the token pairs fall short, for the Contrast button. The original
// model's row doesn't count: it is there to show the problem the tokens solve.
const contrastSummary = computed(() => {
  const rows = tokenPairs.value.filter(row => !row.original)
  return { total: rows.length, failed: rows.filter(row => !row.pass).length }
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
/* The playground's own colors. Each one is a semantic token with the original
   variable as its fallback, so on a theme with `tokens: true` the whole page
   uses the tokens (legible by construction) and on every other theme it looks
   as it always did. */
:root {
  --pg-bg: var(--jade-bg, var(--color-background));
  --pg-surface: var(--jade-bg-subtle, var(--color-background2));
  --pg-surface-muted: var(--jade-bg-muted, var(--color-background3));
  --pg-border: var(--jade-border, var(--color-background3));
  --pg-field-border: var(--jade-border-strong, var(--color-background3));
  /* Text keeps the original Venix page's colors: primary for the main text and
     titles, secondary for the supporting text and labels. On a token theme the
     primary text is the seed itself (\`fill-primary\`), which passes AA on \`bg\`,
     \`bg-subtle\` and \`bg-muted\` with these seeds. The secondary seed only does so
     in dark mode (orange on a light background can't), so in light mode it is
     \`text-secondary\`, the step built for that. \`light-dark()\` follows the
     \`color-scheme\` each theme sets. */
  --pg-text: var(--jade-fill-primary, var(--color-primary));
  --pg-text-muted: light-dark(var(--jade-text-secondary, var(--color-secondary)), var(--jade-fill-secondary, var(--color-secondary)));
  --pg-title: var(--pg-text);
  --pg-label: var(--pg-text-muted);
  /* Fading text with `opacity` would take it below AA on a token theme. The
     value is a number on the other themes; on a token theme `--jade-bg` is a
     color, so `opacity: var(--pg-dim-*)` is invalid there and falls back to 1. */
  --pg-dim-label: var(--jade-bg, 0.8);
  --pg-dim-hint: var(--jade-bg, 0.85);
  --pg-dim-size: var(--jade-bg, 0.7);
  --pg-link: var(--pg-text);
  --pg-accent: var(--jade-fill-primary, var(--color-primary));
  --pg-on-accent: var(--jade-on-primary, var(--color-background));
}
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
  background: var(--pg-bg);
  color: var(--pg-text);
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
  background: var(--pg-surface);
}

.header__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 2rem;
  margin-bottom: 0.25rem;
  color: var(--pg-title);
}

.header__logo {
  width: 2.75rem;
  height: 2.75rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}

.header__subtitle {
  color: var(--pg-label);
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
  background: var(--pg-surface);
  border-top: 1px solid var(--pg-border);
  border-bottom: 1px solid var(--pg-border);
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
  border: 1px solid color-mix(in srgb, var(--pg-accent) 18%, transparent);
  border-radius: 999px;
  /* A light wash of the theme's primary color, so links read as buttons */
  background: color-mix(in srgb, var(--pg-accent) 8%, transparent);
  /* On a token theme, `text-primary`: the seed itself falls just short of AA on
     its own wash in light mode. */
  color: var(--jade-text-primary, var(--pg-link));
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.module-nav__link:hover,
.module-nav__link:focus-visible {
  background: color-mix(in srgb, var(--pg-accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--pg-accent) 35%, transparent);
  /* The stronger step on the stronger wash (token themes only). */
  color: var(--jade-text-primary-strong, var(--jade-text-primary, var(--pg-link)));
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
  border-bottom: 2px solid var(--pg-border);
}

.module__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.4rem;
  color: var(--pg-title);
}

.module__key {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: var(--pg-surface-muted);
  color: var(--pg-text-muted);
  font-size: 0.75rem;
  font-weight: normal;
}

.module__description {
  margin-top: 0.25rem;
  color: var(--pg-text-muted);
  font-size: 0.9rem;
}

.demo {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: var(--pg-surface);
  border: 1px solid var(--pg-border);
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
  color: var(--pg-label);
}

.demo__label {
  margin: 0.75rem 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-label);
  opacity: var(--pg-dim-label);
}

.demo__hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--pg-text-muted);
  opacity: var(--pg-dim-hint);
}

.demo__status {
  margin: 0.6rem 0;
  font-size: 0.85rem;
  color: var(--pg-text-muted);
}

.demo__status code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--pg-surface-muted);
  color: var(--pg-link);
}

/* The Theme panel keeps its groups close together: it holds the most controls of the page. */
.panel--compact .demo__label {
  margin: 0.5rem 0 0.25rem;
}

.panel--compact .demo__label:first-child {
  margin-top: 0;
}

.panel--compact .chips {
  gap: 0.35rem;
}

.panel--compact .chip {
  padding: 0.3rem 0.7rem;
  font-size: 0.85rem;
}

.panel--compact .demo__status {
  margin: 0.5rem 0 0;
}

.panel--compact .tag {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
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
  border: 2px solid var(--pg-border);
  border-radius: 8px;
  background: transparent;
  color: var(--pg-text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--pg-accent);
}

.chip--active {
  border-color: var(--pg-accent);
  background: var(--pg-accent);
  color: var(--pg-on-accent);
}

.chip--outline {
  border-style: dashed;
  color: var(--pg-text-muted);
}

.chip--success {
  color: var(--color-success, var(--color-primary));
  border-color: var(--color-success, var(--pg-border));
}

.chip--success:hover {
  background: var(--color-success, var(--color-primary));
  color: var(--color-background);
}

.chip--error {
  color: var(--color-error, var(--color-primary));
  border-color: var(--color-error, var(--pg-border));
}

.chip--error:hover {
  background: var(--color-error, var(--color-primary));
  color: var(--color-background);
}

.tag {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--pg-surface-muted);
  font-size: 0.85rem;
}

/* ===== Colors ===== */
.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 0.35rem;
}

.color-card {
  padding: 0.3rem;
  border-radius: 8px;
  background: var(--pg-surface-muted);
  text-align: center;
}

.color-card__swatch {
  height: 26px;
  margin-bottom: 0.2rem;
  border-radius: 6px;
  border: 2px solid var(--pg-border);
}

.color-card__name {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.7rem;
  color: var(--pg-text-muted);
}

.color-card__value {
  font-size: 0.65rem;
  color: var(--pg-link);
}

/* ===== Plugins: one card per integration ===== */
.demo-grid--plugins {
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
}

.plugin {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem;
}

.plugin__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plugin__logo {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  background: var(--pg-surface-muted);
  font-size: 1.3rem;
}

.plugin__heading {
  flex: 1;
  min-width: 0;
}

.plugin__title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--pg-title);
}

.plugin__tagline {
  margin: 0.1rem 0 0;
  font-size: 0.8rem;
  color: var(--pg-text-muted);
}

/* What turns the integration on, as it is written in the config. */
.plugin__option {
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: var(--pg-surface-muted);
  color: var(--pg-link);
  font-size: 0.75rem;
  white-space: nowrap;
}

/* The example sits on the page's own background, like a preview canvas. */
.plugin__stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 1rem;
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  background: var(--pg-bg);
}

.plugin__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
}

.plugin__chips .v-chip {
  padding-inline: 0.8rem;
}

/* An Iconify icon as the logo. */
.plugin__logo--icon {
  color: var(--pg-link);
  font-size: 1.5rem;
}

.specs--flush {
  margin-bottom: 0;
}

/* The icon samples in an even grid inside the card, labels centered under each. */
.plugin__stage .icon-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: 1rem 0.75rem;
}

.plugin__stage .icon-sample__label {
  text-align: center;
}

/* The letter that stands for Vuetify, in place of an emoji. */
.plugin__logo--letter {
  color: var(--pg-link);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1;
}

/* The card Vuetify draws. Its spacing is set here: the playground doesn't load
   Vuetify's utility classes (`pa-4`, `mt-4`…), so a class like that does nothing. */
.plugin__vcard {
  padding: 1.25rem;
  border-radius: 12px;
}

.plugin__vcard .v-card-title {
  padding: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.plugin__vcard .v-card-text {
  padding: 0.4rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.plugin__vcard .plugin__field {
  margin-top: 1.1rem;
}

.plugin__vcard .v-card-actions {
  gap: 0.5rem;
  min-height: 0;
  padding: 1.1rem 0 0;
}

.plugin__note {
  margin: 0;
  font-size: 0.8rem;
  color: var(--pg-text-muted);
}

/* ===== Plugins: the UnoCSS samples ===== */
.uno-list {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uno-row {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.uno-box {
  padding: 0.4rem 0.75rem;
  /* An outline, not a border: it keeps the sample visible on the page's own
     surface without touching the border the `jade-border-strong` sample sets. */
  outline: 1px solid var(--pg-border);
  border-radius: 8px;
  font-size: 0.85rem;
  text-align: center;
}

/* Width and style only: the color comes from the `jade-border-strong` class. */
.uno-box--outlined {
  border-width: 2px;
  border-style: solid;
}

.uno-code {
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: var(--pg-surface-muted);
  font-size: 0.75rem;
  color: var(--pg-link);
  overflow-wrap: anywhere;
}

/* ===== Semantic tokens (experimental) ===== */
/* ===== Tabs (Colors module) ===== */
.tabs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--pg-border);
}

.tabs__list {
  display: flex;
  flex: 1;
  gap: 0.35rem;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

/* Bigger and bolder than the rest of the panel, so the tabs read as the way in. */
.tab {
  padding: 0.6rem 1rem;
  border: 0;
  border-bottom: 3px solid transparent;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: var(--pg-text-muted);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: var(--pg-surface-muted);
  color: var(--pg-text);
}

.tab--active {
  border-bottom-color: var(--pg-accent);
  background: var(--pg-surface-muted);
  color: var(--pg-link);
}

.tabs__status {
  font-size: 0.8rem;
  color: var(--pg-text-muted);
  white-space: nowrap;
}

.tabs__help {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: var(--pg-text-muted);
}

/* The "?" that shows the text behind a header or a tab bar. */
.help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border: 1px solid var(--pg-border);
  border-radius: 50%;
  background: transparent;
  color: var(--pg-text-muted);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.help:hover,
.help[aria-expanded='true'] {
  border-color: var(--pg-accent);
  color: var(--pg-link);
}

.tab:focus-visible,
.help:focus-visible,
.sheet__navitem:focus-visible {
  outline: 2px solid var(--pg-accent);
  outline-offset: 2px;
}

/* ===== Spec sheet (semantic tokens) ===== */
.sheet {
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: 1.25rem;
}

.sheet__nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sheet__navitem {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pg-text-muted);
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}

.sheet__navitem:hover,
.sheet__navitem--active {
  background: var(--pg-surface-muted);
}

.sheet__navitem--active {
  color: var(--pg-text);
}

.sheet__count {
  font-size: 0.75rem;
  color: var(--pg-text-muted);
}

/* Contrast: the button that stands apart from the token lists. */
.sheet__navitem--featured {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--pg-border);
  border-left: 3px solid var(--pg-accent);
  color: var(--pg-text);
  font-weight: 600;
}

.sheet__navitem--featured .sheet__count {
  font-weight: 600;
}

.sheet__count--pass {
  color: var(--pg-link);
}

.sheet__divider {
  width: 100%;
  height: 1px;
  margin: 0.4rem 0;
  border: 0;
  background: var(--pg-border);
}

.sheet__body {
  min-width: 0;
}

.sheet__caption {
  margin: 0 0 0.6rem;
  font-size: 0.8rem;
  color: var(--pg-text-muted);
}

/* One token per row: swatch, variable, value and a few words of use. */
.token-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 16rem) 5.5rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--pg-border);
  font-size: 0.8rem;
}

.token-row:last-child {
  border-bottom: 0;
}

.token-row__swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--pg-border);
  border-radius: 6px;
}

.token-row__name {
  color: var(--pg-text);
  overflow-wrap: anywhere;
}

.token-row__value,
.token-row__use {
  color: var(--pg-text-muted);
}

@media (max-width: 720px) {
  .sheet {
    grid-template-columns: minmax(0, 1fr);
  }

  .sheet__nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .token-row {
    grid-template-columns: 22px minmax(0, 1fr) 5.5rem;
  }

  .token-row__use {
    grid-column: 2 / -1;
  }
}

.pairs-wrapper {
  overflow-x: auto;
}

.pairs {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.pairs th,
.pairs td {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--pg-border);
  text-align: left;
  white-space: nowrap;
}

.pairs th {
  font-weight: 600;
  color: var(--pg-text-muted);
}

.pairs__sample {
  display: inline-block;
  min-width: 2.5rem;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--pg-border);
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
}

.pairs__row--original td {
  background: var(--pg-surface-muted);
}

.pairs__pass {
  color: var(--pg-text);
}

/* Bold and underlined, not just another color: the page's own text is already red. */
.pairs__fail {
  font-weight: 700;
  text-decoration: underline;
}

.token-use {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

/* Built straight from the tokens: this block only renders on a token theme. */
.token-use__card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--jade-border);
  border-radius: 12px;
  background: var(--jade-bg);
  color: var(--jade-text);
}

.token-use__title {
  font-size: 1rem;
}

.token-use__body,
.token-use__muted,
.token-use__disabled {
  margin: 0;
  font-size: 0.875rem;
}

.token-use__link {
  color: var(--jade-text-primary);
}

.token-use__muted {
  color: var(--jade-text-muted);
}

.token-use__disabled {
  color: var(--jade-text-disabled);
}

.token-use__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.token-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--jade-bg-primary);
  color: var(--jade-text-primary);
  font-size: 0.8rem;
}

.token-badge--secondary {
  background: var(--jade-bg-secondary);
  color: var(--jade-text-secondary);
}

.token-btn {
  padding: 0.45rem 0.9rem;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--jade-fill-primary);
  color: var(--jade-on-primary);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.token-btn:hover {
  background: var(--jade-fill-primary-hover);
}

.token-btn:focus-visible,
.token-use__field input:focus-visible {
  outline: 2px solid var(--jade-border-focus);
  outline-offset: 2px;
}

.token-btn--secondary {
  background: var(--jade-fill-secondary);
  color: var(--jade-on-secondary);
}

.token-btn--secondary:hover {
  background: var(--jade-fill-secondary-hover);
}

.token-btn--outlined {
  border-color: var(--jade-border-primary-strong);
  background: transparent;
  color: var(--jade-text-primary);
}

.token-btn--outlined:hover {
  background: var(--jade-bg-primary-hover);
}

.token-use__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--jade-text-muted);
}

.token-use__field input {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--jade-border-strong);
  border-radius: 8px;
  background: var(--jade-bg);
  color: var(--jade-text);
  font: inherit;
}

/* The focus ring on each surface or component: drawn on the tile's own edge,
   with no offset, which is the worst case for the ring. */
.focus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  background: var(--jade-bg);
}

.focus-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.75rem;
}

.focus-tile__box {
  height: 44px;
  margin: 3px;
  border-radius: 10px;
  outline: 3px solid var(--jade-border-focus);
}

.focus-tile__name {
  font-size: 0.68rem;
  color: var(--pg-text);
  overflow-wrap: anywhere;
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
  color: var(--pg-link);
}

.icon-sample__label {
  font-size: 0.8rem;
  color: var(--pg-text-muted);
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
  color: var(--pg-text-muted);
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
  color: var(--pg-text-muted);
  opacity: var(--pg-dim-size);
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
  background: var(--pg-surface-muted);
}

.scroll-horizontal {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--pg-surface-muted);
}

.scroll-item {
  flex-shrink: 0;
  padding: 0.6rem;
  border-radius: 4px;
  background: var(--pg-surface);
  color: var(--pg-link);
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
  color: var(--pg-link);
  text-align: left;
}

.cursor-area__input {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem 0.6rem;
  border: 2px solid var(--pg-field-border);
  border-radius: 8px;
  background: var(--pg-bg);
  color: var(--pg-text);
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
