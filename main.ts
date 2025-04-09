// main.ts - Main plugin file
import { FileSystemAdapter, Notice, Plugin } from "obsidian";
import { SkeletonPluginSettings, DEFAULT_SETTINGS } from "./settings";
import { SkeletonSettingTab } from "./settingTab";
import { SkeletonModal } from "./modals/skeletonModal";
import { showConfirmationDialog } from "./modals/confirmationModal";
import * as path from "path";
import * as fs from "fs";

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
						.onClick(async () => this.handleGenerateSkeleton(file));
				});
			})
		);
	}

	async handleGenerateSkeleton(file: any) {
		const baseDir = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
		const skelDir = path.join(baseDir, this.settings.skelDir);

		// Check if skeleton directory exists
		if (!fs.existsSync(skelDir)) {
			const createDir = await showConfirmationDialog(
				this.app,
				"Skeleton Directory Not Found",
				`The skeleton directory "${this.settings.skelDir}" doesn't exist. Would you like to create it?`
			);

			if (createDir) {
				try {
					fs.mkdirSync(skelDir);
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
		const skeleton_dirs = fs
			.readdirSync(skelDir)
			.filter((dir) =>
				fs.statSync(path.join(skelDir, dir)).isDirectory()
			);

		if (skeleton_dirs.length === 0) {
			new Notice(`No skeleton directories found in ${this.settings.skelDir}. Please create at least one directory.`);
			return;
		}

		let selectedPath = path.join(baseDir, file.path);
		if (fs.statSync(selectedPath).isFile()) {
			selectedPath = path.dirname(selectedPath);
		}

		new SkeletonModal(
			this.app,
			skeleton_dirs,
			selectedPath,
			this.settings.skelDir,
			baseDir
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
