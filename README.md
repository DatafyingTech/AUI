[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Powered_by-Claude_AI-6B4FBB)](https://www.anthropic.com/claude)

# AUI -- Agent UI

**A visual org-chart interface for managing Claude Code agent teams, skills, and configurations.**

AUI is a desktop application that gives you a drag-and-drop canvas for designing, configuring, and deploying Claude Code agent teams. Instead of hand-editing YAML files and skill definitions, you build your agent organization visually -- then deploy entire teams with a single click.

## Why AUI?

Managing Claude Code agent teams through raw config files is slow, error-prone, and lacks visibility into your organization's structure. AUI solves this by giving you:

- **Visual clarity** -- see your entire agent organization at a glance on an interactive canvas
- **AI-assisted authoring** -- generate descriptions, fill teams, and create goal-aligned agent structures in seconds
- **One-click deployment** -- go from design to running team session with a single button press
- **Zero lock-in** -- AUI reads and writes standard Claude Code config files; stop using AUI anytime and your configs still work

---

## Screenshots

<img width="1908" height="998" alt="aui" src="https://github.com/user-attachments/assets/4cb9f2f3-127e-4361-b32f-002998e2eef8" />

<img width="470" height="951" alt="aui2" src="https://github.com/user-attachments/assets/e72df814-8e7b-4ca4-b02b-5bb891177f3a" />


> *Coming soon -- screenshots of the org-chart canvas, inspector panel, deploy flow, and settings.*

---

## Features

### Interactive Org-Chart Canvas

A full pan/zoom/drag canvas powered by React Flow. Nodes are color-coded by type:

| Node Type | Color   |
|-----------|---------|
| Human     | Gold    |
| Team      | Blue    |
| Agent     | Orange  |
| Skill     | Green   |

Build your agent hierarchy visually -- drag nodes, rearrange teams, and see the full structure at a glance.

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

### Skill Export

Export teams to fully-detailed `SKILL.md` files. Each export includes:

- Company and human context
- Global and team-scoped skills with inline content
- Variables tables for teams and agents
- Detailed agent profiles (model, tools, permissions, sub-agents)
- Coordination rules and deployment instructions

### Cron Job Scheduler

Schedule teams for recurring deployment. Set cron expressions, attach prompts, and manage scheduled jobs -- all stored in `.aui/schedules.json`.

### Settings Panel

- Claude API key management (show/hide toggle)
- Color pickers for team, agent, and accent colors
- Auto-save toggle
- Live CSS variable updates for accent theming

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
    chat/            # ChatPanel (Claude CLI integration)
    settings/        # SettingsPanel
    schedule/        # SchedulePanel (cron job manager)
    dialogs/         # CreateNodeDialog, DeleteConfirmDialog
  store/
    tree-store.ts    # Tree state, node CRUD, deploy, export (Zustand)
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

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (for Tauri)

### Install and Run

```bash
# Clone the repository
git clone https://github.com/DatafyingTech/AUI.git
cd AUI

# Install dependencies
pnpm install

# Run the full desktop app (native FS, shell, and dialog access)
pnpm tauri dev
```

> **Note:** Running `pnpm dev` starts only the Vite frontend without native Tauri features. For the full experience -- file access, skill deployment, terminal spawning -- use `pnpm tauri dev`.

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
