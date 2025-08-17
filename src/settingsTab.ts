import { App, Plugin, PluginSettingTab, Setting, Notice, Modal, TextComponent, ButtonComponent, DropdownComponent, SliderComponent, ToggleComponent } from 'obsidian';
import type { Tunnel } from './types';
import { SettingsStore } from './storage';
import { TunnelManager } from './tunnelManager';

export class TunnelsSettingTab extends PluginSettingTab {
	private readonly store: SettingsStore;
	private readonly manager: TunnelManager;

	constructor(plugin: Plugin, store: SettingsStore, manager: TunnelManager) {
		super(plugin.app, plugin);
		this.store = store;
		this.manager = manager;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Tunnels' });

		new Setting(containerEl)
			.setName('Add Tunnel')
			.setDesc('Create a new tunnel to an external URL.')
			.addButton((btn) => {
				btn.setButtonText('New').onClick(() => {
					const modal = new EditTunnelModal(this.app, (tunnel) => {
						this.manager.create(tunnel);
						this.store.save();
						new Notice('Tunnel created');
						this.display();
					});
					modal.open();
				});
			});

		containerEl.createEl('div', { text: 'Existing Tunnels', cls: 'setting-item-heading' });

		for (const tunnel of this.manager.list()) {
			const headersCount = Object.keys(tunnel.headers ?? {}).length;
			const desc = `${tunnel.description || '(no description)'} — ${tunnel.url}\nMethod: ${tunnel.method ?? 'POST'} · Headers: ${headersCount}`;
			const setting = new Setting(containerEl)
				.setName(`${tunnel.name}${tunnel.isDefault ? ' (default)' : ''}`)
				.setDesc(desc)
				.addButton((btn) =>
					btn.setCta().setButtonText('Edit').onClick(() => {
						const modal = new EditTunnelModal(this.app, (updates) => {
							this.manager.update(tunnel.id, updates);
							this.store.save();
							new Notice('Tunnel updated');
							this.display();
						}, tunnel);
						modal.open();
					})
				)
				.addButton((btn) =>
					btn.setButtonText('Make default').onClick(() => {
						this.manager.setDefault(tunnel.id);
						this.store.save();
						new Notice(`Default tunnel: ${tunnel.name}`);
						this.display();
					})
				)
				.addButton((btn) =>
					btn.setWarning().setButtonText('Delete').onClick(() => {
						this.manager.remove(tunnel.id);
						this.store.save();
						new Notice('Tunnel deleted');
						this.display();
					})
				);
			setting.infoEl.style.whiteSpace = 'pre-wrap';
		}

		containerEl.createEl('h2', { text: 'PDF' });
		const pdf = this.store.getPdfSettings();

		new Setting(containerEl)
			.setName('Page format')
			.setDesc('Paper size for PDF output')
			.addDropdown((dd: DropdownComponent) => {
				dd.addOption('a4', 'A4');
				dd.addOption('letter', 'Letter');
				dd.addOption('legal', 'Legal');
				dd.setValue(pdf.format).onChange((v) => {
					this.store.setPdfSettings({ ...this.store.getPdfSettings(), format: v as any });
					this.store.save();
				});
			});

		new Setting(containerEl)
			.setName('Orientation')
			.setDesc('Portrait or Landscape')
			.addDropdown((dd: DropdownComponent) => {
				dd.addOption('portrait', 'Portrait');
				dd.addOption('landscape', 'Landscape');
				dd.setValue(pdf.orientation).onChange((v) => {
					this.store.setPdfSettings({ ...this.store.getPdfSettings(), orientation: v as any });
					this.store.save();
				});
			});

		new Setting(containerEl)
			.setName('Margins')
			.setDesc('Page margins in points (1/72 inch)')
			.addSlider((slider: SliderComponent) => {
				slider.setLimits(0, 144, 1).setValue(pdf.marginPt).onChange((value) => {
					this.store.setPdfSettings({ ...this.store.getPdfSettings(), marginPt: value });
				});
				slider.setDynamicTooltip();
			})
			.addExtraButton((btn) => btn.setIcon('save').onClick(() => this.store.save()));

		new Setting(containerEl)
			.setName('Include frontmatter')
			.setDesc('Render YAML frontmatter at top of document')
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(pdf.includeFrontmatter).onChange((v) => {
					this.store.setPdfSettings({ ...this.store.getPdfSettings(), includeFrontmatter: v });
					this.store.save();
				});
			});

		containerEl.createEl('h2', { text: 'Request' });
		const request = this.store.getRequestSettings();

		new Setting(containerEl)
			.setName('Timeout (ms)')
			.setDesc('How long to wait before aborting the request')
			.addText((txt) => {
				txt.inputEl.type = 'number';
				txt.setValue(String(request.timeoutMs)).onChange((v) => {
					const val = Number(v);
					if (!Number.isNaN(val) && val > 0) {
						this.store.setRequestSettings({ ...this.store.getRequestSettings(), timeoutMs: val });
						this.store.save();
					}
				});
			});

		new Setting(containerEl)
			.setName('Retries')
			.setDesc('Number of retry attempts on failure')
			.addText((txt) => {
				txt.inputEl.type = 'number';
				txt.setValue(String(request.retries)).onChange((v) => {
					const val = Number(v);
					if (!Number.isNaN(val) && val >= 0 && val <= 5) {
						this.store.setRequestSettings({ ...this.store.getRequestSettings(), retries: val });
						this.store.save();
					}
				});
			});

		containerEl.createEl('h2', { text: 'Advanced' });
		new Setting(containerEl)
			.setName('Debug logging')
			.setDesc('Log request/response info to the developer console')
			.addToggle((toggle) => toggle.setValue(this.store.getDebug()).onChange((v) => { this.store.setDebug(v); this.store.save(); }));
	}
}

class EditTunnelModal extends Modal {
	private readonly onSubmit: (tunnel: Partial<Tunnel> & { name: string; url: string }) => void;
	private readonly initial?: Tunnel;

	private nameInput!: TextComponent;
	private urlInput!: TextComponent;
	private descriptionInput!: TextComponent;
	private methodValue: 'POST' | 'PUT' = 'POST';
	private headers: Array<{ key: string; value: string }> = [];

	constructor(app: App, onSubmit: (tunnel: Partial<Tunnel> & { name: string; url: string }) => void, initial?: Tunnel) {
		super(app);
		this.onSubmit = onSubmit;
		this.initial = initial;
		this.methodValue = initial?.method ?? 'POST';
		this.headers = Object.entries(initial?.headers ?? {}).map(([key, value]) => ({ key, value }));
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: this.initial ? 'Edit Tunnel' : 'New Tunnel' });

		new Setting(contentEl).setName('Name').addText((txt) => {
			this.nameInput = txt.setPlaceholder('My Tunnel').setValue(this.initial?.name ?? '');
		});

		new Setting(contentEl).setName('URL').addText((txt) => {
			this.urlInput = txt.setPlaceholder('https://api.example.com/ingest').setValue(this.initial?.url ?? '');
		});

		new Setting(contentEl).setName('Description').addText((txt) => {
			this.descriptionInput = txt.setPlaceholder('Optional').setValue(this.initial?.description ?? '');
		});

		new Setting(contentEl)
			.setName('Method')
			.setDesc('HTTP method to use')
			.addDropdown((dd) => {
				dd.addOption('POST', 'POST');
				dd.addOption('PUT', 'PUT');
				dd.setValue(this.methodValue).onChange((v) => (this.methodValue = v as any));
			});

		contentEl.createEl('h4', { text: 'Headers' });
		const headersContainer = contentEl.createDiv();
		const renderHeaders = () => {
			headersContainer.empty();
			this.headers.forEach((h, index) => {
				const row = new Setting(headersContainer).setName(`Header ${index + 1}`);
				row.addText((k) => k.setPlaceholder('Header-Name').setValue(h.key).onChange((v) => (this.headers[index].key = v)));
				row.addText((v) => v.setPlaceholder('value').setValue(h.value).onChange((val) => (this.headers[index].value = val)));
				row.addExtraButton((btn) => btn.setIcon('trash').setTooltip('Remove').onClick(() => {
					this.headers.splice(index, 1);
					renderHeaders();
				}));
			});
		};
		renderHeaders();

		new Setting(contentEl)
			.setName('Add header')
			.addButton((btn) => btn.setButtonText('Add').onClick(() => {
				this.headers.push({ key: '', value: '' });
				renderHeaders();
			}));

		const footer = contentEl.createEl('div', { cls: 'modal-button-container' });
		new ButtonComponent(footer).setButtonText('Cancel').onClick(() => this.close());
		new ButtonComponent(footer).setCta().setButtonText(this.initial ? 'Save' : 'Create').onClick(() => {
			try {
				const headersObj: Record<string, string> = {};
				for (const { key, value } of this.headers) {
					if (key.trim()) headersObj[key.trim()] = value;
				}
				this.onSubmit({
					name: this.nameInput.getValue(),
					url: this.urlInput.getValue(),
					description: this.descriptionInput.getValue(),
					method: this.methodValue,
					headers: headersObj
				});
				this.close();
			} catch (e: any) {
				new Notice(e?.message ?? 'Failed to save');
			}
		});
	}
} 