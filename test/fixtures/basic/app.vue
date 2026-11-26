<template>
  <div>basic</div>
</template>

<script setup>
// The page uses the composable so the client bundle holds the module's real
// runtime (`useJade` and what it imports): the bundle test in
// `test/basic.test.ts` is only worth anything if that code is in it.
const { theme } = useJade()
useHead({ title: () => `basic ${theme.value.value}` })
</script>
