<script setup lang="ts">
import { computed, ref } from 'vue'
import { maturityPayment, validateNote, type ProtectedParticipationNote, type UnderlierKind } from './domain/note'

const step = ref(0)
const steps = ['Wrapper', 'Payoff', 'Underlier & terms', 'Explore outcomes']
const underlierKind = ref<UnderlierKind>('equity-index')
const underlierName = ref('Synthetic Index')
const principal = ref(1000)
const initialLevel = ref(100)
const participationPercent = ref(150)
const finalLevel = ref(110)

const note = computed<ProtectedParticipationNote>(() => ({
  wrapper: 'bullet',
  underlier: { kind: underlierKind.value, name: underlierName.value },
  determination: { kind: 'point-to-point', initialLevel: initialLevel.value },
  payoff: { kind: 'upside-participation', participationRate: participationPercent.value / 100, principalProtection: 1 },
  principalAmount: principal.value,
}))
const errors = computed(() => validateNote(note.value))
const finalError = computed(() => !Number.isFinite(finalLevel.value) || finalLevel.value < 0 ? 'Final level must be zero or greater.' : '')
const valid = computed(() => errors.value.length === 0 && !finalError.value)
const payment = computed(() => valid.value ? maturityPayment(note.value, finalLevel.value) : null)
const underlierReturn = computed(() => valid.value ? finalLevel.value / initialLevel.value - 1 : null)
const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`

const scenarios = computed(() => {
  if (errors.value.length) return []
  return [-0.4, 0, 0.1, 0.3].map((returnValue) => ({
    final: initialLevel.value * (1 + returnValue),
    returnValue,
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
            <p class="eyebrow">Step 1 of 4</p><h2>Choose a wrapper</h2>
            <p class="help">The wrapper describes when the note can end and pay.</p>
            <div class="option selected"><strong>Bullet</strong><span>One contractual payment at maturity.</span></div>
            <div class="option unavailable"><strong>Issuer callable</strong><span>Coming in a later example.</span></div>
            <div class="option unavailable"><strong>Autocallable</strong><span>Coming in a later example.</span></div>
          </template>

          <template v-else-if="step === 1">
            <p class="eyebrow">Step 2 of 4</p><h2>Choose the economics</h2>
            <p class="help">These rules determine the contractual maturity amount.</p>
            <div class="option selected"><strong>100% principal repayment</strong><span>The maturity payment cannot fall below principal under the formula.</span></div>
            <div class="option selected"><strong>Upside participation</strong><span>Positive underlier return is multiplied by the participation rate.</span></div>
            <p class="aside">Protection applies at maturity and depends on the issuer's ability to pay.</p>
          </template>

          <template v-else-if="step === 2">
            <p class="eyebrow">Step 3 of 4</p><h2>Set the terms</h2>
            <p class="help">The first example uses one underlier and point-to-point determination.</p>
            <label>Underlier type<select v-model="underlierKind"><option value="equity-index">Single equity index</option><option value="equity">Single equity</option></select></label>
            <label>Underlier name<input v-model="underlierName" type="text" placeholder="Synthetic Index" /></label>
            <div class="field-pair"><label>Principal (units)<input v-model.number="principal" type="number" min="0.01" step="any" /></label><label>Initial level<input v-model.number="initialLevel" type="number" min="0.01" step="any" /></label></div>
            <label>Participation rate (%)<input v-model.number="participationPercent" type="number" min="0.01" step="any" /></label>
            <ul v-if="errors.length" class="errors" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
          </template>

          <template v-else>
            <p class="eyebrow">Step 4 of 4</p><h2>Explore outcomes</h2>
            <p class="help">Change the hypothetical final level. This example makes one final observation, so it has no interim valuation schedule.</p>
            <label>Final underlier level<input v-model.number="finalLevel" type="number" min="0" step="any" /></label>
            <input v-model.number="finalLevel" type="range" min="0" :max="Math.max(initialLevel * 1.6, 1)" step="1" aria-label="Final underlier level slider" />
            <p v-if="finalError" class="errors" role="alert">{{ finalError }}</p>
            <div v-if="payment !== null" class="selected-result" aria-live="polite"><span>Contractual maturity payment</span><strong>{{ formatAmount(payment) }} units</strong><small>Underlier return {{ formatPercent(underlierReturn!) }}</small></div>
          </template>

          <div class="actions"><button type="button" class="secondary" :disabled="step === 0" @click="step--">Back</button><button type="button" class="primary" :disabled="step === 3 || (step === 2 && errors.length > 0)" @click="step++">Continue</button></div>
        </section>

        <section class="panel preview" aria-label="Payoff preview">
          <div class="preview-heading"><div><p class="eyebrow">Live preview</p><h2>Payoff at maturity</h2></div><span class="pill">Bullet · protected participation</span></div>
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
            <div class="table-wrap"><table><thead><tr><th>Final level</th><th>Underlier return</th><th>Payment</th></tr></thead><tbody><tr v-for="row in scenarios" :key="row.returnValue"><td>{{ formatAmount(row.final) }}</td><td>{{ formatPercent(row.returnValue) }}</td><td>{{ formatAmount(row.payment) }}</td></tr></tbody></table></div>
            <p class="explanation">If {{ note.underlier.name || 'the underlier' }} finishes above its initial level, the note pays principal plus {{ formatPercent(note.payoff.participationRate) }} of the positive underlier return. Otherwise, the contractual payment is principal. All amounts are illustrative and subject to issuer payment ability.</p>
          </template>
          <p v-else class="help">Enter valid terms to see the payoff.</p>
        </section>
      </div>
    </main>
  </div>
</template>
