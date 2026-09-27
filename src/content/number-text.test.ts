import { describe, expect, it } from 'vitest'
import { formatNumber, parseNumber } from './number-text'

describe('number text', () => {
  it('formats with digit separators and keeps decimals', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567.25)).toBe('1,234,567.25')
    expect(formatNumber(100)).toBe('100')
  })

  it('formats a missing number as blank', () => {
    expect(formatNumber(NaN)).toBe('')
  })

  it('reads numbers with or without separators', () => {
    expect(parseNumber('1,000')).toBe(1000)
    expect(parseNumber(' 2500.5 ')).toBe(2500.5)
    expect(parseNumber('1,234,567')).toBe(1234567)
  })

  it('reads blank or unreadable text as NaN', () => {
    expect(parseNumber('')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
  })
})
