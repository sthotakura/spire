---
name: SPIRe
description: Structured products, built from their parts.
colors:
  ledger-blue: "#2369bd"
  ledger-blue-deep: "#195aa9"
  ledger-blue-mark: "#1e68c3"
  focus-blue: "#2a70c9"
  selection-wash: "#e3eeff"
  result-wash: "#edf5ff"
  hover-wash: "#f3f8ff"
  ink: "#17243a"
  ink-soft: "#2c3c55"
  slate: "#42536d"
  muted: "#66758b"
  faint: "#8794a8"
  page: "#f4f7fb"
  panel: "#ffffff"
  code-wash: "#f7f9fc"
  hairline: "#dce4ee"
  field-edge: "#cdd8e7"
  divider: "#e5ebf2"
  error: "#b42318"
  concept-wrapper: "#4f6fae"
  concept-redemption: "#2e8b83"
  concept-underlier: "#7a5cb5"
  concept-asset: "#9c6ade"
  concept-determination: "#b7791f"
  concept-initial-level: "#8b4f2b"
  concept-final-level: "#6b6412"
  concept-basket-return: "#5f5aa2"
  concept-payoff: "#42536d"
  concept-protection: "#2369bd"
  concept-minimum-return: "#4338ca"
  concept-upside: "#2b8a3e"
  concept-downside: "#d9480f"
  concept-cap: "#a23b8c"
  concept-buffer: "#1aa3b8"
  concept-barrier: "#9775fa"
  concept-absolute-return: "#d4a017"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(26px, 3vw, 32px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    letterSpacing: "-0.03em"
  summary:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(15px, 1.35vw, 18px)"
    fontWeight: 400
    lineHeight: 1.85
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "12px"
    lineHeight: 1.55
rounded:
  xs: "4px"
  sm: "7px"
  md: "9px"
  lg: "12px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "18px"
  lg: "25px"
components:
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "25px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 11px"
  add-button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ledger-blue}"
    rounded: "8px"
    padding: "6px 12px"
  add-button-hover:
    backgroundColor: "{colors.hover-wash}"
  tab:
    textColor: "{colors.muted}"
    padding: "10px 12px"
  tab-active:
    textColor: "{colors.ledger-blue-deep}"
  name-chip:
    backgroundColor: "#edf4fc"
    textColor: "#315d91"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  badge:
    backgroundColor: "#eef3f9"
    textColor: "#5d7290"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  calc-result:
    backgroundColor: "{colors.result-wash}"
    padding: "11px 10px"
  json-block:
    backgroundColor: "{colors.code-wash}"
    textColor: "#28405f"
    typography: "{typography.mono}"
    rounded: "8px"
    padding: "15px"
---

# Design System: SPIRe

## Overview

**Creative North Star: "The Exploded Diagram"**

SPIRe shows a structured product taken apart. Each concept (wrapper, redemption, underlier, determination, each payoff feature) is a labelled piece with its own colour, and that colour follows it into every view: the outline row's left bar, the underline in the summary sentence, the term in the payment rule, the line and handle on the chart, the highlighted lines of the structure JSON. Select a piece and it lights up wherever it acts. The diagram is the product; the chrome around it stays out of the way.

The mood is quiet, precise and explanatory. Surfaces are cool white panels on a pale blue-grey page, with one blue accent for interaction and nothing decorative. Every row in the outline is something the reader can change, so every row, Payoff included, is styled the same way. Density is moderate: a three-column workspace (outline, preview, JSON) that folds to two and then one, with small, exact type for terms and a larger, airy sentence for the summary. State changes are instant, with no transitions or motion; the reader's attention belongs on what changed, not on how it changed.

It must never look like a trading terminal (dark, dense, ticker-style), fintech marketing (gradients, glossy hero art, a sales tone) or a bank brochure (stock imagery, corporate gloss implying an issuer). It is a reference that explains, not a market or a pitch.

**Key Characteristics:**
- One colour per concept, carried identically through every view.
- One bar weight for every outline row: no part of the structure is louder than another.
- One interaction blue; everything else is neutral slate on white.
- Flat panels with a near-invisible shadow; hairline borders do the separating.
- Small, exact labels; a generous, readable summary sentence.
- No motion; highlight and selection are immediate.
- Light theme only.

## Colors

A cool, low-chroma neutral world in which the only saturated colour is meaning: the blue accent for interaction, and the concept palette for the parts of the product.

### Primary
- **Ledger Blue** (`ledger-blue`): the interaction colour. The text of the Add feature and Add asset buttons, the ⓘ hint glyphs, the active tab's underline, the result step's number disc, highlighted JSON lines' left bar. Its deeper shade (`ledger-blue-deep`) is hover and active text; `focus-blue` is the focus outline; `ledger-blue-mark` is the "Re" in the wordmark.
- **Selection Wash** (`selection-wash`) and **Result Wash** (`result-wash`): pale blue fills for a selected JSON line and the final payment step. **Hover Wash** (`hover-wash`) is the hover fill for buttons and highlighted calculation steps.

### Concept palette
Seventeen hues, one per concept, applied through a single CSS variable (`--c`) on the element that represents the concept. They are mid-tone so they read as lines, bars and underlines on white, and as 6–26% `color-mix` tints for fills. Protection shares Ledger Blue, and payoff shares Slate.

- **Wrapper** Dusty Navy, **Redemption** Sea Teal, **Underlier** Iris, **Asset** Lilac, **Determination** Ochre, **Initial level** Walnut, **Final level** Olive, **Basket return** Slate Violet, **Payoff** Slate, **Protection** Ledger Blue, **Minimum return** Indigo, **Upside** Field Green, **Downside** Burnt Orange, **Cap** Plum, **Buffer** Cyan Teal, **Barrier** Lavender, **Absolute return** Gold.

### Neutral
- **Ink** (`ink`): headings, values, the final-level dot and bubble on the chart.
- **Ink Soft** (`ink-soft`) and **Slate** (`slate`): reading text in the summary, formula, explanation and outcome.
- **Muted** (`muted`): descriptions, field labels, table headers, hints. **Faint** (`faint`): muted calculation steps and the remove (×) glyph at rest.
- **Page** (`page`): the page background. **Panel** (`panel`): every panel and field.
- **Hairline** (`hairline`): panel and header borders. **Field Edge** (`field-edge`): input, select, menu and tooltip borders. **Divider** (`divider`): table rules, tab rail, section breaks. **Code Wash** (`code-wash`): the JSON block and row hover.
- **Error** (`error`): validation messages and the remove button's hover.

### Named Rules
**The One Concept, One Colour Rule.** A concept's colour is fixed and appears on every representation of that concept, in every view. Never reuse a concept hue for decoration, and never give one concept two colours.

**The Colour Means Something Rule.** Outside the concept palette, the only saturated colour on the page is Ledger Blue, and only for interaction. A new concept gets a new hue checked against the hues it can touch on the chart; a new control gets Ledger Blue.

## Typography

**Display Font:** Inter (with the system UI stack as fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** the system monospace stack (ui-monospace, SFMono-Regular, Consolas) for the structure JSON only

Inter is named first but not loaded, so most readers see their platform's UI font (Segoe UI, San Francisco). The single sans family relies on weight and size, not on pairing. Headings tighten their tracking (−0.03 to −0.04em); numeric values use tabular figures.

**Character:** neutral and exact, like a well-set specification. Type never decorates; weight marks what matters.

### Hierarchy
- **Display** (700, `clamp(26px, 3vw, 32px)`, 1.15): the one intro headline, kept modest so the summary sentence below it reads as the real headline.
- **Headline** (700, 23px): panel titles, each followed by one muted 14px line saying what the panel shows; the wordmark at 750.
- **Summary** (400, `clamp(15px, 1.35vw, 18px)`, 1.85): the one-sentence product summary, with concept phrases set at 650 inside tinted underlined chips. The loose leading makes room for those chips.
- **Title** (700, 15px): section headings inside a panel.
- **Body** (400, 13–14px, 1.45–1.6): explanation, outcome, formula, outline rows (650 for row names).
- **Label** (600–650, 12–13px): field labels, one-line descriptions, legend, table headers.
- **Mono** (12px, 1.55): structure JSON.

### Named Rules
**The Weight, Not Size Rule.** Inside a panel, hierarchy comes from weight (400 / 600 / 650 / 700) across a narrow 12–15px band. Only the display headline, panel titles, summary sentence and final payment step get larger sizes.

## Layout

A centred page capped at 1500px with 24px gutters (16px under 760px) under a 52px white header bar. The intro sits 18px below the bar and 18px above the summary sentence. The workspace is a three-column grid of panels, 18px apart: the outline (300–410px), the preview (flexible, at least 430px), and the structure JSON (260–320px). Under 1400px the JSON moves below the outline beside a taller preview; under 900px everything stacks as outline, preview, JSON. In the three-column layout the outline and the JSON are sticky beside the longer preview: a column taller than the window scrolls with the page until its bottom is in view, then holds, so no row is ever out of reach and no menu or tooltip is clipped by an inner scroller.

Inside the outline, the structure is a tree: nested lists indented 11–14px, with 2px pale connector lines. Every row is at least 40px tall and its height never changes on selection, so nothing below it moves; the ⓘ hint holds each part's meaning. Principal and Term share a line. Names never break: when a name and its control do not fit on one line, the control moves to the next line. Every control (select, rate field with its % and remove ×) ends on the row's right edge, so controls line up down the tree. Long labels inside a row, such as basket asset names, wrap rather than widen the page. Inside the preview, content flows top to bottom in the order a reader reasons: summary, "Often marketed as" names, chart, key, then tabs for the worked calculation and the scenarios.

Spacing follows a 6 / 12 / 18 / 25 scale: 6px within a group (inline items, chart to key), 12px between related blocks (rule, steps, outcome), 18px between sections and panel headings, 25px for panel padding (20px on small screens) and above the footer.

### Named Rules
**The Outline Mirrors the Calculation Rule.** Payoff features appear in the order the payment applies them, in the outline and in the JSON alike, so the outline reads like the worked calculation beside it.

## Elevation & Depth

Essentially flat. Panels separate from the page by a 1px hairline border and a shadow so faint it reads as tone (`0 5px 20px` at about 3% opacity). Real elevation is reserved for things that float above the content: the hint tooltip (`0 5px 18px`, ~12%) and the add-feature menu (`0 12px 34px`, ~30%). Selection is shown with tinted fills and inset 1.5px rings in the concept colour, never with lift.

### Named Rules
**The Float Only When Floating Rule.** A shadow means the element is above the page and will go away (tooltip, menu). Anything that stays in the layout is flat.

## Shapes

Gently rounded, never pill-heavy. Panels 12px; outline rows, the formula box and menus 9–10px; inputs, buttons and tooltips 7–8px; small icon buttons 4–6px. Pills (99px) are reserved for the "Often marketed as" name chips and the small "unavailable" badges. A 2px left border in the concept colour is the outline row's signature edge, the same on every row; the summary sentence's concept chips round only their top corners above a 2px coloured underline. The Add asset button and empty-payoff note use a dashed border to mark "something can go here".

## Components

### Buttons
Restrained and mostly textual; the page has almost no filled buttons.
- **Add feature and Add asset:** one style for both: white with a 1px dashed blue-grey border, Ledger Blue text at 650, 8px radius; hover fills with Hover Wash. Add feature is the single entry point for adding payoff features.
- **Icon buttons** (ⓘ hint, × remove, copy JSON): no border or background at rest (copy has a hairline frame); hover or focus gives a pale fill: blue for hint and copy, red-tinted with Error text for remove.
- **Focus:** a 2px `focus-blue` outline offset 2px.

### Chips
- **Name chips** ("Often marketed as"): pill, pale blue fill, mid-blue text at 600; hover or open darkens fill and border. They open a definition tooltip.
- **Badges:** small pale-slate pills marking an option as unavailable. The invalid variant (pale red, Error text) marks the JSON heading when terms are invalid.

### Cards / Containers
- **Panels:** white, 12px radius, hairline border, faint ambient shadow, 25px padding.
- **Formula box:** Code Wash fill, 9px radius, divider border; a three-column grid of lead, "=", expression, with an "In words" line beneath a rule.

### Inputs / Fields
- **Style:** white, 1px Field Edge border, 7px radius, 15px text (14px inside the outline tree, with tighter padding). Number fields show digit separators and are sized to their content (56–170px wide).
- **Highlighted input:** the lowest lookback level takes the concept colour as border, inset ring and 8% tint, in bold.
- **Error:** red text list beneath the field group; no red borders.

### Navigation
- **Tabs:** text tabs on a 1px divider rail; muted at rest, Ledger Blue Deep on hover; the active tab adds a 3px Ledger Blue underline. Arrow keys, Home and End move between tabs.
- **Header:** white bar, hairline bottom border, wordmark "SPI" in Ink with "Re" in Ledger Blue Mark, and the full name "Structured Products Interactive Reference" in muted 13px on the right.

### Outline row (signature)
A tree row with a left border in its concept colour, the concept name, inline controls, and a one-line muted description beneath when selected. Every row, Payoff and its features included, uses the same 2px border and a 600 Ink Soft name at 13.5px. Hover tints the row in Code Wash; selection tints it 6% in the concept colour with an inset 1.5px ring at 40%.

### Payoff chart (signature)
An inline SVG that reads the product against the underlier. The horizontal axis is the underlier's change, fixed from −100% to +100% of the level the return is measured from, with 0% in bold at the centre. A 1.75px dashed Muted line is the payment moving 1:1 with the underlier; it is a reference, not a concept, so it takes no concept colour. The payoff line is 4px in the colour of the concept that sets the payment, over an 8px white casing, and principal is a solid slate line. Labels, not colour, carry the meaning: each piece of the line has a short plain-words label in Ink with a 1px Slate leader, placed by priority clear of the lines, the bubble and each other, and dropped when there is no room. The selected feature's label is placed first and set in bold, and the gap it makes against the 1:1 line is tinted 16% in its colour; nothing is tinted at rest. Thin dotted droplines mark where the rule changes. A jump has a filled mark where the level pays and an open mark just below. Handles are white dots with a 3.5px concept-colour stroke, shown while the pointer is over the chart, when one has focus, or for the selected feature; they fill with a tint on hover or focus, with a focus ring. The hypothetical final level is an Ink dot with a white stroke and an Ink bubble giving the change, the level and the payment. A two-entry key under the chart names the product's line and the 1:1 line. Labels carry a white paint-order stroke so they stay legible over lines.

### Worked calculation (signature)
Numbered steps in a grid of number disc, label and description, then a right-aligned tabular value. Steps that do not apply are muted. The final step sits on Result Wash with a Ledger Blue disc and a 20px value.

## Do's and Don'ts

### Do:
- **Do** style every outline row the same way, Payoff included: one 2px colour bar, one name style.
- **Do** give every add button the same dashed style.
- **Do** give every new concept its own hue in the concept palette and apply it through `--c` on every element that represents it.
- **Do** keep interaction in Ledger Blue (`#2369bd`) and focus as a 2px `#2a70c9` outline offset 2px.
- **Do** separate surfaces with hairlines (`#dce4ee`) and tone; keep panels flat.
- **Do** show selection with concept-colour tints (6–26% `color-mix` with white) and inset rings, identically in every view.
- **Do** use tabular figures for every value that can change.
- **Do** keep `src/style.css` in its existing form: minified, one rule group per line.

### Don't:
- **Don't** make it look like a trading terminal: no dark theme, ticker density or flashing values.
- **Don't** make it look like fintech marketing: no gradients, glossy hero art or sales tone.
- **Don't** make it look like a bank brochure: no stock imagery or corporate gloss that implies an issuer.
- **Don't** use a concept colour for decoration, or the blue accent for anything but interaction and the protection concept.
- **Don't** add transitions or motion to highlight and selection; changes are immediate.
- **Don't** add elevation to in-flow content; shadows are only for tooltips and menus.
- **Don't** put a small uppercase label above a heading; each panel heading carries one plain line beneath it instead.
