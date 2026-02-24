import type { AuiNode } from "@/types/aui-node";

const TEAM_PREFIXES: [string, string][] = [
  ["gsd-", "GSD"],
  ["sm-", "Social Media"],
  ["n8n-", "n8n"],
  ["incident-", "Incident Response"],
  ["datafying-", "Datafying"],
  ["google-", "Google"],
  ["social-", "Social Media"],
  ["launch-", "Launchers"],
  ["moltbook", "Social"],
];

export function detectTeam(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [prefix, team] of TEAM_PREFIXES) {
    if (lower.startsWith(prefix)) return team;
  }
  return null;
}

const TEAM_COLORS: Record<string, string> = {
  GSD: "#f47067",
  "Social Media": "#8b5cf6",
  n8n: "#f0883e",
  "Incident Response": "#f85149",
  Datafying: "#39d2c0",
  Google: "#4285f4",
  Launchers: "#6e7681",
  Social: "#db61a2",
};

export function getTeamColor(team: string): string {
  return TEAM_COLORS[team] ?? "#888888";
}

export function groupNodesByTeam(nodes: Map<string, AuiNode>): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const [id, node] of nodes) {
    const team = node.team ?? detectTeam(node.name);
    if (!team) continue;
    const list = groups.get(team);
    if (list) {
      list.push(id);
    } else {
      groups.set(team, [id]);
    }
  }
  return groups;
}
