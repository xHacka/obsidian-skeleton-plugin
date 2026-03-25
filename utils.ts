import { DataAdapter, normalizePath } from "obsidian";
import { shouldExclude } from "./settings";

export interface CopyOperation {
    source: string;
    destination: string;
    isDirectory: boolean;
}

export async function buildCopyOperations(
    adapter: DataAdapter,
    source: string,
    destination: string,
    excludePatterns: string[] = []
): Promise<CopyOperation[]> {
    const operations: CopyOperation[] = [];

    async function walk(src: string, dest: string) {
        const listed = await adapter.list(src);

        for (const folder of listed.folders) {
            const name = folder.substring(folder.lastIndexOf("/") + 1);
            if (shouldExclude(name, excludePatterns)) continue;
            const destPath = normalizePath(dest ? `${dest}/${name}` : name);
            operations.push({ source: folder, destination: destPath, isDirectory: true });
            await walk(folder, destPath);
        }

        for (const file of listed.files) {
            const name = file.substring(file.lastIndexOf("/") + 1);
            if (shouldExclude(name, excludePatterns)) continue;
            const destPath = normalizePath(dest ? `${dest}/${name}` : name);
            operations.push({ source: file, destination: destPath, isDirectory: false });
        }
    }

    await walk(source, destination);
    return operations;
}

export async function performCopyOperations(
    adapter: DataAdapter,
    operations: CopyOperation[]
): Promise<void> {
    for (const op of operations.filter(op => op.isDirectory)) {
        if (!(await adapter.exists(op.destination))) {
            await adapter.mkdir(op.destination);
        }
    }

    for (const op of operations.filter(op => !op.isDirectory)) {
        const data = await adapter.readBinary(op.source);
        await adapter.writeBinary(op.destination, data);
    }
}
