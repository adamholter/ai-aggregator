# UI Variant Testing

A lightweight pattern for testing one focused UI change at a time, without disrupting the main application for regular users.

---

## The Idea

Pick **one thing** to test — navigation placement, information density, spacing, card layout, etc. Create 2–4 variations of that single change. Switch between them from a hidden developer menu. Collect notes on what works. Merge the best parts into the main codebase.

The variants exist to answer a specific question, not to redesign the application.

---

## Rules for Creating Variants

### One change per round
Each variant tests one hypothesis. Examples:
- "What if the nav was a sidebar instead of a top bar?"
- "What if cards were more compact?"
- "What if the header was collapsed into a single bar?"

Do not bundle multiple changes. If a variant changes both the nav and the card layout, you can't know which change you're reacting to.

### Keep everything else identical
Variants share the same HTML, the same JavaScript, the same data, and the same backend. Only CSS changes — applied via a body class scoped to each variant. The card system, modals, data fetching, and all other functionality must be untouched.

### The main application is never touched
The default experience for regular users is unchanged. Variants are accessed through a separate URL or a hidden developer toggle.

---

## Implementation Approach

### 1. Analyze the codebase first
Before writing any CSS, identify:
- What classes control the layout area being tested
- What the default spacing, sizing, and positioning values are
- Which selectors are safe to override without breaking JS behavior

### 2. One CSS file per variant
Each variant is a single CSS file that adds overrides scoped under a body class:

```css
/* variant-sidebar.css */
.variant-sidebar .navigation {
    position: fixed;
    left: 0;
    /* ... */
}
.variant-sidebar .main-content {
    margin-left: 220px;
}
```

The main stylesheet loads first. The variant file loads second and overrides only what's needed.

### 3. Apply via body class + URL
The server renders the same template for all variants. A URL parameter or path segment determines which variant CSS file is loaded and which body class is applied:

- `/` — default
- `/ui/compact-header` — variant A
- `/ui/sidebar-nav` — variant B
- `/ui/dense-cards` — variant C

The template accepts a `variant` parameter:
```html
<body class="variant-{{ variant }}">
  <link rel="stylesheet" href="/static/variants/{{ variant }}.css">
```

### 4. Access from the settings menu
Add a small "Developer" or "UI Testing" section at the bottom of the existing settings modal. A `<select>` dropdown lists the available variants. On save, the page redirects to the variant URL. The selection is stored in `localStorage` so it persists across sessions.

This section should be visually understated — no heading that a regular user would notice. A small label like "Interface variant (developer)" is enough.

```html
<div class="settings-section dev-only">
  <h3>UI Testing</h3>
  <label for="setting-ui-variant">Interface variant</label>
  <select id="setting-ui-variant">
    <option value="default">Default</option>
    <option value="variant-a">Variant A — [description]</option>
    <option value="variant-b">Variant B — [description]</option>
    <option value="variant-c">Variant C — [description]</option>
  </select>
  <p class="help-text">Developer only. Switches to a layout variant for testing.</p>
</div>
```

---

## Choosing What to Test

When generating variants for an existing codebase, look at:

1. **Navigation** — Is it top, side, tabbed, or inline? Would a different placement reduce scrolling or better use screen real estate?
2. **Information density** — Are cards too spacious or too cramped? Is the grid too wide or too narrow?
3. **The header** — Does it take up too much vertical space? Could it collapse into a single bar?
4. **Content hierarchy** — Is the most important information easy to find, or is it buried?
5. **Progressive disclosure** — Are details shown upfront or hidden behind interaction?

Pick the one that seems like the highest-value question to answer right now.

---

## Variant Structure

For each variant, document:
- **Name**: short slug used in the URL and body class
- **Hypothesis**: the one thing being tested
- **Change**: what CSS is different and why
- **What to watch for**: what a good result looks like

Example:
```
Name: sidebar-nav
Hypothesis: Moving the nav to a sidebar saves vertical space and
            makes the active section clearer.
Change: .navigation becomes a fixed 220px left column.
        .header and .main-content shift right by 220px.
Watch for: Does the sidebar feel cluttered? Does losing horizontal
           nav space hurt or help the content area?
```

---

## Collecting Feedback

Use a simple text file or comment during testing. For each variant, note:

- What you liked
- What felt wrong
- Whether you'd keep this change, discard it, or refine it

Example:
```
Variant A (sidebar-nav):
  + Sidebar color dots for data sources work well — gives visual context
  + More content visible above the fold
  - Nav feels too wide at 220px, 180px might be better
  - Header bar still has too much vertical padding
  Verdict: Keep the sidebar, adjust width and header padding

Variant B (compact-header):
  + Single-bar header is much cleaner
  - Losing the title makes it harder to orient on first load
  Verdict: Keep compact header but restore a small title
```

---

## Creating the Master Version

Once you've tested a round of variants and collected notes:

1. List every specific change you want to keep
2. Apply those changes to the **main stylesheet** directly
3. Delete the variant CSS files and routes
4. Remove the UI Testing section from the settings modal
5. Reset `localStorage` for any users who had a variant selected

The variants are scaffolding. The goal is always to land the best version into the main codebase and delete the scaffolding.

---

## What This Is Not

- **Not a feature flag system** — there's no per-user targeting, no analytics, no gradual rollout
- **Not a permanent multi-theme system** — variants are temporary and get deleted after a testing round
- **Not a full redesign tool** — if more than one or two things need to change, that's a separate project

The point is to answer one question at a time with the least possible disruption to the existing codebase.
