<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

interface Chapter { slug: string; title: string; source: string }

const chapterSources = import.meta.glob<string>('../docs/book/*.md', { query: '?raw', import: 'default', eager: true })
const chapters: Chapter[] = Object.entries(chapterSources)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([path, source]) => ({
    slug: path.split('/').pop()!.replace(/\.md$/, ''),
    title: source.match(/^# (.+)/m)![1].trim(),
    source,
  }))
const imageUrls = import.meta.glob<string>(['../docs/book/charts/*.svg', '../docs/book/diagrams/*.svg'], { query: '?url', import: 'default', eager: true })
const route = useRoute()
const router = useRouter()

// An unknown or missing chapter in the address shows the first chapter.
const selectedSlug = computed(() => chapters.find(chapter => chapter.slug === route.params.slug)?.slug ?? chapters[0].slug)
const chapterPath = (slug: string) => `/book/${slug}`
const selectedChapter = computed(() => chapters.find(chapter => chapter.slug === selectedSlug.value)!)
const selectedIndex = computed(() => chapters.indexOf(selectedChapter.value))

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const inlineMarkdown = (value: string) => escapeHtml(value)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, href: string) => /^[\w-]+\.md$/.test(href)
    ? `<a href="${router.resolve(chapterPath(href.replace(/\.md$/, ''))).href}" data-chapter="${href.replace(/\.md$/, '')}">${text}</a>`
    : `<a href="${href}">${text}</a>`)
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
    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (!code && image) {
      flushParagraph(); flushList()
      const url = imageUrls[`../docs/book/${image[2]}`]
      if (url) output.push(`<figure class="book-figure"><img src="${url}" alt="${escapeHtml(image[1])}"><figcaption>${inlineMarkdown(image[1])}</figcaption></figure>`)
    } else if (/^```/.test(line.trim())) {
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

// A link to another chapter's file, as GitHub shows it, opens that chapter here.
const followChapterLink = (event: MouseEvent) => {
  const slug = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-chapter]')?.dataset.chapter
  if (!slug || !chapters.some(chapter => chapter.slug === slug)) return
  event.preventDefault()
  router.push(chapterPath(slug))
}
</script>

<template>
  <main class="book-shell">
    <div class="book-layout">
      <aside class="book-nav" aria-label="Book chapters">
        <p class="book-kicker">The SPIRe learning book</p>
        <h2>Contents</h2>
        <RouterLink v-for="(chapter, index) in chapters" :key="chapter.slug" :to="chapterPath(chapter.slug)" :class="{ active: chapter.slug === selectedSlug }" :aria-current="chapter.slug === selectedSlug ? 'page' : undefined">
          {{ index + 1 }}. {{ chapter.title }}
        </RouterLink>
      </aside>
      <div>
        <article class="book-article" v-html="renderedChapter" @click="followChapterLink" />
        <nav class="book-pagination" aria-label="Adjacent chapters">
          <RouterLink v-if="selectedIndex > 0" :to="chapterPath(chapters[selectedIndex - 1].slug)">← {{ chapters[selectedIndex - 1].title }}</RouterLink>
          <RouterLink v-if="selectedIndex < chapters.length - 1" :to="chapterPath(chapters[selectedIndex + 1].slug)">{{ chapters[selectedIndex + 1].title }} →</RouterLink>
        </nav>
      </div>
    </div>
    <footer class="book-footer">Synthetic examples · Public concepts · Not investment advice</footer>
  </main>
</template>
