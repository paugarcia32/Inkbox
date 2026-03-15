# Inkbox — Brand & Design System

> *The internet can wait.*

---

## Identity

| | |
|---|---|
| **Product name** | inkbox (lowercase in UI, "Inkbox" in text) |
| **Tagline** | *The internet can wait.* |
| **Closing line** | *Save now. Read when it matters.* |
| **Voice** | Calm, focused, minimal. Never pushy. |

---

## Colors

All tokens are defined in `apps/web/src/app/globals.css` under `@theme`.

### Warm Stone (neutral scale)

Used for backgrounds, surfaces, text, and borders in both modes.

| Token | Hex | Usage |
|---|---|---|
| `stone-50` | `#FAFAF8` | Page background (light) |
| `stone-100` | `#F4F2EE` | Surface / cards (light) |
| `stone-200` | `#EAE6DF` | Borders (light) |
| `stone-400` | `#B5ADA3` | Placeholder text |
| `stone-500` | `#8C837A` | Muted / secondary text |
| `stone-600` | `#635C54` | Body text (light mode) |
| `stone-700` | `#312D29` | Borders (dark) |
| `stone-800` | `#1E1C19` | Cards / surfaces (dark) |
| `stone-900` | `#131110` | Page background (dark) |
| `stone-950` | `#0C0B0A` | Deepest bg / sidebar (dark) |

### Accent — Terracotta

A single warm orange accent, inspired by Anthropic's brand palette. Used for CTAs, links, highlights, and key data points.

| Token | Hex | Usage |
|---|---|---|
| `accent-50` | `#FEF3EC` | Tinted icon backgrounds |
| `accent-200` | `#F6BE99` | Selection highlight bg |
| `accent-400` | `#E07042` | Hover state |
| `accent-500` | `#C95829` | **Primary** — buttons, links, highlights |
| `accent-600` | `#A3431C` | Pressed / darker state |
| `accent-700` | `#7A3011` | Selection highlight text |

### Usage rules

- **One accent** — never use more than one accent color per view.
- **Dark mode** uses the same accent-500; it's vivid enough on dark backgrounds.
- **Semantic meaning**: accent = action / importance. Don't use it decoratively.
- Never put `accent-500` text on `accent-100` or lighter (contrast too low).
- In dark mode, prefer `stone-800` for card surfaces over `stone-900` (maintains layer hierarchy).

---

## Typography

### Font

**Plus Jakarta Sans** — loaded via `next/font/google`.

Chosen because it's clean and modern like Inter, but with slightly rounded terminals that feel warmer and less sterile.

```tsx
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});
```

### Scale

| Class | Size | Weight | Usage |
|---|---|---|---|
| `text-xs tracking-widest uppercase` | 11px | 600 | Section labels, metadata |
| `text-sm` | 14px | 400/500 | Body, labels, captions |
| `text-base` | 16px | 400 | Default body |
| `text-lg` | 18px | 400 | Lead paragraphs |
| `text-2xl font-semibold` | 24px | 600 | Page titles |
| `text-4xl–6xl font-bold` | 36–60px | 700 | Hero headings |

### Rules

- Minimum body size: **14px** (`text-sm`). Never smaller for running text.
- Line height: `leading-relaxed` (1.625) for body, `leading-snug` for headings.
- Section labels: `text-xs font-semibold uppercase tracking-widest text-stone-400` — consistent everywhere.
- Avoid `font-black` (900). Max weight is `font-bold` (700).

---

## Icons

**Package:** `@heroicons/react` (v2, already installed in `apps/web`)

**Style:** Always use the **outline** variant (`@heroicons/react/24/outline`).
Use solid (`/24/solid`) only for **active navigation states**.

```tsx
// ✅ correct
import { BookmarkIcon } from '@heroicons/react/24/outline';
<BookmarkIcon className="size-5" />

// ✅ correct — active nav state
import { BookmarkIcon } from '@heroicons/react/24/solid';

// ❌ wrong — mixing styles in the same context
```

### Sizing

| Context | Class | px |
|---|---|---|
| Inline with text | `size-4` | 16px |
| Button / input adornment | `size-5` | 20px |
| Feature / card icon | `size-5` | 20px |
| Empty states | `size-8` | 32px |
| Illustration-sized | `size-12` | 48px |

### Brand/platform icons

For logos not in Heroicons (X/Twitter, Pinterest, YouTube), keep a minimal inline SVG in the same file or in `src/components/icons/brands.tsx`. These are the **only** exceptions to the Heroicons rule.

---

## Spacing

4px base grid. Use Tailwind's default scale — every value is a multiple of 4.

| Purpose | Value |
|---|---|
| Component inner padding (sm) | `p-3` / `px-3.5 py-2.5` |
| Component inner padding (md) | `p-4` / `p-5` |
| Gap between related elements | `gap-2` / `gap-3` |
| Gap between sections | `gap-6` / `gap-8` |
| Section vertical padding | `py-16` / `py-24` |
| Max content width | `max-w-5xl` |
| Horizontal page padding | `px-6` |

---

## Components

### Buttons

```tsx
// Primary
<button className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 active:bg-accent-700">

// Secondary (ghost/outline)
<button className="rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 transition hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800">

// Ghost (no border)
<button className="px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 transition hover:text-stone-900 dark:hover:text-stone-100">
```

### Inputs

```tsx
<input className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15" />
```

### Cards

```tsx
// Default card
<div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-5">

// Interactive card (hover state)
<div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-5 transition hover:border-stone-300 dark:hover:border-stone-600">
```

### Section labels

```tsx
<h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
  Section name
</h2>
```

---

## Dark Mode

Dark mode is class-based: the `.dark` class on `<html>` activates it.
Managed by `ThemeToggle` component, persisted in `localStorage`.

### Layer hierarchy in dark mode

```
stone-950  ← page background / sidebar
stone-900  ← (secondary bg, rarely used)
stone-800  ← card / panel surface
stone-700  ← borders, dividers
stone-500  ← muted text
stone-100  ← primary text (on dark)
```

### Rules

- **Never** put dark mode hardcoded colors in components — always use `dark:` Tailwind utilities.
- Background: `dark:bg-stone-950` on the root, `dark:bg-stone-800` for cards.
- Borders: `dark:border-stone-700` (not stone-800 — too invisible).
- Text: `dark:text-stone-100` primary, `dark:text-stone-400` secondary.
- The accent (`accent-500`) stays the same in both modes.

---

## Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Use `text-xs uppercase tracking-widest` for section labels | Use emoji as icons |
| Use Heroicons outline as default | Mix outline and solid icons in the same UI layer |
| One primary CTA per screen | Use multiple `bg-accent-500` buttons side by side |
| `dark:bg-stone-800` for cards | `dark:bg-black` or raw hex in dark mode |
| Keep `max-w-5xl` for page content | Full-bleed text content without a max-width |
| Use `rounded-lg` (8px) for controls | Mix `rounded-md`, `rounded-xl`, `rounded-full` randomly |
