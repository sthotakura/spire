import { paymentBreakdown, type PaymentBreakdown, type ProtectedParticipationNote } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  breakdown: PaymentBreakdown
}

// One row per scenario return. Every number comes from the payment breakdown, so the table cannot disagree with the calculation.
export function scenarioRows(note: ProtectedParticipationNote, returns: number[] = scenarioReturns): ScenarioRow[] {
  return returns.map((returnValue) => {
    const finalLevel = note.underlier.components[0].initialLevel * (1 + returnValue)
    return { returnValue, finalLevel, breakdown: paymentBreakdown(note, finalLevel) }
  })
}
