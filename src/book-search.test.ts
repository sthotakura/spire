import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { headingId, searchBook, sectionsOf } from './book-search'

const source = [
  '# Buffers',
  '',
  'A buffer absorbs the first losses, as the example shows.',
  '',
  '## The buffer in practice',
  '',
  'See [the barrier](other.md) for **comparison**.',
  '',
  '```',
  '## not a heading',
  '```',
  '',
  '### A worked example',
  '',
  'Principal is 1,000.',
].join('\n')

describe('book search', () => {
  const sections = sectionsOf('01-buffers', 'Buffers', source)

  it('splits a chapter at its second and third level headings, and leaves a fenced line alone', () => {
    expect(sections.map(({ heading, id }) => [heading, id])).toEqual([
      ['Buffers', ''],
      ['The buffer in practice', 'the-buffer-in-practice'],
      ['A worked example', 'a-worked-example'],
    ])
    expect(sections[1].text).toContain('not a heading')
  })

  it('reads link text, not the address, and drops emphasis marks', () => {
    expect(sections[1].text).toContain('See the barrier for comparison.')
    expect(sections[1].text).not.toContain('other.md')
  })

  it('needs every word, in any order, in any case', () => {
    expect(searchBook(sections, 'LOSSES first').map((hit) => hit.section.id)).toEqual([''])
    expect(searchBook(sections, 'losses worked')).toEqual([])
    expect(searchBook(sections, '   ')).toEqual([])
  })

  it('ranks a heading match above a text match, and shows the text around the match', () => {
    expect(searchBook(sections, 'example').map((hit) => hit.section.id)).toEqual(['a-worked-example', ''])
    expect(searchBook(sections, 'principal')[0].snippet).toBe('Principal is 1,000.')
  })

  it('makes an anchor from a heading', () => {
    expect(headingId('A digital return: the “floor”')).toBe('a-digital-return-the-floor')
  })

  it('finds a heading of the real book by its words', () => {
    const directory = 'docs/book'
    const all = readdirSync(directory).filter((name) => name.endsWith('.md')).flatMap((name) => {
      const text = readFileSync(`${directory}/${name}`, 'utf8')
      return sectionsOf(name.replace(/\.md$/, ''), text.match(/^# (.+)/m)![1].trim(), text)
    })
    expect(searchBook(all, 'digital return')[0].section.chapter).toMatch(/digital|payoff|12/)
  })
})
