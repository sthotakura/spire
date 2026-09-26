<script setup lang="ts">
import { nextTick } from 'vue'

const props = defineProps<{ tabs: ReadonlyArray<{ id: string; label: string }>; label: string }>()
const active = defineModel<string>({ required: true })

const activate = async (index: number) => {
  const tab = props.tabs[(index + props.tabs.length) % props.tabs.length]
  active.value = tab.id
  await nextTick()
  document.getElementById(`tab-${tab.id}`)?.focus()
}
const onKeydown = (event: KeyboardEvent, index: number) => {
  const target = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? props.tabs.length - 1 : null
  if (target === null) return
  event.preventDefault()
  activate(target)
}
</script>

<template>
  <div class="tabs">
    <div class="tablist" role="tablist" :aria-label="label">
      <button v-for="(tab, index) in tabs" :id="`tab-${tab.id}`" :key="tab.id" type="button" role="tab" :class="['tab', { active: active === tab.id }]" :aria-selected="active === tab.id" :aria-controls="`tabpanel-${tab.id}`" :tabindex="active === tab.id ? 0 : -1" @click="active = tab.id" @keydown="onKeydown($event, index)">{{ tab.label }}</button>
    </div>
    <div v-for="tab in tabs" v-show="active === tab.id" :id="`tabpanel-${tab.id}`" :key="tab.id" class="tabpanel" role="tabpanel" tabindex="0" :aria-labelledby="`tab-${tab.id}`">
      <slot :name="tab.id" />
    </div>
  </div>
</template>
