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
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";
import { layoutNodes } from "./layout";
import { OrgNode } from "./OrgNode";
import { StickyNote } from "./StickyNote";
import { InsertEdge } from "./InsertEdge";
import { SearchBar } from "@/components/common/SearchBar";
import { ContextMenu } from "@/components/common/ContextMenu";
import type { AuiNode } from "@/types/aui-node";
import type { NodeKind } from "@/types/aui-node";
import { getApiKey, generateText } from "@/services/claude-api";
import { toast } from "@/components/common/Toast";

const nodeTypes = { orgNode: OrgNode, stickyNote: StickyNote };
const edgeTypes = { insertEdge: InsertEdge };
const EMPTY_POSITIONS: Record<string, { x: number; y: number }> = {};

const defaultEdgeOptions = {
  type: "insertEdge" as const,
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
    if (node.kind === "note") {
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
  const savedPositions = useTreeStore((s) => s.metadata?.positions) ?? EMPTY_POSITIONS;

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

  // Use ref for savedPositions to avoid re-layout on every position save.
  // Positions are applied when tree structure changes (nodes added/removed, collapse).
  const savedPositionsRef = useRef(savedPositions);
  savedPositionsRef.current = savedPositions;

  const { flowNodes, flowEdges } = useMemo(
    () => layoutNodes(filteredNodes, collapsedGroups, savedPositionsRef.current),
    [filteredNodes, collapsedGroups],
  );

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Filter out React Flow's selection changes — we manage selection via multiSelectedNodeIds
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter((c) => c.type !== "select");
      if (filtered.length > 0) onNodesChangeRaw(filtered);
    },
    [onNodesChangeRaw],
  );

  // Sync layout nodes into React Flow state (with current multi-select applied)
  useEffect(() => {
    const ms = useUiStore.getState().multiSelectedNodeIds;
    setNodes(
      ms.size > 0
        ? flowNodes.map((n) => ({ ...n, selected: ms.has(n.id) }))
        : flowNodes,
    );
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Sync multiSelectedNodeIds → React Flow node.selected (enables built-in multi-drag)
  useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const result = nds.map((n) => {
        const shouldBeSelected = multiSelectedNodeIds.has(n.id);
        if (n.selected === shouldBeSelected) return n;
        changed = true;
        return { ...n, selected: shouldBeSelected };
      });
      return changed ? result : nds;
    });
  }, [multiSelectedNodeIds, setNodes]);

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

  // Undo stack for Ctrl+Z position restore
  const undoStackRef = useRef<Record<string, { x: number; y: number }>[]>([]);
  const MAX_UNDO = 20;

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
    (_event: React.MouseEvent, draggedNode: Node, draggedNodes: Node[]) => {
      // Capture before-positions for undo (all nodes that will move)
      const beforePositions: Record<string, { x: number; y: number }> = {};
      for (const n of draggedNodes) {
        beforePositions[n.id] = { x: n.position.x, y: n.position.y };
      }
      beforePositions[draggedNode.id] = { x: draggedNode.position.x, y: draggedNode.position.y };

      const auiNode = treeNodes.get(draggedNode.id);
      if (auiNode && (auiNode.kind === "group" || auiNode.kind === "pipeline")) {
        // Capture starting positions of all descendants (for group child-dragging)
        const descendantIds = new Set(getDescendantIds(draggedNode.id));
        const childPositions = new Map<string, { x: number; y: number }>();
        for (const n of nodes) {
          if (descendantIds.has(n.id)) {
            childPositions.set(n.id, { x: n.position.x, y: n.position.y });
            beforePositions[n.id] = { x: n.position.x, y: n.position.y };
          }
        }

        dragStartRef.current = {
          parentId: draggedNode.id,
          startPos: { x: draggedNode.position.x, y: draggedNode.position.y },
          childPositions,
        };
      } else {
        dragStartRef.current = null;
      }

      // Push to undo stack
      undoStackRef.current.push(beforePositions);
      if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
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

  // Drag-drop reparenting + position persistence
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node, draggedNodes: Node[]) => {
      const dragRef = dragStartRef.current;
      const wasGroupDrag = dragRef?.parentId === draggedNode.id;
      dragStartRef.current = null;

      if (draggedNode.id === "root") {
        useTreeStore.getState().saveNodePosition("root", { x: draggedNode.position.x, y: draggedNode.position.y });
        useTreeStore.getState().saveTreeMetadata();
        return;
      }

      // Only do proximity reparenting for single-node drag (not multi-select)
      if (draggedNodes.length <= 1) {
        const PROXIMITY = 60;
        for (const otherNode of nodes) {
          if (otherNode.id === draggedNode.id) continue;
          const dx = Math.abs(draggedNode.position.x - otherNode.position.x);
          const dy = Math.abs(draggedNode.position.y - otherNode.position.y);
          if (dx < PROXIMITY && dy < PROXIMITY) {
            useTreeStore.getState().clearNodePosition(draggedNode.id);
            reparentNode(draggedNode.id, otherNode.id);
            return;
          }
        }
      }

      // Save positions for all dragged nodes
      const batch: Record<string, { x: number; y: number }> = {};
      for (const n of draggedNodes) {
        batch[n.id] = { x: n.position.x, y: n.position.y };
      }

      // If group drag, also handle children and hidden descendants
      if (wasGroupDrag && dragRef) {
        const descendantIds = new Set(getDescendantIds(draggedNode.id));
        const dx = draggedNode.position.x - dragRef.startPos.x;
        const dy = draggedNode.position.y - dragRef.startPos.y;

        const visibleIds = new Set<string>();
        for (const n of nodes) {
          if (descendantIds.has(n.id)) {
            batch[n.id] = { x: n.position.x, y: n.position.y };
            visibleIds.add(n.id);
          }
        }

        const currentPositions = useTreeStore.getState().metadata?.positions ?? {};
        for (const id of descendantIds) {
          if (!visibleIds.has(id) && currentPositions[id]) {
            batch[id] = {
              x: currentPositions[id].x + dx,
              y: currentPositions[id].y + dy,
            };
          }
        }
      }

      useTreeStore.getState().saveNodePositions(batch);
      useTreeStore.getState().saveTreeMetadata();
    },
    [nodes, reparentNode, getDescendantIds],
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
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Delete" || e.key === "Backspace") {
        const nodeId = useUiStore.getState().selectedNodeId;
        if (nodeId && nodeId !== "root") {
          if (isInput) return;
          const name = useTreeStore.getState().removeNodeFromCanvas(nodeId);
          if (name) toast(`Removed ${name} from canvas`, "info");
        }
      }
      if (e.key === "Escape") {
        selectNode(null);
        clearMultiSelect();
      }
      // Ctrl+Z: undo last position move
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (isInput) return;
        e.preventDefault();
        const last = undoStackRef.current.pop();
        if (last) {
          setNodes((nds) =>
            nds.map((n) => {
              const saved = last[n.id];
              if (saved) return { ...n, position: saved };
              return n;
            }),
          );
          useTreeStore.getState().saveNodePositions(last);
          useTreeStore.getState().saveTreeMetadata();
          toast("Undo: positions restored", "info");
        }
      }
      // Ctrl+C: copy selected node
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (isInput) return;
        const nodeId = useUiStore.getState().selectedNodeId;
        if (nodeId && nodeId !== "root") {
          e.preventDefault();
          useTreeStore.getState().copyNodes(nodeId);
          const name = useTreeStore.getState().nodes.get(nodeId)?.name;
          if (name) toast(`Copied ${name}`, "info");
        }
      }
      // Ctrl+V: paste from clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (isInput) return;
        const nodeId = useUiStore.getState().selectedNodeId;
        const parentId = nodeId ?? "root";
        e.preventDefault();
        useTreeStore.getState().pasteNodes(parentId).then((newId) => {
          if (newId) {
            const name = useTreeStore.getState().nodes.get(newId)?.name;
            toast(`Pasted ${name ?? "node"}`, "success");
          }
        });
      }
      // Ctrl+D: duplicate selected node
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        if (isInput) return;
        const nodeId = useUiStore.getState().selectedNodeId;
        if (nodeId && nodeId !== "root") {
          e.preventDefault();
          useTreeStore.getState().duplicateNodes(nodeId).then((newId) => {
            if (newId) {
              const name = useTreeStore.getState().nodes.get(newId)?.name;
              toast(`Duplicated ${name ?? "node"}`, "success");
            }
          });
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectNode, clearMultiSelect, setNodes]);

  // Context menu items
  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    const nodeId = contextMenu.nodeId;

    // Pane context menu (no node selected)
    if (!nodeId) {
      return [
        {
          label: "New Team",
          onClick: () => useUiStore.getState().openCreateDialog(undefined, "group" as NodeKind),
        },
        {
          label: "New Project Manager",
          onClick: () => useUiStore.getState().openCreateDialog(undefined, "pipeline" as NodeKind),
        },
        { label: "", onClick: () => {}, divider: true },
        {
          label: "Add Sticky Note",
          onClick: () => {
            const id = useTreeStore.getState().createStickyNote(
              "",
              "yellow",
              { x: contextMenu!.x - 100, y: contextMenu!.y - 50 },
            );
            if (id) {
              toast("Sticky note added", "info");
            }
          },
        },
      ];
    }

    // Build "Move to..." submenu targets
    const currentNode = treeNodes.get(nodeId);
    const descendantIds = new Set(getDescendantIds(nodeId));
    const moveTargets: { label: string; onClick: () => void }[] = [];

    // Always offer "Root" first if not already at root
    if (currentNode?.parentId !== "root") {
      moveTargets.push({
        label: "Root",
        onClick: () => reparentNode(nodeId, "root"),
      });
    }

    // Add all groups and pipelines as targets (excluding self, descendants, current parent)
    for (const [id, node] of treeNodes) {
      if (id === nodeId) continue;
      if (id === "root") continue;
      if (id === currentNode?.parentId) continue;
      if (descendantIds.has(id)) continue;
      if (node.kind === "group" || node.kind === "pipeline") {
        const prefix = node.kind === "pipeline" ? "[Pipeline] " : "";
        moveTargets.push({
          label: `${prefix}${node.name}`,
          onClick: () => reparentNode(nodeId, id),
        });
      }
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
        label: "Duplicate",
        onClick: () => {
          useTreeStore.getState().duplicateNodes(nodeId).then((newId) => {
            if (newId) {
              const name = useTreeStore.getState().nodes.get(newId)?.name;
              toast(`Duplicated ${name ?? "node"}`, "success");
            }
          });
        },
      },
      {
        label: "Copy",
        onClick: () => {
          useTreeStore.getState().copyNodes(nodeId);
          const name = treeNodes.get(nodeId)?.name;
          if (name) toast(`Copied ${name}`, "info");
        },
      },
      ...(moveTargets.length > 0
        ? [
            {
              label: "Move to...",
              onClick: () => {},
              children: moveTargets,
            },
          ]
        : []),
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
  }, [contextMenu, selectNode, toggleInspector, reparentNode, treeNodes, getDescendantIds]);

  // Auto-select root node when welcome screen is showing so inspector opens immediately
  const showWelcomeEarly = !loading && !error && treeNodes.size <= 1;
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (showWelcomeEarly && treeNodes.has("root") && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      const timer = setTimeout(() => selectNode("root"), 100);
      return () => clearTimeout(timer);
    }
    if (!showWelcomeEarly) {
      hasAutoSelectedRef.current = false;
    }
  }, [showWelcomeEarly, treeNodes, selectNode]);

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
        edgeTypes={edgeTypes}
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
              pipeline: "#d946ef",
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
              Welcome to ATM
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              Agent Team Manager for Claude Code
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
              <span>Click the <strong style={{ color: "#d29922" }}>You</strong> node to get started</span>
              <span>Set up your company description, then generate teams</span>
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
