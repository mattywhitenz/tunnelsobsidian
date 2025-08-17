import { App, Notice, Plugin, TFile, Menu } from 'obsidian';
import { SettingsStore } from './storage';
import { TunnelManager } from './tunnelManager';
import { TunnelsSettingTab } from './settingsTab';
import { PDFGenerator } from './pdfGenerator';
import { APIClient } from './apiClient';
import { ResponseModal, SelectTunnelModal } from './uiModals';

export default class TunnelsPlugin extends Plugin {
	private store!: SettingsStore;
	private manager!: TunnelManager;
	private pdf!: PDFGenerator;
	private api!: APIClient;

	async onload(): Promise<void> {
		this.store = new SettingsStore(this.app, this);
		await this.store.load();
		this.manager = new TunnelManager(this.store);
		this.pdf = new PDFGenerator(this.app);
		this.api = new APIClient();

		new Notice('Tunnels loaded');

		this.addSettingTab(new TunnelsSettingTab(this, this.store, this.manager));

		this.addRibbonIcon('paper-plane', 'Send current note via Tunnel', async () => {
			await this.sendFileViaTunnel(this.app.workspace.getActiveFile());
		});

		this.addCommand({
			id: 'tunnels-send-current-note',
			name: 'Send current note to tunnel',
			callback: async () => {
				await this.sendFileViaTunnel(this.app.workspace.getActiveFile());
			}
		});

		this.addCommand({
			id: 'tunnels-export-pdf',
			name: 'Export current note to PDF',
			callback: async () => {
				try {
					const pdfOptions = this.store.getPdfSettings();
					const bytes = await this.pdf.generateFromActiveFile(pdfOptions);
					const file = this.app.workspace.getActiveFile();
					if (!file) throw new Error('No active file');
					const pdfName = file.basename + '.pdf';
					const ab = new ArrayBuffer(bytes.byteLength);
					new Uint8Array(ab).set(bytes);
					await this.saveToVaultTemp(pdfName, ab);
					new Notice(`PDF generated: ${pdfName}`);
				} catch (e: any) {
					new Notice(`Failed to generate PDF: ${e?.message ?? e}`);
				}
			}
		});

		this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file) => {
			if (file instanceof TFile && file.extension === 'md') {
				menu.addItem((item) =>
					item.setTitle('Send via Tunnel…').setIcon('paper-plane').onClick(async () => {
						await this.sendFileViaTunnel(file);
					})
				);
			}
		}));

		this.addCommand({
			id: 'tunnels-open-settings',
			name: 'Open Tunnels settings',
			callback: () => this.openSettings()
		});
	}

	onunload(): void {}

	private openSettings(): void {
		(this.app as any).setting?.open?.();
		new Notice('Opened Settings: find "Tunnels" tab');
	}

	private async saveToVaultTemp(filename: string, data: ArrayBuffer): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath('.tunnels-temp');
		if (!folder) {
			await this.app.vault.createFolder('.tunnels-temp');
		}
		const path = `.tunnels-temp/${filename}`;
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing) {
			await this.app.vault.modifyBinary(existing as TFile, data);
		} else {
			await this.app.vault.createBinary(path, data);
		}
	}

	private async chooseTunnel(): Promise<ReturnType<TunnelManager['list']>[number] | null> {
		const tunnels = this.manager.list();
		if (tunnels.length === 0) {
			new Notice('No tunnels configured');
			return null;
		}
		const defaultTunnel = tunnels.find(t => t.isDefault);
		if (defaultTunnel) return defaultTunnel;
		if (tunnels.length === 1) return tunnels[0];
		return await new Promise((resolve) => {
			new SelectTunnelModal(this.app, tunnels, (t) => resolve(t)).open();
		});
	}

	private async sendFileViaTunnel(file: TFile | null): Promise<void> {
		try {
			if (!file) throw new Error('No active file');
			const tunnel = await this.chooseTunnel();
			if (!tunnel) return;

			const status = this.addStatusBarItem();
			status.setText('Tunnels: generating PDF…');
			const pdfOptions = this.store.getPdfSettings();
			const pdfBytes = await this.pdf.generateFromFile(file, pdfOptions);

			status.setText('Tunnels: sending…');
			const req = this.store.getRequestSettings();
			const response = await this.api.sendToTunnel(tunnel, {
				pdfBytes,
				filename: file.basename + '.pdf',
				noteTitle: file.basename,
				notePath: file.path,
				timeoutMs: req.timeoutMs,
				retries: req.retries,
				debug: this.store.getDebug()
			});

			this.manager.markUsed(tunnel.id);
			await this.store.save();

			status.setText('Tunnels: done');
			setTimeout(() => status.remove(), 1500);
			new ResponseModal(this.app, response).open();
		} catch (e: any) {
			new Notice(`Failed: ${e?.message ?? e}`);
		}
	}
} 