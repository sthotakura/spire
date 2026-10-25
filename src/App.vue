<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { amountToY, barrierFromX, bufferFromX, digitalBarrierFromX, digitalFromY, fitAmountAxis, bufferLevel, capBindLevel, capFromY, clamp, clampBarrier, clampBuffer, clampCap, clampDigital, clampDigitalBarrier, clampFinalLevel, clampMinimumReturn, clampProtection, clampUpsideBarrier, clampUpsideRate, differingRuns, finalLevelFromX, jumpsOf, keyDelta, leaderStart, levelAxisFactor, levelToX, minimumReturnFromY, placeLabels, protectionFromY, reachedPayment, regimeOf, regimeRuns, returnTicks, slopeLevel, splitAtJumps, splitByRegime, upsideBarrierFromX, upsideRateFromY, wrapWords, type Box, type Jump, type RegimeRun, type Sample, type AmountAxis, type Plot, type Regime } from './chart/geometry'
import { payoffLabels, type PayoffLabelKey } from './content/chart-labels'
import HintToggle from './components/HintToggle.vue'
import NumberInput from './components/NumberInput.vue'
import TabGroup from './components/TabGroup.vue'
import { couponCell, couponClosingSteps, couponFormula, explainCoupons, explainRedemption, pathScenarios, redemptionFormula, redemptionSteps } from './content/autocall'
import { calculationSteps } from './content/calculation'
import { lineStages, scenarioAside } from './content/path'
import type { ConceptId } from './content/concepts'
import { marketingNames, productCategory, type MarketingName } from './content/names'
import { paymentFormula, paymentInWords } from './content/formula'
import { explainOutcome } from './content/outcome'
import { sameProduct, sampleBySlug, sampleGroups } from './content/examples'
import { breachClose, scenarioRows } from './content/scenarios'
import { isHighlighted } from './content/selection'
import { structureLines } from './content/structure-json'
import { summarize } from './content/summary'
import { finalCallLevel, paymentAtEnd, redemptionOutcome } from './domain/autocall'
import { barrierLevelAt, basketBreakdown, basketLevelFrom, monthsPerReview, suggestedFrequency, triggerAtReview, reviewCount, reviewDates, scheduleReviews, type ReviewDate, type ReviewFrequency, basketStartingLevel, equalWeights, finalLevelFrom, initialLevelFrom, initialObservationCountOf, productIssues, observationCountOf, paymentBreakdown, upsideOf, withSubFeatures, type BarrierObservation, type BasketReturn, type Determination, type DownsideParticipation, type FinalDetermination, type InitialDetermination, type ProductIssueField, type ParticipationDirection, type Product, type Underlier, type AssetKind, type Wrapper } from './domain/note'
import { fitLookbackObservations, fitObservations, shiftReturns, shiftToAverage } from './domain/observations'
import { firstFeatureValues, firstLookbackMoves, firstObservationCount, startingFinalLevel, startingInitialLevel, startingProduct } from './domain/starting-note'

const baseUrl = import.meta.env.BASE_URL

const activeHint = ref<string | null>(null)
const toggleHint = (hint: string) => { activeHint.value = activeHint.value === hint ? null : hint }
const hints = {
  wrapper: 'The legal form sets what the holder owns and who owes the payments. A note is a debt of its issuer, so every payment depends on the issuer’s ability to pay. A deposit is held by a bank and repaid in full at the end of its term. It is usually insured up to a limit; any payment above the limit depends on the bank’s ability to pay.',
  redemption: 'Sets when the product ends and principal is paid back: at scheduled maturity, or earlier if its terms allow a call or a put. Bullet redemption pays once, at maturity.',
  term: 'The length of the product, stated as a duration such as 3 years. Principal is repaid at the end of the term. The issue and maturity dates that put the term on a calendar are set when the product is issued.',
  underlier: 'What the payoff reads: the asset it tracks and how its change is measured, from where it starts. A single underlier tracks one asset. A basket tracks several and combines their changes into one return.',
  schedule: 'How often the product is reviewed through its term. Reviews are evenly spaced and numbered from 1, and the last is the end of the term. The term must hold a whole number of periods. It starts at semi-annual for a term over a year, quarterly from six months to a year, and monthly below that, and follows the term until you choose one. Notes can be reviewed more often, even weekly or daily; this reference offers monthly to annual. Public notes call these dates observation dates or review dates; here they are reviews, to keep them apart from the observations that set the initial and final levels.',
  trigger: 'The level, as a share of the initial level, at or above which the product is called on the first review. A later review has the same trigger unless it steps down.',
  'non-call': 'The number of reviews at the start on which the product cannot be called: a non-call period. For an autocall, a review in it cannot call even when its level meets the trigger. 0 lets it be called from the first review. A trigger that steps still moves from review 1.',
  'issuer-choice': 'Whether and when the issuer calls is its own choice, so a scenario states it. The issuer can call on any review after the non-call period except the last, which is the end of the term. A call ends the product and pays principal plus the call amount.',
  'trigger-step': 'How much the trigger changes on each review after the first, as a share of the initial level. −5% on a trigger of 100% steps it down to 95% on review 2, 90% on review 3, and so on. A positive value steps it up. Zero keeps one trigger for every review.',
  'call-amount': 'What a call pays above principal, as a share of principal. It is paid in full whenever the product is called, or for each year the product has lasted, as the choice below says.',
  'call-basis': 'Flat pays the call amount whenever the product is called. Per year treats it as a rate for each year the product has lasted, as a term sheet states “10% per annum”: a call after six months pays half of it, and a call after three years pays three times it.',
  'final-call': 'The last review is the end of the term. It pays the maturity payoff, or it is a call too: a level at or above the trigger on that review pays principal plus the call amount in place of the maturity payoff. With an upside participation, a trigger above the initial level draws the payoff as a shark fin: it climbs, then drops to the call amount.',
  coupon: 'Interest paid on the coupon’s own reviews. A fixed coupon is paid on every review, whatever the underlier does; a contingent coupon only on a review where the underlier is at or above the coupon barrier. It is stated as a rate a year, and each review pays its share: 12% a year on monthly reviews is 1% of principal a review. It is paid or tested on each of its own reviews, including those in a call’s non-call period and the last, until the product ends. A call on a date that is also a coupon review pays principal plus that review’s coupon.',
  'coupon-schedule': 'How often the coupon is paid, or for a contingent coupon tested. The coupon has its own reviews, apart from the call’s: they can be the same, or the coupon can be reviewed more often, such as monthly beside a quarterly call. Same as the calls copies the call’s frequency once; changing either later does not change the other.',
  'coupon-barrier': 'The level, as a share of the initial level, at or above which a review pays its coupon. It is its own level, apart from the call trigger and the downside barrier, though a note may set two of them equal.',
  memory: 'With memory, a coupon missed on a review below the barrier is remembered, and paid with the coupon of the next review at or above it. Without memory a missed coupon is never paid. Remembered coupons that no later review pays are never paid either.',
  asset: 'The equity or equity index the product tracks. Holding the product does not mean owning the asset.',
  determination: 'Sets which observed levels measure the underlier’s change: final ÷ initial − 1. The initial and final levels are each set on their own. Point-to-point uses the fixed initial level and the level on the final date; moves in between do not count. Lookback starts from the lowest of the levels on the pricing date and on several dates after it, so a fall soon after pricing lowers the starting point. Averaging takes the final level as the average of the levels observed on several dates before maturity, so a sharp move on the last date counts for less.',
  'lookback-observations': 'The number of dates after pricing whose levels can lower the starting point. The lowest of their levels and the level on the pricing date is the lookback level. With an autocall or a coupon, the lookback period is taken to end before the first review, so every review is measured from the lookback level.',
  observations: 'The number of dates whose levels are averaged into the final level. Each observed level counts equally.',
  payoff: 'The rules that turn the underlier’s change into the maturity payment. With no features the product repays principal. Each feature adds a rule, such as a share of the gain or a minimum payment.',
  principal: 'The amount used as the base for the maturity payment.',
  'initial-level': 'The level the underlier’s return is measured from. Fixed states it as a term of this product: two products on the same asset can start from different levels. Lookback takes the lowest level observed on the pricing date and several dates after it. When a note’s strike is set at 100% of it, it is often called the strike level.',
  'final-level': 'The level the underlier’s return is measured to. Final date uses the level on the one final observation date; moves before it do not count. Averaging takes the average of the levels observed on several dates before maturity, so a sharp move on the last date counts for less.',
  downside: 'The share of a negative underlier return, beyond any buffer, deducted from principal before the protection floor applies.',
  buffer: 'The fall the holder does not bear, as a percentage of the initial level. A fall within it leaves principal unchanged, unless absolute return pays it as a gain. A larger fall reduces principal by the amount beyond it, at the downside participation rate.',
  barrier: 'A level of the underlier below the initial level, as a percentage of it. A knock-in barrier: once the level is below it, downside participation switches on and applies to the whole fall; otherwise a fall leaves principal unchanged, unless absolute return pays it as a gain. Observed on the final date, it reads the final level. Observed daily, it reads every closing level from pricing to the final date, so one close below it is enough, even if the underlier later recovers.',
  'upside-barrier': 'A level of the underlier above the initial level, as a percentage of it. A knock-out barrier: while the level stays at or below it, upside participation applies as usual; once it goes above it, upside participation ends and the rebate, if there is one, is paid instead. Observed on the final date, it reads the final level. Observed daily, it reads every closing level from pricing to the final date, so one close at or above it is enough, even if the underlier later falls back.',
  'lowest-close': 'A hypothetical lowest closing level of the underlier from pricing to the final date, for this scenario. A daily downside barrier is reached if it is below the barrier. It cannot be above the initial level or any level observed on the final date or the averaging dates. Changing it does not change the product’s terms.',
  'highest-close': 'A hypothetical highest closing level of the underlier from pricing to the final date, for this scenario. A daily upside barrier is reached if it is above the barrier. It cannot be below the initial level or any level observed on the final date or the averaging dates. Changing it does not change the product’s terms.',
  'absolute-both': 'Pays a share of the absolute value of the underlier’s return, a rise or a fall alike, so a 10% fall pays like a 10% rise, until either barrier is reached. Once one is, the absolute return ends on both sides and the conditional return, if there is one, is paid instead, whatever the final level. The payment never falls below principal.',
  'lower-barrier': 'A level of the underlier below the initial level, as a percentage of it. It is reached strictly below its level, so a level exactly at it does not reach it. Observed on the final date it reads the final level. Observed daily it reads every closing level from pricing to the final date, so one close below it is enough, even if the underlier later recovers.',
  'upper-barrier': 'A level of the underlier above the initial level, as a percentage of it. It is reached strictly above its level, so a level exactly at it does not reach it. Observed on the final date it reads the final level. Observed daily it reads every closing level from pricing to the final date, so one close above it is enough, even if the underlier later falls back.',
  conditional: 'A fixed return on principal, paid in place of the absolute return once either barrier is reached. It does not depend on the final level, so it can pay more than a note that ends flat inside the barriers. Without it, reaching a barrier leaves only principal.',
  rebate: 'A fixed return on principal, paid in place of upside participation once the upside barrier is reached. It does not depend on how far the underlier rose.',
  'absolute-return': 'Pays as a gain a fall that downside participation does not reach, within the buffer or ending at or above the downside barrier: each 1% fall adds the absolute return rate, as a percentage of principal. A larger fall pays no gain and reduces principal as the buffer or barrier sets out, so the payment drops there.',
  upside: 'The share of a positive underlier return added to principal.',
  cap: 'The most upside participation can add to principal, as a percentage of principal, however far the underlier rises.',
  protection: 'The minimum contractual maturity payment as a percentage of principal. Protection applies at maturity and depends on the issuer’s ability to pay.',
  digital: 'A fixed return on principal, paid as a minimum while the underlier ends at or above the digital barrier. The payment is the greater of this and whatever the rest of the payoff pays, so it is a floor that holds only at or above the barrier. Below it, the digital return pays nothing and the rest of the payoff applies as if it were absent.',
  'digital-barrier': 'A level of the underlier, as a percentage of the initial level, at most 100%. It is reached at or above its level, so a level exactly at it earns the digital return, and one just below it does not. It reads the final level only; a worst-of basket reaches it when every asset is at or above its level.',
  'minimum-return': 'The lowest return the deposit pays on principal, whatever the underlier does. The payment is the greater of the participated payment and principal plus this return, so it is a floor, not an addition.',
  'basket-return': 'How a basket’s asset returns make its one return. Weighted adds up each asset’s return times its weight. Worst of uses the return of the asset that performs worst, so a fall in any one asset counts in full. Best of uses the return of the asset that performs best. The basket level starts at 100 and moves by that return, and the payoff reads it as it reads a single asset’s level.',
  weight: 'The asset’s share of the basket, fixed on the pricing date. The weights add up to 100%: the total beside Add asset shows how much is left to allocate, or how much is over.',
}
const wrapperOptions = [
  { id: 'note', label: 'Note', description: 'A debt security with payments defined by its terms and subject to the issuer’s ability to pay.', available: true },
  { id: 'deposit', label: 'Deposit', description: 'Money held by a bank and repaid in full at the end of the term.', available: true },
  { id: 'certificate', label: 'Certificate', description: 'A debt security of its issuer, the name Swiss and German markets commonly give to structured products.', available: false },
  { id: 'warrant', label: 'Warrant', description: 'A security that pays the underlier’s move beyond a strike at expiry, as a call or a put, and can expire worthless.', available: false },
  { id: 'etf', label: 'ETF', description: 'A fund whose shares trade on an exchange and represent an interest in a portfolio.', available: false },
] as const
const redemptionOptions = [
  { id: 'autocall', label: 'Autocallable', description: 'The product is called early when the underlier is at or above a trigger on a review.', available: true },
  { id: 'bullet', label: 'Bullet', description: 'One payment at scheduled maturity; no early call.', available: true },
  { id: 'issuer-call', label: 'Issuer callable', description: 'The issuer may redeem the product early, on a review it chooses.', available: true },
  { id: 'puttable', label: 'Puttable', description: 'The holder may require redemption under defined terms.', available: false },
] as const
const reviewFrequencyOptions: ReadonlyArray<{ id: ReviewFrequency; label: string }> = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'semi-annual', label: 'Semi-annual' },
  { id: 'annual', label: 'Annual' },
]
// Each level of the determination is chosen on its own. A fixed initial level and a final level on the final date is point-to-point.
const initialDeterminationOptions: ReadonlyArray<{ id: InitialDetermination['kind']; label: string; description: string }> = [
  { id: 'given', label: 'Fixed', description: 'Uses the initial level set in the terms.' },
  { id: 'lookback', label: 'Lookback', description: 'Uses the lowest of the levels on the pricing date and on several stated dates after it.' },
]
const finalDeterminationOptions: ReadonlyArray<{ id: FinalDetermination['kind']; label: string; description: string }> = [
  { id: 'averaging', label: 'Averaging', description: 'Uses the average of levels observed on several stated dates.' },
  { id: 'final-date', label: 'Final date', description: 'Uses the level on the one final date.' },
]
const underlierOptions = [
  { id: 'basket', label: 'Basket', description: 'Several assets whose changes are combined into one return.', available: true },
  { id: 'single', label: 'Single', description: 'One asset.', available: true },
] as const
const basketReturnOptions = [
  { id: 'weighted', label: 'Weighted', description: 'Adds up each asset’s return times its weight.', available: true },
  { id: 'worst-of', label: 'Worst of', description: 'Uses the return of the asset that performs worst.', available: true },
  { id: 'best-of', label: 'Best of', description: 'Uses the return of the asset that performs best.', available: true },
] as const
const assetOptions: ReadonlyArray<{ id: AssetKind; label: string }> = [
  { id: 'equity-index', label: 'Equity index' },
  { id: 'equity', label: 'Equity' },
]
const [startingComponent] = startingProduct.underlier.components
const assetKind = ref<AssetKind>(startingComponent.asset.kind)
const assetName = ref(startingComponent.asset.name)
const principal = ref(startingProduct.principalAmount)
const wrapper = ref<Wrapper>(startingProduct.wrapper)
const termMonths = ref(startingProduct.term.months)
// An autocall tests the underlier on the reviews of a schedule. The level on each review before the last is a scenario input.
const redemptionKind = ref<'bullet' | 'autocall' | 'issuer-call'>('bullet')
// The reviews start at a frequency that suits the term, and follow it as the term changes until the reader chooses one.
const chosenFrequency = ref<ReviewFrequency | null>(null)
const reviewFrequency = computed<ReviewFrequency>({
  get: () => chosenFrequency.value ?? suggestedFrequency(termMonths.value),
  set: (frequency) => { chosenFrequency.value = frequency },
})
const triggerPercent = ref(100)
const callAmountPercent = ref(8)
// An issuer call has its own call amount, which starts at zero: the two public notes read pay no premium on a call, and an autocall's
// starting amount is a teaching choice that should not carry over to it.
const issuerAmountPercent = ref(0)
const callAmountField = computed({
  get: () => (issuerCalled.value ? issuerAmountPercent.value : callAmountPercent.value),
  set: (percent: number) => { if (issuerCalled.value) issuerAmountPercent.value = percent; else callAmountPercent.value = percent },
})
const nonCallReviewCount = ref(0)
const triggerStepPercent = ref(0)
const callAmountBasis = ref<'flat' | 'per-year'>('flat')
const callOnFinal = ref(false)
// A coupon on its own reviews: fixed, paid on every review, or contingent, paid on a review at or above its barrier. Its terms keep
// their last values while it is off, and the barrier and memory theirs while it is fixed.
const couponKind = ref<'none' | 'fixed' | 'contingent'>('none')
const couponSelected = computed(() => couponKind.value !== 'none')
const contingentCoupon = computed(() => couponKind.value === 'contingent')
const couponRatePercent = ref(firstFeatureValues.coupon)
const couponBarrierPercent = ref(firstFeatureValues.couponBarrier)
const couponMemory = ref(false)
// The coupon's reviews start at a frequency that suits the term, as the call's do, and follow it until the reader chooses one.
const chosenCouponFrequency = ref<ReviewFrequency | null>(null)
const couponFrequency = computed<ReviewFrequency>({
  get: () => chosenCouponFrequency.value ?? suggestedFrequency(termMonths.value),
  set: (frequency) => { chosenCouponFrequency.value = frequency },
})
// Copies the call's frequency to the coupon once. The two stay separate terms, so changing one later leaves the other.
const copyCallReviews = () => { beginGesture(); couponFrequency.value = reviewFrequency.value }
const autocalled = computed(() => redemptionKind.value === 'autocall')
const issuerCalled = computed(() => redemptionKind.value === 'issuer-call')
// Both read the reviews of a schedule: an autocall tests a level on each, and an issuer call is the issuer's choice of one.
const scheduled = computed(() => autocalled.value || issuerCalled.value)
// The issuer's choice in a scenario: the number of the review it calls on, or null when it does not call.
const issuerCallsOn = ref<number | null>(null)
const reviewLevelInputs = ref<Record<number, number>>({})
// A schedule with many reviews is allowed, but each review is a level to set, so the reader is told what a coarser one would give.
const reviewNudge = computed(() => {
  const count = scheduled.value ? reviewCount({ term: { months: termMonths.value }, schedule: { frequency: reviewFrequency.value } }) : undefined
  if (count === undefined || count <= 24) return ''
  const suggested = suggestedFrequency(termMonths.value)
  const suggestedCount = reviewCount({ term: { months: termMonths.value }, schedule: { frequency: suggested } })
  if (suggestedCount === undefined || suggestedCount >= count) return ''
  const label = reviewFrequencyOptions.find(({ id }) => id === suggested)!.label.toLowerCase()
  return `${count} reviews is a lot to set by hand. ${label[0].toUpperCase()}${label.slice(1)} reviews would give ${suggestedCount}.`
})
// For a basket the level of each asset on each review, review by review, in the order of the assets.
const reviewAssetInputs = ref<Record<number, number[]>>({})
// A term of whole years is also shown in years, as term sheets often state it.
const termYears = computed(() => Number.isInteger(termMonths.value) && termMonths.value > 0 && termMonths.value % 12 === 0 ? `${termMonths.value / 12} year${termMonths.value === 12 ? '' : 's'}` : null)
// The level on the pricing date. With a fixed initial level it is the stated term; with lookback it is the first observed
// level, a scenario input. Keeping one value means switching between the two keeps the reader's number.
const initialLevel = ref(startingInitialLevel)
const initialKind = ref<InitialDetermination['kind']>(startingProduct.underlier.determination.initial.kind)
const lookbackCount = ref(firstLookbackMoves.length)
const finalKind = ref<FinalDetermination['kind']>(startingProduct.underlier.determination.final.kind)
const observationCount = ref(firstObservationCount)
const underlierKind = ref<Underlier['kind']>(startingProduct.underlier.kind)
const isBasket = computed(() => underlierKind.value === 'basket')
// How a basket's asset returns make its return. Weights are kept while another rule is chosen, and are not part of the note then.
const basketReturnKind = ref<BasketReturn['kind']>('weighted')
const weighted = computed(() => basketReturnKind.value === 'weighted')
// The terms of each asset in a basket, in order. While the note tracks a basket, the single asset's terms above are not read.
interface BasketAsset { kind: AssetKind; name: string; initialLevel: number; weightPercent: number }
const basketAssets = ref<BasketAsset[]>([])
// Hypothetical observed levels of each asset in a basket, in date order, as last edited. They are scenario inputs, not note terms.
const basketLevels = ref<number[][]>([])
// The asset a basket adds the first time one is built, beside the single asset: a synthetic equity on its own scale.
const secondAsset = { kind: 'equity' as const, name: 'Synthetic Co', initialLevel: 40 }
const withEqualWeights = (assets: BasketAsset[]) => {
  const weights = equalWeights(assets.length)
  return assets.map((asset, index) => ({ ...asset, weightPercent: Math.round(weights[index] * 1000000) / 10000 }))
}
// A basket starts from the single asset, as its first asset, and keeps the other assets from the last time it was built.
// Returning to a single asset keeps the first one. Lookback is not modelled on a basket, so a basket's initial levels are fixed.
function setUnderlierKind(kind: Underlier['kind']) {
  beginGesture()
  if (kind === 'basket') {
    const first = { kind: assetKind.value, name: assetName.value, initialLevel: initialLevel.value }
    const others = basketAssets.value.slice(1)
    basketAssets.value = others.length ? [{ ...basketAssets.value[0], ...first }, ...others] : withEqualWeights([{ ...first, weightPercent: 0 }, { ...secondAsset, weightPercent: 0 }])
    // The second asset starts with the same return on every date as the single asset, so the basket starts where the asset was.
    const otherLevels = basketLevels.value.slice(1)
    basketLevels.value = [observations.value, ...(otherLevels.length ? otherLevels : [observations.value.map((level) => Math.round(level / initialLevel.value * secondAsset.initialLevel * 100) / 100)])]
    initialKind.value = 'given'
  } else {
    const [first] = basketAssets.value
    assetKind.value = first.kind
    assetName.value = first.name
    initialLevel.value = first.initialLevel
    observedLevels.value = basketObservations.value[0]
  }
  underlierKind.value = kind
}
// A new asset starts flat, at its initial level on every date. Adding or removing an asset gives every asset an equal weight again.
function addAsset() {
  beginGesture()
  const names = new Set(basketAssets.value.map(({ name }) => name))
  let n = basketAssets.value.length + 1
  while (names.has(`Synthetic Asset ${n}`)) n++
  basketAssets.value = withEqualWeights([...basketAssets.value, { kind: 'equity', name: `Synthetic Asset ${n}`, initialLevel: 100, weightPercent: 0 }])
  basketLevels.value = [...basketObservations.value, basketObservations.value[0].map(() => 100)]
}
function removeAsset(index: number) {
  beginGesture()
  basketAssets.value = withEqualWeights(basketAssets.value.filter((_, i) => i !== index))
  basketLevels.value = basketObservations.value.filter((_, i) => i !== index)
  reviewAssetInputs.value = Object.fromEntries(Object.entries(reviewAssetInputs.value).map(([month, levels]) => [month, levels.filter((_, i) => i !== index)]))
}
const determination = computed<Determination>(() => ({
  initial: initialKind.value === 'lookback' ? { kind: 'lookback', observationCount: lookbackCount.value } : { kind: 'given', level: initialLevel.value },
  final: finalKind.value === 'averaging' ? { kind: 'averaging', observationCount: observationCount.value } : { kind: 'final-date' },
}))
const lookingBack = computed(() => initialKind.value === 'lookback')
const averaging = computed(() => finalKind.value === 'averaging')
// Hypothetical levels after pricing, in date order, as last edited. They are a scenario input, not a note term. The first
// time lookback is chosen they start from the pricing-date level as it is then.
const lookbackLevels = ref<number[]>([])
watch(initialKind, (kind) => {
  if (kind === 'lookback' && !lookbackLevels.value.length) lookbackLevels.value = firstLookbackMoves.map((move) => Math.round(initialLevel.value * (1 + move)))
})
// Hypothetical observed levels, in date order, as last edited. They are a scenario input, not a note term.
const observedLevels = ref<number[]>([startingFinalLevel])

// The part of the note the reader is looking at. It highlights that part's outline row, sentence phrase, JSON lines and chart elements.
const selected = ref<ConceptId>('payoff')
const select = (concept: ConceptId) => { selected.value = concept }
const conceptColors: Record<ConceptId, string> = { wrapper: '#4f6fae', redemption: '#2e8b83', schedule: '#2c8ea3', trigger: '#1f8a70', 'trigger-step': '#7a9a1e', 'call-amount': '#0f766e', 'final-call': '#3d7ea6', 'non-call': '#4d7c9b', coupon: '#b5446e', 'coupon-schedule': '#9b4d7a', 'coupon-barrier': '#8a5a00', memory: '#55708a', underlier: '#7a5cb5', asset: '#9c6ade', determination: '#b7791f', 'initial-level': '#8b4f2b', 'final-level': '#6b6412', 'basket-return': '#5f5aa2', payoff: '#42536d', protection: '#2369bd', 'minimum-return': '#4338ca', 'digital-return': '#c2255c', 'digital-barrier': '#087f5b', upside: '#2b8a3e', downside: '#d9480f', cap: '#a23b8c', buffer: '#1aa3b8', barrier: '#9775fa', 'absolute-return': '#d4a017' }
const conceptStyle = (concept: ConceptId) => ({ '--c': conceptColors[concept] })
const highlighted = (concept: ConceptId) => isHighlighted(selected.value, concept)

// Payoff features are added one at a time to a payoff that starts with none. A removed feature keeps its last value.
// A buffer, barrier or absolute return belongs to downside participation and a cap or upside barrier to upside participation, so each is added under its direction.
// A rebate belongs to the upside barrier.
type FeatureId = 'absolute-both' | 'absolute-return' | 'conditional' | 'barrier' | 'buffer' | 'cap' | 'digital' | 'downside' | 'minimum' | 'protection' | 'rebate' | 'upside-barrier' | 'upside'
const payoffFeatures: ReadonlyArray<{ id: FeatureId; label: string; description: string; available: boolean; requires?: ParticipationDirection }> = [
  { id: 'absolute-return', label: 'Absolute return', description: 'Pays a fall within the buffer, or ending above the downside barrier, as a gain.', available: true, requires: 'downside' },
  { id: 'absolute-both', label: 'Absolute return (both directions)', description: 'Pays the absolute value of the underlier’s return, a rise or a fall alike, until it goes beyond the feature’s lower or upper barrier. After that it pays a fixed return, or only principal.', available: true },
  { id: 'buffer', label: 'Buffer', description: 'Protects against an initial portion of underlier losses.', available: true, requires: 'downside' },
  { id: 'cap', label: 'Cap', description: 'Limits the return upside participation can add.', available: true, requires: 'upside' },
  { id: 'conditional', label: 'Conditional return', description: 'Pays a fixed return once either barrier is reached, in place of the absolute return.', available: true },
  { id: 'digital', label: 'Digital', description: 'Pays a predefined amount if a stated condition is met.', available: true },
  { id: 'barrier', label: 'Downside barrier', description: 'Downside participation applies only if the underlier ends below a stated level.', available: true, requires: 'downside' },
  { id: 'downside', label: 'Downside participation', description: 'Negative underlier return is multiplied by the downside participation rate until the protection floor applies.', available: true },
  { id: 'minimum', label: 'Minimum return', description: 'Sets the lowest return paid on principal, whatever the underlier does.', available: true },
  { id: 'protection', label: 'Principal protection', description: 'Sets the minimum contractual maturity payment as a percentage of principal.', available: true },
  { id: 'rebate', label: 'Rebate', description: 'Pays a fixed return in place of upside participation once the upside barrier is reached.', available: true },
  { id: 'upside-barrier', label: 'Upside barrier', description: 'Upside participation applies only if the underlier ends below a stated level.', available: true, requires: 'upside' },
  { id: 'upside', label: 'Upside participation', description: 'Positive underlier return is multiplied by the upside participation rate.', available: true },
]
const participationLabels: Record<ParticipationDirection, string> = { downside: 'Downside participation', upside: 'Upside participation' }
const participationPercent = reactive<Record<ParticipationDirection, number>>({ downside: firstFeatureValues.downside, upside: firstFeatureValues.upside })
const selectedParticipation = reactive<Record<ParticipationDirection, boolean>>({ downside: false, upside: false })
const protectionSelected = ref(false)
const protectionPercent = ref(firstFeatureValues.protection)
const capSelected = ref(false)
const capPercent = ref(firstFeatureValues.cap)
const bufferSelected = ref(false)
const bufferPercent = ref(firstFeatureValues.buffer)
const barrierSelected = ref(false)
const barrierPercent = ref(firstFeatureValues.barrier)
const upsideBarrierSelected = ref(false)
const upsideBarrierPercent = ref(firstFeatureValues.upsideBarrier)
const rebateSelected = ref(false)
const rebatePercent = ref(firstFeatureValues.rebate)
const absoluteSelected = ref(false)
const absolutePercent = ref(firstFeatureValues.absoluteReturn)
// When each barrier is observed. Daily close reads the lowest or highest closing level from pricing to the final date.
const barrierObservation = ref<BarrierObservation>('final')
const upsideBarrierObservation = ref<BarrierObservation>('final')
// Hypothetical lowest and highest closes, as last edited: scenario inputs, not note terms. Left unset, no close goes beyond the
// levels the scenario already states.
const lowestCloseInput = ref<number>()
const highestCloseInput = ref<number>()
const dailyDownside = computed(() => barrierSelected.value && barrierObservation.value === 'daily-close')
const dailyUpside = computed(() => upsideBarrierSelected.value && upsideBarrierObservation.value === 'daily-close')
// The lowest close is read by a daily downside barrier or a daily lower barrier, the highest by a daily upside or upper barrier.
const lowestCloseWanted = computed(() => dailyDownside.value || (bothWaysSelected.value && lowerObservation.value === 'daily-close'))
const highestCloseWanted = computed(() => dailyUpside.value || (bothWaysSelected.value && upperObservation.value === 'daily-close'))
const dailySelected = computed(() => lowestCloseWanted.value || highestCloseWanted.value)
// Why a barrier cannot be observed daily, or null when it can: the same rules productIssues enforces.
const dailyBlockedReason = (direction: ParticipationDirection) => {
  if (scheduled.value) return autocalled.value ? 'Not with an autocall' : 'Not with an issuer call'
  // A contingent coupon reads levels the closes would have to agree with; a fixed coupon reads none.
  if (contingentCoupon.value) return 'Not with a contingent coupon'
  if (lookingBack.value || isBasket.value) return 'Not with lookback or a basket'
  if (direction === 'downside' && absoluteSelected.value) return 'Not with absolute return'
  return null
}
const minimumSelected = ref(false)
const minimumPercent = ref(firstFeatureValues.minimum)
// A digital return: a fixed return on principal, paid as a floor at or above its barrier, which it owns. The barrier is read on the final date only.
const digitalSelected = ref(false)
const digitalPercent = ref(firstFeatureValues.digital)
const digitalBarrierPercent = ref(firstFeatureValues.digitalBarrier)
// Barrier absolute return: a payoff of its own with a lower and an upper barrier, each with its own level and observation, and an
// optional conditional return. Both barriers are observed on every close at first, as the public notes are.
const bothWaysSelected = ref(false)
const bothWaysRate = ref(firstFeatureValues.absoluteReturn)
const lowerBarrierPercent = ref(firstFeatureValues.lowerBarrier)
const upperBarrierPercent = ref(firstFeatureValues.upperBarrier)
const lowerObservation = ref<BarrierObservation>('daily-close')
const upperObservation = ref<BarrierObservation>('daily-close')
const conditionalSelected = ref(false)
const conditionalPercent = ref(firstFeatureValues.conditional)
const selectedDirections = computed(() => (['downside', 'upside'] as ParticipationDirection[]).filter((direction) => selectedParticipation[direction]))
const isAdded = (id: FeatureId) => id === 'digital' ? digitalSelected.value : id === 'absolute-both' ? bothWaysSelected.value : id === 'conditional' ? conditionalSelected.value : id === 'protection' ? protectionSelected.value : id === 'minimum' ? minimumSelected.value : id === 'cap' ? capSelected.value : id === 'buffer' ? bufferSelected.value : id === 'barrier' ? barrierSelected.value : id === 'upside-barrier' ? upsideBarrierSelected.value : id === 'rebate' ? rebateSelected.value : id === 'absolute-return' ? absoluteSelected.value : id === 'downside' || id === 'upside' ? selectedParticipation[id] : false
// Why a feature cannot be added yet, or null when it can: it needs its direction first, a buffer and a barrier are not combined,
// and absolute return pays the falls a buffer or barrier keeps from downside participation, so it needs one of them.
// A deposit is repaid in full, so it takes nothing that could pay less than principal; a minimum return is on deposits only.
const depositExcludes: ReadonlyArray<FeatureId> = ['downside', 'buffer', 'barrier', 'protection', 'digital']
// Why a redemption cannot be chosen, or null: the same rules productIssues enforces. The one already chosen stays available.
const redemptionBlockedReason = (id: string) => {
  if (((id === 'autocall' && !autocalled.value) || (id === 'issuer-call' && !issuerCalled.value)) && (dailySelected.value || bothWaysSelected.value)) return 'not with a daily barrier'
  return null
}
const couponBlockedReason = computed(() => dailySelected.value || bothWaysSelected.value ? 'not with a daily barrier' : null)
const blockedReason = (id: FeatureId) => {
  if (wrapper.value === 'deposit' && depositExcludes.includes(id)) return 'Not on a deposit'
  if (wrapper.value !== 'deposit' && id === 'minimum') return 'Deposits only'
  // Barrier absolute return is a payoff of its own: it replaces participation, and has no minimum return, lookback, basket or averaging beside it.
  if (id === 'absolute-both' && selectedDirections.value.length) return 'Not with participation'
  if (id === 'absolute-both' && minimumSelected.value) return 'Not with a minimum return'
  if (id === 'absolute-both' && digitalSelected.value) return 'Not with a digital return'
  if (id === 'absolute-both' && scheduled.value) return autocalled.value ? 'Not with an autocall' : 'Not with an issuer call'
  if (id === 'absolute-both' && contingentCoupon.value) return 'Not with a contingent coupon'
  if (id === 'absolute-both' && (lookingBack.value || isBasket.value || averaging.value)) return 'Not with lookback, a basket or averaging'
  if (id === 'conditional' && !bothWaysSelected.value) return 'Needs absolute return in both directions'
  if (bothWaysSelected.value && (id === 'downside' || id === 'upside' || id === 'minimum' || id === 'digital')) return 'Not with absolute return in both directions'
  const requires = payoffFeatures.find((feature) => feature.id === id)?.requires
  if (requires && !selectedParticipation[requires]) return `Needs ${participationLabels[requires].toLowerCase()}`
  if (id === 'barrier' && bufferSelected.value) return 'Not with a buffer'
  if (id === 'buffer' && barrierSelected.value) return 'Not with a downside barrier'
  // A cap and an upside barrier both limit the gain on a rise, and no public note combining them was verified. A rebate is paid by the upside barrier.
  if (id === 'upside-barrier' && capSelected.value) return 'Not with a cap'
  // No public note combines a digital return with an upside barrier, so they are not combined.
  if (id === 'upside-barrier' && digitalSelected.value) return 'Not with a digital return'
  if (id === 'digital' && upsideBarrierSelected.value) return 'Not with an upside barrier'
  if (id === 'cap' && upsideBarrierSelected.value) return 'Not with an upside barrier'
  if (id === 'rebate' && !upsideBarrierSelected.value) return 'Needs an upside barrier'
  if (id === 'absolute-return' && !bufferSelected.value && !barrierSelected.value) return 'Needs a buffer or downside barrier'
  if (id === 'absolute-return' && dailyDownside.value) return 'Not with a daily downside barrier'
  return null
}
// Why a wrapper cannot be chosen, or null when it can. Switching never removes the reader's terms, so a wrapper is
// unavailable while the payoff has a feature it does not allow.
const wrapperBlockedReason = (id: string) => {
  if (id === 'deposit' && selectedParticipation.downside) return 'Not with downside participation'
  if (id === 'deposit' && protectionSelected.value) return 'Not with principal protection'
  if (id === 'deposit' && digitalSelected.value) return 'Not with a digital return'
  if (id === 'note' && minimumSelected.value) return 'Not with a minimum return'
  return null
}
const setWrapper = (id: string) => {
  if (id !== 'note' && id !== 'deposit') return
  beginGesture()
  wrapper.value = id
}
const hasFeatures = computed(() => bothWaysSelected.value || digitalSelected.value || protectionSelected.value || minimumSelected.value || capSelected.value || bufferSelected.value || barrierSelected.value || selectedDirections.value.length > 0)

const paletteOpen = ref(false)
const paletteQuery = ref('')
const paletteRoot = ref<HTMLElement | null>(null)
const paletteSearch = ref<HTMLInputElement | null>(null)
const addButton = ref<HTMLButtonElement | null>(null)
const matchingFeatures = computed(() => {
  const query = paletteQuery.value.trim().toLowerCase()
  return payoffFeatures.filter(({ label, description }) => !query || `${label} ${description}`.toLowerCase().includes(query))
})
const openPalette = async () => {
  paletteOpen.value = true
  paletteQuery.value = ''
  await nextTick()
  paletteSearch.value?.focus()
}
const closePalette = (returnFocus = false) => {
  paletteOpen.value = false
  if (returnFocus) addButton.value?.focus()
}
const addFeature = async (id: FeatureId) => {
  const feature = payoffFeatures.find((candidate) => candidate.id === id)
  if (!feature?.available || isAdded(id) || blockedReason(id)) return
  beginGesture()
  if (id === 'protection') protectionSelected.value = true
  else if (id === 'minimum') minimumSelected.value = true
  else if (id === 'digital') digitalSelected.value = true
  else if (id === 'cap') capSelected.value = true
  else if (id === 'buffer') bufferSelected.value = true
  else if (id === 'barrier') barrierSelected.value = true
  else if (id === 'upside-barrier') upsideBarrierSelected.value = true
  else if (id === 'rebate') rebateSelected.value = true
  else if (id === 'absolute-return') absoluteSelected.value = true
  else if (id === 'absolute-both') bothWaysSelected.value = true
  else if (id === 'conditional') conditionalSelected.value = true
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = true
  paletteOpen.value = false
  await nextTick()
  document.getElementById(`rate-${id}`)?.focus()
}
const removeFeature = async (id: FeatureId) => {
  beginGesture()
  if (id === 'protection') protectionSelected.value = false
  else if (id === 'minimum') minimumSelected.value = false
  else if (id === 'digital') digitalSelected.value = false
  else if (id === 'cap') capSelected.value = false
  else if (id === 'buffer') bufferSelected.value = false
  else if (id === 'barrier') barrierSelected.value = false
  else if (id === 'upside-barrier') upsideBarrierSelected.value = false
  else if (id === 'rebate') rebateSelected.value = false
  else if (id === 'absolute-return') absoluteSelected.value = false
  else if (id === 'absolute-both') bothWaysSelected.value = false
  else if (id === 'conditional') conditionalSelected.value = false
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = false
  // Removing a direction removes the buffer, barrier or cap that belongs to it, and removing the buffer or barrier removes the
  // absolute return that depends on it.
  if (id === 'downside') { bufferSelected.value = false; barrierSelected.value = false }
  if (id === 'downside' || id === 'buffer' || id === 'barrier') absoluteSelected.value = false
  if (id === 'upside') { capSelected.value = false; upsideBarrierSelected.value = false; rebateSelected.value = false }
  if (id === 'upside-barrier') rebateSelected.value = false
  if (id === 'absolute-both') conditionalSelected.value = false
  // The barrier concept belongs to both barriers, so it stays selected while either remains.
  if ((selected.value === 'barrier' && !barrierSelected.value && !upsideBarrierSelected.value && !bothWaysSelected.value) || selected.value === id || (id === 'minimum' && selected.value === 'minimum-return') || (id === 'digital' && (selected.value === 'digital-return' || selected.value === 'digital-barrier')) || (id === 'downside' && (selected.value === 'buffer' || selected.value === 'barrier' || selected.value === 'absolute-return'))
    || ((id === 'buffer' || id === 'barrier') && selected.value === 'absolute-return') || (id === 'upside' && selected.value === 'cap') || (id === 'absolute-both' && selected.value === 'absolute-return')) selected.value = 'payoff'
  await nextTick()
  addButton.value?.focus()
}
const addFirstMatch = () => {
  const first = matchingFeatures.value.find(({ id, available }) => available && !isAdded(id) && !blockedReason(id))
  if (first) addFeature(first.id)
}
const closeOnOutsidePointer = (event: PointerEvent) => {
  if (paletteOpen.value && !paletteRoot.value?.contains(event.target as Node)) paletteOpen.value = false
  if (activeHint.value && !(event.target as Element).closest('.hint-button, .hint-text, .name-chip')) activeHint.value = null
}
const closeHintOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && activeHint.value) activeHint.value = null
}
onMounted(() => {
  document.addEventListener('pointerdown', closeOnOutsidePointer)
  document.addEventListener('keydown', closeHintOnEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutsidePointer)
  document.removeEventListener('keydown', closeHintOnEscape)
})

// A weight or minimum return entered as a percent, as a fraction without the floating-point noise of dividing (33.34 / 100 is 0.33340000000000003).
const fractionFrom = (percent: number) => Math.round(percent * 1e8) / 1e10
// The weights entered so far and how far they are from 100%, so the reader can see what is left to allocate.
const weightTotal = computed(() => {
  const total = Math.round(basketAssets.value.reduce((sum, { weightPercent }) => sum + weightPercent, 0) * 100) / 100
  if (!Number.isFinite(total)) return 'total —'
  const gap = Math.round((100 - total) * 100) / 100
  return gap === 0 ? `total ${formatAmount(total)}%` : `total ${formatAmount(total)}% · ${formatAmount(Math.abs(gap))}% ${gap > 0 ? 'left' : 'over'}`
})
// Each weight sits on its asset. Each initial level refers to its asset by name, as the note states it.
const underlier = computed<Underlier>(() => !isBasket.value
  ? { kind: 'single', components: [{ asset: { kind: assetKind.value, name: assetName.value } }], determination: determination.value }
  : {
      kind: 'basket',
      components: basketAssets.value.map(({ kind, name, weightPercent }) => weighted.value ? { asset: { kind, name }, weight: fractionFrom(weightPercent) } : { asset: { kind, name } }),
      determination: {
        initial: { kind: 'given', levels: basketAssets.value.map(({ name, initialLevel }) => ({ asset: name, level: initialLevel })) },
        final: determination.value.final,
        basketReturn: { kind: basketReturnKind.value },
      },
    })
const note = computed<Product>(() => ({
  wrapper: wrapper.value,
  principalAmount: principal.value,
  term: { months: termMonths.value },
  redemption: issuerCalled.value
    ? { kind: 'issuer-call', schedule: { frequency: reviewFrequency.value }, nonCallReviews: nonCallReviewCount.value, callAmount: fractionFrom(issuerAmountPercent.value), callAmountBasis: callAmountBasis.value }
    : autocalled.value
    ? {
        kind: 'autocall',
        schedule: { frequency: reviewFrequency.value },
        trigger: fractionFrom(triggerPercent.value),
        // Every term the outline shows is stated, including one at its default, so the structure reads as the outline does.
        nonCallReviews: nonCallReviewCount.value,
        triggerStep: fractionFrom(triggerStepPercent.value),
        callAmount: fractionFrom(callAmountPercent.value),
        callAmountBasis: callAmountBasis.value,
        callOnFinalReview: callOnFinal.value,
      }
    : 'bullet',
  coupon: !couponSelected.value ? undefined
    : contingentCoupon.value ? { schedule: { frequency: couponFrequency.value }, rate: fractionFrom(couponRatePercent.value), barrier: fractionFrom(couponBarrierPercent.value), memory: couponMemory.value }
      : { schedule: { frequency: couponFrequency.value }, rate: fractionFrom(couponRatePercent.value) },
  underlier: underlier.value,
  payoff: {
    participations: withSubFeatures(selectedDirections.value.map((direction) => ({ direction, rate: participationPercent[direction] / 100 })), {
      buffer: bufferSelected.value ? bufferPercent.value / 100 : undefined,
      barrier: barrierSelected.value ? { level: barrierPercent.value / 100, observation: barrierObservation.value } : undefined,
      upsideBarrier: upsideBarrierSelected.value ? { level: fractionFrom(upsideBarrierPercent.value), observation: upsideBarrierObservation.value, rebate: rebateSelected.value ? fractionFrom(rebatePercent.value) : undefined } : undefined,
      absoluteReturn: absoluteSelected.value ? { rate: absolutePercent.value / 100 } : undefined,
      cap: capSelected.value ? capPercent.value / 100 : undefined,
    }),
    barrierAbsoluteReturn: bothWaysSelected.value ? {
      rate: bothWaysRate.value / 100,
      lowerBarrier: { level: fractionFrom(lowerBarrierPercent.value), observation: lowerObservation.value },
      upperBarrier: { level: fractionFrom(upperBarrierPercent.value), observation: upperObservation.value },
      conditionalReturn: conditionalSelected.value ? fractionFrom(conditionalPercent.value) : undefined,
    } : undefined,
    principalProtection: protectionSelected.value ? protectionPercent.value / 100 : undefined,
    digitalReturn: digitalSelected.value ? { amount: fractionFrom(digitalPercent.value), barrier: { level: fractionFrom(digitalBarrierPercent.value), observation: 'final' } } : undefined,
    minimumReturn: minimumSelected.value ? fractionFrom(minimumPercent.value) : undefined,
  },
}))
const jsonLines = computed(() => structureLines(note.value))
// With an autocall the payment rule is what is paid at maturity, when the product has not been called.
const formula = computed(() => [...paymentFormula(note.value).map((line) => scheduled.value && line.lead === 'Payment' ? { ...line, lead: 'At maturity' } : line), ...couponFormula(note.value), ...redemptionFormula(note.value)])
const formulaWords = computed(() => {
  const words = paymentInWords(note.value)
  const coupon = !note.value.coupon ? ''
    : note.value.coupon.barrier === undefined ? ' On each coupon review it also pays a fixed coupon, whatever the underlier does.'
      : ` On each coupon review at or above the coupon barrier it also pays a coupon${note.value.coupon.memory ? ', with any coupons missed before it' : ''}.`
  return `${scheduled.value ? `If it is not called, ${words.startsWith('The ') ? `the ${words.slice(4)}` : words}` : words}${coupon}`
})
// What the final level on the chart belongs to: the asset, or the basket.
const underlierLabel = computed(() => isBasket.value ? 'the basket' : assetName.value.trim() || 'the underlier')
// Copies the JSON exactly as shown. The label says whether it worked, then returns to "Copy" after a moment.
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyReset: ReturnType<typeof setTimeout> | undefined
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(jsonLines.value.map(({ text }) => text).join('\n'))
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
  clearTimeout(copyReset)
  copyReset = setTimeout(() => { copyState.value = 'idle' }, 2000)
}
onBeforeUnmount(() => clearTimeout(copyReset))
const issues = computed(() => productIssues(note.value))
const errors = computed(() => issues.value.map(({ message }) => message))
const issuesFor = (...fields: ProductIssueField[]) => issues.value.filter(({ field }) => fields.includes(field)).map(({ message }) => message)
const summary = computed(() => summarize(note.value))
const names = computed(() => marketingNames(note.value))
const nameHintKey = (name: MarketingName) => `name:${name.name}`
const nameHintId = (name: MarketingName) => `${name.name.toLowerCase().replace(/[^a-z]+/g, '-')}-hint`
// A name that rests on one part of the note selects that part. One that rests on several selects the whole payoff.
const openName = (name: MarketingName) => {
  select(name.concepts.length === 1 ? name.concepts[0] : 'payoff')
  toggleHint(nameHintKey(name))
}
const category = computed(() => productCategory(note.value))
// The observed levels fitted to the count the determination reads. While the count is invalid they are left as they are.
const observations = computed(() => issuesFor('observationCount').length ? observedLevels.value : fitObservations(observedLevels.value, observationCountOf(determination.value.final)))
const setObservation = (index: number, level: number) => { observedLevels.value = observations.value.map((current, i) => i === index ? level : current) }
// Each basket asset's observed levels, fitted to the count in the same way.
const basketObservations = computed(() => basketLevels.value.map((levels) => issuesFor('observationCount').length ? levels : fitObservations(levels, observationCountOf(determination.value.final))))
const setBasketObservation = (asset: number, index: number, level: number) => {
  basketLevels.value = basketObservations.value.map((levels, a) => a === asset ? levels.map((current, i) => i === index ? level : current) : levels)
}
// The chart handle sets the final level. With averaging it moves every observed level together, so the path keeps its shape.
// For a basket it sets the basket level, by moving every asset's return by the same amount.
const setFinalLevel = (level: number) => {
  if (!isBasket.value) observedLevels.value = shiftToAverage(observations.value, level)
  else if (basketMeasure.value) basketLevels.value = shiftReturns(basketObservations.value, basketAssets.value.map(({ initialLevel }) => initialLevel), level / basketStartingLevel - 1 - basketMeasure.value.basketReturn)
}
const finalError = computed(() => {
  if (isBasket.value) return basketObservations.value.flat().every((level) => Number.isFinite(level) && level >= 0) ? '' : averaging.value ? 'Each observed level must be zero or greater.' : 'Each final level must be zero or greater.'
  return observations.value.every((level) => Number.isFinite(level) && level >= 0) ? '' : averaging.value ? 'Each observed level must be zero or greater.' : 'Final level must be zero or greater.'
})
// The levels after pricing fitted to the lookback count, in the same way. Without lookback there are none.
const afterPricing = computed(() => !lookingBack.value ? [] : issuesFor('lookbackObservationCount').length ? lookbackLevels.value : fitLookbackObservations(lookbackLevels.value, lookbackCount.value))
const setAfterPricing = (index: number, level: number) => { lookbackLevels.value = afterPricing.value.map((current, i) => i === index ? level : current) }
// The levels the initial end of the determination reads: with lookback, the pricing-date level and those after it.
const initialObservations = computed(() => lookingBack.value ? [initialLevel.value, ...afterPricing.value] : [])
const lookbackError = computed(() => initialObservations.value.every((level) => Number.isFinite(level) && level > 0) ? '' : 'Each observed level must be greater than zero.')
// The chart and scenarios need only the initial level; the calculation also needs the final level.
const initialValid = computed(() => errors.value.length === 0 && !lookbackError.value)
const valid = computed(() => initialValid.value && !finalError.value)
// A basket measured asset by asset: each return, the weighted return, and the basket's two levels the payoff reads.
const basketMeasure = computed(() => valid.value && note.value.underlier.kind === 'basket' ? basketBreakdown(note.value.underlier, basketObservations.value) : null)
// The initial level every calculation reads, as the initial end of the determination produces it. A basket starts at 100.
const determinedInitialLevel = computed(() => !initialValid.value ? Number.NaN : isBasket.value ? basketStartingLevel : initialLevelFrom(determination.value.initial, initialObservations.value))
// Marks the observed level, or tied levels, that set the lookback level.
const isLowest = (level: number) => Number.isFinite(determinedInitialLevel.value) && level === determinedInitialLevel.value
const finalLevel = computed(() => !valid.value ? Number.NaN : basketMeasure.value ? basketMeasure.value.levels.final : finalLevelFrom(determination.value.final, observations.value))
// The closes a barrier observed daily reads. A close is a level on a date in the period, so none can be beyond the initial level
// or any level observed on the final or averaging dates; the reader's level is moved in to stay within them.
const lowestClose = computed(() => lowestCloseWanted.value && initialValid.value ? Math.min(Number.isFinite(lowestCloseInput.value) ? Math.max(0, lowestCloseInput.value as number) : Infinity, determinedInitialLevel.value, ...observations.value) : undefined)
const highestClose = computed(() => highestCloseWanted.value && initialValid.value ? Math.max(Number.isFinite(highestCloseInput.value) ? highestCloseInput.value as number : -Infinity, determinedInitialLevel.value, ...observations.value) : undefined)
// The levels the scenario gives the payment: the determined initial and final levels, and the closes a daily barrier reads. The
// breakdown, the payment at the end of the term and the redemption outcome all read these, so they cannot disagree.
const scenarioLevels = computed(() => ({ initial: determinedInitialLevel.value, final: finalLevel.value, lowestClose: lowestClose.value, highestClose: highestClose.value }))
const breakdown = computed(() => valid.value ? paymentBreakdown(note.value, scenarioLevels.value) : null)
const payment = computed(() => breakdown.value?.payment ?? null)
// What the product pays at the end of its term from the final level, if no earlier review called it. It is the payment the chart
// draws, and differs from the payment only when the final review is a call.
const endPayment = computed(() => valid.value ? paymentAtEnd(note.value, scenarioLevels.value) : null)
// The dates on which a level is read before the end of the term: an autocall's reviews and a coupon's, a date on both once. The last
// review reads the final level, which has its own field.
const datesBeforeLast = computed(() => reviewDates(note.value).slice(0, -1))
// Until the reader sets one, a level is a little below what the date tests, so the product is not called and the payoff is what the chart
// shows: a call review's trigger less a tenth, which moves with the step, or 90% of the initial level on a date that is only a coupon review.
const defaultReviewFraction = (date: ReviewDate) => {
  const { redemption: terms } = note.value
  const trigger = terms === 'bullet' || terms.kind !== 'autocall' || date.call === undefined ? 1 : triggerAtReview(terms, date.call)
  return (Number.isFinite(trigger) ? Math.max(trigger, 0) : 1) * 0.9
}
const defaultReviewLevel = (date: ReviewDate) => (Number.isFinite(determinedInitialLevel.value) ? determinedInitialLevel.value : 100) * defaultReviewFraction(date)
// A basket is read on each date as one level, from the level of each asset by the basket's own rule.
const reviewAssetLevels = computed(() => datesBeforeLast.value.map((date) => basketAssets.value.map(({ initialLevel }, asset) => reviewAssetInputs.value[date.month]?.[asset] ?? initialLevel * defaultReviewFraction(date))))
const reviewLevels = computed(() => {
  const { underlier } = note.value
  if (underlier.kind === 'basket') return reviewAssetLevels.value.map((levels) => initialValid.value && levels.every((level) => Number.isFinite(level) && level >= 0) ? basketLevelFrom(underlier, levels) : Number.NaN)
  return datesBeforeLast.value.map((date) => reviewLevelInputs.value[date.month] ?? defaultReviewLevel(date))
})
const setReviewLevel = (index: number, level: number) => { reviewLevelInputs.value = { ...reviewLevelInputs.value, [datesBeforeLast.value[index].month]: level } }
const setReviewAssetLevel = (index: number, asset: number, level: number) => {
  reviewAssetInputs.value = { ...reviewAssetInputs.value, [datesBeforeLast.value[index].month]: reviewAssetLevels.value[index].map((current, a) => a === asset ? level : current) }
}
const reviewError = computed(() => (isBasket.value ? reviewAssetLevels.value.flat() : reviewLevels.value).every((level) => Number.isFinite(level) && level >= 0) ? '' : 'Each review level must be zero or greater.')
// The review the issuer calls on in the scenario, when it is one the issuer can call on. A choice that the schedule or the non-call
// period has since ruled out is no call, so the outcome never reads a review that cannot call.
const issuerCallableReviews = computed(() => {
  const count = reviewCount({ term: { months: termMonths.value }, schedule: { frequency: reviewFrequency.value } })
  const first = nonCallReviewCount.value + 1
  return issuerCalled.value && count !== undefined && Number.isInteger(first) && first >= 1 ? Array.from({ length: Math.max(0, count - first) }, (_, index) => first + index) : []
})
const issuerCallChoice = computed(() => issuerCallsOn.value !== null && issuerCallableReviews.value.includes(issuerCallsOn.value) ? issuerCallsOn.value : undefined)
// How the product ended and what its coupon paid, for a product with a call or a coupon. A bullet product with neither pays its payoff.
const redemption = computed(() => (scheduled.value || couponSelected.value) && valid.value && !reviewError.value && breakdown.value
  ? redemptionOutcome(note.value, reviewLevels.value, scenarioLevels.value, issuerCalled.value ? issuerCallChoice.value : undefined)
  : null)
const issuerCallSelection = computed({ get: () => issuerCallChoice.value ?? null, set: (review: number | null) => { issuerCallsOn.value = review } })
const issuerCallMonths = (review: number) => review * monthsPerReview[reviewFrequency.value]
const pathOptions = computed(() => initialValid.value ? pathScenarios(note.value, determinedInitialLevel.value) : [])
const loadPath = (event: Event) => {
  const choice = event.target as HTMLSelectElement
  const path = pathOptions.value[Number(choice.value)]
  choice.value = ''
  if (!path) return
  const months = datesBeforeLast.value.map(({ month }) => month)
  reviewLevelInputs.value = Object.fromEntries(path.reviewLevels.map((level, index) => [months[index], level]))
  // A path is a basket level, so every asset moves by the same share of its initial level, which gives that level under any basket rule.
  reviewAssetInputs.value = Object.fromEntries(path.reviewLevels.map((level, index) => [months[index], basketAssets.value.map(({ initialLevel }) => Math.round(initialLevel * level / basketStartingLevel * 100) / 100)]))
  if (path.finalLevel !== undefined) setFinalLevel(path.finalLevel)
}
// The reviews of a fixed coupon. It reads no level, so they are not among the dates a level is read on, and are found by month.
const fixedCouponReviews = computed(() => {
  const { coupon } = note.value
  return coupon === undefined || coupon.barrier !== undefined ? [] : scheduleReviews(note.value.term, coupon.schedule) ?? []
})
// The coupon review that falls on a date, if any.
const couponReviewOn = (date: ReviewDate) => date.coupon ?? fixedCouponReviews.value.find(({ month }) => month === date.month)?.review
// The rows of the review table: each date a level is read on before the last, with its place among them, and each review of a fixed
// coupon before the last that falls between them, which reads no level and has no place. A product with no date that reads a level
// has no table.
const reviewRows = computed((): Array<{ date: ReviewDate; index?: number }> => {
  const read = datesBeforeLast.value.map((date, index) => ({ date, index }))
  if (!read.length) return read
  const months = new Set(read.map(({ date }) => date.month))
  const unread = fixedCouponReviews.value.filter(({ month }) => month < termMonths.value && !months.has(month)).map(({ review, month }) => ({ date: { month, coupon: review } }))
  return [...read, ...unread].sort((a, b) => a.date.month - b.date.month)
})
// What each date is a review of, for the review table: the call's review, the coupon's, or both.
const reviewLabel = (date: ReviewDate) => [date.call === undefined ? '' : `Call ${date.call}`, couponReviewOn(date) === undefined ? '' : `Coupon ${couponReviewOn(date)}`].filter(Boolean).join(' · ')
// The level a call review needs, as the call reads it: the trigger of that review, as a share of the initial level. None on a date that
// is not a call review, or is in the non-call period.
const reviewTrigger = (date: ReviewDate) => {
  const { redemption: terms } = note.value
  return terms === 'bullet' || terms.kind !== 'autocall' || date.call === undefined || date.call <= nonCallReviewCount.value || !Number.isFinite(determinedInitialLevel.value) ? Number.NaN : barrierLevelAt(triggerAtReview(terms, date.call), determinedInitialLevel.value)
}
// Whether a date is after the one the product ended on, so nothing is read on it.
const ended = (date: ReviewDate) => redemption.value?.calledAtReview !== undefined && date.month > redemption.value.months
const reviewTest = (date: ReviewDate) => {
  if (!redemption.value || date.call === undefined) return ''
  if (ended(date)) return 'Ended'
  if (date.call <= nonCallReviewCount.value) return 'No call'
  return redemption.value.tests.find((test) => test.review === date.call)?.called ? 'Called' : 'Not called'
}
// What a coupon review paid, for the review table, worked out from the rate, or that it missed. A review after
// a call is not tested.
const reviewCoupon = (date: ReviewDate) => {
  const review = couponReviewOn(date)
  if (!redemption.value || !note.value.coupon || review === undefined) return ''
  if (ended(date)) return 'Ended'
  const test = redemption.value.coupons.find((candidate) => candidate.review === review)
  return test ? couponCell(note.value, test) : '—'
}
// A product called before the last review never reaches its final date, so the final level does not set its payment. It is still
// what the chart's dot and the comparison steps read, so the field stays, dimmed, and says so.
const finalUnused = computed(() => {
  const outcome = redemption.value
  if (!outcome || outcome.calledAtReview === undefined || outcome.calledAtReview >= outcome.reviews) return ''
  return `Not used for the payment: the product was called on review ${outcome.calledAtReview}, before the final date. It still sets the chart's dot and the comparison under "If it had run to maturity".`
})
const outcomeSentence = computed(() => {
  if (!breakdown.value) return ''
  const maturity = explainOutcome(note.value, breakdown.value)
  if (!redemption.value) return maturity
  const early = explainRedemption(note.value, redemption.value)
  const coupons = explainCoupons(note.value, redemption.value)
  return [early, redemption.value.calledAtReview === undefined ? maturity : '', coupons].filter(Boolean).join(' ')
})
const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
// A return with its sign, as the calculation shows it: +10%, −43.7%.
const signedPercent = (value: number) => `${value < 0 ? '−' : '+'}${formatPercent(Math.abs(value))}`
const participationSummary = computed(() => selectedDirections.value
  .map((direction) => `${formatPercent(participationPercent[direction] / 100)} ${participationLabels[direction].toLowerCase()}`)
  .join(' and ') || 'none')
const floorSummary = computed(() => minimumSelected.value ? `${formatAmount(principal.value * (1 + minimumPercent.value / 100))}, principal plus the minimum return` : protectionSelected.value ? `${formatPercent(protectionPercent.value / 100)} of principal` : wrapper.value === 'deposit' ? 'principal' : 'zero')
const bufferSummary = computed(() => formatPercent(bufferPercent.value / 100))
const absoluteSummary = computed(() => formatPercent(absolutePercent.value / 100))
const digitalSummary = computed(() => `${formatAmount(principal.value * (1 + digitalPercent.value / 100))} (principal plus the digital return)`)
const capSummary = computed(() => `${formatAmount(principal.value * (1 + capPercent.value / 100))} (a ${formatPercent(capPercent.value / 100)} return on principal)`)
const chartDescription = computed(() => {
  const { coupon } = note.value
  const withCoupon = !coupon ? ''
    : coupon.barrier === undefined ? ' At every final level, the payment at the end of the term also includes the last review’s fixed coupon.'
      : ' At and above the coupon barrier, the payment at the end of the term also includes the last review’s coupon.'
  return `${payoffDescription.value}${withCoupon}`
})
const payoffDescription = computed(() => {
  if (!hasFeatures.value) return 'Contractual maturity payment stays at principal for every final level.'
  if (bothWaysSelected.value) return `Contractual maturity payment rises with the size of the underlier’s move, up or down, between the two barriers, then drops to ${conditionalSelected.value ? 'principal plus the conditional return' : 'principal'} beyond each.${dailySelected.value ? ' A dashed line shows the payment if a barrier had been reached on an earlier close.' : ''}`
  const fall = selectedParticipation.downside
    ? `${absoluteSelected.value ? `rises with falls ${barrierSelected.value ? 'that end at or above the downside barrier, then drops by the whole fall below it' : 'within the buffer, then drops at the buffer level'} and falls` : bufferSelected.value ? `stays at principal for falls within the buffer, then falls` : barrierSelected.value ? 'stays at principal for falls that end at or above the barrier, then drops by the whole fall below it and falls' : 'falls'} with negative underlier returns${protectionSelected.value ? ' until the protection floor applies' : ', but not below zero'}`
    : 'stays at principal for negative underlier returns'
  const rise = selectedParticipation.upside ? `rises with positive underlier returns${capSelected.value ? ' until the cap applies' : upsideBarrierSelected.value ? `, until the upside barrier is reached, then drops to ${rebateSelected.value ? 'principal plus the rebate' : 'principal'}` : ''}` :'stays at principal for flat or positive underlier returns'
  const digitalText = digitalSelected.value ? ` At or above ${formatPercent(digitalBarrierPercent.value / 100)} of the ${lookingBack.value ? 'lookback' : 'initial'} level it pays at least ${formatAmount(principal.value * (1 + digitalPercent.value / 100))}, principal plus the digital return, so the payment jumps there.` : ''
  return `Contractual maturity payment ${fall}. It ${rise}.${digitalText}${minimumSelected.value ? ' It never falls below principal plus the minimum return.' : ''}${dailySelected.value ? ' A dashed line shows the payment if the barrier had been reached on an earlier close.' : ''}`
})

const scenarios = computed(() => !initialValid.value ? [] : scenarioRows(note.value, determinedInitialLevel.value).map(({ returnValue, finalLevel, atBarrier, pastBarrier, atBuffer, afterBreach, atCouponBarrier, breakdown, lastCoupon, endPayment }) => ({
  final: finalLevel,
  returnValue,
  atBarrier,
  pastBarrier,
  atBuffer,
  // The row where a barrier observed daily was reached on an earlier close, with the close that reached it.
  closeNote: !afterBreach ? null : ((close) => close === null ? null : `${close.kind} close ${formatAmount(close.level)}`)(breachClose(breakdown)),
  absolute: breakdown.barrierAbsolute ? (breakdown.barrierAbsolute.reached ? (conditionalSelected.value ? `fixed ${formatPercent(breakdown.participatedReturn)}` : 'barrier reached') : `${formatPercent(bothWaysRate.value / 100)} × |${formatPercent(returnValue)}| = ${formatPercent(breakdown.participatedReturn)}`) : breakdown.absoluteReturnApplies ? `${absoluteSummary.value} × |${formatPercent(returnValue)}| = ${formatPercent(breakdown.participatedReturn)}` : null,
  calculations: Object.fromEntries(selectedDirections.value.map((direction) => [
    direction,
    // At or above the upside barrier the rebate, if there is one, replaces upside participation.
    direction === 'upside' && breakdown.upsideBarrierReached ? (rebateSelected.value ? `rebate ${formatPercent(breakdown.upsideTerm)}` : 'barrier reached')
    : returnValue !== 0 && direction === breakdown.direction && breakdown.participationRate !== undefined && !(direction === 'downside' && breakdown.barrierReached === false) && !breakdown.absoluteReturnApplies
      ? `${formatPercent(breakdown.participationRate)} × ${direction === 'downside' && bufferSelected.value ? `min(${formatPercent(returnValue)} + ${bufferSummary.value}, 0)` : formatPercent(returnValue)} = ${formatPercent(direction === 'downside' ? breakdown.downsideTerm : breakdown.upsideTerm)}`
      : null,
  ])) as Record<ParticipationDirection, string | null>,
  uncappedPayment: breakdown.uncappedPayment,
  unflooredPayment: breakdown.unflooredPayment,
  atCouponBarrier,
  lastCoupon,
  // What the product pays at the end of its term, as the chart draws it: the payoff plus the last coupon, or the final review's call.
  payment: endPayment,
  capApplied: breakdown.capApplies,
  floorApplied: breakdown.floorApplies,
  // The floor that applies is the digital return's: its barrier is met and no higher floor sets the payment.
  digitalApplied: breakdown.floorApplies && breakdown.digitalReturn?.reached === true && breakdown.floor === breakdown.digitalReturn.floor,
})))

// The tabs under the chart.
const tabs = [{ id: 'calculation', label: 'How the payment is worked out' }, { id: 'scenarios', label: 'Scenarios' }]
const activeTab = ref('calculation')
const calculation = computed(() => {
  const b = breakdown.value
  if (!b) return []
  const maturity = calculationSteps(note.value, b, observations.value, initialObservations.value, basketMeasure.value ?? undefined)
  if (!redemption.value) return maturity
  // Reviews come first. When the product was called its payoff steps are what it would have paid at maturity, so they are muted.
  const early = redemptionSteps(note.value, redemption.value)
  const called = redemption.value.calledAtReview !== undefined
  // A called product's annualised return is the one over the months it lasted, in the early steps, so the maturity one is left out. With a
  // coupon the product pays on several reviews, so there is no annualised return from one payment, and the payoff payment is not the
  // last step: the closing steps add the last coupon and the total paid.
  const couponed = note.value.coupon !== undefined
  const payoff = maturity.filter((step) => !((called || couponed) && step.title === 'Annualised return')).map((step) => ({ ...step, muted: step.muted || called, result: step.result && !called && !couponed }))
  // A heading has no number, so the steps are numbered without it.
  let n = 0
  return [...early, ...payoff, ...couponClosingSteps(note.value, redemption.value)].map((step) => ({ ...step, n: step.heading ? 0 : ++n }))
})

// The calculation path: the payoff line built one rule at a time, in the calculation's order (see docs/calculation-path.md). The
// stages at the final level are the scenario's point on each line. The line reads the final level only, as the chart draws it, so the
// closes a barrier observed daily reads are left out here and named in the aside.
const lineLevels = computed(() => ({ initial: scenarioLevels.value.initial, final: scenarioLevels.value.final }))
const pathStages = computed(() => breakdown.value ? lineStages(note.value, paymentBreakdown(note.value, lineLevels.value), lineLevels.value) : [])
const pathAside = computed(() => breakdown.value && (!(scheduled.value || couponSelected.value) || redemption.value) ? scenarioAside(note.value, scenarioLevels.value, redemption.value ?? undefined) : '')
// The stage shown, or null when no path is shown, and the stage it is changing from while a step animates.
const pathAt = ref<number | null>(null)
const pathFrom = ref<number | null>(null)
const pathProgress = ref(1)
const playing = ref(false)
const lastStage = computed(() => pathStages.value.length - 1)
let pathFrame = 0
let playTimer: ReturnType<typeof setTimeout> | undefined
// Motion is an explanation the reader asks for: only a step forward animates, and not at all with reduced motion.
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
function goToStage(index: number, animate = true) {
  cancelAnimationFrame(pathFrame)
  const from = pathAt.value
  pathAt.value = index
  pathFrom.value = from
  if (!animate || from === null || index !== from + 1 || reducedMotion()) {
    pathProgress.value = 1
    return
  }
  pathProgress.value = 0
  const start = performance.now()
  const tick = (now: number) => {
    pathProgress.value = Math.min(1, (now - start) / 450)
    if (pathProgress.value < 1) pathFrame = requestAnimationFrame(tick)
  }
  pathFrame = requestAnimationFrame(tick)
}
function pausePath() {
  playing.value = false
  clearTimeout(playTimer)
}
// Each stage holds long enough to read; one that changes nothing holds for less.
function schedulePlay() {
  clearTimeout(playTimer)
  const changed = pathAt.value === null || (pathLines.value?.changed[pathAt.value] ?? true)
  playTimer = setTimeout(() => {
    if (!playing.value || pathAt.value === null) return
    if (pathAt.value >= lastStage.value) return pausePath()
    goToStage(pathAt.value + 1)
    schedulePlay()
  }, changed ? 1800 : 500)
}
function playPath() {
  if (!pathStages.value.length) return
  if (pathAt.value === null || pathAt.value >= lastStage.value) goToStage(0, false)
  playing.value = true
  schedulePlay()
}
const stepPath = (delta: number) => {
  pausePath()
  goToStage(clamp((pathAt.value ?? -1) + delta, 0, lastStage.value), delta > 0)
}
// Changing a term, the scenario or the selection ends the path at once, so a change is still shown instantly.
function endPath() {
  pausePath()
  cancelAnimationFrame(pathFrame)
  pathAt.value = null
  pathFrom.value = null
}
const pathKey = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    stepPath(event.key === 'ArrowRight' ? 1 : -1)
  } else if (event.key === 'Escape') endPath()
}
onBeforeUnmount(endPath)
// The stage of each calculation step, so a step in the list can be jumped to, and the stage shown.
const stageOfStep = computed(() => {
  const first = new Map<string, number>()
  pathStages.value.forEach(({ step }, index) => { if (!first.has(step)) first.set(step, index) })
  return first
})
const currentStage = computed(() => pathAt.value === null ? null : pathStages.value[pathAt.value] ?? null)
const jumpToStep = (title: string) => {
  const index = stageOfStep.value.get(title)
  if (index === undefined) return
  pausePath()
  goToStage(index, false)
  // On a narrow screen the list is below the chart: bring the chart into view, leaving focus on the step. Nothing moves if it shows.
  chartSvg.value?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
}
const pathStatus = computed(() => {
  const stage = currentStage.value
  if (!stage || pathAt.value === null) return null
  const previous = pathStages.value[pathAt.value - 1]
  const n = calculation.value.find(({ title }) => title === stage.step)?.n
  const change = changeText(lineLevels.value.final / lineLevels.value.initial - 1)
  return {
    // Numbered as the list numbers the step, so the bar and the list agree. A step the list does not show has no number.
    title: `${n ? `Step ${n} · ` : ''}${stage.step}`,
    progress: `${pathAt.value + 1} of ${pathStages.value.length}`,
    detail: stage.detail,
    // What the rule does to the scenario's point.
    point: !previous || Math.abs(previous.amount - stage.amount) < 1e-9 ? `At ${change}: ${formatAmount(stage.amount)}${previous ? ', unchanged' : ''}` : `At ${change}: ${formatAmount(previous.amount)} → ${formatAmount(stage.amount)}`,
    aside: pathAt.value === lastStage.value ? pathAside.value : '',
  }
})

// The chart. Its vertical axis is fitted to the payoff (see chart/geometry.ts), and handles on it edit the same values the outline fields edit.
const viewBoxWidth = 620
const plot: Plot = { left: 50, right: 590, top: 35, bottom: 310 }
const chartSvg = ref<SVGSVGElement | null>(null)
const chartScale = ref(1)
const chartObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => { chartScale.value = Math.max((entry?.contentRect.width || viewBoxWidth) / viewBoxWidth, 0.3) })
watch(chartSvg, (svg, previous) => {
  if (previous) chartObserver?.unobserve(previous)
  if (svg) chartObserver?.observe(svg)
})
onBeforeUnmount(() => chartObserver?.disconnect())

// On wide screens the outline and the JSON stay beside the longer preview. A column taller than the window scrolls with the page
// until its bottom is in view, then holds there, so none of it is out of reach.
const outlinePanel = ref<HTMLElement | null>(null)
const jsonPanel = ref<HTMLElement | null>(null)
const fitStickyTops = () => {
  for (const panel of [outlinePanel.value, jsonPanel.value]) panel?.style.setProperty('--stick-top', `${Math.min(18, window.innerHeight - panel.offsetHeight - 18)}px`)
}
const columnObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fitStickyTops)
onMounted(() => {
  for (const panel of [outlinePanel.value, jsonPanel.value]) if (panel) columnObserver?.observe(panel)
  window.addEventListener('resize', fitStickyTops)
})
onBeforeUnmount(() => {
  columnObserver?.disconnect()
  window.removeEventListener('resize', fitStickyTops)
})
const hitRadius = computed(() => 22 / chartScale.value)
const handleRadius = computed(() => 8 * Math.max(1, 0.7 / chartScale.value))
// Chart text is scaled up as the chart shrinks, so it stays legible on narrow screens.
const labelScale = computed(() => clamp(1 / chartScale.value, 1, 1.6))

// The payoff line from before the current gesture stays as a faint ghost, so the reader can see what a change did.
const ghostNote = ref<Product | null>(null)
function beginGesture() { ghostNote.value = JSON.parse(JSON.stringify(note.value)) as Product }
const focusRow = (concept: ConceptId) => { select(concept); beginGesture() }

type HandleId = 'floor' | 'slope' | 'cap' | 'digital' | 'digital-barrier' | 'buffer' | 'barrier' | 'upside-barrier' | 'lower-barrier' | 'upper-barrier' | 'final'
// The floor is the minimum return on a deposit that has one, and protection otherwise. The two cannot both be present.
const floorConcept = computed<ConceptId>(() => minimumSelected.value ? 'minimum-return' : 'protection')
const handleConcept = (id: HandleId): ConceptId | null => id === 'floor' ? floorConcept.value : { slope: 'upside', cap: 'cap', digital: 'digital-return', 'digital-barrier': 'digital-barrier', buffer: 'buffer', barrier: 'barrier', 'upside-barrier': 'barrier', 'lower-barrier': 'barrier', 'upper-barrier': 'barrier', final: null }[id] as ConceptId | null
const dragging = ref<HandleId | null>(null)
// The axis in view when a drag starts, held until it ends so the line does not move under the pointer.
const frozenAxis = ref<AmountAxis | null>(null)
const svgPoint = (event: PointerEvent) => {
  const matrix = chartSvg.value?.getScreenCTM()
  const point = new DOMPoint(event.clientX, event.clientY)
  return matrix ? point.matrixTransform(matrix.inverse()) : point
}
const focusHandle = (id: HandleId) => {
  const concept = handleConcept(id)
  if (!concept) return
  select(concept)
  beginGesture()
}
const startDrag = (id: HandleId, event: PointerEvent) => {
  const target = event.currentTarget as SVGGElement
  event.preventDefault()
  target.setPointerCapture(event.pointerId)
  target.focus({ preventScroll: true })
  dragging.value = id
  frozenAxis.value = chart.value?.axis ?? null
  focusHandle(id)
}
const dragMove = (id: HandleId, event: PointerEvent) => {
  if (dragging.value !== id) return
  const point = svgPoint(event)
  const top = chart.value?.axis.top ?? 0
  if (id === 'floor' && minimumSelected.value) minimumPercent.value = minimumReturnFromY(point.y, principal.value, top, plot)
  else if (id === 'floor') protectionPercent.value = protectionFromY(point.y, principal.value, top, plot)
  else if (id === 'slope') participationPercent.upside = upsideRateFromY(point.y, principal.value, top, plot, capFraction.value, upsideBarrierFraction.value)
  else if (id === 'cap') capPercent.value = capFromY(point.y, principal.value, top, plot)
  else if (id === 'digital') digitalPercent.value = digitalFromY(point.y, principal.value, top, plot)
  else if (id === 'digital-barrier') digitalBarrierPercent.value = digitalBarrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'buffer') bufferPercent.value = bufferFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'barrier') barrierPercent.value = barrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'upside-barrier') upsideBarrierPercent.value = upsideBarrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'lower-barrier') lowerBarrierPercent.value = barrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'upper-barrier') upperBarrierPercent.value = upsideBarrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else setFinalLevel(finalLevelFromX(point.x, axisScale.value, plot))
}
const endDrag = () => {
  dragging.value = null
  frozenAxis.value = null
}
const keyHandle = (id: HandleId, event: KeyboardEvent) => {
  const delta = keyDelta(event.key, event.shiftKey, id === 'slope' ? 5 : 1)
  if (delta === null) return
  event.preventDefault()
  if (id === 'floor' && minimumSelected.value) minimumPercent.value = clampMinimumReturn(minimumPercent.value + delta)
  else if (id === 'floor') protectionPercent.value = clampProtection(protectionPercent.value + delta)
  else if (id === 'slope') participationPercent.upside = clampUpsideRate(participationPercent.upside + delta)
  else if (id === 'cap') capPercent.value = clampCap(capPercent.value + delta)
  else if (id === 'digital') digitalPercent.value = clampDigital(digitalPercent.value + delta)
  else if (id === 'digital-barrier') digitalBarrierPercent.value = clampDigitalBarrier(digitalBarrierPercent.value + delta)
  // A larger buffer sits further left, so the left and right keys move the handle the way they point.
  else if (id === 'buffer') bufferPercent.value = clampBuffer(bufferPercent.value + (event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? -delta : delta))
  else if (id === 'barrier') barrierPercent.value = clampBarrier(barrierPercent.value + delta)
  else if (id === 'upside-barrier') upsideBarrierPercent.value = clampUpsideBarrier(upsideBarrierPercent.value + delta)
  else if (id === 'lower-barrier') lowerBarrierPercent.value = clampBarrier(lowerBarrierPercent.value + delta)
  else if (id === 'upper-barrier') upperBarrierPercent.value = clampUpsideBarrier(upperBarrierPercent.value + delta)
  else setFinalLevel(clampFinalLevel(finalLevel.value + delta, axisScale.value))
}

// The chart's horizontal axis is the underlier's change, from −100% to +100% of the level the return is measured from: the
// initial level, the lookback level, or the basket's starting level. With lookback, editing a level can rescale it.
const axisScale = computed(() => determinedInitialLevel.value)
// The cap as a fraction of principal, or undefined when the note has none. The slope handle's position depends on it.
const capFraction = computed(() => capSelected.value ? capPercent.value / 100 : undefined)
// The upside barrier as a fraction of the level the return is measured from, while it is above it. The slope handle stays below it.
const upsideBarrierFraction = computed(() => upsideBarrierSelected.value && upsideBarrierPercent.value > 100 ? upsideBarrierPercent.value / 100 : undefined)
const chartHighlight = computed(() => ({
  initial: highlighted('initial-level'),
  final: highlighted('final-level'),
}))
// A feature is selected when the reader picks one part of the payoff rather than the whole of it, which is selected at rest.
const featureSelected = computed(() => selected.value !== 'payoff')
// Each regime is drawn in its concept's colour and labelled with what that concept does.
const regimeConcept = computed<Record<Regime, ConceptId>>(() => ({ principal: 'payoff', buffer: 'buffer', barrier: 'barrier', 'upside-barrier': 'barrier', 'event-below': 'barrier', 'event-above': 'barrier', absolute: 'absolute-return', downside: 'downside', upside: 'upside', floor: floorConcept.value, digital: 'digital-return', cap: 'cap', call: 'final-call' }))
// The order labels claim space in, after the selected feature's: the features that bend the line first, principal last.
const labelPriority: ReadonlyArray<PayoffLabelKey> = ['final-call', 'cap', 'digital-return', 'absolute-return', 'buffer', 'barrier', 'upside-barrier', 'event-below', 'event-above', 'breach', 'upside-breach', 'protection', 'minimum-return', 'downside', 'upside', 'lowest', 'payoff']
// A change of the underlier, as the axis and the bubble show it: +30%, −5%, 0%.
const changeText = (change: number) => Math.abs(change) < 5e-4 ? '0%' : signedPercent(change)
const chart = computed(() => {
  if (!initialValid.value) return null
  const principalAmount = principal.value
  const initial = determinedInitialLevel.value
  const scale = axisScale.value
  const end = scale * levelAxisFactor
  const axisLevels = Array.from({ length: 257 }, (_, i) => end * i / 256)
  // The final levels to sample for a note. A jump, at a barrier or where absolute return stops, adds the level itself and one
  // just to the side it does not pay like: just below it for a downside barrier or buffer, just above it for an upside barrier,
  // which is reached only above its level. The line can then break there. A note can have two, a barrier on each direction.
  const levelsFor = (jumpList: Jump[] = []) => {
    const jumpsInView = jumpList.filter(({ level }) => level > 0 && level < end)
    return [...axisLevels.filter((level) => !jumpsInView.some((jump) => jump.level === level)), ...jumpsInView.flatMap(({ level, paysAbove }) => paysAbove ? [level * (1 - 1e-9), level] : [level, level * (1 + 1e-9)])].sort((a, b) => a - b)
  }
  // A jump is where the payment changes at once between two neighbouring samples at the same place.
  const jumpsIn = (levels: number[], values: number[]) => levels.map((level, i) => i > 0 && level - levels[i - 1] < end * 1e-6 && Math.abs(values[i] - values[i - 1]) > principalAmount * 1e-9)
  // The payment at each final level on the axis, measured from the determined initial level.
  const at = (level: number) => ({ initial, final: level })
  const barrierAt = barrierSelected.value ? initial * barrierPercent.value / 100 : undefined
  const upsideBarrierAt = upsideBarrierSelected.value ? barrierLevelAt(fractionFrom(upsideBarrierPercent.value), initial) : undefined
  const jumpList = jumpsOf(note.value, initial)
  const levels = levelsFor(jumpList)
  const breakdowns = levels.map((level) => paymentBreakdown(note.value, at(level)))
  // At and above the trigger of a final review that is a call, the product is called instead of paying the payoff.
  const finalCall = finalCallLevel(note.value, initial)
  const isCall = (level: number) => finalCall !== undefined && level >= finalCall
  // A coupon adds the last review's coupon at and above its barrier, which only the payment at the end of the term includes.
  const values = levels.map((level, i) => isCall(level) || note.value.coupon ? paymentAtEnd(note.value, at(level)) : breakdowns[i].payment)
  const jumps = jumpsIn(levels, values)
  // A barrier observed on every close adds a dashed line: the payment had the barrier been reached on an earlier close. It is
  // drawn only where it differs from the line, which is the payment when the barrier was not reached.
  const branchValues = levels.map((level) => reachedPayment(note.value, at(level)) ?? Number.NaN)
  const branchRuns = Number.isNaN(branchValues[0]) ? [] : differingRuns(values, branchValues, principalAmount * 1e-6)
  const { minimumReturn } = note.value.payoff
  const floorAmount = principalAmount * (minimumReturn !== undefined ? 1 + minimumReturn : note.value.payoff.principalProtection ?? 0)
  const hasFloor = protectionSelected.value || minimumSelected.value
  const capAmount = principalAmount * (1 + (upsideOf(note.value)?.cap ?? 0))
  // The cap stays in view even where the payoff does not reach it.
  const axis = frozenAxis.value ?? fitAmountAxis(Math.max(...values, ...branchValues.filter((value) => !Number.isNaN(value)), capSelected.value ? capAmount : 0), principalAmount)
  const x = (level: number) => levelToX(level, scale, plot)
  const y = (amount: number) => amountToY(amount, axis.top, plot)
  const pinnedY = (amount: number) => clamp(y(amount), plot.top, plot.bottom)
  const point = (level: number, value: number) => `${x(level)},${y(value)}`
  const samples: Sample[] = levels.map((level, i) => ({ point: point(level, values[i]), regime: isCall(level) ? 'call' : regimeOf(breakdowns[i]), jump: jumps[i] }))
  const pieces = splitAtJumps(samples)
  const branchPieces = branchRuns.map(({ start, end: last }) => levels.slice(start, last + 1).map((level, i) => point(level, branchValues[start + i])).join(' '))
  const segments = splitByRegime(samples)
  const runs = regimeRuns(samples.map(({ regime }) => regime), jumps)
  // The note is read against a payment that moves 1:1 with the underlier: zero at −100%, twice principal at +100%.
  const underlierY = (level: number) => y(principalAmount * level / initial)
  // A selected feature shades the gap between the note and the 1:1 line where it sets the payment.
  const shades = !featureSelected.value ? [] : runs.filter(({ regime }) => highlighted(regimeConcept.value[regime])).map(({ regime, start, end: last }) => {
    const span = levels.slice(start, last + 1)
    return { concept: regimeConcept.value[regime], points: [...span.map((level, i) => point(level, values[start + i])), ...span.slice().reverse().map((level) => `${x(level)},${underlierY(level)}`)].join(' ') }
  })
  // Droplines mark where the rule changes, from the line down to the axis. At a jump they start from the higher end.
  const drops = runs.slice(1).map(({ start }) => ({ x: x(levels[start]), y: Math.min(y(values[start]), y(values[start - 1])) }))
  const ghost = ghostNote.value
  // The levels after pricing are not note terms, so the ghost reads the current ones, fitted to its own lookback count.
  const ghostInitialEnd = ghost?.underlier.determination.initial
  const ghostObservations = ghostInitialEnd?.kind === 'lookback' ? [initialLevel.value, ...fitLookbackObservations(lookbackLevels.value, initialObservationCountOf(ghostInitialEnd) - 1)] : []
  // A ghost of the other kind of underlier is not drawn: its horizontal axis measures something else. Nor is one measured
  // from another level, since the axis is the change from the current one.
  const ghostDrawable = ghost !== null && ghost.underlier.kind === underlierKind.value && productIssues(ghost).length === 0 && ghostObservations.every((level) => Number.isFinite(level) && level > 0)
  const ghostInitial = !ghostDrawable ? Number.NaN : ghost.underlier.kind === 'basket' ? basketStartingLevel : initialLevelFrom(ghost.underlier.determination.initial, ghostObservations)
  const ghostOnAxis = ghostDrawable && ghostInitial === initial
  const ghostLevels = levelsFor(ghostOnAxis ? jumpsOf(ghost, ghostInitial) : [])
  const ghostValues = ghostOnAxis ? ghostLevels.map((level) => paymentAtEnd(ghost, { initial: ghostInitial, final: level })) : []
  const ghostJumps = jumpsIn(ghostLevels, ghostValues)
  const ghostPieces = ghostOnAxis ? splitAtJumps(ghostLevels.map((level, i) => ({ point: point(level, ghostValues[i]), jump: ghostJumps[i] }))) : []
  const finalHandle = endPayment.value === null ? null : { x: x(clamp(finalLevel.value, 0, end)), y: pinnedY(endPayment.value) }
  // The bubble gives the change, the final level it comes from, and the payment.
  const bubbleText = endPayment.value === null ? '' : `${changeText(finalLevel.value / initial - 1)} (${formatAmount(finalLevel.value)}) → ${formatAmount(endPayment.value)}`
  const labelWidth = (text: string) => text.length * 6.4 * labelScale.value
  const bubbleWidth = 16 + labelWidth(bubbleText)
  // The cap handle sits where the line actually bends flat. When the upside rate is too low for that to be in view,
  // it falls back to a fixed spot on the cap's level instead of floating over the wrong-coloured segment.
  const upsideRate = selectedParticipation.upside ? participationPercent.upside / 100 : undefined
  const bindLevel = capSelected.value ? capBindLevel(initial, upsideOf(note.value)?.cap ?? 0, upsideRate) : undefined
  const capOnCurve = bindLevel !== undefined && bindLevel <= end
  const capHandleX = capSelected.value ? (capOnCurve ? x(bindLevel as number) : plot.left + (plot.right - plot.left) * 0.8) : null
  // The bubble normally sits above its dot. It drops below near the top of the plot, or when it would cover a handle.
  const bubbleX = finalHandle && clamp(finalHandle.x - bubbleWidth / 2, plot.left + 2, plot.right - bubbleWidth - 2)
  // The buffer handle sits where losses start, which is always on the principal line. With absolute return the payment jumps
  // there, and the handle sits on the end the buffer level pays, at the top of the jump.
  const bufferAt = bufferLevel(initial, bufferPercent.value / 100)
  const bufferX = bufferSelected.value ? x(bufferAt) : null
  const bufferY = absoluteSelected.value ? pinnedY(paymentAtEnd(note.value, at(bufferAt))) : y(principalAmount)
  // The barrier handle sits at the barrier on the principal line, where the payment is still principal. With absolute return
  // the payment there is the gain, at the top of the jump.
  const barrierX = barrierAt === undefined ? null : x(barrierAt)
  const barrierY = barrierAt !== undefined && absoluteSelected.value ? pinnedY(paymentAtEnd(note.value, at(barrierAt))) : y(principalAmount)
  const ring = handleRadius.value + 5
  const slopeAt = slopeLevel(initial, capFraction.value, upsideBarrierFraction.value)
  // The upside barrier handle sits on the end the barrier level pays, as the buffer handle does with absolute return: the
  // rebate, or principal, which is where the line continues from the jump.
  const upsideBarrierX = upsideBarrierAt === undefined ? null : x(upsideBarrierAt)
  const upsideBarrierY = upsideBarrierAt === undefined ? 0 : pinnedY(paymentAtEnd(note.value, at(upsideBarrierAt)))
  // Barrier absolute return's handles sit at each barrier, on the end the barrier level itself pays: the absolute return.
  const lowerBarrierAt = bothWaysSelected.value ? barrierLevelAt(fractionFrom(lowerBarrierPercent.value), initial) : undefined
  const upperBarrierAt = bothWaysSelected.value ? barrierLevelAt(fractionFrom(upperBarrierPercent.value), initial) : undefined
  const lowerBarrierHandle = lowerBarrierAt === undefined ? null : { x: x(lowerBarrierAt), y: pinnedY(paymentAtEnd(note.value, at(lowerBarrierAt))) }
  const upperBarrierHandle = upperBarrierAt === undefined ? null : { x: x(upperBarrierAt), y: pinnedY(paymentAtEnd(note.value, at(upperBarrierAt))) }
  // The digital barrier handle sits at the barrier, on the end the barrier level pays: the digital floor, at the top of the jump. The
  // amount handle sits on the flat stretch of that floor, halfway from the barrier to where participation passes it, or to the edge of
  // the axis when nothing does.
  const digital = note.value.payoff.digitalReturn
  const digitalBarrierAt = digital === undefined ? undefined : barrierLevelAt(digital.barrier.level, initial)
  const digitalFloorAmount = digital === undefined ? 0 : principalAmount * (1 + digital.amount)
  const digitalBarrierHandle = digitalBarrierAt === undefined ? null : { x: x(digitalBarrierAt), y: pinnedY(paymentAtEnd(note.value, at(digitalBarrierAt))) }
  const passesAt = digital !== undefined && upsideRate ? initial * (1 + digital.amount / upsideRate) : Infinity
  const digitalHandle = digitalBarrierAt === undefined ? null : { x: x((digitalBarrierAt + Math.min(passesAt, end)) / 2), y: pinnedY(digitalFloorAmount) }
  const otherHandles = [
    capHandleX === null ? null : { x: capHandleX, y: pinnedY(capAmount) },
    selectedParticipation.upside ? { x: x(slopeAt), y: pinnedY(paymentAtEnd(note.value, at(slopeAt))) } : null,
    upsideBarrierX === null ? null : { x: upsideBarrierX, y: upsideBarrierY },
    digitalHandle,
    digitalBarrierHandle,
    // The two ends of the jump at a final review's call are marks on the line too, so the bubble does not sit over the top of the fin.
    ...jumps.flatMap((jump, i) => jump && levels[i] === finalCall ? [{ x: x(levels[i]), y: y(values[i]) }, { x: x(levels[i]), y: y(values[i - 1]) }] : []),
  ]
  const coversHandle = finalHandle !== null && bubbleX !== null && otherHandles.some((handle) => handle !== null && bubbleX < handle.x + ring && bubbleX + bubbleWidth > handle.x - ring && finalHandle.y - 34 < handle.y + ring && finalHandle.y - 12 > handle.y - ring)
  const bubble = finalHandle && bubbleX !== null ? { text: bubbleText, width: bubbleWidth, x: bubbleX, y: finalHandle.y < plot.top + 40 || coversHandle ? finalHandle.y + 16 : finalHandle.y - 34 } : null
  // Labels say what each piece of the line does. Each sits by the middle of the longest stretch its concept sets, and they
  // are placed in priority order, the selected feature's first, clear of the bubble, the final-level dot and the principal label.
  const texts = payoffLabels(note.value)
  // A minimum return is just above principal, so the principal label goes under its line there instead of over it.
  const principalBelow = minimumSelected.value
  const longest = new Map<PayoffLabelKey, RegimeRun>()
  for (const run of runs) {
    // An upside barrier is the barrier concept, but its piece has its own label beside the barrier on downside participation.
    const key: PayoffLabelKey = run.regime === 'upside-barrier' || run.regime === 'event-below' || run.regime === 'event-above' ? run.regime : regimeConcept.value[run.regime]
    const current = longest.get(key)
    if (texts[key] && (!current || run.end - run.start > current.end - current.start)) longest.set(key, run)
  }
  // A label points at the middle of its stretch, or at a quarter of the way along either side when the middle is crowded.
  const along = (run: RegimeRun) => [0.5, 0.25, 0.75].map((share) => Math.round(run.start + (run.end - run.start) * share))
  const anchors = new Map<PayoffLabelKey, number[]>([...longest].map(([key, run]) => [key, along(run)]))
  // The lowest payment is at a fall to zero, the first sample. A cap reached only beyond the axis is labelled at the last.
  if (texts.lowest && runs[0] && regimeConcept.value[runs[0].regime] !== floorConcept.value) anchors.set('lowest', [0])
  if (texts.cap && !anchors.has('cap')) anchors.set('cap', [levels.length - 1])
  // The dashed line is labelled by the middle of its longest stretch, like the pieces of the line.
  const longestBranch = branchRuns.reduce<RegimeRun | null>((best, run) => !best || run.end - run.start > best.end - best.start ? { regime: 'principal', ...run } : best, null)
  if (texts['upside-breach'] && texts.breach) {
    // A barrier on each side observed daily: the dashed line below the initial level is the downside's, and above it the upside's.
    const branchIndices = branchRuns.flatMap(({ start, end: last }) => Array.from({ length: last - start + 1 }, (_, i) => start + i))
    const pick = (indices: number[]) => [0.5, 0.25, 0.75].map((share) => indices[Math.min(indices.length - 1, Math.floor(indices.length * share))])
    const below = branchIndices.filter((i) => levels[i] < initial)
    const above = branchIndices.filter((i) => levels[i] > initial)
    if (below.length) anchors.set('breach', pick(below))
    if (above.length) anchors.set('upside-breach', pick(above))
  } else if (texts.breach && longestBranch) anchors.set('breach', along(longestBranch))
  const lineHeight = 13 * labelScale.value
  const first = selected.value as PayoffLabelKey
  const order = [...(featureSelected.value && anchors.has(first) ? [first] : []), ...labelPriority.filter((key) => !(featureSelected.value && key === first))]
  const requests = order.filter((key) => anchors.has(key)).map((key) => {
    const lines = wrapWords(texts[key] as string, 26)
    return { id: key, lines, anchors: (anchors.get(key) as number[]).map((i) => ({ x: x(levels[i]), y: y(key === 'breach' || key === 'upside-breach' ? branchValues[i] : values[i]) })), width: Math.max(...lines.map((line) => line.length)) * 6.2 * labelScale.value + 6, height: lines.length * lineHeight + 4 }
  })
  const obstacles: Box[] = [
    { x: plot.left + 4, y: y(principalAmount) + (principalBelow ? 2 : -18 * labelScale.value), width: 20 + labelWidth(`Principal ${formatAmount(principalAmount)}`), height: 16 * labelScale.value },
    ...(bubble ? [{ x: bubble.x, y: bubble.y, width: bubble.width, height: 22 }] : []),
    ...(finalHandle ? [{ x: finalHandle.x - ring, y: finalHandle.y - ring, width: ring * 2, height: ring * 2 }] : []),
    // Labels keep off the note's line and the 1:1 line, so the text never sits on a line it describes.
    ...levels.filter((_, i) => i % 2 === 0).flatMap((level, i) => [{ x: x(level), y: y(values[i * 2]), width: 0, height: 0 }, { x: x(level), y: underlierY(level), width: 0, height: 0 }]),
    ...branchRuns.flatMap(({ start, end: last }) => levels.slice(start, last + 1).filter((_, i) => i % 2 === 0).map((level, i) => ({ x: x(level), y: y(branchValues[start + i * 2]), width: 0, height: 0 }))),
  ]
  const labels = placeLabels(requests, obstacles, plot).map((label) => ({
    ...label,
    lines: requests.find(({ id }) => id === label.id)?.lines ?? [],
    from: leaderStart(label),
    // The lowest payment is where downside participation ends, so it belongs to it.
    concept: (label.id === 'lowest' ? 'downside' : label.id === 'upside-barrier' || label.id === 'event-below' || label.id === 'event-above' || label.id === 'breach' || label.id === 'upside-breach' ? 'barrier' : label.id) as ConceptId,
  }))
  return {
    axis,
    // The final levels the line is sampled at, and where a level and an amount are on the chart, for the calculation path.
    levels,
    xOf: x,
    yOf: y,
    pieces,
    branchPieces,
    segments,
    shades,
    drops,
    labels,
    lineHeight,
    underlierPoints: `${x(0)},${underlierY(0)} ${x(end)},${underlierY(end)}`,
    ghostPieces: ghostPieces.join('|') !== pieces.join('|') ? ghostPieces : [],
    // Each jump has a mark at both ends, in the colour of the piece it ends: filled at the payment the jump level pays, open at
    // the payment on the other side, which the level itself does not pay. That is the higher end for a downside barrier or buffer
    // and the lower end for an upside barrier. A small jump stays visible this way.
    jumpMarks: jumps.flatMap((jump, i) => {
      if (!jump) return []
      const closedFirst = jumpList.some(({ level, paysAbove }) => !paysAbove && levels[i - 1] === level)
      const [closed, open] = closedFirst ? [i - 1, i] : [i, i - 1]
      return [{ x: x(levels[i]), closedY: y(values[closed]), openY: y(values[open]), closed: regimeConcept.value[samples[closed].regime], open: regimeConcept.value[samples[open].regime] }]
    }),
    principalY: y(principalAmount),
    principalBelow,
    // Compact labels (such as 1.5K) keep large principals inside the left margin.
    amountTicks: Array.from({ length: Math.round(axis.top / axis.step) + 1 }, (_, i) => axis.step * i).map((amount) => ({ y: y(amount), label: amount.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 }) })),
    returnTicks: returnTicks.map((change) => ({ x: x(initial * (1 + change)), label: changeText(change), zero: change === 0 })),
    initialX: x(initial),
    end,
    bufferHandle: bufferX === null ? null : { x: bufferX, y: bufferY },
    barrierHandle: barrierX === null ? null : { x: barrierX, y: barrierY },
    upsideBarrierHandle: upsideBarrierX === null ? null : { x: upsideBarrierX, y: upsideBarrierY },
    digitalHandle,
    digitalBarrierHandle,
    lowerBarrierHandle,
    upperBarrierHandle,
    capHandle: otherHandles[0],
    // The floor handle sits a quarter of the way across, on the floor's level.
    floorHandle: hasFloor ? { x: plot.left + (plot.right - plot.left) * 0.25, y: y(floorAmount) } : null,
    slopeHandle: otherHandles[1],
    finalHandle,
    bubble,
  }
})

// Every stage's line, at the final levels the chart samples, and whether each changes the line from the one before. Worked out once
// when the path opens, not on every step.
const pathOpen = computed(() => pathAt.value !== null)
const pathLines = computed(() => {
  const c = chart.value
  if (!pathOpen.value || !c) return null
  const initial = determinedInitialLevel.value
  const rows = c.levels.map((final) => lineStages(note.value, paymentBreakdown(note.value, { initial, final }), { initial, final }).map(({ amount }) => amount))
  const lines = pathStages.value.map((_, k) => rows.map((row) => row[k]))
  const changed = lines.map((line, k) => k === 0 || line.some((value, i) => Math.abs(value - lines[k - 1][i]) > principal.value * 1e-9))
  return { lines, changed }
})
// The calculation path on the chart: the current stage's line in its rule's colour, the line before it faint and dashed, the gap
// between them shaded, and the scenario's point on the line. A step forward morphs one line into the next.
const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
const trace = computed(() => {
  const c = chart.value
  const lines = pathLines.value
  const stage = currentStage.value
  const at = pathAt.value
  if (!c || !lines || !stage || at === null) return null
  const current = lines.lines[at]
  const previous = at > 0 ? lines.lines[at - 1] : null
  const t = pathFrom.value === at - 1 ? easeInOut(pathProgress.value) : 1
  const between = (from: number, to: number) => from + (to - from) * t
  const shown = previous ? current.map((value, i) => between(previous[i], value)) : current
  // The line breaks where the payment jumps: two samples at the same level that pay differently.
  const piecesOf = (values: number[]) => splitAtJumps(c.levels.map((level, i) => ({ point: `${c.xOf(level)},${c.yOf(values[i])}`, jump: i > 0 && level - c.levels[i - 1] < c.end * 1e-6 && Math.abs(values[i] - values[i - 1]) > principal.value * 1e-9 })))
  const shade = previous && lines.changed[at] ? [...c.levels.map((level, i) => `${c.xOf(level)},${c.yOf(shown[i])}`), ...c.levels.map((level, i) => `${c.xOf(level)},${c.yOf(previous[i])}`).reverse()].join(' ') : null
  const before = pathStages.value[at - 1]
  const x = c.xOf(clamp(lineLevels.value.final, 0, c.end))
  const y = clamp(c.yOf(before ? between(before.amount, stage.amount) : stage.amount), plot.top, plot.bottom)
  const text = formatAmount(stage.amount)
  const right = x + 14 + text.length * 6.6 * labelScale.value + 12 < plot.right
  return {
    pieces: piecesOf(shown),
    previous: previous && lines.changed[at] ? piecesOf(previous) : [],
    shade,
    concept: stage.concept,
    point: { x, y },
    label: { text, x: right ? x + 12 : x - 12, anchor: right ? 'start' : 'end', y: clamp(y - 10, plot.top + 10, plot.bottom - 4) },
  }
})
watch(pathStages, endPath)
watch(selected, endPath)

// A sample product is opened from the menu or from its address, ?example=slug. Opening one sets every term from it and returns every
// scenario input and term it leaves out to where a first visit starts, so the menu and the address open it the same way.
function loadProduct(product: Product) {
  // A percent from a fraction, without floating-point noise: 1.39 × 100 is 138.99999999999997.
  const percent = (fraction: number) => Math.round(fraction * 1e8) / 1e6
  const { redemption: terms, coupon, underlier: loaded, payoff } = product
  wrapper.value = product.wrapper
  principal.value = product.principalAmount
  termMonths.value = product.term.months
  redemptionKind.value = terms === 'bullet' ? 'bullet' : terms.kind
  chosenFrequency.value = terms === 'bullet' ? null : terms.schedule.frequency
  const autocall = terms !== 'bullet' && terms.kind === 'autocall' ? terms : undefined
  const issuerCall = terms !== 'bullet' && terms.kind === 'issuer-call' ? terms : undefined
  triggerPercent.value = autocall ? percent(autocall.trigger) : 100
  triggerStepPercent.value = percent(autocall?.triggerStep ?? 0)
  callAmountPercent.value = autocall ? percent(autocall.callAmount) : 8
  issuerAmountPercent.value = issuerCall ? percent(issuerCall.callAmount) : 0
  nonCallReviewCount.value = autocall?.nonCallReviews ?? issuerCall?.nonCallReviews ?? 0
  callAmountBasis.value = autocall?.callAmountBasis ?? issuerCall?.callAmountBasis ?? 'flat'
  callOnFinal.value = autocall?.callOnFinalReview ?? false
  couponKind.value = coupon === undefined ? 'none' : coupon.barrier === undefined ? 'fixed' : 'contingent'
  couponRatePercent.value = coupon ? percent(coupon.rate) : firstFeatureValues.coupon
  couponBarrierPercent.value = coupon?.barrier !== undefined ? percent(coupon.barrier) : firstFeatureValues.couponBarrier
  couponMemory.value = coupon?.memory ?? false
  chosenCouponFrequency.value = coupon?.schedule.frequency ?? null
  // The single asset's terms, and a basket's assets with their weights. A basket that has no weights is given equal ones, which are
  // read only if the reader chooses a weighted basket.
  underlierKind.value = loaded.kind
  finalKind.value = loaded.determination.final.kind
  observationCount.value = loaded.determination.final.kind === 'averaging' ? loaded.determination.final.observationCount : firstObservationCount
  if (loaded.kind === 'single') {
    const [{ asset }] = loaded.components
    const { initial } = loaded.determination
    assetKind.value = asset.kind
    assetName.value = asset.name
    initialKind.value = initial.kind
    initialLevel.value = initial.kind === 'given' ? initial.level : startingInitialLevel
    lookbackCount.value = initial.kind === 'lookback' ? initial.observationCount : firstLookbackMoves.length
    basketReturnKind.value = 'weighted'
    basketAssets.value = []
  } else {
    const { levels } = loaded.determination.initial
    assetKind.value = startingComponent.asset.kind
    assetName.value = startingComponent.asset.name
    initialKind.value = 'given'
    initialLevel.value = startingInitialLevel
    lookbackCount.value = firstLookbackMoves.length
    basketReturnKind.value = loaded.determination.basketReturn.kind
    const assets = loaded.components.map(({ asset, weight }) => ({ kind: asset.kind, name: asset.name, initialLevel: levels.find((level) => level.asset === asset.name)?.level ?? 100, weightPercent: weight === undefined ? 0 : percent(weight) }))
    basketAssets.value = loaded.components.every(({ weight }) => weight !== undefined) ? assets : withEqualWeights(assets)
  }
  const downside = payoff.participations.find((participation): participation is DownsideParticipation => participation.direction === 'downside')
  const upside = upsideOf(product)
  selectedParticipation.downside = downside !== undefined
  selectedParticipation.upside = upside !== undefined
  participationPercent.downside = downside ? percent(downside.rate) : firstFeatureValues.downside
  participationPercent.upside = upside ? percent(upside.rate) : firstFeatureValues.upside
  bufferSelected.value = downside?.buffer !== undefined
  bufferPercent.value = downside?.buffer !== undefined ? percent(downside.buffer) : firstFeatureValues.buffer
  barrierSelected.value = downside?.barrier !== undefined
  barrierPercent.value = downside?.barrier ? percent(downside.barrier.level) : firstFeatureValues.barrier
  barrierObservation.value = downside?.barrier?.observation ?? 'final'
  absoluteSelected.value = downside?.absoluteReturn !== undefined
  absolutePercent.value = downside?.absoluteReturn ? percent(downside.absoluteReturn.rate) : firstFeatureValues.absoluteReturn
  capSelected.value = upside?.cap !== undefined
  capPercent.value = upside?.cap !== undefined ? percent(upside.cap) : firstFeatureValues.cap
  upsideBarrierSelected.value = upside?.barrier !== undefined
  upsideBarrierPercent.value = upside?.barrier ? percent(upside.barrier.level) : firstFeatureValues.upsideBarrier
  upsideBarrierObservation.value = upside?.barrier?.observation ?? 'final'
  rebateSelected.value = upside?.barrier?.rebate !== undefined
  rebatePercent.value = upside?.barrier?.rebate !== undefined ? percent(upside.barrier.rebate) : firstFeatureValues.rebate
  const bothWays = payoff.barrierAbsoluteReturn
  bothWaysSelected.value = bothWays !== undefined
  bothWaysRate.value = bothWays ? percent(bothWays.rate) : firstFeatureValues.absoluteReturn
  lowerBarrierPercent.value = bothWays ? percent(bothWays.lowerBarrier.level) : firstFeatureValues.lowerBarrier
  upperBarrierPercent.value = bothWays ? percent(bothWays.upperBarrier.level) : firstFeatureValues.upperBarrier
  lowerObservation.value = bothWays?.lowerBarrier.observation ?? 'daily-close'
  upperObservation.value = bothWays?.upperBarrier.observation ?? 'daily-close'
  conditionalSelected.value = bothWays?.conditionalReturn !== undefined
  conditionalPercent.value = bothWays?.conditionalReturn !== undefined ? percent(bothWays.conditionalReturn) : firstFeatureValues.conditional
  protectionSelected.value = payoff.principalProtection !== undefined
  protectionPercent.value = payoff.principalProtection !== undefined ? percent(payoff.principalProtection) : firstFeatureValues.protection
  digitalSelected.value = payoff.digitalReturn !== undefined
  digitalPercent.value = payoff.digitalReturn ? percent(payoff.digitalReturn.amount) : firstFeatureValues.digital
  digitalBarrierPercent.value = payoff.digitalReturn ? percent(payoff.digitalReturn.barrier.level) : firstFeatureValues.digitalBarrier
  minimumSelected.value = payoff.minimumReturn !== undefined
  minimumPercent.value = payoff.minimumReturn !== undefined ? percent(payoff.minimumReturn) : firstFeatureValues.minimum
  // The scenario starts where a first visit does: the starting final level, a basket's assets each up by the same share, and no
  // review levels, closes or issuer choice set by hand.
  observedLevels.value = [startingFinalLevel]
  lookbackLevels.value = initialKind.value === 'lookback' ? firstLookbackMoves.map((move) => Math.round(initialLevel.value * (1 + move))) : []
  basketLevels.value = basketAssets.value.map(({ initialLevel: level }) => [Math.round(level * startingFinalLevel / startingInitialLevel * 100) / 100])
  reviewLevelInputs.value = {}
  reviewAssetInputs.value = {}
  issuerCallsOn.value = null
  lowestCloseInput.value = undefined
  highestCloseInput.value = undefined
  ghostNote.value = null
  selected.value = 'payoff'
  activeHint.value = null
}
const route = useRoute()
const router = useRouter()
const openSample = computed(() => sampleBySlug(route.query.example))
// The address opens the sample it names. An address naming no sample is dropped, and the builder keeps what it shows.
watch(() => route.query.example, (slug) => {
  if (openSample.value) loadProduct(openSample.value.product)
  else if (slug !== undefined) router.replace({ query: { ...route.query, example: undefined } })
}, { immediate: true })
// Once the terms differ from the sample, the address no longer names it, so it never claims a product the builder does not show.
watch(note, (current) => {
  if (openSample.value && !sameProduct(current, openSample.value.product)) router.replace({ query: { ...route.query, example: undefined } })
})
// The menu replaces the address rather than adding to the history, so Back leaves the builder rather than stepping through samples.
const chooseSample = (event: Event) => {
  const slug = (event.target as HTMLSelectElement).value
  if (slug) router.replace({ query: { ...route.query, example: slug } })
}
</script>

<template>
  <div class="site-shell">
    <main class="page">
      <div class="intro">
        <h1>Structured products, built from their parts.</h1>
        <p>See how each feature changes what the product pays, and why.</p>
        <div class="sample-picker"><label for="sample-select">Start from a sample</label><select id="sample-select" class="sample-select" :value="openSample?.slug ?? ''" @change="chooseSample($event)"><option value="">Open a sample product…</option><optgroup v-for="group in sampleGroups" :key="group.label" :label="group.label"><option v-for="sample in group.samples" :key="sample.slug" :value="sample.slug">{{ sample.name }}</option></optgroup></select><button type="button" class="hint-button" :class="{ unseen: !openSample }" :disabled="!openSample" aria-label="About this sample's source" aria-controls="sample-hint" :aria-expanded="activeHint === 'sample'" @click="toggleHint('sample')">ⓘ</button><p v-if="openSample && activeHint === 'sample'" id="sample-hint" class="hint-text" role="tooltip">Modelled on <a :href="openSample.source.url" target="_blank" rel="noopener">{{ openSample.source.title }}</a>, with synthetic underliers starting at 100.{{ openSample.source.note ? ` ${openSample.source.note}` : '' }}<span class="hint-category">A public filing, shown for its structure, not as a recommendation.</span></p></div>
      </div>

      <p class="summary-sentence" aria-live="polite"><template v-for="(segment, index) in summary" :key="index"><button v-if="segment.concept" type="button" :class="['concept', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)" :aria-pressed="highlighted(segment.concept)" @click="select(segment.concept)">{{ segment.text }}</button><span v-else>{{ segment.text }}</span></template></p>

      <div v-if="names.length" class="names"><span id="names-label" class="names-label">Often marketed as</span><div class="names-list" role="group" aria-labelledby="names-label"><button v-for="name in names" :key="name.name" type="button" class="name-chip" :aria-expanded="activeHint === nameHintKey(name)" :aria-controls="nameHintId(name)" @click="openName(name)">{{ name.name }}</button></div><template v-for="name in names" :key="name.name"><p v-if="activeHint === nameHintKey(name)" :id="nameHintId(name)" class="hint-text" role="tooltip">{{ name.reason }}<span v-if="category" class="hint-category">Category: {{ category }}</span></p></template></div>

      <div class="workspace">
        <section ref="outlinePanel" class="panel outline" aria-label="Product structure">
          <header class="panel-head"><h2>Structure</h2><p>What the product is made of</p></header>
          <ul class="tree">
            <li :class="['node', { sel: highlighted('wrapper') }]" :style="conceptStyle('wrapper')">
              <div class="nrow" @click="select('wrapper')" @focusin="focusRow('wrapper')">
                <span class="nlabel">Wrapper<HintToggle id="wrapper" about="wrapper" :text="hints.wrapper" :active="activeHint === 'wrapper'" @toggle="toggleHint('wrapper')" /></span>
                <span class="ctrl pick"><select aria-label="Wrapper" :value="note.wrapper" @change="setWrapper(($event.target as HTMLSelectElement).value)"><option v-for="option in wrapperOptions" :key="option.id" :value="option.id" :disabled="!option.available || !!wrapperBlockedReason(option.id)">{{ option.label }}{{ !option.available ? ' (unavailable)' : wrapperBlockedReason(option.id) ? ` (${wrapperBlockedReason(option.id)?.toLowerCase()})` : '' }}</option></select></span>
                <span class="ctrl-line">
                  <span class="ctrl"><label for="principal">Principal</label><HintToggle id="principal" about="principal" :text="hints.principal" :active="activeHint === 'principal'" @toggle="toggleHint('principal')" /><NumberInput id="principal" v-model="principal" class="num" /></span>
                  <span class="ctrl"><label for="term">Term</label><HintToggle id="term" about="term" :text="hints.term" :active="activeHint === 'term'" @toggle="toggleHint('term')" /><NumberInput id="term" v-model="termMonths" class="num count" /><span class="unit">months{{ termYears ? ` (${termYears})` : '' }}</span></span>
                </span>
              </div>
              <ul v-if="issuesFor('principalAmount', 'term').length" class="errors" role="alert"><li v-for="message in issuesFor('principalAmount', 'term')" :key="message">{{ message }}</li></ul>
              <ul>
                <li :class="['node', { sel: highlighted('redemption') }]" :style="conceptStyle('redemption')">
                  <div class="nrow" @click="select('redemption')" @focusin="focusRow('redemption')">
                    <span class="nlabel">Redemption<HintToggle id="redemption" about="redemption" :text="hints.redemption" :active="activeHint === 'redemption'" @toggle="toggleHint('redemption')" /></span>
                    <span class="ctrl pick"><select id="redemption-kind" aria-label="Redemption" :value="redemptionKind" @change="redemptionKind = ($event.target as HTMLSelectElement).value as 'bullet' | 'autocall' | 'issuer-call'"><option v-for="option in redemptionOptions" :key="option.id" :value="option.id" :disabled="!option.available || !!redemptionBlockedReason(option.id)">{{ option.label }}{{ !option.available ? ' (unavailable)' : redemptionBlockedReason(option.id) ? ` (${redemptionBlockedReason(option.id)})` : '' }}</option></select></span>
                  </div>
                  <ul v-if="scheduled">
                    <li :class="['node', { sel: highlighted('schedule') }]" :style="conceptStyle('schedule')">
                      <div class="nrow" @click="select('schedule')" @focusin="focusRow('schedule')">
                        <span class="nlabel">Reviews<HintToggle id="schedule" about="the review schedule" :text="hints.schedule" :active="activeHint === 'schedule'" @toggle="toggleHint('schedule')" /></span>
                        <span class="ctrl pick"><select id="review-frequency" v-model="reviewFrequency" aria-label="Review frequency"><option v-for="option in reviewFrequencyOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                      </div>
                      <p v-if="reviewNudge && !issuesFor('schedule').length" class="nudge">{{ reviewNudge }}</p>
                      <ul v-if="issuesFor('schedule').length" class="errors" role="alert"><li v-for="message in issuesFor('schedule')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li :class="['node', { sel: highlighted('non-call') }]" :style="conceptStyle('non-call')">
                      <div class="nrow" @click="select('non-call')" @focusin="focusRow('non-call')">
                        <span class="nlabel">Non-call period<HintToggle id="non-call" about="the non-call period" :text="hints['non-call']" :active="activeHint === 'non-call'" @toggle="toggleHint('non-call')" /></span>
                        <span class="ctrl"><NumberInput id="non-call" v-model="nonCallReviewCount" class="num rate" aria-label="Non-call period: number of reviews at the start that cannot call" /><span class="unit">reviews</span></span>
                      </div>
                      <ul v-if="issuesFor('nonCallReviews').length" class="errors" role="alert"><li v-for="message in issuesFor('nonCallReviews')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li v-if="autocalled" :class="['node', { sel: highlighted('trigger') }]" :style="conceptStyle('trigger')">
                      <div class="nrow" @click="select('trigger')" @focusin="focusRow('trigger')">
                        <span class="nlabel">Call trigger<HintToggle id="trigger" about="the call trigger" :text="hints.trigger" :active="activeHint === 'trigger'" @toggle="toggleHint('trigger')" /></span>
                        <span class="ctrl"><NumberInput id="call-trigger" v-model="triggerPercent" class="num rate" aria-label="Call trigger: level (% of the initial level)" /><span class="unit">%</span></span>
                      </div>
                      <ul v-if="issuesFor('trigger').length" class="errors" role="alert"><li v-for="message in issuesFor('trigger')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li v-if="autocalled" :class="['node', { sel: highlighted('trigger-step') }]" :style="conceptStyle('trigger-step')">
                      <div class="nrow" @click="select('trigger-step')" @focusin="focusRow('trigger-step')">
                        <span class="nlabel">Trigger step<HintToggle id="trigger-step" about="the trigger step" :text="hints['trigger-step']" :active="activeHint === 'trigger-step'" @toggle="toggleHint('trigger-step')" /></span>
                        <span class="ctrl"><NumberInput id="trigger-step" v-model="triggerStepPercent" class="num rate" aria-label="Trigger step: change on each later review (% of the initial level, negative steps down)" /><span class="unit">%</span></span>
                      </div>
                      <ul v-if="issuesFor('triggerStep').length" class="errors" role="alert"><li v-for="message in issuesFor('triggerStep')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li :class="['node', { sel: highlighted('call-amount') }]" :style="conceptStyle('call-amount')">
                      <div class="nrow" @click="select('call-amount')" @focusin="focusRow('call-amount')">
                        <span class="nlabel">Call amount<HintToggle id="call-amount" about="the call amount" :text="hints['call-amount']" :active="activeHint === 'call-amount'" @toggle="toggleHint('call-amount')" /></span>
                        <span class="ctrl"><NumberInput id="call-amount-input" v-model="callAmountField" class="num rate" aria-label="Call amount: paid above principal (% of principal)" /><span class="unit">%</span></span>
                      </div>
                      <ul v-if="issuesFor('callAmount').length" class="errors" role="alert"><li v-for="message in issuesFor('callAmount')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li :class="['node', { sel: highlighted('call-amount') }]" :style="conceptStyle('call-amount')">
                      <div class="nrow" @click="select('call-amount')" @focusin="focusRow('call-amount')">
                        <span class="nlabel">Call amount is<HintToggle id="call-basis" about="how the call amount is stated" :text="hints['call-basis']" :active="activeHint === 'call-basis'" @toggle="toggleHint('call-basis')" /></span>
                        <span class="ctrl pick"><select id="call-basis" v-model="callAmountBasis" aria-label="Call amount is"><option value="flat">Flat</option><option value="per-year">Per year</option></select></span>
                      </div>
                    </li>
                    <li v-if="autocalled" :class="['node', { sel: highlighted('final-call') }]" :style="conceptStyle('final-call')">
                      <div class="nrow" @click="select('final-call')" @focusin="focusRow('final-call')">
                        <span class="nlabel">Final review<HintToggle id="final-call" about="the final review" :text="hints['final-call']" :active="activeHint === 'final-call'" @toggle="toggleHint('final-call')" /></span>
                        <span class="ctrl pick"><select id="final-call" v-model="callOnFinal" aria-label="Final review"><option :value="false">Pays the maturity payoff</option><option :value="true">Is a call too</option></select></span>
                      </div>
                    </li>
                  </ul>
                </li>
                <li :class="['node', { sel: highlighted('coupon') }]" :style="conceptStyle('coupon')">
                  <div class="nrow" @click="select('coupon')" @focusin="focusRow('coupon')">
                    <span class="nlabel">Coupon<HintToggle id="coupon" about="the coupon" :text="hints.coupon" :active="activeHint === 'coupon'" @toggle="toggleHint('coupon')" /></span>
                    <span class="ctrl pick"><select id="coupon-kind" v-model="couponKind" aria-label="Coupon"><option value="none">None</option><option value="fixed">Fixed</option><option value="contingent" :disabled="!contingentCoupon && !!couponBlockedReason">Contingent{{ !contingentCoupon && couponBlockedReason ? ` (${couponBlockedReason})` : '' }}</option></select></span>
                  </div>
                  <ul v-if="couponSelected">
                    <li :class="['node', { sel: highlighted('coupon-schedule') }]" :style="conceptStyle('coupon-schedule')">
                      <div class="nrow" @click="select('coupon-schedule')" @focusin="focusRow('coupon-schedule')">
                        <span class="nlabel">Reviews<HintToggle id="coupon-schedule" about="the coupon reviews" :text="hints['coupon-schedule']" :active="activeHint === 'coupon-schedule'" @toggle="toggleHint('coupon-schedule')" /></span>
                        <span class="ctrl pick"><select id="coupon-frequency" v-model="couponFrequency" aria-label="Coupon review frequency"><option v-for="option in reviewFrequencyOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                      </div>
                      <p v-if="scheduled" class="nudge"><button type="button" class="link-button" :disabled="couponFrequency === reviewFrequency" @click.stop="copyCallReviews">Same as the calls</button>{{ couponFrequency === reviewFrequency ? ': the coupon is reviewed on the call dates' : `: the calls are ${reviewFrequencyOptions.find(({ id }) => id === reviewFrequency)!.label.toLowerCase()}` }}</p>
                      <ul v-if="issuesFor('couponSchedule').length" class="errors" role="alert"><li v-for="message in issuesFor('couponSchedule')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li :class="['node', { sel: highlighted('coupon') }]" :style="conceptStyle('coupon')">
                      <div class="nrow" @click="select('coupon')" @focusin="focusRow('coupon')">
                        <span class="nlabel">Coupon rate</span>
                        <span class="ctrl"><NumberInput id="coupon-rate" v-model="couponRatePercent" class="num rate" aria-label="Coupon rate (% of principal a year)" /><span class="unit">% a year</span></span>
                      </div>
                    </li>
                    <li v-if="contingentCoupon" :class="['node', { sel: highlighted('coupon-barrier') }]" :style="conceptStyle('coupon-barrier')">
                      <div class="nrow" @click="select('coupon-barrier')" @focusin="focusRow('coupon-barrier')">
                        <span class="nlabel">Coupon barrier<HintToggle id="coupon-barrier" about="the coupon barrier" :text="hints['coupon-barrier']" :active="activeHint === 'coupon-barrier'" @toggle="toggleHint('coupon-barrier')" /></span>
                        <span class="ctrl"><NumberInput id="coupon-barrier" v-model="couponBarrierPercent" class="num rate" aria-label="Coupon barrier: level (% of the initial level)" /><span class="unit">%</span></span>
                      </div>
                    </li>
                    <li v-if="contingentCoupon" :class="['node', { sel: highlighted('memory') }]" :style="conceptStyle('memory')">
                      <div class="nrow" @click="select('memory')" @focusin="focusRow('memory')">
                        <span class="nlabel">Memory<HintToggle id="memory" about="memory" :text="hints.memory" :active="activeHint === 'memory'" @toggle="toggleHint('memory')" /></span>
                        <span class="ctrl pick"><select id="coupon-memory" v-model="couponMemory" aria-label="Memory"><option :value="false">Without memory</option><option :value="true">With memory</option></select></span>
                      </div>
                    </li>
                  </ul>
                  <ul v-if="issuesFor('coupon').length" class="errors" role="alert"><li v-for="message in issuesFor('coupon')" :key="message">{{ message }}</li></ul>
                </li>
                <li :class="['node', { sel: highlighted('underlier') }]" :style="conceptStyle('underlier')">
                  <div class="nrow" @click="select('underlier')" @focusin="focusRow('underlier')">
                    <span class="nlabel">Underlier<HintToggle id="underlier" about="underlier" :text="hints.underlier" :active="activeHint === 'underlier'" @toggle="toggleHint('underlier')" /></span>
                    <span class="ctrl pick"><select aria-label="Underlier" :value="underlierKind" @change="setUnderlierKind(($event.target as HTMLSelectElement).value as Underlier['kind'])"><option v-for="option in underlierOptions" :key="option.id" :value="option.id" :disabled="!option.available || (option.id === 'basket' && (dailySelected || bothWaysSelected))">{{ option.label }}{{ option.available ? (option.id === 'basket' && bothWaysSelected ? ' (not with barrier absolute return)' : option.id === 'basket' && dailySelected ? ' (not with a daily barrier)' : '') : ' (unavailable)' }}</option></select></span>
                  </div>
                  <ul>
                    <li v-if="!isBasket" :class="['node', { sel: highlighted('asset') }]" :style="conceptStyle('asset')">
                      <div class="nrow" @click="select('asset')" @focusin="focusRow('asset')">
                        <span class="nlabel">Asset<HintToggle id="asset" about="asset" :text="hints.asset" :active="activeHint === 'asset'" @toggle="toggleHint('asset')" /></span>
                        <span class="ctrl pick"><select v-model="assetKind" aria-label="Asset type"><option v-for="option in assetOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                        <span class="ctrl block"><label for="asset-name">Name</label><input id="asset-name" v-model="assetName" type="text" placeholder="Synthetic Index" /></span>
                      </div>
                      <ul v-if="issuesFor('underlierName').length" class="errors" role="alert"><li v-for="message in issuesFor('underlierName')" :key="message">{{ message }}</li></ul>
                    </li>
                    <template v-else>
                      <li v-for="(asset, index) in basketAssets" :key="index" :class="['node', { sel: highlighted('asset') }]" :style="conceptStyle('asset')">
                        <div class="nrow" @click="select('asset')" @focusin="focusRow('asset')">
                          <span class="nlabel">Asset<HintToggle v-if="index === 0" id="asset" about="asset" :text="hints.asset" :active="activeHint === 'asset'" @toggle="toggleHint('asset')" /></span>
                          <span class="ctrl pick"><select v-model="asset.kind" :aria-label="`Asset ${index + 1} type`"><option v-for="option in assetOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                          <button v-if="basketAssets.length > 2" type="button" class="xbtn" :aria-label="`Remove ${asset.name.trim() || `asset ${index + 1}`}`" @click.stop="removeAsset(index)">×</button>
                          <span class="ctrl block"><label :for="`asset-name-${index}`">Name</label><input :id="`asset-name-${index}`" v-model="asset.name" type="text" placeholder="Synthetic Asset" /></span>
                          <span v-if="weighted" class="ctrl block"><label :for="`weight-${index}`">Weight</label><HintToggle v-if="index === 0" id="weight" about="weight" :text="hints.weight" :active="activeHint === 'weight'" @toggle="toggleHint('weight')" /><NumberInput :id="`weight-${index}`" v-model="asset.weightPercent" class="num rate" /><span class="unit">%</span></span>
                        </div>
                      </li>
                      <li class="addrow"><button type="button" class="addbtn" @click="addAsset">＋ Add asset</button><output v-if="weighted" class="unit weights-total" aria-live="polite">Weights: {{ weightTotal }}</output></li>
                      <li v-if="issuesFor('underlierName', 'basketComponents', 'weights').length" class="addrow"><ul class="errors" role="alert"><li v-for="message in issuesFor('underlierName', 'basketComponents', 'weights')" :key="message">{{ message }}</li></ul></li>
                    </template>
                    <li :class="['node', { sel: highlighted('determination') }]" :style="conceptStyle('determination')">
                      <div class="nrow" @click="select('determination')" @focusin="focusRow('determination')">
                        <span class="nlabel">Determination<HintToggle id="determination" about="determination" :text="hints.determination" :active="activeHint === 'determination'" @toggle="toggleHint('determination')" /></span>
                      </div>
                      <ul>
                        <li :class="['node', { sel: highlighted('initial-level') }]" :style="conceptStyle('initial-level')">
                          <div class="nrow" @click="select('initial-level')" @focusin="focusRow('initial-level')">
                            <span class="nlabel">Initial level<HintToggle id="initial-level" about="initial level" :text="hints['initial-level']" :active="activeHint === 'initial-level'" @toggle="toggleHint('initial-level')" /></span>
                            <span class="ctrl pick"><select id="initial-determination" v-model="initialKind" aria-label="Initial level"><option v-for="option in initialDeterminationOptions" :key="option.id" :value="option.id" :title="option.description" :disabled="option.id === 'lookback' && (isBasket || dailySelected || bothWaysSelected)">{{ option.label }}{{ option.id === 'lookback' ? (isBasket ? ' (single asset only)' : bothWaysSelected ? ' (not with barrier absolute return)' : dailySelected ? ' (not with a daily barrier)' : '') : '' }}</option></select></span>
                            <span v-if="lookingBack" class="ctrl block wraps"><label for="lookback-count">Observations after pricing</label><HintToggle id="lookback-count" about="observations after pricing" :text="hints['lookback-observations']" :active="activeHint === 'lookback-observations'" @toggle="toggleHint('lookback-observations')" /><NumberInput id="lookback-count" v-model="lookbackCount" class="num count" /></span>
                            <span v-if="lookingBack" class="ctrl block wraps"><span class="flabel">Observed levels</span><span class="unit">Hypothetical, set in the calculation</span></span>
                            <template v-else-if="isBasket"><span v-for="(asset, index) in basketAssets" :key="index" class="ctrl block"><label :for="`initial-level-${index}`">{{ asset.name.trim() || `Asset ${index + 1}` }}</label><NumberInput :id="`initial-level-${index}`" v-model="asset.initialLevel" class="num" /></span></template>
                            <span v-else class="ctrl block"><label for="initial-level-value">Level</label><NumberInput id="initial-level-value" v-model="initialLevel" class="num" /></span>
                          </div>
                          <ul v-if="issuesFor('initialLevel', 'lookbackObservationCount').length" class="errors" role="alert"><li v-for="message in issuesFor('initialLevel', 'lookbackObservationCount')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li :class="['node', { sel: highlighted('final-level') }]" :style="conceptStyle('final-level')">
                          <div class="nrow" @click="select('final-level')" @focusin="focusRow('final-level')">
                            <span class="nlabel">Final level<HintToggle id="final-level" about="final level" :text="hints['final-level']" :active="activeHint === 'final-level'" @toggle="toggleHint('final-level')" /></span>
                            <span class="ctrl pick"><select id="final-determination" v-model="finalKind" aria-label="Final level"><option v-for="option in finalDeterminationOptions" :key="option.id" :value="option.id" :title="option.description" :disabled="option.id === 'averaging' && bothWaysSelected">{{ option.label }}{{ option.id === 'averaging' && bothWaysSelected ? ' (not with barrier absolute return)' : '' }}</option></select></span>
                            <span v-if="averaging" class="ctrl block"><label for="observation-count">Observations</label><HintToggle id="observation-count" about="observations" :text="hints.observations" :active="activeHint === 'observations'" @toggle="toggleHint('observations')" /><NumberInput id="observation-count" v-model="observationCount" class="num count" /></span>
                            <span class="ctrl block wraps"><span class="flabel">{{ averaging ? 'Observed levels' : isBasket ? 'Levels on the final date' : 'Level on the final date' }}</span><span class="unit">{{ averaging || isBasket ? 'Hypothetical, set in the calculation' : 'Hypothetical, set on the chart' }}</span></span>
                          </div>
                          <ul v-if="issuesFor('observationCount').length" class="errors" role="alert"><li v-for="message in issuesFor('observationCount')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="isBasket" :class="['node', { sel: highlighted('basket-return') }]" :style="conceptStyle('basket-return')">
                          <div class="nrow" @click="select('basket-return')" @focusin="focusRow('basket-return')">
                            <span class="nlabel long">Return combination<HintToggle id="basket-return" about="return combination" :text="hints['basket-return']" :active="activeHint === 'basket-return'" @toggle="toggleHint('basket-return')" /></span>
                            <span class="ctrl pick"><select v-model="basketReturnKind" aria-label="Return combination"><option v-for="option in basketReturnOptions" :key="option.id" :value="option.id" :title="option.description" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                          </div>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li :class="['node', { sel: highlighted('payoff') }]" :style="conceptStyle('payoff')">
                  <div class="nrow" @click="select('payoff')" @focusin="focusRow('payoff')">
                    <span class="nlabel">Payoff<HintToggle id="payoff" about="payoff" :text="hints.payoff" :active="activeHint === 'payoff'" @toggle="toggleHint('payoff')" /></span>
                  </div>
                  <ul v-if="issuesFor('participations').length" class="errors" role="alert"><li v-for="message in issuesFor('participations')" :key="message">{{ message }}</li></ul>
                  <ul>
                    <li v-if="selectedParticipation.downside" :class="['node', { sel: highlighted('downside') }]" :style="conceptStyle('downside')">
                      <div class="nrow" @click="select('downside')" @focusin="focusRow('downside')">
                        <span class="nlabel">Downside participation<HintToggle id="downside" about="downside participation rate" :text="hints.downside" :active="activeHint === 'downside'" @toggle="toggleHint('downside')" /></span>
                        <span class="ctrl"><NumberInput id="rate-downside" v-model="participationPercent.downside" class="num rate" aria-label="Downside participation rate (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove downside participation" @click.stop="removeFeature('downside')">×</button></span>
                      </div>
                      <ul>
                        <li v-if="bufferSelected" :class="['node', { sel: highlighted('buffer') }]" :style="conceptStyle('buffer')">
                          <div class="nrow" @click="select('buffer')" @focusin="focusRow('buffer')">
                            <span class="nlabel">Buffer<HintToggle id="buffer" about="buffer" :text="hints.buffer" :active="activeHint === 'buffer'" @toggle="toggleHint('buffer')" /></span>
                            <span class="ctrl"><NumberInput id="rate-buffer" v-model="bufferPercent" class="num rate" aria-label="Buffer: fall absorbed (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove buffer" @click.stop="removeFeature('buffer')">×</button></span>
                          </div>
                          <ul v-if="issuesFor('buffer').length" class="errors" role="alert"><li v-for="message in issuesFor('buffer')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="barrierSelected" :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Downside barrier<HintToggle id="barrier" about="downside barrier" :text="hints.barrier" :active="activeHint === 'barrier'" @toggle="toggleHint('barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-barrier" v-model="barrierPercent" class="num rate" :aria-label="`Downside barrier: level (% of the ${lookingBack ? 'lookback' : 'initial'} level)`" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove downside barrier" @click.stop="removeFeature('barrier')">×</button></span>
                            <span class="ctrl block"><label for="barrier-observation">Observed</label><select id="barrier-observation" v-model="barrierObservation"><option value="final">Final date</option><option value="daily-close" :disabled="dailyBlockedReason('downside') !== null">Daily close{{ dailyBlockedReason('downside') ? ` (${dailyBlockedReason('downside')!.toLowerCase()})` : '' }}</option></select></span>
                          </div>
                          <ul v-if="issuesFor('barrier').length" class="errors" role="alert"><li v-for="message in issuesFor('barrier')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="absoluteSelected" :class="['node', { sel: highlighted('absolute-return') }]" :style="conceptStyle('absolute-return')">
                          <div class="nrow" @click="select('absolute-return')" @focusin="focusRow('absolute-return')">
                            <span class="nlabel">Absolute return<HintToggle id="absolute-return" about="absolute return rate" :text="hints['absolute-return']" :active="activeHint === 'absolute-return'" @toggle="toggleHint('absolute-return')" /></span>
                            <span class="ctrl"><NumberInput id="rate-absolute-return" v-model="absolutePercent" class="num rate" aria-label="Absolute return rate (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove absolute return" @click.stop="removeFeature('absolute-return')">×</button></span>
                          </div>
                          <ul v-if="issuesFor('absoluteReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('absoluteReturn')" :key="message">{{ message }}</li></ul>
                        </li>
                      </ul>
                    </li>
                    <li v-if="selectedParticipation.upside" :class="['node', { sel: highlighted('upside') }]" :style="conceptStyle('upside')">
                      <div class="nrow" @click="select('upside')" @focusin="focusRow('upside')">
                        <span class="nlabel">Upside participation<HintToggle id="upside" about="upside participation rate" :text="hints.upside" :active="activeHint === 'upside'" @toggle="toggleHint('upside')" /></span>
                        <span class="ctrl"><NumberInput id="rate-upside" v-model="participationPercent.upside" class="num rate" aria-label="Upside participation rate (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove upside participation" @click.stop="removeFeature('upside')">×</button></span>
                      </div>
                      <ul>
                        <li v-if="capSelected" :class="['node', { sel: highlighted('cap') }]" :style="conceptStyle('cap')">
                          <div class="nrow" @click="select('cap')" @focusin="focusRow('cap')">
                            <span class="nlabel">Cap<HintToggle id="cap" about="cap" :text="hints.cap" :active="activeHint === 'cap'" @toggle="toggleHint('cap')" /></span>
                            <span class="ctrl"><NumberInput id="rate-cap" v-model="capPercent" class="num rate" aria-label="Cap: maximum return on principal (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove cap" @click.stop="removeFeature('cap')">×</button></span>
                          </div>
                          <ul v-if="issuesFor('cap').length" class="errors" role="alert"><li v-for="message in issuesFor('cap')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="upsideBarrierSelected" :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Upside barrier<HintToggle id="upside-barrier" about="upside barrier" :text="hints['upside-barrier']" :active="activeHint === 'upside-barrier'" @toggle="toggleHint('upside-barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-upside-barrier" v-model="upsideBarrierPercent" class="num rate" :aria-label="`Upside barrier: level (% of the ${lookingBack ? 'lookback' : 'initial'} level)`" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove upside barrier" @click.stop="removeFeature('upside-barrier')">×</button></span>
                            <span class="ctrl block"><label for="upside-barrier-observation">Observed</label><select id="upside-barrier-observation" v-model="upsideBarrierObservation"><option value="final">Final date</option><option value="daily-close" :disabled="dailyBlockedReason('upside') !== null">Daily close{{ dailyBlockedReason('upside') ? ` (${dailyBlockedReason('upside')!.toLowerCase()})` : '' }}</option></select></span>
                          </div>
                          <ul v-if="issuesFor('upsideBarrier').length" class="errors" role="alert"><li v-for="message in issuesFor('upsideBarrier')" :key="message">{{ message }}</li></ul>
                          <ul v-if="rebateSelected">
                            <li :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                              <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                                <span class="nlabel">Rebate<HintToggle id="rebate" about="rebate" :text="hints.rebate" :active="activeHint === 'rebate'" @toggle="toggleHint('rebate')" /></span>
                                <span class="ctrl"><NumberInput id="rate-rebate" v-model="rebatePercent" class="num rate" aria-label="Rebate: return paid on principal (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove rebate" @click.stop="removeFeature('rebate')">×</button></span>
                              </div>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                    <li v-if="bothWaysSelected" :class="['node', { sel: highlighted('absolute-return') }]" :style="conceptStyle('absolute-return')">
                      <div class="nrow" @click="select('absolute-return')" @focusin="focusRow('absolute-return')">
                        <span class="nlabel long">Absolute return (both directions)<HintToggle id="absolute-both" about="absolute return in both directions" :text="hints['absolute-both']" :active="activeHint === 'absolute-both'" @toggle="toggleHint('absolute-both')" /></span>
                        <span class="ctrl"><NumberInput id="rate-absolute-both" v-model="bothWaysRate" class="num rate" aria-label="Absolute return rate (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove absolute return in both directions" @click.stop="removeFeature('absolute-both')">×</button></span>
                      </div>
                      <ul v-if="issuesFor('barrierAbsoluteReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('barrierAbsoluteReturn')" :key="message">{{ message }}</li></ul>
                      <ul>
                        <li :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Lower barrier<HintToggle id="lower-barrier" about="lower barrier" :text="hints['lower-barrier']" :active="activeHint === 'lower-barrier'" @toggle="toggleHint('lower-barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-lower-barrier" v-model="lowerBarrierPercent" class="num rate" aria-label="Lower barrier: level (% of the initial level)" /><span class="unit">%</span></span>
                            <span class="ctrl block"><label for="lower-barrier-observation">Observed</label><select id="lower-barrier-observation" v-model="lowerObservation"><option value="final">Final date</option><option value="daily-close">Daily close</option></select></span>
                          </div>
                          <ul v-if="issuesFor('lowerBarrier').length" class="errors" role="alert"><li v-for="message in issuesFor('lowerBarrier')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Upper barrier<HintToggle id="upper-barrier" about="upper barrier" :text="hints['upper-barrier']" :active="activeHint === 'upper-barrier'" @toggle="toggleHint('upper-barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-upper-barrier" v-model="upperBarrierPercent" class="num rate" aria-label="Upper barrier: level (% of the initial level)" /><span class="unit">%</span></span>
                            <span class="ctrl block"><label for="upper-barrier-observation">Observed</label><select id="upper-barrier-observation" v-model="upperObservation"><option value="final">Final date</option><option value="daily-close">Daily close</option></select></span>
                          </div>
                          <ul v-if="issuesFor('upperBarrier').length" class="errors" role="alert"><li v-for="message in issuesFor('upperBarrier')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="conditionalSelected" :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Conditional return<HintToggle id="conditional" about="conditional return" :text="hints.conditional" :active="activeHint === 'conditional'" @toggle="toggleHint('conditional')" /></span>
                            <span class="ctrl"><NumberInput id="rate-conditional" v-model="conditionalPercent" class="num rate" aria-label="Conditional return: return paid on principal (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove conditional return" @click.stop="removeFeature('conditional')">×</button></span>
                          </div>
                          <ul v-if="issuesFor('conditionalReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('conditionalReturn')" :key="message">{{ message }}</li></ul>
                        </li>
                      </ul>
                    </li>
                    <li v-if="protectionSelected" :class="['node', { sel: highlighted('protection') }]" :style="conceptStyle('protection')">
                      <div class="nrow" @click="select('protection')" @focusin="focusRow('protection')">
                        <span class="nlabel">Principal protection<HintToggle id="protection" about="principal protection" :text="hints.protection" :active="activeHint === 'protection'" @toggle="toggleHint('protection')" /></span>
                        <span class="ctrl"><NumberInput id="rate-protection" v-model="protectionPercent" class="num rate" aria-label="Principal protection (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove principal protection" @click.stop="removeFeature('protection')">×</button></span>
                      </div>
                      <ul v-if="issuesFor('principalProtection').length" class="errors" role="alert"><li v-for="message in issuesFor('principalProtection')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li v-if="minimumSelected" :class="['node', { sel: highlighted('minimum-return') }]" :style="conceptStyle('minimum-return')">
                      <div class="nrow" @click="select('minimum-return')" @focusin="focusRow('minimum-return')">
                        <span class="nlabel">Minimum return<HintToggle id="minimum-return" about="minimum return" :text="hints['minimum-return']" :active="activeHint === 'minimum-return'" @toggle="toggleHint('minimum-return')" /></span>
                        <span class="ctrl"><NumberInput id="rate-minimum" v-model="minimumPercent" class="num rate" aria-label="Minimum return on principal (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove minimum return" @click.stop="removeFeature('minimum')">×</button></span>
                      </div>
                      <ul v-if="issuesFor('minimumReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('minimumReturn')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li v-if="digitalSelected" :class="['node', { sel: highlighted('digital-return') }]" :style="conceptStyle('digital-return')">
                      <div class="nrow" @click="select('digital-return')" @focusin="focusRow('digital-return')">
                        <span class="nlabel">Digital return<HintToggle id="digital" about="digital return" :text="hints.digital" :active="activeHint === 'digital'" @toggle="toggleHint('digital')" /></span>
                        <span class="ctrl"><NumberInput id="rate-digital" v-model="digitalPercent" class="num rate" aria-label="Digital return on principal (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove digital return" @click.stop="removeFeature('digital')">×</button></span>
                      </div>
                      <ul v-if="issuesFor('digitalReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('digitalReturn')" :key="message">{{ message }}</li></ul>
                      <ul>
                        <li :class="['node', { sel: highlighted('digital-barrier') }]" :style="conceptStyle('digital-barrier')">
                          <div class="nrow" @click="select('digital-barrier')" @focusin="focusRow('digital-barrier')">
                            <span class="nlabel">Digital barrier<HintToggle id="digital-barrier" about="digital barrier" :text="hints['digital-barrier']" :active="activeHint === 'digital-barrier'" @toggle="toggleHint('digital-barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-digital-barrier" v-model="digitalBarrierPercent" class="num rate" :aria-label="`Digital barrier: level (% of the ${lookingBack ? 'lookback' : 'initial'} level)`" /><span class="unit">%</span></span>
                            <span class="ctrl block"><label for="digital-barrier-observation">Observed</label><select id="digital-barrier-observation" :value="'final'"><option value="final">Final date</option><option value="daily-close" disabled>Daily close (final date only)</option></select></span>
                          </div>
                        </li>
                      </ul>
                    </li>
                    <li v-if="!hasFeatures" class="empty-payoff">
                      <p>This {{ wrapper }} only repays principal. Add a feature, such as upside participation or {{ wrapper === 'deposit' ? 'a minimum return' : 'principal protection' }}, to change what it pays.</p>
                    </li>
                    <li ref="paletteRoot" class="addrow"@keydown.esc="closePalette(true)">
                      <button ref="addButton" type="button" class="addbtn" aria-haspopup="dialog" :aria-expanded="paletteOpen" @click="paletteOpen ? closePalette() : openPalette()">＋ Add feature</button>
                      <div v-if="paletteOpen" class="menu" role="dialog" aria-label="Add a payoff feature">
                        <input ref="paletteSearch" v-model="paletteQuery" type="search" class="search" placeholder="Search features" aria-label="Search features" @keydown.enter.prevent="addFirstMatch" />
                        <div class="mlist">
                          <button v-for="feature in matchingFeatures" :key="feature.id" type="button" :class="['mitem', { off: !feature.available || isAdded(feature.id) || blockedReason(feature.id) }]" :aria-disabled="!feature.available || isAdded(feature.id) || blockedReason(feature.id) ? 'true' : undefined" @click="addFeature(feature.id)">
                            <b>{{ feature.label }}<span v-if="!feature.available" class="badge">Unavailable</span><span v-else-if="isAdded(feature.id)" class="badge">Added</span><span v-else-if="blockedReason(feature.id)" class="badge">{{ blockedReason(feature.id) }}</span></b>
                            <small>{{ feature.description }}</small>
                          </button>
                          <p v-if="!matchingFeatures.length" class="empty-menu">No matching feature.</p>
                        </div>
                      </div>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <section class="panel preview" aria-label="Payoff preview">
          <header class="panel-head"><h2>Payoff at {{ wrapper === 'deposit' ? 'maturity' : 'redemption' }}</h2><p>{{ scheduled ? (autocalled && callOnFinal ? 'What it pays at the end of its term for each hypothetical final level, if no earlier review called it. At or above the last trigger, the final review calls it' : 'What it pays if held to the end of its term, for each hypothetical final level') : 'What it pays for each hypothetical final level' }}</p></header>
          <template v-if="chart">
            <svg ref="chartSvg" :class="['chart', { 'feature-selected': featureSelected, tracing: trace }]" viewBox="0 0 620 350" role="group" :aria-label="chartDescription" :style="{ '--label': `${11 * labelScale}px` }">
              <defs><clipPath id="plot-clip"><rect :x="plot.left" :y="plot.top" :width="plot.right - plot.left" :height="plot.bottom - plot.top"/></clipPath></defs>
              <line :x1="plot.left" :y1="plot.bottom" :x2="plot.right" :y2="plot.bottom" class="axis-line"/><line :x1="plot.left" :y1="plot.top" :x2="plot.left" :y2="plot.bottom" class="axis-line"/>
              <line :x1="plot.left" :y1="chart.principalY" :x2="plot.right" :y2="chart.principalY" class="ref-line principal"/>
              <line v-if="chartHighlight.initial" :x1="chart.initialX" :y1="plot.top" :x2="chart.initialX" :y2="plot.bottom" class="highlight-line" :style="conceptStyle('initial-level')"/>
              <line v-for="(drop, index) in chart.drops" :key="`drop-${index}`" :x1="drop.x" :y1="drop.y" :x2="drop.x" :y2="plot.bottom" class="drop-line"/>
              <g clip-path="url(#plot-clip)">
                <polygon v-for="(shade, index) in chart.shades" :key="`shade-${index}`" :points="shade.points" class="shade" :style="conceptStyle(shade.concept)"/>
                <polyline :points="chart.underlierPoints" class="underlier-line"/>
                <polyline v-for="(piece, index) in chart.ghostPieces" :key="`ghost-${index}`" :points="piece" class="ghost-line"/>
                <polyline v-for="(piece, index) in chart.pieces" :key="`casing-${index}`" :points="piece" class="payoff-casing"/>
                <polyline v-for="(segment, index) in chart.segments" :key="index" :points="segment.points" class="payoff-line" :style="conceptStyle(regimeConcept[segment.regime])"/>
                <polyline v-for="(piece, index) in chart.branchPieces" :key="`branch-${index}`" :points="piece" class="branch-line" :style="conceptStyle('barrier')"/>
                <g v-for="(mark, index) in chart.jumpMarks" :key="`jump-${index}`" aria-hidden="true"><circle :cx="mark.x" :cy="mark.openY" r="5" class="jump-open" :style="conceptStyle(mark.open)"/><circle :cx="mark.x" :cy="mark.closedY" r="5" class="jump-closed" :style="conceptStyle(mark.closed)"/></g>
              </g>
              <line v-if="chart.finalHandle && chartHighlight.final" :x1="chart.finalHandle.x" :y1="chart.finalHandle.y" :x2="chart.finalHandle.x" :y2="plot.bottom" class="highlight-line" :style="conceptStyle('final-level')"/>
              <line v-if="chart.finalHandle" :x1="chart.finalHandle.x" :y1="chart.finalHandle.y" :x2="chart.finalHandle.x" :y2="plot.bottom" class="final-guide"/>
              <g v-for="tick in chart.amountTicks" :key="tick.y"><line :x1="plot.left - 4" :y1="tick.y" :x2="plot.left" :y2="tick.y" class="axis-line"/><text :x="plot.left - 7" :y="tick.y" text-anchor="end" dominant-baseline="middle" class="axis-label">{{ tick.label }}</text></g>
              <text :x="plot.left + 2" y="24" class="axis-label">Payment</text>
              <line :x1="plot.left + 4" :y1="chart.principalY + (chart.principalBelow ? 10 : -10)" :x2="plot.left + 16" :y2="chart.principalY + (chart.principalBelow ? 10 : -10)" class="ref-swatch principal"/><text :x="plot.left + 20" :y="chart.principalY + (chart.principalBelow ? 14 : -6)" class="ref-label">Principal {{ formatAmount(principal) }}</text>
              <text v-for="tick in chart.returnTicks" :key="tick.label" :x="tick.x" y="331" text-anchor="middle" :class="['axis-label', { zero: tick.zero }]">{{ tick.label }}</text>
              <g v-for="label in chart.labels" :key="label.id" :class="['feature-label', { on: featureSelected && highlighted(label.concept) }]" aria-hidden="true">
                <path :d="`M${label.from.x},${label.from.y} L${label.anchor.x},${label.anchor.y}`" class="leader"/>
                <text v-for="(line, index) in label.lines" :key="index" :x="label.x + 3" :y="label.y + chart.lineHeight * (index + 1) - 1" class="ref-label">{{ line }}</text>
              </g>
              <g v-if="trace" class="trace" aria-hidden="true" :style="conceptStyle(trace.concept)">
                <g clip-path="url(#plot-clip)">
                  <polygon v-if="trace.shade" :points="trace.shade" class="trace-shade"/>
                  <polyline v-for="(piece, index) in trace.previous" :key="`before-${index}`" :points="piece" class="trace-previous"/>
                  <polyline v-for="(piece, index) in trace.pieces" :key="`casing-${index}`" :points="piece" class="trace-casing"/>
                  <polyline v-for="(piece, index) in trace.pieces" :key="`line-${index}`" :points="piece" class="trace-line"/>
                </g>
                <line :x1="trace.point.x" :y1="trace.point.y" :x2="trace.point.x" :y2="plot.bottom" class="final-guide"/>
                <circle :cx="trace.point.x" :cy="trace.point.y" r="6" class="trace-point"/>
                <text :x="trace.label.x" :y="trace.label.y" :text-anchor="trace.label.anchor" class="ref-label trace-label">{{ trace.label.text }}</text>
              </g>
              <g v-if="chart.bubble && !trace" class="bubble" :transform="`translate(${chart.bubble.x} ${chart.bubble.y})`"><rect :width="chart.bubble.width" height="22" rx="6"/><text :x="chart.bubble.width / 2" y="15" text-anchor="middle">{{ chart.bubble.text }}</text></g>
              <g v-if="chart.floorHandle" :class="['handle', { on: highlighted(floorConcept) }]" :style="conceptStyle(floorConcept)" :transform="`translate(${chart.floorHandle.x} ${chart.floorHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" :aria-label="minimumSelected ? 'Minimum return' : 'Principal protection'" :aria-valuemin="minimumSelected ? 1 : 0" aria-valuemax="100" :aria-valuenow="minimumSelected ? minimumPercent : protectionPercent" :aria-valuetext="minimumSelected ? `${minimumPercent}% minimum return` : `${protectionPercent}% protection`" @pointerdown="startDrag('floor', $event)" @pointermove="dragMove('floor', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('floor', $event)" @focus="focusHandle('floor')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.digitalHandle" :class="['handle', { on: highlighted('digital-return') }]" :style="conceptStyle('digital-return')" :transform="`translate(${chart.digitalHandle.x} ${chart.digitalHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Digital return" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="digitalPercent" :aria-valuetext="`${digitalPercent}% digital return`" @pointerdown="startDrag('digital', $event)" @pointermove="dragMove('digital', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('digital', $event)" @focus="focusHandle('digital')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.digitalBarrierHandle" :class="['handle', { on: highlighted('digital-barrier') }]" :style="conceptStyle('digital-barrier')" :transform="`translate(${chart.digitalBarrierHandle.x} ${chart.digitalBarrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Digital barrier" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="digitalBarrierPercent" :aria-valuetext="`Digital barrier at ${digitalBarrierPercent}% of the ${lookingBack ? 'lookback' : 'initial'} level`" @pointerdown="startDrag('digital-barrier', $event)" @pointermove="dragMove('digital-barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('digital-barrier', $event)" @focus="focusHandle('digital-barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.capHandle" :class="['handle', { on: highlighted('cap') }]" :style="conceptStyle('cap')" :transform="`translate(${chart.capHandle.x} ${chart.capHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Cap" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="capPercent" :aria-valuetext="`${capPercent}% maximum return`" @pointerdown="startDrag('cap', $event)" @pointermove="dragMove('cap', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('cap', $event)" @focus="focusHandle('cap')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.bufferHandle" :class="['handle', { on: highlighted('buffer') }]" :style="conceptStyle('buffer')" :transform="`translate(${chart.bufferHandle.x} ${chart.bufferHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Buffer" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="bufferPercent" :aria-valuetext="`${bufferPercent}% buffer`" @pointerdown="startDrag('buffer', $event)" @pointermove="dragMove('buffer', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('buffer', $event)" @focus="focusHandle('buffer')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.barrierHandle" :class="['handle', { on: highlighted('barrier') }]" :style="conceptStyle('barrier')" :transform="`translate(${chart.barrierHandle.x} ${chart.barrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Downside barrier" aria-valuemin="1" aria-valuemax="99" :aria-valuenow="barrierPercent" :aria-valuetext="`Downside barrier at ${barrierPercent}% of the ${lookingBack ? 'lookback' : 'initial'} level`" @pointerdown="startDrag('barrier', $event)" @pointermove="dragMove('barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('barrier', $event)" @focus="focusHandle('barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.upsideBarrierHandle" :class="['handle', { on: highlighted('barrier') }]" :style="conceptStyle('barrier')" :transform="`translate(${chart.upsideBarrierHandle.x} ${chart.upsideBarrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Upside barrier" aria-valuemin="101" aria-valuemax="200" :aria-valuenow="upsideBarrierPercent" :aria-valuetext="`Upside barrier at ${upsideBarrierPercent}% of the ${lookingBack ? 'lookback' : 'initial'} level`" @pointerdown="startDrag('upside-barrier', $event)" @pointermove="dragMove('upside-barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('upside-barrier', $event)" @focus="focusHandle('upside-barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.lowerBarrierHandle" :class="['handle', { on: highlighted('barrier') }]" :style="conceptStyle('barrier')" :transform="`translate(${chart.lowerBarrierHandle.x} ${chart.lowerBarrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Lower barrier" aria-valuemin="1" aria-valuemax="99" :aria-valuenow="lowerBarrierPercent" :aria-valuetext="`Lower barrier at ${lowerBarrierPercent}% of the initial level`" @pointerdown="startDrag('lower-barrier', $event)" @pointermove="dragMove('lower-barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('lower-barrier', $event)" @focus="focusHandle('lower-barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.upperBarrierHandle" :class="['handle', { on: highlighted('barrier') }]" :style="conceptStyle('barrier')" :transform="`translate(${chart.upperBarrierHandle.x} ${chart.upperBarrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Upper barrier" aria-valuemin="101" aria-valuemax="200" :aria-valuenow="upperBarrierPercent" :aria-valuetext="`Upper barrier at ${upperBarrierPercent}% of the initial level`" @pointerdown="startDrag('upper-barrier', $event)" @pointermove="dragMove('upper-barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('upper-barrier', $event)" @focus="focusHandle('upper-barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.slopeHandle":class="['handle', { on: highlighted('upside') }]" :style="conceptStyle('upside')" :transform="`translate(${chart.slopeHandle.x} ${chart.slopeHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Upside participation rate" aria-valuemin="5" aria-valuemax="200" :aria-valuenow="participationPercent.upside" :aria-valuetext="`${participationPercent.upside}% upside participation`" @pointerdown="startDrag('slope', $event)" @pointermove="dragMove('slope', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('slope', $event)" @focus="focusHandle('slope')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.finalHandle" class="handle final-dot" :transform="`translate(${chart.finalHandle.x} ${chart.finalHandle.y})`" tabindex="0" role="slider" :aria-label="`Hypothetical final level of ${underlierLabel}`" aria-valuemin="0" :aria-valuemax="Math.floor(chart.end)" :aria-valuenow="finalLevel" :aria-valuetext="`Final level ${formatAmount(finalLevel)}, payment ${formatAmount(endPayment ?? 0)}`" @pointerdown="startDrag('final', $event)" @pointermove="dragMove('final', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('final', $event)">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
            </svg>
            <div class="chart-axis-title">Change in {{ isBasket ? `the basket from its starting level${averaging ? `, each asset averaged over ${observationCount} observed levels` : ''}` : `${underlierLabel} from its ${lookingBack ? 'lookback' : 'initial'} level${averaging ? `, averaged over ${observations.length} observed levels` : ''}` }} →</div>
            <ul class="chart-legend" aria-label="Key"><li :style="conceptStyle('payoff')"><span class="legend-swatch" aria-hidden="true"></span>The {{ wrapper }}</li><li><span class="legend-swatch underlier" aria-hidden="true"></span>Moving 1:1 with {{ isBasket ? 'the basket' : underlierLabel }}</li></ul>
            <div class="path-bar" role="group" aria-label="Calculation path" @keydown="pathKey">
              <div class="path-buttons">
                <button type="button" class="path-button" aria-label="Previous step" title="Previous step (←)" :disabled="pathAt === null || pathAt === 0" @click="stepPath(-1)"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                <button type="button" class="path-button play" :aria-label="playing ? 'Pause' : 'Play how the payoff is built'" :title="playing ? 'Pause' : 'Play how the payoff is built'" :disabled="!pathStages.length" @click="playing ? pausePath() : playPath()"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path v-if="playing" d="M5 3.5v9M11 3.5v9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path v-else d="M5 3l8 5-8 5z" fill="currentColor"/></svg></button>
                <button type="button" class="path-button" aria-label="Next step" title="Next step (→)" :disabled="!pathStages.length || pathAt === lastStage" @click="stepPath(1)"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                <button type="button" class="path-button" aria-label="Close the path" title="Close the path (Esc)" :disabled="pathAt === null" @click="endPath"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
              </div>
              <p class="path-status" aria-live="polite"><template v-if="pathStatus"><b>{{ pathStatus.title }}<span class="path-progress">{{ pathStatus.progress }}</span></b><span>{{ pathStatus.detail }}</span><span class="path-point">{{ pathStatus.point }}</span><span v-if="pathStatus.aside" class="path-aside">{{ pathStatus.aside }}</span></template><template v-else><b>How the payoff is built</b><span>Play or step through it: the line starts moving 1:1 with {{ isBasket ? 'the basket' : underlierLabel }}, and each rule reshapes it until it is what the {{ wrapper }} pays.</span></template></p>
            </div>
            <p class="chart-hint">Point at the chart to show its handles, then drag one, or focus one and use the arrow keys. Shift takes bigger steps. Select a feature to shade what it changes. A faint line shows the payoff before your last change.</p>
          </template>
          <p v-else class="help">Enter valid terms to see the payoff.</p>


          <TabGroup v-model="activeTab" :tabs="tabs" label="The payment and its scenarios">
            <template #calculation>
              <div v-if="lookingBack" class="hint-field"><div class="field-heading"><span id="lookback-levels-label" class="observed-heading">Lookback level: hypothetical levels of {{ underlierLabel }} on the lookback dates</span><button type="button" class="hint-button" aria-label="About the lookback level" aria-controls="lookback-levels-hint" :aria-expanded="activeHint === 'lookback-levels'" @click="toggleHint('lookback-levels')">ⓘ</button><p v-if="activeHint === 'lookback-levels'" id="lookback-levels-hint" class="hint-text" role="tooltip">Hypothetical levels on the pricing date and each lookback date after it, earliest first. The lowest of them is the lookback level, which the return is measured from. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="observed-levels" role="group" aria-labelledby="lookback-levels-label" :style="conceptStyle('initial-level')"><span class="observed-op" aria-hidden="true">min(</span><span class="observed-cell"><label for="lookback-pricing" class="observed-name">Pricing<template v-if="isLowest(initialLevel)"> · lowest</template></label><NumberInput id="lookback-pricing" v-model="initialLevel" :class="['observed-input', { lowest: isLowest(initialLevel) }]" /></span><template v-for="(level, index) in afterPricing" :key="index"><span class="observed-op" aria-hidden="true">,</span><span class="observed-cell"><label :for="`lookback-${index}`" class="observed-name">Obs {{ index + 1 }}<template v-if="isLowest(level)"> · lowest</template></label><NumberInput :id="`lookback-${index}`" :model-value="level" :class="['observed-input', { lowest: isLowest(level) }]" @update:model-value="setAfterPricing(index, $event)" /></span></template><span class="observed-op" aria-hidden="true">) =</span><span class="observed-cell"><span class="observed-name">Lookback level</span><output class="observed-result" aria-live="polite">{{ Number.isFinite(determinedInitialLevel) ? formatAmount(determinedInitialLevel) : '—' }}</output></span></div></div>
              <p v-if="lookbackError" class="errors" role="alert">{{ lookbackError }}</p>
              <div v-if="isBasket" :class="['hint-field', { unused: finalUnused }]"><div class="field-heading"><span id="basket-levels-label" class="observed-heading">{{ averaging ? 'Final levels: hypothetical levels of each asset on the averaging dates' : 'Final levels: hypothetical level of each asset on the final date' }}</span><button type="button" class="hint-button" aria-label="About the basket's final levels" aria-controls="basket-levels-hint" :aria-expanded="activeHint === 'basket-levels'" @click="toggleHint('basket-levels')">ⓘ</button><p v-if="activeHint === 'basket-levels'" id="basket-levels-hint" class="hint-text" role="tooltip">{{ finalUnused }} Hypothetical levels for this scenario, earliest first. Each asset's return is measured from its own initial level{{ averaging ? ' to the average of its levels' : '' }}. Dragging the final level on the chart moves every asset's return by the same amount. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="table-wrap basket-levels" :style="conceptStyle('final-level')"><table aria-labelledby="basket-levels-label"><thead><tr><th scope="col">Asset</th><th v-for="(_, index) in basketObservations[0]" :key="index" scope="col">{{ averaging ? `Obs ${index + 1}${index === basketObservations[0].length - 1 ? ' · final date' : ''}` : 'Final date' }}</th><th v-if="averaging" scope="col">Final level</th><th scope="col">Return</th></tr></thead><tbody><tr v-for="(levels, asset) in basketObservations" :key="asset"><th scope="row">{{ basketAssets[asset].name.trim() || `Asset ${asset + 1}` }}</th><td v-for="(level, index) in levels" :key="index"><NumberInput :model-value="level" class="observed-input" :aria-label="`${basketAssets[asset].name.trim() || `Asset ${asset + 1}`}, ${averaging ? `observation ${index + 1}` : 'final date'}`" @update:model-value="setBasketObservation(asset, index, $event)" /></td><td v-if="averaging"><output class="observed-result" aria-live="polite">{{ basketMeasure ? formatAmount(basketMeasure.components[asset].finalLevel) : '—' }}</output></td><td class="asset-return">{{ basketMeasure ? signedPercent(basketMeasure.components[asset].componentReturn) : '—' }}</td></tr></tbody></table></div></div>
              <div v-else-if="averaging" :class="['hint-field', { unused: finalUnused }]"><div class="field-heading"><span id="observed-levels-label" class="observed-heading">Final level: hypothetical levels of {{ underlierLabel }} on the averaging dates</span><button type="button" class="hint-button" aria-label="About the averaged final level" aria-controls="observed-levels-hint" :aria-expanded="activeHint === 'observed-levels'" @click="toggleHint('observed-levels')">ⓘ</button><p v-if="activeHint === 'observed-levels'" id="observed-levels-hint" class="hint-text" role="tooltip">{{ finalUnused }} Hypothetical levels on each averaging date, earliest first. Their average is the final level. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="observed-levels" role="group" aria-labelledby="observed-levels-label" :style="conceptStyle('final-level')"><template v-for="(level, index) in observations" :key="index"><span v-if="index > 0" class="observed-op" aria-hidden="true">+</span><span class="observed-cell"><label :for="`observation-${index}`" class="observed-name">Obs {{ index + 1 }}<template v-if="index === observations.length - 1"> · final date</template></label><NumberInput :id="`observation-${index}`" :model-value="level" class="observed-input" @update:model-value="setObservation(index, $event)" /></span></template><span class="observed-op" aria-hidden="true">÷ {{ observations.length }} =</span><span class="observed-cell"><span class="observed-name">Final level</span><output class="observed-result" aria-live="polite">{{ Number.isFinite(finalLevel) ? formatAmount(finalLevel) : '—' }}</output></span></div></div>
              <div v-else :class="['hint-field', { unused: finalUnused }]"><div class="field-heading"><label for="final-level">Final level: hypothetical level of {{ underlierLabel }} on the final date</label><button type="button" class="hint-button" aria-label="About the final level" aria-controls="final-level-hint" :aria-expanded="activeHint === 'final-level'" @click="toggleHint('final-level')">ⓘ</button><p v-if="activeHint === 'final-level'" id="final-level-hint" class="hint-text" role="tooltip">{{ finalUnused }} A hypothetical level for this scenario. Changing it does not change the {{ wrapper }}'s terms.</p></div><NumberInput id="final-level" :model-value="observations[0]" :title="finalUnused || undefined" class="final-input" @update:model-value="setObservation(0, $event)" /></div>
              <p v-if="finalError" class="errors" role="alert">{{ finalError }}</p>
              <div v-if="lowestCloseWanted && lowestClose !== undefined" class="hint-field"><div class="field-heading"><label for="lowest-close">Lowest close: hypothetical lowest close of {{ underlierLabel }}</label><button type="button" class="hint-button" aria-label="About the lowest close" aria-controls="lowest-close-hint" :aria-expanded="activeHint === 'lowest-close'" @click="toggleHint('lowest-close')">ⓘ</button><p v-if="activeHint === 'lowest-close'" id="lowest-close-hint" class="hint-text" role="tooltip">{{ hints['lowest-close'] }}</p></div><NumberInput id="lowest-close" :model-value="lowestClose" class="final-input" @update:model-value="lowestCloseInput = $event" /></div>
              <div v-if="highestCloseWanted && highestClose !== undefined" class="hint-field"><div class="field-heading"><label for="highest-close">Highest close: hypothetical highest close of {{ underlierLabel }}</label><button type="button" class="hint-button" aria-label="About the highest close" aria-controls="highest-close-hint" :aria-expanded="activeHint === 'highest-close'" @click="toggleHint('highest-close')">ⓘ</button><p v-if="activeHint === 'highest-close'" id="highest-close-hint" class="hint-text" role="tooltip">{{ hints['highest-close'] }}</p></div><NumberInput id="highest-close" :model-value="highestClose" class="final-input" @update:model-value="highestCloseInput = $event" /></div>
              <div v-if="datesBeforeLast.length" class="hint-field">
                <div class="field-heading"><span id="review-levels-label" class="observed-heading">Reviews: hypothetical level of {{ underlierLabel }} on each review before the last</span><select class="path-select" aria-label="Load a path" @change="loadPath($event)"><option value="">Load a path…</option><option v-for="(path, index) in pathOptions" :key="path.name" :value="index">{{ path.name }}</option></select></div>
                <div class="table-wrap basket-levels review-levels" :style="conceptStyle(autocalled ? 'trigger' : 'coupon')"><table aria-labelledby="review-levels-label"><thead><tr><th scope="col">Month</th><th scope="col">Review</th><th v-if="autocalled" scope="col" class="review-trigger">Trigger</th><template v-if="isBasket"><th v-for="(asset, a) in basketAssets" :key="a" scope="col">{{ asset.name.trim() || `Asset ${a + 1}` }}</th><th scope="col">Basket level</th></template><th v-else scope="col">Level</th><th v-if="autocalled" scope="col">Test</th><th v-if="note.coupon" scope="col">Coupon</th></tr></thead><tbody><tr v-for="{ date, index } in reviewRows" :key="date.month"><th scope="row">{{ date.month }}</th><td class="review-name">{{ reviewLabel(date) }}</td><td v-if="autocalled" class="review-trigger">{{ Number.isFinite(reviewTrigger(date)) ? formatAmount(reviewTrigger(date)) : '—' }}</td><td v-if="index === undefined" :colspan="isBasket ? basketAssets.length + 1 : 1" class="review-unread" title="A fixed coupon reads no level">—</td><template v-else-if="isBasket"><td v-for="(assetLevel, a) in reviewAssetLevels[index]" :key="a"><NumberInput :model-value="assetLevel" class="observed-input" :aria-label="`${basketAssets[a].name.trim() || `Asset ${a + 1}`}, month ${date.month}`" @update:model-value="setReviewAssetLevel(index, a, $event)" /></td><td><output class="observed-result" aria-live="polite">{{ Number.isFinite(reviewLevels[index]) ? formatAmount(reviewLevels[index]) : '—' }}</output></td></template><td v-else><NumberInput :model-value="reviewLevels[index]" class="observed-input" :aria-label="`Level in month ${date.month}`" @update:model-value="setReviewLevel(index, $event)" /></td><td v-if="autocalled" class="review-test-cell"><span v-if="reviewTest(date)" :class="['review-test', { called: reviewTest(date) === 'Called', ended: reviewTest(date) === 'Ended' || reviewTest(date) === 'No call' }]">{{ reviewTest(date) }}</span></td><td v-if="note.coupon" class="review-test-cell"><span v-if="reviewCoupon(date)" :class="['review-test', { ended: reviewCoupon(date).startsWith('Missed') || reviewCoupon(date) === 'Ended' || reviewCoupon(date) === '—' }]" :style="conceptStyle('coupon')">{{ reviewCoupon(date) }}</span></td></tr></tbody></table></div>
                <p v-if="reviewError" class="errors" role="alert">{{ reviewError }}</p>
              </div>
              <div v-if="issuerCalled && issuerCallableReviews.length" class="hint-field">
                <div class="field-heading"><label for="issuer-call-review" class="observed-heading">The issuer’s choice in this scenario</label><HintToggle id="issuer-choice" about="the issuer’s choice" :text="hints['issuer-choice']" :active="activeHint === 'issuer-choice'" @toggle="toggleHint('issuer-choice')" /><select id="issuer-call-review" v-model="issuerCallSelection" class="path-select"><option :value="null">The issuer does not call</option><option v-for="review in issuerCallableReviews" :key="review" :value="review">Calls on review {{ review }} of {{ issuerCallableReviews.length + nonCallReviewCount + 1 }}, after {{ issuerCallMonths(review) }} {{ issuerCallMonths(review) === 1 ? 'month' : 'months' }}</option></select></div>
              </div>
              <div class="formula" role="group" aria-label="Payment rule"><div v-for="(line, index) in formula" :key="index" :class="['fline', { limit: !line.lead }]"><span class="flead">{{ line.lead }}</span><span class="feq">{{ line.lead ? '=' : '' }}</span><span class="fexpr"><template v-for="(segment, part) in line.segments" :key="part"><span v-if="segment.concept" :class="['fterm', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)">{{ segment.text }}</span><template v-else>{{ segment.text }}</template></template></span></div><p class="fwords"><b>In words:</b> {{ formulaWords }}</p></div>
              <ol class="calc-steps" aria-live="polite"><li v-for="step in calculation" :key="`${step.n}-${step.title}`" :class="{ hl: !step.heading && step.concept && highlighted(step.concept), muted: step.muted, result: step.result, heading: step.heading, traceable: !step.heading && stageOfStep.has(step.title), current: currentStage?.step === step.title }" :tabindex="!step.heading && stageOfStep.has(step.title) ? 0 : undefined" :aria-current="currentStage?.step === step.title ? 'step' : undefined" :title="!step.heading && stageOfStep.has(step.title) ? 'Show this step on the chart' : undefined" @click="jumpToStep(step.title)" @keydown.enter.prevent="jumpToStep(step.title)" @keydown.space.prevent="jumpToStep(step.title)"><template v-if="step.heading"><b>{{ step.title }}</b><span class="calc-how">{{ step.how }}</span></template><template v-else><span class="calc-n">{{ step.n }}</span><b>{{ step.title }}</b><span class="calc-value">{{ step.value }}</span><span class="calc-how">{{ step.how }}</span></template></li></ol>
              <p v-if="outcomeSentence" class="outcome" aria-live="polite">{{ outcomeSentence }}</p>
            </template>
            <template #scenarios>
              <template v-if="chart">
                <h3>Example scenarios</h3>
                <p class="table-scroll-hint">Scroll horizontally to see every scenario column.</p>
                <div class="table-wrap"><table><thead><tr><th>{{ isBasket ? 'Basket level' : 'Final level' }}</th><th>Underlier change</th><th v-if="absoluteSelected || bothWaysSelected">Absolute return</th><th v-for="direction in selectedDirections" :key="direction">{{ participationLabels[direction] }}</th><th v-if="capSelected">Payment before cap</th><th v-if="protectionSelected || minimumSelected || digitalSelected">Payment before {{ minimumSelected ? 'minimum' : protectionSelected ? 'protection' : 'digital return' }}</th><th v-if="note.coupon">Last coupon</th><th>Final payment</th></tr></thead><tbody><tr v-for="row in scenarios" :key="`${row.returnValue}-${row.closeNote}`"><td>{{ formatAmount(row.final) }}<span v-if="row.atBarrier" class="floor-note">at barrier</span><span v-if="row.atCouponBarrier" class="floor-note">at coupon barrier</span><span v-if="row.pastBarrier" class="floor-note">{{ row.pastBarrier }} barrier</span><span v-if="row.atBuffer" class="floor-note">at buffer</span><span v-if="row.closeNote" class="floor-note">{{ row.closeNote }}</span></td><td>{{ formatPercent(row.returnValue) }}</td><td v-if="absoluteSelected || bothWaysSelected">{{ row.absolute ?? '—' }}</td><td v-for="direction in selectedDirections" :key="direction">{{ row.calculations[direction] ?? '—' }}</td><td v-if="capSelected">{{ formatAmount(row.uncappedPayment) }}</td><td v-if="protectionSelected || minimumSelected || digitalSelected">{{ formatAmount(row.unflooredPayment) }}</td><td v-if="note.coupon">{{ row.lastCoupon ? formatAmount(row.lastCoupon) : 'missed' }}</td><td>{{ formatAmount(row.payment) }}<span v-if="capSelected && row.capApplied" class="floor-note">cap applied</span><span v-if="(protectionSelected || minimumSelected || digitalSelected) && row.floorApplied" class="floor-note">{{ minimumSelected ? 'minimum applied' : row.digitalApplied ? 'digital return applied' : 'floor applied' }}</span></td></tr></tbody></table></div>
                <p class="scenario-formula"><template v-if="lookingBack">Each change is measured from the lookback level, {{ formatAmount(determinedInitialLevel) }}. </template><template v-if="averaging">Each final level is the average of the observed levels. </template><template v-if="bothWaysSelected">Absolute return pays {{ formatPercent(bothWaysRate / 100) }} of the size of the move, up or down, until a barrier is reached, and then {{ conditionalSelected ? `a fixed ${formatPercent(conditionalPercent / 100)}` : 'nothing more than principal' }}.</template><template v-else><strong>Selected participation:</strong> {{ participationSummary }}. A move in a direction without participation leaves principal unchanged before any floor applies.</template><template v-if="bufferSelected"> The buffer absorbs the first {{ bufferSummary }} of a fall.</template><template v-if="absoluteSelected"> A fall {{ barrierSelected ? 'that ends at or above the downside barrier' : 'within the buffer' }} pays {{ absoluteSummary }} of the fall as a gain.</template><template v-if="upsideBarrierSelected"> Above the upside barrier, upside participation ends{{ rebateSelected ? ` and the rebate pays ${formatPercent(rebatePercent / 100)} of principal instead` : '' }}.</template><template v-if="digitalSelected"> At or above the digital barrier, {{ formatPercent(digitalBarrierPercent / 100) }} of the {{ lookingBack ? 'lookback' : 'initial' }} level, it pays at least {{ digitalSummary }}.</template> The payment cannot fall below {{ bothWaysSelected ? formatAmount(principal) : floorSummary }}.<template v-if="capSelected"> It cannot exceed {{ capSummary }}.</template></p>
              </template>
              <p v-else class="help">Enter valid terms to see the scenarios.</p>
            </template>
          </TabGroup>
          <p v-if="chart" class="explanation">All amounts are illustrative.</p>
        </section>

        <aside ref="jsonPanel" class="panel structure-json" aria-labelledby="structure-json-heading">
          <header class="panel-head"><h2 id="structure-json-heading">Structure JSON<span v-if="errors.length" class="badge invalid">Invalid terms</span></h2><p>{{ errors.length ? 'A live draft containing invalid terms. Correct the highlighted terms before treating it as a valid structure.' : 'The same terms as data' }}</p><a class="schema-link" :href="`${baseUrl}product.schema.json`" target="_blank" rel="noopener noreferrer" aria-label="JSON Schema for this structure (opens in a new tab)">Schema ↗</a></header>
          <div class="json-wrap">
            <button type="button" :class="['copybtn', copyState]" aria-label="Copy the structure JSON" :title="copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy JSON'" @click="copyJson">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path v-if="copyState === 'copied'" d="M3 8.5l3.2 3L13 4.5"/>
                <path v-else-if="copyState === 'failed'" d="M8 3.5v5.5M8 12v.01"/>
                <template v-else><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10h.5"/></template>
              </svg>
            </button>
            <span class="visually-hidden" role="status">{{ copyState === 'copied' ? 'Structure JSON copied' : copyState === 'failed' ? 'Could not copy the structure JSON' : '' }}</span>
            <pre><code><span v-for="(line, index) in jsonLines" :key="index" :class="['jl', { on: line.concept && highlighted(line.concept) }]">{{ line.text }}</span></code></pre>
          </div>
        </aside>
      </div>

    </main>
  </div>
</template>
