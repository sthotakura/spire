<script setup lang="ts">
import { computed, ref } from 'vue'
import { maturityPayment, validateNote, type ProtectedParticipationNote, type UnderlierKind } from './domain/note'

const step = ref(0)
const activeHint = ref<string | null>(null)
const toggleHint = (hint: string) => { activeHint.value = activeHint.value === hint ? null : hint }
const steps = ['Wrapper', 'Redemption', 'Payoff', 'Underlier & terms', 'Explore outcomes']
const wrapperOptions = [
  { id: 'note', label: 'Note', description: "The first example is an issuer's contractual promise to pay.", available: true },
  { id: 'certificate-or-warrant', label: 'Certificate or warrant', description: 'Future examples need their own terms.', available: false },
  { id: 'etf', label: 'ETF', description: 'A fund structure would need a different model.', available: false },
] as const
const redemptionOptions = [
  { id: 'autocallable', label: 'Autocallable', description: 'Defined conditions may trigger early redemption. Later example.', available: false },
  { id: 'bullet', label: 'Bullet', description: 'One payment at scheduled maturity; no early call.', available: true },
  { id: 'issuer-callable', label: 'Issuer callable', description: 'The issuer may redeem early under defined terms. Later example.', available: false },
  { id: 'puttable', label: 'Puttable', description: 'The holder may require redemption under defined terms. Later example.', available: false },
] as const
const underlierOptions: ReadonlyArray<{ id: UnderlierKind; label: string }> = [
  { id: 'equity-index', label: 'Single equity index' },
  { id: 'equity', label: 'Single equity' },
]
const underlierKind = ref<UnderlierKind>('equity-index')
const underlierName = ref('Synthetic Index')
const principal = ref(1000)
const initialLevel = ref(100)
const participationPercent = ref(150)
const finalLevel = ref(110)

const note = computed<ProtectedParticipationNote>(() => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: underlierKind.value, name: underlierName.value },
  determination: { kind: 'point-to-point', initialLevel: initialLevel.value },
  payoff: { kind: 'upside-participation', participationRate: participationPercent.value / 100, principalProtection: 1 },
  principalAmount: principal.value,
}))
const payoffOptions = computed(() => [
  { id: 'principal-protection', label: '100% principal repayment', description: 'The maturity payment cannot fall below principal under the formula.', selected: note.value.payoff.principalProtection === 1, available: true },
  { id: 'upside-participation', label: 'Upside participation', description: 'Positive underlier return is multiplied by the participation rate.', selected: note.value.payoff.kind === 'upside-participation', available: true },
  { id: 'digital', label: 'Digital', description: 'Pays a predefined amount if a stated condition is met. Later example.', selected: false, available: false },
] as const)
const structureJson = computed(() => JSON.stringify(note.value, null, 2))
const errors = computed(() => validateNote(note.value))
const finalError = computed(() => !Number.isFinite(finalLevel.value) || finalLevel.value < 0 ? 'Final level must be zero or greater.' : '')
const valid = computed(() => errors.value.length === 0 && !finalError.value)
const payment = computed(() => valid.value ? maturityPayment(note.value, finalLevel.value) : null)
const underlierReturn = computed(() => valid.value ? finalLevel.value / initialLevel.value - 1 : null)
const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
const buildTimestampIso = __BUILD_TIMESTAMP__
const buildTimestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
}).format(new Date(buildTimestampIso))

const scenarios = computed(() => {
  if (errors.value.length) return []
  return [-0.4, 0, 0.1, 0.3].map((returnValue) => ({
    final: initialLevel.value * (1 + returnValue),
    returnValue,
    participatedReturn: note.value.payoff.participationRate * Math.max(returnValue, 0),
    payment: maturityPayment(note.value, initialLevel.value * (1 + returnValue)),
  }))
})

const chart = computed(() => {
  if (errors.value.length) return null
  const start = 0
  const end = initialLevel.value * 1.6
  const values = Array.from({ length: 65 }, (_, i) => maturityPayment(note.value, start + (end - start) * i / 64))
  const max = Math.max(...values)
  const min = principal.value * 0.9
  const x = (level: number) => 50 + level / end * 540
  const y = (amount: number) => 230 - (amount - min) / (max - min) * 195
  return {
    points: values.map((value, i) => `${x(start + (end - start) * i / 64)},${y(value)}`).join(' '),
    floorY: y(principal.value),
    initialX: x(initialLevel.value),
    selectedX: valid.value && finalLevel.value <= end ? x(finalLevel.value) : null,
    selectedY: payment.value !== null && finalLevel.value <= end ? y(payment.value) : null,
    end,
    max,
  }
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="brand">SPI<span>Re</span></div>
      <div class="header-note">Structured Products Issuance Reference <span>· Learning prototype</span></div>
    </header>

    <main class="page">
      <div class="intro">
        <p class="eyebrow">Build a structure</p>
        <h1>Learn one building block at a time.</h1>
        <p>Construct a synthetic principal-protected note, then explore its contractual payment at maturity.</p>
      </div>

      <nav class="steps" aria-label="Builder steps">
        <button v-for="(label, index) in steps" :key="label" type="button" :class="['step', { active: step === index }]" :aria-current="step === index ? 'step' : undefined" @click="step = index">
          <span class="step-number">{{ index + 1 }}</span>{{ label }}
        </button>
      </nav>

      <div class="workspace">
        <section class="panel controls" aria-label="Product builder">
          <template v-if="step === 0">
            <p class="eyebrow">Step 1 of 5</p><h2>Choose a wrapper</h2>
            <p class="help">The wrapper describes the form in which the product is issued.</p>
            <button v-for="option in wrapperOptions" :key="option.id" type="button" :class="['option', 'option-button', { selected: option.id === note.wrapper, unavailable: !option.available }]" :disabled="!option.available" :aria-pressed="option.id === note.wrapper"><strong>{{ option.label }}</strong><span>{{ option.description }}</span></button>
          </template>

          <template v-else-if="step === 1">
            <p class="eyebrow">Step 2 of 5</p><h2>Choose redemption behavior</h2>
            <p class="help">This describes when the note can end. The first example pays at scheduled maturity.</p>
            <button v-for="option in redemptionOptions" :key="option.id" type="button" :class="['option', 'option-button', { selected: option.id === note.redemption, unavailable: !option.available }]" :disabled="!option.available" :aria-pressed="option.id === note.redemption"><strong>{{ option.label }}</strong><span>{{ option.description }}</span></button>
          </template>

          <template v-else-if="step === 2">
            <p class="eyebrow">Step 3 of 5</p><h2>Choose the economics</h2>
            <p class="help">These rules determine the contractual payment at maturity.</p>
            <button v-for="option in payoffOptions" :key="option.id" type="button" :class="['option', 'option-button', { selected: option.selected, unavailable: !option.available }]" :disabled="!option.available" :aria-pressed="option.selected"><strong>{{ option.label }}</strong><span>{{ option.description }}</span></button>
            <p class="aside">Protection applies at maturity and depends on the issuer's ability to pay.</p>
          </template>

          <template v-else-if="step === 3">
            <p class="eyebrow">Step 4 of 5</p><h2>Set the terms</h2>
            <p class="help">The first example uses one underlier and point-to-point determination.</p>
            <label>Underlier type<select v-model="underlierKind"><option v-for="option in underlierOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
            <label>Underlier name<input v-model="underlierName" type="text" placeholder="Synthetic Index" /></label>
            <div class="field-pair">
              <div class="hint-field"><div class="field-heading"><label for="principal">Principal (units)</label><button type="button" class="hint-button" aria-label="About principal" aria-controls="principal-hint" :aria-expanded="activeHint === 'principal'" @click="toggleHint('principal')">ⓘ</button><p v-if="activeHint === 'principal'" id="principal-hint" class="hint-text" role="tooltip">The amount used as the base for the maturity payment, in synthetic units.</p></div><input id="principal" v-model.number="principal" type="number" min="0.01" step="any" /></div>
              <div class="hint-field"><div class="field-heading"><label for="initial-level">Initial level</label><button type="button" class="hint-button" aria-label="About initial level" aria-controls="initial-level-hint" :aria-expanded="activeHint === 'initial-level'" @click="toggleHint('initial-level')">ⓘ</button><p v-if="activeHint === 'initial-level'" id="initial-level-hint" class="hint-text" role="tooltip">The reference level used to calculate the underlier's return.</p></div><input id="initial-level" v-model.number="initialLevel" type="number" min="0.01" step="any" /></div>
            </div>
            <div class="hint-field"><div class="field-heading"><label for="participation">Participation rate (%)</label><button type="button" class="hint-button" aria-label="About participation rate" aria-controls="participation-hint" :aria-expanded="activeHint === 'participation'" @click="toggleHint('participation')">ⓘ</button><p v-if="activeHint === 'participation'" id="participation-hint" class="hint-text" role="tooltip">The share of a positive underlier return added to principal. At 150%, a 10% rise adds 15%.</p></div><input id="participation" v-model.number="participationPercent" type="number" min="0.01" step="any" /></div>
            <ul v-if="errors.length" class="errors" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
          </template>

          <template v-else>
            <p class="eyebrow">Step 5 of 5</p><h2>Explore outcomes</h2>
            <p class="help">Change the hypothetical final level. This example makes one final observation, so it has no interim valuation schedule.</p>
            <div class="hint-field"><div class="field-heading"><label for="final-level">Final underlier level</label><button type="button" class="hint-button" aria-label="About final underlier level" aria-controls="final-level-hint" :aria-expanded="activeHint === 'final-level'" @click="toggleHint('final-level')">ⓘ</button><p v-if="activeHint === 'final-level'" id="final-level-hint" class="hint-text" role="tooltip">A hypothetical level for this scenario. Changing it does not change the note's terms.</p></div><input id="final-level" v-model.number="finalLevel" type="number" min="0" step="any" /></div>
            <input v-model.number="finalLevel" type="range" min="0" :max="Math.max(initialLevel * 1.6, 1)" step="1" aria-label="Final underlier level slider" />
            <p v-if="finalError" class="errors" role="alert">{{ finalError }}</p>
            <div v-if="payment !== null" class="selected-result" aria-live="polite"><span>Contractual maturity payment</span><strong>{{ formatAmount(payment) }} units</strong><small>Underlier return {{ formatPercent(underlierReturn!) }}</small></div>
          </template>

          <div class="actions"><button type="button" class="secondary" :disabled="step === 0" @click="step--">Back</button><button type="button" class="primary" :disabled="step === 4 || (step === 3 && errors.length > 0)" @click="step++">Continue</button></div>
        </section>

        <section class="panel preview" aria-label="Payoff preview">
          <div class="preview-heading"><div><p class="eyebrow">Live preview</p><h2>Payoff at maturity</h2></div><span class="pill">Note · bullet · protected participation</span></div>
          <template v-if="chart">
            <svg class="chart" viewBox="0 0 620 270" role="img" aria-label="Contractual maturity payment remains at principal for flat or falling final levels, then rises with upside participation">
              <line x1="50" y1="230" x2="590" y2="230" class="axis-line"/><line x1="50" y1="35" x2="50" y2="230" class="axis-line"/>
              <line x1="50" :y1="chart.floorY" x2="590" :y2="chart.floorY" class="grid-line"/>
              <line :x1="chart.initialX" y1="35" :x2="chart.initialX" y2="230" class="grid-line"/>
              <polyline :points="chart.points" class="payoff-line"/>
              <circle v-if="chart.selectedX !== null && chart.selectedY !== null" :cx="chart.selectedX" :cy="chart.selectedY" r="5" class="selected-point"/>
              <text x="47" y="251" class="axis-label">0</text><text :x="chart.initialX" y="251" text-anchor="middle" class="axis-label">Initial {{ formatAmount(initialLevel) }}</text><text x="590" y="251" text-anchor="end" class="axis-label">{{ formatAmount(chart.end) }}</text>
              <text x="46" :y="chart.floorY - 7" class="axis-label">Principal {{ formatAmount(principal) }}</text>
            </svg>
            <div class="chart-axis-title">Final underlier level →</div>
            <h3>Example scenarios</h3>
            <div class="table-wrap"><table><thead><tr><th>Final level</th><th>Underlier return</th><th>Participated return</th><th>Payment</th></tr></thead><tbody><tr v-for="row in scenarios" :key="row.returnValue"><td>{{ formatAmount(row.final) }}</td><td>{{ formatPercent(row.returnValue) }}</td><td>{{ formatPercent(row.participatedReturn) }}</td><td>{{ formatAmount(row.payment) }}</td></tr></tbody></table></div>
            <p class="scenario-formula"><strong>Participated return</strong> = {{ formatPercent(note.payoff.participationRate) }} participation × positive underlier return. A flat or negative underlier return contributes 0%.</p>
            <p class="explanation">If {{ note.underlier.name || 'the underlier' }} finishes above its initial level, the note pays principal plus {{ formatPercent(note.payoff.participationRate) }} of the positive underlier return. Otherwise, the contractual payment is principal. All amounts are illustrative and subject to issuer payment ability.</p>
          </template>
          <p v-else class="help">Enter valid terms to see the payoff.</p>
        </section>

        <aside class="panel structure-json" aria-labelledby="structure-json-heading">
          <p class="eyebrow">Selected structure</p>
          <h2 id="structure-json-heading">Structure JSON</h2>
          <p class="help">A live representation of the note's contractual terms. Scenario inputs and calculated outcomes are not part of this structure.</p>
          <pre><code>{{ structureJson }}</code></pre>
          <p class="aside">Learning representation only; this is not an industry-standard issuance schema.</p>
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
