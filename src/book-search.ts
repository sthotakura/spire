// Search over the book's chapters: each chapter is split into sections at its headings, and a query matches a section when every word of it
// appears in the chapter title, the heading or the text. Plain substring matching; the index is built from the chapter sources at runtime.
export interface BookSection { chapter: string; chapterTitle: string; heading: string; id: string; text: string }
export interface BookHit { section: BookSection; snippet: string; score: number }

export const headingId = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Markdown that would only add noise to a match or a snippet.
const plainText = (markdown: string) => markdown
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*`]/g, '')
  .replace(/\|/g, ' ')
  .replace(/^[-: ]+$/gm, '')
  .replace(/\s+/g, ' ')
  .trim()

export function sectionsOf(chapter: string, chapterTitle: string, source: string): BookSection[] {
  const sections: BookSection[] = []
  let heading = chapterTitle
  let id = ''
  let lines: string[] = []
  let code = false
  const flush = () => {
    const text = plainText(lines.join('\n'))
    if (text || id) sections.push({ chapter, chapterTitle, heading, id, text })
    lines = []
  }
  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    if (/^```/.test(line.trim())) code = !code
    const match = code ? null : line.match(/^(##|###) (.+)/)
    if (match) {
      flush()
      heading = plainText(match[2])
      id = headingId(heading)
    } else if (!/^# /.test(line) || code) {
      lines.push(line)
    }
  }
  flush()
  return sections
}

const snippetAround = (text: string, words: string[]) => {
  const lower = text.toLowerCase()
  const at = Math.min(...words.map((word) => lower.indexOf(word)).filter((index) => index >= 0), text.length)
  if (at >= text.length) return text.slice(0, 140)
  const start = Math.max(0, at - 50)
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 150)}${start + 150 < text.length ? '…' : ''}`
}

export function searchBook(sections: BookSection[], query: string, limit = 12): BookHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const hits: BookHit[] = []
  for (const section of sections) {
    const heading = section.heading.toLowerCase()
    const title = section.chapterTitle.toLowerCase()
    const text = section.text.toLowerCase()
    if (!words.every((word) => heading.includes(word) || title.includes(word) || text.includes(word))) continue
    // A word in the heading counts most, then one in the chapter title, then one in the text.
    const score = words.reduce((total, word) => total + (heading.includes(word) ? 3 : 0) + (title.includes(word) ? 1 : 0) + (text.includes(word) ? 1 : 0), 0)
    hits.push({ section, snippet: snippetAround(section.text, words), score })
  }
  return hits.sort((left, right) => right.score - left.score).slice(0, limit)
}
