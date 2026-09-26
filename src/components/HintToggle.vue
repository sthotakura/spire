<script setup lang="ts">
defineProps<{ id: string; about: string; text: string; active: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button type="button" class="hint-button" :aria-label="`About ${about}`" :aria-controls="`${id}-hint`" :aria-expanded="active" @click="$emit('toggle')">ⓘ</button>
  <p v-if="active" :id="`${id}-hint`" class="hint-text" role="tooltip">{{ text }}</p>
</template>
