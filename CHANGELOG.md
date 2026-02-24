# AUI (Agent UI) — Changelog

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
