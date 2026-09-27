import type { ProtectedParticipationNote } from '../domain/note'
import type { ConceptId } from './concepts'

export interface StructureLine {
  text: string
  // The part of the note this line describes. Null for the outermost braces.
  concept: ConceptId | null
}

type Path = Array<string | number>

// Formats a note exactly as JSON.stringify(note, null, 2) does, and tags each line with the concept that owns it.
export function structureLines(note: ProtectedParticipationNote): StructureLine[] {
  const lines: StructureLine[] = []

  const conceptAt = (path: Path): ConceptId | null => {
    const [top, second, third] = path
    if (top === 'wrapper' || top === 'principalAmount') return 'wrapper'
    if (top === 'redemption') return 'redemption'
    if (top === 'underlier') {
      if (second === 'components' && typeof third === 'number') return 'asset'
      if (second === 'determination') return 'determination'
      return 'underlier'
    }
    if (top !== 'payoff') return null
    if (second === 'principalProtection') return 'protection'
    if (second === 'cap') return 'cap'
    if (second === 'buffer') return 'buffer'
    if (second === 'participations' && typeof third === 'number') return note.payoff.participations[third]?.direction ?? 'payoff'
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
