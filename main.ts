import { App, FileSystemAdapter, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal, ButtonComponent, ToggleComponent } from "obsidian";
import * as path from "path";
import * as fs from "fs";

interface SkeletonPluginSettings {
    skelDir: string;
}

const DEFAULT_SETTINGS: SkeletonPluginSettings = {
    skelDir: "_skel"
};

interface CopyOperation {
    source: string;
    destination: string;
    isDirectory: boolean;
}

export default class SkeletonPlugin extends Plugin {
    settings: SkeletonPluginSettings;
    
    async onload() {
        await this.loadSettings();
        
        // Add settings tab
        this.addSettingTab(new SkeletonSettingTab(this.app, this));
        
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                menu.addItem((item) => {
                    item.setTitle("Generate Skeleton")
                        .setIcon("lucide-bone")
                        .onClick(async () => {
                            const BASE_DIR = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
                            const SKEL_DIR = path.join(BASE_DIR, this.settings.skelDir);
                            
                            // Check if skeleton directory exists
                            if (!fs.existsSync(SKEL_DIR)) {
                                const createDir = await this.showConfirmationDialog(
                                    "Skeleton Directory Not Found",
                                    `The skeleton directory "${this.settings.skelDir}" doesn't exist. Would you like to create it?`
                                );
                                
                                if (createDir) {
                                    try {
                                        fs.mkdirSync(SKEL_DIR);
                                        new Notice(`Created skeleton directory at ${this.settings.skelDir}`);
                                    } catch (error) {
                                        new Notice(`Failed to create directory: ${error.message}`);
                                        return;
                                    }
                                } else {
                                    new Notice("Operation cancelled");
                                    return;
                                }
                            }
                            
                            // Get subdirectories
                            const skeleton_dirs = fs.readdirSync(SKEL_DIR).filter(
                                (dir) => fs.statSync(path.join(SKEL_DIR, dir)).isDirectory()
                            );
                            
                            if (skeleton_dirs.length === 0) {
                                new Notice(`No skeleton directories found in ${this.settings.skelDir}. Please create at least one directory.`);
                                return;
                            }
                            
                            let selectedPath = path.join(BASE_DIR, file.path);
                            if (fs.statSync(selectedPath).isFile()) {
                                selectedPath = path.dirname(selectedPath);
                            }
                            
                            new SkeletonModal(
                                this.app,
                                skeleton_dirs,
                                selectedPath,
                                this.settings.skelDir,
                                BASE_DIR
                            ).open();
                        });
                });
            })
        );
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    async showConfirmationDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmationModal(this.app, title, message, (result) => {
                resolve(result);
            });
            modal.open();
        });
    }
}

class ConfirmationModal extends Modal {
    title: string;
    message: string;
    onConfirm: (result: boolean) => void;
    
    constructor(app: App, title: string, message: string, onConfirm: (result: boolean) => void) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.message });
        
        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
        
        new ButtonComponent(buttonContainer)
            .setButtonText("Yes")
            .setCta()
            .onClick(() => {
                this.onConfirm(true);
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText("No")
            .onClick(() => {
                this.onConfirm(false);
                this.close();
            });
            
        contentEl.createEl("style", {
            text: `
                .button-container {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 20px;
                }
            `
        });
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class SkeletonSettingTab extends PluginSettingTab {
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

class SkeletonModal extends SuggestModal<string> {
    skeletonDirs: string[];
    selectedDir: string;
    skelDir: string;
    baseDir: string;
    
    constructor(app: App, dirs: string[], dir: string, skelDir: string, baseDir: string) {
        super(app);
        this.skeletonDirs = dirs;
        this.selectedDir = dir;
        this.skelDir = skelDir;
        this.baseDir = baseDir;
        this.setPlaceholder("Select a skeleton directory to copy");
    }
    
    getSuggestions(query: string): string[] {
        return this.skeletonDirs.filter((dir) =>
            dir.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    renderSuggestion(dir: string, el: HTMLElement) {
        el.createEl("div", { text: dir });
    }
    
    async onChooseSuggestion(dir: string, evt: MouseEvent | KeyboardEvent) {
        const SKEL_DIR = path.join(this.baseDir, this.skelDir);
        const sourceSkelDir = path.join(SKEL_DIR, dir);
        let dest = path.relative(this.baseDir, this.selectedDir);
        dest = dest === "" ? "/" : dest;
        
        new Notice(`Preparing to copy "${dir}" skeleton to ${dest}`);
        
        try {
            // Build a list of all files to copy
            const filesToCopy = this.buildCopyOperations(sourceSkelDir, this.selectedDir);
            
            // Check for existing files
            const existingFiles = filesToCopy.filter(op => 
                !op.isDirectory && fs.existsSync(op.destination)
            );
            
            if (existingFiles.length > 0) {
                // Show confirmation modal for existing files
                new SelectiveOverwriteModal(
					this.app,
					existingFiles,
					filesToCopy,
					dir,
					dest,
					this.baseDir
				).open();
            } else {
                // No conflicts, proceed with copy
                this.performCopyOperations(filesToCopy);
                new Notice(`Successfully copied "${dir}" skeleton to ${dest}`);
            }
        } catch (error) {
            console.error("Error copying skeleton:", error);
            new Notice(`Error copying skeleton: ${error.message}`);
        }
    }
    
    buildCopyOperations(source: string, destination: string): CopyOperation[] {
        const operations: CopyOperation[] = [];
        
        function buildOps(src: string, dest: string) {
            const entries = fs.readdirSync(src, { withFileTypes: true });
            
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);
                
                if (entry.isDirectory()) {
                    operations.push({
                        source: srcPath,
                        destination: destPath,
                        isDirectory: true
                    });
                    buildOps(srcPath, destPath);
                } else {
                    operations.push({
                        source: srcPath,
                        destination: destPath,
                        isDirectory: false
                    });
                }
            }
        }
        
        buildOps(source, destination);
        return operations;
    }
    
    performCopyOperations(operations: CopyOperation[]) {
        // First create all directories
        operations
            .filter(op => op.isDirectory)
            .forEach(op => {
                if (!fs.existsSync(op.destination)) {
                    fs.mkdirSync(op.destination, { recursive: true });
                }
            });
        
        // Then copy all files
        operations
            .filter(op => !op.isDirectory)
            .forEach(op => {
                fs.copyFileSync(op.source, op.destination);
            });
    }
}

class SelectiveOverwriteModal extends Modal {
    existingFiles: CopyOperation[];
    allFiles: CopyOperation[];
    filesToOverwrite: Set<string>;
    toggleComponents: Map<string, ToggleComponent>;
    skeletonName: string;
    destPath: string;
    
	constructor(app: App, existingFiles: CopyOperation[], allFiles: CopyOperation[], skeletonName: string, destPath: string, baseDir: string) {
		super(app);
		this.existingFiles = existingFiles;
		this.allFiles = allFiles;
		this.filesToOverwrite = new Set<string>();
		this.toggleComponents = new Map<string, ToggleComponent>();
		this.skeletonName = skeletonName;
		this.destPath = destPath;
		this.baseDir = baseDir;
	}
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl("h2", { text: "Files already exist" });
        
        contentEl.createEl("p", { 
            text: `Copying "${this.skeletonName}" to ${this.destPath}`, 
            cls: "skeleton-info" 
        });
        
        contentEl.createEl("p", { 
            text: "Select which files you want to overwrite:", 
            cls: "selective-overwrite-instructions" 
        });
        
        // Create settings for each file
        const filesContainer = contentEl.createEl("div", { cls: "existing-files-list" });
        
        this.existingFiles.forEach(file => {
			const relativePath = path.relative(this.baseDir, file.destination);

			const setting = new Setting(filesContainer)
				.setName(relativePath || path.basename(file.destination)) // Fallback to basename if in root
				.setDesc(`Original: ${path.basename(file.source)}`);
                
            let toggle: ToggleComponent;
            
            setting.addToggle(tc => {
                toggle = tc;
                tc.setValue(false)
                  .onChange(value => {
                      if (value) {
                          this.filesToOverwrite.add(file.destination);
                      } else {
                          this.filesToOverwrite.delete(file.destination);
                      }
                  });
                
                // Store toggle component reference
                this.toggleComponents.set(file.destination, tc);
            });
        });
        
        // Bulk selection buttons
        const bulkContainer = contentEl.createEl("div", { cls: "bulk-selection-container" });
        
        new ButtonComponent(bulkContainer)
            .setButtonText("Select All")
            .setClass("bulk-button")
            .onClick(() => {
                // Update the data model
                this.existingFiles.forEach(file => {
                    this.filesToOverwrite.add(file.destination);
                });
                
                // Update all toggle components
                this.toggleComponents.forEach(toggle => {
                    toggle.setValue(true);
                });
            });
            
        new ButtonComponent(bulkContainer)
            .setButtonText("Select None")
            .setClass("bulk-button")
            .onClick(() => {
                // Update the data model
                this.filesToOverwrite.clear();
                
                // Update all toggle components
                this.toggleComponents.forEach(toggle => {
                    toggle.setValue(false);
                });
            });
        
        // Action buttons
        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
        
        new ButtonComponent(buttonContainer)
            .setButtonText("Apply Selected Overwrites")
            .setCta()
            .onClick(() => {
                this.processSelectedFiles();
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                new Notice("Operation cancelled");
                this.close();
            });
            
        // Add styling
        contentEl.createEl("style", {
            text: `
                .existing-files-list {
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid var(--background-modifier-border);
                    padding: 5px;
                    margin: 10px 0;
                }
                .button-container {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 20px;
                }
                .selective-overwrite-instructions {
                    margin-bottom: 10px;
                    font-weight: 500;
                }
                .skeleton-info {
                    color: var(--text-muted);
                    font-style: italic;
                    margin-bottom: 10px;
                }
                .bulk-selection-container {
                    display: flex;
                    justify-content: flex-start;
                    gap: 10px;
                    margin: 10px 0;
                }
                .bulk-button {
                    font-size: 12px;
                }
            `
        });
    }
    
    processSelectedFiles() {
        try {
            // Filter files to copy
            const filesToCopy = this.allFiles.filter(file => {
                // Include all directories
                if (file.isDirectory) {
                    return true;
                }
                
                // Include files that don't exist or are selected for overwrite
                return !fs.existsSync(file.destination) || this.filesToOverwrite.has(file.destination);
            });
            
            // Create directories first
            filesToCopy
                .filter(op => op.isDirectory)
                .forEach(op => {
                    if (!fs.existsSync(op.destination)) {
                        fs.mkdirSync(op.destination, { recursive: true });
                    }
                });
            
            // Copy files
            filesToCopy
                .filter(op => !op.isDirectory)
                .forEach(op => {
                    fs.copyFileSync(op.source, op.destination); 
                });
            
            const overwrittenCount = this.filesToOverwrite.size;
            const skippedCount = this.existingFiles.length - overwrittenCount;
            const newFileCount = filesToCopy.filter(op => !op.isDirectory && !fs.existsSync(op.destination)).length;
            
            new Notice(`Copied ${newFileCount} new files, ${overwrittenCount} overwritten, ${skippedCount} skipped`);
        } catch (error) {
            console.error("Error processing files:", error);
            new Notice(`Error processing files: ${error.message}`);
        }
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}