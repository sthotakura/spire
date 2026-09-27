import { paymentBreakdown, type PaymentBreakdown, type ProtectedParticipationNote } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  breakdown: PaymentBreakdown
}

// One row per scenario return, measured from the determined initial level. Every number comes from the payment breakdown,
// so the table cannot disagree with the calculation.
export function scenarioRows(note: ProtectedParticipationNote, initialLevel: number, returns: number[] = scenarioReturns): ScenarioRow[] {
  return returns.map((returnValue) => {
    const finalLevel = initialLevel * (1 + returnValue)
    return { returnValue, finalLevel, breakdown: paymentBreakdown(note, { initial: initialLevel, final: finalLevel }) }
  })
}
