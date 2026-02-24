import { create } from "zustand";

interface UiState {
  selectedNodeId: string | null;
  inspectorOpen: boolean;
  contextHubOpen: boolean;
  contextHubTab: string;
  searchQuery: string;
  contextMenu: { x: number; y: number; nodeId?: string } | null;
  createDialogOpen: boolean;
  createDialogParentId: string | null;
  createDialogDefaultKind: string | null;
  deleteDialogNodeId: string | null;
  filterKind: string | null;
  chatPanelOpen: boolean;
  settingsOpen: boolean;
  scheduleOpen: boolean;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  collapsedGroups: Set<string>;
  multiSelectedNodeIds: Set<string>;
}

interface UiActions {
  selectNode(id: string | null): void;
  toggleInspector(): void;
  toggleContextHub(): void;
  setContextHubTab(tab: string): void;
  setSearchQuery(query: string): void;
  openContextMenu(x: number, y: number, nodeId?: string): void;
  closeContextMenu(): void;
  openCreateDialog(parentId?: string, defaultKind?: string): void;
  closeCreateDialog(): void;
  openDeleteDialog(nodeId: string): void;
  closeDeleteDialog(): void;
  setFilterKind(kind: string | null): void;
  toggleChatPanel(): void;
  toggleSettings(): void;
  toggleSchedule(): void;
  addToast(message: string, type?: 'success' | 'error' | 'info'): void;
  removeToast(id: string): void;
  toggleCollapse(groupId: string): void;
  toggleMultiSelect(nodeId: string): void;
  clearMultiSelect(): void;
  collapseAllGroups(groupIds: Set<string>): void;
  expandAllGroups(): void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()((set, get) => ({
  selectedNodeId: null,
  inspectorOpen: true,
  contextHubOpen: false,
  contextHubTab: "memory",
  searchQuery: "",
  contextMenu: null,
  createDialogOpen: false,
  createDialogParentId: null,
  createDialogDefaultKind: null,
  deleteDialogNodeId: null,
  filterKind: null,
  chatPanelOpen: false,
  settingsOpen: false,
  scheduleOpen: false,
  toasts: [],
  collapsedGroups: new Set<string>(),
  multiSelectedNodeIds: new Set<string>(),

  selectNode(id: string | null) {
    if (id !== null) {
      set({ selectedNodeId: id, inspectorOpen: true });
    } else {
      set({ selectedNodeId: null });
    }
  },

  toggleInspector() {
    set((state) => ({ inspectorOpen: !state.inspectorOpen }));
  },

  toggleContextHub() {
    set((state) => ({
      contextHubOpen: !state.contextHubOpen,
      // Close other overlays when opening context hub
      ...(!state.contextHubOpen ? { chatPanelOpen: false, settingsOpen: false, scheduleOpen: false } : {}),
    }));
  },

  setContextHubTab(tab: string) {
    set({ contextHubTab: tab });
  },

  setSearchQuery(query: string) {
    set({ searchQuery: query });
  },

  openContextMenu(x: number, y: number, nodeId?: string) {
    set({ contextMenu: { x, y, nodeId } });
  },

  closeContextMenu() {
    set({ contextMenu: null });
  },

  openCreateDialog(parentId?: string, defaultKind?: string) {
    set({
      createDialogOpen: true,
      createDialogParentId: parentId ?? null,
      createDialogDefaultKind: defaultKind ?? null,
    });
  },

  closeCreateDialog() {
    set({ createDialogOpen: false, createDialogParentId: null, createDialogDefaultKind: null });
  },

  openDeleteDialog(nodeId: string) {
    set({ deleteDialogNodeId: nodeId });
  },

  closeDeleteDialog() {
    set({ deleteDialogNodeId: null });
  },

  setFilterKind(kind: string | null) {
    set({ filterKind: kind });
  },

  toggleChatPanel() {
    set((state) => ({
      chatPanelOpen: !state.chatPanelOpen,
      // Close other overlays when opening chat
      ...(!state.chatPanelOpen ? { settingsOpen: false, scheduleOpen: false, contextHubOpen: false } : {}),
    }));
  },

  toggleSettings() {
    set((state) => ({
      settingsOpen: !state.settingsOpen,
      // Close other overlays when opening settings
      ...(!state.settingsOpen ? { chatPanelOpen: false, scheduleOpen: false, contextHubOpen: false } : {}),
    }));
  },

  toggleSchedule() {
    set((state) => ({
      scheduleOpen: !state.scheduleOpen,
      // Close other overlays when opening schedule
      ...(!state.scheduleOpen ? { chatPanelOpen: false, settingsOpen: false, contextHubOpen: false } : {}),
    }));
  },

  addToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast(id: string) {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  toggleCollapse(groupId: string) {
    set((state) => {
      const next = new Set(state.collapsedGroups);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return { collapsedGroups: next };
    });
  },

  toggleMultiSelect(nodeId: string) {
    set((state) => {
      const next = new Set(state.multiSelectedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { multiSelectedNodeIds: next };
    });
  },

  clearMultiSelect() {
    set({ multiSelectedNodeIds: new Set<string>() });
  },

  collapseAllGroups(groupIds: Set<string>) {
    set({ collapsedGroups: new Set(groupIds) });
  },

  expandAllGroups() {
    set({ collapsedGroups: new Set<string>() });
  },
}));
