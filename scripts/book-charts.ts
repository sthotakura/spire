// Draws the payoff charts in docs/book/charts from the running app, so they follow the charting code.
// Run with `npm run book-charts`. Each chart is the app's own SVG with its styles written inline, so it stands alone.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium, type Page } from 'playwright'
import { createServer } from 'vite'

interface BookChart {
  file: string
  // The chart's accessible title, shown as its caption in the book.
  title: string
  wrapper?: 'deposit'
  // Features to add, by the name on the menu.
  features: RegExp[]
  // Values for the inputs, by id, set in order after the features exist.
  values: Record<string, string>
}

const charts: BookChart[] = [
  { file: 'participation', title: 'Payoff with 150% upside and 100% downside participation', features: [/^Downside participation/, /^Upside participation/], values: { 'rate-upside': '150', 'final-level': '110' } },
  { file: 'principal-protection', title: 'Payoff with 100% downside participation and a 90% protection floor', features: [/^Downside participation/, /^Principal protection/], values: { 'rate-protection': '90', 'final-level': '80' } },
  { file: 'cap', title: 'Payoff with 150% upside participation and a 20% cap', features: [/^Upside participation/, /^Cap/], values: { 'rate-upside': '150', 'rate-cap': '20', 'final-level': '120' } },
  { file: 'buffer', title: 'Payoff with a 10% buffer and 100% downside participation', features: [/^Downside participation/, /^Buffer/], values: { 'rate-buffer': '10', 'final-level': '85' } },
  { file: 'barrier-final', title: 'Payoff with a 70% downside barrier observed on the final date', features: [/^Downside participation/, /^Downside barrier/], values: { 'rate-barrier': '70', 'final-level': '69' } },
  { file: 'barrier-daily', title: 'Payoff with a 70% downside barrier observed on every close, after a close at 65', features: [/^Downside participation/, /^Downside barrier/], values: { 'rate-barrier': '70', 'barrier-observation': 'daily-close', 'final-level': '80', 'lowest-close': '65' } },
  { file: 'upside-barrier', title: 'Payoff with 80% upside participation, a 130% upside barrier and a 2% rebate', features: [/^Principal protection/, /^Upside participation/, /^Upside barrier/, /^Rebate/], values: { 'rate-upside': '80', 'rate-upside-barrier': '130', 'rate-rebate': '2', 'rate-protection': '100', 'final-level': '120' } },
  { file: 'absolute-return', title: 'Payoff with a 15% buffer and 100% absolute return on a fall', features: [/^Downside participation/, /^Buffer/, /^Absolute return Pays/], values: { 'rate-buffer': '15', 'final-level': '95' } },
  { file: 'barrier-absolute-return', title: 'Payoff of absolute return in both directions between barriers at 80% and 125%', features: [/^Absolute return \(both/, /^Conditional return/], values: { 'rate-lower-barrier': '80', 'rate-upper-barrier': '125', 'rate-conditional': '2', 'final-level': '110' } },
  { file: 'deposit-minimum-return', title: 'Deposit payoff with 100% upside participation, a 30% cap and a 5.25% minimum return', wrapper: 'deposit', features: [/^Upside participation/, /^Cap/, /^Minimum return/], values: { term: '84', 'rate-cap': '30', 'rate-minimum': '5.25', 'final-level': '102' } },
]

// The properties that make the chart look as it does in the page; the page's stylesheet is not part of the file. A property is
// written only where it differs from what the element would inherit, or from its initial value if it is not inherited.
const inherited = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'letter-spacing', 'paint-order']
const notInherited: Record<string, string> = { opacity: '1', 'dominant-baseline': 'auto' }

async function drawChart(page: Page, url: string, chart: BookChart): Promise<string> {
  await page.goto(url)
  await page.waitForSelector('svg.chart')
  if (chart.wrapper) await page.locator('select[aria-label="Wrapper"]').selectOption(chart.wrapper)
  for (const feature of chart.features) {
    await page.getByRole('button', { name: /Add feature/ }).click()
    await page.getByRole('button', { name: feature }).click()
  }
  for (const [id, value] of Object.entries(chart.values)) {
    const control = page.locator(`#${id}`)
    if (await control.evaluate((element) => element.tagName === 'SELECT')) await control.selectOption(value)
    else { await control.fill(value); await control.press('Tab') }
  }
  // Move the pointer off the chart so no handle is shown, and let the layout settle.
  await page.mouse.move(0, 0)
  return page.locator('svg.chart').evaluate((svg, { inherited, notInherited, title }) => {
    const copy = svg.cloneNode(true) as SVGSVGElement
    const sources = [svg, ...Array.from(svg.querySelectorAll('*'))]
    const targets = [copy, ...Array.from(copy.querySelectorAll('*'))]
    sources.forEach((source, index) => {
      const target = targets[index] as SVGElement
      const computed = getComputedStyle(source)
      // The handles that edit the terms have no meaning in a picture. The final level's marker stays.
      if (computed.display === 'none' || computed.visibility === 'hidden' || (source.classList.contains('handle') && !source.classList.contains('final-dot'))) { target.setAttribute('data-remove', ''); return }
      const parent = index === 0 ? null : getComputedStyle(source.parentElement!)
      const declarations = [
        ...inherited.filter((property) => parent === null || computed.getPropertyValue(property) !== parent.getPropertyValue(property)).map((property) => [property, computed.getPropertyValue(property)]),
        ...Object.entries(notInherited).filter(([property, initial]) => computed.getPropertyValue(property) !== initial).map(([property]) => [property, computed.getPropertyValue(property)]),
      ]
      if (declarations.length) target.setAttribute('style', declarations.map(([property, value]) => `${property}:${value}`).join(';'))
      else target.removeAttribute('style')
      target.removeAttribute('class')
    })
    copy.querySelectorAll('[data-remove]').forEach((element) => element.remove())
    // Interactive parts have no meaning in a picture.
    copy.querySelectorAll('[tabindex]').forEach((element) => element.removeAttribute('tabindex'))
    const [x, y, width, height] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copy.setAttribute('width', String(width))
    copy.setAttribute('height', String(height))
    copy.setAttribute('role', 'img')
    copy.setAttribute('aria-label', title)
    copy.removeAttribute('aria-description')
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    background.setAttribute('x', String(x)); background.setAttribute('y', String(y))
    background.setAttribute('width', String(width)); background.setAttribute('height', String(height))
    background.setAttribute('fill', '#ffffff')
    copy.insertBefore(background, copy.firstChild)
    return new XMLSerializer().serializeToString(copy)
  }, { inherited, notInherited, title: chart.title })
}

const server = await createServer({ logLevel: 'error', server: { port: 0 } })
await server.listen()
const url = server.resolvedUrls!.local[0]
const browser = await chromium.launch()
try {
  mkdirSync('docs/book/charts', { recursive: true })
  for (const chart of charts) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
    writeFileSync(`docs/book/charts/${chart.file}.svg`, `${await drawChart(page, url, chart)}\n`)
    await page.close()
    console.log(`docs/book/charts/${chart.file}.svg`)
  }
} finally {
  await browser.close()
  await server.close()
}
