import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { AuiNode } from "@/types/aui-node";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;

export function layoutNodes(
  nodes: Map<string, AuiNode>,
  collapsedIds: Set<string> = new Set(),
): {
  flowNodes: Node[];
  flowEdges: Edge[];
} {
  // Build the set of visible nodes (exclude children of collapsed groups)
  const visibleNodes = new Map<string, AuiNode>();
  for (const [id, node] of nodes) {
    if (node.parentId && collapsedIds.has(node.parentId)) continue;
    visibleNodes.set(id, node);
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
  for (const [id, node] of visibleNodes) {
    const pos = g.node(id);
    flowNodes.push({
      id,
      type: "orgNode",
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: { auiNode: node },
    });
  }

  return { flowNodes, flowEdges };
}
