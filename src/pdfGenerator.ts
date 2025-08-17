import { App, MarkdownRenderer, Notice, TFile } from 'obsidian';
import type { PDFOptions } from './types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PX_PER_PT = 96 / 72; // CSS px per typographic point

export class PDFGenerator {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	async generateFromActiveFile(options: PDFOptions): Promise<Uint8Array> {
		const file = this.getActiveMarkdownFile();
		if (!file) throw new Error('No active markdown file');
		return this.generateFromFile(file, options);
	}

	async generateFromFile(file: TFile, options: PDFOptions): Promise<Uint8Array> {
		let markdown = await this.app.vault.read(file);
		if (!options.includeFrontmatter) {
			markdown = this.stripYamlFrontmatter(markdown);
		}
		const container = await this.renderMarkdownToElement(markdown, file.path, options);
		try {
			const arrayBuffer = await this.elementToPdfArrayBuffer(container, options);
			container.detach();
			return new Uint8Array(arrayBuffer);
		} finally {
			container.detach();
		}
	}

	private getActiveMarkdownFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== 'md') return null;
		return file as TFile;
	}

	private stripYamlFrontmatter(md: string): string {
		if (!md.startsWith('---')) return md;
		const lines = md.split('\n');
		if (lines[0].trim() !== '---') return md;
		for (let i = 1; i < lines.length; i++) {
			if (lines[i].trim() === '---') {
				return lines.slice(i + 1).join('\n');
			}
		}
		return md;
	}

	private async renderMarkdownToElement(markdown: string, sourcePath: string, options: PDFOptions): Promise<HTMLElement> {
		const container = createDiv({ cls: 'tunnels-print-root' });
		const article = container.createEl('article');
		await MarkdownRenderer.render(this.app, markdown, article, sourcePath, null);
		const style = document.createElement('style');
		style.textContent = this.buildPrintCss(options);
		container.prepend(style);
		document.body.appendChild(container);
		return container;
	}

	private buildPrintCss(options: PDFOptions): string {
		const margin = `${options.marginPt}pt`;
		return `
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			.tunnels-print-root { padding: 0; margin: 0; }
			.tunnels-print-root article { max-width: 900px; margin: 0 auto; }
		`;
	}

	private async elementToPdfArrayBuffer(container: HTMLElement, options: PDFOptions): Promise<ArrayBuffer> {
		const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
		const pageFormat = options.format; // 'a4' | 'letter' | 'legal'
		const pdf = new jsPDF({ unit: 'pt', format: pageFormat, orientation: options.orientation });

		const pageWidth = pdf.internal.pageSize.getWidth() - options.marginPt * 2;
		const pageHeight = pdf.internal.pageSize.getHeight() - options.marginPt * 2;

		const imgWidthPx = canvas.width;
		const imgHeightPx = canvas.height;
		const imgAspect = imgHeightPx / imgWidthPx;
		const targetWidthPt = pageWidth;
		const targetHeightPt = targetWidthPt * imgAspect;

		const imgData = canvas.toDataURL('image/png');

		if (targetHeightPt <= pageHeight) {
			pdf.addImage(imgData, 'PNG', options.marginPt, options.marginPt, targetWidthPt, targetHeightPt, undefined, 'FAST');
			return pdf.output('arraybuffer');
		}

		// Multi-page: slice the canvas vertically to fit multiple pages
		const segmentHeightPx = Math.floor(pageHeight * PX_PER_PT);
		let renderedPx = 0;
		let isFirst = true;
		while (renderedPx < imgHeightPx) {
			const sliceHeightPx = Math.min(segmentHeightPx, imgHeightPx - renderedPx);
			const sliceCanvas = document.createElement('canvas');
			sliceCanvas.width = imgWidthPx;
			sliceCanvas.height = sliceHeightPx;
			const ctx = sliceCanvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(canvas, 0, renderedPx, imgWidthPx, sliceHeightPx, 0, 0, imgWidthPx, sliceHeightPx);
			}
			const sliceData = sliceCanvas.toDataURL('image/png');
			if (!isFirst) pdf.addPage(pageFormat, options.orientation);
			pdf.addImage(sliceData, 'PNG', options.marginPt, options.marginPt, targetWidthPt, pageHeight, undefined, 'FAST');
			isFirst = false;
			renderedPx += sliceHeightPx;
		}

		return pdf.output('arraybuffer');
	}
} 