<script setup lang="ts">
const buildTimestampIso = __BUILD_TIMESTAMP__
const buildTimestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
}).format(new Date(buildTimestampIso))
</script>

<template>
  <footer class="site-footer">
    Built by <a href="https://www.linkedin.com/in/sureshthotakura/" target="_blank" rel="noopener noreferrer">Suresh Thotakura</a>
    <span aria-hidden="true">·</span>
    Build: <time :datetime="buildTimestampIso">{{ buildTimestamp }} UTC</time>
  </footer>
</template>
