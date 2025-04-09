// utils.ts - Utility functions

import * as path from "path";
import * as fs from "fs";

export interface CopyOperation {
    source: string;
    destination: string;
    isDirectory: boolean;
}

export function buildCopyOperations(source: string, destination: string): CopyOperation[] {
    const operations: CopyOperation[] = [];
    
    function buildOps(src: string, dest: string) {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                operations.push({
                    source: srcPath,
                    destination: destPath,
                    isDirectory: true
                });
                buildOps(srcPath, destPath);
            } else {
                operations.push({
                    source: srcPath,
                    destination: destPath,
                    isDirectory: false
                });
            }
        }
    }
    
    buildOps(source, destination);
    return operations;
}

export function performCopyOperations(operations: CopyOperation[]) {
    // First create all directories
    operations
        .filter(op => op.isDirectory)
        .forEach(op => {
            if (!fs.existsSync(op.destination)) {
                fs.mkdirSync(op.destination, { recursive: true });
            }
        });
    
    // Then copy all files
    operations
        .filter(op => !op.isDirectory)
        .forEach(op => {
            fs.copyFileSync(op.source, op.destination);
        });
}