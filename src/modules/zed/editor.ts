import type { Language } from "@/modules/execution/port";

export interface EditorSelection {
  start: number;
  end: number;
}

export interface EditorEdit {
  value: string;
  selection: EditorSelection;
}

const INDENT = "    ";
const PYTHON_DEDENT_CLAUSE = /^(elif\b|else\s*:|except\b|finally\s*:|case\b)/;
const PYTHON_TERMINAL = /^(return\b|raise\b|break\b|continue\b|pass\b)/;

function lineStart(value: string, cursor: number) {
  return value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
}

function leadingWhitespace(line: string) {
  return line.match(/^\s*/)?.[0] ?? "";
}

function removeOneIndent(value: string) {
  if (value.startsWith("\t")) return value.slice(1);
  return value.slice(
    Math.min(INDENT.length, value.match(/^ */)?.[0].length ?? 0),
  );
}

export function applySmartEnter(
  value: string,
  selection: EditorSelection,
  language: Language,
): EditorEdit {
  const before = value.slice(0, selection.start);
  const after = value.slice(selection.end);
  const start = lineStart(value, selection.start);
  const lineBeforeCursor = value.slice(start, selection.start);
  const trimmed = lineBeforeCursor.trim();
  let indent = leadingWhitespace(lineBeforeCursor);
  let normalizedBefore = before;

  if (language === "python") {
    if (PYTHON_DEDENT_CLAUSE.test(trimmed) && indent.length > 0) {
      const dedented = removeOneIndent(lineBeforeCursor);
      normalizedBefore = value.slice(0, start) + dedented;
      indent = leadingWhitespace(dedented);
    }
    if (trimmed.endsWith(":")) indent += INDENT;
    else if (PYTHON_TERMINAL.test(trimmed)) indent = removeOneIndent(indent);
  } else if (/[{[(]\s*$/.test(lineBeforeCursor)) {
    indent += INDENT;
  }

  const closing = language !== "python" && /^\s*[}\])]/.test(after);
  const insertion = closing
    ? `\n${indent}\n${removeOneIndent(indent)}`
    : `\n${indent}`;
  const cursor = normalizedBefore.length + 1 + indent.length;
  return {
    value: normalizedBefore + insertion + after,
    selection: { start: cursor, end: cursor },
  };
}

export function applyTab(
  value: string,
  selection: EditorSelection,
  shiftKey: boolean,
): EditorEdit {
  if (selection.start === selection.end) {
    if (!shiftKey) {
      const next =
        value.slice(0, selection.start) + INDENT + value.slice(selection.end);
      const cursor = selection.start + INDENT.length;
      return { value: next, selection: { start: cursor, end: cursor } };
    }
    const start = lineStart(value, selection.start);
    const prefix = value.slice(start, selection.start);
    const removable = Math.min(
      INDENT.length,
      prefix.match(/^ */)?.[0].length ?? 0,
    );
    return {
      value:
        value.slice(0, start) +
        prefix.slice(removable) +
        value.slice(selection.end),
      selection: {
        start: Math.max(start, selection.start - removable),
        end: Math.max(start, selection.end - removable),
      },
    };
  }

  const first = lineStart(value, selection.start);
  const blockEnd = value.indexOf("\n", selection.end);
  const end = blockEnd === -1 ? value.length : blockEnd;
  const block = value.slice(first, end);
  const lines = block.split("\n");
  const changed = lines.map((line) =>
    shiftKey ? removeOneIndent(line) : INDENT + line,
  );
  const removedFirst = lines[0]!.length - changed[0]!.length;
  const delta = changed.join("\n").length - block.length;
  const startDelta = shiftKey ? -Math.max(0, removedFirst) : INDENT.length;
  return {
    value: value.slice(0, first) + changed.join("\n") + value.slice(end),
    selection: {
      start: Math.max(first, selection.start + startDelta),
      end: selection.end + delta,
    },
  };
}
