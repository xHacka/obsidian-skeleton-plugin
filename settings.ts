// settings.ts - Plugin settings definition

export interface SkeletonPluginSettings {
    skelDir: string;
    excludePatterns: string;
}

export const DEFAULT_SETTINGS: SkeletonPluginSettings = {
    skelDir: "_skel",
    excludePatterns: ".DS_Store, Thumbs.db, .gitkeep"
};

/**
 * Parses comma-separated exclusion patterns into a list of lowercase trimmed strings.
 * Supports simple wildcard matching with '*'.
 */
export function parseExcludePatterns(raw: string): string[] {
    return raw
        .split(",")
        .map(p => p.trim().toLowerCase())
        .filter(p => p.length > 0);
}

export function shouldExclude(fileName: string, patterns: string[]): boolean {
    const lower = fileName.toLowerCase();
    return patterns.some(pattern => {
        if (pattern.includes("*")) {
            const regex = new RegExp(
                "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
            );
            return regex.test(lower);
        }
        return lower === pattern;
    });
}