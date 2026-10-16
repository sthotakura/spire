import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderTable } from './book-table'

const plain = (text: string) => text

describe('book tables', () => {
  it('renders a header, a separator and body rows, with each column aligned as the separator says', () => {
    const html = renderTable(['| Scenario | Payment |', '| :--- | ---: |', '| Called | 1,080 |', '| Not called | 1,000 |'], plain)
    expect(html).toBe('<div class="book-table-wrap"><table><thead><tr><th class="left">Scenario</th><th class="right">Payment</th></tr></thead><tbody><tr><td class="left">Called</td><td class="right">1,080</td></tr><tr><td class="left">Not called</td><td class="right">1,000</td></tr></tbody></table></div>')
  })

  it('applies inline formatting to each cell', () => {
    const html = renderTable(['| A |', '| --- |', '| x |'], (text) => `[${text}]`)
    expect(html).toContain('<td class="left">[x]</td>')
  })

  it('is not a table without a separator row, or when the separator has a different number of columns', () => {
    expect(renderTable(['| A | B |', '| x | y |'], plain)).toBeNull()
    expect(renderTable(['| A | B |', '| --- |', '| x | y |'], plain)).toBeNull()
    expect(renderTable(['| A | B |'], plain)).toBeNull()
  })

  it('leaves a missing cell empty', () => {
    expect(renderTable(['| A | B |', '| --- | --- |', '| x |'], plain)).toContain('<td class="left"></td>')
  })
})

// Every block of table lines in the book must render as a table, so a chapter is not published with its rows run together as text.
const bookDirectory = 'docs/book'
const chapters = readdirSync(bookDirectory).filter((file) => file.endsWith('.md'))

describe('the book chapters', () => {
  it.each(chapters)('%s has only tables that render', (file) => {
    const lines = readFileSync(`${bookDirectory}/${file}`, 'utf8').replaceAll('\r\n', '\n').split('\n')
    const blocks: string[][] = []
    let current: string[] | null = null
    for (const line of lines) {
      if (/^\|/.test(line.trim())) (current ??= []).push(line.trim())
      else if (current) { blocks.push(current); current = null }
    }
    if (current) blocks.push(current)
    for (const block of blocks) expect(renderTable(block, plain), block[0]).not.toBeNull()
  })
})
