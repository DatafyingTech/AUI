import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { AuiNode } from "@/types/aui-node";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const NOTE_WIDTH = 200;
const NOTE_HEIGHT = 120;

export function layoutNodes(
  nodes: Map<string, AuiNode>,
  collapsedIds: Set<string> = new Set(),
  savedPositions: Record<string, { x: number; y: number }> = {},
): {
  flowNodes: Node[];
  flowEdges: Edge[];
} {
  // Build the set of visible nodes (exclude children of collapsed groups)
  const visibleNodes = new Map<string, AuiNode>();
  const noteNodes = new Map<string, AuiNode>();
  for (const [id, node] of nodes) {
    if (node.parentId && collapsedIds.has(node.parentId)) continue;
    if (node.kind === "note") {
      noteNodes.set(id, node);
    } else {
      visibleNodes.set(id, node);
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 30 });

  for (const [id] of visibleNodes) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const flowEdges: Edge[] = [];
  for (const [id, node] of visibleNodes) {
    if (node.parentId && visibleNodes.has(node.parentId)) {
      const isFirstLevel = node.parentId === "root";
      g.setEdge(node.parentId, id);
      flowEdges.push({
        id: `e-${node.parentId}-${id}`,
        source: node.parentId,
        target: id,
        type: "insertEdge",
        style: { stroke: "#3a3a6a", strokeWidth: 1.5 },
        animated: isFirstLevel,
      });
    }
  }

  dagre.layout(g);

  const flowNodes: Node[] = [];

  // Add tree nodes (orgNode type, dagre-positioned)
  for (const [id, node] of visibleNodes) {
    const saved = savedPositions[id];
    const dagrePos = g.node(id);
    flowNodes.push({
      id,
      type: "orgNode",
      position: saved
        ? { x: saved.x, y: saved.y }
        : { x: dagrePos.x - NODE_WIDTH / 2, y: dagrePos.y - NODE_HEIGHT / 2 },
      data: { auiNode: node },
    });
  }

  // Add sticky notes (stickyNote type, free-positioned, behind tree nodes)
  for (const [id, node] of noteNodes) {
    const saved = savedPositions[id];
    flowNodes.push({
      id,
      type: "stickyNote",
      position: saved
        ? { x: saved.x, y: saved.y }
        : { x: 50, y: 50 },
      data: { auiNode: node },
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      style: { zIndex: -1 },
    });
  }

  return { flowNodes, flowEdges };
}
