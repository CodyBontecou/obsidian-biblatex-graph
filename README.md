# BibLaTeX Citations as Graph Nodes

An Obsidian plugin that turns BibLaTeX-style citation keys into clickable links and edges in the Graph view.

## Features

- **Detect `@citekey` patterns** — both bare `@smith2024` and bracketed `[@smith2024, p. 26]` syntax
- **Clickable citations** — click any citation in Reading view to jump to its reference note
- **Graph integration** — citations are injected as resolved links so they appear as edges in Obsidian's Graph view
- **Auto-create notes** — optionally create a reference note on first click if it doesn't exist yet
- **Live-preview highlighting** — CM6 ViewPlugin decorates citation keys with accent colors in the editor
- **Configurable** — change the prefix character, reference folder, and auto-create behavior in Settings

## Installation

### Manual

1. Clone or download this repository into your vault's `.obsidian/plugins/obsidian-biblatex-graph/` directory
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Enable the plugin in **Settings → Community Plugins**

### From Release

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Place them in `.obsidian/plugins/obsidian-biblatex-graph/`
3. Enable the plugin in **Settings → Community Plugins**

## Usage

Write citations in your notes using either syntax:

```markdown
As shown by @smith2024, the results indicate...

The data supports this claim [@smith2024, p. 26].

Multiple works confirm this [@jones2023; @smith2024].
```

Each detected `@citekey` maps to a reference note at `<referenceFolder>/<citekey>.md` (default: `references/citekey.md`).

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Citation prefix | `@` | Character(s) before a citekey |
| Reference notes folder | `references` | Vault folder for reference notes |
| Auto-create note on click | `true` | Create missing reference notes automatically |

## How Graph Integration Works

The plugin scans every markdown file for citation patterns and injects entries into Obsidian's internal `metadataCache.resolvedLinks` map. This makes the Graph view draw an edge from any note containing `@smith2024` to `references/smith2024.md` — no `[[wikilinks]]` needed.

## Development

```bash
npm install
npm run dev    # watch mode (dev build)
npm run build  # production build
```

## License

MIT
