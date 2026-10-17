import type { Product } from '../domain/note'
import type { ConceptId } from './concepts'

export interface StructureLine {
  text: string
  // The part of the note this line describes. Null for the outermost braces.
  concept: ConceptId | null
}

type Path = Array<string | number>

// Formats a note exactly as JSON.stringify(note, null, 2) does, and tags each line with the concept that owns it.
export function structureLines(note: Product): StructureLine[] {
  const lines: StructureLine[] = []

  const conceptAt = (path: Path): ConceptId | null => {
    const [top, second, third, fourth] = path
    // The principal and the term are terms of the whole product, shown on the wrapper's row.
    if (top === 'wrapper' || top === 'principalAmount' || top === 'term') return 'wrapper'
    // Each term of the redemption is its own part, and its reviews are the schedule the call is tested on. The coupon has its own.
    if (top === 'redemption') {
      if (second === 'schedule') return 'schedule'
      if (second === 'nonCallReviews') return 'non-call'
      if (second === 'trigger') return 'trigger'
      if (second === 'triggerStep') return 'trigger-step'
      if (second === 'callAmount' || second === 'callAmountBasis') return 'call-amount'
      if (second === 'callOnFinalReview') return 'final-call'
      return 'redemption'
    }
    if (top === 'coupon') return second === 'schedule' ? 'coupon-schedule' : second === 'barrier' ? 'coupon-barrier' : second === 'memory' ? 'memory' : 'coupon'
    if (top === 'underlier') {
      if (second === 'components' && typeof third === 'number') return 'asset'
      if (second === 'determination') return third === 'initial' ? 'initial-level' : third === 'final' ? 'final-level' : third === 'basketReturn' ? 'basket-return' : 'determination'
      return 'underlier'
    }
    if (top !== 'payoff') return null
    // The note's barriers and conditional return belong to the barrier concept; the rest of the feature is its absolute return.
    if (second === 'barrierAbsoluteReturn') return third === 'lowerBarrier' || third === 'upperBarrier' || third === 'conditionalReturn' ? 'barrier' : 'absolute-return'
    if (second === 'principalProtection') return 'protection'
    if (second === 'minimumReturn') return 'minimum-return'
    if (second === 'participations' && typeof third === 'number') return fourth === 'buffer' || fourth === 'barrier' || fourth === 'cap' ? fourth : fourth === 'absoluteReturn' ? 'absolute-return' : note.payoff.participations[third]?.direction ?? 'payoff'
    return 'payoff'
  }

  const emit = (value: unknown, path: Path, indent: string, prefix: string, comma: string) => {
    const push = (text: string) => lines.push({ text, concept: conceptAt(path) })
    const inner = `${indent}  `
    if (Array.isArray(value)) {
      if (!value.length) return push(`${indent}${prefix}[]${comma}`)
      push(`${indent}${prefix}[`)
      value.forEach((item, index) => emit(item, [...path, index], inner, '', index < value.length - 1 ? ',' : ''))
      return push(`${indent}]${comma}`)
    }
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
      if (!entries.length) return push(`${indent}${prefix}{}${comma}`)
      push(`${indent}${prefix}{`)
      entries.forEach(([key, entry], index) => emit(entry, [...path, key], inner, `${JSON.stringify(key)}: `, index < entries.length - 1 ? ',' : ''))
      return push(`${indent}}${comma}`)
    }
    return push(`${indent}${prefix}${JSON.stringify(value)}${comma}`)
  }

  emit(note, [], '', '', '')
  return lines
}
