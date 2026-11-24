# SIGHTLINE — Claude Code Instructions

## Product
SIGHTLINE is an accessibility-focused task companion that helps users understand complex websites and accomplish tasks through simplified, guided interactions.

Our initial prototype is a simulated flight-booking assistant.

## Primary user
Prioritize people with visual impairments who experience difficulty navigating visually complex interfaces.

Do not claim that SIGHTLINE replaces screen readers or existing accessibility tools.

## MVP scope

The user should be able to:

1. Enter a natural-language flight request.
2. Specify an origin, destination, budget, and preferences.
3. View simulated flights.
4. Filter flights according to their request.
5. Understand flight information in plain language.
6. Compare and select a flight.
7. Enter passenger details.
8. Review a booking summary.
9. Reach a confirmation state.

No real airline integrations, payment processing, authentication, or database are required.

## Product principles

- Accessibility is a core requirement.
- Use readable text and high contrast.
- Use large, clear controls.
- Use semantic HTML.
- Support keyboard navigation.
- Properly label form fields.
- Do not rely on color alone.
- Keep cognitive load low.
- Explain options in plain language.
- Clearly distinguish simulated data from real information.
- Keep users in control of consequential actions.

## Stack

- React
- TypeScript
- Vite
- Lucide React
- CSS

Avoid unnecessary dependencies.

## Engineering rules

- Inspect the existing project before editing.
- Do not overwrite working code unnecessarily.
- Do not build only a static landing page.
- Implement the entire core workflow.
- Every primary button must work.
- Prefer local mock data and deterministic filtering.
- Do not depend on APIs or network connectivity for the core demo.
- Avoid overengineering, excessive abstractions, and unnecessary files.
- Build and test before declaring completion.
- Fix TypeScript and production build errors.
- Do not add features beyond the MVP until the core journey is functional.

## Execution priority

1. Complete working user journey.
2. Functional interactions.
3. Accessibility.
4. Visual quality.
5. Optional features.

If time is limited, cut optional features rather than compromising the core journey.
