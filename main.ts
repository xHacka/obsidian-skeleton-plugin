import { Notice, Plugin, TAbstractFile, TFile, normalizePath } from "obsidian";
import { SkeletonPluginSettings, DEFAULT_SETTINGS, parseExcludePatterns } from "./settings";
import { SkeletonSettingTab } from "./settingTab";
import { SkeletonModal } from "./modals/skeletonModal";
import { showConfirmationDialog } from "./modals/confirmationModal";

export default class SkeletonPlugin extends Plugin {
	settings: SkeletonPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SkeletonSettingTab(this.app, this));

		this.addCommand({
			id: "generate-skeleton",
			name: "Generate Skeleton",
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				this.handleGenerateSkeleton(activeFile);
			}
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item.setTitle("Generate Skeleton")
						.setIcon("lucide-bone")
						.onClick(async () => this.handleGenerateSkeleton(file));
				});
			})
		);
	}

	async handleGenerateSkeleton(file: TAbstractFile | null) {
		const adapter = this.app.vault.adapter;
		const skelDir = normalizePath(this.settings.skelDir);

		if (skelDir.contains("..")) {
			new Notice("Skeleton directory must be inside the vault.");
			return;
		}

		if (!(await adapter.exists(skelDir))) {
			const createDir = await showConfirmationDialog(
				this.app,
				"Skeleton Directory Not Found",
				`The skeleton directory "${skelDir}" doesn't exist. Would you like to create it?`
			);

			if (createDir) {
				try {
					await adapter.mkdir(skelDir);
					new Notice(`Created skeleton directory at ${skelDir}`);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					new Notice(`Failed to create directory: ${msg}`);
					return;
				}
			} else {
				return;
			}
		}

		let listed;
		try {
			listed = await adapter.list(skelDir);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to read skeleton directory: ${msg}`);
			return;
		}

		if (listed.folders.length === 0) {
			new Notice(
				`No skeleton directories found in ${skelDir}. Please create at least one directory.`
			);
			return;
		}

		let selectedPath: string;
		if (file) {
			selectedPath = file instanceof TFile
				? (file.parent?.path ?? "")
				: file.path;
		} else {
			selectedPath = "";
		}

		const dirNames = listed.folders.map(
			(f) => f.substring(f.lastIndexOf("/") + 1)
		);

		const excludePatterns = parseExcludePatterns(this.settings.excludePatterns);

		new SkeletonModal(
			this.app,
			dirNames,
			selectedPath,
			skelDir,
			excludePatterns
		).open();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
