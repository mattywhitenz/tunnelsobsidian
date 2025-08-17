import { App, Modal, Setting, ButtonComponent, Notice, TFile } from 'obsidian';
import type { Tunnel, TunnelResponse } from './types';

export class SelectTunnelModal extends Modal {
	private readonly tunnels: Tunnel[];
	private readonly onSelect: (tunnel: Tunnel) => void;

	constructor(app: App, tunnels: Tunnel[], onSelect: (tunnel: Tunnel) => void) {
		super(app);
		this.tunnels = tunnels;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: 'Select Tunnel' });
		for (const t of this.tunnels) {
			const setting = new Setting(contentEl)
				.setName(t.name)
				.setDesc(`${t.description || ''}\n${t.url}`)
				.addButton((btn: ButtonComponent) => btn.setCta().setButtonText('Use').onClick(() => {
					this.onSelect(t);
					this.close();
				}));
			setting.infoEl.style.whiteSpace = 'pre-wrap';
		}
	}
}

export class ResponseModal extends Modal {
	private readonly response: TunnelResponse;

	constructor(app: App, response: TunnelResponse) {
		super(app);
		this.response = response;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: this.response.success ? 'Success' : 'Error' });
		const pre = contentEl.createEl('pre');
		pre.textContent = (this.response.data ?? this.response.error ?? '').slice(0, 10000);

		const footer = contentEl.createEl('div', { cls: 'modal-button-container' });
		new ButtonComponent(footer).setButtonText('Copy').onClick(async () => {
			await navigator.clipboard.writeText(pre.textContent || '');
			new Notice('Copied');
		});

		new ButtonComponent(footer).setButtonText('Save as note').onClick(async () => {
			const dir = '.tunnels-temp/responses';
			const vault = this.app.vault;
			if (!vault.getAbstractFileByPath(dir)) await vault.createFolder(dir);
			const ts = new Date().toISOString().replace(/[:.]/g, '-');
			const path = `${dir}/response-${ts}.md`;
			const content = `# Tunnel Response\n\n${this.response.success ? 'Success' : 'Error'} at ${this.response.timestamp}\n\n\n\n\n\n\n\n\n\n\n\n\n` +
				`\n\n\n\n\n\n\n\n\n\n\n` +
				`\n\n\n\n\n\n\n` +
				`\n\n\n\n\n` +
				`\n\n` +
				`\n\n\n\n` +
				`\n\n\n` +
				`\n\n` +
				`\n` +
				`\n\n\n` +
				`\n` +
				`\n\n` +
				`\n` +
				`\n\n\n` +
				`\n` +
				`\n\n` +
				`\n\n\n` +
				`\n\n\n\n` +
				`\n\n` +
				`\n\n\n\n` +
				`\n\n` +
				`\n` +
				`\n\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n` +
				`\n\n` +
				`\n\n` +
				`\n` +
				`\n` +
				`\n` +
				`\n` +
				`\n` +
				`\n` +
				`\n\n\n` +
				`\n` +
				`\n\n` +
				`\n` +
				`\n\n` +
				`\n\n\n` +
				`\n\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n` +
				`\n\n\n` +
				`\n\n\n\n` +
				`\n\n\n` +
				`\n\n` +
				`\n\n` +
				`\n` +
				'```\n' + (pre.textContent || '') + '\n```\n';
			await vault.create(path, content);
			new Notice('Saved response');
		});

		const data = this.response.data ?? '';
		if (/^https?:\/\//i.test(data.trim())) {
			new ButtonComponent(footer).setButtonText('Open URL').onClick(() => {
				window.open(data.trim(), '_blank');
			});
		}

		new ButtonComponent(footer).setCta().setButtonText('Close').onClick(() => this.close());
	}
} 