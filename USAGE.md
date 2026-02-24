# AUI Usage Guide

A complete walkthrough for using AUI (Agent UI) -- the visual desktop application for designing, managing, and deploying Claude Code agent teams.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Building Your First Team](#building-your-first-team)
- [Working with Skills](#working-with-skills)
- [AI-Powered Features](#ai-powered-features)
- [Deploying a Team](#deploying-a-team)
- [Variables](#variables)
- [Cron Scheduling](#cron-scheduling)
- [The Catalog (Menu)](#the-catalog-menu)
- [Settings](#settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### First Launch

When you open AUI for the first time, you will see an interactive canvas with a single **Human/root node** displayed in gold. This is your organization root -- it represents you, the team owner. A welcome overlay appears with the message "Double-click to create your first team or use + in the toolbar."

The root node is always present and cannot be deleted. It serves as the top of your agent hierarchy, and everything you build -- teams, agents, skills -- branches out from it.

### Setting Up Your API Key

Before using any AI-powered features, you need to configure a Claude API key:

1. Click the **Menu** button in the top-right toolbar area.
2. In the Catalog panel that opens, click the **Settings** button in the utility row.
3. Under the **Claude API** section, paste your Anthropic API key (starts with `sk-ant-...`).
4. Click **Save Settings**.

The key is stored locally in `.aui/settings.json` within your home directory. It never leaves your machine except when making direct calls to the Anthropic API.

### Understanding the Canvas

The canvas is powered by React Flow and supports standard interactive controls:

- **Pan**: Click and drag on the empty canvas background to move around.
- **Zoom**: Scroll up to zoom in, scroll down to zoom out. The zoom range is 0.3x to 2x.
- **Select a node**: Click on any node to select it. The Inspector panel on the right opens automatically, showing that node's details.
- **Deselect**: Click on empty canvas space to clear the selection.
- **MiniMap**: A small overview map in the bottom-right corner shows your full tree structure. Use it to orient yourself in large organizations.
- **Controls**: Zoom and fit-to-view buttons appear in the bottom-left corner.

Nodes are color-coded by type:

| Node Type | Color  | Border Style |
|-----------|--------|--------------|
| Human     | Gold   | Solid        |
| Team      | Blue   | Dashed       |
| Agent     | Orange | Dashed       |
| Skill     | Green  | Solid        |
| Context   | Purple | Solid        |

---

## Building Your First Team

### Step 1: Create a Team Node

There are several ways to create a new node:

- Click the **+** button in the top-right toolbar.
- Press **Ctrl+N** to open the create dialog.
- **Double-click** on empty canvas space.
- **Right-click** on the canvas and select "New Team" or "New Skill."

In the Create dialog, choose the node kind (Team, Agent, or Skill), enter a name and optional description, then confirm. Teams are represented as "group" nodes with a blue dashed border.

### Step 2: Give It a Name and Description

Click your newly created team node to select it. The Inspector panel opens on the right. Under **Team Info**, you will see fields for:

- **Name**: The team's display name (e.g., "Frontend Development").
- **Description**: A short summary of the team's purpose. This is important -- it provides context for AI generation and appears in deploy primers.

Click **Save** after making changes.

### Step 3: Add Agents to the Team

With a team node selected, you can add agents (team members) in several ways:

- Click the **+ Add Agent** button at the bottom of the Agents section in the Inspector.
- Hover over the team node on the canvas and click the small **+** button that appears in the bottom-right corner.
- Right-click the team node and select "Add Child Node."

Each agent you create becomes a child of that team. In the Inspector, agents nested inside a team display as "Agent Info" rather than "Team Info" and show an orange badge.

### Step 4: Configure Each Agent

Select an individual agent node (click it on the canvas) to edit its properties in the Inspector. For **agent files** (`.claude/agents/*.md`), the full configuration includes:

- **Name**: The agent's display name.
- **Description**: What this agent does. Use the purple **Generate** button to auto-write this.
- **Model**: Choose from available Claude models (e.g., `claude-sonnet-4-5-20250929`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`), or leave as default.
- **Permission Mode**: Control the agent's autonomy level (`default`, `acceptEdits`, `bypassPermissions`, `plan`, `dontAsk`).
- **Max Turns**: Limit the number of conversation turns this agent can take.
- **Tools**: A tag-based list of tools this agent is allowed to use. Type a tool name and press Enter to add.
- **Disallowed Tools**: Tools explicitly blocked from this agent.
- **Skills**: Slash-command skills assigned to this agent.
- **Color**: A custom display color for the agent node.
- **Variables**: Key-value pairs for runtime configuration (see [Variables](#variables)).
- **Prompt Body**: The full markdown prompt body for the agent, editable with a Monaco Editor.

For **team-member nodes** (agents created as children of a team via the group editor), the fields are simpler: name, description, variables, and assigned skills.

Click **Save** to persist changes. Click **Validate** to check for issues. Click **Discard** to revert unsaved edits.

---

## Working with Skills

### What Are Skills?

Skills are reusable capability definitions stored as markdown files. They define specialized behaviors that agents can invoke via slash commands (e.g., `/deploy-app`). In AUI, skills appear as green nodes on the canvas.

### Creating a Skill

You can create skills in several ways:

1. **From the Create dialog**: Click **+** or press Ctrl+N, select "Skill," enter a name and description.
2. **From the Catalog**: Open the Menu, click **+ New**, and select Skill.
3. **Inline from a team**: When editing a team or agent in the Inspector, use the skill assignment dropdown and select **+ Create New Skill...** to create and immediately assign a skill.

### Skill File Structure

Each skill is stored as a markdown file on disk at:

```
.claude/skills/[skill-name]/SKILL.md
```

The file uses YAML frontmatter for metadata:

```markdown
---
name: deploy-app
description: Handles application deployment to production
---

# Deploy App

## Steps

1. Run the test suite
2. Build the production bundle
3. Deploy to the staging environment
4. Run smoke tests
5. Promote to production

## Notes
- Always verify tests pass before deploying
```

### Assigning Skills to Teams and Agents

In the Inspector panel for any team or agent node:

1. Scroll to the **Assigned Skills** section.
2. Use the dropdown to select an existing skill, or choose **+ Create New Skill...** to make one on the spot.
3. Click **Add** to assign it.
4. Remove assigned skills by clicking the **x** button next to any skill in the list.

Skills assigned to the **root node** become **Global Skills** -- they are visible to every team and agent in the organization. Skills assigned to a team are shared across all agents on that team.

### Importing Skills

From the Catalog (Menu), click the **Import** button to import skills:

- **From File**: Browse your filesystem and select a `.md` file.
- **From GitHub URL**: Paste a GitHub URL to a skill markdown file. AUI automatically converts GitHub blob URLs to raw content URLs for download.

---

## AI-Powered Features

All AI features require a valid Claude API key configured in Settings. AUI uses Claude Haiku 4.5 for fast, cost-effective generation.

### Generate Description

Every team node and agent node has a purple **Generate** button next to the Description field. Click it to have Claude write a contextual 1-2 sentence description based on the node's name and its position in the hierarchy. For example, an agent named "Code Reviewer" inside a team called "Quality Assurance" will get a description specific to that context.

### Auto-Fill (Root Node)

On the root node's Inspector panel, the **Auto-Fill with AI** section lets you generate an entire org structure at once:

1. Set the desired number of **Teams** (1-10).
2. Set the number of **Agents per team** (1-10).
3. Click the purple **Auto-Fill** button.

AUI sends your root description (company/project context) to Claude, which returns a complete team structure with descriptive names and role descriptions. All teams and agents are created as group nodes under your root.

### Auto-Fill Agents (Team Node)

When viewing a team in the Inspector, the **Auto-Fill Agents** section works similarly but is scoped to just that team:

1. Set the agent **Count** (1-10).
2. Click the purple **Auto-Fill Agents** button.

Claude generates agents tailored to the team's name and description.

### Smart Team Generation (Generate Teams to Meet Goals)

This is the most powerful generation feature. On the root node:

1. Write a detailed description of your project goals in the **Description** field.
2. An orange **Generate Teams to Meet Goals** button appears below the Auto-Fill button.
3. Click it, and Claude analyzes your goals to create purpose-built teams with agents whose roles directly address different aspects of your objectives.

This button only appears when the root description is non-empty.

### Multi-Select Batch Generation

For bulk description generation:

1. Hold **Ctrl** (or Cmd on macOS) and click multiple nodes on the canvas.
2. A purple toolbar appears at the top center showing the selection count.
3. Click **Generate All Descriptions** to have Claude write descriptions for every selected node in sequence.
4. A toast notification reports how many descriptions were generated.
5. Click the **x** on the toolbar or click empty canvas space to clear the selection.

---

## Deploying a Team

Deployment is the process of launching an actual Claude Code agent team session from your visual design. It is available for top-level team nodes only (not for agents nested inside teams).

### Step-by-Step Deploy Flow

1. **Select a team node** on the canvas.
2. In the Inspector, scroll down to the **Deploy** section.
3. Write a **Deploy Prompt** describing what the team should accomplish in this session.
4. Click the orange **Deploy Team** button.

### What Happens During Deploy

AUI performs these steps automatically:

1. **Generates missing skill files**: For each agent in the team, AUI creates a `SKILL.md` file at `.claude/skills/[team-slug]-[agent-slug]/SKILL.md`. A manager skill file is also created at `.claude/skills/[team-slug]-manager/SKILL.md`. Existing skill files are preserved and not overwritten.

2. **Builds a comprehensive primer**: The primer is a large markdown document that contains:
   - Company/organization context from the root node (owner name, description)
   - Global skills available to all agents
   - Other sibling teams (for cross-team awareness)
   - Team description, variables, and assigned skills
   - The full manager skill file content
   - Each agent's profile with their complete skill file content inline
   - The deploy objective (your prompt)
   - Step-by-step deployment instructions for Claude (team creation, agent spawning, task assignment, coordination, and shutdown)

3. **Saves the primer**: The primer is written to `.aui/deploy-primer.md` for reference.

4. **Opens an external terminal**: AUI spawns a PowerShell window (on Windows) or bash session (on macOS/Linux) with the command:
   ```
   claude --dangerously-skip-permissions <primer-content>
   ```
   Claude receives the full primer and is ready to create and manage your agent team.

A mini terminal output log appears in the Inspector showing the deploy progress.

### Other Deploy Actions

- **Export Skill**: Click the green **Export Skill** button to generate a single comprehensive `SKILL.md` file that packages the entire team (roster, skills, coordination rules, deployment instructions) into a reusable slash command. The file is saved to `.claude/skills/[team-slug]/SKILL.md`.

- **Generate Individual Skill Files**: Click the dashed purple **Generate Individual Skill Files** button to create per-agent and per-manager skill files without launching a deploy.

---

## Variables

Variables are key-value pairs that you can attach to teams and agents for runtime configuration.

### Adding Variables

1. Select a team or agent node in the Inspector.
2. Scroll to the **Variables** section.
3. Click **+ Add Variable**.
4. Enter a **Name** (e.g., `API_URL`, `DATABASE_HOST`) and a **Value**.
5. Click **Save** to persist.

Remove a variable by clicking the **x** button next to it.

### How Variables Are Used

Variables appear in several outputs:

- **Skill file exports**: When you export a team as a skill, all team and agent variables are included as environment variable tables.
- **Deploy primers**: The deployment primer includes all variables so that spawned agents have access to the configuration they need.
- **Individual skill files**: Each agent's generated skill file lists their assigned variables.

Variables are useful for anything that might change between deployments: API endpoints, database URLs, feature flags, authentication tokens, or project-specific paths.

---

## Cron Scheduling

AUI includes a scheduling system for recurring team deployments.

### Opening the Scheduler

1. Click **Menu** in the toolbar to open the Catalog.
2. Click **Schedules** in the utility row.

Alternatively, the Schedule panel can be opened directly from the Catalog's utility buttons.

### Creating a Schedule

1. Click **+ New** in the Schedule panel header.
2. Select a **Team** from the dropdown (only top-level teams appear).
3. Choose a **Schedule** from the presets or write a custom cron expression:

   | Preset               | Cron Expression   |
   |----------------------|-------------------|
   | Every hour           | `0 * * * *`       |
   | Every 6 hours        | `0 */6 * * *`     |
   | Daily at 9am         | `0 9 * * *`       |
   | Weekdays at 9am      | `0 9 * * 1-5`     |
   | Weekly (Monday 9am)  | `0 9 * * 1`       |
   | Monthly (1st at 9am) | `0 9 1 * *`       |

4. Write a **Prompt** describing what the team should accomplish on each run.
5. Click **Create Schedule**.

### Managing Schedules

- **Toggle**: Click the ON/OFF badge to enable or disable a schedule.
- **Delete**: Click the **x** button on any schedule to remove it.
- Schedules are saved to `.aui/schedules.json`.

Note: AUI stores the schedule definitions. To actually execute scheduled deployments, use an external cron runner or the Claude CLI to read from `.aui/schedules.json` and trigger deployments at the configured intervals.

---

## The Catalog (Menu)

The Catalog is AUI's central hub for browsing and managing all items in your project. Open it by clicking **Menu** in the toolbar.

### Sections

The Catalog scans your filesystem and displays three categories:

- **Teams**: All top-level team (group) nodes, showing agent count and skill count.
- **Skills**: All skill files found in `.claude/skills/*/SKILL.md`.
- **Agents**: All agent files found in `.claude/agents/*.md`.

### Actions

- **Search**: Type in the search bar to filter items by name, description, or team.
- **Filter pills**: Click "All", "Skills", "Teams", or "Agents" to filter by type.
- **Import**: Import skills from a local file or a GitHub URL.
- **+ New**: Create a new node (opens the Create dialog).
- **Refresh**: Reload the project from disk.
- **Save Plan**: Export the full organization as a company plan to `.aui/company-plan/`.
- **Settings**: Open the Settings panel.
- **Schedules**: Open the Schedule panel.
- **Chat**: Open the Chat panel for conversational interaction with Claude.

Each item card can be expanded to show full details, and you can add filesystem items to the tree or navigate to them on the canvas.

---

## Settings

Open Settings from the Catalog (Menu) utility row or via the **Settings** button.

### Claude API

- **API Key**: Your Anthropic API key (`sk-ant-...`). Required for all AI features (Generate Description, Auto-Fill, Smart Generation, Chat). Stored locally in `.aui/settings.json`. Use the Show/Hide toggle to reveal or mask the key.

### Colors

Customize the visual appearance of your canvas:

- **Team Color**: Default color for team nodes (default: `#4a9eff` blue).
- **Agent Color**: Default color for agent nodes (default: `#ff9800` orange).
- **Accent Color**: The primary UI accent color applied to buttons, links, and highlights.

Each color has a color picker and a hex input field.

### Preferences

- **Auto-save**: When enabled, tree metadata is automatically saved whenever you make changes. Toggle this off if you prefer manual saves only.

Click **Save Settings** to persist all changes.

---

## Keyboard Shortcuts

| Shortcut           | Action                                           |
|--------------------|--------------------------------------------------|
| `Ctrl+N`           | Open the Create Node dialog                      |
| `Ctrl+F`           | Focus the search bar on the canvas               |
| `Ctrl+Click`       | Multi-select nodes (add/remove from selection)   |
| `Click empty space` | Clear selection and deselect all nodes           |
| `Double-click canvas` | Open the Create Node dialog                   |
| `Delete` / `Backspace` | Open delete confirmation for the selected node |
| `Escape`           | Deselect the current node                        |
| `Right-click node` | Open context menu (Edit, Add Child, Move to Root, Delete) |
| `Right-click canvas` | Open context menu (New Team, New Skill)        |

---

## Tips and Best Practices

### Start with a Clear Root Description

The root node's description provides context for all AI generation features. A detailed description of your company, project, or objectives will produce significantly better Auto-Fill and Smart Generation results. For example, instead of "My project," write "A SaaS platform for real-time logistics tracking with a React frontend, Python microservices backend, and PostgreSQL database."

### Use Smart Team Generation for Goal-Oriented Building

If you know what you want to accomplish but are not sure how to structure your teams, write your goals in the root description and use **Generate Teams to Meet Goals**. Claude will analyze your objectives and create teams with complementary agent roles designed to address each goal.

### Generate Skill Files Before Deploying

Click **Generate Individual Skill Files** on a team before your first deploy. This creates detailed `SKILL.md` files for the team manager and each agent. Review and customize these files, then deploy. The deploy process will preserve your customizations since it only generates files that do not already exist.

### Leverage Sibling Team Awareness

The deploy primer automatically includes information about other teams in your organization. This gives agents cross-team awareness so they can understand the broader context of their work and coordinate effectively when tasks overlap.

### Use Variables for Runtime Configuration

Instead of hardcoding values into agent descriptions or skill files, use variables. They make it easy to change API keys, endpoints, or feature flags between deployments without editing multiple files.

### Organize with the Hierarchy

Drag nodes close to other nodes to reparent them. The tree hierarchy determines the context that flows into generated descriptions, skill files, and deploy primers. A well-organized hierarchy produces better AI outputs.

### Multi-Select for Batch Operations

After building out a team structure with Auto-Fill, use Ctrl+Click to select all the newly created nodes, then click **Generate All Descriptions** to fill in descriptions for everything at once.

### Use the Catalog to Stay Organized

The Catalog (Menu) provides a searchable, filterable view of all items in your project. Use it to find skills, check which agents are on the tree, import new skills, and access utility functions like Save Plan and Schedules.

### Review the Deploy Primer

After deploying, check `.aui/deploy-primer.md` to see exactly what was sent to Claude. This is helpful for debugging team behavior or refining your team structure. You can also use the primer as a template for manual Claude CLI sessions.

### Keep Skill Files Concise

Skills work best when they are focused and specific. Rather than creating one large skill that covers everything, create multiple targeted skills and assign them to the appropriate agents. This makes agents more focused and skill files easier to maintain.

---

## File Reference

AUI reads and writes standard Claude Code configuration files, plus its own metadata:

### Claude Code Files (Standard)

| Path                              | Purpose                          |
|-----------------------------------|----------------------------------|
| `.claude/agents/*.md`             | Agent definition files (YAML frontmatter + markdown) |
| `.claude/skills/[name]/SKILL.md`  | Skill definition files           |
| `.claude/settings.json`           | Claude Code settings             |
| `CLAUDE.md`                       | Project-level context file       |

### AUI Files

| Path                          | Purpose                                    |
|-------------------------------|--------------------------------------------|
| `.aui/settings.json`         | API key, color preferences, auto-save      |
| `.aui/tree.json`             | Tree hierarchy, group metadata, variables  |
| `.aui/deploy-primer.md`      | Last generated deploy primer               |
| `.aui/schedules.json`        | Cron job definitions                       |
| `.aui/company-plan/`         | Exported company plan documents            |

AUI has zero lock-in. All agent and skill files are standard Claude Code format. If you stop using AUI, your configurations continue to work with the Claude CLI directly.
