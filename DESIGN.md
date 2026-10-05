---
version: alpha
name: "ตังค์พอดี"
description: "A friendly Thai personal finance app that makes the next safe spending amount easy to see."
colors:
  primary: "#A94D75"
  pink: "#F4B6CC"
  pink-soft: "#FFF2F7"
  mint: "#DDF3E8"
  mint-strong: "#477E68"
  turquoise: "#C9EFF3"
  turquoise-strong: "#317F89"
  ink: "#403542"
  muted: "#817781"
  paper: "#FFFCFD"
  border: "#EEE4E9"
  danger: "#B7445E"
typography:
  sans:
    fontFamily: "Sarabun, Leelawadee UI, Tahoma, sans-serif"
  display:
    fontFamily: "Kanit, Sarabun, Leelawadee UI, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "1rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.4rem"
spacing:
  section-gap: "1.5rem"
  page-max: "82rem"
components:
  button: {}
  card: {}
  dialog: {}
  input: {}
---

# ตังค์พอดี Design System

## Overview

### Creative North Star

The app should feel like opening a tidy cloth wallet with labeled cash envelopes: warm and personal, with one clear amount that answers “วันนี้ยังใช้ได้เท่าไร”. A small stitched line and pocket motif carry the signature; charts and decoration stay quiet.

### Product context and register

- **Audience and primary job:** Thai-speaking people managing everyday spending, bills, debt installments, and personal savings.
- **Target market(s) and evidence:** Thailand; the brief is written in Thai and specifies Thai baht and Thai lucky-color references.
- **Locale(s) and language policy:** Thai interface and copy. Format money in THB and dates with `th-TH` using the Buddhist calendar for display; store ISO Gregorian date-only values.
- **Usage scene:** Frequent mobile checks between purchases, with a wider desktop view for reviewing monthly history and settings.
- **Register:** Product-first with a light, friendly character.
- **Memorable signature:** A soft mint spending envelope card with a stitched budget progress line; the overview pairs a small, friendly savings-pig illustration with one gentle, context-aware daily reminder.
- **Restraint:** Keep cash values, dates, and action labels plain and high contrast. Use gradients in the page atmosphere and welcome panel, never behind financial figures; the pig guides but never covers figures.
- **Icon policy:** Never use emoji or Unicode pictographs as interface icons. Use accessible Lucide SVGs with theme-aware strokes.
- **Anti-references:** Generic banking terminal, dense spreadsheet dashboard, neon gamification, and decorative gradients behind financial figures.
- **Token ownership/runtime mapping:** `src/index.css` is the canonical runtime token source. This file documents the accepted values; CSS variables map directly to the palette and component styles consume semantic variables.

## Colors

The blush palette marks the product identity. White and pale blush are the light reading surfaces. Mint is reserved for available money and savings progress; deep mint carries readable labels on those surfaces. Turquoise marks informational data and utilities. Ink and muted text remain dark enough to read on white. Dark mode uses charcoal reading surfaces with white text, rose for product actions, mint for available money, and turquoise for information. Danger uses a deeper rose so status never relies on hue alone. Subtle rose-to-mint gradients add atmosphere to the app shell and overview welcome panel; CSS variables in src/index.css remain the canonical runtime source.

## Typography

Use Sarabun for Thai body copy and controls, Kanit for restrained headings, and tabular numerals for money. Bundle both Thai-capable typefaces locally so the interface retains its identity offline. Keep text in sentence case and show Thai dates with Buddhist years while retaining ISO dates in storage.

## Layout

Use a two-column application shell on large screens: a compact navigation rail and a fluid content area capped at 82rem. Below 760px, replace the rail with a fixed bottom navigation that respects the safe area. Give each screen a clear title and one leading action; stack cards naturally on phones with no horizontal page scrolling.

## Elevation & Depth

Use warm borders and one soft shadow on raised cards. Reserve stronger elevation for dialogs and the primary wallet card. Avoid blur, sticky overlays that cover the keyboard, and shadows around every small component.

## Shapes

Cards use 1.4rem corners, inputs and buttons use 0.65rem corners, and small status tags use full pills. The pocket card gets one stitched inner line as its only decorative shape. Icons use Lucide's consistent 1.8px stroke and retain adjacent text when their meaning is not universal.

## Components

### Foundational visual states

Inputs use white surfaces in light mode and charcoal surfaces in dark mode, clear borders, visible focus rings, and inline errors. Static app copy and UI controls cannot be highlighted by dragging; editable input and textarea values remain selectable so they can be corrected. Number fields use the app's text-field appearance without browser spinner arrows. Buttons keep stable dimensions while busy. Selected navigation uses dark rose text on pale pink in light mode and bright rose text on a darker surface in dark mode. Warnings include text and an icon in addition to color. Respect `prefers-reduced-motion` and keep feedback transitions brief.

### Buttons and actions

Use solid deep rose for the primary action, white/outlined buttons for secondary actions, and pale danger styling for routine delete entry points. Confirmation dialogs use an explicit destructive action only when deleting a record.

### Navigation and data display

Use a labeled sidebar at desktop and bottom navigation on phones. Use semantic lists for transactions and bills, and small CSS bars with text labels for comparisons. Keep full amounts visible; use tabular numerals and align currency to the right.

### Forms and overlays

Use visible labels, native date fields and selects, linked validation text, and one shared dialog primitive. Toasts use one live region with action-aligned wording. Long dialog bodies scroll within the visual viewport and keep actions reachable above mobile safe areas.

### Iconography

Use Lucide icons with 18–22px stroke icons. Their SVG strokes use `currentColor` so they follow the selected light or dark theme. Pair icons with Thai labels except for compact calendar markers; icon-only buttons receive localized accessible names.

### Motion

Use 160–250ms easing for controls, period changes, dialogs, and toasts. On initial app entry, two diagonal gradient panels open outward over about 760ms after local data is ready; show only the panels during this reveal, with no logo or text, and skip it for reduced-motion preference. A first-time or freshly reset dataset opens the dismissible pig guide after the reveal; keep its pending state through reloads until it is completed or skipped. Route changes slide the outgoing page and incoming page horizontally for 340ms in the direction of navigation, leaving the shell gradient visible throughout; clip horizontal overflow during the slide so the viewport and fixed mobile navigation never shift. The mobile bottom navigation uses one rounded rectangle that travels between tabs at the same speed. Budget, goal, comparison, and chart progress animates toward its data value in about 560ms; keep the numerical money value readable at once. Dark-theme hover and focus surfaces, including the savings icon, stay dark so SVG strokes remain visible. Reduced-motion preference removes nonessential movement.

### Content and data visualization

Use friendly, direct Thai language: “บันทึกรายจ่าย”, “ชำระแล้ว”, “ยังใช้ได้”. Money values use `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })`. Graphs always include a numeric label or summary and never imply a precise utility bill where only an estimate is available.

## Do's and Don'ts

- **Do:** Make the current safe-to-spend amount the clearest number on the home screen.
- **Do:** Keep expenses, commitments, and savings visibly separate in forecasts.
- **Don't:** Use pastel text on pale surfaces or communicate debt status with color alone.
- **Don't:** Turn an everyday money task into a game: no points, levels or leaderboards. The one allowed habit mechanic is the daily saving streak (consecutive days with a jar deposit, shown with a 7-day row); a missed day resets the current run quietly and never shames the user.
- **Don't:** Use the pig to conceal a blank state; empty states must still say what to do next.
- **v2 navigation:** four tabs (Home, Records with a list/calendar switch, Jars, More) plus a centre + button on mobile and a Add button in the desktop sidebar. Utilities and Settings live under More.
