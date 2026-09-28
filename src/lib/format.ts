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

export const toNumber = (value: string | number | null | undefined) => {
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

export function calcularVidaUtil(dataInstalacao: string, dataDesativacao: string): string {
	if (!dataInstalacao || !dataDesativacao) return '';
	const [anoInicio, mesInicio, diaInicio] = dataInstalacao.split('-').map(Number);
	const [anoFim, mesFim, diaFim] = dataDesativacao.split('-').map(Number);
	if (![anoInicio, mesInicio, diaInicio, anoFim, mesFim, diaFim].every(Number.isFinite)) return '';
	const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
	const fim = new Date(anoFim, mesFim - 1, diaFim);
	if (fim < inicio) return '';
	let anos = anoFim - anoInicio;
	let meses = mesFim - mesInicio;
	if (diaFim < diaInicio) meses -= 1;
	if (meses < 0) {
		anos -= 1;
		meses += 12;
	}
	const partes = [];
	if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
	if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
	return partes.join(' e ') || '0 meses';
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
