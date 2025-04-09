// modals/skeletonModal.ts - Skeleton selection modal

import { App, Notice, SuggestModal } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { SelectiveOverwriteModal } from "./selectiveOverwriteModal";
import { buildCopyOperations, performCopyOperations } from "../utils";

export class SkeletonModal extends SuggestModal<string> {
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
        const skelDir = path.join(this.baseDir, this.skelDir);
        const sourceSkelDir = path.join(skelDir, dir);
        let dest = path.relative(this.baseDir, this.selectedDir);
        dest = dest === "" ? "/" : dest;
        
        new Notice(`Preparing to copy "${dir}" skeleton to ${dest}`);
        
        try {
            // Build a list of all files to copy
            const filesToCopy = buildCopyOperations(sourceSkelDir, this.selectedDir);
            
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
                performCopyOperations(filesToCopy);
                new Notice(`Successfully copied "${dir}" skeleton to ${dest}`);
            }
        } catch (error) {
            console.error("Error copying skeleton:", error);
            new Notice(`Error copying skeleton: ${error.message}`);
        }
    }
}