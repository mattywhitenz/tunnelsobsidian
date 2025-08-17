import { nanoid } from './util';
import type { Tunnel } from './types';
import { SettingsStore } from './storage';

export class TunnelManager {
	private readonly store: SettingsStore;

	constructor(store: SettingsStore) {
		this.store = store;
	}

	list(): Tunnel[] {
		return this.store.getTunnels();
	}

	create(partial: Omit<Partial<Tunnel>, 'id' | 'createdAt'> & { name: string; url: string }): Tunnel {
		this.validateName(partial.name);
		this.validateUrl(partial.url);
		const newTunnel: Tunnel = {
			id: nanoid(),
			name: partial.name.trim(),
			description: partial.description?.trim() ?? '',
			url: partial.url.trim(),
			headers: partial.headers ?? {},
			method: partial.method ?? 'POST',
			createdAt: new Date().toISOString(),
			lastUsed: undefined,
			isDefault: !!partial.isDefault
		};
		const tunnels = [...this.store.getTunnels(), newTunnel];
		this.store.setTunnels(tunnels);
		return newTunnel;
	}

	update(id: string, updates: Partial<Omit<Tunnel, 'id' | 'createdAt'>>): Tunnel {
		const tunnels = this.store.getTunnels();
		const index = tunnels.findIndex(t => t.id === id);
		if (index === -1) throw new Error('Tunnel not found');
		const current = tunnels[index];
		if (updates.name !== undefined) this.validateName(updates.name);
		if (updates.url !== undefined) this.validateUrl(updates.url);
		const updated: Tunnel = { ...current, ...updates };
		tunnels[index] = updated;
		this.store.setTunnels([...tunnels]);
		return updated;
	}

	remove(id: string): void {
		const tunnels = this.store.getTunnels();
		const filtered = tunnels.filter(t => t.id !== id);
		this.store.setTunnels(filtered);
	}

	markUsed(id: string): void {
		const tunnels = this.store.getTunnels();
		const index = tunnels.findIndex(t => t.id === id);
		if (index === -1) return;
		tunnels[index] = { ...tunnels[index], lastUsed: new Date().toISOString() };
		this.store.setTunnels([...tunnels]);
	}

	setDefault(id: string): void {
		const tunnels = this.store.getTunnels().map(t => ({ ...t, isDefault: t.id === id }));
		this.store.setTunnels(tunnels);
	}

	private validateName(name: string): void {
		if (!name || !name.trim()) throw new Error('Name is required');
	}

	private validateUrl(url: string): void {
		try {
			const u = new URL(url);
			if (!['http:', 'https:'].includes(u.protocol)) {
				throw new Error('URL must be http or https');
			}
		} catch (e) {
			throw new Error('Invalid URL');
		}
	}
} 