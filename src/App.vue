<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { amountToY, capBindLevel, capFromY, clamp, clampCap, clampFinalLevel, clampProtection, clampUpsideRate, finalLevelFromX, keyDelta, levelAxisFactor, levelToX, protectionFromY, regimeOf, slopeLevel, splitByRegime, upsideRateFromY, type Plot, type Regime } from './chart/geometry'
import HintToggle from './components/HintToggle.vue'
import NumberInput from './components/NumberInput.vue'
import TabGroup from './components/TabGroup.vue'
import type { ConceptId } from './content/concepts'
import { marketingNames, type MarketingName } from './content/names'
import { paymentFormula } from './content/formula'
import { explainOutcome } from './content/outcome'
import { scenarioRows } from './content/scenarios'
import { isHighlighted } from './content/selection'
import { structureLines } from './content/structure-json'
import { summarize } from './content/summary'
import { maturityPayment, noteIssues, paymentBreakdown, type NoteIssueField, type ParticipationDirection, type ProtectedParticipationNote, type AssetKind } from './domain/note'
import { firstFeatureValues, startingFinalLevel, startingNote } from './domain/starting-note'

const activeHint = ref<string | null>(null)
const toggleHint = (hint: string) => { activeHint.value = activeHint.value === hint ? null : hint }
const hints = {
  wrapper: 'The legal form sets what the holder owns and who owes the payments. A note is a debt of its issuer, so every payment depends on the issuer’s ability to pay.',
  redemption: 'Sets when the note ends and principal is paid back: at scheduled maturity, or earlier if its terms allow a call or a put. A bullet note pays once, at maturity.',
  underlier: 'What the payoff reads: the asset it tracks, where that asset starts, and how its change is measured. A single underlier tracks one asset. A basket tracks several and combines their changes into one return.',
  asset: 'The equity or equity index the note tracks. Holding the note does not mean owning the asset.',
  determination: 'Sets which observed levels measure the underlier’s change. Point-to-point uses the initial level and one final level: final ÷ initial − 1. Moves in between do not count.',
  payoff: 'The rules that turn the underlier’s change into the maturity payment. With no features the note repays principal. Each feature adds a rule, such as a share of the gain or a minimum payment.',
  principal: 'The amount used as the base for the maturity payment.',
  'initial-level': 'The reference level used to calculate the underlier’s return. It is a term of this note: two notes on the same asset can start from different levels.',
  downside: 'The share of a negative underlier return deducted from principal before the protection floor applies.',
  upside: 'The share of a positive underlier return added to principal.',
  cap: 'The most the note can pay above principal, as a percentage of principal, however far the underlier rises. It has an effect only when upside participation is selected.',
  protection: 'The minimum contractual maturity payment as a percentage of principal. Protection applies at maturity and depends on the issuer’s ability to pay.',
}
const wrapperOptions = [
  { id: 'note', label: 'Note', description: 'A debt security with payments defined by its terms and subject to the issuer’s ability to pay.', available: true },
  { id: 'certificate-or-warrant', label: 'Certificate or warrant', description: 'Distinct security forms whose rights and legal treatment depend on their market and terms.', available: false },
  { id: 'etf', label: 'ETF', description: 'A fund whose shares trade on an exchange and represent an interest in a portfolio.', available: false },
] as const
const redemptionOptions = [
  { id: 'autocallable', label: 'Autocallable', description: 'Defined conditions may trigger redemption before scheduled maturity.', available: false },
  { id: 'bullet', label: 'Bullet', description: 'One payment at scheduled maturity; no early call.', available: true },
  { id: 'issuer-callable', label: 'Issuer callable', description: 'The issuer may redeem the note early under defined terms.', available: false },
  { id: 'puttable', label: 'Puttable', description: 'The holder may require redemption under defined terms.', available: false },
] as const
const determinationOptions = [
  { id: 'averaging', label: 'Averaging', description: 'Uses the average of levels observed on several stated dates.', available: false },
  { id: 'lookback', label: 'Lookback', description: 'Uses the highest or lowest level observed on stated dates.', available: false },
  { id: 'point-to-point', label: 'Point-to-point', description: 'Compares one initial level with one final level.', available: true },
] as const
// A one-line meaning under each part's name, so the outline reads without opening every hint.
const partDescriptions = {
  wrapper: 'The form the product takes',
  redemption: 'When principal is repaid',
  underlier: 'What the return is linked to',
  asset: 'What is tracked, and where it starts',
  determination: 'How the underlier’s change is measured',
  payoff: 'What the note pays at maturity',
}
const underlierOptions = [
  { id: 'basket', label: 'Basket', description: 'Several assets whose changes are combined into one return.', available: false },
  { id: 'single', label: 'Single', description: 'One asset.', available: true },
] as const
const assetOptions: ReadonlyArray<{ id: AssetKind; label: string }> = [
  { id: 'equity-index', label: 'Equity index' },
  { id: 'equity', label: 'Equity' },
]
const [startingComponent] = startingNote.underlier.components
const assetKind = ref<AssetKind>(startingComponent.asset.kind)
const assetName = ref(startingComponent.asset.name)
const principal = ref(startingNote.principalAmount)
const initialLevel = ref(startingComponent.initialLevel)
const finalLevel = ref(startingFinalLevel)

// The part of the note the reader is looking at. It highlights that part's outline row, sentence phrase, JSON lines and chart elements.
const selected = ref<ConceptId>('payoff')
const select = (concept: ConceptId) => { selected.value = concept }
const conceptColors: Record<ConceptId, string> = { wrapper: '#4f6fae', redemption: '#2e8b83', underlier: '#7a5cb5', asset: '#9c6ade', determination: '#b7791f', payoff: '#42536d', protection: '#2369bd', upside: '#2b8a3e', downside: '#d9480f', cap: '#a23b8c' }
const conceptStyle = (concept: ConceptId) => ({ '--c': conceptColors[concept] })
const highlighted = (concept: ConceptId) => isHighlighted(selected.value, concept)

// Payoff features are added one at a time to a payoff that starts with none. A removed feature keeps its last value.
type FeatureId = 'barrier' | 'buffer' | 'cap' | 'coupon' | 'digital' | 'downside' | 'protection' | 'upside'
const payoffFeatures: ReadonlyArray<{ id: FeatureId; label: string; description: string; available: boolean }> = [
  { id: 'barrier', label: 'Barrier', description: 'A level that changes the payoff if it is reached.', available: false },
  { id: 'buffer', label: 'Buffer', description: 'Protects against an initial portion of underlier losses.', available: false },
  { id: 'cap', label: 'Cap', description: 'Limits the maximum contractual payment.', available: true },
  { id: 'coupon', label: 'Coupon', description: 'An additional contractual payment on stated dates.', available: false },
  { id: 'digital', label: 'Digital', description: 'Pays a predefined amount if a stated condition is met.', available: false },
  { id: 'downside', label: 'Downside participation', description: 'Negative underlier return is multiplied by the downside participation rate until the protection floor applies.', available: true },
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
const selectedDirections = computed(() => (['downside', 'upside'] as ParticipationDirection[]).filter((direction) => selectedParticipation[direction]))
const isAdded = (id: FeatureId) => id === 'protection' ? protectionSelected.value : id === 'cap' ? capSelected.value : id === 'downside' || id === 'upside' ? selectedParticipation[id] : false
const hasFeatures = computed(() => protectionSelected.value || capSelected.value || selectedDirections.value.length > 0)

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
  if (!feature?.available || isAdded(id)) return
  beginGesture()
  if (id === 'protection') protectionSelected.value = true
  else if (id === 'cap') capSelected.value = true
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = true
  paletteOpen.value = false
  await nextTick()
  document.getElementById(`rate-${id}`)?.focus()
}
const removeFeature = async (id: FeatureId) => {
  beginGesture()
  if (id === 'protection') protectionSelected.value = false
  else if (id === 'cap') capSelected.value = false
  else if (id === 'downside' || id === 'upside') selectedParticipation[id] = false
  if (selected.value === id) selected.value = 'payoff'
  await nextTick()
  addButton.value?.focus()
}
const addFirstMatch = () => {
  const first = matchingFeatures.value.find(({ id, available }) => available && !isAdded(id))
  if (first) addFeature(first.id)
}
const closeOnOutsidePointer = (event: PointerEvent) => {
  if (paletteOpen.value && !paletteRoot.value?.contains(event.target as Node)) paletteOpen.value = false
  if (activeHint.value && !(event.target as Element).closest('.hint-button, .hint-text, .name-chip')) activeHint.value = null
}
onMounted(() => document.addEventListener('pointerdown', closeOnOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsidePointer))

const note = computed<ProtectedParticipationNote>(() => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: assetKind.value, name: assetName.value }, initialLevel: initialLevel.value }],
    determination: { kind: 'point-to-point' },
  },
  payoff: {
    kind: 'participation',
    participations: selectedDirections.value.map((direction) => ({
      direction,
      rate: participationPercent[direction] / 100,
    })),
    cap: capSelected.value ? capPercent.value / 100 : undefined,
    principalProtection: protectionSelected.value ? protectionPercent.value / 100 : undefined,
  },
  principalAmount: principal.value,
}))
const jsonLines = computed(() => structureLines(note.value))
const formula = computed(() => paymentFormula(note.value))
// The asset the final level belongs to. A basket will need one final level per asset, each named this way.
const underlierLabel = computed(() => assetName.value.trim() || 'the underlier')
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
const issues = computed(() => noteIssues(note.value))
const errors = computed(() => issues.value.map(({ message }) => message))
const issuesFor = (...fields: NoteIssueField[]) => issues.value.filter(({ field }) => fields.includes(field)).map(({ message }) => message)
const summary = computed(() => summarize(note.value))
const names = computed(() => marketingNames(note.value))
const nameHintKey = (name: MarketingName) => `name:${name.name}`
const nameHintId = (name: MarketingName) => `${name.name.toLowerCase().replace(/[^a-z]+/g, '-')}-hint`
// A name that rests on one part of the note selects that part. One that rests on several selects the whole payoff.
const openName = (name: MarketingName) => {
  select(name.concepts.length === 1 ? name.concepts[0] : 'payoff')
  toggleHint(nameHintKey(name))
}
const finalError = computed(() => !Number.isFinite(finalLevel.value) || finalLevel.value < 0 ? 'Final level must be zero or greater.' : '')
const valid = computed(() => errors.value.length === 0 && !finalError.value)
const breakdown = computed(() => valid.value ? paymentBreakdown(note.value, finalLevel.value) : null)
const payment = computed(() => breakdown.value?.payment ?? null)
const outcomeSentence = computed(() => breakdown.value ? explainOutcome(note.value, breakdown.value) : '')
const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
const participationSummary = computed(() => selectedDirections.value
  .map((direction) => `${formatPercent(participationPercent[direction] / 100)} ${participationLabels[direction].toLowerCase()}`)
  .join(' and ') || 'none')
const floorSummary = computed(() => protectionSelected.value ? `${formatPercent(protectionPercent.value / 100)} of principal` : 'zero')
const capSummary = computed(() => `${formatAmount(principal.value * (1 + capPercent.value / 100))} (a ${formatPercent(capPercent.value / 100)} return on principal)`)
const chartDescription = computed(() => {
  if (!hasFeatures.value) return 'Contractual maturity payment stays at principal for every final level.'
  const fall = selectedParticipation.downside
    ? `falls with negative underlier returns${protectionSelected.value ? ' until the protection floor applies' : ', but not below zero'}`
    : 'stays at principal for negative underlier returns'
  const rise = selectedParticipation.upside ? `rises with positive underlier returns${capSelected.value ? ' until the cap applies' : ''}` : 'stays at principal for flat or positive underlier returns'
  return `Contractual maturity payment ${fall}. It ${rise}.`
})
const buildTimestampIso = __BUILD_TIMESTAMP__
const buildTimestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
}).format(new Date(buildTimestampIso))

const scenarios = computed(() => errors.value.length ? [] : scenarioRows(note.value).map(({ returnValue, finalLevel, breakdown }) => ({
  final: finalLevel,
  returnValue,
  calculations: Object.fromEntries(selectedDirections.value.map((direction) => [
    direction,
    returnValue !== 0 && direction === breakdown.direction && breakdown.participationRate !== undefined
      ? `${formatPercent(breakdown.participationRate)} × ${formatPercent(returnValue)} = ${formatPercent(breakdown.participatedReturn)}`
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
const signedPercent = (fraction: number) => `${fraction < 0 ? '−' : '+'}${formatPercent(Math.abs(fraction))}`
const calculation = computed(() => {
  const b = breakdown.value
  if (!b) return []
  const direction = b.direction === 'upside' ? 'upside' : 'downside'
  const withProtection = protectionSelected.value
  const withCap = capSelected.value
  // Numbers follow the order of the steps, so the closing step can refer to the ones it combines.
  const steps: Array<{ title: string; how: string; value: string; muted?: boolean; result?: boolean; concept?: ConceptId }> = [
    { title: `${assetName.value.trim() || 'Underlier'} return`, how: `${formatAmount(finalLevel.value)} ÷ ${formatAmount(initialLevel.value)} − 1`, value: signedPercent(b.underlierReturn), concept: 'determination' },
    b.participationRate === undefined
      ? { title: 'Participation', how: `No ${direction} participation is selected, so principal is unchanged`, value: 'Not added', muted: true, concept: b.direction }
      : { title: 'Participation', how: `${formatPercent(b.participationRate)} ${direction} × ${signedPercent(b.underlierReturn)}`, value: signedPercent(b.participatedReturn), concept: b.direction },
    { title: withCap ? 'Payment before cap' : 'Payment before protection', how: `${formatAmount(principal.value)} × (1 ${b.participatedReturn < 0 ? '−' : '+'} ${formatPercent(Math.abs(b.participatedReturn))})`, value: formatAmount(b.uncappedPayment) },
  ]
  if (withCap) steps.push({ title: 'Cap', how: `${formatAmount(principal.value)} × (1 + ${formatPercent(capPercent.value / 100)}) · ${b.capApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.capAmount ?? 0), concept: 'cap' })
  steps.push(withProtection
    ? { title: 'Protection floor', how: `${formatPercent(protectionPercent.value / 100)} × ${formatAmount(principal.value)} · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), concept: 'protection' }
    : { title: 'Protection floor', how: selectedParticipation.downside ? 'No protection selected, so some or all of the principal can be lost' : 'No protection selected. Without downside participation, principal is not reduced', value: 'Not added', muted: true, concept: 'protection' })
  const [before, cap, floor] = [3, 4, withCap ? 5 : 4]
  const combine = withCap
    ? `The lower of steps ${before} and ${cap}, then ${withProtection ? `the higher of that and step ${floor}` : 'not below zero'}`
    : withProtection ? `The higher of steps ${before} and ${floor}` : `The higher of step ${before} and zero`
  steps.push({ title: 'Payment at maturity', how: combine, value: formatAmount(b.payment), result: true })
  return steps.map((step, index) => ({ ...step, n: index + 1 }))
})

// The chart. Its vertical axis is fixed (see chart/geometry.ts), and handles on it edit the same values the outline fields edit.
const viewBoxWidth = 620
const plot: Plot = { left: 50, right: 590, top: 35, bottom: 230 }
const chartSvg = ref<SVGSVGElement | null>(null)
const chartScale = ref(1)
const chartObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => { chartScale.value = Math.max((entry?.contentRect.width || viewBoxWidth) / viewBoxWidth, 0.3) })
watch(chartSvg, (svg, previous) => {
  if (previous) chartObserver?.unobserve(previous)
  if (svg) chartObserver?.observe(svg)
})
onBeforeUnmount(() => chartObserver?.disconnect())
const hitRadius = computed(() => 22 / chartScale.value)
const handleRadius = computed(() => 8 * Math.max(1, 0.7 / chartScale.value))
// Chart text is scaled up as the chart shrinks, so it stays legible on narrow screens.
const labelScale = computed(() => clamp(1 / chartScale.value, 1, 1.6))

// The payoff line from before the current gesture stays as a faint ghost, so the reader can see what a change did.
const ghostNote = ref<ProtectedParticipationNote | null>(null)
function beginGesture() { ghostNote.value = JSON.parse(JSON.stringify(note.value)) as ProtectedParticipationNote }
const focusRow = (concept: ConceptId) => { select(concept); beginGesture() }

type HandleId = 'floor' | 'slope' | 'cap' | 'final'
const handleConcept: Record<HandleId, ConceptId | null> = { floor: 'protection', slope: 'upside', cap: 'cap', final: null }
const dragging = ref<HandleId | null>(null)
const svgPoint = (event: PointerEvent) => {
  const matrix = chartSvg.value?.getScreenCTM()
  const point = new DOMPoint(event.clientX, event.clientY)
  return matrix ? point.matrixTransform(matrix.inverse()) : point
}
const focusHandle = (id: HandleId) => {
  const concept = handleConcept[id]
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
  focusHandle(id)
}
const dragMove = (id: HandleId, event: PointerEvent) => {
  if (dragging.value !== id) return
  const point = svgPoint(event)
  if (id === 'floor') protectionPercent.value = protectionFromY(point.y, principal.value, plot)
  else if (id === 'slope') participationPercent.upside = upsideRateFromY(point.y, principal.value, plot, capFraction.value)
  else if (id === 'cap') capPercent.value = capFromY(point.y, principal.value, plot)
  else finalLevel.value = finalLevelFromX(point.x, initialLevel.value, plot)
}
const endDrag = () => { dragging.value = null }
const keyHandle = (id: HandleId, event: KeyboardEvent) => {
  const delta = keyDelta(event.key, event.shiftKey, id === 'slope' ? 5 : 1)
  if (delta === null) return
  event.preventDefault()
  if (id === 'floor') protectionPercent.value = clampProtection(protectionPercent.value + delta)
  else if (id === 'slope') participationPercent.upside = clampUpsideRate(participationPercent.upside + delta)
  else if (id === 'cap') capPercent.value = clampCap(capPercent.value + delta)
  else finalLevel.value = clampFinalLevel(finalLevel.value + delta, initialLevel.value)
}

// The cap as a fraction of principal, or undefined when the note has none. The slope handle's position depends on it.
const capFraction = computed(() => capSelected.value ? capPercent.value / 100 : undefined)
const chartHighlight = computed(() => ({
  line: selected.value === 'payoff',
  floor: protectionSelected.value && highlighted('protection'),
  cap: capSelected.value && highlighted('cap'),
  downside: selectedParticipation.downside && selected.value === 'downside',
  upside: selectedParticipation.upside && selected.value === 'upside',
  initial: highlighted('asset') || highlighted('determination'),
}))
// Each regime is drawn in its concept's colour, in the line, the legend and the guides.
const regimeConcept: Record<Regime, ConceptId> = { principal: 'payoff', downside: 'downside', upside: 'upside', floor: 'protection', cap: 'cap' }
const regimeLabel: Record<Regime, string> = { principal: 'Principal repaid', downside: 'Downside participation', upside: 'Upside participation', floor: 'Protection floor', cap: 'Cap' }
const chart = computed(() => {
  if (errors.value.length) return null
  const principalAmount = principal.value
  const initial = initialLevel.value
  const end = initial * levelAxisFactor
  const levels = Array.from({ length: 257 }, (_, i) => end * i / 256)
  const breakdowns = levels.map((level) => paymentBreakdown(note.value, level))
  const values = breakdowns.map((b) => b.payment)
  const x = (level: number) => levelToX(level, initial, plot)
  const y = (amount: number) => amountToY(amount, principalAmount, plot)
  const pinnedY = (amount: number) => clamp(y(amount), plot.top, plot.bottom)
  const point = (level: number, value: number) => `${x(level)},${y(value)}`
  const points = levels.map((level, i) => point(level, values[i])).join(' ')
  const segments = splitByRegime(levels.map((level, i) => ({ point: point(level, values[i]), regime: regimeOf(breakdowns[i]) })))
  const legend = [...new Set(segments.map((segment) => segment.regime))].map((regime) => ({ regime, concept: regimeConcept[regime], label: regimeLabel[regime] }))
  const pointsWhere = (keep: (level: number) => boolean) => levels.flatMap((level, i) => keep(level) ? [point(level, values[i])] : [])
  const atInitial = point(initial, maturityPayment(note.value, initial))
  const ghost = ghostNote.value
  const ghostPoints = ghost && noteIssues(ghost).length === 0 ? levels.map((level) => point(level, maturityPayment(ghost, level))).join(' ') : ''
  const floorAmount = principalAmount * (note.value.payoff.principalProtection ?? 0)
  const capAmount = principalAmount * (1 + (note.value.payoff.cap ?? 0))
  const finalHandle = payment.value === null ? null : { x: x(clamp(finalLevel.value, 0, end)), y: pinnedY(payment.value) }
  const bubbleText = payment.value === null ? '' : `${formatAmount(finalLevel.value)} → ${formatAmount(payment.value)}`
  const bubbleWidth = 16 + bubbleText.length * 6.4 * labelScale.value
  const capLabelY = y(capAmount) - 6 < plot.top + 10 ? y(capAmount) + 14 : y(capAmount) - 6 // above the cap line, or below it when the line is at the top of the plot
  // The cap handle sits where the line actually bends flat. When the upside rate is too low for that to be in view,
  // it falls back to a fixed spot on the cap's reference line instead of floating over the wrong-coloured segment.
  const upsideRate = selectedParticipation.upside ? participationPercent.upside / 100 : undefined
  const bindLevel = capSelected.value ? capBindLevel(initial, note.value.payoff.cap ?? 0, upsideRate) : undefined
  const capOnCurve = bindLevel !== undefined && bindLevel <= end
  const capHandleX = capSelected.value ? (capOnCurve ? x(bindLevel as number) : plot.left + (plot.right - plot.left) * 0.8) : null
  // The cap label normally sits at the right edge. It shifts left of the handle instead only when the handle would otherwise sit on top of it.
  const capTextWidth = `Cap ${formatAmount(capAmount)}`.length * 6.4 * labelScale.value
  const capLabelOverlapsHandle = capOnCurve && capHandleX !== null && capHandleX + handleRadius.value + 6 > plot.right - 20 - capTextWidth
  const capLabelRight = capLabelOverlapsHandle ? Math.min(plot.right - 4, (capHandleX as number) - handleRadius.value - 6) : plot.right - 4
  // The tooltip normally sits above its handle. It drops below when that would cover the cap label.
  const bubbleX = finalHandle && clamp(finalHandle.x - bubbleWidth / 2, plot.left + 2, plot.right - bubbleWidth - 2)
  const capLabelLeft = capLabelRight - 16 - capTextWidth
  const coversCapLabel = capSelected.value && finalHandle !== null && bubbleX !== null && bubbleX + bubbleWidth > capLabelLeft && finalHandle.y - 34 + 22 > capLabelY - 12 * labelScale.value && finalHandle.y - 34 < capLabelY + 4
  return {
    points,
    segments,
    legend,
    ghostPoints: ghostPoints !== points ? ghostPoints : '',
    downsidePoints: [...pointsWhere((level) => level < initial), atInitial].join(' '),
    upsidePoints: [atInitial, ...pointsWhere((level) => level > initial)].join(' '),
    principalY: y(principalAmount),
    // Compact labels (such as 1.5K) keep large principals inside the left margin.
    amountTicks: [0, 0.5, 1, 1.5, 2].map((multiple) => ({ y: y(principalAmount * multiple), label: (principalAmount * multiple).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 }) })),
    floorY: protectionSelected.value ? y(floorAmount) : null,
    floorAmount,
    capY: capSelected.value ? y(capAmount) : null,
    capLabelY,
    capLabelRight,
    capAmount,
    initialX: x(initial),
    end,
    capHandle: capHandleX === null ? null : { x: capHandleX, y: pinnedY(capAmount) },
    floorHandle: protectionSelected.value ? { x: plot.left + (plot.right - plot.left) * 0.25, y: y(floorAmount) } : null,
    slopeHandle: selectedParticipation.upside ? { x: x(slopeLevel(initial, capFraction.value)), y: pinnedY(maturityPayment(note.value, slopeLevel(initial, capFraction.value))) } : null,
    finalHandle,
    bubble: finalHandle && bubbleX !== null && { text: bubbleText, width: bubbleWidth, x: bubbleX, y: finalHandle.y < plot.top + 40 || coversCapLabel ? finalHandle.y + 16 : finalHandle.y - 34 },
  }
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="brand">SPI<span>Re</span></div>
      <div class="header-note">Structured Products Issuance Reference</div>
    </header>

    <main class="page">
      <div class="intro">
        <h1>Structured products, built from their parts.</h1>
        <p>See how each feature changes what a note pays at maturity, and why.</p>
      </div>

      <p class="summary-sentence" aria-live="polite"><template v-for="(segment, index) in summary" :key="index"><button v-if="segment.concept" type="button" :class="['concept', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)" :aria-pressed="highlighted(segment.concept)" @click="select(segment.concept)">{{ segment.text }}</button><span v-else>{{ segment.text }}</span></template></p>

      <div v-if="names.length" class="names"><span id="names-label" class="names-label">Often marketed as</span><div class="names-list" role="group" aria-labelledby="names-label"><button v-for="name in names" :key="name.name" type="button" class="name-chip" :aria-expanded="activeHint === nameHintKey(name)" :aria-controls="nameHintId(name)" @click="openName(name)">{{ name.name }}</button></div><template v-for="name in names" :key="name.name"><p v-if="activeHint === nameHintKey(name)" :id="nameHintId(name)" class="hint-text" role="tooltip">{{ name.reason }}</p></template></div>

      <div class="workspace">
        <section class="panel outline" aria-label="Product structure">
          <p class="eyebrow">Editable terms</p>
          <h2>Structure</h2>
          <p class="help">A structured product is built from separate parts. Each one answers a single question about what the product is and what it pays.</p>
          <ul class="tree">
            <li :class="['node', { sel: highlighted('wrapper') }]" :style="conceptStyle('wrapper')">
              <div class="nrow" @click="select('wrapper')" @focusin="focusRow('wrapper')">
                <span class="nlabel">Wrapper<HintToggle id="wrapper" about="wrapper" :text="hints.wrapper" :active="activeHint === 'wrapper'" @toggle="toggleHint('wrapper')" /></span>
                <span class="ctrl pick"><select aria-label="Wrapper" :value="note.wrapper"><option v-for="option in wrapperOptions" :key="option.id" :value="option.id" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                <span class="ndesc">{{ partDescriptions.wrapper }}</span>
                <span class="ctrl block"><label for="principal">Principal</label><HintToggle id="principal" about="principal" :text="hints.principal" :active="activeHint === 'principal'" @toggle="toggleHint('principal')" /><NumberInput id="principal" v-model="principal" class="num" /></span>
              </div>
              <ul v-if="issuesFor('principalAmount').length" class="errors" role="alert"><li v-for="message in issuesFor('principalAmount')" :key="message">{{ message }}</li></ul>
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
                    <span class="ctrl pick"><select aria-label="Underlier" :value="note.underlier.kind"><option v-for="option in underlierOptions" :key="option.id" :value="option.id" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                    <span class="ndesc">{{ partDescriptions.underlier }}</span>
                  </div>
                  <ul>
                    <li :class="['node', { sel: highlighted('asset') }]" :style="conceptStyle('asset')">
                      <div class="nrow" @click="select('asset')" @focusin="focusRow('asset')">
                        <span class="nlabel">Asset<HintToggle id="asset" about="asset" :text="hints.asset" :active="activeHint === 'asset'" @toggle="toggleHint('asset')" /></span>
                        <span class="ctrl pick"><select v-model="assetKind" aria-label="Asset type"><option v-for="option in assetOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></span>
                        <span class="ndesc">{{ partDescriptions.asset }}</span>
                        <span class="ctrl block"><label for="asset-name">Name</label><input id="asset-name" v-model="assetName" type="text" placeholder="Synthetic Index" /></span>
                        <span class="ctrl block"><label for="initial-level">Initial level</label><HintToggle id="initial-level" about="initial level" :text="hints['initial-level']" :active="activeHint === 'initial-level'" @toggle="toggleHint('initial-level')" /><NumberInput id="initial-level" v-model="initialLevel" class="num" /></span>
                      </div>
                      <ul v-if="issuesFor('underlierName', 'initialLevel').length" class="errors" role="alert"><li v-for="message in issuesFor('underlierName', 'initialLevel')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li :class="['node', { sel: highlighted('determination') }]" :style="conceptStyle('determination')">
                      <div class="nrow" @click="select('determination')" @focusin="focusRow('determination')">
                        <span class="nlabel">Determination<HintToggle id="determination" about="determination" :text="hints.determination" :active="activeHint === 'determination'" @toggle="toggleHint('determination')" /></span>
                        <span class="ctrl pick"><select aria-label="Determination" :value="note.underlier.determination.kind"><option v-for="option in determinationOptions" :key="option.id" :value="option.id" :disabled="!option.available">{{ option.label }}{{ option.available ? '' : ' (unavailable)' }}</option></select></span>
                        <span class="ndesc">{{ partDescriptions.determination }}</span>
                        <span class="ctrl block"><span class="flabel">Final level</span><span class="unit">Hypothetical, set on the chart</span></span>
                      </div>
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
                        <span class="ctrl"><NumberInput id="rate-downside" v-model="participationPercent.downside" class="num rate" aria-label="Downside participation rate (%)" /><span class="unit">%</span></span>
                        <button type="button" class="xbtn" aria-label="Remove downside participation" @click.stop="removeFeature('downside')">×</button>
                      </div>
                    </li>
                    <li v-if="selectedParticipation.upside" :class="['node', { sel: highlighted('upside') }]" :style="conceptStyle('upside')">
                      <div class="nrow" @click="select('upside')" @focusin="focusRow('upside')">
                        <span class="nlabel">Upside participation<HintToggle id="upside" about="upside participation rate" :text="hints.upside" :active="activeHint === 'upside'" @toggle="toggleHint('upside')" /></span>
                        <span class="ctrl"><NumberInput id="rate-upside" v-model="participationPercent.upside" class="num rate" aria-label="Upside participation rate (%)" /><span class="unit">%</span></span>
                        <button type="button" class="xbtn" aria-label="Remove upside participation" @click.stop="removeFeature('upside')">×</button>
                      </div>
                    </li>
                    <li v-if="capSelected" :class="['node', { sel: highlighted('cap') }]" :style="conceptStyle('cap')">
                      <div class="nrow" @click="select('cap')" @focusin="focusRow('cap')">
                        <span class="nlabel">Cap<HintToggle id="cap" about="cap" :text="hints.cap" :active="activeHint === 'cap'" @toggle="toggleHint('cap')" /></span>
                        <span class="ctrl"><NumberInput id="rate-cap" v-model="capPercent" class="num rate" aria-label="Cap: maximum return on principal (%)" /><span class="unit">%</span></span>
                        <button type="button" class="xbtn" aria-label="Remove cap" @click.stop="removeFeature('cap')">×</button>
                      </div>
                      <ul v-if="issuesFor('cap').length" class="errors" role="alert"><li v-for="message in issuesFor('cap')" :key="message">{{ message }}</li></ul>
                      <p v-if="!selectedParticipation.upside" class="row-note">A cap has no meaning unless there is some upside exposure to cap.</p>
                    </li>
                    <li v-if="protectionSelected" :class="['node', { sel: highlighted('protection') }]" :style="conceptStyle('protection')">
                      <div class="nrow" @click="select('protection')" @focusin="focusRow('protection')">
                        <span class="nlabel">Principal protection<HintToggle id="protection" about="principal protection" :text="hints.protection" :active="activeHint === 'protection'" @toggle="toggleHint('protection')" /></span>
                        <span class="ctrl"><NumberInput id="rate-protection" v-model="protectionPercent" class="num rate" aria-label="Principal protection (%)" /><span class="unit">%</span></span>
                        <button type="button" class="xbtn" aria-label="Remove principal protection" @click.stop="removeFeature('protection')">×</button>
                      </div>
                      <ul v-if="issuesFor('principalProtection').length" class="errors" role="alert"><li v-for="message in issuesFor('principalProtection')" :key="message">{{ message }}</li></ul>
                    </li>
                    <li v-if="!hasFeatures" class="empty-payoff">
                      <p>This note only repays principal. Add a feature, such as upside participation or principal protection, to change what it pays.</p>
                    </li>
                    <li ref="paletteRoot" class="addrow"@keydown.esc="closePalette(true)">
                      <button ref="addButton" type="button" class="addbtn" aria-haspopup="dialog" :aria-expanded="paletteOpen" @click="paletteOpen ? closePalette() : openPalette()">＋ Add feature</button>
                      <div v-if="paletteOpen" class="menu" role="dialog" aria-label="Add a payoff feature">
                        <input ref="paletteSearch" v-model="paletteQuery" type="search" class="search" placeholder="Search features" aria-label="Search features" @keydown.enter.prevent="addFirstMatch" />
                        <div class="mlist">
                          <button v-for="feature in matchingFeatures" :key="feature.id" type="button" :class="['mitem', { off: !feature.available || isAdded(feature.id) }]" :aria-disabled="!feature.available || isAdded(feature.id) ? 'true' : undefined" @click="addFeature(feature.id)">
                            <b>{{ feature.label }}<span v-if="!feature.available" class="badge">Unavailable</span><span v-else-if="isAdded(feature.id)" class="badge">Added</span></b>
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
          <div class="preview-heading"><div><p class="eyebrow">Live preview</p><h2>Payoff at maturity</h2></div></div>
          <template v-if="chart">
            <svg ref="chartSvg" class="chart" viewBox="0 0 620 270" role="group" :aria-label="chartDescription" :style="{ '--label': `${11 * labelScale}px` }">
              <defs><clipPath id="plot-clip"><rect :x="plot.left" :y="plot.top" :width="plot.right - plot.left" :height="plot.bottom - plot.top"/></clipPath></defs>
              <line :x1="plot.left" :y1="plot.bottom" :x2="plot.right" :y2="plot.bottom" class="axis-line"/><line :x1="plot.left" :y1="plot.top" :x2="plot.left" :y2="plot.bottom" class="axis-line"/>
              <line :x1="plot.left" :y1="chart.principalY" :x2="plot.right" :y2="chart.principalY" class="ref-line principal"/>
              <line v-if="chart.floorY !== null" :x1="plot.left" :y1="chart.floorY" :x2="plot.right" :y2="chart.floorY" :class="['ref-line', { on: chartHighlight.floor }]" :style="conceptStyle('protection')"/>
              <line v-if="chart.capY !== null" :x1="plot.left" :y1="chart.capY" :x2="plot.right" :y2="chart.capY" :class="['ref-line', { on: chartHighlight.cap }]" :style="conceptStyle('cap')"/>
              <line v-if="chartHighlight.initial" :x1="chart.initialX" :y1="plot.top" :x2="chart.initialX" :y2="plot.bottom" class="highlight-line" :style="conceptStyle('determination')"/>
              <line :x1="chart.initialX" :y1="plot.top" :x2="chart.initialX" :y2="plot.bottom" :class="['ref-line initial', { on: chartHighlight.initial }]" :style="conceptStyle('determination')"/>
              <g clip-path="url(#plot-clip)">
                <polyline v-if="chart.ghostPoints" :points="chart.ghostPoints" class="ghost-line"/>
                <polyline :points="chart.points" class="payoff-casing"/>
                <polyline v-if="chartHighlight.line" :points="chart.points" class="highlight-line" :style="conceptStyle('payoff')"/>
                <polyline v-if="chartHighlight.downside" :points="chart.downsidePoints" class="highlight-line" :style="conceptStyle('downside')"/>
                <polyline v-if="chartHighlight.upside" :points="chart.upsidePoints" class="highlight-line" :style="conceptStyle('upside')"/>
                <polyline v-for="(segment, index) in chart.segments" :key="index" :points="segment.points" class="payoff-line" :style="conceptStyle(regimeConcept[segment.regime])"/>
              </g>
              <line v-if="chart.finalHandle" :x1="chart.finalHandle.x" :y1="chart.finalHandle.y" :x2="chart.finalHandle.x" :y2="plot.bottom" class="final-guide"/>
              <g v-for="tick in chart.amountTicks" :key="tick.y"><line :x1="plot.left - 4" :y1="tick.y" :x2="plot.left" :y2="tick.y" class="axis-line"/><text :x="plot.left - 7" :y="tick.y" text-anchor="end" dominant-baseline="middle" class="axis-label">{{ tick.label }}</text></g>
              <text :x="plot.left + 2" y="24" class="axis-label">Payment</text>
              <line :x1="plot.left + 4" :y1="chart.principalY - 10" :x2="plot.left + 16" :y2="chart.principalY - 10" class="ref-swatch principal"/><text :x="plot.left + 20" :y="chart.principalY - 6" class="ref-label">Principal {{ formatAmount(principal) }}</text>
              <template v-if="chart.floorY !== null"><line :x1="plot.left + 4" :y1="chart.floorY + 10" :x2="plot.left + 16" :y2="chart.floorY + 10" :class="['ref-swatch', { on: chartHighlight.floor }]" :style="conceptStyle('protection')"/><text :x="plot.left + 20" :y="chart.floorY + 14" :class="['ref-label', { on: chartHighlight.floor }]">Floor {{ formatAmount(chart.floorAmount) }}</text></template>
              <template v-if="chart.capY !== null"><line :x1="chart.capLabelRight - 12" :y1="chart.capLabelY - 4" :x2="chart.capLabelRight" :y2="chart.capLabelY - 4" :class="['ref-swatch', { on: chartHighlight.cap }]" :style="conceptStyle('cap')"/><text :x="chart.capLabelRight - 16" :y="chart.capLabelY" text-anchor="end" :class="['ref-label', { on: chartHighlight.cap }]">Cap {{ formatAmount(chart.capAmount) }}</text></template>
              <text :x="plot.left - 3" y="251" class="axis-label">0</text><text :x="chart.initialX" y="251" text-anchor="middle" class="axis-label">Initial {{ formatAmount(initialLevel) }}</text><text :x="plot.right" y="251" text-anchor="end" class="axis-label">{{ formatAmount(chart.end) }}</text>
              <g v-if="chart.bubble" class="bubble" :transform="`translate(${chart.bubble.x} ${chart.bubble.y})`"><rect :width="chart.bubble.width" height="22" rx="6"/><text :x="chart.bubble.width / 2" y="15" text-anchor="middle">{{ chart.bubble.text }}</text></g>
              <g v-if="chart.floorHandle" :class="['handle', { on: highlighted('protection') }]" :style="conceptStyle('protection')" :transform="`translate(${chart.floorHandle.x} ${chart.floorHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Principal protection" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="protectionPercent" :aria-valuetext="`${protectionPercent}% protection`" @pointerdown="startDrag('floor', $event)" @pointermove="dragMove('floor', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('floor', $event)" @focus="focusHandle('floor')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.capHandle" :class="['handle', { on: highlighted('cap') }]" :style="conceptStyle('cap')" :transform="`translate(${chart.capHandle.x} ${chart.capHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Cap" aria-valuemin="1" aria-valuemax="100" :aria-valuenow="capPercent" :aria-valuetext="`${capPercent}% maximum return`" @pointerdown="startDrag('cap', $event)" @pointermove="dragMove('cap', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('cap', $event)" @focus="focusHandle('cap')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.slopeHandle" :class="['handle', { on: highlighted('upside') }]" :style="conceptStyle('upside')" :transform="`translate(${chart.slopeHandle.x} ${chart.slopeHandle.y})`" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Upside participation rate" aria-valuemin="5" aria-valuemax="200" :aria-valuenow="participationPercent.upside" :aria-valuetext="`${participationPercent.upside}% upside participation`" @pointerdown="startDrag('slope', $event)" @pointermove="dragMove('slope', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('slope', $event)" @focus="focusHandle('slope')">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
              <g v-if="chart.finalHandle" class="handle final-dot" :transform="`translate(${chart.finalHandle.x} ${chart.finalHandle.y})`" tabindex="0" role="slider" :aria-label="`Hypothetical final level of ${underlierLabel}`" aria-valuemin="0" :aria-valuemax="Math.floor(chart.end)" :aria-valuenow="finalLevel" :aria-valuetext="`Final level ${formatAmount(finalLevel)}, payment ${formatAmount(payment ?? 0)}`" @pointerdown="startDrag('final', $event)" @pointermove="dragMove('final', $event)" @pointerup="endDrag" @pointercancel="endDrag" @keydown="keyHandle('final', $event)">
                <circle class="handle-ring" :r="handleRadius + 5"/><circle :r="hitRadius" fill="transparent"/><circle class="handle-dot" :r="handleRadius"/>
              </g>
            </svg>
            <div class="chart-axis-title">Final level of {{ underlierLabel }} →</div>
            <ul class="chart-legend" aria-label="What sets the payment"><li v-for="item in chart.legend" :key="item.regime" :style="conceptStyle(item.concept)"><span class="legend-swatch" aria-hidden="true"></span>{{ item.label }}</li></ul>
            <p class="chart-hint">Drag a handle on the chart, or focus one and use the arrow keys. Shift takes bigger steps. A grey line shows the payoff before your last change.</p>
          </template>
          <p v-else class="help">Enter valid terms to see the payoff.</p>


          <TabGroup v-model="activeTab" :tabs="tabs" label="The payment and its scenarios">
            <template #calculation>
              <div class="hint-field"><div class="field-heading"><label for="final-level">Hypothetical final level of {{ underlierLabel }}</label><button type="button" class="hint-button" aria-label="About final underlier level" aria-controls="final-level-hint" :aria-expanded="activeHint === 'final-level'" @click="toggleHint('final-level')">ⓘ</button><p v-if="activeHint === 'final-level'" id="final-level-hint" class="hint-text" role="tooltip">A hypothetical level for this scenario. Changing it does not change the note's terms.</p></div><NumberInput id="final-level" v-model="finalLevel" class="final-input" /></div>
              <p v-if="finalError" class="errors" role="alert">{{ finalError }}</p>
              <div class="formula" role="group" aria-label="Payment rule"><div v-for="(line, index) in formula" :key="index" :class="['fline', { limit: !line.lead }]"><span class="flead">{{ line.lead }}</span><span class="feq">{{ line.lead ? '=' : '' }}</span><span class="fexpr"><template v-for="(segment, part) in line.segments" :key="part"><span v-if="segment.concept" :class="['fterm', { on: highlighted(segment.concept) }]" :style="conceptStyle(segment.concept)">{{ segment.text }}</span><template v-else>{{ segment.text }}</template></template></span></div></div>
              <ol class="calc-steps" aria-live="polite"><li v-for="step in calculation" :key="step.n" :class="{ hl: step.concept && highlighted(step.concept), muted: step.muted, result: step.result }"><span class="calc-n">{{ step.n }}</span><b>{{ step.title }}</b><span class="calc-value">{{ step.value }}</span><span class="calc-how">{{ step.how }}</span></li></ol>
              <p v-if="outcomeSentence" class="outcome" aria-live="polite">{{ outcomeSentence }}</p>
            </template>
            <template #scenarios>
              <template v-if="chart">
                <h3>Example scenarios</h3>
                <p class="table-scroll-hint">Scroll horizontally to see every scenario column.</p>
                <div class="table-wrap"><table><thead><tr><th>Final level</th><th>Underlier change</th><th v-for="direction in selectedDirections" :key="direction">{{ participationLabels[direction] }}</th><th v-if="capSelected">Payment before cap</th><th v-if="protectionSelected">Payment before protection</th><th>Final payment</th></tr></thead><tbody><tr v-for="row in scenarios" :key="row.returnValue"><td>{{ formatAmount(row.final) }}</td><td>{{ formatPercent(row.returnValue) }}</td><td v-for="direction in selectedDirections" :key="direction">{{ row.calculations[direction] ?? '—' }}</td><td v-if="capSelected">{{ formatAmount(row.uncappedPayment) }}</td><td v-if="protectionSelected">{{ formatAmount(row.unflooredPayment) }}</td><td>{{ formatAmount(row.payment) }}<span v-if="capSelected && row.capApplied" class="floor-note">cap applied</span><span v-if="protectionSelected && row.floorApplied" class="floor-note">floor applied</span></td></tr></tbody></table></div>
                <p class="scenario-formula"><strong>Selected participation:</strong> {{ participationSummary }}. A move in an unselected direction does not change principal before protection. The payment cannot fall below {{ floorSummary }}.<template v-if="capSelected"> It cannot exceed {{ capSummary }}.</template></p>
              </template>
              <p v-else class="help">Enter valid terms to see the scenarios.</p>
            </template>
          </TabGroup>
          <p v-if="chart" class="explanation">All amounts are illustrative.</p>
        </section>

        <aside class="panel structure-json" aria-labelledby="structure-json-heading">
          <p class="eyebrow">{{ errors.length ? 'Draft structure · invalid terms' : 'Selected structure' }}</p>
          <h2 id="structure-json-heading">Structure JSON</h2>
          <p class="help">{{ errors.length ? 'A live draft containing invalid terms. Correct the highlighted terms before treating it as a valid structure.' : "A live representation of the note's contractual terms." }}</p>
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
          <p class="aside">Sample representation, not an industry standard.</p>
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
