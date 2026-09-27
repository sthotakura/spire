<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatNumber, parseNumber } from '../content/number-text'

// A number field that shows digit separators. While it has focus, the reader's text is left as typed.
const model = defineModel<number>({ required: true })
const text = ref(formatNumber(model.value))
const focused = ref(false)
watch(model, (value) => { if (!focused.value) text.value = formatNumber(value) })
const onInput = (event: Event) => {
  text.value = (event.target as HTMLInputElement).value
  model.value = parseNumber(text.value)
}
const onBlur = () => {
  focused.value = false
  if (Number.isFinite(model.value)) text.value = formatNumber(model.value)
}
</script>

<template>
  <input type="text" inputmode="decimal" autocomplete="off" :value="text" @input="onInput" @focus="focused = true" @blur="onBlur" />
</template>
