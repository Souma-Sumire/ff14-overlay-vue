<script lang="ts" setup>
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  snippetCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, toggleComment } from "@codemirror/commands";
import {
  HighlightStyle,
  StreamLanguage,
  bracketMatching,
  syntaxHighlighting,
  type StringStream,
} from "@codemirror/language";
import { lintGutter, linter, type Diagnostic } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, Prec, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  tooltips,
  type DecorationSet,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import JSON5 from "json5";
import type { Job } from "../../../cactbot/types/job";
import { onMounted, onUnmounted, ref, watch } from "vue";
import logDefinitions from "../../../cactbot/resources/netlog_defs";
import { completeIcon } from "@/resources/logic/status";
import {
  SUPPORTED_CACTBOT_EVENT_TYPES,
  parseAction,
  parseTimelineWithErrors,
} from "@/store/timeline";
import { chineseToIcon, getTimelineActionCompletions } from "@/utils/chineseToIcon";
import Util from "@/utils/util";
import { getIconSrcByPath, handleImgError } from "@/utils/xivapi";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    jobs?: Job[];
  }>(),
  {
    placeholder: "",
    jobs: () => [],
  },
);

export interface EditorDiagnosticItem {
  lineNumber: number;
  severity: "error" | "warning";
  message: string;
}

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "diagnostics", items: EditorDiagnosticItem[]): void;
  (e: "cursorTime", time: number | null): void;
  (e: "syncPreview", time: number): void;
}>();

interface TimelineStreamState {
  inString: boolean;
  stringQuote: string;
  inActionTag: boolean;
  inBrace: boolean;
}

const timelineKeywords = new Set(["tts", "window", "jump", "once", "sync"]);
const cactbotEventTypes = new Set(SUPPORTED_CACTBOT_EVENT_TYPES);

const timelineLanguage = StreamLanguage.define<TimelineStreamState>({
  name: "ff14-timeline",
  startState: () => ({
    inString: false,
    stringQuote: "",
    inActionTag: false,
    inBrace: false,
  }),
  token(stream: StringStream, state: TimelineStreamState): string | null {
    if (stream.sol()) {
      state.inString = false;
      state.stringQuote = "";
      state.inActionTag = false;
      state.inBrace = false;

      if (stream.eatSpace()) return null;
      if (stream.peek() === "#") {
        stream.skipToEnd();
        return "comment";
      }
      if (stream.match(/^-?\d+(?::\d+(?:\.\d+)?|\.\d+)?(?=\s|$)/)) {
        return "number";
      }
    }

    if (state.inString) {
      if (state.inActionTag) {
        if (stream.match(/^>?~/)) {
          state.inActionTag = false;
          return "tagName";
        }
        if (stream.eat(">")) {
          state.inActionTag = false;
          return "tagName";
        }
        if (stream.peek() === state.stringQuote) {
          state.inActionTag = false;
          state.inString = false;
          stream.next();
          return "string";
        }
        stream.match(/^[^>"“”]+/);
        return "tagName";
      }

      if (stream.eat("<")) {
        state.inActionTag = true;
        return "tagName";
      }

      const ch = stream.next();
      if (ch === "\\" && !stream.eol()) {
        stream.next();
        return "string";
      }
      if (
        ch === state.stringQuote ||
        (state.stringQuote === "“" && ch === "”") ||
        (state.stringQuote === "”" && ch === "”")
      ) {
        state.inString = false;
        state.stringQuote = "";
      }
      return "string";
    }

    if (stream.eatSpace()) return null;

    if (stream.peek() === "#") {
      stream.skipToEnd();
      return "comment";
    }

    const ch = stream.peek();
    if (ch === '"' || ch === "'" || ch === "“") {
      stream.next();
      state.inString = true;
      state.stringQuote = ch;
      return "string";
    }

    if (stream.eat("{")) {
      state.inBrace = true;
      return "punctuation";
    }
    if (stream.eat("}")) {
      state.inBrace = false;
      return "punctuation";
    }

    if (state.inBrace && stream.match(/^[A-Za-z_]\w*(?=\s*:)/)) {
      return "propertyName";
    }

    if (stream.match(/^\/(?:\\.|[^/\\])+\//)) {
      return "regexp";
    }

    if (stream.match(/^-?\d+(?::\d+(?:\.\d+)?|\.\d+)?/)) {
      return "number";
    }

    if (stream.match(/^[A-Za-z_]\w*/)) {
      const word = stream.current();
      if (timelineKeywords.has(word)) return "keyword";
      if (cactbotEventTypes.has(word)) return "className";
      return "variableName";
    }

    stream.next();
    return "punctuation";
  },
  languageData: {
    commentTokens: { line: "#" },
  },
});

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: tags.number, color: "#3b6ea5", fontWeight: "500" },
  { tag: tags.string, color: "#3b6e52" },
  { tag: tags.tagName, color: "#7c5338", fontWeight: "500" },
  { tag: tags.keyword, color: "#9e4756" },
  { tag: tags.className, color: "#68528e" },
  { tag: tags.propertyName, color: "#475569" },
  { tag: tags.regexp, color: "#3b6ea5" },
  { tag: tags.punctuation, color: "#64748b" },
]);

const darkHighlight = HighlightStyle.define([
  { tag: tags.comment, color: "#7b8494", fontStyle: "italic" },
  { tag: tags.number, color: "#7fa8cf", fontWeight: "500" },
  { tag: tags.string, color: "#8fb59f" },
  { tag: tags.tagName, color: "#c89b74", fontWeight: "500" },
  { tag: tags.keyword, color: "#c9828b" },
  { tag: tags.className, color: "#a995c9" },
  { tag: tags.propertyName, color: "#94a3b8" },
  { tag: tags.regexp, color: "#7fa8cf" },
  { tag: tags.punctuation, color: "#7b8494" },
]);

const featuredEventDetails: Record<string, string> = {
  StartsUsing: "技能读条开始同步",
  Ability: "技能判定同步",
  ActorControl: "场景控制事件同步",
  GainsEffect: "获得状态效果同步",
  LosesEffect: "失去状态效果同步",
  HeadMarker: "点名标记同步",
  Tether: "连线事件同步",
  MapEffect: "场地变化同步",
  AddedCombatant: "新增战斗实体同步",
  NpcYell: "NPC 台词同步",
  SystemLogMessage: "系统日志消息同步",
  InCombat: "进出战斗同步",
};

const eventTypeCompletions: Completion[] = SUPPORTED_CACTBOT_EVENT_TYPES.map((type) => ({
  label: type,
  detail: featuredEventDetails[type] ?? "事件同步",
  type: "class",
  boost: featuredEventDetails[type] ? 5 : 0,
  apply: (targetView, _completion, from, to) => {
    const insert = `${type} {  }`;
    const cursor = from + type.length + 3;
    targetView.dispatch({
      changes: { from, to, insert },
      selection: { anchor: cursor },
    });
    requestAnimationFrame(() => startCompletion(targetView));
  },
}));

const keywordCompletions: Completion[] = [
  snippetCompletion('tts "${播报内容}"', {
    label: "tts",
    detail: "语音播报",
    type: "keyword",
    boost: 8,
  }),
  snippetCompletion("window ${2.5},${2.5}", {
    label: "window",
    detail: "同步匹配时间窗口（前,后）",
    type: "keyword",
    boost: 8,
  }),
  snippetCompletion("jump ${0}", {
    label: "jump",
    detail: "匹配后跳转到目标秒数",
    type: "keyword",
    boost: 8,
  }),
  {
    label: "once",
    detail: "全场战斗仅匹配一次",
    type: "keyword",
    boost: 8,
  },
  snippetCompletion("sync /${regex}/", {
    label: "sync",
    detail: "自定义正则同步",
    type: "keyword",
    boost: 8,
  }),
  ...eventTypeCompletions,
];

function isInsideQuotes(textBeforeCursor: string): boolean {
  let inQuote = false;
  for (let i = 0; i < textBeforeCursor.length; i++) {
    const ch = textBeforeCursor[i];
    if (ch === "\\" && inQuote) {
      i++;
      continue;
    }
    if (ch === '"' || ch === "“" || ch === "”") {
      inQuote = !inQuote;
    }
  }
  return inQuote;
}

interface ActionCompletionOption extends Completion {
  iconId?: number;
}

function getSelectedJobEnums(): Set<number> {
  const result = new Set<number>();
  for (const job of props.jobs ?? []) {
    if (!job || job === "NONE") continue;
    const jobEnum = Util.jobToJobEnum(job);
    if (jobEnum > 0) result.add(Util.baseJobEnumConverted(jobEnum));
  }
  return result;
}

function parseLineTimestamp(lineText: string): number | null {
  const match = /^\s*(?:#\s*)?(?<time>-?\d+(?::\d+(?:\.\d+)?|\.\d+)?)(?=\s|$)/.exec(lineText);
  if (!match?.groups?.time) return null;
  const raw = match.groups.time;
  const mmss = raw.match(/^(?<neg>-)?(?<mm>\d+):(?<ss>\d+(?:\.\d+)?)$/);
  if (mmss) {
    const sign = mmss.groups?.neg ? -1 : 1;
    return sign * (Number(mmss.groups?.mm ?? 0) * 60 + Number(mmss.groups?.ss ?? 0));
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

const ignoredLogFields = new Set(["type", "timestamp", "source"]);

function getEventFieldCompletions(eventType: string): Completion[] {
  const def = logDefinitions[eventType as keyof typeof logDefinitions];
  if (!def || !("fields" in def) || !def.fields) return [];
  return Object.keys(def.fields)
    .filter((field) => !ignoredLogFields.has(field))
    .map((field) =>
      snippetCompletion(`${field}: "\${}"`, {
        label: field,
        detail: `${eventType} 字段`,
        type: "property",
        boost: field === "id" || field === "effectId" ? 10 : 0,
      }),
    );
}

interface EnclosingEventContext {
  eventType: string;
  openBraceIdx: number;
}

function findEnclosingEventContext(before: string): EnclosingEventContext | null {
  let depth = 0;
  let openBraceIdx = -1;
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < before.length; i++) {
    const ch = before[i]!;
    if (inQuote) {
      if (ch === "\\") {
        i++;
      } else if (ch === quoteChar || (quoteChar === "“" && ch === "”")) {
        inQuote = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "“") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === "{") {
      if (depth === 0) openBraceIdx = i;
      depth++;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) openBraceIdx = -1;
    }
  }
  if (depth <= 0 || openBraceIdx === -1) return null;
  const prefix = before.slice(0, openBraceIdx).trimEnd();
  const match = /([A-Za-z_]\w*)$/.exec(prefix);
  if (!match?.[1] || !cactbotEventTypes.has(match[1])) return null;
  return { eventType: match[1], openBraceIdx };
}

function collectUsedBlockFields(lineText: string, openBraceIdx: number): Set<string> {
  const used = new Set<string>();
  const closeIdx = consumeBraceBlock(lineText, openBraceIdx);
  const blockContent =
    closeIdx === -1
      ? lineText.slice(openBraceIdx + 1)
      : lineText.slice(openBraceIdx + 1, closeIdx - 1);
  for (const match of blockContent.matchAll(/(?:^|,)\s*(?:["']?)([A-Za-z_]\w*)(?:["']?)\s*:/g)) {
    if (match[1]) used.add(match[1]);
  }
  return used;
}

function timelineCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const after = line.text.slice(context.pos - line.from);

  if (/^\s*#/.test(before)) return null;

  const inQuotes = isInsideQuotes(before);
  if (inQuotes) {
    const tagMatch = before.match(/<([^<>"]*)$/);
    if (!tagMatch) return null;

    const query = (tagMatch[1] ?? "").trim().toLowerCase();
    const from = context.pos - (tagMatch[1]?.length ?? 0);
    const hasClosingBracket = after.startsWith(">");
    const allItems = getTimelineActionCompletions();
    const selectedJobs = getSelectedJobEnums();

    const matched: ActionCompletionOption[] = [];
    for (const item of allItems) {
      const labelLower = item.label.toLowerCase();
      const detailLower = item.detail?.toLowerCase() ?? "";
      const isPrefix = !query || labelLower.startsWith(query) || detailLower.startsWith(query);
      const isMatch = isPrefix || labelLower.includes(query) || detailLower.includes(query);
      if (!isMatch) continue;

      const isJobMatch =
        selectedJobs.size > 0 && Boolean(item.jobEnums?.some((j) => selectedJobs.has(j)));
      const score = (item.boost ?? 0) + (isJobMatch ? 30 : 0) + (isPrefix ? 10 : 0);

      matched.push({
        label: item.label,
        detail: item.detail,
        iconId: item.iconId,
        type: "function",
        boost: score,
        apply: (view, _completion, applyFrom, applyTo) => {
          const insert = hasClosingBracket ? item.label : `${item.label}>~`;
          view.dispatch({
            changes: { from: applyFrom, to: applyTo, insert },
            selection: { anchor: applyFrom + insert.length },
          });
        },
      });
    }

    if (matched.length === 0) return null;
    matched.sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0));
    return {
      from,
      options: matched.slice(0, 50),
      filter: false,
    };
  }

  const word = context.matchBefore(/[A-Za-z_]\w*/);
  const enclosing = findEnclosingEventContext(before);
  if (enclosing) {
    const insideBefore = before.slice(enclosing.openBraceIdx + 1);
    const isFieldSlot = /(?:^|,)\s*(?:[A-Za-z_]\w*)?$/.test(insideBefore);
    if (!isFieldSlot && !context.explicit) return null;
    const usedFields = collectUsedBlockFields(line.text, enclosing.openBraceIdx);
    const currentWord = word?.text ?? "";
    const fieldOptions = getEventFieldCompletions(enclosing.eventType).filter(
      (opt) => !usedFields.has(opt.label) || opt.label === currentWord,
    );
    if (fieldOptions.length === 0) return null;
    return {
      from: word ? word.from : context.pos,
      options: fieldOptions,
    };
  }

  if (!word && !context.explicit) return null;

  return {
    from: word ? word.from : context.pos,
    options: keywordCompletions,
  };
}

function consumeBraceBlock(text: string, startIndex: number): number {
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuote) {
      if (ch === "\\") {
        i++;
      } else if (ch === quoteChar || (quoteChar === "“" && ch === "”")) {
        inQuote = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "“") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function validateTailClauses(tailPart: string, tailOffset: number, diagnostics: Diagnostic[]) {
  let idx = 0;
  const len = tailPart.length;

  const skipSpaces = () => {
    while (idx < len && /\s/.test(tailPart[idx]!)) idx++;
  };

  while (idx < len) {
    skipSpaces();
    if (idx >= len) break;

    const tokenStart = idx;
    if (tailPart[idx] === "{" || tailPart[idx] === "}") {
      const end = tailPart[idx] === "{" ? consumeBraceBlock(tailPart, idx) : idx + 1;
      const to = end === -1 ? len : end;
      diagnostics.push({
        from: tailOffset + tokenStart,
        to: tailOffset + to,
        severity: "error",
        message: "缺少前置事件类型（如 StartsUsing 或 Ability）",
      });
      idx = to;
      continue;
    }

    while (idx < len && !/[\s{}]/.test(tailPart[idx]!)) idx++;
    const token = tailPart.slice(tokenStart, idx);

    if (token === "once") {
      continue;
    }

    if (token === "tts") {
      skipSpaces();
      const q = tailPart[idx];
      if (q === '"' || q === "'" || q === "“") {
        idx++;
        while (idx < len) {
          const ch = tailPart[idx]!;
          if (ch === "\\") {
            idx += 2;
            continue;
          }
          if (ch === q || (q === "“" && ch === "”")) {
            idx++;
            break;
          }
          idx++;
        }
      }
      continue;
    }

    if (token === "window") {
      skipSpaces();
      const argStart = idx;
      while (idx < len && !/\s/.test(tailPart[idx]!)) idx++;
      const arg = tailPart.slice(argStart, idx);
      if (!arg || !/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)?$/.test(arg)) {
        diagnostics.push({
          from: tailOffset + tokenStart,
          to: tailOffset + Math.max(idx, tokenStart + token.length),
          severity: "error",
          message: "window 参数格式无效，应为 秒数 或 前秒,后秒（如 window 2.5,2.5）",
        });
      }
      continue;
    }

    if (token === "jump") {
      skipSpaces();
      const argStart = idx;
      while (idx < len && !/\s/.test(tailPart[idx]!)) idx++;
      const arg = tailPart.slice(argStart, idx);
      if (!arg || !/^-?\d+(?::\d+(?:\.\d+)?|\.\d+)?$/.test(arg)) {
        diagnostics.push({
          from: tailOffset + tokenStart,
          to: tailOffset + Math.max(idx, tokenStart + token.length),
          severity: "error",
          message: "jump 后缺少有效的目标时间（例如 jump 413.9）",
        });
      }
      continue;
    }

    if (token === "sync" || token === "sync.once") {
      skipSpaces();
      if (tailPart[idx] !== "/") {
        diagnostics.push({
          from: tailOffset + tokenStart,
          to: tailOffset + idx,
          severity: "error",
          message: `${token} 后需要跟 /正则表达式/`,
        });
        continue;
      }
      idx++;
      let closed = false;
      while (idx < len) {
        if (tailPart[idx] === "\\") {
          idx += 2;
          continue;
        }
        if (tailPart[idx] === "/") {
          idx++;
          closed = true;
          break;
        }
        idx++;
      }
      if (!closed) {
        diagnostics.push({
          from: tailOffset + tokenStart,
          to: tailOffset + len,
          severity: "error",
          message: "sync 正则表达式缺少闭合的 /",
        });
      }
      continue;
    }

    if (cactbotEventTypes.has(token)) {
      skipSpaces();
      if (tailPart[idx] !== "{") {
        diagnostics.push({
          from: tailOffset + tokenStart,
          to: tailOffset + tokenStart + token.length,
          severity: "error",
          message: `事件类型「${token}」后缺少 { ... } 条件块`,
        });
        continue;
      }
      const blockEnd = consumeBraceBlock(tailPart, idx);
      if (blockEnd === -1) {
        diagnostics.push({
          from: tailOffset + idx,
          to: tailOffset + len,
          severity: "error",
          message: "条件块花括号 { 未闭合",
        });
        idx = len;
      } else {
        const blockText = tailPart.slice(idx, blockEnd);
        const def = logDefinitions[token as keyof typeof logDefinitions];
        if (def && "fields" in def && def.fields) {
          try {
            const parsed = JSON5.parse(blockText);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              const allowedFields = new Set([
                ...Object.keys(def.fields),
                "once",
                "source",
                "capture",
              ]);
              for (const key of Object.keys(parsed as Record<string, unknown>)) {
                if (allowedFields.has(key)) continue;
                const keyMatch = new RegExp(
                  `(?:["']?)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:["']?)\\s*:`,
                ).exec(blockText);
                const keyFrom = keyMatch ? tailOffset + idx + keyMatch.index : tailOffset + idx;
                const keyTo = keyMatch ? keyFrom + key.length : tailOffset + blockEnd;
                diagnostics.push({
                  from: keyFrom,
                  to: keyTo,
                  severity: "warning",
                  message: `事件「${token}」不支持字段「${key}」`,
                });
              }
            }
          } catch {
            // JSON5 语法错误已由 parseTimelineWithErrors 报告
          }
        }
        idx = blockEnd;
      }
      continue;
    }

    const tokenEnd = idx;
    skipSpaces();
    const followedByBrace = tailPart[idx] === "{";
    if (followedByBrace) {
      const blockEnd = consumeBraceBlock(tailPart, idx);
      idx = blockEnd === -1 ? len : blockEnd;
    }
    diagnostics.push({
      from: tailOffset + tokenStart,
      to: tailOffset + tokenEnd,
      severity: "error",
      message: followedByBrace
        ? `未知的事件类型「${token}」（常用如 StartsUsing、Ability）`
        : `未知的关键字「${token}」（可用：tts、window、jump、once、sync 或事件类型）`,
    });
  }
}

const setInlineDiagnostics =
  StateEffect.define<
    { lineNumber: number; severity: "error" | "warning"; message: string; count: number }[]
  >();

class InlineDiagnosticWidget extends WidgetType {
  constructor(
    readonly message: string,
    readonly severity: "error" | "warning",
    readonly count: number,
  ) {
    super();
  }

  eq(other: InlineDiagnosticWidget) {
    return (
      other.message === this.message &&
      other.severity === this.severity &&
      other.count === this.count
    );
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-inline-diag cm-inline-diag-${this.severity}`;
    span.textContent = this.count > 1 ? `${this.message} (+${this.count - 1})` : this.message;
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

const inlineDiagnosticsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setInlineDiagnostics)) {
        const items = effect.value
          .filter((item) => item.lineNumber >= 1 && item.lineNumber <= tr.state.doc.lines)
          .sort((a, b) => a.lineNumber - b.lineNumber);
        const ranges = items.map((item) => {
          const line = tr.state.doc.line(item.lineNumber);
          return Decoration.widget({
            widget: new InlineDiagnosticWidget(item.message, item.severity, item.count),
            side: 1,
          }).range(line.to);
        });
        decorations = Decoration.set(ranges, true);
      }
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const timelineLinter = linter(
  async (view): Promise<Diagnostic[]> => {
    const docText = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];
    const errorLines = new Set<number>();

    const { errors } = await parseTimelineWithErrors(docText);
    for (const err of errors) {
      if (err.lineNumber < 1 || err.lineNumber > view.state.doc.lines) continue;
      const line = view.state.doc.line(err.lineNumber);
      errorLines.add(err.lineNumber);
      diagnostics.push({
        from: line.from,
        to: Math.max(line.to, line.from),
        severity: "error",
        message: err.message,
      });
    }

    for (let lineNo = 1; lineNo <= view.state.doc.lines; lineNo++) {
      const line = view.state.doc.line(lineNo);
      const text = line.text;
      if (!text.trim() || /^\s*#/.test(text)) continue;

      let codePart = text;
      let quoteCount = 0;
      let inQuote = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "\\" && inQuote) {
          i++;
          continue;
        }
        if (ch === '"' || ch === "“" || ch === "”") {
          inQuote = !inQuote;
          quoteCount++;
        } else if (ch === "#" && !inQuote) {
          codePart = text.slice(0, i);
          break;
        }
      }

      const trimmedCode = codePart.trimEnd();
      const firstNonSpace = line.from + (text.length - text.trimStart().length);

      if (quoteCount % 2 !== 0) {
        errorLines.add(lineNo);
        diagnostics.push({
          from: firstNonSpace,
          to: Math.max(line.from + trimmedCode.length, firstNonSpace),
          severity: "error",
          message: "双引号未闭合",
        });
        continue;
      }

      const timeMatch = /^\s*(?<time>-?\d+(?::\d+(?:\.\d+)?|\.\d+)?)(?=\s|$)/.exec(codePart);
      if (!timeMatch) {
        if (!errorLines.has(lineNo)) {
          diagnostics.push({
            from: firstNonSpace,
            to: Math.max(line.from + trimmedCode.length, firstNonSpace),
            severity: "error",
            message: "行首缺少有效时间（例如 10、84.5 或 01:35）",
          });
        }
        continue;
      }

      const afterTime = codePart.slice(timeMatch[0].length);
      const actionStartMatch = /^\s+(?<action>["'“”][^"'“”]*["'“”])/.exec(afterTime);
      if (!actionStartMatch) {
        if (!errorLines.has(lineNo)) {
          const invalidStart =
            line.from + timeMatch[0].length + (afterTime.length - afterTime.trimStart().length);
          diagnostics.push({
            from: Math.min(invalidStart, line.to),
            to: Math.max(line.from + trimmedCode.length, invalidStart),
            severity: "error",
            message: '时间后需紧跟引号包裹的提示文本（例如 30.6 "<重斩>~"）',
          });
        }
        continue;
      }

      const tailPart = afterTime.slice(actionStartMatch[0].length);
      const tailOffset = line.from + timeMatch[0].length + actionStartMatch[0].length;
      if (!errorLines.has(lineNo)) {
        validateTailClauses(tailPart, tailOffset, diagnostics);
      }

      const actionText = actionStartMatch.groups?.action ?? "";
      const actionStart = line.from + timeMatch[0].length + afterTime.indexOf(actionText);
      for (const tag of parseAction(actionText)) {
        const skillName = tag.groups?.name?.trim();
        if (!skillName) continue;
        if (chineseToIcon(skillName) === undefined) {
          const from = actionStart + (tag.index ?? 0);
          diagnostics.push({
            from,
            to: from + tag[0].length,
            severity: "warning",
            message: `未找到「${skillName}」对应的技能图标，请检查名称或简称拼写`,
          });
        }
      }
    }

    const summary: EditorDiagnosticItem[] = diagnostics.map((d) => ({
      lineNumber: view.state.doc.lineAt(d.from).number,
      severity: d.severity === "warning" ? "warning" : "error",
      message: d.message,
    }));
    emit("diagnostics", summary);

    const byLine = new Map<
      number,
      { lineNumber: number; severity: "error" | "warning"; message: string; count: number }
    >();
    for (const item of summary) {
      const existing = byLine.get(item.lineNumber);
      if (!existing) {
        byLine.set(item.lineNumber, { ...item, count: 1 });
      } else {
        existing.count++;
        if (existing.severity !== "error" && item.severity === "error") {
          existing.severity = "error";
          existing.message = item.message;
        }
      }
    }
    view.dispatch({
      effects: setInlineDiagnostics.of([...byLine.values()]),
    });

    return diagnostics;
  },
  { delay: 150 },
);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "var(--el-fill-color-blank)",
    color: "var(--el-text-color-primary)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: "1.6",
    scrollbarWidth: "thin",
    scrollbarColor: "var(--el-border-color-darker) transparent",
  },
  ".cm-scroller::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  ".cm-scroller::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    backgroundColor: "var(--el-border-color-darker)",
    borderRadius: "4px",
  },
  ".cm-scroller::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "var(--el-text-color-secondary)",
  },
  ".cm-content": {
    padding: "8px 0",
    caretColor: "var(--el-text-color-primary)",
  },
  ".cm-line": {
    padding: "0 10px 0 6px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--el-fill-color-light)",
    color: "var(--el-text-color-secondary)",
    borderRight: "1px solid var(--el-border-color-lighter)",
    userSelect: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(128, 128, 128, 0.12)",
    color: "var(--el-text-color-primary)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(128, 128, 128, 0.08)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(64, 158, 255, 0.18)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "rgba(64, 158, 255, 0.34)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(64, 158, 255, 0.12)",
    outline: "1px solid rgba(64, 158, 255, 0.28)",
    borderRadius: "2px",
  },
  ".cm-tooltip": {
    zIndex: "3000",
    backgroundColor: "var(--el-bg-color-overlay)",
    border: "1px solid var(--el-border-color)",
    color: "var(--el-text-color-primary)",
    borderRadius: "4px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)",
  },
  ".cm-tooltip:empty": {
    display: "none",
  },
  ".cm-tooltip-autocomplete ul li": {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--el-color-primary-light-8)",
    color: "var(--el-text-color-primary)",
  },
  ".cm-completion-skill-icon": {
    width: "18px",
    height: "18px",
    borderRadius: "2px",
    objectFit: "contain",
    flexShrink: "0",
  },
  ".cm-completionDetail": {
    marginLeft: "auto",
    paddingLeft: "10px",
    fontStyle: "normal",
    color: "var(--el-text-color-secondary)",
  },
  ".cm-inline-diag": {
    marginLeft: "14px",
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "12px",
    fontWeight: "500",
    pointerEvents: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  ".cm-skill-hover": {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.4",
  },
  ".cm-skill-hover-icon": {
    width: "28px",
    height: "28px",
    borderRadius: "3px",
    objectFit: "contain",
    flexShrink: "0",
  },
  ".cm-skill-hover-info": {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  ".cm-skill-hover-name": {
    fontWeight: "600",
    color: "var(--el-text-color-primary)",
  },
  ".cm-skill-hover-meta": {
    fontSize: "11px",
    color: "var(--el-text-color-secondary)",
  },
  ".cm-skill-hover-warn": {
    fontSize: "11px",
    color: "var(--el-color-warning)",
  },
});

const skillHoverTooltip = hoverTooltip((targetView, pos) => {
  const line = targetView.state.doc.lineAt(pos);
  const offsetInLine = pos - line.from;
  for (const match of parseAction(line.text)) {
    const start = match.index ?? -1;
    if (start < 0) continue;
    const end = start + match[0].length;
    if (offsetInLine < start || offsetInLine > end) continue;
    const name = match.groups?.name?.trim() ?? "";
    if (!name) return null;
    const repeat = Boolean(match.groups?.repeat);
    const iconId = chineseToIcon(name);
    return {
      pos: line.from + start,
      end: line.from + end,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-skill-hover";
        const img = document.createElement("img");
        img.className = "cm-skill-hover-icon";
        img.src = getIconSrcByPath(`/i/${completeIcon(iconId ?? 405)}.png`);
        img.alt = name;
        img.onerror = handleImgError as unknown as OnErrorEventHandler;
        const info = document.createElement("div");
        info.className = "cm-skill-hover-info";
        const title = document.createElement("div");
        title.className = "cm-skill-hover-name";
        title.textContent = name;
        const meta = document.createElement("div");
        if (iconId) {
          meta.className = "cm-skill-hover-meta";
          meta.textContent = repeat ? "显示图标与名称" : "仅显示图标";
        } else {
          meta.className = "cm-skill-hover-warn";
          meta.textContent = "未匹配到技能图标，将使用默认图标";
        }
        info.appendChild(title);
        info.appendChild(meta);
        dom.appendChild(img);
        dom.appendChild(info);
        return { dom };
      },
    };
  }
  return null;
});

const lightInlineDiagTheme = EditorView.theme({
  ".cm-inline-diag-error": {
    color: "#e11d48",
    backgroundColor: "rgba(225, 29, 72, 0.1)",
  },
  ".cm-inline-diag-warning": {
    color: "#d97706",
    backgroundColor: "rgba(217, 119, 6, 0.12)",
  },
});

const darkInlineDiagTheme = EditorView.theme({
  ".cm-inline-diag-error": {
    color: "#ff4d6d",
    backgroundColor: "rgba(255, 77, 109, 0.16)",
  },
  ".cm-inline-diag-warning": {
    color: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.16)",
  },
});

const containerRef = ref<HTMLElement | null>(null);
const highlightCompartment = new Compartment();
let view: EditorView | null = null;
let darkObserver: MutationObserver | null = null;
let syncingFromProp = false;

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getHighlightExtension() {
  const dark = isDarkMode();
  return [
    syntaxHighlighting(dark ? darkHighlight : lightHighlight),
    dark ? darkInlineDiagTheme : lightInlineDiagTheme,
  ];
}

function focusLine(lineNumber: number) {
  if (!view) return;
  const clamped = Math.min(Math.max(lineNumber, 1), view.state.doc.lines);
  const line = view.state.doc.line(clamped);
  view.dispatch({
    selection: { anchor: line.from, head: line.to },
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  });
  view.focus();
}

defineExpose({ focusLine });

onMounted(() => {
  if (!containerRef.value) return;

  const state = EditorState.create({
    doc: props.modelValue ?? "",
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      timelineLanguage,
      highlightCompartment.of(getHighlightExtension()),
      tooltips({ parent: document.body }),
      Prec.highest(keymap.of([{ key: "Tab", run: acceptCompletion }])),
      autocompletion({
        override: [timelineCompletionSource],
        activateOnTyping: true,
        maxRenderedOptions: 50,
        icons: false,
        addToOptions: [
          {
            render(completion: ActionCompletionOption) {
              if (!completion.iconId) return null;
              const img = document.createElement("img");
              img.className = "cm-completion-skill-icon";
              img.src = getIconSrcByPath(`/i/${completeIcon(completion.iconId)}.png`);
              img.alt = "";
              img.loading = "lazy";
              img.onerror = handleImgError as unknown as OnErrorEventHandler;
              return img;
            },
            position: 20,
          },
        ],
      }),
      lintGutter(),
      inlineDiagnosticsField,
      timelineLinter,
      skillHoverTooltip,
      editorTheme,
      props.placeholder ? cmPlaceholder(props.placeholder) : [],
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        { key: "Mod-/", run: toggleComment },
        {
          key: "Alt-Enter",
          run: (targetView) => {
            const line = targetView.state.doc.lineAt(targetView.state.selection.main.head);
            const time = parseLineTimestamp(line.text);
            if (time !== null) {
              emit("syncPreview", time);
              return true;
            }
            return false;
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !syncingFromProp) {
          const next = update.state.doc.toString();
          emit("update:modelValue", next);
        }
        if (update.selectionSet || update.docChanged) {
          const line = update.state.doc.lineAt(update.state.selection.main.head);
          emit("cursorTime", parseLineTimestamp(line.text));
        }
      }),
      EditorView.domEventHandlers({
        blur: () => {
          if (view) {
            emit("change", view.state.doc.toString());
          }
          return false;
        },
      }),
    ],
  });

  view = new EditorView({
    state,
    parent: containerRef.value,
  });

  darkObserver = new MutationObserver(() => {
    view?.dispatch({
      effects: highlightCompartment.reconfigure(getHighlightExtension()),
    });
  });
  darkObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!view) return;
    const current = view.state.doc.toString();
    const target = nextValue ?? "";
    if (current === target) return;
    syncingFromProp = true;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: target },
    });
    syncingFromProp = false;
  },
);

onUnmounted(() => {
  darkObserver?.disconnect();
  darkObserver = null;
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="containerRef" class="timeline-code-editor" />
</template>

<style lang="scss" scoped>
.timeline-code-editor {
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--el-color-primary);
  }
}
</style>
