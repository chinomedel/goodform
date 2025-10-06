# GoodForm Design Guidelines

## Design System
**Foundation**: Material Design 3 + Linear aesthetics for enterprise productivity  
**Principles**: Precision over decoration | Workflow velocity | Enterprise credibility | Intelligent density

---

## Color Palette

### Light Mode
```
Primary: hsl(240 65% 55%) | Hover: hsl(240 65% 48%)
Surface Base: hsl(0 0% 98%) | Elevated: hsl(0 0% 100%) | Overlay: hsl(220 15% 96%)
Text Primary: hsl(220 15% 18%) | Secondary: hsl(220 10% 42%) | Tertiary: hsl(220 8% 58%)
Border Default: hsl(220 15% 88%) | Subtle: hsl(220 10% 93%)
Success: hsl(142 52% 42%) | Warning: hsl(38 92% 58%) | Error: hsl(0 72% 52%) | Info: hsl(210 60% 55%)
```

### Dark Mode
```
Primary: hsl(240 60% 62%) | Hover: hsl(240 60% 70%)
Surface Base: hsl(220 15% 9%) | Elevated: hsl(220 15% 13%) | Overlay: hsl(220 15% 16%)
Text Primary: hsl(0 0% 96%) | Secondary: hsl(220 10% 68%) | Tertiary: hsl(220 8% 48%)
Border Default: hsl(220 15% 24%) | Subtle: hsl(220 12% 18%)
```

### Semantic Colors
**Role Badges**: Admin (Purple hsl(270 60% 55%)) | Gestor (Blue - primary) | Visualizador (Gray hsl(220 10% 45%))

---

## Typography
**Fonts**: Inter (Google Fonts) - weights 400, 500, 600, 700

```
Display Large: text-5xl font-bold leading-tight tracking-tight
Display: text-4xl font-semibold leading-tight
Headline: text-2xl font-semibold leading-snug
Title: text-xl font-semibold leading-normal
Body Large: text-base font-normal leading-relaxed
Body: text-sm font-normal leading-normal
Label: text-xs font-medium leading-tight tracking-wide uppercase
Caption: text-xs font-normal leading-tight
```

---

## Layout System

**Spacing Scale**: 2, 4, 6, 8, 12, 16, 20, 24, 32 (Tailwind units)
- Micro (2,4): icon spacing | Component (6,8,12): padding/gaps | Section (16,20,24): dividers | Layout (32): page-level

**Grid Architecture**:
```
Global: max-w-[1920px] mx-auto
Content: max-w-7xl mx-auto px-8
Form Builder: Palette 280px | Canvas flex-1 min-w-0 | Properties 360px
Dashboard: Sidebar 256px | Main flex-1 max-w-[1400px]
Breakpoints: Mobile-first, collapse sidebars <1024px
```

**Baseline Grid**: 8px vertical rhythm, max 3 hierarchy levels per view

---

## Core Components

### Navigation
**Header** (h-16, fixed, z-50): Logo + name (left) | Search bar cmd+k (center, max-w-md) | Notifications/theme/avatar (right) | Bottom border + subtle shadow

**Sidebar** (w-64, sticky): Collapsible to w-20 | Sections: Dashboard/Forms/Responses/Analytics/Settings | Active: Primary bg 10% opacity + left border | Icons: Heroicons outline 24px

**Breadcrumbs**: text-sm, chevron separators (›), last crumb bold, py-4 below header

### Form Builder
**Palette**: Categorized accordions, draggable cards with icon + name, hover scale-102, visual drag handle (⋮⋮)

**Canvas**: max-w-3xl centered, drop zones (border-dashed border-2), active zone (primary border + bg tint), fields as elevated cards with inline controls

**Properties Panel**: Tabs (Settings|Validation|Logic|Design) with pill style, floating labels, real-time preview

**Action Bar** (sticky top-16): Editable title (left, h2) | Save draft/Preview/Publish (right, primary prominent) | Auto-save timestamp

### Inputs & Controls
**Text Inputs**: h-11 px-4 rounded-lg border | Focus: ring-2 ring-primary/20 border-primary | Floating labels | Helper text-xs text-secondary below | Error: border-error + icon

**Selects**: Match input styling, custom chevron, dropdown (elevated surface, rounded-lg, shadow-lg), hover:bg-surface-overlay, selected:bg-primary/10

**Checkboxes/Radio** (20x20px): rounded-md/rounded-full, checked (primary bg + white mark), focus ring-2 ring-primary/20

**File Upload**: Drag zone min-h-48 border-dashed border-2, hover (border-primary + bg tint), progress bar, file list with remove buttons

**Buttons**:
```
Primary: bg-primary text-white h-11 px-6 rounded-lg font-medium hover:bg-primary-hover
Secondary: bg-surface-elevated border hover:bg-surface-overlay
Ghost: text-primary hover:bg-primary/5
Icon: w-11 h-11 rounded-lg
Loading: Spinner replaces content
```

### Data Display
**Cards**: surface-elevated bg, 1px border-subtle, rounded-xl, p-6 (standard)/p-4 (compact), shadow-sm hover:shadow-md

**Status Badges** (rounded-full px-3 py-1 text-xs font-medium): Draft (gray) | Published (success + white text) | Archived (tertiary on subtle bg)

**Stats Cards**: p-6 rounded-lg border, metric (text-4xl font-bold), label (text-sm text-secondary), trend arrow + %

**Tables**: Sticky header with sort indicators, hover row bg change, bulk selection with floating action bar, quick action icons

### Overlays
**Modal**: Backdrop (bg-black/40 backdrop-blur-sm), panel (max-w-2xl bg-surface-elevated rounded-2xl p-8), header text-2xl mb-6, footer (flex justify-end gap-3 pt-6 border-t)

**Slide-over**: w-96/w-[600px], full height, slide from right, close button top-right

**Toast** (top-right stack): max-w-sm, auto-dismiss 4s/6s, icon + message + dismiss, border-left accent (success/error)

---

## Page Layouts

**Login**: Split (left 480px gradient brand panel with logo/tagline | right flex-1 centered form max-w-sm)

**Dashboard**: Stats grid (4 cards) | Recent forms table with search/filter | Optional activity sidebar | Empty: centered illustration 400x300 + CTA

**Form Builder**: Full viewport, 3-column resizable, sticky action bar, autosave indicator, exit confirmation if unsaved

**Form List**: Header (title/search/filters/view toggle/Create button) | Grid (3-col cards) or List (data table) | Pagination footer

**Public Form**: max-w-2xl centered, branded header, progress indicator, fields gap-8, submit button h-14 (full-width mobile), success screen with animation

**Analytics**: Date selector + export header | Summary cards | Tabs (Overview|Responses|Field Analytics|Export) | Charts + data table

---

## Animations
**Micro-interactions only** (no page transitions):
```
Card hover: scale-[1.01] duration-150
Button press: scale-[0.98] active
Drag: opacity-50 dragging, 200ms ease drop
Modal: Fade backdrop + scale 95%→100%
Toast: Slide from right + fade
Loading: CSS spinner for async ops
```

---

## Illustrations
**Dashboard Empty**: 3D forms/docs floating (400x300), gradient primary palette, centered  
**Builder Empty Canvas**: Drag gesture line art (320x240), primary accent, centered SVG  
**Error Pages**: Abstract broken connection (600x400), monochrome + primary accent  
**No hero images** - utility-focused app

---

## Accessibility & Standards

**WCAG**: AAA body text, AA interactive elements | Touch targets 44x44px min | Keyboard nav with visible focus rings (ring-2 ring-primary/50)  
**Screen readers**: Semantic HTML, ARIA labels, live regions for updates  
**Forms**: Inline errors with icons, clear recovery, preserve input  
**Responsive**: Mobile-first, sidebars→bottom sheets <1024px  
**Dark mode**: Complete implementation all components

---

## Consistency Rules

✓ **Heroicons only** (outline for nav/large, solid for buttons/small)  
✓ **8px baseline grid** for vertical rhythm  
✓ **Rounded-lg** for all form components (never mix radii in same group)  
✓ **Action positions**: Save (left/center), Cancel (left), Destructive (right + confirmation)  
✓ **Status changes** always show toast notification  
✓ **Destructive actions** require confirmation modal with explicit labels  
✓ **Form submissions** show success toast + redirect/inline confirmation  

**Icons/Assets**: Shield (Admin), User (Gestor), Eye (Visualizador) for role badges

---

**Token count target: <2000** | All critical design rules, code examples, accessibility standards, and visual specifications preserved for immediate developer implementation.