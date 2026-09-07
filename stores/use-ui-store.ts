import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isTemplateModalOpen: boolean;
  setTemplateModalOpen: (open: boolean) => void;
  isAIModalOpen: boolean;
  setAIModalOpen: (open: boolean) => void;
  aiPromptContext: string;
  setAIPromptContext: (ctx: string) => void;
  isThemeModalOpen: boolean;
  setThemeModalOpen: (open: boolean) => void;
  isCreateWorkspaceModalOpen: boolean;
  setCreateWorkspaceModalOpen: (open: boolean) => void;
  isInviteModalOpen: boolean;
  setInviteModalOpen: (open: boolean) => void;
  isWorkspaceSettingsOpen: boolean;
  setWorkspaceSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  isTemplateModalOpen: false,
  setTemplateModalOpen: (open) => set({ isTemplateModalOpen: open }),
  isAIModalOpen: false,
  setAIModalOpen: (open) => set({ isAIModalOpen: open }),
  aiPromptContext: '',
  setAIPromptContext: (ctx) => set({ aiPromptContext: ctx }),
  isThemeModalOpen: false,
  setThemeModalOpen: (open) => set({ isThemeModalOpen: open }),
  isCreateWorkspaceModalOpen: false,
  setCreateWorkspaceModalOpen: (open) => set({ isCreateWorkspaceModalOpen: open }),
  isInviteModalOpen: false,
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),
  isWorkspaceSettingsOpen: false,
  setWorkspaceSettingsOpen: (open) => set({ isWorkspaceSettingsOpen: open }),
}));

