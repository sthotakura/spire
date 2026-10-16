// Renders a Markdown table for the book: a header row, a separator row such as `| :--- | ---: |`, and body rows. The separator sets
// each column's alignment. Returns null when the lines are not a table, so the caller can treat them as text.
const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())

const alignmentOf = (cell: string): 'left' | 'right' | 'center' | null => {
  if (!/^:?-+:?$/.test(cell)) return null
  return cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left'
}

export function renderTable(rows: string[], inline: (text: string) => string): string | null {
  if (rows.length < 2) return null
  const [head, separator, ...body] = rows.map(cells)
  const alignments = separator.map(alignmentOf)
  if (alignments.some((alignment) => alignment === null) || alignments.length !== head.length) return null
  const cell = (tag: 'th' | 'td', text: string, index: number) => `<${tag} class="${alignments[index]}">${inline(text)}</${tag}>`
  const row = (tag: 'th' | 'td', values: string[]) => `<tr>${head.map((_, index) => cell(tag, values[index] ?? '', index)).join('')}</tr>`
  return `<div class="book-table-wrap"><table><thead>${row('th', head)}</thead><tbody>${body.map((values) => row('td', values)).join('')}</tbody></table></div>`
}
