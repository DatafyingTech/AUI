[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Powered_by-Claude_AI-6B4FBB)](https://www.anthropic.com/claude)

# AUI -- Agent UI

**Stop wasting tokens. Start deploying agents that hit the ground running.**

Every token your Claude Code agents spend orienting, discovering context, or figuring out team structure is a token not spent on actual work. AUI is a desktop app that lets you design, prime, and deploy agent teams visually -- so every token goes toward output, not overhead.

## Why AUI?

- **Get more from every token** -- organize context, skills, and team structures visually before deploying, so agents start working immediately instead of burning tokens on discovery and setup
- **Deploy perfectly-primed teams** -- AUI generates a comprehensive primer with full company context, skill files, variables, and coordination rules, then launches your team in a single click
- **Schedule recurring runs** -- attach cron expressions to any team and let the OS-level task scheduler handle the rest, no babysitting required
- **Design your org visually** -- map out agent specializations, API connections, and team hierarchies on a drag-and-drop canvas powered by React Flow
- **Zero lock-in** -- AUI reads and writes standard Claude Code config files; stop using it anytime and everything still works

---

## Screenshots
<img width="1914" height="1000" alt="Screenshot 2026-02-24 125817" src="https://github.com/user-attachments/assets/6086b73d-632a-4381-8277-d87328460009" />
<img width="1913" height="1002" alt="223121" src="https://github.com/user-attachments/assets/a08f368e-84fc-498d-8be3-02135d0526d3" />
<img width="1909" height="997" alt="3 3131" src="https://github.com/user-attachments/assets/d2d61d82-db38-4dfa-9dc6-e7769aa489f7" />
<img width="1905" height="997" alt="4 es" src="https://github.com/user-attachments/assets/b04771ad-78d3-4fc6-ab12-42a247223a3e" />

---

## Features

### Interactive Org-Chart Canvas

A full pan/zoom/drag canvas powered by React Flow. Nodes are color-coded by type:

| Node Type   | Color      | Badge     |
|-------------|------------|-----------|
| You (root)  | Gold       | YOU       |
| Team        | Blue       | TEAM      |
| Agent       | Orange     | AGENT     |
| Sub-Agent   | Light Blue | SUB-AGENT |
| Skill       | Green      | skill     |

Build your agent hierarchy visually -- drag nodes, rearrange teams, and see the full structure at a glance. Sub-agents (agents nested under other agents) get a distinct lighter-blue treatment so you can instantly tell depth in the hierarchy. Team groups can be collapsed or expanded on the canvas to manage complexity. Hover over any node to reveal quick actions (add child node, remove from canvas), double-click to open the inspector, or right-click for a context menu with additional operations.

### Inspector Panel

Click any node to open the side inspector. Edit agent configurations in detail:

- **Model selection** -- choose which Claude model each agent uses
- **Tools and permissions** -- configure what each agent can access
- **Descriptions** -- manual or AI-generated summaries
- **Variables** -- key-value pairs for API keys, URLs, and runtime configs
- **Skills** -- attach and manage skill files per agent

### AI-Powered Authoring

AUI connects to the Claude API (Haiku 4.5) to accelerate team building:

- **Generate Description** -- auto-write contextual descriptions for any agent or team
- **Auto-Fill Teams** -- specify team and agent counts, let Claude generate the full org structure with names and descriptions
- **Smart Team Generation** -- describe your project goals and AUI creates purpose-built teams to meet them
- **Batch Generation** -- multi-select nodes (Ctrl+click) and generate all descriptions in parallel

### One-Click Deploy

Deploy an entire team directly from the canvas:

1. Write a deploy prompt describing what the team should accomplish
2. AUI generates any missing skill files (preserving existing ones)
3. A comprehensive primer is built -- including company context, team overview, all skill file contents, variables, and coordination rules
4. An external terminal opens automatically with `claude --dangerously-skip-permissions` and the full primer submitted

The primer is also saved to `.aui/deploy-primer.md` for reference.

### Automatic Skill File Generation

When you deploy a team, AUI automatically generates fully-detailed `SKILL.md` files for any team that doesn't already have one (existing skill files are preserved). Each generated file includes:

- Company and user context
- Global and team-scoped skills with inline content
- Variables tables for teams and agents
- Detailed agent profiles (model, tools, permissions, sub-agents)
- Coordination rules and deployment instructions

### Cron Job Scheduler

Schedule teams for automated, recurring deployment using real OS-level tasks:

- **Native scheduling** -- creates Windows Task Scheduler tasks or crontab entries (macOS/Linux), so jobs run even when AUI is closed
- **Flexible repeat options** -- once, hourly, daily, weekly, or custom cron expressions
- **Team selector** -- pick any team from your canvas to schedule
- **Visual job list** -- see all scheduled runs at a glance with toggle on/off and delete controls
- **Fresh terminal per run** -- each scheduled execution opens a new terminal with the full deployment primer
- **Persistent** -- schedules survive app restarts; metadata stored in `.aui/schedules.json`, deploy scripts in `.aui/schedules/`

### Settings Panel

- Claude API key management (show/hide toggle)
- Color pickers for team, agent, and accent colors
- Auto-save toggle
- Live CSS variable updates for accent theming
- **Data management** -- export your entire tree to a JSON file or import a previously exported tree to restore or share configurations

### File Watcher

AUI watches the filesystem for external changes to skill files and agent configs, keeping the canvas in sync with edits made outside the app.

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Desktop     | [Tauri v2](https://v2.tauri.app/) (Rust backend)       |
| Frontend    | [React 19](https://react.dev/) + TypeScript             |
| Bundler     | [Vite 7](https://vite.dev/)                             |
| Canvas      | [@xyflow/react](https://reactflow.dev/) (React Flow v12) + [dagre](https://github.com/dagrejs/dagre) |
| State       | [Zustand v5](https://zustand.docs.pmnd.rs/)            |
| Editor      | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Parsing     | [gray-matter](https://github.com/jonschlinkert/gray-matter) + [yaml](https://eemeli.org/yaml/) |
| Validation  | [Zod](https://zod.dev/)                                |
| Native APIs | Tauri FS, Dialog, and Shell plugins                     |

---

## Project Structure

```
src/
  components/
    tree/            # TreeCanvas, OrgNode, layout engine
    inspector/       # InspectorPanel, AgentEditor, GroupEditor, SkillEditor
    context-hub/     # ContextHub menu, FileViewer
    common/          # Toolbar, ValidationBanner, SearchBar
    settings/        # SettingsPanel
    schedule/        # SchedulePanel (cron job manager)
    dialogs/         # CreateNodeDialog, DeleteConfirmDialog
  store/
    tree-store.ts    # Tree state, node CRUD, deploy (Zustand)
    ui-store.ts      # UI state -- inspector, multi-select, panels
  services/
    claude-api.ts    # Anthropic Messages API client
    file-scanner.ts  # Filesystem scanning for agents/skills
    file-watcher.ts  # Live file change detection
    file-writer.ts   # Skill file and primer generation
    agent-parser.ts  # Agent config parsing
    skill-parser.ts  # Skill file parsing
    skill-scanner.ts # Skill directory scanning
    settings-parser.ts # Settings I/O
    scheduler.ts     # OS-level task scheduling (schtasks/crontab)
  types/
    aui-node.ts      # Core AuiNode type, NodeVariable
    agent.ts         # Agent configuration types
    skill.ts         # Skill definition types
    settings.ts      # App settings types
  utils/
    paths.ts         # Path resolution helpers
    validation.ts    # Input validation
    grouping.ts      # Node grouping logic
    templates.ts     # Skill/primer templates
    fs-stub.ts       # Filesystem abstraction
src-tauri/           # Rust backend (Tauri commands, capabilities, plugins)
```

---

## Quick Start

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

That's it -- from clone to running app. See [Prerequisites](#prerequisites) below if you need to set up your environment first.

> **Note:** Running `pnpm dev` starts only the Vite frontend without native Tauri features. For the full experience -- file access, skill deployment, terminal spawning -- use `pnpm tauri dev`.

### Prerequisites

You need three things installed before running the Quick Start commands:

| Requirement | Version | Install |
|-------------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Rust** | latest stable | See [platform notes](#platform-setup) below |

### Platform Setup

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

### Build for Production

```bash
pnpm tauri build
```

This produces platform-specific installers in `src-tauri/target/release/bundle/`.

---

## Configuration

AUI stores its configuration in a `.aui/` directory at the project root:

| File                      | Purpose                                |
|---------------------------|----------------------------------------|
| `.aui/settings.json`     | API key, color preferences, auto-save  |
| `.aui/tree.json`         | Tree structure, group metadata, variables |
| `.aui/deploy-primer.md`  | Last generated deploy primer           |
| `.aui/schedules.json`    | Cron job definitions                   |
| `.aui/schedules/`        | Generated deploy scripts for scheduled runs |

Set your Claude API key in the Settings panel (gear icon in the menu) to enable AI-powered features.

---

## Platform Support

| Platform | Status  | Terminal        |
|----------|---------|-----------------|
| Windows  | Primary | PowerShell      |
| macOS    | Supported | bash          |
| Linux    | Supported | bash          |

Deploy spawns an external terminal window on all platforms and launches the Claude CLI with the generated primer.

---

## Development

```bash
# Frontend only (hot reload, no native features)
pnpm dev

# Full desktop app (hot reload + Tauri native APIs)
pnpm tauri dev

# Type-check
pnpm build
```

The Tauri dev server runs the Vite frontend at `http://localhost:5173` and wraps it in a native window with access to the filesystem, shell, and dialog APIs.

---

## License

[MIT](LICENSE)

---

## Built With

- [Tauri](https://tauri.app/) -- lightweight, secure desktop apps with Rust
- [React](https://react.dev/) -- UI framework
- [React Flow](https://reactflow.dev/) -- interactive node-based canvas
- [Zustand](https://zustand.docs.pmnd.rs/) -- minimal state management
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) -- VS Code's editor component
- [Vite](https://vite.dev/) -- fast frontend tooling
- [Claude](https://www.anthropic.com/claude) by Anthropic -- AI-powered features

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Star History

If AUI helps you manage your Claude Code agents, consider giving it a star -- it helps others discover the project.
