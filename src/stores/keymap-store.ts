import { create } from "zustand";
import { keybindingToString } from "../features/keymap/default-keybindings";
import type { CommandId, Keybinding, KeybindingOverrides } from "../features/keymap/types";

const STORAGE_KEY = "dbvolio-keybindings";

interface KeymapState {
  overrides: KeybindingOverrides;
  recordingCommandId: CommandId | null;
  setOverride: (commandId: CommandId, binding: Keybinding | null) => void;
  resetOverride: (commandId: CommandId) => void;
  resetAllOverrides: () => void;
  startRecording: (commandId: CommandId) => void;
  stopRecording: () => void;
}

function loadOverrides(): KeybindingOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as KeybindingOverrides;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persist(overrides: KeybindingOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export const useKeymapStore = create<KeymapState>((set) => ({
  overrides: loadOverrides(),
  recordingCommandId: null,

  setOverride: (commandId, binding) => {
    set((state) => {
      const next = { ...state.overrides };
      if (binding === null) {
        next[commandId] = null;
      } else {
        next[commandId] = keybindingToString(binding);
      }
      persist(next);
      return { overrides: next };
    });
  },

  resetOverride: (commandId) => {
    set((state) => {
      const next = { ...state.overrides };
      delete next[commandId];
      persist(next);
      return { overrides: next };
    });
  },

  resetAllOverrides: () => {
    persist({});
    set({ overrides: {} });
  },

  startRecording: (commandId) => set({ recordingCommandId: commandId }),
  stopRecording: () => set({ recordingCommandId: null }),
}));
