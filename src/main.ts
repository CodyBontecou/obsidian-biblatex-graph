import {
  Plugin,
  MarkdownPostProcessorContext,
  TFile,
  normalizePath,
  Notice,
} from "obsidian";
import { BiblatexGraphSettings, DEFAULT_SETTINGS } from "./types";
import { BiblatexGraphSettingTab } from "./settings-tab";
import { buildCitationViewPlugin } from "./citation-viewplugin";

export default class BiblatexGraphPlugin extends Plugin {
  settings: BiblatexGraphSettings = DEFAULT_SETTINGS;

  /** Regex matching bare @citekey and bracketed [@citekey, p. 26] */
  private citationRegex!: RegExp;

  async onload() {
    await this.loadSettings();
    this.buildRegex();

    // --- Settings tab ---
    this.addSettingTab(new BiblatexGraphSettingTab(this.app, this));

    // --- Reading-view: MarkdownPostProcessor ---
    this.registerMarkdownPostProcessor(
      (el: HTMLElement, ctx: MarkdownPostProcessorContext) =>
        this.postProcess(el, ctx)
    );

    // --- Live-preview: CM6 ViewPlugin for syntax highlighting ---
    this.registerEditorExtension(buildCitationViewPlugin(this.settings));

    // --- Inject resolved links on layout-ready & file changes ---
    this.app.workspace.onLayoutReady(() => this.refreshAllResolvedLinks());
    this.registerEvent(
      this.app.metadataCache.on("resolved", () =>
        this.refreshAllResolvedLinks()
      )
    );
  }

  // ── Settings persistence ──────────────────────────────────────────

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.buildRegex();
  }

  private buildRegex() {
    const p = escapeRegex(this.settings.citationPrefix);
    // Capture group 1 = citekey, group 2 = optional bracket extras
    this.citationRegex = new RegExp(
      `\\[${p}([A-Za-z0-9_:.#$%&\\-+?<>~/]+)(?:,\\s*([^\\]]*))?\\]|${p}([A-Za-z0-9_:.#$%&\\-+?<>~/]+)`,
      "g"
    );
  }

  // ── MarkdownPostProcessor (reading view) ──────────────────────────

  private postProcess(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // Walk all text nodes and replace citation matches with clickable spans
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodesToReplace: { node: Text; fragments: (string | HTMLElement)[] }[] =
      [];

    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const text = textNode.textContent || "";
      this.citationRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      let lastIndex = 0;
      const fragments: (string | HTMLElement)[] = [];
      let hasMatch = false;

      while ((match = this.citationRegex.exec(text)) !== null) {
        hasMatch = true;
        const fullMatch = match[0];
        const citekey = match[1] || match[3]; // group 1 for bracket, group 3 for bare

        if (match.index > lastIndex) {
          fragments.push(text.slice(lastIndex, match.index));
        }

        const span = document.createElement("span");
        span.className = "biblatex-citation";
        span.textContent = fullMatch;
        span.setAttribute("data-citekey", citekey);
        span.addEventListener("click", (e) => {
          e.preventDefault();
          this.openReferenceNote(citekey);
        });

        fragments.push(span);
        lastIndex = match.index + fullMatch.length;
      }

      if (hasMatch) {
        if (lastIndex < text.length) {
          fragments.push(text.slice(lastIndex));
        }
        nodesToReplace.push({ node: textNode, fragments });
      }
    }

    for (const { node, fragments } of nodesToReplace) {
      const parent = node.parentNode;
      if (!parent) continue;
      for (const frag of fragments) {
        if (typeof frag === "string") {
          parent.insertBefore(document.createTextNode(frag), node);
        } else {
          parent.insertBefore(frag, node);
        }
      }
      parent.removeChild(node);
    }
  }

  // ── Open / create reference note ──────────────────────────────────

  private async openReferenceNote(citekey: string) {
    const folder = this.settings.referenceFolder;
    const path = normalizePath(`${folder}/${citekey}.md`);
    let file = this.app.vault.getAbstractFileByPath(path);

    if (!file) {
      if (!this.settings.autoCreateNote) {
        new Notice(`Reference note not found: ${path}`);
        return;
      }

      // Ensure folder exists
      const folderExists = this.app.vault.getAbstractFileByPath(
        normalizePath(folder)
      );
      if (!folderExists) {
        await this.app.vault.createFolder(normalizePath(folder));
      }

      const content = [
        `---`,
        `citekey: "${citekey}"`,
        `---`,
        ``,
        `# ${citekey}`,
        ``,
        `> Reference note auto-created by BibLaTeX Graph plugin.`,
        ``,
      ].join("\n");
      file = await this.app.vault.create(path, content);
      new Notice(`Created reference note: ${path}`);
    }

    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
  }

  // ── Inject resolved links for the graph view ─────────────────────

  private refreshAllResolvedLinks() {
    const resolvedLinks = (this.app.metadataCache as any).resolvedLinks as
      | Record<string, Record<string, number>>
      | undefined;
    if (!resolvedLinks) return;

    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;

      // Read raw content from the cache's sections or fall back
      const content = (cache as any).rawContent as string | undefined;
      // We'll read from the vault instead for accuracy
      this.injectLinksForFile(file, resolvedLinks);
    }
  }

  private async injectLinksForFile(
    file: TFile,
    resolvedLinks: Record<string, Record<string, number>>
  ) {
    let content: string;
    try {
      content = await this.app.vault.cachedRead(file);
    } catch {
      return;
    }

    this.citationRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    const folder = this.settings.referenceFolder;

    while ((match = this.citationRegex.exec(content)) !== null) {
      const citekey = match[1] || match[3];
      if (!citekey) continue;

      const refPath = normalizePath(`${folder}/${citekey}.md`);
      const refFile = this.app.vault.getAbstractFileByPath(refPath);
      if (!refFile || !(refFile instanceof TFile)) continue;

      // Ensure the source file has an entry in resolvedLinks
      if (!resolvedLinks[file.path]) {
        resolvedLinks[file.path] = {};
      }

      // Add the link count (increment if already present)
      const existing = resolvedLinks[file.path][refFile.path] || 0;
      resolvedLinks[file.path][refFile.path] = existing + 1;
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
