import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Syntax colors modelled on Xcode's default light / dark themes.
const light = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: "#ad3da4", fontWeight: "600" },
  { tag: [t.string, t.regexp, t.special(t.string)], color: "#d12f1b" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#272ad8" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#707f8c", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "#3e8087" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "#4b21b0" },
  { tag: [t.propertyName, t.attributeName], color: "#326d74" },
  { tag: [t.tagName], color: "#ad3da4" },
  { tag: [t.definition(t.variableName)], color: "#1c1c1e" },
  { tag: [t.meta, t.processingInstruction], color: "#78492a" },
  { tag: [t.heading], color: "#ad3da4", fontWeight: "700" },
  { tag: [t.link, t.url], color: "#007aff", textDecoration: "underline" },
  { tag: t.invalid, color: "#ff3b30" },
]);

const dark = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: "#fc5fa3", fontWeight: "600" },
  { tag: [t.string, t.regexp, t.special(t.string)], color: "#fc6a5d" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#d0bf69" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#7f8c98", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "#5dd8ff" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "#a167e6" },
  { tag: [t.propertyName, t.attributeName], color: "#67b7a4" },
  { tag: [t.tagName], color: "#fc5fa3" },
  { tag: [t.definition(t.variableName)], color: "#ffffff" },
  { tag: [t.meta, t.processingInstruction], color: "#ffa14f" },
  { tag: [t.heading], color: "#fc5fa3", fontWeight: "700" },
  { tag: [t.link, t.url], color: "#0a84ff", textDecoration: "underline" },
  { tag: t.invalid, color: "#ff453a" },
]);

export const editorTheme = (isDark: boolean) => [
  EditorView.theme(
    {
      "&": { color: "var(--label)", backgroundColor: "transparent" },
      ".cm-cursor": { borderLeftColor: "var(--blue)", borderLeftWidth: "2px" },
    },
    { dark: isDark },
  ),
  syntaxHighlighting(isDark ? dark : light),
];
