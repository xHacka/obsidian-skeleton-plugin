import { App, ButtonComponent, Modal, Notice, Setting, ToggleComponent } from "obsidian";
import { CopyOperation, performCopyOperations } from "../utils";

export class FileSelectionModal extends Modal {
    private allFiles: CopyOperation[];
    private selectedFiles: Set<string>;
    private existingDestinations: Set<string>;
    private toggleComponents: Map<string, ToggleComponent>;
    private skeletonName: string;
    private destPath: string;

    constructor(
        app: App,
        allFiles: CopyOperation[],
        existingDestinations: Set<string>,
        skeletonName: string,
        destPath: string
    ) {
        super(app);
        this.allFiles = allFiles;
        this.existingDestinations = existingDestinations;
        this.skeletonName = skeletonName;
        this.destPath = destPath;
        this.toggleComponents = new Map();

        this.selectedFiles = new Set(
            allFiles
                .filter(op => !op.isDirectory && !existingDestinations.has(op.destination))
                .map(op => op.destination)
        );
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Select files to copy" });
        contentEl.createEl("p", {
            text: `Copying "${this.skeletonName}" to ${this.destPath}`,
            cls: "skeleton-info"
        });

        const fileOps = this.allFiles.filter(op => !op.isDirectory);
        const newFiles = fileOps.filter(op => !this.existingDestinations.has(op.destination));
        const existingFiles = fileOps.filter(op => this.existingDestinations.has(op.destination));

        if (newFiles.length > 0) {
            this.renderFileSection(contentEl, "New files", newFiles, true);
        }

        if (existingFiles.length > 0) {
            this.renderFileSection(contentEl, "Existing files (will be overwritten)", existingFiles, false);
        }

        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });

        new ButtonComponent(buttonContainer)
            .setButtonText("Apply")
            .setCta()
            .onClick(async () => {
                await this.processSelectedFiles();
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                new Notice("Operation cancelled");
                this.close();
            });
    }

    private renderFileSection(
        container: HTMLElement,
        title: string,
        files: CopyOperation[],
        isNew: boolean
    ) {
        const sectionEl = container.createEl("div", { cls: "file-section" });

        sectionEl.createEl("h3", {
            text: `${title} (${files.length})`,
            cls: isNew ? "file-section-title-new" : "file-section-title-existing"
        });

        const bulkContainer = sectionEl.createEl("div", { cls: "bulk-selection-container" });

        new ButtonComponent(bulkContainer)
            .setButtonText("Select All")
            .setClass("bulk-button")
            .onClick(() => {
                files.forEach(file => {
                    this.selectedFiles.add(file.destination);
                    this.toggleComponents.get(file.destination)?.setValue(true);
                });
            });

        new ButtonComponent(bulkContainer)
            .setButtonText("Select None")
            .setClass("bulk-button")
            .onClick(() => {
                files.forEach(file => {
                    this.selectedFiles.delete(file.destination);
                    this.toggleComponents.get(file.destination)?.setValue(false);
                });
            });

        const listEl = sectionEl.createEl("div", { cls: "existing-files-list" });

        for (const file of files) {
            const displayName = file.destination || file.source.split("/").pop()!;

            const setting = new Setting(listEl)
                .setName(displayName);

            if (!isNew) {
                setting.setDesc("Overwrite");
                setting.nameEl.addClass("file-entry-existing");
            }

            setting.addToggle(tc => {
                tc.setValue(this.selectedFiles.has(file.destination))
                    .onChange(value => {
                        if (value) {
                            this.selectedFiles.add(file.destination);
                        } else {
                            this.selectedFiles.delete(file.destination);
                        }
                    });
                this.toggleComponents.set(file.destination, tc);
            });
        }
    }

    private async processSelectedFiles() {
        try {
            const filesToCopy = this.allFiles.filter(op => {
                if (op.isDirectory) return true;
                return this.selectedFiles.has(op.destination);
            });

            await performCopyOperations(this.app.vault.adapter, filesToCopy);

            const overwrittenCount = [...this.selectedFiles]
                .filter(dest => this.existingDestinations.has(dest)).length;
            const newCount = [...this.selectedFiles]
                .filter(dest => !this.existingDestinations.has(dest)).length;
            const skippedCount =
                this.allFiles.filter(op => !op.isDirectory).length - this.selectedFiles.size;

            new Notice(
                `Copied ${newCount} new, ${overwrittenCount} overwritten, ${skippedCount} skipped`
            );
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error processing files:", error);
            new Notice(`Error processing files: ${msg}`);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
