import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";
import { layoutNodes } from "./layout";
import { OrgNode } from "./OrgNode";
import { SearchBar } from "@/components/common/SearchBar";
import { ContextMenu } from "@/components/common/ContextMenu";
import type { AuiNode } from "@/types/aui-node";
import type { NodeKind } from "@/types/aui-node";
import { getApiKey, generateText } from "@/services/claude-api";
import { toast } from "@/components/common/Toast";

const nodeTypes = { orgNode: OrgNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "#3a3a6a", strokeWidth: 1.5 },
};

const connectionLineStyle = { stroke: "#4a9eff", strokeWidth: 2 };

function filterTreeNodes(
  allNodes: Map<string, AuiNode>,
  searchQuery: string,
  filterKind: string | null,
): Map<string, AuiNode> {
  if (!searchQuery && !filterKind) return allNodes;

  const query = searchQuery.toLowerCase();

  // First pass: find nodes that match the filters
  const matchingIds = new Set<string>();
  for (const [id, node] of allNodes) {
    if (id === "root") {
      matchingIds.add(id);
      continue;
    }
    const matchesSearch = !searchQuery || node.name.toLowerCase().includes(query);
    const matchesKind = !filterKind || node.kind === filterKind;
    if (matchesSearch && matchesKind) {
      matchingIds.add(id);
    }
  }

  // Second pass: include ancestors of matching nodes to preserve tree structure
  const visibleIds = new Set(matchingIds);
  for (const id of matchingIds) {
    let current = allNodes.get(id);
    while (current?.parentId && allNodes.has(current.parentId)) {
      visibleIds.add(current.parentId);
      current = allNodes.get(current.parentId);
    }
  }

  const filtered = new Map<string, AuiNode>();
  for (const id of visibleIds) {
    const node = allNodes.get(id);
    if (node) filtered.set(id, node);
  }
  return filtered;
}

export function TreeCanvas() {
  const treeNodes = useTreeStore((s) => s.nodes);
  const loading = useTreeStore((s) => s.loading);
  const error = useTreeStore((s) => s.error);
  const reparentNode = useTreeStore((s) => s.reparentNode);
  const selectNode = useUiStore((s) => s.selectNode);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const filterKind = useUiStore((s) => s.filterKind);
  const collapsedGroups = useUiStore((s) => s.collapsedGroups);
  const multiSelectedNodeIds = useUiStore((s) => s.multiSelectedNodeIds);
  const contextMenu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const openCreateDialog = useUiStore((s) => s.openCreateDialog);
  const toggleInspector = useUiStore((s) => s.toggleInspector);
  const projectPath = useTreeStore((s) => s.projectPath);
  const updateNode = useTreeStore((s) => s.updateNode);

  const toggleMultiSelect = useUiStore((s) => s.toggleMultiSelect);
  const clearMultiSelect = useUiStore((s) => s.clearMultiSelect);

  const [generatingAll, setGeneratingAll] = useState(false);

  const handleGenerateAllDescriptions = useCallback(async () => {
    if (!projectPath || multiSelectedNodeIds.size === 0) return;
    setGeneratingAll(true);
    try {
      const apiKey = await getApiKey(projectPath);
      if (!apiKey) {
        toast("No API key configured. Go to Settings to add one.", "error");
        setGeneratingAll(false);
        return;
      }

      const nodeIds = Array.from(multiSelectedNodeIds);
      let generated = 0;
      for (const nodeId of nodeIds) {
        const node = treeNodes.get(nodeId);
        if (!node || node.kind === "human") continue;

        const parentNode = node.parentId ? treeNodes.get(node.parentId) : null;
        const isGroup = node.kind === "group";
        const isMember = isGroup && parentNode?.kind === "group";
        const context = isMember
          ? `an agent named "${node.name}" in team "${parentNode?.name ?? "unknown"}"`
          : isGroup
            ? `a team named "${node.name}" that manages AI agents`
            : `a ${node.kind} named "${node.name}"`;

        try {
          const result = await generateText(apiKey, `Write a concise 1-2 sentence description for ${context}. Be specific about what it does. Only output the description text, nothing else.`);
          if (result.trim()) {
            updateNode(nodeId, { promptBody: result.trim(), lastModified: Date.now() });
            generated++;
          }
        } catch {
          // Skip failed nodes
        }
      }

      toast(`Generated ${generated} description${generated !== 1 ? "s" : ""}`, "success");
      clearMultiSelect();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    }
    setGeneratingAll(false);
  }, [projectPath, multiSelectedNodeIds, treeNodes, updateNode, clearMultiSelect]);

  const filteredNodes = useMemo(
    () => filterTreeNodes(treeNodes, searchQuery, filterKind),
    [treeNodes, searchQuery, filterKind],
  );

  const { flowNodes, flowEdges } = useMemo(
    () => layoutNodes(filteredNodes, collapsedGroups),
    [filteredNodes, collapsedGroups],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (event.ctrlKey || event.metaKey) {
        toggleMultiSelect(node.id);
      } else {
        clearMultiSelect();
        selectNode(node.id);
      }
    },
    [selectNode, toggleMultiSelect, clearMultiSelect],
  );

  // Track group drag start positions so children follow
  const dragStartRef = useRef<{
    parentId: string;
    startPos: { x: number; y: number };
    childPositions: Map<string, { x: number; y: number }>;
  } | null>(null);

  // Collect all descendant IDs (recursive)
  const getDescendantIds = useCallback(
    (parentId: string): string[] => {
      const ids: string[] = [];
      for (const [id, node] of treeNodes) {
        if (node.parentId === parentId) {
          ids.push(id);
          ids.push(...getDescendantIds(id));
        }
      }
      return ids;
    },
    [treeNodes],
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const auiNode = treeNodes.get(draggedNode.id);
      if (!auiNode || auiNode.kind !== "group") {
        dragStartRef.current = null;
        return;
      }

      // Capture starting positions of all descendants
      const descendantIds = new Set(getDescendantIds(draggedNode.id));
      const childPositions = new Map<string, { x: number; y: number }>();
      for (const n of nodes) {
        if (descendantIds.has(n.id)) {
          childPositions.set(n.id, { x: n.position.x, y: n.position.y });
        }
      }

      dragStartRef.current = {
        parentId: draggedNode.id,
        startPos: { x: draggedNode.position.x, y: draggedNode.position.y },
        childPositions,
      };
    },
    [treeNodes, nodes, getDescendantIds],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const ref = dragStartRef.current;
      if (!ref || ref.parentId !== draggedNode.id) return;

      const dx = draggedNode.position.x - ref.startPos.x;
      const dy = draggedNode.position.y - ref.startPos.y;

      setNodes((nds) =>
        nds.map((n) => {
          const startPos = ref.childPositions.get(n.id);
          if (!startPos) return n;
          return {
            ...n,
            position: {
              x: startPos.x + dx,
              y: startPos.y + dy,
            },
          };
        }),
      );
    },
    [setNodes],
  );

  // Drag-drop reparenting
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      dragStartRef.current = null;
      if (draggedNode.id === "root") return;

      // Check proximity to other nodes
      const PROXIMITY = 60;
      for (const otherNode of nodes) {
        if (otherNode.id === draggedNode.id) continue;
        const dx = Math.abs(draggedNode.position.x - otherNode.position.x);
        const dy = Math.abs(draggedNode.position.y - otherNode.position.y);
        if (dx < PROXIMITY && dy < PROXIMITY) {
          reparentNode(draggedNode.id, otherNode.id);
          return;
        }
      }
    },
    [nodes, reparentNode],
  );

  // Edge connection reparenting
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.target && connection.source) {
        reparentNode(connection.target, connection.source);
      }
    },
    [reparentNode],
  );

  // Double-click on empty canvas to create a new node
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only trigger when double-clicking the pane itself, not nodes
      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;
      openCreateDialog();
    },
    [openCreateDialog],
  );

  // Click on empty canvas to deselect
  const onPaneClick = useCallback(() => {
    selectNode(null);
    clearMultiSelect();
  }, [selectNode, clearMultiSelect]);

  // Right-click on empty canvas
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const clientX = "clientX" in event ? event.clientX : 0;
      const clientY = "clientY" in event ? event.clientY : 0;
      openContextMenu(clientX, clientY);
    },
    [openContextMenu],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        const nodeId = useUiStore.getState().selectedNodeId;
        if (nodeId && nodeId !== "root") {
          // Don't trigger when typing in inputs
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          const name = useTreeStore.getState().removeNodeFromCanvas(nodeId);
          if (name) toast(`Removed ${name} from canvas`, "info");
        }
      }
      if (e.key === "Escape") {
        selectNode(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectNode]);

  // Context menu items
  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    const nodeId = contextMenu.nodeId;

    // Pane context menu (no node selected)
    if (!nodeId) {
      const paneKinds: { label: string; kind: NodeKind }[] = [
        { label: "New Team", kind: "group" },
        { label: "New Skill", kind: "skill" },
      ];
      return paneKinds.map(({ label, kind }) => ({
        label,
        onClick: () => {
          useUiStore.getState().openCreateDialog(undefined, kind);
        },
      }));
    }

    // Node context menu
    return [
      {
        label: "Edit",
        onClick: () => {
          selectNode(nodeId);
          const { inspectorOpen } = useUiStore.getState();
          if (!inspectorOpen) toggleInspector();
        },
      },
      {
        label: "Add Child Node",
        onClick: () => useUiStore.getState().openCreateDialog(nodeId),
      },
      {
        label: "Move to Root",
        onClick: () => reparentNode(nodeId, "root"),
      },
      { label: "", onClick: () => {}, divider: true },
      {
        label: "Remove from Canvas",
        danger: true,
        onClick: () => {
          const name = useTreeStore.getState().removeNodeFromCanvas(nodeId);
          if (name) toast(`Removed ${name} from canvas`, "info");
        },
      },
    ];
  }, [contextMenu, selectNode, toggleInspector, reparentNode]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-secondary)",
          fontSize: 14,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "3px solid var(--border-color)",
            borderTopColor: "var(--accent-blue)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginRight: 12,
          }}
        />
        Loading project...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#f85149",
          fontSize: 14,
          padding: 32,
          textAlign: "center",
        }}
      >
        Error loading project: {error}
      </div>
    );
  }

  const showWelcome = treeNodes.size <= 1;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <SearchBar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onDoubleClick={onPaneDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#21262d" gap={20} size={1} />
        <Controls
          position="bottom-left"
          className="aui-controls"
        />
        <MiniMap
          position="bottom-right"
          className="aui-minimap"
          nodeColor={(node) => {
            const auiNode = node.data?.auiNode as { kind?: string; parentId?: string | null } | undefined;
            const kind = auiNode?.kind;
            if (kind === "group") {
              const pid = auiNode?.parentId;
              if (pid && pid !== "root") return "#f0883e";
              return "#4a9eff";
            }
            const colors: Record<string, string> = {
              agent: "#f0883e",
              skill: "#3fb950",
              settings: "#6e7681",
              human: "#d29922",
              context: "#8b5cf6",
            };
            return (kind && colors[kind]) || "#4a9eff";
          }}
          nodeStrokeWidth={0}
          nodeBorderRadius={4}
          maskColor="rgba(10, 10, 30, 0.65)"
          style={{
            background: "linear-gradient(135deg, rgba(21, 27, 35, 0.95) 0%, rgba(13, 17, 23, 0.95) 100%)",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
          }}
        />
      </ReactFlow>

      {showWelcome && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div
            style={{
              background: "rgba(13, 17, 23, 0.9)",
              borderRadius: 16,
              padding: "48px 56px",
              textAlign: "center",
              border: "1px solid var(--border-color)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 8,
                letterSpacing: "-0.01em",
              }}
            >
              Welcome to AUI
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              Visual manager for Claude Code agent teams
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
              }}
            >
              <span>Double-click the canvas to create a team</span>
              <span>
                or press <kbd style={{ background: "var(--bg-surface, #1c2333)", padding: "2px 6px", borderRadius: 4, fontSize: 12, border: "1px solid var(--border-color)" }}>Ctrl+N</kbd> to open the create dialog
              </span>
            </div>
          </div>
        </div>
      )}

      {multiSelectedNodeIds.size > 1 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "rgba(13, 17, 23, 0.95)",
            border: "1px solid #8b5cf6",
            borderRadius: 10,
            padding: "8px 16px",
            boxShadow: "0 4px 20px rgba(139, 92, 246, 0.25)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>
            {multiSelectedNodeIds.size} selected
          </span>
          <button
            onClick={handleGenerateAllDescriptions}
            disabled={generatingAll}
            style={{
              padding: "6px 14px",
              background: generatingAll ? "var(--border-color)" : "var(--accent-purple)",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: generatingAll ? "default" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              opacity: generatingAll ? 0.5 : 1,
            }}
          >
            {generatingAll ? "Generating..." : "Generate All Descriptions"}
          </button>
          <button
            onClick={clearMultiSelect}
            style={{
              padding: "4px 8px",
              background: "transparent",
              color: "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
            }}
            title="Clear selection"
          >
            x
          </button>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
