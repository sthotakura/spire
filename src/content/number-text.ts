// Numbers in the outline fields are shown with digit separators (1,000) and read back without them.
export const formatNumber = (value: number): string => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 10 }) : ''

// Blank or unreadable text gives NaN, so the note's own validation reports it.
export const parseNumber = (text: string): number => {
  const plain = text.replace(/,/g, '').trim()
  return plain === '' ? NaN : Number(plain)
}
