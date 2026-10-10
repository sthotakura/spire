<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const inBook = computed(() => route.path.startsWith('/book'))
</script>

<template>
  <header class="site-header">
    <RouterLink class="brand full" to="/" aria-label="Structured Products Interactive Reference — home"><span>S</span>tructured <span>P</span>roducts <span>I</span>nteractive <span>Re</span>ference</RouterLink>
    <RouterLink class="header-link" :to="inBook ? '/' : '/book'">{{ inBook ? 'Open the interactive builder' : 'Read the book' }}</RouterLink>
  </header>
</template>
