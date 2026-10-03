<script setup lang="ts">
import { computed, ref } from 'vue'

interface Chapter { slug: string; title: string; source: string }

const chapterSources = import.meta.glob<string>('../docs/book/*.md', { query: '?raw', import: 'default', eager: true })
const chapters: Chapter[] = Object.entries(chapterSources)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([path, source]) => ({
    slug: path.split('/').pop()!.replace(/\.md$/, ''),
    title: source.match(/^# (.+)/m)![1].trim(),
    source,
  }))
const appUrl = import.meta.env.BASE_URL

const selectedSlug = ref(chapters[0].slug)
const selectedChapter = computed(() => chapters.find(chapter => chapter.slug === selectedSlug.value) ?? chapters[0])
const selectedIndex = computed(() => chapters.indexOf(selectedChapter.value))

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const inlineMarkdown = (value: string) => escapeHtml(value)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')

const renderMarkdown = (source: string) => {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  const output: string[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let code: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`)
    list = []
  }
  const flushCode = () => {
    if (code) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
    code = null
  }

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      flushParagraph(); flushList()
      if (code) flushCode(); else code = []
    } else if (code) {
      code.push(line)
    } else if (/^### /.test(line)) {
      flushParagraph(); flushList(); output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`)
    } else if (/^## /.test(line)) {
      flushParagraph(); flushList(); output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`)
    } else if (/^# /.test(line)) {
      flushParagraph(); flushList(); output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`)
    } else if (/^- /.test(line)) {
      flushParagraph(); list.push(line.slice(2))
    } else if (!line.trim()) {
      flushParagraph(); flushList()
    } else if (list.length) {
      list[list.length - 1] += ` ${line.trim()}`
    } else {
      paragraph.push(line.trim())
    }
  }
  flushParagraph(); flushList(); flushCode()
  return output.join('\n')
}

const renderedChapter = computed(() => renderMarkdown(selectedChapter.value.source))
</script>

<template>
  <main class="book-shell">
    <header class="book-header">
      <a class="brand book-brand" :href="appUrl">SPI<span>Re</span></a>
      <span>Structured products, built from their parts.</span>
      <a :href="appUrl">Open the interactive reference →</a>
    </header>
    <div class="book-layout">
      <aside class="book-nav" aria-label="Book chapters">
        <p class="book-kicker">The SPIRe learning book</p>
        <h2>Contents</h2>
        <button v-for="(chapter, index) in chapters" :key="chapter.slug" :class="{ active: chapter.slug === selectedSlug }" :aria-current="chapter.slug === selectedSlug ? 'page' : undefined" @click="selectedSlug = chapter.slug">
          {{ index + 1 }}. {{ chapter.title }}
        </button>
      </aside>
      <div>
        <article class="book-article" v-html="renderedChapter" />
        <nav class="book-pagination" aria-label="Adjacent chapters">
          <button v-if="selectedIndex > 0" @click="selectedSlug = chapters[selectedIndex - 1].slug">← {{ chapters[selectedIndex - 1].title }}</button>
          <button v-if="selectedIndex < chapters.length - 1" @click="selectedSlug = chapters[selectedIndex + 1].slug">{{ chapters[selectedIndex + 1].title }} →</button>
        </nav>
      </div>
    </div>
    <footer class="book-footer">Synthetic examples · Public concepts · Not investment advice</footer>
  </main>
</template>
