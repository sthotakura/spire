import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sampleBySlug, sampleProducts, sampleSlugIn } from './content/examples'

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

  // A link to a sample is written as its address on the published site, so it works outside the app too.
  const sampleLinks = chapters.flatMap(file => [...readFileSync(`${bookDirectory}/${file}`, 'utf8').matchAll(/\]\((https:\/\/sthotakura\.github\.io\/spire\/\?[^)]*)\)/g)].map(match => ({ file, href: match[1] })))

  it('links only to samples that exist', () => {
    expect(sampleLinks.filter(({ href }) => !sampleBySlug(sampleSlugIn(href)))).toEqual([])
  })

  it('links to every sample from a chapter', () => {
    const linked = new Set(sampleLinks.map(({ href }) => sampleSlugIn(href)))
    expect(sampleProducts.map(({ slug }) => slug).filter(slug => !linked.has(slug))).toEqual([])
  })
})
