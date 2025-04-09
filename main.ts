import { App, FileSystemAdapter, Notice, Plugin, SuggestModal } from "obsidian";
import * as path from "path";
import * as fs from "fs";

const SKEL: string = "_skel";
let BASE_DIR: string = "";
let SKEL_DIR: string = "";

export default class SkeletonPlugin extends Plugin {
	async onload() {
		BASE_DIR = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
		SKEL_DIR = path.join(BASE_DIR, SKEL);
		if (!fs.existsSync(SKEL_DIR)) {
			new Notice(`Creating ${SKEL_DIR} directory for skeletons.`);
			fs.mkdirSync(SKEL_DIR);
		}

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item.setTitle("Generate Skeleton")
						.setIcon("lucide-bone")
						.onClick(async () => {
							const skeleton_dirs = fs.readdirSync(SKEL_DIR);
							let selectedPath = path.join(BASE_DIR, file.path);
							if (fs.statSync(selectedPath).isFile()) {
								selectedPath = path.dirname(selectedPath);
							}
							new SkeletonModal(
								this.app,
								skeleton_dirs,
								selectedPath
							).open();
						});
				});
			})
		);
	}

	onunload() {}
}

class SkeletonModal extends SuggestModal<string> {
	skeletonDirs: string[];
	selectedDir: string;

	constructor(app: App, dirs: string[], dir: string) {
		super(app);
		this.skeletonDirs = dirs;
		this.selectedDir = dir;
	}

	getSuggestions(query: string): string[] {
		return this.skeletonDirs.filter((dir) =>
			path
				.relative(BASE_DIR, dir)
				.toLowerCase()
				.includes(query.toLowerCase())
		);
	}

	renderSuggestion(dir: string, element: HTMLElement) {
		element.createEl("div", { text: dir });
	}

	onChooseSuggestion(dir: string, event: MouseEvent | KeyboardEvent) {
		let dest = path.relative(BASE_DIR, this.selectedDir);
		dest = dest == "" ? "/" : dest;
		console.log(`Copying ${dir} to ${dest}`);
		let filePath;
		for (let file of fs.readdirSync(path.join(SKEL_DIR, dir))) {
			filePath = path.join(SKEL_DIR, dir, file);
			if (fs.statSync(filePath).isFile()) {
				fs.cpSync(filePath, path.join(this.selectedDir, file));
			} else {
				fs.cpSync(filePath, this.selectedDir, { recursive: true });
			}
		}
	}
}
