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
                    if (!value.trim()) {
                        new Notice("Skeleton directory cannot be empty");
                        return;
                    }
                    
                    this.plugin.settings.skelDir = value.trim();
                    await this.plugin.saveSettings();
                })
            );
    }
}