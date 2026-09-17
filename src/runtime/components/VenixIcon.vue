<template>
  <span
    v-if="resolved.kind === 'emoji'"
    class="venix-icon venix-icon--emoji"
    v-bind="$attrs"
  >{{ resolved.value }}</span>
  <!-- eslint-disable vue/no-v-html -- SVG comes from the theme config/consumer dev's props, not end-user input -->
  <span
    v-else-if="resolved.kind === 'svg'"
    class="venix-icon venix-icon--svg"
    v-bind="$attrs"
    v-html="resolved.value"
  />
  <!-- eslint-enable vue/no-v-html -->
  <Icon
    v-else
    class="venix-icon venix-icon--iconify"
    :name="resolved.value"
    :mode="mode"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVenixIcon } from '../composables/useVenixIcon'

defineOptions({ inheritAttrs: false })

const { icon, mode } = defineProps<{
  /** An emoji ('🎨'), an Iconify icon name ('line-md:home') or inline SVG. */
  icon: string
  /**
   * Forces `@nuxt/icon`'s rendering mode for Iconify icons: `'svg'` (a real
   * `<svg>` element — needed for animated icons like `line-md`) or `'css'`
   * (background/mask, lighter, no animation). No effect for emoji or inline
   * SVG. Without a value, uses the module's configured default mode.
   */
  mode?: 'css' | 'svg'
}>()

const resolved = useVenixIcon(computed(() => icon))
</script>

<style>
/* Inline SVG has no intrinsic size like emoji (font-size) or @nuxt/icon's
   <Icon> (its own width/height) — without this, some browsers collapse the
   width in flex layouts. */
.venix-icon--svg svg {
  width: 1em;
  height: 1em;
}
</style>
