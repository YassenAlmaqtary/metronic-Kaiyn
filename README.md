# Kayian ERP

Kayian ERP is an Angular application built with Angular CLI 21 and styled with
Tailwind CSS and Metronic UI.

## Prerequisites

- Node.js and npm

## Install dependencies

From the project root, install the project dependencies:

```powershell
npm install
```

## Development server

Start the development server using the project's local Angular CLI:

```powershell
npm start
```

Open `http://localhost:4200/` in your browser. The development server reloads
the application when source files change.

## Build

Create a production build:

```powershell
npm run build:production
```

Create a development build:

```powershell
npm run build:development
```

Build artifacts are written to `dist/kayian-erp/`. Production builds enforce
the bundle and component-style budgets configured in `angular.json`.

## Tests

Run the unit tests with Karma:

```powershell
npm test
```

Run the unit tests once and exit (useful for a quick verification):

```powershell
npm run test:once
```

## Angular CLI

The Angular CLI is installed as a project dependency. Run it through npm rather
than relying on a global `ng` command. For example:

```powershell
npm exec ng -- generate component component-name
```
