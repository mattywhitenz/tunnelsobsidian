import esbuild from 'esbuild';

const isProd = process.argv[2] === 'production';

esbuild.build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	outfile: 'main.js',
	external: ['obsidian', 'electron', '@codemirror/*', 'react', 'react-dom'],
	format: 'cjs',
	platform: 'browser',
	sourcemap: isProd ? false : 'inline',
	minify: isProd,
	target: ['es2020'],
	logLevel: 'info'
}).catch(() => process.exit(1)); 