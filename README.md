[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Powered_by-Claude_AI-6B4FBB)](https://www.anthropic.com/claude)

# ATM -- Agent Team Manager

**Stop writing prompts. Start managing teams.**

ATM is a desktop application that turns hours of manual Claude Code configuration into a visual, repeatable workflow. Design AI teams on a drag-and-drop org chart, assign typed variables with sensitive value masking, chain teams into multi-step pipelines, and deploy entire departments to work -- all without writing a single line of YAML, JSON, or markdown by hand.

If you have ever spent 30 minutes hand-crafting a deployment prompt, manually wiring agent configs, or copy-pasting API keys across a dozen files, ATM eliminates all of that.

---

## What ATM Replaces

| Without ATM | With ATM |
|-------------|----------|
| Hand-write agent `.md` files with YAML frontmatter | Visual editor with auto-save |
| Copy-paste API keys into every config | Typed variables cascade from root to team to agent automatically |
| Manually compose 2000-word deployment primers | One click generates a comprehensive primer with full context |
| No way to run Team A then Team B then Team C | Pipeline editor chains teams into sequential workflows |
| Set up cron jobs or Task Scheduler by hand | Built-in scheduler with repeat options and visual job list |
| Start from scratch every time | Save, name, and switch between multiple org layouts |
| Describe your org in text and hope Claude understands | Visual org chart that maps directly to Claude Code team structure |

---

## Key Features

### Typed Variables with Sensitive Value Masking (NEW in v0.6.0)

Define variables at any level of your org -- root, team, or agent -- and they cascade downward automatically. Each variable has a **type** (API Key, Password, Note, or Text) and sensitive values are masked by default with an eye toggle to reveal them. When ATM generates a deployment primer, all variables are resolved and included in the briefing so your agents have every credential and config value they need without you pasting anything manually.

### Project Manager Pipelines

Chain multiple teams into ordered workflows. A Project Manager node lets you define sequential steps -- Team 1 runs to completion, then Team 2 starts, then Team 3 follows. Each step has its own deployment objective. Hit **Play All** to execute the entire pipeline in a single terminal session, or **Schedule** it to run on a recurring basis. The same team can appear in multiple steps with different objectives.

### Visual Org Chart

Design your AI workforce on a full pan/zoom/drag canvas. Nodes are color-coded by role -- gold for You (the CEO), blue for Teams, orange for Agents, light blue for Sub-Agents, magenta for Project Managers, and green for Skills. Collapse and expand entire departments. Right-click any node for a context menu with **Move to...** reparenting that lists every valid target. Hover over connection lines to insert new nodes between existing pairs. The org chart is not decoration -- it directly defines the team structure that gets deployed.

### One-Click Deploy

Write a short objective, click Deploy. ATM handles everything else:

1. Generates any missing skill files (existing ones are preserved)
2. Builds a comprehensive deployment primer -- company context, team overview, all skill file contents, resolved variables, coordination rules
3. Opens an external terminal and launches Claude CLI with the full primer already submitted

No prompt engineering. No copy-pasting. No context window anxiety. The primer is also saved to `.aui/deploy-primer.md` so you can review or reuse it.

### Real Scheduling

Attach recurring schedules to any team or pipeline using actual OS-level task scheduling -- Windows Task Scheduler on Windows, crontab on macOS/Linux. Choose from Once, Hourly, Daily, Weekly, or custom cron expressions. Your AI teams run on schedule even when ATM is closed. Every execution opens a fresh terminal with a full deployment primer.

### AI-Powered Team Generation

Describe your company or project goals, specify how many teams and agents you want, and ATM generates the entire org structure -- complete with names, roles, and descriptions tailored to your objectives. Generate descriptions individually, batch-generate across multi-selected nodes, or let ATM build your whole workforce from a single paragraph.

### Multiple Layouts

Save your current org as a named layout, create blank canvases, and switch between configurations instantly. Each layout preserves the full tree hierarchy, group metadata, node positions, and variables independently. Rename or delete layouts from the toolbar dropdown. Build a "Production" layout and a "Testing" layout and flip between them in one click.

### Zero Lock-In

ATM reads and writes standard Claude Code config files (`.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/settings.json`). Every agent, skill, and setting ATM creates is a normal file on disk. Stop using ATM tomorrow and everything still works exactly as it did before.

---

## How It Works

ATM follows a four-step workflow:

### 1. Design

Build your org chart on the canvas. Create teams, drag agents between departments, assign skills. Use AI generation to scaffold entire structures from a description, or build node by node.

### 2. Configure

Click any node to open its profile in the inspector. Set descriptions, assign variables (API keys, credentials, configuration values), attach skills, choose models and permissions. Variables defined at the root cascade to every team and agent below -- set an API key once and every agent inherits it.

### 3. Deploy

Write a brief objective and click Deploy. ATM compiles everything -- your org structure, every skill file, all resolved variables, coordination rules, and your objective -- into a single deployment primer. It opens an external terminal and launches Claude with the full briefing. For multi-step workflows, use a Project Manager pipeline to chain teams sequentially.

### 4. Claude Does the Work

Claude receives a comprehensive briefing with complete context about your company, every team member's skills, all necessary credentials, and clear objectives. No token waste on back-and-forth clarification. No missing context. Your AI workforce executes with the full picture from the first message.

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

## At a Glance

| Capability | Details |
|------------|---------|
| **Typed Variables** | API Key, Password, Note, Text types with sensitive value masking and root-to-agent inheritance |
| **Pipelines** | Chain teams into sequential multi-step workflows with per-step objectives |
| **Org Chart** | Drag-and-drop canvas with collapse/expand, context menu reparenting, edge insert |
| **Deploy** | One-click primer generation + external terminal launch |
| **Scheduling** | OS-level task scheduling (Task Scheduler / cron) with repeat options |
| **AI Generation** | Generate full org structures, descriptions, and skill files from natural language |
| **Layouts** | Save, switch, rename multiple named org configurations |
| **Autosave** | All editors save automatically after 800ms of idle typing |
| **Zero Lock-In** | Standard Claude Code config files -- no proprietary formats |
| **Export/Import** | Save your entire org to JSON, import it on another machine |

---

## Getting Started

### Download (Recommended)

**[Download ATM v0.6.0 for Windows](https://github.com/DatafyingTech/AUI/releases/latest)** -- grab the `.exe` installer and you are running in seconds.

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
| `.aui/layouts/` | Named layout files with `index.json` manifest |

Set your Claude API key in the Settings panel to enable AI-powered features (team generation, description generation, skill file generation). Deployed team sessions run on your own Claude subscription -- ATM only uses the API for generation features.

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

If ATM saves you time managing your AI workforce, consider giving it a star -- it helps others discover the project.
