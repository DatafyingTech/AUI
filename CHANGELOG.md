# AUI (Agent UI) — Changelog

## v0.4.0 — February 25, 2026

### New Features
- **Autosave across all editors** — changes to any node (You, Team, Agent, Skill) now save automatically after 800ms of idle typing and on click-away. No more losing changes because you forgot to hit Save. Manual Save buttons remain for explicit saves
- **Blank layout creation** — the Layouts dropdown now has a "+ New Blank Layout" button that creates a fresh canvas with only the "You" node, perfect for building a new org structure from scratch without existing clutter
- **Edge insert button** — hover over any edge (connection line) between two nodes to reveal a "+" button. Click it to insert a new node at that position in the hierarchy, making it easy to add nodes between existing parent-child pairs

### Bug Fixes
- **Fixed team deletion spawning random nodes** — removing a team node from the canvas (via the X button) no longer causes its child agents to appear at root level. Children are now recursively removed with the team, keeping the canvas clean
- **Fixed blank layout inheriting previous description** — new blank layouts now start with a truly fresh root node instead of carrying over the previous layout's "You" node description

### Technical
- New `src/hooks/useAutosave.ts` — reusable hook with debounce, skip-on-init, and flush-on-unmount for all editor components
- New `src/components/tree/InsertEdge.tsx` — custom React Flow edge component with hover-activated insert button
- `removeNodeFromCanvas` now recursively removes all descendants when removing a group node (teams), while preserving the reparent behavior for individual nodes
- `createBlankLayout` added to tree store — saves current layout, creates empty metadata, switches to blank canvas
- All 4 editor components (RootEditor, AgentEditor, SkillEditor, GroupEditor) wired with `useAutosave` hook

---

## v0.3.9 — February 24, 2026

### QA & Polish
- **Full QA audit** — comprehensive 6-area quality audit covering canvas nodes, inspector panel, layouts system, toolbar/navigation, schedule/settings, and data/build integrity. 82/83 checks passed
- **SchedulePanel toolbar overlap fixed** — panel now uses `var(--toolbar-height)` for top offset, consistent with Settings and Catalog panels
- **Consistent `@/` path aliases** — converted all remaining relative `../` imports in services and utilities to use the `@/` path alias for codebase consistency (agent-parser, file-scanner, file-watcher, file-writer, settings-parser, skill-parser, skill-scanner, validation)

### Verified
- Canvas: all 12 visual checks pass (badges, colors, tints, sub-agent detection, hover actions, collapse/expand, glow/shadow)
- Inspector: all 11 editor checks pass (routing, deploy section, schedule button, sub-agent badges, save/discard, skills, variables)
- Layouts: all 22 CRUD + edge-case checks pass (types, service, store, dropdown UI, rename, delete guards)
- Toolbar: all 11 navigation checks pass (3-section layout, button order, panel mutual exclusivity, z-index)
- Schedule: all 23 cron/schtasks/settings checks pass (Rust commands, repeat mapping, time formats, script generation, toggle/delete)
- Data layer: all 13 store/type/build checks pass (interfaces match implementations, no circular imports, tsc + vite build clean)

---

## v0.3.8 — February 24, 2026

### New Features
- **Multiple layouts** — save, switch, rename, and delete named canvas layouts. Each layout preserves the full tree hierarchy, groups, and node positions independently
- **Layouts dropdown in toolbar** — a new dropdown in the toolbar center lets you switch between saved layouts, create new ones with a name input, rename via inline editing, and delete layouts on hover
- **Layout persistence** — layout data stored as individual JSON files in `.aui/layouts/` with an `index.json` manifest tracking the active layout and metadata
- **Auto-default layout** — on first load, the current tree state is automatically saved as a "Default" layout so the system is always initialized

### Enhancements
- **Toolbar button reorder** — right-side buttons now read Catalog, Schedules, Settings (left to right) for better workflow priority. Create (+) and Layouts dropdown are centered

### Technical
- New `Layout` and `LayoutIndex` types in `src/types/aui-node.ts`
- New `src/services/layout-service.ts` — full CRUD for layout files via `@tauri-apps/plugin-fs`
- New `src/components/common/LayoutsDropdown.tsx` — dropdown UI with rename, delete, and save-as-new
- Tree store extended with `loadLayouts`, `saveCurrentAsLayout`, `switchLayout`, `deleteLayout`, `renameLayout` actions
- Layout switching auto-saves the current layout before restoring the target layout's tree metadata

---

## v0.3.7 — February 24, 2026

### Documentation
- **README overhaul** — rewrote the hero section with a clear value proposition emphasizing token efficiency and zero-overhead deployment
- **Claude Code URL install** — Quick Start now leads with a one-line paste-the-URL install option for Claude Code users, with manual clone as the alternative
- **Updated feature sections** — Interactive Org-Chart Canvas and Cron Job Scheduler sections rewritten with accurate details, node type table, and OS-level scheduling docs
- **Sub-agent documentation** — added sub-agent node type to the canvas feature section with color and badge details
- **Project structure updated** — added missing files (scheduler.ts, skill-scanner.ts) and reorganized to match the current codebase
- **Content cleanup** — removed outdated sections and polished overall structure for consistency

---

## v0.3.6 — February 24, 2026

### New Features
- **Real task scheduler backend** — schedule jobs now create actual OS-level scheduled tasks via Rust commands: Windows Task Scheduler (`schtasks.exe`) on Windows, crontab on macOS/Linux. Three new Tauri commands: `create_scheduled_task`, `list_scheduled_tasks`, `delete_scheduled_task`
- **Repeat options for schedules** — replaced raw cron expression input with a user-friendly repeat picker (Once, Hourly, Daily, Weekly, Custom cron). Time picker for selecting run time. Schedules panel shows all jobs with human-readable repeat labels
- **Custom AUI app icon** — replaced the default Tauri icon with a custom-designed AUI logo across all icon sizes (ICO, ICNS, PNG) for Windows, macOS, and Linux

### Enhancements
- **Root node badge shows "YOU"** — the root node on the canvas now displays a "YOU" badge instead of the generic kind label, making the org tree more intuitive
- **Lighter sub-agent color** — sub-agent nodes now use a softer blue (`#a5d6ff`) for better visual contrast against parent agents
- **One-command install in README** — Quick Start section now leads with a four-line clone-to-running-app snippet, plus collapsible platform-specific setup guides for Windows, macOS, and Linux

### Technical
- Added `create_scheduled_task`, `list_scheduled_tasks`, `delete_scheduled_task` Rust commands in `src-tauri/src/lib.rs`
- New `src/services/scheduler.ts` service for schedule persistence and OS task management
- SchedulePanel rewritten with repeat picker, time selector, and live job listing from OS

---

## v0.3.5 — February 24, 2026

### Enhancements
- **Export/Import moved to Settings panel** — the Export Tree and Import Tree buttons are now in a new "Data" section inside the Settings panel (between Preferences and Advanced), keeping the toolbar clean
- **Schedule button on team editor** — replaced the Export and Generate Skill Files buttons in the team Deploy section with a single "Schedule" button that opens the SchedulePanel directly
- **Sub-agent visual distinction** — agents nested under other agents (sub-agents) now display with a lighter blue color (`#58a6ff`), "SUB-AGENT" badge, and distinct background tint on the canvas, making the hierarchy visually clear at a glance
- **Sub-agent badges in inspector** — the agent list inside the team editor now shows "sub-agent" badges (lighter blue) for children of member-agents

### Cleanup
- Removed standalone "Export" and "Generate Skill Files" buttons from team editor (Deploy already calls `generateTeamSkillFiles` internally)
- Removed Export/Import buttons and related handlers from the Toolbar
- Toolbar reverted to clean button set: +, Settings, Schedules, Catalog

---

## v0.3.4 — February 24, 2026

### Bug Fixes
- **Deploy terminal stays open** — switched to `cmd /c start` with `raw_arg` for fully independent process detachment, so the deploy terminal no longer closes unexpectedly
- **Cleared CLAUDECODE env var in deploy scripts** — prevents nested session detection error when deploying from within an existing Claude Code session
- **Primer passed as file-read instruction** — deploy primer is now read from file instead of being passed as a 9.3KB CLI argument, fixing PowerShell argument corruption from 50 unescaped double quotes shattering the primer into 94 separate arguments
- **Node name single-quote escaping** — deploy scripts (both PS1 and bash) now properly escape single quotes in node names
- **Skill names resolve correctly in deploy primer** — primer now uses skillNameCache to resolve display names instead of falling back to raw hash IDs
- **Added Skill tool invocation instructions to primer** — deployment primer now includes instructions for agents to invoke skills

### Enhancements
- **Richer generated skill files** — skill file generation now produces thorough, opinionated content with domain-specific guidelines, quality standards, and detailed protocols (benchmarked against frontend-design quality)
- **Reordered team editor** — sections now flow: Name/Description, Deploy, Skills & Variables, Agents, Save
- **Canvas X button soft-removes nodes** — the X button on canvas nodes now removes them from the canvas without deleting files from disk (renamed to "Remove from Canvas")
- **Combined Skills & Variables** — Skills and Variables merged into a single collapsible section in the team editor
- **Generate with AI moved inside Agents section** — reduces top-level clutter in the team editor

---

## v0.3.2 — February 24, 2026

### Bug Fixes
- **Deploy terminal stays open** — fixed PowerShell `-File` flag silently ignoring `-NoExit`, causing the deploy terminal to flash and close. Switched to `-Command` invocation so the terminal persists and shows output/errors.
- **Assigning skills no longer creates phantom nodes** — fixed bug where assigning a skill to a team or root node created a visible orphan node on the canvas. Skills are now tracked in a lightweight name cache instead of being added as tree nodes.

### Enhancements
- **Collapsible sections on team editor** — the team/agent inspector now matches the root node's collapsible organization. Deploy stays prominent at the top; Variables, Assigned Skills, Generate with AI, and Agents are each collapsible sections with disclosure triangles and item counts.

### Technical
- Added `skillNameCache` to tree store for resolving skill display names without adding visible nodes
- OrgNode skill name resolution now checks: tree nodes → name cache → raw ID fallback
- Rust `open_terminal` uses `-Command` instead of `-File` on Windows for proper `-NoExit` behavior

---

## v0.3.1 — February 24, 2026

### Bug Fixes
- **Deploy now opens a visible terminal** — replaced Tauri shell plugin approach (which hardcodes `CREATE_NO_WINDOW`) with a Rust-side `open_terminal` command using `CREATE_NEW_CONSOLE`. Deploy now reliably opens a visible PowerShell window on Windows, Terminal on macOS, or any available emulator on Linux.
- **Import from GitHub URL works** — fixed "Failed to fetch" error by routing URL imports through a Rust-side `fetch_url` command, bypassing webview CORS/CSP restrictions.
- **Skill names display correctly on nodes** — fixed issue where skill tags on canvas nodes showed hash IDs instead of human-readable names. Skills are now auto-added to the tree store when assigned (#7).

### Enhancements
- **Sub-agent labels** — agent nodes nested inside teams now show "sub-agents" instead of "agents" in their child count label (#8)
- **Restructured root node inspector** — "Owner" section renamed to "Company / Project Name" with better placeholder text. Global Skills and Teams are now collapsible sections with disclosure triangles. Generate with AI moved inside the Teams section (#9)
- **Removed Chat panel** — the non-functional Chat feature has been removed from the toolbar and app since CLI-based chat cannot run inside Tauri's webview (#10)
- **Removed AI gradients** — all purple-to-blue and orange gradient buttons replaced with flat solid colors (`var(--accent-purple)`, `var(--accent-orange)`) per the frontend-design skill's guidance against generic AI aesthetics
- **39 skills installed** — downloaded and installed the full Anthropic skills pack plus community skills (algorithmic-art, canvas-design, frontend-design, mcp-builder, skill-creator, ios-simulator, playwright, d3js, web-asset-generator, and more)

### Technical
- Added `open_terminal` Rust command with platform-specific terminal launching (CREATE_NEW_CONSOLE on Windows)
- Added `fetch_url` Rust command for server-side HTTP fetching (bypasses webview restrictions)
- Overlay panels (Settings, Schedules, Catalog) are now mutually exclusive — opening one closes the others
- Toolbar reorganized: Settings, Schedules, Catalog now directly accessible (Chat removed)

---

## v0.3.0 — February 24, 2026

### UI Overhaul
- **Refined color palette** — blue-tinted dark backgrounds (#0d1117, #151b23, #1c2333) replace the old purplish tones for a more professional, modern look
- **Desaturated accents** — orange (#f0883e), green (#3fb950), purple (#8b5cf6), gold (#d29922), red (#f85149) are all slightly desaturated for less visual noise
- **Unified AI gradient** — all AI-powered buttons now use a consistent purple-to-blue gradient (`#8b5cf6 → #4a9eff`) instead of the old purple-only gradient
- **Consistent input styling** — all input fields now use CSS variables with `border-radius: 6px` and smooth `transition: border-color 0.15s`
- **Toolbar subtitle** — "Agent UI" subtitle appears next to the AUI logo for clarity
- **Better welcome screen** — improved empty state with keyboard shortcut hints and a subtitle

### UX Improvements
- **Deploy moved to top** — the Deploy section now appears at the top of the team inspector panel for faster access (was buried at the bottom)
- **Renamed "Auto-Fill"** to **"Generate with AI"** across all editors for clearer intent
- **Export button** redesigned as an outlined secondary button (was a filled gradient) to reduce visual competition with Deploy
- **Refined button hierarchy** — primary actions (Deploy, Save) are filled, secondary actions (Export, Discard) are outlined, tertiary actions (Generate Skill Files) are dashed
- **Chat, Settings, Schedules promoted to toolbar** — direct 1-click access from the toolbar instead of buried in the Menu (now renamed "Catalog")
- **"Menu" renamed to "Catalog"** — the ContextHub overlay now opens via a "Catalog" button, better reflecting its purpose as a skill/agent/team browser
- **Mutual-exclusive overlays** — opening Chat, Settings, Schedules, or Catalog automatically closes any other open overlay to prevent stacking
- **Cleaner Catalog header** — removed redundant Chat/Settings/Schedules buttons from the Catalog utility row; only Refresh and Save Plan remain
- **Inspector panel widened** to 480px (was 420px) for more comfortable editing

### Keyboard Shortcuts
- `Ctrl+Shift+D` — deploy the currently selected team
- `Ctrl+Enter` — deploy from the deploy prompt textarea
- `Ctrl+I` — toggle the inspector panel
- Shortcuts are suppressed when typing in input fields

### Technical
- Added new CSS variables: `--bg-elevated`, `--text-tertiary`, `--border-hover`, `--accent-danger`, and radius tokens (`--radius-sm/md/lg/xl`)
- Updated team colors in grouping utility to match the new desaturated palette
- All hardcoded color values replaced with CSS variables where applicable

---

## v0.2.2 — February 23, 2026

### Bug Fixes
- Fixed deploy failing with "Make sure 'claude' is in your PATH" — root cause was Tauri v2's shell plugin hardcoding `CREATE_NO_WINDOW` on all spawned processes, making every terminal invisible. Deploy now uses `ShellExecuteExW` via the shell `open()` API with a `.bat` launcher, which correctly opens a visible PowerShell window.
- Fixed Windows path handling in deploy scripts — paths now use backslashes in generated `.ps1` and `.bat` files for proper PowerShell and cmd.exe compatibility.

### Improvements
- Moved Collapse/Expand toggle from the toolbar to the floating search bar for a cleaner, more subtle placement.
- Improved deploy error messages — errors now show actual failure details instead of generic "Failed" text.

---

## v0.2.1 — February 23, 2026

### Improvements
- Added "Collapse All" / "Expand All" button in the toolbar for quick team management
- Made the entire agent count row on team nodes clickable for expand/collapse (not just the tiny arrow)
- Moved "Open Settings File" from the main menu into the Settings panel under a new "Advanced" section
- Fixed deploy to open a visible terminal window (was spawning invisible child processes)
- Cleaned up leftover references to removed features

### Documentation
- Added comprehensive USAGE.md user guide (479 lines)
- Added CONTRIBUTING.md for open-source contributors
- Added MIT LICENSE
- Enhanced README with badges, "Why AUI?" section, and contributing link
- Created 6 roadmap issues on GitHub
- Added 15 GitHub topics for search discoverability

---

## v0.2.0 — February 23, 2026

### Major Features

#### Variables System
- Added key-value variable pairs (API keys, URLs, configs) to both teams and agents
- Variables are saved with your project data and persist across sessions
- Full editing UI in both team and agent editors with name/value fields
- Variables are included in skill exports and deployment primers

#### Claude API Integration
- Connects to the Anthropic Messages API for AI-powered features
- API key is configured via the Settings panel
- Powers: Generate Description, Auto-Fill Teams, and Auto-Fill Agents
- Uses Claude Haiku for fast, cost-effective generation

#### AI-Powered Generate Description
- Purple "Generate" button on every agent and team description field
- Uses Claude API to generate a contextual description based on the node's name
- Understands whether it's a team or an agent within a team

#### Auto-Fill with AI
- **Root node:** Select number of teams and agents-per-team, click "Auto-Fill" to have Claude generate the entire org structure
- **Team nodes:** "Auto-Fill Agents" button with count selector generates agents for that specific team
- AI generates contextually appropriate names and descriptions

#### Deploy Team (Revamped)
- Deploy prompt textarea alongside the deploy button — tell the team what to accomplish
- Deploy generates missing skill files (skips existing) and builds a comprehensive primer with all skill file contents included
- **Auto-opens an external terminal** (PowerShell on Windows, Terminal on Mac/Linux) and launches Claude with the full primer already submitted
- Primer includes company context, team overview, global skills, sibling teams, and every agent's full skill file content
- API costs are only for generating descriptions and skill files — deployed team sessions run on the user's own Claude subscription
- Team node gets a "senior manager" skill file; each agent gets their own specialist skill file
- "Generate Individual Skill Files" button for on-demand skill file creation
- Primer saved to `.aui/deploy-primer.md` for reference

#### Comprehensive Skill Export
- Completely rewritten skill export — now generates fully-detailed SKILL.md files
- Includes: company context, global skills, team skills (with inline content), team variables table, detailed agent profiles (model, tools, permissions, skills, variables, sub-agents), coordination rules, deployment instructions, and success criteria
- Proper Claude Code team mode deployment instructions

#### Settings Panel
- API key input with show/hide toggle
- Color pickers for Team, Agent, and Accent colors
- Auto-save preference toggle
- Settings persist across sessions; accent color applies to the UI in real time

#### Delete Node on Canvas
- Subtle gray X button on every node (team, agent, skill, etc.)
- Appears on hover, opens delete confirmation dialog
- The root (Human) node cannot be deleted

#### Cron Job Manager
- Schedule teams for recurring deployment
- Cron expression editor with prompt field
- View/delete scheduled jobs
- Schedules persist across sessions

#### Multi-Select Generate Description
- Hold Ctrl and click multiple nodes to select them
- "Generate All Descriptions" button appears when multiple nodes selected
- Generates descriptions for all selected nodes in parallel

#### Smart Team Generation
- Fill in your root node description with your company/project goals
- Set global skills and team/agent counts
- "Generate Teams to Meet Goals" creates teams specifically designed to achieve your described objectives

### UI Changes

#### Toolbar Simplified
- Toolbar now shows only: AUI logo, + button, Menu button, node count
- Chat, Refresh, Save Plan, and Settings buttons moved into the Menu

#### Menu Enhanced
- Added utility row: Refresh, Save Plan, Settings, Schedules buttons
- Added Chat button to open Claude CLI chat
- Added "Open Settings File" option

#### Multi-Select Visual Feedback
- Ctrl+click nodes to multi-select (purple border highlight)
- Floating action bar shows selected count with "Generate All Descriptions" button
- Clear selection with X button or click empty canvas

#### Color Scheme
- Teams are blue (#4a9eff), Agents are orange (#ff9800)
- Consistent across all views: canvas nodes, editors, menu, and mini-map

#### Naming
- "Member" renamed to "Agent" everywhere
- "Context Hub" renamed to "Menu" in toolbar

### Technical

#### New Files
- `src/services/claude-api.ts` — Anthropic Messages API client
- `src/components/schedule/SchedulePanel.tsx` — Cron job manager UI

#### New Store Actions
- `generateTeamSkillFiles(teamId)` — creates individual SKILL.md for team manager + each agent
- `toggleMultiSelect(nodeId)` / `clearMultiSelect()` — multi-select state management
- `toggleSchedule()` — schedule panel toggle

#### Type Changes
- `AuiNode` now has `variables: NodeVariable[]`
- `TreeMetadata.groups` now persists `variables`
- New `NodeVariable` interface: `{ name: string; value: string }`
- `UiState` now has `multiSelectedNodeIds: Set<string>` and `scheduleOpen: boolean`

#### Shell Configuration
- Tauri shell permissions scoped to: `claude`, `powershell`, `cmd`, `bash`, `open`
- Deploy opens an external terminal automatically (PowerShell on Windows, Terminal on Mac/Linux)
- Note: Deploy and CLI features require the Tauri runtime (not browser-only mode)

### Bug Fixes
- Settings no longer appears as a node in the tree
- Fixed CLI availability detection with clearer error messages
- Fixed auto-fill not triggering correctly in certain conditions
- Inspector panel now has a close button when no node is selected
- Skill file generation skips files that already exist (no overwriting)

---

## v0.1.0 — Initial Release

### Core Features

- **Project scaffold** — Tauri + React + TypeScript application structure with Vite bundling
- **Type system** — Core data types for teams, agents, skills, and organizational trees
- **Services layer** — File I/O and tree persistence services for loading and saving project data
- **State management** — Zustand-based stores for application state, tree data, and UI state
- **Tree canvas** — Interactive node-based canvas for visualizing and arranging teams and agents
- **Inspector panel** — Side panel for viewing and editing properties of the selected node
- **Menu** — Centralized hub for accessing project context, global skills, and navigation
- **Basic file parsing** — Read and parse skill files from the local filesystem
