# Frontend Architecture

## Purpose

This document describes the intended frontend structure.

Update it as the actual implementation develops. Do not treat proposed files or libraries as already implemented.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Bun

## Design Reference

The visual specification is maintained in:

design/Everyday_Offline_Design/

The current application is the physical inventory system.

The online store is separate future scope.

## Implemented Structure

```text
src/
  app/
    router.tsx
  components/
    layout/
      InventoryLayout.tsx
    ui/
      Icons.tsx
  lib/
    api/
      client.ts
      products.ts
    utils/
      format.ts
  pages/
    inventory/
      InventoryPage.tsx
      ProductDetailPage.tsx
      ProductSetupPage.tsx
  styles/
    index.css
    tokens.css
    Fonts/
      Inter.ttf
      Manrope.ttf
  types/
    product.ts
  main.tsx
  App.tsx
```


## Responsibilities

### App

Application entry point, global providers, and route configuration.

### Components

Reusable UI components that are not tied to one business feature.

### Features

Components, hooks, types, and API functions related to a particular feature.

### Layouts

Shared page structures, including the authenticated inventory layout.

### API Client

Shared configuration and request handling.

### Types

Shared types that genuinely apply across multiple features.

### Styles

Global CSS, theme definitions, and integration of design tokens.

## API Integration

Keep HTTP communication outside presentation components.

Use the verified backend contract to define request and response types.

Do not create frontend types based on guessed response structures.

Do not duplicate backend business rules unnecessarily.

The frontend can validate inputs for usability, but the backend remains responsible for enforcing business rules.

## Authentication

Use the existing backend authentication implementation.

The exact session handling, cookie configuration, and route protection must be determined by inspecting the backend.

Do not implement a separate authentication system.

## State

Start with React state and context where appropriate.

Add a state management dependency only when the actual application requirements justify it.

Do not duplicate server data unnecessarily.

## Error Handling

Provide consistent handling for:

- Loading
- Empty results
- Validation errors
- Authentication failures
- Permission failures
- Network errors
- Unexpected server errors

Do not expose sensitive internal server details to users.

## Design System

Use the design tokens and supplied SVGs as the source of truth.

Keep colors, typography, spacing, borders, and theme behavior consistent.

Use reusable components where they reduce duplication without making the code difficult to understand.

## Testing

Test important user interactions, form validation, API handling, and business-critical calculations where relevant.

Run type checking, linting, tests, and the production build as configured by the project.

Document any check that is unavailable or failing.