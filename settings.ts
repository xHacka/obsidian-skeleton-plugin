// settings.ts - Plugin settings definition

export interface SkeletonPluginSettings {
    skelDir: string;
}

export const DEFAULT_SETTINGS: SkeletonPluginSettings = {
    skelDir: "_skel"
};