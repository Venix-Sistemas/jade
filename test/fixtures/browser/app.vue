<template>
  <div>
    <VenixThemeSwitcher />
    <p id="state">
      {{ theme.value.value }}|{{ mode.value.value }}
    </p>
  </div>
</template>

<script setup>
const { theme, mode } = useVenixTheme()
</script>
