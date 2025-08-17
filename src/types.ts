export interface Tunnel {
	id: string;
	name: string;
	description: string;
	url: string;
	headers?: Record<string, string>;
	method?: 'POST' | 'PUT';
	createdAt: string;
	lastUsed?: string;
	isDefault?: boolean;
}

export interface TunnelResponse {
	success: boolean;
	data?: string;
	error?: string;
	timestamp: string;
}

export type PdfFormat = 'a4' | 'letter' | 'legal';
export type PdfOrientation = 'portrait' | 'landscape';

export interface PDFOptions {
	format: PdfFormat;
	orientation: PdfOrientation;
	marginPt: number; // points (1/72 inch)
	includeFrontmatter: boolean;
} 