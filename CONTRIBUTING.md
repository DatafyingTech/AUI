# Contributing to AUI

Thank you for your interest in contributing to AUI (Agent UI). We welcome contributions of all kinds -- bug reports, feature suggestions, documentation improvements, and code changes. Every contribution helps make AUI a better tool for visually managing Claude Code agent teams.

## Table of Contents

- [How to Report Bugs](#how-to-report-bugs)
- [How to Suggest Features](#how-to-suggest-features)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Code of Conduct](#code-of-conduct)

## How to Report Bugs

If you encounter a bug, please open a GitHub Issue and include the following:

- **Summary**: A clear, concise description of the problem.
- **Steps to Reproduce**: A numbered list of steps that reliably trigger the issue.
- **Expected Behavior**: What you expected to happen.
- **Actual Behavior**: What actually happened, including any error messages or screenshots.
- **Environment**: Your operating system, Node.js version, Rust toolchain version, and AUI version.

Search existing issues before opening a new one to avoid duplicates. If you find a matching issue, add a comment with any additional context you can provide.

## How to Suggest Features

Feature requests are welcome. Please open a GitHub Issue with the following:

- **Problem Statement**: Describe the problem or workflow gap the feature would address.
- **Proposed Solution**: Outline how you envision the feature working.
- **Alternatives Considered**: Note any alternative approaches you have thought about.
- **Additional Context**: Include mockups, screenshots, or references if applicable.

Label your issue with `enhancement` if your repository supports it.

## Development Setup

### Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or later)
- **pnpm** (v8 or later)
- **Rust toolchain** (stable, via [rustup](https://rustup.rs/))
- **Tauri v2 system dependencies** -- see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for your platform

### Getting Started

1. **Fork** the repository on GitHub.

2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/<your-username>/aui.git
   cd aui
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Run the full desktop app** (Tauri + React):

   ```bash
   pnpm tauri dev
   ```

   This compiles the Rust backend and launches the desktop window with hot-reloading for the frontend.

5. **Run frontend-only development** (no Tauri/Rust required):

   ```bash
   pnpm dev
   ```

   This starts the Vite development server. Useful for working on UI components and layout without needing the Rust toolchain. Note that Tauri-specific APIs (filesystem, shell, dialogs) will not be available in this mode.

## Project Structure

```
aui/
  src/
    components/    # React components (pages, panels, modals, shared UI)
    store/         # Zustand state management stores
    services/      # Business logic, API integrations, file I/O helpers
    types/         # TypeScript type definitions and interfaces
    utils/         # Pure utility functions and helpers
  src-tauri/       # Tauri v2 Rust backend (commands, plugins, configuration)
  package.json
  tsconfig.json
  vite.config.ts
```

- **`src/components/`** -- All React components. Organize by feature or domain area.
- **`src/store/`** -- Zustand stores for application state. Each store covers a distinct domain.
- **`src/services/`** -- Service modules that handle side effects, file operations, and external integrations.
- **`src/types/`** -- Shared TypeScript types, interfaces, and Zod schemas.
- **`src/utils/`** -- Stateless helper functions with no side effects.
- **`src-tauri/`** -- The Tauri v2 Rust backend, including Tauri commands, plugin configuration, and the `tauri.conf.json` manifest.

## Code Style

Please follow these guidelines to keep the codebase consistent:

- **TypeScript** -- All frontend code must be written in TypeScript with strict mode enabled. Avoid using `any`; prefer explicit types or generics.
- **React functional components** -- Use function components exclusively. Do not use class components. Prefer named exports.
- **Zustand for state management** -- Use Zustand stores for shared application state. Keep component-local state in `useState` or `useReducer` only when the state does not need to be shared.
- **No emojis in code** -- Do not include emojis in source code, comments, log messages, or user-facing strings.
- **Imports** -- Use explicit, named imports. Avoid wildcard imports.
- **Naming conventions** -- Use PascalCase for components and types, camelCase for variables and functions, and UPPER_SNAKE_CASE for constants.
- **File naming** -- Use PascalCase for component files (e.g., `AgentPanel.tsx`) and camelCase for non-component modules (e.g., `fileService.ts`).
- **Formatting** -- Follow the existing formatting conventions in the codebase. If a formatter or linter configuration is present, run it before committing.

## Pull Request Process

1. **Fork** the repository and create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in small, focused commits with clear commit messages.

3. **Test your changes** -- verify the app builds and runs correctly with both `pnpm tauri dev` and `pnpm dev`.

4. **Push** your branch to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** against the `main` branch of the upstream repository. In your PR description:

   - Summarize what the PR does and why.
   - Reference any related GitHub Issues (e.g., `Closes #42`).
   - Include screenshots or recordings for visual changes.
   - Note any breaking changes or migration steps.

6. **Respond to review feedback** promptly. PRs require at least one approving review before merging.

## Code of Conduct

This project is committed to providing a welcoming and inclusive environment for everyone. All participants are expected to treat each other with respect and professionalism.

Harassment, discrimination, and disruptive behavior will not be tolerated. If you experience or witness unacceptable behavior, please report it by opening an issue or contacting the maintainers directly.

By participating in this project, you agree to uphold these standards.

---

Thank you for contributing to AUI. Your time and effort are genuinely appreciated.
