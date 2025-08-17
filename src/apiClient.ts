import type { Tunnel, TunnelResponse } from './types';

export interface SendParams {
	pdfBytes: Uint8Array;
	filename: string;
	noteTitle: string;
	notePath: string;
	timeoutMs: number;
	retries: number;
	debug?: boolean;
}

export class APIClient {
	async sendToTunnel(tunnel: Tunnel, params: SendParams): Promise<TunnelResponse> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
		try {
			if (params.debug) console.debug('[Tunnels] Sending', { url: tunnel.url, method: tunnel.method ?? 'POST', filename: params.filename });
			const response = await this.tryWithRetries(() => this.doRequest(tunnel, params, controller.signal), params.retries);
			if (params.debug) console.debug('[Tunnels] Response', response);
			return response;
		} finally {
			clearTimeout(timeout);
		}
	}

	private async tryWithRetries<T>(fn: () => Promise<T>, retries: number): Promise<T> {
		let lastError: any;
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				return await fn();
			} catch (e) {
				lastError = e;
				if (attempt < retries) continue;
				throw lastError;
			}
		}
		throw lastError;
	}

	private async doRequest(tunnel: Tunnel, params: SendParams, signal: AbortSignal): Promise<TunnelResponse> {
		const form = new FormData();
		const ab = new ArrayBuffer(params.pdfBytes.byteLength);
		new Uint8Array(ab).set(params.pdfBytes);
		const blob = new Blob([ab], { type: 'application/pdf' });
		form.append('file', blob, params.filename);
		form.append('title', params.noteTitle);
		form.append('path', params.notePath);

		const method = tunnel.method ?? 'POST';
		const headers: Record<string, string> = { ...(tunnel.headers ?? {}) };

		const res = await fetch(tunnel.url, {
			method,
			headers,
			body: form,
			signal
		});

		let dataText: string | undefined;
		try {
			dataText = await res.text();
		} catch {}

		if (!res.ok) {
			return { success: false, error: `HTTP ${res.status}: ${dataText ?? res.statusText}`, timestamp: new Date().toISOString() };
		}
		return { success: true, data: dataText, timestamp: new Date().toISOString() };
	}
}