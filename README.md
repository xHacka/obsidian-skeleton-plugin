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
