// modals/selectiveOverwriteModal.ts - Modal for selecting files to overwrite

import { App, ButtonComponent, Modal, Notice, Setting, ToggleComponent } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { CopyOperation, performCopyOperations } from "../utils";

export class SelectiveOverwriteModal extends Modal {
    existingFiles: CopyOperation[];
    allFiles: CopyOperation[];
    filesToOverwrite: Set<string>;
    toggleComponents: Map<string, ToggleComponent>;
    skeletonName: string;
    destPath: string;
    baseDir: string;
    
    constructor(app: App, existingFiles: CopyOperation[], allFiles: CopyOperation[], 
                skeletonName: string, destPath: string, baseDir: string) {
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
            // Get relative path from the baseDir instead of using absolute path
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
        // contentEl.createEl("style", {
        //     text: `
        //         .existing-files-list {
        //             max-height: 300px;
        //             overflow-y: auto;
        //             border: 1px solid var(--background-modifier-border);
        //             padding: 5px;
        //             margin: 10px 0;
        //         }
        //         .button-container {
        //             display: flex;
        //             justify-content: space-around;
        //             margin-top: 20px;
        //         }
        //         .selective-overwrite-instructions {
        //             margin-bottom: 10px;
        //             font-weight: 500;
        //         }
        //         .skeleton-info {
        //             color: var(--text-muted);
        //             font-style: italic;
        //             margin-bottom: 10px;
        //         }
        //         .bulk-selection-container {
        //             display: flex;
        //             justify-content: flex-start;
        //             gap: 10px;
        //             margin: 10px 0;
        //         }
        //         .bulk-button {
        //             font-size: 12px;
        //         }
        //     `
        // });
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
            
            performCopyOperations(filesToCopy);
            
            const overwrittenCount = this.filesToOverwrite.size;
            const skippedCount = this.existingFiles.length - overwrittenCount;
            const newFileCount = this.allFiles.filter(op => 
                !op.isDirectory && !this.existingFiles.some(ef => ef.destination === op.destination)
            ).length;
            
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