import { App, PluginSettingTab, Setting } from "obsidian";
import type BiblatexGraphPlugin from "./main";

export class BiblatexGraphSettingTab extends PluginSettingTab {
  plugin: BiblatexGraphPlugin;

  constructor(app: App, plugin: BiblatexGraphPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "BibLaTeX Graph Settings" });

    new Setting(containerEl)
      .setName("Citation prefix")
      .setDesc(
        'The character(s) that precede a citekey (default: "@"). ' +
          "Used to detect both @citekey and [@citekey] patterns."
      )
      .addText((text) =>
        text
          .setPlaceholder("@")
          .setValue(this.plugin.settings.citationPrefix)
          .onChange(async (value) => {
            this.plugin.settings.citationPrefix = value || "@";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reference notes folder")
      .setDesc(
        "The vault folder where reference notes are stored or created. " +
          'E.g. "references" → references/citekey.md'
      )
      .addText((text) =>
        text
          .setPlaceholder("references")
          .setValue(this.plugin.settings.referenceFolder)
          .onChange(async (value) => {
            this.plugin.settings.referenceFolder = value || "references";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-create note on click")
      .setDesc(
        "When enabled, clicking a citation whose reference note does not " +
          "yet exist will automatically create it."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCreateNote)
          .onChange(async (value) => {
            this.plugin.settings.autoCreateNote = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
