// modals/confirmationModal.ts - Simple confirmation modal

import { App, ButtonComponent, Modal } from "obsidian";

export class ConfirmationModal extends Modal {
    title: string;
    message: string;
    onConfirm: (result: boolean) => void;
    private resolved = false;
    
    constructor(app: App, title: string, message: string, onConfirm: (result: boolean) => void) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.message });
        
        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
        
        new ButtonComponent(buttonContainer)
            .setButtonText("Yes")
            .setCta()
            .onClick(() => {
                this.resolved = true;
                this.onConfirm(true);
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText("No")
            .onClick(() => {
                this.resolved = true;
                this.onConfirm(false);
                this.close();
            });
    }
    
    onClose() {
        if (!this.resolved) {
            this.onConfirm(false);
        }
        this.contentEl.empty();
    }
}

export async function showConfirmationDialog(app: App, title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new ConfirmationModal(app, title, message, (result) => {
            resolve(result);
        });
        modal.open();
    });
}