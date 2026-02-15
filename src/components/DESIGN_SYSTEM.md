# Talk with Bookmarks — Design System Specs

Design system specification for the `src/components/` architecture. Uses Tailwind CSS v4 with CSS variables for theming. Dark mode is toggled via the `dark` class on a parent element.

---

## 1. Architecture

### Component Hierarchy

| Layer | Path | Purpose |
|-------|------|---------|
| **Atoms** | `atoms/` | Primitives: Button, Input, Select, Tabs, Progress |
| **Molecules** | `molecules/` | Composed components: MessageBubble, ChatInputForm, ModelSelector, etc. |
| **Organisms** | `organisms/` | Layout + orchestration: ChatHeader, MessageList |
| **Views** | `views/` | Full screens: MainView, ChatView, SummaryView, IndexingView, ConversationHistory |

### Stack

- **Styling**: Tailwind CSS v4, `@theme` + CSS variables
- **Utilities**: `class-variance-authority` (CVA), `cn` (clsx + tailwind-merge)
- **Icons**: lucide-react (16px default, 12px small)
- **UI Primitives**: Radix UI (Select, Tabs, Progress, Slot)
- **Animation**: tailwindcss-animate (accordion, fade, zoom, slide)

---

## 2. Color Tokens

All colors use HSL via `hsl(var(--token))` to support opacity modifiers (e.g. `bg-primary/90`).

### Light Theme (`:root`, `:host`)

| Token | HSL | Hex (approx) | Usage |
|-------|-----|--------------|-------|
| `--background` | 0 0% 100% | `#ffffff` | Page, body |
| `--foreground` | 222.2 84% 4.9% | `#0a0e14` | Primary text |
| `--card` | 0 0% 100% | `#ffffff` | Card surfaces |
| `--card-foreground` | 222.2 84% 4.9% | `#0a0e14` | Card text |
| `--popover` | 0 0% 100% | `#ffffff` | Dropdowns, overlays |
| `--popover-foreground` | 222.2 84% 4.9% | `#0a0e14` | Popover text |
| `--primary` | 222.2 47.4% 11.2% | `#141922` | Buttons, user bubbles |
| `--primary-foreground` | 210 40% 98% | `#f5f7f9` | Text on primary |
| `--secondary` | 210 40% 96.1% | `#f0f4f8` | TabsList, Progress track |
| `--secondary-foreground` | 222.2 47.4% 11.2% | `#141922` | Text on secondary |
| `--muted` | 210 40% 96.1% | `#f0f4f8` | Chat header, assistant bubbles |
| `--muted-foreground` | 215.4 16.3% 46.9% | `#64748b` | Labels, placeholders |
| `--accent` | 210 40% 96.1% | `#f0f4f8` | Hover states |
| `--accent-foreground` | 222.2 47.4% 11.2% | `#141922` | Text on accent |
| `--destructive` | 0 84.2% 60.2% | `#ef4444` | Stop, unload, errors |
| `--destructive-foreground` | 210 40% 98% | `#f5f7f9` | Text on destructive |
| `--border` | 214.3 31.8% 91.4% | `#e2e8f0` | Borders |
| `--input` | 214.3 31.8% 91.4% | `#e2e8f0` | Input borders |
| `--ring` | 222.2 84% 4.9% | `#0a0e14` | Focus ring |

### Dark Theme (`.dark`)

| Token | HSL | Hex (approx) | Usage |
|-------|-----|--------------|-------|
| `--background` | 222.2 84% 4.9% | `#0a0e14` | Page, body |
| `--foreground` | 210 40% 98% | `#f5f7f9` | Primary text |
| `--card` | 222.2 84% 4.9% | `#0a0e14` | Card surfaces |
| `--card-foreground` | 210 40% 98% | `#f5f7f9` | Card text |
| `--popover` | 222.2 84% 4.9% | `#0a0e14` | Dropdowns, overlays |
| `--popover-foreground` | 210 40% 98% | `#f5f7f9` | Popover text |
| `--primary` | 210 40% 98% | `#f5f7f9` | Primary surfaces |
| `--primary-foreground` | 222.2 47.4% 11.2% | `#141922` | Text on primary |
| `--secondary` | 217.2 32.6% 17.5% | `#243447` | TabsList, Progress track |
| `--secondary-foreground` | 210 40% 98% | `#f5f7f9` | Text on secondary |
| `--muted` | 217.2 32.6% 17.5% | `#243447` | Chat header, assistant bubbles |
| `--muted-foreground` | 215 20.2% 65.1% | `#94a3b8` | Labels, placeholders |
| `--accent` | 217.2 32.6% 17.5% | `#243447` | Hover states |
| `--accent-foreground` | 210 40% 98% | `#f5f7f9` | Text on accent |
| `--destructive` | 0 62.8% 30.6% | `#991b1b` | Stop, unload, errors |
| `--destructive-foreground` | 210 40% 98% | `#f5f7f9` | Text on destructive |
| `--border` | 217.2 32.6% 17.5% | `#243447` | Borders |
| `--input` | 217.2 32.6% 17.5% | `#243447` | Input borders |
| `--ring` | 212.7 26.8% 83.9% | `#cbd5e1` | Focus ring |

### Brand / Special

| Color | Hex | Usage |
|-------|-----|-------|
| Purple gradient start | `#9D4EDD` | Icon, accent highlights |
| Purple gradient end | `#5A189A` | Icon, chat bubble |
| Yellow (recommended) | `#eab308` / `text-yellow-500` | Recommended model badge |
| Background (app shell) | `bg-gray-50` | MainView outer (to migrate to `bg-background`) |
| Title text (app shell) | `text-gray-800` | MainView title (to migrate to `text-foreground`) |

---

## 3. Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--radius` | 0.5rem (8px) | `rounded-lg` | Base radius |
| `--radius-md` | calc(var(--radius) - 2px) = 6px | `rounded-md` | Buttons, inputs, tabs |
| `--radius-sm` | calc(var(--radius) - 4px) = 4px | `rounded-sm` | Tab trigger, select items |

---

## 4. Typography

| Token | Tailwind | Font Size | Weight | Usage |
|-------|----------|-----------|--------|-------|
| Base | `text-sm` | 14px | — | Body, inputs, buttons, bubbles |
| Small | `text-xs` | 12px | — | Meta text, labels, timestamps |
| Large | `text-xl` | 20px | `font-bold` | App title |
| Medium weight | `font-medium` | — | 500 | Buttons, active tab |
| Semibold | `font-semibold` | — | 600 | Select labels |

**Prose (SummaryCard)**: `prose prose-sm dark:prose-invert max-w-none` — uses Tailwind Typography defaults for article content in light/dark.

**Font stack**: `font-sans` (system sans-serif).

---

## 5. Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `p-1` / `p-2` / `p-3` | 4 / 8 / 12px | TabsList padding, ChatHeader, ChatInputForm |
| `px-3` / `px-4` | 12 / 16px | Input padding, page margins |
| `py-1.5` / `py-2` | 6 / 8px | Tab trigger, input |
| `gap-1` / `gap-2` | 4 / 8px | MessageBubble, ChatInputForm |
| `space-y-4` | 16px between children | MessageList, SummaryCard |
| `space-y-2` | 8px between children | SummaryCard nested |
| `mt-2` / `mt-10` | 8 / 40px | TabsContent, ChatEmptyState |
| `mb-2` | 8px | StatusDisplay |

---

## 6. Component Specs

### Button

| Prop | Values | Classes |
|------|--------|---------|
| `variant` | default, destructive, outline, secondary, ghost, link | See `buttonVariants` |
| `size` | default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10) | — |
| Base | — | `rounded-md text-sm font-medium transition-colors` |
| Focus | — | `ring-2 ring-ring ring-offset-2` |
| Disabled | — | `opacity-50 pointer-events-none` |

### Input

| Property | Value |
|----------|-------|
| Height | `h-10` (40px) |
| Padding | `px-3 py-2` |
| Border | `border border-input` |
| Radius | `rounded-md` |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Placeholder | `text-muted-foreground` |

### Select

| Part | Spec |
|------|------|
| Trigger | `h-10` (or `h-9` in ModelSelector), `rounded-md`, `border-input` |
| Content | `rounded-md`, `bg-popover text-popover-foreground`, `shadow-md`, animate-in/out |
| Item | `py-1.5 pl-8 pr-2`, `rounded-sm`, focus: `bg-accent text-accent-foreground` |
| Icon size | `h-4 w-4` |

### Tabs

| Part | Spec |
|------|------|
| TabsList | `h-10`, `rounded-md`, `bg-muted`, `text-muted-foreground`, `p-1` |
| TabsTrigger | `rounded-sm px-3 py-1.5 text-sm font-medium`, active: `bg-background text-foreground shadow-sm` |
| TabsContent | `mt-2` |

### Progress

| Part | Spec |
|------|------|
| Root | `h-4`, `rounded-full`, `bg-secondary` |
| Indicator | `bg-primary`, `transition-all` |

### MessageBubble

| Role | Background | Text |
|------|------------|------|
| User | `bg-primary` | `text-primary-foreground` |
| Assistant | `bg-muted` | `text-foreground` |
| Container | `rounded-lg px-3 py-2`, `max-w-[90%]` |
| Meta | `text-xs text-muted-foreground` |

---

## 7. Icon Sizes

| Context | Size | Tailwind |
|---------|------|----------|
| Default (button, header) | 16px | `h-4 w-4` |
| Small (badge, inline) | 12px | `h-3 w-3` |
| Copy in MessageBubble | 12px | `h-3 w-3` |

---

## 8. Layout

| Element | Spec |
|---------|------|
| App shell | `w-[399px] h-full flex flex-col` |
| Main title | `px-4 pt-4 pb-2 shrink-0` |
| Tabs container | `px-4 pt-2 shrink-0` |
| Tab content | `flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col` |
| Chat input area | `p-3 border-t bg-background flex gap-2` |
| Message list | `flex-1 overflow-y-auto p-3 space-y-4` |

---

## 9. Focus & Accessibility

- All interactive elements use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Ring color follows theme (`--ring`)
- Disabled state: `opacity-50`, `cursor-not-allowed` (inputs), `pointer-events-none` (buttons)

---

## 10. Dark Mode

- **Toggle**: Add or remove the `dark` class on `html` or a parent wrapper
- **Config**: `darkMode: ["class"]` in Tailwind config
- **Components**: Semantic tokens (`background`, `foreground`, etc.) switch automatically
- **Prose**: Use `dark:prose-invert` for article content (e.g. SummaryCard)
- **Hardcoded colors**: Replace `bg-gray-50`, `text-gray-800` with `bg-background`, `text-foreground`

---

## 11. File Reference

| File | Purpose |
|------|---------|
| `src/ui/globals.css` | Theme variables (`:root` + `.dark`), `@theme` mapping |
| `tailwind.config.js` | Color aliases, radius, animations |
| `src/components/atoms/*` | Primitives |
| `src/utils` (cn) | `clsx` + `tailwind-merge` for class composition |
