[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Powered_by-Claude_AI-6B4FBB)](https://www.anthropic.com/claude)

# ATM -- Agent Team Manager

**The org chart for your AI workforce.**

ATM is a desktop app that lets you build, manage, and deploy teams of AI employees -- visually. Design your org structure on a drag-and-drop canvas, create detailed skill trees that define what each employee can do, set recurring work schedules, chain teams into sequential pipelines, and send entire teams to work with a single click. Think of it as the HR dashboard for your AI company.

## Why ATM?

- **Design teams visually** -- map out your AI workforce on an interactive org chart. Drag employees between teams, collapse departments, and see your entire operation at a glance
- **Create detailed skill trees** -- define exactly what each AI employee can do with structured skill files. ATM auto-generates comprehensive skill profiles including context, tools, permissions, and coordination rules
- **Project Manager pipelines** -- chain multiple teams into sequential workflows. Team 1 finishes, team 2 starts, team 3 follows. Each step gets its own objective. Play all steps with one click or schedule the whole pipeline
- **Set employee schedules** -- attach recurring schedules to any team or pipeline using real OS-level task scheduling. Your AI employees show up for work on time, every time -- even when ATM is closed
- **Deploy with one click** -- write a brief, ATM generates a full deployment primer with company context, skill files, variables, and team structure, then launches your crew in an external terminal
- **Zero lock-in** -- ATM reads and writes standard Claude Code config files. Stop using it anytime and everything still works

---

## Screenshots

**Example 1: Crypto Investment Firm**

<img width="506" height="682" alt="1" src="https://github.com/user-attachments/assets/522461e4-9833-43d6-92e5-d19e96bed3ea" />
<img width="1858" height="695" alt="2" src="https://github.com/user-attachments/assets/80f670af-89fe-40ed-b8ae-09b42856fafa" />
<img width="796" height="445" alt="3" src="https://github.com/user-attachments/assets/2f5274c4-59c3-4ffa-af8c-730a872f2cf3" />
<img width="1908" height="1000" alt="4" src="https://github.com/user-attachments/assets/1e8731f2-d03a-45a1-a74b-ca5b92e7f6ac" />
<img width="410" height="624" alt="5" src="https://github.com/user-attachments/assets/4db58ca9-29cd-4978-92db-cf557249a146" />
<img width="1099" height="631" alt="6" src="https://github.com/user-attachments/assets/877d9b7d-1abc-4c96-8654-e30ca8994c6a" />

---

**Example 2: IT Security / SOC Team**

<img width="1914" height="1000" alt="Screenshot 2026-02-24 125817" src="https://github.com/user-attachments/assets/6086b73d-632a-4381-8277-d87328460009" />
<img width="1913" height="1002" alt="223121" src="https://github.com/user-attachments/assets/a08f368e-84fc-498d-8be3-02135d0526d3" />
<img width="1909" height="997" alt="3 3131" src="https://github.com/user-attachments/assets/d2d61d82-db38-4dfa-9dc6-e7769aa489f7" />
<img width="1905" height="997" alt="4 es" src="https://github.com/user-attachments/assets/b04771ad-78d3-4fc6-ab12-42a247223a3e" />
<img width="1907" height="998" alt="Screenshot 2026-02-24 161224" src="https://github.com/user-attachments/assets/3c4cef4a-14bd-4fd6-975d-07584b3e1a01" />

---

## Features

### Visual Org Chart

Design your AI workforce on a full pan/zoom/drag canvas powered by React Flow. Employees are color-coded by role:

| Role | Color | Badge |
|------|-------|-------|
| You (CEO) | Gold | YOU |
| Team | Blue | TEAM |
| Employee | Orange | EMPLOYEE |
| Sub-Employee | Light Blue | SUB-EMPLOYEE |
| Project Manager | Magenta | PROJECT MGR |
| Skill | Green | SKILL |

Drag employees between teams to reorganize. Collapse or expand entire departments to manage complexity. Hover over any employee to reveal quick actions, right-click for a context menu, or hover over connection lines to insert new employees between existing pairs. Save multiple named layouts and switch between them instantly. Start fresh anytime with the blank layout option.

### Skill Trees

Every AI employee needs to know what they're good at. ATM lets you create and assign detailed skill files (`SKILL.md`) that define each employee's expertise. When you deploy a team, ATM auto-generates comprehensive skill profiles that include:

- Company and team context
- Global and team-scoped skills with inline content
- Variables tables for API keys, URLs, and runtime configs
- Detailed employee profiles (model, tools, permissions, sub-employees)
- Coordination rules and deployment instructions

### AI-Powered Hiring

Describe your company or project, specify how many teams and employees you want, and ATM generates the perfect org structure -- complete with team names, employee roles, and descriptions. You can also:

- **Generate descriptions** for individual employees with one click
- **Batch-generate** by multi-selecting employees (Ctrl+click) and generating all descriptions at once
- **Fine-tune counts** -- specify exact team and employee counts and ATM delivers precisely what you asked for

### One-Click Deploy

Send an entire team to work directly from the canvas:

1. Write a deploy prompt describing what the team should accomplish
2. ATM generates any missing skill files (existing ones are preserved)
3. A comprehensive briefing is built -- company context, team overview, all skill file contents, variables, and coordination rules
4. An external terminal opens and launches Claude CLI with the full briefing

The briefing is also saved to `.aui/deploy-primer.md` for reference.

### Project Manager (Pipeline)

Chain multiple teams into a sequential workflow where each step runs to completion before the next begins:

1. Create a Project Manager node from the canvas context menu or create dialog
2. Add steps in the inspector -- each step picks a team and sets a deployment prompt
3. Reorder, duplicate, or remove steps as needed -- the same team can appear multiple times with different objectives
4. Click **Play All** to run the entire pipeline in one terminal session (step 1 finishes, step 2 starts, etc.)
5. Or click **Schedule** to set up a recurring pipeline run via OS-level task scheduling

Each step generates its own deployment primer with full team context. The deploy script runs each Claude session sequentially, ensuring orderly execution.

### Employee Schedules

Set up recurring work schedules using real OS-level task scheduling -- Windows Task Scheduler on Windows, crontab on macOS/Linux. Your AI employees show up for work on time, every time, even when ATM is closed.

- **Flexible timing** -- once, hourly, daily, weekly, or custom cron expressions
- **Team selector** -- pick any team from your canvas to schedule
- **Visual job list** -- see all scheduled runs with toggle and delete controls
- **Fresh briefing per run** -- each execution opens a new terminal with the full deployment primer
- **Persistent** -- schedules survive app restarts

### Employee Profiles

Click any employee to open their full profile in the side inspector. All changes auto-save after a brief pause, so you never lose edits when clicking away.

- **Model selection** -- choose which Claude model each employee uses
- **Tools and permissions** -- configure what each employee can access
- **Descriptions** -- write manually or generate with AI
- **Variables** -- key-value pairs for API keys, URLs, and runtime configs
- **Skills** -- attach and manage skill files per employee

### Settings and Data

- Claude API key management (show/hide toggle)
- Color pickers for team, employee, and accent colors
- Auto-save toggle with live CSS theming
- **Export/Import** -- save your entire org to a JSON file or import a previously exported tree to restore or share configurations

---

## Getting Started

### Download (Recommended)

**[Download ATM for Windows](https://github.com/DatafyingTech/AUI/releases/latest)** -- grab the `.exe` installer and you're running in seconds.

> macOS and Linux installers coming soon. For now, build from source below.

### Build from Source

<details>
<summary><strong>For developers or non-Windows platforms</strong></summary>

**Paste into Claude Code** (fastest):
```
https://github.com/DatafyingTech/AUI
```
Just paste the repo URL into any Claude Code session -- it will clone, install, and set up the project for you.

**Or clone manually:**
```bash
git clone https://github.com/DatafyingTech/AUI.git
cd AUI
pnpm install
pnpm tauri dev
```

#### Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Rust** | latest stable | [rustup.rs](https://rustup.rs/) |

#### Platform Setup

<details>
<summary><strong>Windows</strong></summary>

1. Install [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) -- select the **"Desktop development with C++"** workload
2. Install Rust via [rustup-init.exe](https://rustup.rs/)
3. Restart your terminal, then run the Quick Start commands

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal, then run the Quick Start commands.

</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal, then run the Quick Start commands.

</details>

#### Build for Production

```bash
pnpm tauri build
```

Produces platform-specific installers in `src-tauri/target/release/bundle/`.

</details>

> **Note:** `pnpm dev` runs only the frontend. For the full desktop experience -- file access, deployment, terminal spawning -- use `pnpm tauri dev`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | [Tauri v2](https://v2.tauri.app/) (Rust backend) |
| Frontend | [React 19](https://react.dev/) + TypeScript |
| Bundler | [Vite 7](https://vite.dev/) |
| Canvas | [@xyflow/react](https://reactflow.dev/) (React Flow v12) + [dagre](https://github.com/dagrejs/dagre) |
| State | [Zustand v5](https://zustand.docs.pmnd.rs/) |
| Editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Parsing | [gray-matter](https://github.com/jonschlinkert/gray-matter) + [yaml](https://eemeli.org/yaml/) |
| Validation | [Zod](https://zod.dev/) |
| Native APIs | Tauri FS, Dialog, and Shell plugins |

---

## Configuration

ATM stores its configuration in a `.aui/` directory at the project root:

| File | Purpose |
|------|---------|
| `.aui/settings.json` | API key, color preferences, auto-save |
| `.aui/tree.json` | Tree structure, group metadata, variables |
| `.aui/deploy-primer.md` | Last generated deploy primer |
| `.aui/schedules.json` | Scheduled job definitions |
| `.aui/schedules/` | Generated deploy scripts for scheduled runs |

Set your Claude API key in the Settings panel to enable AI-powered features.

---

## Platform Support

| Platform | Status | Terminal |
|----------|--------|---------|
| Windows | Primary | PowerShell |
| macOS | Supported | bash |
| Linux | Supported | bash |

Deploy spawns an external terminal window on all platforms and launches the Claude CLI with the generated briefing.

---

## Development

```bash
pnpm dev          # Frontend only (hot reload, no native features)
pnpm tauri dev    # Full desktop app (hot reload + Tauri native APIs)
pnpm build        # Type-check
```

---

## License

[MIT](LICENSE)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

If ATM helps you manage your AI workforce, consider giving it a star -- it helps others discover the project.
