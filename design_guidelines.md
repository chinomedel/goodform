# GoodForm Design Guidelines

## Design Approach: Design System Foundation
**Selected System**: Material Design 3 principles with Linear-inspired refinement  
**Justification**: GoodForm is a utility-focused, data-intensive productivity tool requiring clear hierarchy, efficient workflows, and professional aesthetics. The combination provides modern polish while maintaining functional clarity.

**Key Principles**:
- Clarity over decoration: Every element serves a purpose
- Efficiency first: Minimize clicks and cognitive load
- Professional polish: Enterprise-ready aesthetics
- Scalable complexity: Handles simple to complex forms gracefully

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Primary: 240 60% 50% (Professional blue - CTAs, active states)
- Surface: 0 0% 98% (Page backgrounds)
- Surface Elevated: 0 0% 100% (Cards, panels)
- Text Primary: 220 15% 20%
- Text Secondary: 220 10% 45%
- Border: 220 15% 90%
- Success: 140 50% 45% (Published forms, positive actions)
- Warning: 40 95% 55% (Preview mode, pending states)
- Destructive: 0 70% 50% (Delete actions)

**Dark Mode**:
- Primary: 240 60% 60%
- Surface: 220 15% 10%
- Surface Elevated: 220 15% 14%
- Text Primary: 0 0% 95%
- Text Secondary: 220 10% 65%
- Border: 220 15% 25%

### B. Typography

**Font Families** (Google Fonts):
- Primary: 'Inter' (UI elements, body text) - weights 400, 500, 600
- Display: 'Cal Sans' or 'Inter' (headings) - weights 600, 700

**Scale**:
- Display (H1): text-4xl (36px) font-semibold
- Heading (H2): text-2xl (24px) font-semibold  
- Subheading (H3): text-xl (20px) font-medium
- Body: text-base (16px) font-normal
- Small: text-sm (14px) font-normal
- Micro: text-xs (12px) font-medium (labels, metadata)

### C. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 8, 12, 16, 24
- Micro spacing (gaps, padding): 2, 4
- Component internal: 4, 8
- Section spacing: 12, 16
- Page margins: 16, 24

**Grid Structure**:
- Container: max-w-7xl mx-auto px-8
- Form builder: 3-column layout (tools sidebar 280px | canvas flex-1 | properties 320px)
- Dashboard: 2-column responsive (sidebar 240px | main flex-1)
- Data tables: Full width with horizontal scroll on mobile

### D. Component Library

**Navigation**:
- Top header: 64px fixed, contains logo, global search, user menu, theme toggle
- Sidebar navigation: 240px collapsible with icon + label items
- Breadcrumbs: text-sm with chevron separators for deep navigation

**Form Builder Components**:
- Canvas: Bordered container with drop zones, draggable field items
- Field palette: Categorized grid of draggable field types with icons
- Properties panel: Tabbed interface (Settings | Validation | Logic)
- Preview toggle: Prominent button to switch between edit/preview modes

**Data Display**:
- Cards: Elevated surface with subtle shadow, 16px padding
- Tables: Striped rows (hover state), sticky headers, inline actions
- Dashboard charts: Card-based with Chart.js or Recharts integration
- Stats cards: Large number (text-3xl) with label and trend indicator

**Forms & Inputs**:
- All inputs: rounded-md border, focus:ring-2 ring-primary/20
- Text fields: h-10 px-3 with floating labels
- Select dropdowns: Custom styled with chevron icon
- Checkboxes/Radio: Custom styled with primary color
- File upload: Drag-and-drop zone with progress indicator

**Buttons**:
- Primary: bg-primary text-white rounded-md px-4 h-10 font-medium
- Secondary: border border-border bg-surface-elevated
- Ghost: text-primary hover:bg-primary/5
- Icon buttons: w-10 h-10 rounded-md hover:bg-surface-elevated

**Modals & Overlays**:
- Modals: Centered, max-w-2xl, rounded-lg with backdrop blur
- Drawers: Slide from right, w-96 for quick actions
- Toasts: Top-right, 4-second duration, with icon

**Role Indicators**:
- Badge components for roles (Admin/Gestor/Visualizador)
- Color-coded: Admin (purple), Gestor (blue), Visualizador (gray)
- Permission icons: Lock (private), Globe (public), Users (shared)

### E. Page-Specific Layouts

**Login/Auth Pages**:
- Split screen: Left (480px) with brand, right (flex-1) with form
- Form container: max-w-sm centered with 48px vertical spacing
- Social login buttons: Full width, icon + text

**Dashboard**:
- Grid of stat cards (4 columns on desktop, 2 on tablet, 1 on mobile)
- Recent forms table with inline actions (Edit, Preview, Share, Delete)
- Chart section: 2-column layout (responses over time + field analytics)

**Form Builder**:
- Full height layout minus header
- Sticky toolbars for save/publish/preview actions
- Real-time validation feedback in properties panel
- Drag handles with visual feedback during drag operations

**Form List View**:
- Filterable/searchable header with view toggles (grid/list)
- Grid: 3-column cards with thumbnail preview
- List: Table with columns (Name, Status, Responses, Modified, Actions)
- Bulk actions toolbar when items selected

**Public Form View**:
- Clean, centered layout (max-w-2xl)
- Progress indicator for multi-page forms
- Branded header with form title and description
- Submit button: Large, prominent, primary color

### F. Animations

Use sparingly:
- Page transitions: None (instant for performance)
- Micro-interactions: Hover scale on cards (scale-[1.02]), button press feedback
- Loading states: Spinner for async operations, skeleton screens for data fetching
- Drag-and-drop: Opacity 0.5 while dragging, smooth drop animations

---

## Images

**Dashboard Welcome Section** (Optional if empty state):
- Illustration of form creation workflow (abstract, colorful, 400x300px)
- Placement: Center of empty dashboard before first form is created

**Marketing/About Page** (If included):
- Hero: Team collaboration illustration, full-width, 60vh height
- Features: 3 icons representing Create/Share/Analyze (inline SVG or icon library)

**No large hero images** needed for app interface - focus on functional clarity over visual storytelling.

---

## Accessibility & UX Standards

- All form inputs: Visible labels, WCAG AA contrast ratios
- Interactive elements: Minimum 44x44px touch targets
- Keyboard navigation: Tab order follows visual hierarchy, focus indicators always visible
- Screen reader: Proper ARIA labels for complex interactions (drag-and-drop, modals)
- Error messages: Inline validation with clear recovery instructions
- Dark mode: Full support with consistent implementation including all inputs

---

## Consistency Rules

- Use icons from Heroicons (outline for navigation, solid for buttons)
- Maintain 8px baseline grid for vertical rhythm
- Never exceed 3 levels of visual hierarchy on a single screen
- Keep action buttons (Save, Publish, Delete) in consistent locations across views
- Form submission always shows success toast + redirects to form list