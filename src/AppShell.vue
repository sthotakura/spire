<script setup lang="ts">
import { KeepAlive } from 'vue'
import { RouterView } from 'vue-router'
import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
</script>

<template>
  <SiteHeader />
  <!-- Keep the builder alive so the reader's terms survive a visit to the book. -->
  <RouterView v-slot="{ Component }">
    <KeepAlive include="App">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <SiteFooter />
</template>
