<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { amountToY, barrierFromX, bufferFromX, fitAmountAxis, bufferLevel, capBindLevel, capFromY, clamp, clampBarrier, clampBuffer, clampCap, clampFinalLevel, clampMinimumReturn, clampProtection, clampUpsideRate, finalLevelFromX, jumpLevelOf, keyDelta, levelAxisFactor, levelToX, minimumReturnFromY, protectionFromY, regimeOf, slopeLevel, splitAtJumps, splitByRegime, upsideRateFromY, type Sample, type AmountAxis, type Plot, type Regime } from './chart/geometry'
import HintToggle from './components/HintToggle.vue'
import NumberInput from './components/NumberInput.vue'
import TabGroup from './components/TabGroup.vue'
import { calculationSteps } from './content/calculation'
import type { ConceptId } from './content/concepts'
import { marketingNames, type MarketingName } from './content/names'
import { paymentFormula, paymentInWords } from './content/formula'
import { explainOutcome } from './content/outcome'
import { scenarioRows } from './content/scenarios'
import { isHighlighted } from './content/selection'
import { structureLines } from './content/structure-json'
import { summarize } from './content/summary'
import { basketBreakdown, basketStartingLevel, equalWeights, finalLevelFrom, initialLevelFrom, initialObservationCountOf, maturityPayment, productIssues, observationCountOf, paymentBreakdown, upsideOf, withSubFeatures, type Determination, type FinalDetermination, type InitialDetermination, type ProductIssueField, type ParticipationDirection, type Product, type Underlier, type AssetKind, type Wrapper } from './domain/note'
import { fitLookbackObservations, fitObservations, shiftReturns, shiftToAverage } from './domain/observations'
import { firstFeatureValues, firstLookbackMoves, firstObservationCount, startingFinalLevel, startingInitialLevel, startingProduct } from './domain/starting-note'

const activeHint = ref<string | null>(null)
const toggleHint = (hint: string) => { activeHint.value = activeHint.value === hint ? null : hint }
const hints = {
  wrapper: 'The legal form sets what the holder owns and who owes the payments. A note is a debt of its issuer, so every payment depends on the issuer’s ability to pay. A deposit is held by a bank and repaid in full at the end of its term. It is usually insured up to a limit; any payment above the limit depends on the bank’s ability to pay.',
  redemption: 'Sets when the product ends and principal is paid back: at scheduled maturity, or earlier if its terms allow a call or a put. Bullet redemption pays once, at maturity.',
  term: 'The length of the product, stated as a duration such as 3 years. Principal is repaid at the end of the term. The issue and maturity dates that put the term on a calendar are set when the product is issued.',
  underlier: 'What the payoff reads: the asset it tracks and how its change is measured, from where it starts. A single underlier tracks one asset. A basket tracks several and combines their changes into one return.',
  asset: 'The equity or equity index the product tracks. Holding the product does not mean owning the asset.',
  determination: 'Sets which observed levels measure the underlier’s change: final ÷ initial − 1. The initial and final levels are each set on their own. Point-to-point uses the fixed initial level and the level on the final date; moves in between do not count. Lookback starts from the lowest of the levels on the pricing date and on several dates after it, so a fall soon after pricing lowers the starting point. Averaging takes the final level as the average of the levels observed on several dates before maturity, so a sharp move on the last date counts for less.',
  'lookback-observations': 'The number of dates after pricing whose levels can lower the starting point. The lowest of their levels and the level on the pricing date is the lookback level.',
  observations: 'The number of dates whose levels are averaged into the final level. Each observed level counts equally.',
  payoff: 'The rules that turn the underlier’s change into the maturity payment. With no features the product repays principal. Each feature adds a rule, such as a share of the gain or a minimum payment.',
  principal: 'The amount used as the base for the maturity payment.',
  'initial-level': 'The level the underlier’s return is measured from. Fixed states it as a term of this product: two products on the same asset can start from different levels. Lookback takes the lowest level observed on the pricing date and several dates after it. When a note’s strike is set at 100% of it, it is often called the strike level.',
  'final-level': 'The level the underlier’s return is measured to. Final date uses the level on the one final observation date; moves before it do not count. Averaging takes the average of the levels observed on several dates before maturity, so a sharp move on the last date counts for less.',
  downside: 'The share of a negative underlier return, beyond any buffer, deducted from principal before the protection floor applies.',
  buffer: 'The fall the holder does not bear, as a percentage of the initial level. A fall within it leaves principal unchanged, unless absolute return pays it as a gain. A larger fall reduces principal by the amount beyond it, at the downside participation rate.',
  barrier: 'A level of the underlier, as a percentage of the initial level. If the final level ends below it, downside participation applies to the whole fall; at or above it, a fall leaves principal unchanged. It is observed on the final observation date.',
  'absolute-return': 'Pays a fall within the buffer as a gain: each 1% fall adds the absolute return rate, as a percentage of principal. A fall beyond the buffer pays no gain and reduces principal as the buffer sets out, so the payment drops at the buffer level.',
  upside: 'The share of a positive underlier return added to principal.',
  cap: 'The most upside participation can add to principal, as a percentage of principal, however far the underlier rises.',
  protection: 'The minimum contractual maturity payment as a percentage of principal. Protection applies at maturity and depends on the issuer’s ability to pay.',
  'minimum-return': 'The lowest return the deposit pays on principal, whatever the underlier does. The payment is the greater of the participated payment and principal plus this return, so it is a floor, not an addition.',
  'basket-return': 'How a basket’s asset returns make its one return. Weighted adds up each asset’s return times its weight. The basket level starts at 100 and moves by that return, and the payoff reads it as it reads a single asset’s level.',
  weight: 'The asset’s share of the basket, fixed on the pricing date. The weights add up to 100%: the total beside Add asset shows how much is left to allocate, or how much is over.',
}
const wrapperOptions = [
  { id: 'note', label: 'Note', description: 'A debt security with payments defined by its terms and subject to the issuer’s ability to pay.', available: true },
  { id: 'deposit', label: 'Deposit', description: 'Money held by a bank and repaid in full at the end of the term.', available: true },
  { id: 'certificate-or-warrant', label: 'Certificate or warrant', description: 'Distinct security forms whose rights and legal treatment depend on their market and terms.', available: false },
  { id: 'etf', label: 'ETF', description: 'A fund whose shares trade on an exchange and represent an interest in a portfolio.', available: false },
] as const
const redemptionOptions = [
  { id: 'autocallable', label: 'Autocallable', description: 'Defined conditions may trigger redemption before scheduled maturity.', available: false },
  { id: 'bullet', label: 'Bullet', description: 'One payment at scheduled maturity; no early call.', available: true },
  { id: 'issuer-callable', label: 'Issuer callable', description: 'The issuer may redeem the note early under defined terms.', available: false },
  { id: 'puttable', label: 'Puttable', description: 'The holder may require redemption under defined terms.', available: false },
] as const
// Each level of the determination is chosen on its own. A fixed initial level and a final level on the final date is point-to-point.
const initialDeterminationOptions: ReadonlyArray<{ id: InitialDetermination['kind']; label: string; description: string }> = [
  { id: 'given', label: 'Fixed', description: 'Uses the initial level set in the terms.' },
  { id: 'lookback', label: 'Lookback', description: 'Uses the lowest of the levels on the pricing date and on several stated dates after it.' },
]
const finalDeterminationOptions: ReadonlyArray<{ id: FinalDetermination['kind']; label: string; description: string }> = [
  { id: 'averaging', label: 'Averaging', description: 'Uses the average of levels observed on several stated dates.' },
  { id: 'final-date', label: 'Final date', description: 'Uses the level on the one final date.' },
]
// A one-line meaning under each part's name, so the outline reads without opening every hint.
const partDescriptions = {
  wrapper: 'The form the product takes',
  redemption: 'When principal is repaid',
  underlier: 'What the return is linked to',
  asset: 'What is tracked',
  determination: 'How the underlier’s change is measured',
  'initial-level': 'Where the change is measured from',
  'final-level': 'Where the change is measured to',
  payoff: 'What the product pays at maturity',
  'basket-return': 'How the asset returns make one return',
}
const underlierOptions = [
  { id: 'basket', label: 'Basket', description: 'Several assets whose changes are combined into one return.', available: true },
  { id: 'single', label: 'Single', description: 'One asset.', available: true },
] as const
const basketReturnOptions = [
  { id: 'weighted', label: 'Weighted', description: 'Adds up each asset’s return times its weight.', available: true },
  { id: 'worst-of', label: 'Worst-of', description: 'Uses the return of the asset that performs worst.', available: false },
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
const conceptColors: Record<ConceptId, string> = { wrapper: '#4f6fae', redemption: '#2e8b83', underlier: '#7a5cb5', asset: '#9c6ade', determination: '#b7791f', 'initial-level': '#8b4f2b', 'final-level': '#6b6412', 'basket-return': '#5f5aa2', payoff: '#42536d', protection: '#2369bd', 'minimum-return': '#4338ca', upside: '#2b8a3e', downside: '#d9480f', cap: '#a23b8c', buffer: '#1aa3b8', barrier: '#9775fa', 'absolute-return': '#d4a017' }
const conceptStyle = (concept: ConceptId) => ({ '--c': conceptColors[concept] })
const highlighted = (concept: ConceptId) => isHighlighted(selected.value, concept)

// Payoff features are added one at a time to a payoff that starts with none. A removed feature keeps its last value.
// A buffer, barrier or absolute return belongs to downside participation and a cap to upside participation, so each is added under its direction.
type FeatureId = 'absolute-return' | 'barrier' | 'buffer' | 'cap' | 'coupon' | 'digital' | 'downside' | 'minimum' | 'protection' | 'upside'
const payoffFeatures: ReadonlyArray<{ id: FeatureId; label: string; description: string; available: boolean; requires?: ParticipationDirection }> = [
  { id: 'absolute-return', label: 'Absolute return', description: 'Pays a fall within the buffer as a gain.', available: true, requires: 'downside' },
  { id: 'barrier', label: 'Barrier', description: 'Downside participation applies only if the underlier ends below a stated level.', available: true, requires: 'downside' },
  { id: 'buffer', label: 'Buffer', description: 'Protects against an initial portion of underlier losses.', available: true, requires: 'downside' },
  { id: 'cap', label: 'Cap', description: 'Limits the return upside participation can add.', available: true, requires: 'upside' },
  { id: 'coupon', label: 'Coupon', description: 'An additional contractual payment on stated dates.', available: false },
  { id: 'digital', label: 'Digital', description: 'Pays a predefined amount if a stated condition is met.', available: false },
  { id: 'downside', label: 'Downside participation', description: 'Negative underlier return is multiplied by the downside participation rate until the protection floor applies.', available: true },
  { id: 'minimum', label: 'Minimum return', description: 'Sets the lowest return paid on principal, whatever the underlier does.', available: true },
  { id: 'protection', label: 'Principal protection', description: 'Sets the minimum contractual maturity payment as a percentage of principal.', available: true },
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
const absoluteSelected = ref(false)
const absolutePercent = ref(firstFeatureValues.absoluteReturn)
const minimumSelected = ref(false)
const minimumPercent = ref(firstFeatureValues.minimum)
const selectedDirections = computed(() => (['downside', 'upside'] as ParticipationDirection[]).filter((direction) => selectedParticipation[direction]))
const isAdded = (id: FeatureId) => id === 'protection' ? protectionSelected.value : id === 'minimum' ? minimumSelected.value : id === 'cap' ? capSelected.value : id === 'buffer' ? bufferSelected.value : id === 'barrier' ? barrierSelected.value : id === 'absolute-return' ? absoluteSelected.value : id === 'downside' || id === 'upside' ? selectedParticipation[id] : false
// Why a feature cannot be added yet, or null when it can: it needs its direction first, a buffer and a barrier are not combined,
// and absolute return pays within a buffer, so it needs one.
// A deposit is repaid in full, so it takes nothing that could pay less than principal; a minimum return is on deposits only.
const depositExcludes: ReadonlyArray<FeatureId> = ['downside', 'buffer', 'barrier', 'protection']
const blockedReason = (id: FeatureId) => {
  if (wrapper.value === 'deposit' && depositExcludes.includes(id)) return 'Not on a deposit'
  if (wrapper.value !== 'deposit' && id === 'minimum') return 'Deposits only'
  const requires = payoffFeatures.find((feature) => feature.id === id)?.requires
  if (requires && !selectedParticipation[requires]) return `Needs ${participationLabels[requires].toLowerCase()}`
  if (id === 'barrier' && bufferSelected.value) return 'Not with a buffer'
  if (id === 'buffer' && barrierSelected.value) return 'Not with a barrier'
  if (id === 'absolute-return' && !bufferSelected.value) return 'Needs a buffer'
  return null
}
// Why a wrapper cannot be chosen, or null when it can. Switching never removes the reader's terms, so a wrapper is
// unavailable while the payoff has a feature it does not allow.
const wrapperBlockedReason = (id: string) => {
  if (id === 'deposit' && selectedParticipation.downside) return 'Not with downside participation'
  if (id === 'deposit' && protectionSelected.value) return 'Not with principal protection'
  if (id === 'note' && minimumSelected.value) return 'Not with a minimum return'
  return null
}
const setWrapper = (id: string) => {
  if (id !== 'note' && id !== 'deposit') return
  beginGesture()
  wrapper.value = id
}
const hasFeatures = computed(() => protectionSelected.value || minimumSelected.value || capSelected.value || bufferSelected.value || barrierSelected.value || selectedDirections.value.length > 0)

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
  else if (id === 'cap') capSelected.value = true
  else if (id === 'buffer') bufferSelected.value = true
  else if (id === 'barrier') barrierSelected.value = true
  else if (id === 'absolute-return') absoluteSelected.value = true
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = true
  paletteOpen.value = false
  await nextTick()
  document.getElementById(`rate-${id}`)?.focus()
}
const removeFeature = async (id: FeatureId) => {
  beginGesture()
  if (id === 'protection') protectionSelected.value = false
  else if (id === 'minimum') minimumSelected.value = false
  else if (id === 'cap') capSelected.value = false
  else if (id === 'buffer') bufferSelected.value = false
  else if (id === 'barrier') barrierSelected.value = false
  else if (id === 'absolute-return') absoluteSelected.value = false
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = false
  // Removing a direction removes the buffer, barrier or cap that belongs to it, and removing the buffer removes the absolute return paid within it.
  if (id === 'downside') { bufferSelected.value = false; barrierSelected.value = false }
  if (id === 'downside' || id === 'buffer') absoluteSelected.value = false
  if (id === 'upside') capSelected.value = false
  if (selected.value === id || (id === 'minimum' && selected.value === 'minimum-return') || (id === 'downside' && (selected.value === 'buffer' || selected.value === 'barrier' || selected.value === 'absolute-return'))
    || (id === 'buffer' && selected.value === 'absolute-return') || (id === 'upside' && selected.value === 'cap')) selected.value = 'payoff'
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
onMounted(() => document.addEventListener('pointerdown', closeOnOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsidePointer))

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
      components: basketAssets.value.map(({ kind, name, weightPercent }) => ({ asset: { kind, name }, weight: fractionFrom(weightPercent) })),
      determination: {
        initial: { kind: 'given', levels: basketAssets.value.map(({ name, initialLevel }) => ({ asset: name, level: initialLevel })) },
        final: determination.value.final,
        basketReturn: { kind: 'weighted' },
      },
    })
const note = computed<Product>(() => ({
  wrapper: wrapper.value,
  principalAmount: principal.value,
  term: { months: termMonths.value },
  redemption: 'bullet',
  underlier: underlier.value,
  payoff: {
    participations: withSubFeatures(selectedDirections.value.map((direction) => ({ direction, rate: participationPercent[direction] / 100 })), {
      buffer: bufferSelected.value ? bufferPercent.value / 100 : undefined,
      barrier: barrierSelected.value ? { level: barrierPercent.value / 100, observation: 'final' } : undefined,
      absoluteReturn: absoluteSelected.value ? { rate: absolutePercent.value / 100 } : undefined,
      cap: capSelected.value ? capPercent.value / 100 : undefined,
    }),
    principalProtection: protectionSelected.value ? protectionPercent.value / 100 : undefined,
    minimumReturn: minimumSelected.value ? fractionFrom(minimumPercent.value) : undefined,
  },
}))
const jsonLines = computed(() => structureLines(note.value))
const formula = computed(() => paymentFormula(note.value))
const formulaWords = computed(() => paymentInWords(note.value))
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
const breakdown = computed(() => valid.value ? paymentBreakdown(note.value, { initial: determinedInitialLevel.value, final: finalLevel.value }) : null)
const payment = computed(() => breakdown.value?.payment ?? null)
const outcomeSentence = computed(() => breakdown.value ? explainOutcome(note.value, breakdown.value) : '')
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
const capSummary = computed(() => `${formatAmount(principal.value * (1 + capPercent.value / 100))} (a ${formatPercent(capPercent.value / 100)} return on principal)`)
const chartDescription = computed(() => {
  if (!hasFeatures.value) return 'Contractual maturity payment stays at principal for every final level.'
  const fall = selectedParticipation.downside
    ? `${absoluteSelected.value ? 'rises with falls within the buffer, then drops at the buffer level and falls' : bufferSelected.value ? `stays at principal for falls within the buffer, then falls` : barrierSelected.value ? 'stays at principal for falls that end at or above the barrier, then drops by the whole fall below it and falls' : 'falls'} with negative underlier returns${protectionSelected.value ? ' until the protection floor applies' : ', but not below zero'}`
    : 'stays at principal for negative underlier returns'
  const rise = selectedParticipation.upside ? `rises with positive underlier returns${capSelected.value ? ' until the cap applies' : ''}` : 'stays at principal for flat or positive underlier returns'
  return `Contractual maturity payment ${fall}. It ${rise}.${minimumSelected.value ? ' It never falls below principal plus the minimum return.' : ''}`
})
const buildTimestampIso = __BUILD_TIMESTAMP__
const buildTimestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
}).format(new Date(buildTimestampIso))

const scenarios = computed(() => !initialValid.value ? [] : scenarioRows(note.value, determinedInitialLevel.value).map(({ returnValue, finalLevel, atBarrier, atBuffer, breakdown }) => ({
  final: finalLevel,
  returnValue,
  atBarrier,
  atBuffer,
  absolute: breakdown.absoluteReturnApplies ? `${absoluteSummary.value} × |${formatPercent(returnValue)}| = ${formatPercent(breakdown.participatedReturn)}` : null,
  calculations: Object.fromEntries(selectedDirections.value.map((direction) => [
    direction,
    returnValue !== 0 && direction === breakdown.direction && breakdown.participationRate !== undefined && !(direction === 'downside' && breakdown.belowBarrier === false) && !breakdown.absoluteReturnApplies
      ? `${formatPercent(breakdown.participationRate)} × ${direction === 'downside' && bufferSelected.value ? `min(${formatPercent(returnValue)} + ${bufferSummary.value}, 0)` : formatPercent(returnValue)} = ${formatPercent(breakdown.participatedReturn)}`
      : null,
  ])) as Record<ParticipationDirection, string | null>,
  uncappedPayment: breakdown.uncappedPayment,
  unflooredPayment: breakdown.unflooredPayment,
  payment: breakdown.payment,
  capApplied: breakdown.capApplies,
  floorApplied: breakdown.floorApplies,
})))

// The tabs under the chart.
const tabs = [{ id: 'calculation', label: 'How the payment is worked out' }, { id: 'scenarios', label: 'Scenarios' }]
const activeTab = ref('calculation')
const calculation = computed(() => {
  const b = breakdown.value
  if (!b) return []
  return calculationSteps(note.value, b, observations.value, initialObservations.value, basketMeasure.value ?? undefined)
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

type HandleId = 'floor' | 'slope' | 'cap' | 'buffer' | 'barrier' | 'final'
// The floor is the minimum return on a deposit that has one, and protection otherwise. The two cannot both be present.
const floorConcept = computed<ConceptId>(() => minimumSelected.value ? 'minimum-return' : 'protection')
const handleConcept = (id: HandleId): ConceptId | null => id === 'floor' ? floorConcept.value : { slope: 'upside', cap: 'cap', buffer: 'buffer', barrier: 'barrier', final: null }[id] as ConceptId | null
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
  else if (id === 'slope') participationPercent.upside = upsideRateFromY(point.y, principal.value, top, plot, capFraction.value)
  else if (id === 'cap') capPercent.value = capFromY(point.y, principal.value, top, plot)
  else if (id === 'buffer') bufferPercent.value = bufferFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
  else if (id === 'barrier') barrierPercent.value = barrierFromX(point.x, axisScale.value, plot, determinedInitialLevel.value)
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
  // A larger buffer sits further left, so the left and right keys move the handle the way they point.
  else if (id === 'buffer') bufferPercent.value = clampBuffer(bufferPercent.value + (event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? -delta : delta))
  else if (id === 'barrier') barrierPercent.value = clampBarrier(barrierPercent.value + delta)
  else setFinalLevel(clampFinalLevel(finalLevel.value + delta, axisScale.value))
}

// The chart's horizontal axis is scaled on the pricing-date level, or on the basket's starting level.
const axisScale = computed(() => isBasket.value ? basketStartingLevel : initialLevel.value)
// The cap as a fraction of principal, or undefined when the note has none. The slope handle's position depends on it.
const capFraction = computed(() => capSelected.value ? capPercent.value / 100 : undefined)
const chartHighlight = computed(() => ({
  line: selected.value === 'payoff',
  floor: (protectionSelected.value || minimumSelected.value) && highlighted(floorConcept.value),
  cap: capSelected.value && highlighted('cap'),
  buffer: bufferSelected.value && highlighted('buffer'),
  barrier: barrierSelected.value && highlighted('barrier'),
  downside: selectedParticipation.downside && selected.value === 'downside',
  upside: selectedParticipation.upside && selected.value === 'upside',
  // The initial-level term belongs to the asset and is where the initial level starts; the lookback level is the initial level itself.
  initial: highlighted('initial-level'),
  lookback: highlighted('initial-level'),
  final: highlighted('final-level'),
}))
// Each regime is drawn in its concept's colour, in the line, the legend and the guides.
const regimeConcept = computed<Record<Regime, ConceptId>>(() => ({ principal: 'payoff', buffer: 'buffer', barrier: 'barrier', absolute: 'absolute-return', downside: 'downside', upside: 'upside', floor: floorConcept.value, cap: 'cap' }))
const regimeLabel = computed<Record<Regime, string>>(() => ({ principal: 'Principal repaid', buffer: 'Buffer', barrier: 'Barrier', absolute: 'Absolute return', downside: 'Downside participation', upside: 'Upside participation', floor: minimumSelected.value ? 'Minimum return' : 'Protection floor', cap: 'Cap' }))
const chart = computed(() => {
  if (!initialValid.value) return null
  const principalAmount = principal.value
  // The axis is scaled on the pricing-date level, so editing a level after pricing does not rescale it. The payoff bends
  // at the level the return is measured from, which with lookback can be lower.
  const scale = axisScale.value
  const initial = determinedInitialLevel.value
  const end = scale * levelAxisFactor
  const axisLevels = Array.from({ length: 257 }, (_, i) => end * i / 256)
  // The final levels to sample for a note. A jump, at a barrier or where absolute return stops, adds one level just below it
  // and one at it, so the line can break there.
  const levelsFor = (jumpLevel?: number) => jumpLevel === undefined || !(jumpLevel > 0 && jumpLevel < end) ? axisLevels
    : [...axisLevels.filter((level) => level < jumpLevel), jumpLevel * (1 - 1e-9), jumpLevel, ...axisLevels.filter((level) => level > jumpLevel)]
  // A jump is where the payment changes at once between two neighbouring samples at the same place.
  const jumpsIn = (levels: number[], values: number[]) => levels.map((level, i) => i > 0 && level - levels[i - 1] < end * 1e-6 && Math.abs(values[i] - values[i - 1]) > principalAmount * 1e-9)
  // The payment at each final level on the axis, measured from the determined initial level.
  const at = (level: number) => ({ initial, final: level })
  const barrierAt = barrierSelected.value ? initial * barrierPercent.value / 100 : undefined
  const levels = levelsFor(jumpLevelOf(note.value, initial))
  const breakdowns = levels.map((level) => paymentBreakdown(note.value, at(level)))
  const values = breakdowns.map((b) => b.payment)
  const jumps = jumpsIn(levels, values)
  const { minimumReturn } = note.value.payoff
  const floorAmount = principalAmount * (minimumReturn !== undefined ? 1 + minimumReturn : note.value.payoff.principalProtection ?? 0)
  const hasFloor = protectionSelected.value || minimumSelected.value
  const capAmount = principalAmount * (1 + (upsideOf(note.value)?.cap ?? 0))
  // The cap line stays in view even where the payoff does not reach it.
  const axis = frozenAxis.value ?? fitAmountAxis(Math.max(...values, capSelected.value ? capAmount : 0), principalAmount)
  const x = (level: number) => levelToX(level, scale, plot)
  const y = (amount: number) => amountToY(amount, axis.top, plot)
  const pinnedY = (amount: number) => clamp(y(amount), plot.top, plot.bottom)
  const point = (level: number, value: number) => `${x(level)},${y(value)}`
  const samples: Sample[] = levels.map((level, i) => ({ point: point(level, values[i]), regime: regimeOf(breakdowns[i]), jump: jumps[i] }))
  const pieces = splitAtJumps(samples)
  const segments = splitByRegime(samples)
  const legend = [...new Set(segments.map((segment) => segment.regime))].map((regime) => ({ regime, concept: regimeConcept.value[regime], label: regimeLabel.value[regime] }))
  const samplesWhere = (keep: (level: number) => boolean) => samples.filter((_, i) => keep(levels[i]))
  const atInitial = point(initial, maturityPayment(note.value, at(initial)))
  const ghost = ghostNote.value
  // The levels after pricing are not note terms, so the ghost reads the current ones, fitted to its own lookback count.
  const ghostInitialEnd = ghost?.underlier.determination.initial
  const ghostObservations = ghostInitialEnd?.kind === 'lookback' ? [initialLevel.value, ...fitLookbackObservations(lookbackLevels.value, initialObservationCountOf(ghostInitialEnd) - 1)] : []
  // A ghost of the other kind of underlier is not drawn: its horizontal axis measures something else.
  const ghostDrawable = ghost !== null && ghost.underlier.kind === underlierKind.value && productIssues(ghost).length === 0 && ghostObservations.every((level) => Number.isFinite(level) && level > 0)
  const ghostInitial = !ghostDrawable ? Number.NaN : ghost.underlier.kind === 'basket' ? basketStartingLevel : initialLevelFrom(ghost.underlier.determination.initial, ghostObservations)
  const ghostLevels = levelsFor(ghostDrawable ? jumpLevelOf(ghost, ghostInitial) : undefined)
  const ghostValues = ghostDrawable ? ghostLevels.map((level) => maturityPayment(ghost, { initial: ghostInitial, final: level })) : []
  const ghostJumps = jumpsIn(ghostLevels, ghostValues)
  const ghostPieces = ghostDrawable ? splitAtJumps(ghostLevels.map((level, i) => ({ point: point(level, ghostValues[i]), jump: ghostJumps[i] }))) : []
  const finalHandle = payment.value === null ? null : { x: x(clamp(finalLevel.value, 0, end)), y: pinnedY(payment.value) }
  const bubbleText = payment.value === null ? '' : `${formatAmount(finalLevel.value)} → ${formatAmount(payment.value)}`
  const labelWidth = (text: string) => text.length * 6.4 * labelScale.value
  const bubbleWidth = 16 + labelWidth(bubbleText)
  const capLabelY = y(capAmount) - 6 < plot.top + 10 ? y(capAmount) + 14 : y(capAmount) - 6 // above the cap line, or below it when the line is at the top of the plot
  // The cap handle sits where the line actually bends flat. When the upside rate is too low for that to be in view,
  // it falls back to a fixed spot on the cap's reference line instead of floating over the wrong-coloured segment.
  const upsideRate = selectedParticipation.upside ? participationPercent.upside / 100 : undefined
  const bindLevel = capSelected.value ? capBindLevel(initial, upsideOf(note.value)?.cap ?? 0, upsideRate) : undefined
  const capOnCurve = bindLevel !== undefined && bindLevel <= end
  const capHandleX = capSelected.value ? (capOnCurve ? x(bindLevel as number) : plot.left + (plot.right - plot.left) * 0.8) : null
  // The cap label normally sits at the right edge. It shifts left of the handle instead only when the handle would otherwise sit on top of it.
  const capTextWidth = `Cap ${formatAmount(capAmount)}`.length * 6.4 * labelScale.value
  const capLabelOverlapsHandle = capOnCurve && capHandleX !== null && capHandleX + handleRadius.value + 6 > plot.right - 20 - capTextWidth
  const capLabelRight = capLabelOverlapsHandle ? Math.min(plot.right - 4, (capHandleX as number) - handleRadius.value - 6) : plot.right - 4
  // The tooltip normally sits above its handle. It drops below when that would cover the cap label or another handle.
  const bubbleX = finalHandle && clamp(finalHandle.x - bubbleWidth / 2, plot.left + 2, plot.right - bubbleWidth - 2)
  const capLabelLeft = capLabelRight - 16 - capTextWidth
  // The buffer handle sits where losses start, which is always on the principal line. With absolute return the payment jumps
  // there, and the handle sits on the end the buffer level pays, at the top of the jump. Its label sits beside the guide at the top of the plot.
  const bufferAt = bufferLevel(initial, bufferPercent.value / 100)
  const bufferX = bufferSelected.value ? x(bufferAt) : null
  const bufferY = absoluteSelected.value ? pinnedY(maturityPayment(note.value, at(bufferAt))) : y(principalAmount)
  const bufferLabelLeft = bufferX !== null && bufferX < plot.left + 90
  // The barrier handle sits at the barrier on the principal line, where the payment is still principal. Its label sits beside the guide.
  const barrierX = barrierAt === undefined ? null : x(barrierAt)
  const barrierLabelLeft = barrierX !== null && barrierX < plot.left + 90
  const coversCapLabel = capSelected.value && finalHandle !== null && bubbleX !== null && bubbleX + bubbleWidth > capLabelLeft && finalHandle.y - 34 + 22 > capLabelY - 12 * labelScale.value && finalHandle.y - 34 < capLabelY + 4
  const ring = handleRadius.value + 5
  const slopeAt = slopeLevel(initial, capFraction.value)
  const otherHandles = [
    capHandleX === null ? null : { x: capHandleX, y: pinnedY(capAmount) },
    selectedParticipation.upside ? { x: x(slopeAt), y: pinnedY(maturityPayment(note.value, at(slopeAt))) } : null,
  ]
  const coversHandle = finalHandle !== null && bubbleX !== null && otherHandles.some((handle) => handle !== null && bubbleX < handle.x + ring && bubbleX + bubbleWidth > handle.x - ring && finalHandle.y - 34 < handle.y + ring && finalHandle.y - 12 > handle.y - ring)
  return {
    axis,
    pieces,
    segments,
    legend,
    ghostPieces: ghostPieces.join('|') !== pieces.join('|') ? ghostPieces : [],
    // Each jump has a mark at both ends, in the colour of the piece it ends: filled at the payment the jump level pays, open at
    // the payment just below it, which the level itself does not pay. A small jump stays visible this way.
    jumpMarks: jumps.flatMap((jump, i) => jump ? [{ x: x(levels[i]), closedY: y(values[i]), openY: y(values[i - 1]), closed: regimeConcept.value[samples[i].regime], open: regimeConcept.value[samples[i - 1].regime] }] : []),
    downsidePieces: splitAtJumps([...samplesWhere((level) => level < initial), { point: atInitial }]),
    upsidePoints: [atInitial, ...samplesWhere((level) => level > initial).map(({ point }) => point)].join(' '),
    principalY: y(principalAmount),
    // A protection floor is at or below principal, so its label goes under its line and the principal's over. A minimum
    // return is just above principal, so the two labels swap sides and do not overlap.
    labelsSwap: minimumSelected.value,
    // Compact labels (such as 1.5K) keep large principals inside the left margin.
    amountTicks: Array.from({ length: Math.round(axis.top / axis.step) + 1 }, (_, i) => axis.step * i).map((amount) => ({ y: y(amount), label: amount.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 }) })),
    floorY: hasFloor ? y(floorAmount) : null,
    floorAmount,
    capY: capSelected.value ? y(capAmount) : null,
    capLabelY,
    capLabelRight,
    capAmount,
    initialX: x(scale),
    // The lookback level is a separate reference line, left of the initial level, whenever the note looks back. Its label
    // sits under the axis beside the initial label, moved left when the two would overlap.
    lookbackX: lookingBack.value ? x(initial) : null,
    lookbackLabelX: Math.min(x(initial), x(scale) - (labelWidth(`Pricing ${formatAmount(scale)}`) + labelWidth(`Lookback ${formatAmount(initial)}`)) / 2 - 8),
    end,
    bufferX,
    bufferLabel: bufferX === null ? null : { x: bufferLabelLeft ? bufferX + 6 : bufferX - 6, anchor: bufferLabelLeft ? 'start' : 'end' },
    bufferHandle: bufferX === null ? null : { x: bufferX, y: bufferY },
    barrierX,
    barrierLevel: barrierAt,
    barrierLabel: barrierX === null ? null : { x: barrierLabelLeft ? barrierX + 6 : barrierX - 6, anchor: barrierLabelLeft ? 'start' : 'end' },
    barrierHandle: barrierX === null ? null : { x: barrierX, y: y(principalAmount) },
    capHandle: otherHandles[0],
    // The floor handle sits a quarter of the way across, or just past its label when the label is longer, as on narrow screens.
    floorHandle: hasFloor ? { x: Math.max(plot.left + (plot.right - plot.left) * 0.25, plot.left + 20 + labelWidth(`${minimumSelected.value ? 'Minimum' : 'Floor'} ${formatAmount(floorAmount)}`) + handleRadius.value + 8), y: y(floorAmount) } : null,
    slopeHandle: otherHandles[1],
    finalHandle,
    bubble: finalHandle && bubbleX !== null && { text: bubbleText, width: bubbleWidth, x: bubbleX, y: finalHandle.y < plot.top + 40 || coversCapLabel || coversHandle ? finalHandle.y + 16 : finalHandle.y - 34 },
  }
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="brand">SPI<span>Re</span></div>
      <div class="header-note">Structured Products Interactive Reference</div>
    </header>

    <main class="page">
      <div class="intro">
        <h1>Structured products, built from their parts.</h1>
        <p>See how each feature changes what the product pays, and why.</p>
      </div>

      <p class="summary-sentence" aria-live="polite"><template v-for="(segment, index) in summary" :key="index"><button v-if="segment.concept" type="button" :class="['concept', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)" :aria-pressed="highlighted(segment.concept)" @click="select(segment.concept)">{{ segment.text }}</button><span v-else>{{ segment.text }}</span></template></p>

      <div v-if="names.length" class="names"><span id="names-label" class="names-label">Often marketed as</span><div class="names-list" role="group" aria-labelledby="names-label"><button v-for="name in names" :key="name.name" type="button" class="name-chip" :aria-expanded="activeHint === nameHintKey(name)" :aria-controls="nameHintId(name)" @click="openName(name)">{{ name.name }}</button></div><template v-for="name in names" :key="name.name"><p v-if="activeHint === nameHintKey(name)" :id="nameHintId(name)" class="hint-text" role="tooltip">{{ name.reason }}</p></template></div>

      <div class="workspace">
        <section ref="outlinePanel" class="panel outline" aria-label="Product structure">
          <header class="panel-head"><h2>Structure</h2><p>What the product is made of</p></header>
          <ul class="tree">
            <li :class="['node', { sel: highlighted('wrapper') }]" :style="conceptStyle('wrapper')">
              <div class="nrow" @click="select('wrapper')" @focusin="focusRow('wrapper')">
                <span class="nlabel">Wrapper<HintToggle id="wrapper" about="wrapper" :text="hints.wrapper" :active="activeHint === 'wrapper'" @toggle="toggleHint('wrapper')" /></span>
                <span class="ctrl pick"><select aria-label="Wrapper" :value="note.wrapper" @change="setWrapper(($event.target as HTMLSelectElement).value)"><option v-for="option in wrapperOptions" :key="option.id" :value="option.id" :disabled="!option.available || !!wrapperBlockedReason(option.id)">{{ option.label }}{{ !option.available ? ' (unavailable)' : wrapperBlockedReason(option.id) ? ` (${wrapperBlockedReason(option.id)?.toLowerCase()})` : '' }}</option></select></span>
                <span class="ndesc">{{ partDescriptions.wrapper }}</span>
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
                    <span class="ctrl pick"><select aria-label="Redemption" :value="note.redemption"><option v-for="option in redemptionOptions" :key="option.id" :value="option.id" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                    <span class="ndesc">{{ partDescriptions.redemption }}</span>
                  </div>
                </li>
                <li :class="['node', { sel: highlighted('underlier') }]" :style="conceptStyle('underlier')">
                  <div class="nrow" @click="select('underlier')" @focusin="focusRow('underlier')">
                    <span class="nlabel">Underlier<HintToggle id="underlier" about="underlier" :text="hints.underlier" :active="activeHint === 'underlier'" @toggle="toggleHint('underlier')" /></span>
                    <span class="ctrl pick"><select aria-label="Underlier" :value="underlierKind" @change="setUnderlierKind(($event.target as HTMLSelectElement).value as Underlier['kind'])"><option v-for="option in underlierOptions" :key="option.id" :value="option.id" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                    <span class="ndesc">{{ partDescriptions.underlier }}</span>
                  </div>
                  <ul>
                    <li v-if="!isBasket" :class="['node', { sel: highlighted('asset') }]" :style="conceptStyle('asset')">
                      <div class="nrow" @click="select('asset')" @focusin="focusRow('asset')">
                        <span class="nlabel">Asset<HintToggle id="asset" about="asset" :text="hints.asset" :active="activeHint === 'asset'" @toggle="toggleHint('asset')" /></span>
                        <span class="ctrl pick"><select v-model="assetKind" aria-label="Asset type"><option v-for="option in assetOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                        <span class="ndesc">{{ partDescriptions.asset }}</span>
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
                          <span v-if="index === 0" class="ndesc">{{ partDescriptions.asset }}</span>
                          <span class="ctrl block"><label :for="`asset-name-${index}`">Name</label><input :id="`asset-name-${index}`" v-model="asset.name" type="text" placeholder="Synthetic Asset" /></span>
                          <span class="ctrl block"><label :for="`weight-${index}`">Weight</label><HintToggle v-if="index === 0" id="weight" about="weight" :text="hints.weight" :active="activeHint === 'weight'" @toggle="toggleHint('weight')" /><NumberInput :id="`weight-${index}`" v-model="asset.weightPercent" class="num rate" /><span class="unit">%</span></span>
                        </div>
                      </li>
                      <li class="addrow"><button type="button" class="addbtn" @click="addAsset">＋ Add asset</button><output class="unit weights-total" aria-live="polite">Weights: {{ weightTotal }}</output></li>
                      <li v-if="issuesFor('underlierName', 'basketComponents', 'weights').length" class="addrow"><ul class="errors" role="alert"><li v-for="message in issuesFor('underlierName', 'basketComponents', 'weights')" :key="message">{{ message }}</li></ul></li>
                    </template>
                    <li :class="['node', { sel: highlighted('determination') }]" :style="conceptStyle('determination')">
                      <div class="nrow" @click="select('determination')" @focusin="focusRow('determination')">
                        <span class="nlabel">Determination<HintToggle id="determination" about="determination" :text="hints.determination" :active="activeHint === 'determination'" @toggle="toggleHint('determination')" /></span>
                        <span class="ndesc">{{ partDescriptions.determination }}</span>
                      </div>
                      <ul>
                        <li :class="['node', { sel: highlighted('initial-level') }]" :style="conceptStyle('initial-level')">
                          <div class="nrow" @click="select('initial-level')" @focusin="focusRow('initial-level')">
                            <span class="nlabel">Initial level<HintToggle id="initial-level" about="initial level" :text="hints['initial-level']" :active="activeHint === 'initial-level'" @toggle="toggleHint('initial-level')" /></span>
                            <span class="ctrl pick"><select id="initial-determination" v-model="initialKind" aria-label="Initial level"><option v-for="option in initialDeterminationOptions" :key="option.id" :value="option.id" :title="option.description" :disabled="isBasket && option.id === 'lookback'">{{ option.label }}{{ isBasket && option.id === 'lookback' ? ' (single asset only)' : '' }}</option></select></span>
                            <span class="ndesc">{{ partDescriptions['initial-level'] }}</span>
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
                            <span class="ctrl pick"><select id="final-determination" v-model="finalKind" aria-label="Final level"><option v-for="option in finalDeterminationOptions" :key="option.id" :value="option.id" :title="option.description">{{ option.label }}</option></select></span>
                            <span class="ndesc">{{ partDescriptions['final-level'] }}</span>
                            <span v-if="averaging" class="ctrl block"><label for="observation-count">Observations</label><HintToggle id="observation-count" about="observations" :text="hints.observations" :active="activeHint === 'observations'" @toggle="toggleHint('observations')" /><NumberInput id="observation-count" v-model="observationCount" class="num count" /></span>
                            <span class="ctrl block wraps"><span class="flabel">{{ averaging ? 'Observed levels' : isBasket ? 'Levels on the final date' : 'Level on the final date' }}</span><span class="unit">{{ averaging || isBasket ? 'Hypothetical, set in the calculation' : 'Hypothetical, set on the chart' }}</span></span>
                          </div>
                          <ul v-if="issuesFor('observationCount').length" class="errors" role="alert"><li v-for="message in issuesFor('observationCount')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="isBasket" :class="['node', { sel: highlighted('basket-return') }]" :style="conceptStyle('basket-return')">
                          <div class="nrow" @click="select('basket-return')" @focusin="focusRow('basket-return')">
                            <span class="nlabel">Basket return<HintToggle id="basket-return" about="basket return" :text="hints['basket-return']" :active="activeHint === 'basket-return'" @toggle="toggleHint('basket-return')" /></span>
                            <span class="ctrl pick"><select aria-label="Basket return" value="weighted"><option v-for="option in basketReturnOptions" :key="option.id" :value="option.id" :title="option.description" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                            <span class="ndesc">{{ partDescriptions['basket-return'] }}</span>
                          </div>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li :class="['node', { sel: highlighted('payoff') }]" :style="conceptStyle('payoff')">
                  <div class="nrow" @click="select('payoff')" @focusin="focusRow('payoff')">
                    <span class="nlabel">Payoff<HintToggle id="payoff" about="payoff" :text="hints.payoff" :active="activeHint === 'payoff'" @toggle="toggleHint('payoff')" /></span>
                    <span class="ndesc">{{ partDescriptions.payoff }}</span>
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
                        <li v-if="absoluteSelected" :class="['node', { sel: highlighted('absolute-return') }]" :style="conceptStyle('absolute-return')">
                          <div class="nrow" @click="select('absolute-return')" @focusin="focusRow('absolute-return')">
                            <span class="nlabel">Absolute return<HintToggle id="absolute-return" about="absolute return rate" :text="hints['absolute-return']" :active="activeHint === 'absolute-return'" @toggle="toggleHint('absolute-return')" /></span>
                            <span class="ctrl"><NumberInput id="rate-absolute-return" v-model="absolutePercent" class="num rate" aria-label="Absolute return rate (%)" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove absolute return" @click.stop="removeFeature('absolute-return')">×</button></span>
                          </div>
                          <ul v-if="issuesFor('absoluteReturn').length" class="errors" role="alert"><li v-for="message in issuesFor('absoluteReturn')" :key="message">{{ message }}</li></ul>
                        </li>
                        <li v-if="barrierSelected" :class="['node', { sel: highlighted('barrier') }]" :style="conceptStyle('barrier')">
                          <div class="nrow" @click="select('barrier')" @focusin="focusRow('barrier')">
                            <span class="nlabel">Barrier<HintToggle id="barrier" about="barrier" :text="hints.barrier" :active="activeHint === 'barrier'" @toggle="toggleHint('barrier')" /></span>
                            <span class="ctrl"><NumberInput id="rate-barrier" v-model="barrierPercent" class="num rate" :aria-label="`Barrier: level (% of the ${lookingBack ? 'lookback' : 'initial'} level)`" /><span class="unit">%</span><button type="button" class="xbtn" aria-label="Remove barrier" @click.stop="removeFeature('barrier')">×</button></span>
                            <span class="ctrl block"><label for="barrier-observation">Observed</label><select id="barrier-observation" value="final"><option value="final">Final date</option><option value="daily" disabled>Daily (unavailable)</option></select></span>
                          </div>
                          <ul v-if="issuesFor('barrier').length" class="errors" role="alert"><li v-for="message in issuesFor('barrier')" :key="message">{{ message }}</li></ul>
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
          <header class="panel-head"><h2>Payoff at {{ wrapper === 'deposit' ? 'maturity' : 'redemption' }}</h2><p>What it pays for each hypothetical final level</p></header>
          <template v-if="chart">
            <svg ref="chartSvg" class="chart" viewBox="0 0 620 350" role="group" :aria-label="chartDescription" :style="{ '--label': `${11 * labelScale}px` }">
              <defs><clipPath id="plot-clip"><rect :x="plot.left" :y="plot.top" :width="plot.right - plot.left" :height="plot.bottom - plot.top"/></clipPath></defs>
              <line :x1="plot.left" :y1="plot.bottom" :x2="plot.right" :y2="plot.bottom" class="axis-line"/><line :x1="plot.left" :y1="plot.top" :x2="plot.left" :y2="plot.bottom" class="axis-line"/>
              <line :x1="plot.left" :y1="chart.principalY" :x2="plot.right" :y2="chart.principalY" class="ref-line principal"/>
              <line v-if="chart.floorY !== null" :x1="plot.left" :y1="chart.floorY" :x2="plot.right" :y2="chart.floorY" :class="['ref-line', { on: chartHighlight.floor }]" :style="conceptStyle(floorConcept)"/>
              <line v-if="chart.capY !== null" :x1="plot.left" :y1="chart.capY" :x2="plot.right" :y2="chart.capY" :class="['ref-line', { on: chartHighlight.cap }]" :style="conceptStyle('cap')"/>
              <line v-if="chart.bufferX !== null" :x1="chart.bufferX" :y1="plot.top" :x2="chart.bufferX" :y2="plot.bottom" :class="['ref-line', { on: chartHighlight.buffer }]" :style="conceptStyle('buffer')"/>
              <line v-if="chart.barrierX !== null" :x1="chart.barrierX" :y1="plot.top" :x2="chart.barrierX" :y2="plot.bottom" :class="['ref-line', { on: chartHighlight.barrier }]" :style="conceptStyle('barrier')"/>
              <line v-if="chartHighlight.initial":x1="chart.initialX" :y1="plot.top" :x2="chart.initialX" :y2="plot.bottom" class="highlight-line" :style="conceptStyle('initial-level')"/>
              <line :x1="chart.initialX" :y1="plot.top" :x2="chart.initialX" :y2="plot.bottom" :class="['ref-line initial', { on: chartHighlight.initial }]" :style="conceptStyle('initial-level')"/>
              <line v-if="chart.lookbackX !== null" :x1="chart.lookbackX" :y1="plot.top" :x2="chart.lookbackX" :y2="plot.bottom" :class="['ref-line', { on: chartHighlight.lookback }]" :style="conceptStyle('initial-level')"/>
              <g clip-path="url(#plot-clip)">
                <polyline v-for="(piece, index) in chart.ghostPieces" :key="`ghost-${index}`" :points="piece" class="ghost-line"/>
                <polyline v-for="(piece, index) in chart.pieces" :key="`casing-${index}`" :points="piece" class="payoff-casing"/>
                <template v-if="chartHighlight.line"><polyline v-for="(piece, index) in chart.pieces" :key="`line-${index}`" :points="piece" class="highlight-line" :style="conceptStyle('payoff')"/></template>
                <template v-if="chartHighlight.downside"><polyline v-for="(piece, index) in chart.downsidePieces" :key="`downside-${index}`" :points="piece" class="highlight-line" :style="conceptStyle('downside')"/></template>
                <polyline v-if="chartHighlight.upside" :points="chart.upsidePoints" class="highlight-line" :style="conceptStyle('upside')"/>
                <polyline v-for="(segment, index) in chart.segments" :key="index" :points="segment.points" class="payoff-line" :style="conceptStyle(regimeConcept[segment.regime])"/>
                <g v-for="(mark, index) in chart.jumpMarks" :key="`jump-${index}`" aria-hidden="true"><circle :cx="mark.x" :cy="mark.openY" r="5" class="jump-open" :style="conceptStyle(mark.open)"/><circle :cx="mark.x" :cy="mark.closedY" r="5" class="jump-closed" :style="conceptStyle(mark.closed)"/></g>
              </g>
              <line v-if="chart.finalHandle && chartHighlight.final" :x1="chart.finalHandle.x" :y1="chart.finalHandle.y" :x2="chart.finalHandle.x" :y2="plot.bottom" class="highlight-line" :style="conceptStyle('final-level')"/>
              <line v-if="chart.finalHandle" :x1="chart.finalHandle.x" :y1="chart.finalHandle.y" :x2="chart.finalHandle.x" :y2="plot.bottom" class="final-guide"/>
              <g v-for="tick in chart.amountTicks" :key="tick.y"><line :x1="plot.left - 4" :y1="tick.y" :x2="plot.left" :y2="tick.y" class="axis-line"/><text :x="plot.left - 7" :y="tick.y" text-anchor="end" dominant-baseline="middle" class="axis-label">{{ tick.label }}</text></g>
              <text :x="plot.left + 2" y="24" class="axis-label">Payment</text>
              <line :x1="plot.left + 4" :y1="chart.principalY + (chart.labelsSwap ? 10 : -10)" :x2="plot.left + 16" :y2="chart.principalY + (chart.labelsSwap ? 10 : -10)" class="ref-swatch principal"/><text :x="plot.left + 20" :y="chart.principalY + (chart.labelsSwap ? 14 : -6)" class="ref-label">Principal {{ formatAmount(principal) }}</text>
              <template v-if="chart.floorY !== null"><line :x1="plot.left + 4" :y1="chart.floorY + (chart.labelsSwap ? -10 : 10)" :x2="plot.left + 16" :y2="chart.floorY + (chart.labelsSwap ? -10 : 10)" :class="['ref-swatch', { on: chartHighlight.floor }]" :style="conceptStyle(floorConcept)"/><text :x="plot.left + 20" :y="chart.floorY + (chart.labelsSwap ? -6 : 14)" :class="['ref-label', { on: chartHighlight.floor }]">{{ minimumSelected ? 'Minimum' : 'Floor' }} {{ formatAmount(chart.floorAmount) }}</text></template>
              <template v-if="chart.capY !== null"><line :x1="chart.capLabelRight - 12" :y1="chart.capLabelY - 4" :x2="chart.capLabelRight" :y2="chart.capLabelY - 4" :class="['ref-swatch', { on: chartHighlight.cap }]" :style="conceptStyle('cap')"/><text :x="chart.capLabelRight - 16" :y="chart.capLabelY" text-anchor="end" :class="['ref-label', { on: chartHighlight.cap }]">Cap {{ formatAmount(chart.capAmount) }}</text></template>
              <text v-if="chart.bufferLabel" :x="chart.bufferLabel.x" :y="plot.top + 12" :text-anchor="chart.bufferLabel.anchor" :class="['ref-label', { on: chartHighlight.buffer }]">Buffer {{ bufferSummary }}</text>
              <text v-if="chart.barrierLabel" :x="chart.barrierLabel.x" :y="plot.top + 12" :text-anchor="chart.barrierLabel.anchor" :class="['ref-label', { on: chartHighlight.barrier }]">Barrier {{ formatAmount(chart.barrierLevel ?? 0) }}</text>
              <text v-if="chart.lookbackX !== null" :x="chart.lookbackLabelX" y="331" text-anchor="middle" class="axis-label">Lookback {{ formatAmount(determinedInitialLevel) }}</text>
              <text :x="plot.left - 3" y="331" class="axis-label">0</text><text :x="chart.initialX" y="331" text-anchor="middle" class="axis-label">{{ lookingBack ? 'Pricing' : 'Initial' }} {{ formatAmount(initialLevel) }}</text><text :x="plot.right" y="331" text-anchor="end" class="axis-label">{{ formatAmount(chart.end) }}</text>
              <g v-if="chart.bubble" class="bubble" :transform="`translate(${chart.bubble.x} ${chart.bubble.y})`"><rect :width="chart.bubble.width" height="22" rx="6"/><text :x="chart.bubble.width / 2" y="15" text-anchor="middle">{{ chart.bubble.text }}</text></g>
              <g v-if="chart.floorHandle" :class="['handle', { on: highlighted(floorConcept) }]" :style="conceptStyle(floorConcept)" :transform="`translate(${chart.floorHandle.x} ${chart.floorHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" :aria-label="minimumSelected ? 'Minimum return' : 'Principal protection'" :aria-valuemin="minimumSelected ? 1 : 0" aria-valuemax="100" :aria-valuenow="minimumSelected ? minimumPercent : protectionPercent" :aria-valuetext="minimumSelected ? `${minimumPercent}% minimum return` : `${protectionPercent}% protection`" @pointerdown="startDrag('floor', $event)" @pointermove="dragMove('floor', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('floor', $event)" @focus="focusHandle('floor')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.capHandle" :class="['handle', { on: highlighted('cap') }]" :style="conceptStyle('cap')" :transform="`translate(${chart.capHandle.x} ${chart.capHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Cap" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="capPercent" :aria-valuetext="`${capPercent}% maximum return`" @pointerdown="startDrag('cap', $event)" @pointermove="dragMove('cap', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('cap', $event)" @focus="focusHandle('cap')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.bufferHandle" :class="['handle', { on: highlighted('buffer') }]" :style="conceptStyle('buffer')" :transform="`translate(${chart.bufferHandle.x} ${chart.bufferHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Buffer" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="bufferPercent" :aria-valuetext="`${bufferPercent}% buffer`" @pointerdown="startDrag('buffer', $event)" @pointermove="dragMove('buffer', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('buffer', $event)" @focus="focusHandle('buffer')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.barrierHandle" :class="['handle', { on: highlighted('barrier') }]" :style="conceptStyle('barrier')" :transform="`translate(${chart.barrierHandle.x} ${chart.barrierHandle.y})`" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="Barrier" aria-valuemin="1" aria-valuemax="99" :aria-valuenow="barrierPercent" :aria-valuetext="`Barrier at ${barrierPercent}% of the ${lookingBack ? 'lookback' : 'initial'} level`" @pointerdown="startDrag('barrier', $event)" @pointermove="dragMove('barrier', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('barrier', $event)" @focus="focusHandle('barrier')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.slopeHandle":class="['handle', { on: highlighted('upside') }]" :style="conceptStyle('upside')" :transform="`translate(${chart.slopeHandle.x} ${chart.slopeHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Upside participation rate" aria-valuemin="5" aria-valuemax="200" :aria-valuenow="participationPercent.upside" :aria-valuetext="`${participationPercent.upside}% upside participation`" @pointerdown="startDrag('slope', $event)" @pointermove="dragMove('slope', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('slope', $event)" @focus="focusHandle('slope')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.finalHandle" class="handle final-dot" :transform="`translate(${chart.finalHandle.x} ${chart.finalHandle.y})`" tabindex="0" role="slider" :aria-label="`Hypothetical final level of ${underlierLabel}`" aria-valuemin="0" :aria-valuemax="Math.floor(chart.end)" :aria-valuenow="finalLevel" :aria-valuetext="`Final level ${formatAmount(finalLevel)}, payment ${formatAmount(payment ?? 0)}`" @pointerdown="startDrag('final', $event)" @pointermove="dragMove('final', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('final', $event)">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
            </svg>
            <div class="chart-axis-title">{{ isBasket ? `Final level of the basket${averaging ? `, from each asset's average of ${observationCount} observed levels` : ''}` : `Final level of ${underlierLabel}${averaging ? `, the average of ${observations.length} observed levels` : ''}` }} →</div>
            <ul class="chart-legend" aria-label="What sets the payment"><li v-for="item in chart.legend" :key="item.regime" :style="conceptStyle(item.concept)"><span class="legend-swatch" aria-hidden="true"></span>{{ item.label }}</li></ul>
            <p class="chart-hint">Drag a handle on the chart, or focus one and use the arrow keys. Shift takes bigger steps. A grey line shows the payoff before your last change.</p>
          </template>
          <p v-else class="help">Enter valid terms to see the payoff.</p>


          <TabGroup v-model="activeTab" :tabs="tabs" label="The payment and its scenarios">
            <template #calculation>
              <div v-if="lookingBack" class="hint-field"><div class="field-heading"><span id="lookback-levels-label" class="observed-heading">Lookback level: hypothetical levels of {{ underlierLabel }} on the lookback dates</span><button type="button" class="hint-button" aria-label="About the lookback level" aria-controls="lookback-levels-hint" :aria-expanded="activeHint === 'lookback-levels'" @click="toggleHint('lookback-levels')">ⓘ</button><p v-if="activeHint === 'lookback-levels'" id="lookback-levels-hint" class="hint-text" role="tooltip">Hypothetical levels on the pricing date and each lookback date after it, earliest first. The lowest of them is the lookback level, which the return is measured from. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="observed-levels" role="group" aria-labelledby="lookback-levels-label" :style="conceptStyle('initial-level')"><span class="observed-op" aria-hidden="true">min(</span><span class="observed-cell"><label for="lookback-pricing" class="observed-name">Pricing<template v-if="isLowest(initialLevel)"> · lowest</template></label><NumberInput id="lookback-pricing" v-model="initialLevel" :class="['observed-input', { lowest: isLowest(initialLevel) }]" /></span><template v-for="(level, index) in afterPricing" :key="index"><span class="observed-op" aria-hidden="true">,</span><span class="observed-cell"><label :for="`lookback-${index}`" class="observed-name">Obs {{ index + 1 }}<template v-if="isLowest(level)"> · lowest</template></label><NumberInput :id="`lookback-${index}`" :model-value="level" :class="['observed-input', { lowest: isLowest(level) }]" @update:model-value="setAfterPricing(index, $event)" /></span></template><span class="observed-op" aria-hidden="true">) =</span><span class="observed-cell"><span class="observed-name">Lookback level</span><output class="observed-result" aria-live="polite">{{ Number.isFinite(determinedInitialLevel) ? formatAmount(determinedInitialLevel) : '—' }}</output></span></div></div>
              <p v-if="lookbackError" class="errors" role="alert">{{ lookbackError }}</p>
              <div v-if="isBasket" class="hint-field"><div class="field-heading"><span id="basket-levels-label" class="observed-heading">{{ averaging ? 'Final levels: hypothetical levels of each asset on the averaging dates' : 'Final levels: hypothetical level of each asset on the final date' }}</span><button type="button" class="hint-button" aria-label="About the basket's final levels" aria-controls="basket-levels-hint" :aria-expanded="activeHint === 'basket-levels'" @click="toggleHint('basket-levels')">ⓘ</button><p v-if="activeHint === 'basket-levels'" id="basket-levels-hint" class="hint-text" role="tooltip">Hypothetical levels for this scenario, earliest first. Each asset's return is measured from its own initial level{{ averaging ? ' to the average of its levels' : '' }}. Dragging the final level on the chart moves every asset's return by the same amount. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="table-wrap basket-levels" :style="conceptStyle('final-level')"><table aria-labelledby="basket-levels-label"><thead><tr><th scope="col">Asset</th><th v-for="(_, index) in basketObservations[0]" :key="index" scope="col">{{ averaging ? `Obs ${index + 1}${index === basketObservations[0].length - 1 ? ' · final date' : ''}` : 'Final date' }}</th><th v-if="averaging" scope="col">Final level</th><th scope="col">Return</th></tr></thead><tbody><tr v-for="(levels, asset) in basketObservations" :key="asset"><th scope="row">{{ basketAssets[asset].name.trim() || `Asset ${asset + 1}` }}</th><td v-for="(level, index) in levels" :key="index"><NumberInput :model-value="level" class="observed-input" :aria-label="`${basketAssets[asset].name.trim() || `Asset ${asset + 1}`}, ${averaging ? `observation ${index + 1}` : 'final date'}`" @update:model-value="setBasketObservation(asset, index, $event)" /></td><td v-if="averaging"><output class="observed-result" aria-live="polite">{{ basketMeasure ? formatAmount(basketMeasure.components[asset].finalLevel) : '—' }}</output></td><td class="asset-return">{{ basketMeasure ? signedPercent(basketMeasure.components[asset].componentReturn) : '—' }}</td></tr></tbody></table></div></div>
              <div v-else-if="averaging" class="hint-field"><div class="field-heading"><span id="observed-levels-label" class="observed-heading">Final level: hypothetical levels of {{ underlierLabel }} on the averaging dates</span><button type="button" class="hint-button" aria-label="About the averaged final level" aria-controls="observed-levels-hint" :aria-expanded="activeHint === 'observed-levels'" @click="toggleHint('observed-levels')">ⓘ</button><p v-if="activeHint === 'observed-levels'" id="observed-levels-hint" class="hint-text" role="tooltip">Hypothetical levels on each averaging date, earliest first. Their average is the final level. Changing them does not change the {{ wrapper }}'s terms.</p></div><div class="observed-levels" role="group" aria-labelledby="observed-levels-label" :style="conceptStyle('final-level')"><template v-for="(level, index) in observations" :key="index"><span v-if="index > 0" class="observed-op" aria-hidden="true">+</span><span class="observed-cell"><label :for="`observation-${index}`" class="observed-name">Obs {{ index + 1 }}<template v-if="index === observations.length - 1"> · final date</template></label><NumberInput :id="`observation-${index}`" :model-value="level" class="observed-input" @update:model-value="setObservation(index, $event)" /></span></template><span class="observed-op" aria-hidden="true">÷ {{ observations.length }} =</span><span class="observed-cell"><span class="observed-name">Final level</span><output class="observed-result" aria-live="polite">{{ Number.isFinite(finalLevel) ? formatAmount(finalLevel) : '—' }}</output></span></div></div>
              <div v-else class="hint-field"><div class="field-heading"><label for="final-level">Final level: hypothetical level of {{ underlierLabel }} on the final date</label><button type="button" class="hint-button" aria-label="About the final level" aria-controls="final-level-hint" :aria-expanded="activeHint === 'final-level'" @click="toggleHint('final-level')">ⓘ</button><p v-if="activeHint === 'final-level'" id="final-level-hint" class="hint-text" role="tooltip">A hypothetical level for this scenario. Changing it does not change the {{ wrapper }}'s terms.</p></div><NumberInput id="final-level" :model-value="observations[0]" class="final-input" @update:model-value="setObservation(0, $event)" /></div>
              <p v-if="finalError" class="errors" role="alert">{{ finalError }}</p>
              <div class="formula" role="group" aria-label="Payment rule"><div v-for="(line, index) in formula" :key="index" :class="['fline', { limit: !line.lead }]"><span class="flead">{{ line.lead }}</span><span class="feq">{{ line.lead ? '=' : '' }}</span><span class="fexpr"><template v-for="(segment, part) in line.segments" :key="part"><span v-if="segment.concept" :class="['fterm', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)">{{ segment.text }}</span><template v-else>{{ segment.text }}</template></template></span></div><p class="fwords"><b>In words:</b> {{ formulaWords }}</p></div>
              <ol class="calc-steps" aria-live="polite"><li v-for="step in calculation" :key="step.n" :class="{ hl: step.concept && highlighted(step.concept), muted: step.muted, result: step.result }"><span class="calc-n">{{ step.n }}</span><b>{{ step.title }}</b><span class="calc-value">{{ step.value }}</span><span class="calc-how">{{ step.how }}</span></li></ol>
              <p v-if="outcomeSentence" class="outcome" aria-live="polite">{{ outcomeSentence }}</p>
            </template>
            <template #scenarios>
              <template v-if="chart">
                <h3>Example scenarios</h3>
                <p class="table-scroll-hint">Scroll horizontally to see every scenario column.</p>
                <div class="table-wrap"><table><thead><tr><th>{{ isBasket ? 'Basket level' : 'Final level' }}</th><th>Underlier change</th><th v-if="absoluteSelected">Absolute return</th><th v-for="direction in selectedDirections" :key="direction">{{ participationLabels[direction] }}</th><th v-if="capSelected">Payment before cap</th><th v-if="protectionSelected || minimumSelected">Payment before {{ minimumSelected ? 'minimum' : 'protection' }}</th><th>Final payment</th></tr></thead><tbody><tr v-for="row in scenarios" :key="row.returnValue"><td>{{ formatAmount(row.final) }}<span v-if="row.atBarrier" class="floor-note">at barrier</span><span v-if="row.atBuffer" class="floor-note">at buffer</span></td><td>{{ formatPercent(row.returnValue) }}</td><td v-if="absoluteSelected">{{ row.absolute ?? '—' }}</td><td v-for="direction in selectedDirections" :key="direction">{{ row.calculations[direction] ?? '—' }}</td><td v-if="capSelected">{{ formatAmount(row.uncappedPayment) }}</td><td v-if="protectionSelected || minimumSelected">{{ formatAmount(row.unflooredPayment) }}</td><td>{{ formatAmount(row.payment) }}<span v-if="capSelected && row.capApplied" class="floor-note">cap applied</span><span v-if="(protectionSelected || minimumSelected) && row.floorApplied" class="floor-note">{{ minimumSelected ? 'minimum applied' : 'floor applied' }}</span></td></tr></tbody></table></div>
                <p class="scenario-formula"><template v-if="lookingBack">Each change is measured from the lookback level, {{ formatAmount(determinedInitialLevel) }}. </template><template v-if="averaging">Each final level is the average of the observed levels. </template><strong>Selected participation:</strong> {{ participationSummary }}. A move in a direction without participation leaves principal unchanged before any floor applies.<template v-if="bufferSelected"> The buffer absorbs the first {{ bufferSummary }} of a fall.</template><template v-if="absoluteSelected"> A fall within it pays {{ absoluteSummary }} of the fall as a gain.</template> The payment cannot fall below {{ floorSummary }}.<template v-if="capSelected"> It cannot exceed {{ capSummary }}.</template></p>
              </template>
              <p v-else class="help">Enter valid terms to see the scenarios.</p>
            </template>
          </TabGroup>
          <p v-if="chart" class="explanation">All amounts are illustrative.</p>
        </section>

        <aside ref="jsonPanel" class="panel structure-json" aria-labelledby="structure-json-heading">
          <header class="panel-head"><h2 id="structure-json-heading">Structure JSON<span v-if="errors.length" class="badge invalid">Invalid terms</span></h2><p>{{ errors.length ? 'A live draft containing invalid terms. Correct the highlighted terms before treating it as a valid structure.' : 'The same terms as data' }}</p></header>
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

      <footer class="site-footer">
        Built by <a href="https://www.linkedin.com/in/sureshthotakura/" target="_blank" rel="noopener noreferrer">Suresh Thotakura</a>
        <span aria-hidden="true">·</span>
        Build: <time :datetime="buildTimestampIso">{{ buildTimestamp }} UTC</time>
      </footer>
    </main>
  </div>
</template>
