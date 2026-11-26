<template>
  <aside
    v-if="base"
    ref="panelRef"
    class="venix-theme-lab"
    role="dialog"
    :aria-labelledby="`${panelId}-title`"
    :aria-busy="pending > 0"
    tabindex="-1"
  >
    <header class="venix-theme-lab__header">
      <div class="venix-theme-lab__titles">
        <strong
          :id="`${panelId}-title`"
          class="venix-theme-lab__title"
        >{{ text.title }}</strong>
        <span class="venix-theme-lab__subtitle">{{ editing }}</span>
      </div>
      <button
        type="button"
        class="venix-theme-lab__close"
        data-lab-control
        :aria-label="text.close"
        :title="text.close"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <div class="venix-theme-lab__body">
      <label class="venix-theme-lab__group">
        <span class="venix-theme-lab__legend">{{ text.theme }}</span>
        <select
          class="venix-theme-lab__select"
          :value="theme.preference.value"
          @change="theme.set(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="item in themes"
            :key="item.value"
            :value="item.value"
          >
            {{ item.name }}
          </option>
        </select>
      </label>

      <fieldset
        v-for="group in groups"
        :key="`${group.key}-${refusals}`"
        class="venix-theme-lab__group"
      >
        <legend class="venix-theme-lab__legend">
          {{ group.title }}
        </legend>
        <div class="venix-theme-lab__segments">
          <label
            v-for="option in group.options"
            :key="String(option.value)"
            class="venix-theme-lab__segment"
            data-lab-control
          >
            <input
              type="radio"
              class="venix-theme-lab__radio"
              :name="`${panelId}-${group.key}`"
              :checked="group.selected === option.value"
              @change="group.select(option.value)"
            >
            <span class="venix-theme-lab__segment-text">{{ option.label }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset
        v-for="section in colorSections"
        :key="section.title"
        class="venix-theme-lab__group"
      >
        <legend class="venix-theme-lab__legend">
          {{ section.title }}
        </legend>
        <div class="venix-theme-lab__colors">
          <label
            v-for="name in section.colors"
            :key="name"
            class="venix-theme-lab__color"
            data-lab-control
          >
            <input
              type="color"
              class="venix-theme-lab__swatch"
              :value="(picking[name] ?? shown[name]!).toLowerCase()"
              @input="pickColor(name, ($event.target as HTMLInputElement).value, false)"
              @change="pickColor(name, ($event.target as HTMLInputElement).value, true)"
              @blur="picking[name] = undefined"
            >
            <span class="venix-theme-lab__color-text">
              <span class="venix-theme-lab__color-name">{{ text[name] }}</span>
              <code class="venix-theme-lab__color-value">{{ shown[name] }}</code>
            </span>
          </label>
        </div>
      </fieldset>

      <textarea
        v-if="snippet"
        class="venix-theme-lab__snippet"
        readonly
        rows="12"
        :value="snippet"
        :aria-label="text.copy"
      />
    </div>

    <footer class="venix-theme-lab__footer">
      <p
        class="venix-theme-lab__status"
        role="status"
      >
        {{ status }}
      </p>

      <div
        v-if="needsConsent"
        class="venix-theme-lab__consent"
      >
        <span>{{ text.notSaved }}</span>
        <button
          type="button"
          class="venix-theme-lab__button venix-theme-lab__button--main"
          data-lab-control
          @click="saveChoices"
        >
          {{ text.save }}
        </button>
      </div>

      <div class="venix-theme-lab__actions">
        <!-- `aria-disabled`, not `disabled`: a focused button that gets
             disabled drops the focus -->
        <button
          type="button"
          class="venix-theme-lab__button"
          data-lab-control
          :aria-disabled="!lab.choices.value[id]"
          @click="restore(id)"
        >
          {{ text.reset }}
        </button>
        <button
          type="button"
          class="venix-theme-lab__button"
          data-lab-control
          :aria-disabled="!lab.customized.value"
          @click="restore()"
        >
          {{ text.resetAll }}
        </button>
        <button
          v-if="exportConfig"
          type="button"
          class="venix-theme-lab__button venix-theme-lab__button--wide"
          data-lab-control
          @click="copyConfig"
        >
          {{ text.copy }}
        </button>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
// The editor of `color.lab`: a drawer on the right of the screen, opened by the
// pencil of <JadeThemeSwitcher> and loaded only then. Its colors are the
// switcher's own neutral ones.
import { computed, onMounted, onUnmounted, reactive, ref, useId, watch } from 'vue'
import { useJade } from '../composables/useVenixTheme'
import { useThemeLab } from '../composables/useThemeLab'
import { LAB_COLORS, applyChoice, asHex, choiceOf } from '../../shared/lab/choice'
import { deriveSeeds } from '../../shared/utils/derive-seeds'
import type { LabChoice, LabColor } from '../../shared/lab/choice'
import type { ThemeMode } from '../../shared/types'

/** How long the color picker has to rest on a color before it is applied. */
const PICK_PAUSE = 350

const TEXT = {
  'en-US': {
    title: 'Customize colors', close: 'Close', theme: 'Theme', mode: 'Editing', light: 'Light', dark: 'Dark', surface: 'Surfaces', normal: 'Normal', bold: 'Bold', tint: 'Neutrals', gray: 'Gray', soft: 'Soft', vivid: 'Vivid', borders: 'Card outlines', bordered: 'Standard', quiet: 'Soft',
    brand: 'Brand', statusColors: 'Status', backgrounds: 'Backgrounds', primary: 'Primary', secondary: 'Secondary', accent: 'Accent', error: 'Error', info: 'Info', success: 'Success', warning: 'Warning', background: 'Background', background2: 'Background 2', background3: 'Background 3', working: 'Applying…', refused: 'Not applied: some text would be hard to read.', adjusted: 'Adjusted to {color}, the closest readable tone.', noTone: 'No readable tone close to this color was found.',
    notSaved: 'These colors won\'t be remembered.', save: 'Save', reset: 'Reset theme', resetAll: 'Reset all', copy: 'Copy configuration', copied: 'Configuration copied.',
  },
  'pt-BR': {
    title: 'Personalizar cores', close: 'Fechar', theme: 'Tema', mode: 'Editar o modo', light: 'Claro', dark: 'Escuro', surface: 'Superfícies', normal: 'Normal', bold: 'Bold', tint: 'Neutros', gray: 'Cinza', soft: 'Sutil', vivid: 'Vivid', borders: 'Borda dos cards', bordered: 'Padrão', quiet: 'Suave',
    brand: 'Cores da marca', statusColors: 'Cores de estado', backgrounds: 'Fundos', primary: 'Principal', secondary: 'Secundária', accent: 'Destaque', error: 'Erro', info: 'Informação', success: 'Sucesso', warning: 'Alerta', background: 'Fundo', background2: 'Fundo 2', background3: 'Fundo 3', working: 'Aplicando…', refused: 'Não aplicado: algum texto ficaria difícil de ler.', adjusted: 'Ajustado para {color}, o tom legível mais próximo.', noTone: 'Não há um tom legível perto dessa cor.',
    notSaved: 'Estas cores não serão lembradas.', save: 'Salvar', reset: 'Restaurar tema', resetAll: 'Restaurar todos', copy: 'Copiar configuração', copied: 'Configuração copiada.',
  },
  'es-ES': {
    title: 'Personalizar colores', close: 'Cerrar', theme: 'Tema', mode: 'Editar el modo', light: 'Claro', dark: 'Oscuro', surface: 'Superficies', normal: 'Normal', bold: 'Bold', tint: 'Neutros', gray: 'Gris', soft: 'Sutil', vivid: 'Vivid', borders: 'Borde de las tarjetas', bordered: 'Estándar', quiet: 'Suave',
    brand: 'Colores de marca', statusColors: 'Colores de estado', backgrounds: 'Fondos', primary: 'Principal', secondary: 'Secundario', accent: 'Acento', error: 'Error', info: 'Información', success: 'Éxito', warning: 'Aviso', background: 'Fondo', background2: 'Fondo 2', background3: 'Fondo 3', working: 'Aplicando…', refused: 'No aplicado: algún texto sería difícil de leer.', adjusted: 'Ajustado a {color}, el tono legible más cercano.', noTone: 'No hay un tono legible cerca de ese color.',
    notSaved: 'Estos colores no se recordarán.', save: 'Guardar', reset: 'Restaurar tema', resetAll: 'Restaurar todos', copy: 'Copiar configuración', copied: 'Configuración copiada.',
  },
}

defineProps<{
  /** Offers "Copy configuration", the `color.themes` snippet of the choices: for who builds the site. */
  exportConfig?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { theme, themes, mode, locale, persistence } = useJade()
const lab = useThemeLab()
const panelId = useId()
const panelRef = ref<HTMLElement | null>(null)

const text = computed(() => Object.fromEntries(
  Object.entries(TEXT['en-US']).map(([key, fallback]) => [key, locale.translate(
    Object.fromEntries(Object.entries(TEXT).map(([language, strings]) => [language, strings[key as keyof typeof strings]])),
    fallback,
  )]),
) as typeof TEXT['en-US'])

const status = ref('')
const snippet = ref('')
const pending = ref(0)
// A refused radio stays checked in the page: new elements show the ones in effect
const refusals = ref(0)

const id = computed(() => theme.value.value)
const base = computed(() => theme.colors.themes[id.value])
const current = computed<LabChoice>(() => lab.choices.value[id.value] ?? choiceOf(base.value!))

// The colors on screen: the theme's with the choice over them. A role the
// theme leaves out shows the one derived from its primary.
const shown = computed<Partial<Record<LabColor, string>>>(() => {
  const applied = applyChoice(base.value!, current.value)
  const dark = base.value!.dark === true
  const seeds = Object.fromEntries(LAB_COLORS.flatMap(name => applied[name] ? [[name, applied[name]!]] : []))
  const derived: Partial<Record<string, string>> = deriveSeeds(seeds, dark ? 'dark' : 'light')
  const fallback: Partial<Record<LabColor, string>> = { background: dark ? '#121212' : '#FFFFFF', primary: '#808080' }
  return Object.fromEntries(LAB_COLORS.flatMap((name) => {
    const color = asHex(applied[name]) ?? asHex(derived[name]) ?? fallback[name]
    return color ? [[name, color]] : []
  }))
})

// Grouped by what they are for; `background2`/`background3` only on a theme that has them
const colorSections = computed(() => ([
  { title: text.value.brand, colors: ['primary', 'secondary', 'accent'] },
  { title: text.value.statusColors, colors: ['error', 'info', 'success', 'warning'] },
  { title: text.value.backgrounds, colors: ['background', 'background2', 'background3'] },
] satisfies { title: string, colors: LabColor[] }[])
  .map(section => ({ ...section, colors: section.colors.filter(name => shown.value[name as LabColor]) as LabColor[] })))

const owner = computed(() => Object.entries(theme.colors.groups).find(([, group]) => Object.values(group.variants).includes(id.value))?.[0] ?? id.value)
const editing = computed(() => [theme.data.value?.value === owner.value ? theme.data.value.name : owner.value, text.value[mode.value.value]].join(' · '))

// One change at a time, in the order they were made, each over the one before
let queue: Promise<unknown> = Promise.resolve()

// Runs a change after the ones before it; `change` returns what to say about it
const enqueue = (change: (variant: string) => Promise<string>) => {
  const variant = id.value
  pending.value++
  status.value = text.value.working
  snippet.value = ''
  queue = queue.then(async () => {
    // Lets the status paint before the engine takes the thread
    await new Promise(resolve => setTimeout(resolve, 30))
    status.value = await change(variant)
  }).catch(() => {
    status.value = ''
  }).finally(() => {
    pending.value--
  })
}

const update = (change: Partial<LabChoice>) => enqueue(async (variant) => {
  const current = lab.choices.value[variant] ?? choiceOf(theme.colors.themes[variant]!)
  const lost = await lab.set(variant, { ...current, ...change })
  if (!lost.length) return ''
  refusals.value++
  return text.value.refused
})

// While the browser's color picker is open, its field keeps what the visitor
// is on: writing an adjusted tone back would move the picker under them
const picking = reactive<Partial<Record<LabColor, string>>>({})
let pickTimer: ReturnType<typeof setTimeout> | undefined
let requested = ''

// Applied as the visitor picks, once they pause; `done` when the picker closes
const pickColor = (name: LabColor, value: string, done: boolean) => {
  const color = value.toUpperCase()
  if (done) picking[name] = undefined
  else picking[name] = color
  clearTimeout(pickTimer)

  const request = () => {
    const key = `${id.value} ${name} ${color}`
    if (key === requested) return
    requested = key
    enqueue(async (variant) => {
      const applied = await lab.setColor(variant, name, color)
      if (!applied) return text.value.noTone
      return applied === color ? '' : text.value.adjusted.replace('{color}', applied)
    })
  }
  if (done) request()
  else pickTimer = setTimeout(request, PICK_PAUSE)
}

// Each mode is edited on its own, and shown while it is: only the ones the theme has
const sides = computed(() => (['light', 'dark'] as const)
  .filter(side => theme.colors.groups[owner.value]?.variants[side])
  .map(side => ({ value: side, label: text.value[side] })))

interface Group {
  key: string
  title: string
  selected: unknown
  options: { value: unknown, label: string }[]
  select: (value: unknown) => void
}

const choiceGroup = (key: 'bold' | 'tint' | 'borders', title: string, options: Group['options']): Group => ({
  key,
  title,
  options,
  selected: current.value[key],
  select: value => update({ [key]: value }),
})

const groups = computed<Group[]>(() => [
  { key: 'mode', title: text.value.mode, options: sides.value, selected: mode.value.value, select: value => mode.set(value as ThemeMode) },
  choiceGroup('bold', text.value.surface, [{ value: false, label: text.value.normal }, { value: true, label: text.value.bold }]),
  choiceGroup('tint', text.value.tint, [{ value: false, label: text.value.gray }, { value: true, label: text.value.soft }, { value: 'vivid', label: text.value.vivid }]),
  choiceGroup('borders', text.value.borders, [{ value: 'default', label: text.value.bordered }, { value: 'soft', label: text.value.quiet }]),
])

const needsConsent = computed(() => persistence.required && !persistence.hasConsent.value && lab.customized.value)

const saveChoices = () => {
  // The button leaves with the notice: focus moves first, or it is lost
  panelRef.value?.focus()
  persistence.grant()
}

const restore = (variant?: string) => {
  if (variant ? !lab.choices.value[variant] : !lab.customized.value) return
  snippet.value = ''
  status.value = ''
  requested = ''
  queue = queue.then(() => lab.reset(variant))
}

const copyConfig = async () => {
  const entries: Record<string, Record<string, object>> = {}
  for (const [variant, choice] of Object.entries(lab.choices.value)) {
    const found = Object.entries(theme.colors.groups).find(([, group]) => Object.values(group.variants).includes(variant))
    const name = found?.[0] ?? variant
    const side = found?.[1].variants.dark === variant ? 'dark' : 'light'
    const applied = applyChoice(theme.colors.themes[variant]!, choice)
    entries[name] ||= {}
    entries[name][side] = {
      // Only what was changed: the rest is the theme's already
      ...Object.fromEntries(LAB_COLORS.filter(color => choice.colors?.[color]).map(color => [color, applied[color]])),
      ...(choice.bold && { surfaces: 'bold' }),
      neutralTint: choice.tint,
      borders: choice.borders,
    }
  }
  const themes = Object.fromEntries(Object.entries(entries).map(([name, variants]) => [name, { tokens: true, ...variants }]))
  snippet.value = `color: {\n  themes: ${JSON.stringify(themes, null, 2).replaceAll('\n', '\n  ')},\n}`
  try {
    await navigator.clipboard.writeText(snippet.value)
    status.value = text.value.copied
  }
  catch { /* no clipboard access: the snippet is on screen to copy */ }
}

watch(id, () => {
  status.value = ''
  requested = ''
})

onUnmounted(() => clearTimeout(pickTimer))

onMounted(() => panelRef.value?.focus({ preventScroll: true }))
</script>

<style>
/* The switcher's rule applies here too: only its neutral `--venix-switcher-*`
   colors. The color fields show the color being edited, painted by the
   browser, and nothing else is colored. */
.venix-theme-lab {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  /* A strip of the page stays in sight on a phone, to see what changes */
  width: min(20rem, calc(100vw - 3rem));
  border-left: 1px solid var(--venix-switcher-border);
  background: var(--venix-switcher-bg);
  box-shadow: -8px 0 24px var(--venix-switcher-shadow);
  color: var(--venix-switcher-text);
  font-size: 0.875rem;
  line-height: 1.25;
  text-align: left;
}

.venix-theme-lab:focus {
  outline: none;
}

/* Header and footer stay; what is between them scrolls */
.venix-theme-lab__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 1rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--venix-switcher-border) transparent;
}

.venix-theme-lab__footer {
  padding: 0.75rem 1rem max(0.75rem, env(safe-area-inset-bottom));
  border-top: 1px solid var(--venix-switcher-separator);
}

.venix-theme-lab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--venix-switcher-separator);
}

.venix-theme-lab__titles {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.venix-theme-lab__title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.venix-theme-lab__subtitle {
  color: var(--venix-switcher-text-soft);
  font-size: 0.75rem;
}

.venix-theme-lab__close {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--venix-switcher-text);
  font: inherit;
  font-size: 1.375rem;
  cursor: pointer;
}

.venix-theme-lab__group {
  display: block;
  min-width: 0;
  margin: 1rem 0 0;
  padding: 0;
  border: 0;
}

.venix-theme-lab__legend {
  display: block;
  margin-bottom: 0.375rem;
  padding: 0;
  color: var(--venix-switcher-text-soft);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* One row of equal options, the selected one raised */
.venix-theme-lab__segments {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 0.125rem;
  padding: 0.125rem;
  border: 1px solid var(--venix-switcher-separator);
  border-radius: 0.625rem;
}

.venix-theme-lab__segment {
  position: relative;
  display: flex;
  cursor: pointer;
}

/* Hidden but focusable: the text next to it is what shows */
.venix-theme-lab__radio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

.venix-theme-lab__select {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--venix-switcher-border);
  border-radius: 0.625rem;
  background: var(--venix-switcher-bg);
  color: var(--venix-switcher-text);
  font: inherit;
  cursor: pointer;
}

.venix-theme-lab__segment-text {
  flex: 1;
  padding: 0.5rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  color: var(--venix-switcher-text-soft);
  text-align: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.venix-theme-lab__radio:checked + .venix-theme-lab__segment-text {
  border: 1px solid var(--venix-switcher-border);
  background: var(--venix-switcher-active);
  color: var(--venix-switcher-text);
  font-weight: 600;
}

.venix-theme-lab__select:focus-visible,
.venix-theme-lab__radio:focus-visible + .venix-theme-lab__segment-text {
  outline: 2px solid var(--venix-switcher-text);
  outline-offset: -2px;
}

.venix-theme-lab__colors {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.venix-theme-lab__color {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.venix-theme-lab__swatch {
  flex-shrink: 0;
  width: 3.25rem;
  height: 2.25rem;
  padding: 0.1875rem;
  border: 1px solid var(--venix-switcher-border);
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
}

.venix-theme-lab__swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}

.venix-theme-lab__swatch::-webkit-color-swatch {
  border: none;
  border-radius: 0.3125rem;
}

.venix-theme-lab__swatch::-moz-color-swatch {
  border: none;
  border-radius: 0.3125rem;
}

.venix-theme-lab__swatch:focus-visible {
  outline: 2px solid var(--venix-switcher-text);
  outline-offset: 2px;
}

.venix-theme-lab__color-text {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.venix-theme-lab__color-value {
  color: var(--venix-switcher-text-soft);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.75rem;
}

.venix-theme-lab__status {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  text-align: center;
}

.venix-theme-lab__status:empty {
  margin: 0;
}

.venix-theme-lab__consent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  font-size: 0.8125rem;
}

.venix-theme-lab__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.375rem;
}

.venix-theme-lab__button {
  padding: 0.5rem;
  border: 1px solid var(--venix-switcher-border);
  border-radius: 0.5rem;
  background: var(--venix-switcher-bg);
  color: var(--venix-switcher-text);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.venix-theme-lab__button--wide {
  grid-column: 1 / -1;
}

.venix-theme-lab__button--main {
  flex-shrink: 0;
  background: var(--venix-switcher-text);
  color: var(--venix-switcher-bg);
  font-weight: 600;
}

.venix-theme-lab__button:focus-visible,
.venix-theme-lab__close:focus-visible {
  outline: 2px solid var(--venix-switcher-text);
  outline-offset: 2px;
}

.venix-theme-lab__button[aria-disabled="true"] {
  border-style: dashed;
  color: var(--venix-switcher-text-soft);
  cursor: default;
}

@media (hover: hover) {
  .venix-theme-lab__segment:hover .venix-theme-lab__segment-text,
  .venix-theme-lab__color:hover,
  .venix-theme-lab__close:hover,
  .venix-theme-lab__button:not(.venix-theme-lab__button--main):not([aria-disabled="true"]):hover {
    background: var(--venix-switcher-hover);
    color: var(--venix-switcher-text);
  }

  .venix-theme-lab__segment:hover .venix-theme-lab__radio:checked + .venix-theme-lab__segment-text {
    background: var(--venix-switcher-active);
  }
}

/* Touch screens: bigger targets for a finger */
@media (pointer: coarse) {
  .venix-theme-lab__segment-text,
  .venix-theme-lab__button {
    padding-block: 0.625rem;
  }
}

.venix-theme-lab__snippet {
  display: block;
  width: 100%;
  margin-top: 1rem;
  padding: 0.375rem;
  border: 1px solid var(--venix-switcher-border);
  border-radius: 0.5rem;
  background: var(--venix-switcher-bg);
  color: var(--venix-switcher-text);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.6875rem;
}
</style>
