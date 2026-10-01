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
    if (top === 'redemption') return 'redemption'
    if (top === 'underlier') {
      if (second === 'components' && typeof third === 'number') return 'asset'
      if (second === 'determination') return third === 'initial' ? 'initial-level' : third === 'final' ? 'final-level' : third === 'basketReturn' ? 'basket-return' : 'determination'
      return 'underlier'
    }
    if (top !== 'payoff') return null
    if (second === 'principalProtection') return 'protection'
    if (second === 'minimumReturn') return 'minimum-return'
    if (second === 'participations' && typeof third === 'number') return fourth === 'buffer' || fourth === 'barrier' || fourth === 'cap' ? fourth : note.payoff.participations[third]?.direction ?? 'payoff'
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
