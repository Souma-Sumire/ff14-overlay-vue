import { computed, shallowRef } from "vue";

export interface Command {
  redo: () => void;
  undo: () => void;
  label?: string;
  coalesceKey?: string;
}

interface CommandHistoryOptions {
  maxSize?: number;
}

export function useCommandHistory(options: CommandHistoryOptions = {}) {
  const maxSize = Math.max(1, options.maxSize ?? 300);
  const history = shallowRef<Command[]>([]);
  const cursor = shallowRef(0);
  const isApplying = shallowRef(false);

  const canUndo = computed(() => cursor.value > 0);
  const canRedo = computed(() => cursor.value < history.value.length);
  const entries = computed(() =>
    history.value.map((command, index) => ({
      index,
      label: command.label || `Command ${index + 1}`,
      cursor: index + 1,
      applied: index < cursor.value,
    })),
  );

  function clear() {
    history.value = [];
    cursor.value = 0;
  }

  function trimHistoryIfNeeded() {
    if (history.value.length <= maxSize) return;

    const extra = history.value.length - maxSize;
    history.value = history.value.slice(extra);
    cursor.value = Math.max(0, cursor.value - extra);
  }

  function execute(command: Command) {
    if (isApplying.value) return;

    command.redo();

    let nextHistory = history.value.slice(0, cursor.value);
    const prev = nextHistory.at(-1);
    if (prev && command.coalesceKey && prev.coalesceKey === command.coalesceKey) {
      const merged: Command = {
        redo: command.redo,
        undo: prev.undo,
        label: command.label || prev.label,
        coalesceKey: command.coalesceKey,
      };
      nextHistory = nextHistory.slice(0, -1);
      nextHistory.push(merged);
    } else {
      nextHistory.push(command);
    }

    history.value = nextHistory;
    cursor.value = history.value.length;
    trimHistoryIfNeeded();
  }

  function applyUndo(command: Command) {
    command.undo();
  }

  function applyRedo(command: Command) {
    command.redo();
  }

  function jumpTo(targetCursor: number) {
    const target = Math.max(0, Math.min(targetCursor, history.value.length));
    if (target === cursor.value) return;

    isApplying.value = true;
    try {
      if (target < cursor.value) {
        while (cursor.value > target) {
          const command = history.value[cursor.value - 1];
          if (!command) break;
          applyUndo(command);
          cursor.value -= 1;
        }
      } else {
        while (cursor.value < target) {
          const command = history.value[cursor.value];
          if (!command) break;
          applyRedo(command);
          cursor.value += 1;
        }
      }
    } finally {
      isApplying.value = false;
    }
  }

  function undo() {
    jumpTo(cursor.value - 1);
  }

  function redo() {
    jumpTo(cursor.value + 1);
  }

  return {
    canUndo,
    canRedo,
    entries,
    cursor,
    isApplying,
    clear,
    execute,
    undo,
    redo,
    jumpTo,
  };
}
