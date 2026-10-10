import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const bookDirectory = 'docs/book'
const chapters = readdirSync(bookDirectory).filter(file => file.endsWith('.md'))

describe('book chapter links', () => {
  it.each(chapters)('%s links only to chapters that exist', (file) => {
    const source = readFileSync(`${bookDirectory}/${file}`, 'utf8')
    const targets = [...source.matchAll(/\]\(([\w-]+\.md)\)/g)].map(match => match[1])
    expect(targets.filter(target => !chapters.includes(target))).toEqual([])
  })

  it.each(chapters)('%s embeds only charts that exist', (file) => {
    const source = readFileSync(`${bookDirectory}/${file}`, 'utf8')
    const images = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])
    expect(images.filter(image => !existsSync(`${bookDirectory}/${image}`))).toEqual([])
  })
})
