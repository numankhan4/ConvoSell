# ConvoSell - Brand Design Guidelines

## Brand Identity

### Brand Name
**ConvoSell** - Convert Conversations into Sales

### Tagline
"Turn WhatsApp Chats into Confirmed Orders"

### Brand Story
ConvoSell helps Pakistani e-commerce sellers eliminate fake COD orders through intelligent WhatsApp-based order verification. We reduce fake orders by 70% with automated confirmation workflows.

### Brand Values
- **Simplicity**: Clean, intuitive interfaces
- **Efficiency**: Fast, responsive user experience - verify orders in seconds
- **Professionalism**: Enterprise-grade B2B SaaS design
- **Trust**: Reliable order verification and fraud reduction

---

## Color System

### Primary Colors (ConvoSell Green)
```
Primary (WhatsApp Green - Trust & Familiarity):
- Primary 50:  #E8F5E9
- Primary 100: #C8E6C9
- Primary 200: #A5D6A7
- Primary 300: #81C784
- Primary 400: #66BB6A
- Primary 500: #25D366 (Main ConvoSell Green)
- Primary 600: #1EAB56
- Primary 700: #128C7E
- Primary 800: #075E54
- Primary 900: #054F45
```

### Secondary Colors (Royal Blue - Professional)
```
Blue (Professional & Enterprise):
- Blue 50:  #EFF6FF
- Blue 100: #DBEAFE
- Blue 200: #BFDBFE
- Blue 300: #93C5FD
- Blue 400: #60A5FA
- Blue 500: #3B82F6
- Blue 600: #2563EB (Main Secondary - Professional)
- Blue 700: #1D4ED8
- Blue 800: #1E40AF
- Blue 900: #1E3A8A
```

### Accent Colors
```
Amber (Action & Conversion):
- Amber 50:  #FFFBEB
- Amber 100: #FEF3C7
- Amber 200: #FDE68A
- Amber 300: #FCD34D
- Amber 400: #FBBF24
- Amber 500: #F59E0B (Main Accent - Call to Action)
- Amber 600: #D97706
- Amber 700: #B45309
- Amber 800: #92400E
- Amber 900: #78350F

Slate (Neutral Gray):
- Slate 50:  #F8FAFC
- Slate 100: #F1F5F9
- Slate 200: #E2E8F0
- Slate 300: #CBD5E1
- Slate 400: #94A3B8
- Slate 500: #64748B
- Slate 600: #475569
- Slate 700: #334155
- Slate 800: #1E293B
- Slate 900: #0F172A

Red (Error/Danger):
- Red 500: #EF4444
- Red 600: #DC2626

Green (Success - Alternative):
- Green 500: #10B981
- Green 600: #059669
```

---

## Responsive Design & Mobile-First

### Breakpoints (Tailwind CSS)
```css
sm: 640px   // Small devices (landscape phones)
md: 768px   // Medium devices (tablets) 
lg: 1024px  // Large devices (desktops)
xl: 1280px  // Extra large devices
2xl: 1536px // 2X large devices
```

### Mobile-First Principles
1. **Design for mobile first**, then enhance for larger screens
2. Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
3. Stack vertically on mobile, horizontally on desktop
4. Hide/show elements: `hidden lg:block` or `lg:hidden`

### Responsive Patterns

**Navigation**
- Mobile: Hamburger menu, slide-in sidebar
- Desktop: Fixed sidebar always visible

**Grid Layouts**
- Mobile: `grid-cols-1` (single column)
- Tablet: `md:grid-cols-2` (2 columns)
- Desktop: `lg:grid-cols-3` or `lg:grid-cols-4`

**Typography Scaling**
- Mobile: `text-sm`, `text-base`, `text-lg`
- Desktop: `lg:text-lg`, `lg:text-xl`, `lg:text-2xl`

**Spacing**
- Mobile: Compact (`p-4`, `gap-4`, `space-y-4`)
- Desktop: Generous (`lg:p-6`, `lg:gap-6`, `lg:space-y-6`)

**Touch Targets**
- Minimum: 44x44px for mobile interactivity
- Buttons: Extra padding on mobile (`py-3 px-5`)
- Increase spacing between clickable elements

### Common Responsive Classes
```tsx
// Container padding
<div className="px-4 sm:px-6 lg:px-8">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Show/hide based on screen
<div className="lg:hidden"> // Mobile only
<div className="hidden lg:block"> // Desktop only

// Responsive flex direction
<div className="flex flex-col lg:flex-row">
```

---

## Typography

### Font Family
```
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: 'Fira Code', 'Courier New', monospace
```

### Font Sizes
```
xs:  0.75rem  (12px)
sm:  0.875rem (14px)
base: 1rem    (16px)
lg:  1.125rem (18px)
xl:  1.25rem  (20px)
2xl: 1.5rem   (24px)
3xl: 1.875rem (30px)
4xl: 2.25rem  (36px)
```

### Font Weights
```
Regular: 400
Medium:  500
Semibold: 600
Bold:    700
```

---

## Spacing System

Based on 4px grid:
```
0:  0px
1:  4px
2:  8px
3:  12px
4:  16px
5:  20px
6:  24px
8:  32px
10: 40px
12: 48px
16: 64px
20: 80px
24: 96px
```

---

## Border Radius

```
sm: 0.375rem (6px)
md: 0.5rem   (8px)
lg: 0.75rem  (12px)
xl: 1rem     (16px)
2xl: 1.5rem  (24px)
full: 9999px (Pills/Circles)
```

---

## Shadows

```
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

---

## Component Guidelines

### Buttons
- **Primary**: WhatsApp green background, white text
- **Secondary**: Slate gray background, white text
- **Outline**: Border with transparent background
- **Ghost**: No background, hover effect only
- **Height**: 40px (base), 36px (small), 44px (large)
- **Padding**: 16px horizontal
- **Border Radius**: 8px
- **Font Weight**: 500 (Medium)

### Input Fields
- **Height**: 40px
- **Border**: 1px solid slate-300
- **Focus**: 2px ring primary-500
- **Border Radius**: 8px
- **Padding**: 12px
- **Placeholder**: slate-400

### Cards
- **Background**: White
- **Border**: 1px solid slate-200
- **Border Radius**: 12px
- **Shadow**: shadow-sm
- **Padding**: 24px

### Navigation
- **Height**: 64px
- **Background**: White
- **Border Bottom**: 1px solid slate-200
- **Logo Size**: 32px height

### Sidebar
- **Width**: 240px (collapsed: 64px)
- **Background**: Slate-50
- **Active Item**: Primary-50 background, primary-600 text
- **Hover**: Slate-100 background

---

## Layout System

### Container
- **Max Width**: 1280px
- **Padding**: 24px

### Grid
- **Gap**: 24px
- **Columns**: 12-column grid system

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## Icons

**Icon Library**: Lucide React or Heroicons
**Size**: 20px (default), 16px (small), 24px (large)
**Stroke Width**: 2px

---

## Animation & Transitions

### Duration
```
fast: 150ms
base: 200ms
slow: 300ms
```

### Easing
```
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Common Transitions
- Button hover: 150ms ease-in-out
- Modal open/close: 200ms ease-in-out
- Sidebar expand: 300ms ease-in-out

---

## Accessibility

- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
- **Focus Indicators**: 2px ring on all interactive elements
- **Font Size**: Minimum 14px for body text
- **Touch Targets**: Minimum 44×44px
- **Keyboard Navigation**: Full support

---

## Usage Examples

### Primary Button
```tsx
<button className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
  Send Message
</button>
```

### Card Component
```tsx
<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
  {/* Content */}
</div>
```

### Input Field
```tsx
<input className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
```

---

## Best Practices

1. **Consistency**: Use design tokens throughout the application
2. **Whitespace**: Generous padding and margins for breathing room
3. **Hierarchy**: Clear visual hierarchy with typography and spacing
4. **Feedback**: Provide immediate visual feedback for user actions
5. **Loading States**: Show loading indicators for async operations
6. **Empty States**: Design meaningful empty state illustrations
7. **Error Handling**: Clear, actionable error messages
8. **Mobile First**: Design for mobile, enhance for desktop

---

**Version**: 1.0.0  
**Last Updated**: March 29, 2026  
**Maintained by**: WhatsApp CRM Team
