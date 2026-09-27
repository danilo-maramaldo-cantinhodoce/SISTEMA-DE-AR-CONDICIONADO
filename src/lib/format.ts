/** Mantém apenas dígitos. */
export const onlyDigits = (value: string) => (value ?? '').replace(/\D/g, '');

/** Identifica CPF (11 dígitos) ou CNPJ (14 dígitos) pela quantidade de dígitos. */
export function detectTipoDocumento(value: string): 'CPF' | 'CNPJ' | '' {
	const d = onlyDigits(value);
	if (d.length === 11) return 'CPF';
	if (d.length === 14) return 'CNPJ';
	return '';
}

/** Formata progressivamente como CPF (até 11 dígitos) ou CNPJ (12+ dígitos). */
export function formatDocumento(value: string): string {
	const d = onlyDigits(value).slice(0, 14);
	if (d.length <= 11) {
		return d
			.replace(/^(\d{3})(\d)/, '$1.$2')
			.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
			.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
	}
	return d
		.replace(/^(\d{2})(\d)/, '$1.$2')
		.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
		.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
		.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

/** Formata telefone brasileiro. */
export function formatTelefone(value: string): string {
	const d = onlyDigits(value).slice(0, 11);
	if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
	return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export const toNumber = (value: string) => {
	const normalized = (value ?? '').toString().replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
	const n = Number.parseFloat(normalized);
	return Number.isFinite(n) ? n : 0;
};

export const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatData(iso: string): string {
	if (!iso) return '—';
	const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('pt-BR');
}

export function formatDataHora(iso: string): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Dispara o download de um arquivo de texto (usado para o modelo CSV de importação). */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/** Parser simples de CSV (separador vírgula, campos entre aspas suportados). Não trata quebras de linha dentro de campos. */
export function parseCsv(text: string): string[][] {
	return text
		.split(/\r?\n/)
		.filter((line) => line.trim().length > 0)
		.map((line) => {
			const cells: string[] = [];
			let atual = '';
			let dentroAspas = false;
			for (let i = 0; i < line.length; i++) {
				const c = line[i];
				if (c === '"') {
					dentroAspas = !dentroAspas;
				} else if (c === ',' && !dentroAspas) {
					cells.push(atual.trim());
					atual = '';
				} else {
					atual += c;
				}
			}
			cells.push(atual.trim());
			return cells;
		});
}
