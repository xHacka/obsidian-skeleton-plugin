# Obsidian Skeleton Plugin

Easily copy or create directory structures with a single click, based on predefined templates stored in a dedicated folder.

By default, the plugin looks for skeleton structures inside a folder named `_skel`, but this can be customized from the plugin's settings.

## Plugin Structure

```
/
├── main.ts                        # Plugin main entry point
├── settings.ts                    # Settings definition
├── settingTab.ts                  # Settings UI implementation
├── utils.ts                       # Utility functions
├── styles.css                     # Optional global styles
├── manifest.json                  # Plugin manifest
├── /modals                        # Modal components
│   ├── confirmationModal.ts       # Generic confirmation dialog
│   ├── skeletonModal.ts           # Skeleton selection modal 
│   └── selectiveOverwriteModal.ts # File overwrite selection
```

> Source [https://github.com/obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)~

<!-- TBU -->
<div style="display:none;">
## Installation

### Method 1: From Obsidian Community Plugins _(recommended)_

> (Coming soon if not yet published. Until then, use Manual method below.)

1. Open Obsidian.
2. Go to **Settings → Community Plugins → Browse**.
3. Search for **Skeleton Plugin**.
4. Click **Install**, then **Enable**.

### Method 2: Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/yourusername/obsidian-skeleton-plugin/releases).
2. Extract the contents into your vault’s plugins folder:  
   `.obsidian/plugins/obsidian-skeleton-plugin/`
3. Restart Obsidian or reload plugins.
</div>