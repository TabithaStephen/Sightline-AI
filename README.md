# SIGHTLINE
### The web, on your terms.

SIGHTLINE is an AI-assisted accessibility companion designed to help people with visual impairments navigate complex digital experiences more easily.

Instead of struggling with visually overwhelming websites, users describe what they want to accomplish. SIGHTLINE simplifies information, explains available options, and guides users through tasks while keeping them in control.

SIGHTLINE is built to work **alongside** screen readers and other assistive tools. It does not replace them.

## Problem

Many websites contain dense layouts, confusing navigation, inconsistent controls, and lengthy forms. These experiences can make everyday online tasks unnecessarily difficult for people with visual impairments.

## Solution

SIGHTLINE transforms complex tasks into simplified, guided experiences.

- Natural-language task input
- Intent understanding with a visible, correctable summary
- Simplified information in plain language
- Contextual recommendations with stated reasons
- Guided task completion, one decision at a time
- Form assistance with clear, specific error messages
- User control over consequential actions

## MVP: guided flight booking (simulated)

The prototype takes a user from a sentence to a confirmed demo booking:

1. **Task entry** — type a request such as *"Find me a direct flight from Bengaluru to Mumbai under ₹8,000"*, pick an example, or dictate it if the browser supports speech input.
2. **Request interpretation** — SIGHTLINE shows what it understood (origin, destination, budget, direct-only, time of day, priority, airline). Anything it assumed is labelled, and every field is editable before a search runs.
3. **Flight results** — simulated flights are filtered deterministically. If nothing matches, filters are relaxed one at a time and the screen says exactly what was widened and why.
4. **Comparison** — tick up to three flights to see them in a side-by-side table.
5. **Selection** — each card explains itself ("Recommended because it is direct and within your budget"), and the choice can be changed at any point.
6. **Passenger details** — name, email and phone, with accessible labels, inline validation and an error summary that links to each field.
7. **Booking review** — full summary of flight, route, times, baggage, fare and passenger, with links back to edit either part.
8. **Confirmation** — a demo reference number, with a clear statement that no reservation was made and no payment was taken.

A **Guided help** panel sits beside every step. Its content is generated from live application state — the current request, the current result set and the current selection — so it can answer "which option is cheapest?", "why is this recommended?" and "what do I do next?" about the flights actually on screen. It is not a chatbot and it has no canned replies.

## Accessibility features

- Semantic HTML landmarks, headings and lists
- Full keyboard operation with visible focus rings
- A skip link to the main content
- Labelled form fields with hints, `aria-invalid` and linked error messages
- Status changes announced through a polite live region
- A working text-size control (standard / large / extra large), remembered between visits
- Status never conveyed by colour alone — every badge carries an icon and a text label
- Dark-on-ivory palette with strong contrast and large touch targets
- `prefers-reduced-motion` respected

## Technology stack

- React 19 + TypeScript
- Vite
- lucide-react for icons
- Plain CSS with design tokens

No backend, no database, no authentication, no payment processing and no external APIs. All parsing, filtering and ranking happens locally and deterministically.

## Running it

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check and production build
npm run lint
```

## Limitations

- **All flight data is simulated.** Airlines, flight numbers, times, prices and baggage rules are invented for the demo.
- No booking is ever made and no payment is ever taken. The confirmation reference is not valid for travel.
- Simulated routes are limited to Bengaluru ⇄ Mumbai, Bengaluru → Delhi and Delhi → Mumbai.
- Request parsing is rule-based, not a language model. It handles the supported cities, budgets, "direct", time of day and airline names; it does not understand dates, passenger counts or return trips.
- Voice input relies on the browser's own speech recognition and is offered only where available. Typing always works.
- Entered details stay in the browser for the session only and are never transmitted.

## Vision

We believe the web should adapt to people, rather than forcing people to adapt to complex interfaces.

SIGHTLINE aims to make digital experiences more understandable, navigable, and accessible.

---

Built for wHACKiest 2026.
