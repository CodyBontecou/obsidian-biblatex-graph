import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  MatchDecorator,
} from "@codemirror/view";
import { type BiblatexGraphSettings } from "./types";

/**
 * Build a CM6 ViewPlugin that highlights @citekey and [@citekey...] in live-preview.
 */
export function buildCitationViewPlugin(settings: BiblatexGraphSettings) {
  const escaped = escapeRegex(settings.citationPrefix);

  // Match both bare @citekey and bracketed [@citekey, ...]
  const pattern = new RegExp(
    `\\[${escaped}[A-Za-z0-9_:.#$%&\\-+?<>~/]+(?:,\\s*[^\\]]*)?\\]|${escaped}[A-Za-z0-9_:.#$%&\\-+?<>~/]+`,
    "g"
  );

  const decorator = new MatchDecorator({
    regexp: pattern,
    decoration: () =>
      Decoration.mark({ class: "cm-biblatex-citekey" }),
  });

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
