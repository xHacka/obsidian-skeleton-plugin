// settingTab.ts - Settings tab UI implementation

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import SkeletonPlugin from "./main";

export class SkeletonSettingTab extends PluginSettingTab {
    plugin: SkeletonPlugin;
    
    constructor(app: App, plugin: SkeletonPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl("h2", { text: "Skeleton Generator Settings" });
        
        new Setting(containerEl)
            .setName("Skeleton Directory")
            .setDesc("Directory name for storing skeleton templates (relative to vault root)")
            .addText(text => text
                .setPlaceholder("_skel")
                .setValue(this.plugin.settings.skelDir)
                .onChange(async (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                        new Notice("Skeleton directory cannot be empty");
                        return;
                    }
                    if (trimmed.includes("..") || trimmed.startsWith("/") || trimmed.startsWith("\\")) {
                        new Notice("Skeleton directory must be a relative path within the vault (no '..' or leading slashes)");
                        return;
                    }
                    
                    this.plugin.settings.skelDir = trimmed;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("Exclude Patterns")
            .setDesc("Comma-separated file names or patterns to exclude from copies (e.g. .DS_Store, *.tmp)")
            .addText(text => text
                .setPlaceholder(".DS_Store, Thumbs.db, .gitkeep")
                .setValue(this.plugin.settings.excludePatterns)
                .onChange(async (value) => {
                    this.plugin.settings.excludePatterns = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}