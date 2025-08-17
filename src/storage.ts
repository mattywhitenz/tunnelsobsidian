import { App, Plugin } from 'obsidian';
import type { Tunnel } from './types';

export interface TunnelsSettings {
	tunnels: Tunnel[];
	pdf: {
		format: 'a4' | 'letter' | 'legal';
		orientation: 'portrait' | 'landscape';
		marginPt: number;
		includeFrontmatter: boolean;
	};
	request: {
		timeoutMs: number;
		retries: number;
	};
	debug: boolean;
}

export const DEFAULT_SETTINGS: TunnelsSettings = {
	tunnels: [],
	pdf: {
		format: 'a4',
		orientation: 'portrait',
		marginPt: 54,
		includeFrontmatter: true
	},
	request: {
		timeoutMs: 15000,
		retries: 1
	},
	debug: false
};

export class SettingsStore {
	private readonly plugin: Plugin;
	private data: TunnelsSettings = DEFAULT_SETTINGS;

	constructor(app: App, plugin: Plugin) {
		this.plugin = plugin;
	}

	async load(): Promise<void> {
		const loaded = (await this.plugin.loadData()) as TunnelsSettings | null;
		this.data = loaded ? { ...DEFAULT_SETTINGS, ...loaded } : DEFAULT_SETTINGS;
	}

	async save(): Promise<void> {
		await this.plugin.saveData(this.data);
	}

	getTunnels(): Tunnel[] {
		return this.data.tunnels;
	}

	setTunnels(tunnels: Tunnel[]): void {
		this.data.tunnels = tunnels;
	}

	getPdfSettings(): TunnelsSettings['pdf'] {
		return this.data.pdf;
	}

	setPdfSettings(next: TunnelsSettings['pdf']): void {
		this.data.pdf = next;
	}

	getRequestSettings(): TunnelsSettings['request'] {
		return this.data.request;
	}

	setRequestSettings(next: TunnelsSettings['request']): void {
		this.data.request = next;
	}

	getDebug(): boolean {
		return this.data.debug;
	}

	setDebug(value: boolean): void {
		this.data.debug = value;
	}
} 