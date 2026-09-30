<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ id: string; about: string; text: string; active: boolean }>()
defineEmits<{ toggle: [] }>()

// A box of wrapped text keeps its full max-width even when every line ends sooner, which leaves a gap on the right.
// CSS cannot shrink it to the lines, so measure them once shown and fit the box to the longest.
const hint = ref<HTMLElement | null>(null)
watch(() => [props.active, props.text], async () => {
  await nextTick()
  const box = hint.value
  if (!box) return
  box.style.width = ''
  const range = document.createRange()
  range.selectNodeContents(box)
  const lines = Array.from(range.getClientRects())
  if (!lines.length) return
  const text = Math.max(...lines.map((line) => line.right)) - Math.min(...lines.map((line) => line.left))
  const style = getComputedStyle(box)
  const edges = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'] as const
  box.style.width = `${Math.ceil(text + edges.reduce((sum, edge) => sum + parseFloat(style[edge]), 0))}px`
}, { immediate: true })
</script>

<template>
  <button type="button" class="hint-button" :aria-label="`About ${about}`" :aria-controls="`${id}-hint`" :aria-expanded="active" @click="$emit('toggle')">ⓘ</button>
  <p v-if="active" :id="`${id}-hint`" ref="hint" class="hint-text" role="tooltip">{{ text }}</p>
</template>
