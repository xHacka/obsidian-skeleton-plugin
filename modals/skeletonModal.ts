import { App, Notice, SuggestModal, normalizePath } from "obsidian";
import { FileSelectionModal } from "./fileSelectionModal";
import { buildCopyOperations } from "../utils";

export class SkeletonModal extends SuggestModal<string> {
    skeletonDirs: string[];
    selectedDir: string;
    skelDir: string;
    excludePatterns: string[];

    constructor(app: App, dirs: string[], dir: string, skelDir: string, excludePatterns: string[] = []) {
        super(app);
        this.skeletonDirs = dirs;
        this.selectedDir = dir;
        this.skelDir = skelDir;
        this.excludePatterns = excludePatterns;
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
        const adapter = this.app.vault.adapter;
        const sourcePath = normalizePath(`${this.skelDir}/${dir}`);
        const dest = this.selectedDir || "/";

        try {
            const filesToCopy = await buildCopyOperations(
                adapter,
                sourcePath,
                this.selectedDir,
                this.excludePatterns
            );

            const fileOps = filesToCopy.filter((op) => !op.isDirectory);
            if (fileOps.length === 0) {
                new Notice(`Skeleton "${dir}" contains no files to copy.`);
                return;
            }

            const existingDestinations = new Set<string>();
            for (const op of fileOps) {
                if (await adapter.exists(op.destination)) {
                    existingDestinations.add(op.destination);
                }
            }

            new FileSelectionModal(
                this.app,
                filesToCopy,
                existingDestinations,
                dir,
                dest
            ).open();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error copying skeleton:", error);
            new Notice(`Error copying skeleton: ${msg}`);
        }
    }
}
