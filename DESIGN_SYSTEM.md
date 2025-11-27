# Design System Documentation

This document outlines the design language and coding standards for the application. The goal is to maintain a consistent look and feel across all pages, including the embedded agent interface.

## Core Principles

*   **Hard Angles & Clean Lines:** We prefer sharper corners (`border-radius: 4px` or `6px`) for interactive elements like buttons and inputs. Larger containers may have slightly softer corners (`12px` or `16px`).
*   **Flat Design:** Minimal use of heavy shadows or gradients. We rely on borders and subtle background color changes for hierarchy.
*   **Theming:** All colors must use CSS variables to support Light, Dark, and Source themes.
*   **Semantic CSS:** We use standard CSS classes (e.g., `.card`, `.button`) defined in `static/styles.css`, avoiding utility-first frameworks like Tailwind in the final output.

## CSS Variables (Theming)

Always use these variables instead of hardcoded hex values.

| Variable | Description |
| :--- | :--- |
| `--bg-color` | Main page background. |
| `--text-color` | Primary text color. |
| `--info-text` | Secondary/Meta text color. |
| `--card-bg` | Background for cards and containers. |
| `--border-color` | Border color for cards, inputs, and dividers. |
| `--button-bg` | Primary button background. |
| `--button-text` | Primary button text color. |
| `--button-hover-bg` | Primary button hover state. |
| `--input-bg` | Background for text inputs and selects. |
| `--error-text` / `--error-bg` | Error messages. |
| `--accent-color` | Used for special highlights or auth buttons. |

## Typography

*   **Font Family:** System fonts (`-apple-system, BlinkMacSystemFont, ...`).
*   **Headings:**
    *   `h1`: 2rem, weight 600.
    *   `h2`: 1.5rem, weight 600.
    *   `h3`: 1.1rem, weight 600.
*   **Body Text:** Line height `1.6`.

## Components

### Buttons
Use `.chart-btn` (or similar variants like `.nav-btn`, `.refresh-btn`) for a consistent look.

```css
.button {
    background: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--button-bg);
    padding: 8px 16px;
    border-radius: 4px; /* Hard angle preference */
    cursor: pointer;
    font-weight: 500;
}
```

### Cards
Use `.model-card` or `.card` (if added) for content containers.

```css
.card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px; /* Or 12px for larger sections */
    padding: 20px;
}
```

### Inputs
Inputs should have `border-radius: 4px` or `6px` and use `--input-bg`.

```css
input[type="text"] {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-color);
}
```

## Agent Interface Specifics

The agent interface is embedded via iframe but should share the same design DNA.

*   **Shell:** `.agent-shell` in `styles.css`.
*   **Chat Bubbles:**
    *   **User:** Dark background (`var(--button-bg)`), White text (`var(--button-text)`), sharper corners.
    *   **AI:** Light/Card background (`var(--info-bg)`), Dark text (`var(--text-color)`), border (`var(--border-color)`).

## Formatting New Pages

1.  **Link Styles:** Always include `<link rel="stylesheet" href="static/styles.css">`.
2.  **Container:** Wrap main content in a `.container`.
3.  **Use Variables:** Never use `#ffffff` or `#000000` directly; use `var(--bg-color)` etc.
4.  **Avoid Tailwind:** Remove any Tailwind CDN links and convert classes to the semantic equivalents found in `styles.css`.
