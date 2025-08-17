const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';

export function nanoid(size: number = 16): string {
	let id = '';
	for (let i = 0; i < size; i++) {
		id += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return id;
} 