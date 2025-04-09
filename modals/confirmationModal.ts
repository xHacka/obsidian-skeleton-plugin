// modals/confirmationModal.ts - Simple confirmation modal

import { App, ButtonComponent, Modal } from "obsidian";

export class ConfirmationModal extends Modal {
    title: string;
    message: string;
    onConfirm: (result: boolean) => void;
    
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
                this.onConfirm(true);
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText("No")
            .onClick(() => {
                this.onConfirm(false);
                this.close();
            });
            
        // contentEl.createEl("style", {
        //     text: `
        //         .button-container {
        //             display: flex;
        //             justify-content: space-around;
        //             margin-top: 20px;
        //         }
        //     `
        // });
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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