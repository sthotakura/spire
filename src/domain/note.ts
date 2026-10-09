export type AssetKind = 'equity' | 'equity-index'
export type ParticipationDirection = 'downside' | 'upside'

// Each direction carries the features that only make sense with it: a buffer changes the fall downside participation
// applies to, a barrier decides whether downside participation applies at all, absolute return pays as a gain a fall that
// downside participation does not reach, and a cap limits the return upside participation can add. Their keys are listed in the order the
// payment applies them.
export interface DownsideParticipation {
  direction: 'downside'
  // The fall the holder does not bear, as a fraction of the initial level. Downside participation applies only to the fall beyond it.
  buffer?: number
  barrier?: Barrier
  absoluteReturn?: AbsoluteReturn
  rate: number
}

// A fall that downside participation does not reach pays its size, times the rate, as a gain: a fall within the buffer, or
// one that ends at or above the barrier. Past it the gain is gone and the holder bears the fall as the buffer or barrier sets
// out, so the payment drops there (docs/absolute-return.md).
export interface AbsoluteReturn {
  rate: number
}

// When a barrier is observed. Final reads the final level the determination produces. Daily close reads every closing level
// from pricing to the final observation date, through the lowest or highest of them (docs/daily-observation.md).
export type BarrierObservation = 'final' | 'daily-close'

// A level, as a fraction of the initial level. Downside participation applies, to the whole fall, only when the barrier is
// reached: when the observed level is below it. Observed on the final date, that is the final level; observed daily, it is
// the lowest close.
export interface Barrier {
  level: number
  observation: BarrierObservation
}

// A level above the initial level, as a fraction of it. Upside participation applies only while the final level is below it.
// At or above it, participation is cancelled (a knock-out) and the optional rebate is paid instead: a return on principal.
// Observed on the final date it reads the final level; observed daily, the highest close (docs/upside-barrier.md).
export interface UpsideBarrier {
  level: number
  observation: BarrierObservation
  rebate?: number
}

export interface UpsideParticipation {
  direction: 'upside'
  barrier?: UpsideBarrier
  rate: number
  // The most the note can pay above principal, as a fraction of principal. Absent means the payment has no ceiling.
  cap?: number
}

export type Participation = DownsideParticipation | UpsideParticipation

// What is tracked. Its identity only: where its change is measured from belongs to the determination.
export interface Asset {
  kind: AssetKind
  name: string
}

export interface UnderlierComponent {
  asset: Asset
}

// How the initial level is measured. Given states the level as a term of the note. Lookback states only how many dates
// after pricing are observed: the level on the pricing date is observed like the others, and the lowest of them is the
// initial level, so a fall soon after pricing lowers the starting point.
export type InitialDetermination = { kind: 'given'; level: number } | { kind: 'lookback'; observationCount: number }

// How the final level is measured. Final-date takes the level on the one final date. Averaging takes the arithmetic
// average of the levels on several dates before maturity (averaging out).
export type FinalDetermination = { kind: 'final-date' } | { kind: 'averaging'; observationCount: number }

// How the underlier's change is measured, one end at a time. Given at the start and final-date at the end is point-to-point.
export interface Determination {
  initial: InitialDetermination
  final: FinalDetermination
}

// The two levels the return is measured between, each as its end of the determination produces it.
export interface DeterminedLevels {
  initial: number
  final: number
  // The lowest and highest closing level from pricing to the final observation date, which a barrier observed daily reads.
  // Absent means no close went beyond the initial and final levels, so no close in between reached a barrier.
  lowestClose?: number
  highestClose?: number
}

// The underlier produces the one return the payoff reads: which assets, where each starts, and how its change is measured.
// A single underlier has exactly one component. A basket holds several, and a rule that combines them, which only a basket can have.
export interface SingleUnderlier {
  kind: 'single'
  components: [UnderlierComponent]
  determination: Determination
}

// An asset in a weighted basket and its weight, which is part of what the basket holds. Weights are fixed on the pricing
// date and add up to 100%.
export interface BasketComponent {
  asset: Asset
  weight: number
}

// An initial level of one component of a basket. It refers to the component by asset name, not by position, so removing
// a component cannot move a level onto another asset.
export interface ComponentLevel {
  asset: string
  level: number
}

// How a basket's component returns make its return. Weighted adds up each component's return times its weight.
export interface BasketReturn {
  kind: 'weighted'
}

// Each component of a basket is measured from its own fixed initial level, and every component's final level is measured
// the same way. The basket return then combines the component returns, so it needs both ends of every component and
// comes after them. Lookback is not modelled on a basket: the lowest basket level and each component's lowest level
// differ, and no public note settling which applies was verified (docs/basket.md).
export interface BasketDetermination {
  initial: { kind: 'given'; levels: ComponentLevel[] }
  final: FinalDetermination
  basketReturn: BasketReturn
}

export interface BasketUnderlier {
  kind: 'basket'
  components: BasketComponent[]
  determination: BasketDetermination
}

export type Underlier = SingleUnderlier | BasketUnderlier

// The product's length, as a duration. It is part of the structure; the dates that put it on a calendar belong to issuance.
export interface Term {
  months: number
}

// The legal form. A note is a debt security of its issuer. A deposit is held by a bank and repaid in full at the end of its
// term, so it cannot pay less than principal: it has no downside participation and no principal protection term.
export type Wrapper = 'note' | 'deposit'

export interface Product {
  wrapper: Wrapper
  principalAmount: number
  term: Term
  redemption: 'bullet'
  underlier: Underlier
  payoff: {
    // Features are listed in the order the payment applies them: participation with its buffer and cap, then the floor.
    participations: Participation[]
    principalProtection?: number
    // The lowest return the product pays on principal, whatever the underlier does: a floor of principal × (1 + minimum return),
    // not an addition to the participated return. Deposits only, since no note with one was verified.
    minimumReturn?: number
  }
}

// A product on a single asset.
export type SingleProduct = Product & { underlier: SingleUnderlier }

export const downsideOf = (note: Product) => note.payoff.participations.find((participation): participation is DownsideParticipation => participation.direction === 'downside')
export const upsideOf = (note: Product) => note.payoff.participations.find((participation): participation is UpsideParticipation => participation.direction === 'upside')

// Puts a buffer, barrier or absolute return on downside participation and a barrier or cap on upside participation. Each is dropped when its direction is absent.
export const withSubFeatures = (participations: Participation[], { buffer, barrier, absoluteReturn, upsideBarrier, cap }: { buffer?: number; barrier?: Barrier; absoluteReturn?: AbsoluteReturn; upsideBarrier?: UpsideBarrier; cap?: number }): Participation[] =>
  participations.map((participation) => participation.direction === 'downside'
    ? { direction: 'downside', buffer, barrier, absoluteReturn, rate: participation.rate }
    : { direction: 'upside', barrier: upsideBarrier, rate: participation.rate, cap })

export type ProductIssueField = 'principalAmount' | 'term' | 'underlierName' | 'basketComponents' | 'initialLevel' | 'weights' | 'lookbackObservationCount' | 'observationCount' | 'buffer' | 'barrier' | 'upsideBarrier' | 'absoluteReturn' | 'participations' | 'principalProtection' | 'cap' | 'minimumReturn'

// A barrier as an underlier level: its fraction of the level the return is measured from. Rounded to nine decimals, because
// 1.1 × 100 is 110.00000000000001 in floating point, which would stop a final level of 110 from reaching a barrier at 110%.
export const barrierLevelAt = (fraction: number, initialLevel: number) => Math.round(fraction * initialLevel * 1e9) / 1e9

// Real notes can average over many more dates, such as monthly over several years, and a lookback period often observes
// every trading day for weeks. This reference keeps the count small enough for each observed level to be set by hand.
export const observationCountRange = { min: 2, max: 12 }
const isObservationCount = (count: number) => Number.isInteger(count) && count >= observationCountRange.min && count <= observationCountRange.max

// Terms in days need a day-count convention, so the term is whole months. The upper limit keeps a monthly coupon schedule
// short enough to read; real terms can be longer.
export const termRange = { min: 1, max: 120 }

export interface ProductIssue {
  field: ProductIssueField
  message: string
}

// Equal weights for a number of components, which a basket returns to when a component is added or removed. Term sheets
// state weights to two decimal places of a percent, so three assets get 33.34%, 33.33% and 33.33%: the first takes the remainder.
export function equalWeights(count: number): number[] {
  const share = Math.floor(10000 / count) / 10000
  const first = Math.round((1 - share * (count - 1)) * 10000) / 10000
  return Array.from({ length: count }, (_, index) => index === 0 ? first : share)
}

// Whether the levels refer to the components one to one: one level per asset, and none for an asset not in the basket.
const matchesComponents = (components: BasketComponent[], levels: ComponentLevel[]) =>
  levels.length === components.length && components.every(({ asset }) => levels.filter((level) => level.asset === asset.name).length === 1)

// Weights such as three equal thirds do not add up to exactly 1 in floating point.
const weightTolerance = 1e-9

function basketIssues(underlier: BasketUnderlier): ProductIssue[] {
  const issues: ProductIssue[] = []
  const names = underlier.components.map(({ asset }) => asset.name)
  if (names.length < 2) issues.push({ field: 'basketComponents', message: 'A basket needs at least two assets.' })
  if (names.some((name) => !name.trim())) issues.push({ field: 'underlierName', message: 'Enter a name for each asset.' })
  // Initial levels refer to their component by name, so two assets with one name would share them.
  else if (new Set(names).size !== names.length) issues.push({ field: 'underlierName', message: 'Each asset in a basket needs its own name.' })
  const { levels } = underlier.determination.initial
  if (!matchesComponents(underlier.components, levels)) issues.push({ field: 'initialLevel', message: 'Each asset needs one initial level.' })
  for (const { asset, level } of levels) {
    if (!Number.isFinite(level) || level <= 0) issues.push({ field: 'initialLevel', message: `Initial level of ${asset} must be greater than zero.` })
  }
  for (const { asset, weight } of underlier.components) {
    if (!Number.isFinite(weight) || weight <= 0) issues.push({ field: 'weights', message: `Weight of ${asset.name} must be greater than zero.` })
  }
  if (!(Math.abs(underlier.components.reduce((sum, { weight }) => sum + weight, 0) - 1) <= weightTolerance)) issues.push({ field: 'weights', message: 'Weights must add up to 100%.' })
  return issues
}

export function underlierIssues(underlier: Underlier): ProductIssue[] {
  if (underlier.kind === 'basket') return [...basketIssues(underlier), ...finalIssues(underlier.determination.final)]
  const issues: ProductIssue[] = []
  const [component] = underlier.components
  if (!component.asset.name.trim()) issues.push({ field: 'underlierName', message: 'Enter an underlier name.' })
  const { initial } = underlier.determination
  if (initial.kind === 'given' && (!Number.isFinite(initial.level) || initial.level <= 0)) issues.push({ field: 'initialLevel', message: 'Initial level must be greater than zero.' })
  if (initial.kind === 'lookback' && !isObservationCount(initial.observationCount)) {
    issues.push({ field: 'lookbackObservationCount', message: `Lookback observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` })
  }
  return [...issues, ...finalIssues(underlier.determination.final)]
}

function finalIssues(final: FinalDetermination): ProductIssue[] {
  if (final.kind === 'averaging' && !isObservationCount(final.observationCount)) {
    return [{ field: 'observationCount', message: `Observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` }]
  }
  return []
}

// Daily observation reads closes of the underlier from pricing. Lookback and a basket have no verified public note that settles how.
const dailyCloseAllowedOn = (underlier: Underlier) => underlier.kind === 'single' && underlier.determination.initial.kind === 'given'

export function productIssues(note: Product): ProductIssue[] {
  const issues: ProductIssue[] = underlierIssues(note.underlier)
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) issues.push({ field: 'principalAmount', message: 'Principal must be greater than zero.' })
  const { months } = note.term
  if (!Number.isInteger(months) || months < termRange.min || months > termRange.max) issues.push({ field: 'term', message: `Term must be a whole number of months from ${termRange.min} to ${termRange.max}.` })
  const buffer = downsideOf(note)?.buffer
  if (buffer !== undefined && (!Number.isFinite(buffer) || buffer <= 0 || buffer > 1)) issues.push({ field: 'buffer', message: 'Buffer must be greater than 0% and at most 100%.' })
  const barrier = downsideOf(note)?.barrier
  // A barrier at 100% would switch downside participation on for any fall, which is downside participation without one.
  if (barrier !== undefined && (!Number.isFinite(barrier.level) || barrier.level <= 0 || barrier.level >= 1)) issues.push({ field: 'barrier', message: 'Downside barrier must be greater than 0% and less than 100% of the initial level.' })
  // No public note combining the two was verified, so they are not combined.
  if (barrier !== undefined && buffer !== undefined) issues.push({ field: 'barrier', message: 'A downside barrier and a buffer cannot both apply to downside participation.' })
  if (barrier?.observation === 'daily-close') {
    if (!dailyCloseAllowedOn(note.underlier)) issues.push({ field: 'barrier', message: 'A downside barrier cannot be observed daily with lookback or a basket.' })
    if (downsideOf(note)?.absoluteReturn !== undefined) issues.push({ field: 'barrier', message: 'Absolute return reads a downside barrier on the final date only.' })
  }
  const absoluteReturn = downsideOf(note)?.absoluteReturn
  if (absoluteReturn !== undefined) {
    if (!Number.isFinite(absoluteReturn.rate) || absoluteReturn.rate <= 0) issues.push({ field: 'absoluteReturn', message: 'Absolute return must be greater than zero.' })
    // Without a buffer or a barrier, downside participation reaches every fall, so no fall is left to pay as a gain.
    if (buffer === undefined && barrier === undefined) issues.push({ field: 'absoluteReturn', message: 'Absolute return needs a buffer or a downside barrier.' })
  }
  for (const participation of note.payoff.participations) {
    if (!Number.isFinite(participation.rate) || participation.rate <= 0) issues.push({ field: 'participations', message: `${participation.direction === 'upside' ? 'Upside' : 'Downside'} participation must be greater than zero.` })
  }
  if (new Set(note.payoff.participations.map(({ direction }) => direction)).size !== note.payoff.participations.length) issues.push({ field: 'participations', message: 'Each participation direction can be selected only once.' })
  const protection = note.payoff.principalProtection
  if (protection !== undefined && (!Number.isFinite(protection) || protection < 0 || protection > 1)) issues.push({ field: 'principalProtection', message: 'Principal protection must be between 0% and 100%.' })
  const cap = upsideOf(note)?.cap
  if (cap !== undefined && (!Number.isFinite(cap) || cap <= 0)) issues.push({ field: 'cap', message: 'Cap must be greater than zero.' })
  const upsideBarrier = upsideOf(note)?.barrier
  if (upsideBarrier !== undefined) {
    // 200% is the edge of the chart's horizontal axis, a rise of 100%.
    if (!Number.isFinite(upsideBarrier.level) || upsideBarrier.level <= 1 || upsideBarrier.level > 2) issues.push({ field: 'upsideBarrier', message: 'Upside barrier must be greater than 100% and at most 200% of the initial level.' })
    if (upsideBarrier.rebate !== undefined && (!Number.isFinite(upsideBarrier.rebate) || upsideBarrier.rebate <= 0)) issues.push({ field: 'upsideBarrier', message: 'Rebate must be greater than zero.' })
    // No public note combining the two was verified, so they are not combined.
    if (cap !== undefined) issues.push({ field: 'upsideBarrier', message: 'An upside barrier and a cap cannot both apply to upside participation.' })
    if (upsideBarrier.observation === 'daily-close') {
      if (!dailyCloseAllowedOn(note.underlier)) issues.push({ field: 'upsideBarrier', message: 'An upside barrier cannot be observed daily with lookback or a basket.' })
      // Reached before a fall, the rebate could be paid beside a downside fall, and no public note was found that does both.
      if (downsideOf(note) !== undefined) issues.push({ field: 'upsideBarrier', message: 'An upside barrier observed daily needs a note with no downside participation.' })
    }
  }
  // A deposit is repaid in full, so nothing may take the payment below principal, and principal needs no protection term.
  if (note.wrapper === 'deposit' && downsideOf(note)) issues.push({ field: 'participations', message: 'A deposit repays principal in full, so it cannot have downside participation.' })
  if (note.wrapper === 'deposit' && protection !== undefined) issues.push({ field: 'principalProtection', message: 'A deposit repays principal in full, so it has no principal protection term.' })
  const minimum = note.payoff.minimumReturn
  if (minimum !== undefined) {
    if (!Number.isFinite(minimum) || minimum <= 0) issues.push({ field: 'minimumReturn', message: 'Minimum return must be greater than zero.' })
    // A minimum at or above the cap would fix the payment whatever the underlier does.
    else if (cap !== undefined && Number.isFinite(cap) && minimum >= cap) issues.push({ field: 'minimumReturn', message: 'Minimum return must be less than the cap.' })
    if (note.wrapper !== 'deposit') issues.push({ field: 'minimumReturn', message: 'A minimum return is available on deposits only.' })
  }
  return issues
}

export function validateProduct(note: Product): string[] {
  return productIssues(note).map(({ message }) => message)
}

// The number of observed levels the final end of the determination reads.
export const observationCountOf = (determination: FinalDetermination) => determination.kind === 'averaging' ? determination.observationCount : 1

// The number of observed levels the initial end of the determination reads: none when the level is given, and with
// lookback the level on the pricing date and one on each date after it.
export const initialObservationCountOf = (determination: InitialDetermination) => determination.kind === 'lookback' ? determination.observationCount + 1 : 0

// The initial level the payoff reads, from the levels observed from pricing, in date order, the pricing date first.
// Given reads the stated level. Lookback reads the lowest observed level, so it is never above the pricing-date level.
export function initialLevelFrom(determination: InitialDetermination, observedLevels: number[]): number {
  const count = initialObservationCountOf(determination)
  if (observedLevels.length !== count) throw new Error(`Expected ${count} observed levels for the initial level.`)
  // The return is measured from this level, so a level of zero would leave it undefined.
  if (observedLevels.some((level) => !Number.isFinite(level) || level <= 0)) throw new Error('Observed levels for the initial level must be greater than zero.')
  return determination.kind === 'given' ? determination.level : Math.min(...observedLevels)
}

// The final level the payoff reads, from the levels observed on the determination dates, in date order.
// Final-date reads the one level; averaging reads the arithmetic average of all of them.
export function finalLevelFrom(determination: FinalDetermination, observedLevels: number[]): number {
  if (observedLevels.length !== observationCountOf(determination)) throw new Error(`Expected ${observationCountOf(determination)} observed levels.`)
  if (observedLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Observed levels must be zero or greater.')
  return observedLevels.reduce((sum, level) => sum + level, 0) / observedLevels.length
}

// A basket's level starts here, as public notes state it, so the payoff reads a basket as it reads a single asset's levels.
export const basketStartingLevel = 100

export interface ComponentPerformance {
  asset: string
  weight: number
  initialLevel: number
  // The levels the final end of the determination read, in date order, and the final level it produced from them: the
  // level on the final date, or the average.
  observedLevels: number[]
  finalLevel: number
  componentReturn: number
}

export interface BasketBreakdown {
  components: ComponentPerformance[]
  // The weighted sum of the component returns.
  basketReturn: number
  // The basket's starting level and its final level, 100 × (1 + basket return), which the payoff reads.
  levels: DeterminedLevels
}

// Measures each component from its own initial level to its final level, then weights the component returns. Observed
// levels are listed per component, in the order of the components, each in date order. Averaging each component and then
// weighting gives the same final level as averaging the basket level on each date, because the basket level is a weighted sum.
export function basketBreakdown(underlier: BasketUnderlier, observedLevels: number[][]): BasketBreakdown {
  const errors = underlierIssues(underlier)
  if (errors.length) throw new Error(errors.map(({ message }) => message).join(' '))
  if (observedLevels.length !== underlier.components.length) throw new Error(`Expected observed levels for ${underlier.components.length} assets.`)
  const { initial, final } = underlier.determination
  const components = underlier.components.map(({ asset, weight }, index): ComponentPerformance => {
    const initialLevel = initial.levels.find((term) => term.asset === asset.name)!.level
    const finalLevel = finalLevelFrom(final, observedLevels[index])
    return { asset: asset.name, weight, initialLevel, observedLevels: observedLevels[index], finalLevel, componentReturn: finalLevel / initialLevel - 1 }
  })
  const basketReturn = components.reduce((sum, { weight, componentReturn }) => sum + weight * componentReturn, 0)
  return { components, basketReturn, levels: { initial: basketStartingLevel, final: basketStartingLevel * (1 + basketReturn) } }
}

export interface PaymentBreakdown {
  // The level the return is measured from, as the initial end of the determination produced it.
  initialLevel: number
  underlierReturn: number
  // The direction the return falls in. A flat return counts as upside.
  direction: ParticipationDirection
  // Undefined when the note has no buffer. Otherwise the part of a fall the buffer absorbs, as a positive fraction: zero on a rise.
  bufferAbsorbs?: number
  // Undefined when the note has no barrier. Otherwise the barrier as an underlier level, and whether it is reached: the final
  // level below it, or for a barrier observed daily the lowest close below it.
  barrierLevel?: number
  barrierReached?: boolean
  // Undefined when upside participation has no barrier. Otherwise that barrier as an underlier level, and whether the final
  // level (or for a barrier observed daily, the highest close) is at or above it, which cancels upside participation and
  // pays the rebate, if there is one.
  upsideBarrierLevel?: number
  upsideBarrierReached?: boolean
  // The closes a barrier observed daily reads. Undefined unless the barrier of that direction is observed daily.
  lowestClose?: number
  highestClose?: number
  // Undefined when the note has no absolute return. Otherwise whether the fall is paid as a gain: within the buffer, or ending
  // at or above the barrier.
  absoluteReturnApplies?: boolean
  // Undefined when that direction has no participation, so principal is unchanged.
  participationRate?: number
  participatedReturn: number
  // Principal plus the participated return, before any cap or floor.
  uncappedPayment: number
  // Undefined when the note has no cap. Otherwise principal plus the maximum return. It limits upside participation only.
  capAmount?: number
  capApplies: boolean
  // The payment after the cap and before the floor.
  unflooredPayment: number
  // The lowest payment. On a note it is principal × protection, or zero without protection: a holder cannot lose more than
  // the principal amount. On a deposit it is principal, or principal × (1 + minimum return) with a minimum return.
  floor: number
  floorApplies: boolean
  payment: number
}

// The levels are the ones the determination produces (see initialLevelFrom and finalLevelFrom), so the payoff does not
// depend on how they were measured.
export function paymentBreakdown(note: Product, levels: DeterminedLevels): PaymentBreakdown {
  const errors = validateProduct(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(levels.initial) || levels.initial <= 0) throw new Error('Initial level must be greater than zero.')
  if (!Number.isFinite(levels.final) || levels.final < 0) throw new Error('Final level must be zero or greater.')

  // The initial level is the closing level on the pricing date, so no close in the period is below the lowest of it and the
  // final level, or above the highest.
  const lowestClose = levels.lowestClose ?? Math.min(levels.initial, levels.final)
  const highestClose = levels.highestClose ?? Math.max(levels.initial, levels.final)
  if (!Number.isFinite(lowestClose) || lowestClose < 0 || lowestClose > Math.min(levels.initial, levels.final)) throw new Error('Lowest close must be zero or greater and no higher than the initial and final levels.')
  if (!Number.isFinite(highestClose) || highestClose < Math.max(levels.initial, levels.final)) throw new Error('Highest close must be no lower than the initial and final levels.')

  const underlierReturn = levels.final / levels.initial - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participationRate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  const buffer = downsideOf(note)?.buffer
  const bufferAbsorbs = buffer === undefined ? undefined : Math.min(buffer, Math.max(0, -underlierReturn))
  const barrier = downsideOf(note)?.barrier
  const barrierLevel = barrier === undefined ? undefined : barrier.level * levels.initial
  const barrierReached = barrierLevel === undefined ? undefined : (barrier!.observation === 'daily-close' ? lowestClose : levels.final) < barrierLevel
  // At or above the barrier, downside participation does not apply, so a fall leaves principal unchanged.
  const barrierHolds = direction === 'downside' && barrierReached === false
  // A fall downside participation does not reach is paid as a gain: one the buffer absorbs whole, or one that ends at or above
  // the barrier. Public notes compare the final level with the buffer level, and a final level at it is within the buffer.
  // Comparing levels also keeps 85 ÷ 100 − 1 from falling just outside a 15% buffer.
  const absoluteReturn = downsideOf(note)?.absoluteReturn
  const absoluteReturnApplies = absoluteReturn === undefined ? undefined
    : direction === 'downside' && (buffer !== undefined ? levels.final >= levels.initial * (1 - buffer) : barrierReached === false)
  // Observed on the final date, reaching the upside barrier means a rise, so the downside features above cannot also apply.
  // Observed daily it can be reached before a fall, which is why only a note with no downside participation may observe it so.
  const upsideBarrier = upsideOf(note)?.barrier
  const upsideBarrierLevel = upsideBarrier === undefined ? undefined : barrierLevelAt(upsideBarrier.level, levels.initial)
  const upsideBarrierReached = upsideBarrierLevel === undefined ? undefined : (upsideBarrier!.observation === 'daily-close' ? highestClose : levels.final) >= upsideBarrierLevel
  const participatedReturn = absoluteReturnApplies ? absoluteReturn!.rate * -underlierReturn
    : barrierHolds ? 0
    : upsideBarrierReached ? upsideBarrier!.rebate ?? 0
    : (participationRate ?? 0) * (underlierReturn + (bufferAbsorbs ?? 0))
  const uncappedPayment = note.principalAmount * (1 + participatedReturn)
  // The cap limits upside participation only, so a fall paid as a gain is not capped. A cap is above any floor: protection
  // cannot exceed principal, and a minimum return must be below the cap. The order of the two cannot change the result.
  const cap = upsideOf(note)?.cap
  const capAmount = cap === undefined ? undefined : note.principalAmount * (1 + cap)
  const capApplies = capAmount !== undefined && direction === 'upside' && uncappedPayment > capAmount
  const unflooredPayment = capApplies ? capAmount : uncappedPayment
  const { minimumReturn, principalProtection } = note.payoff
  const floor = note.principalAmount * (minimumReturn !== undefined ? 1 + minimumReturn : note.wrapper === 'deposit' ? 1 : principalProtection ?? 0)
  return {
    initialLevel: levels.initial,
    underlierReturn,
    direction,
    bufferAbsorbs,
    barrierLevel,
    barrierReached,
    upsideBarrierLevel,
    upsideBarrierReached,
    lowestClose: barrier?.observation === 'daily-close' ? lowestClose : undefined,
    highestClose: upsideBarrier?.observation === 'daily-close' ? highestClose : undefined,
    absoluteReturnApplies,
    participationRate,
    participatedReturn,
    uncappedPayment,
    capAmount,
    capApplies,
    unflooredPayment,
    floor,
    floorApplies: floor > unflooredPayment,
    payment: Math.max(floor, unflooredPayment),
  }
}

export function maturityPayment(note: Product, levels: DeterminedLevels): number {
  return paymentBreakdown(note, levels).payment
}

// The return over the whole term as a return a year, compounded once a year: (payment ÷ principal)^(12 ÷ term months) − 1.
// Issuers state it beside market-linked deposit payments as an annual yield; it is derived from the term, not a term itself.
export function annualisedReturn(payment: number, principalAmount: number, termMonths: number): number {
  return (payment / principalAmount) ** (12 / termMonths) - 1
}
