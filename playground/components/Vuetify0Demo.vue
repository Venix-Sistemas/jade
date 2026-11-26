<script setup lang="ts">
import { computed, ref } from 'vue'
import { Slider, useTheme } from '@vuetify/v0'

const v0 = useTheme()
const { theme } = useJade()

const volume = ref([60])

// The other mode of the applied theme, picked through Vuetify0: Jade follows
const sibling = computed(() => {
  const colors = theme.colors
  const group = Object.values(colors.groups).find(entry => Object.values(entry.variants).includes(theme.value.value))
  return Object.values(group?.variants ?? {}).find(id => id !== theme.value.value)
})

const names = ['primary', 'secondary', 'accent', 'success', 'error', 'surface']
</script>

<template>
  <div class="v0">
    <p class="v0__line">
      <code>useTheme().selectedId</code> = <strong>{{ v0.selectedId.value }}</strong>
    </p>

    <div class="v0__swatches">
      <span
        v-for="name in names"
        :key="name"
        class="v0__swatch"
        :style="{ background: `var(--v0-${name})`, color: `var(--v0-on-${name})` }"
      >{{ name }}</span>
    </div>

    <Slider.Root v-model="volume">
      <div class="v0__slider">
        <Slider.Track class="v0__track">
          <Slider.Range class="v0__range" />
        </Slider.Track>
        <Slider.Thumb
          class="v0__thumb"
          aria-label="Volume"
        />
      </div>
    </Slider.Root>

    <button
      v-if="sibling"
      type="button"
      class="v0__button"
      @click="v0.select(sibling)"
    >
      useTheme().select('{{ sibling }}')
    </button>
  </div>
</template>

<style scoped>
.v0 {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid var(--v0-divider);
  border-radius: 10px;
  background: var(--v0-surface);
  color: var(--v0-on-surface);
}

.v0__line { margin: 0; }
.v0__swatches { display: flex; flex-wrap: wrap; gap: 0.4rem; }

.v0__swatch {
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--v0-divider);
  border-radius: 999px;
  font-size: 0.8rem;
}

.v0__slider {
  position: relative;
  display: flex;
  align-items: center;
  height: 1.5rem;
}

.v0__track {
  position: relative;
  width: 100%;
  height: 0.4rem;
  border-radius: 1rem;
  background: var(--v0-divider);
}

.v0__range {
  position: absolute;
  height: 100%;
  border-radius: 1rem;
  background: var(--v0-primary);
}

.v0__thumb {
  position: absolute;
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid var(--v0-surface);
  border-radius: 50%;
  background: var(--v0-primary);
  transform: translateX(-50%);
}

.v0__button {
  align-self: flex-start;
  padding: 0.5rem 0.9rem;
  border: 0;
  border-radius: 8px;
  background: var(--v0-primary);
  color: var(--v0-on-primary);
  font: inherit;
}
</style>
