import { hoje, novoId, toNumber } from '@/lib/format';
import type { Equipamento, Manutencao, PeriodicidadePreventiva, ServicoItem, TipoManutencao } from '@/lib/types';

export type EquipamentoDraft = Omit<Equipamento, 'id' | 'criadoEm' | 'atualizadoEm'>;

export type ManutencaoDraft = Omit<Manutencao, 'id' | 'criadoEm' | 'atualizadoEm'>;

export const draftVazio = (): EquipamentoDraft => ({
	lojaCnpj: '',
	tag: '',
	local: '',
	marca: '',
	potencia: '',
	tipoEquipamento: '',
	modelo: '',
	numeroSerie: '',
	voltagem: '',
	gasRefrigerante: '',
	dataInstalacao: '',
	dataDesativacao: '',
	vidaUtil: '',
	patrimonio: '',
	status: 'Em operação',
	observacoes: '',
});

/** Uma linha da tela de Nota Fiscal com múltiplas máquinas. */
export interface LinhaNotaFiscal {
	id: string;
	equipamentoId: string;
	tipo: TipoManutencao;
	periodicidadePreventiva: PeriodicidadePreventiva;
	valorIndividual: string;
}

export const linhaNotaVazia = (equipamentoId = ''): LinhaNotaFiscal => ({
	id: novoId(),
	equipamentoId,
	tipo: 'corretiva',
	periodicidadePreventiva: 'Trimestral',
	valorIndividual: '',
});

/** Rótulo de exibição: "Corretiva", "Preventiva Trimestral", "Preventiva Semestral". */
export const labelTipoManutencao = (m: {tipo: TipoManutencao;periodicidadePreventiva?: PeriodicidadePreventiva;}) =>
	m.tipo === 'preventiva' ? `Preventiva ${m.periodicidadePreventiva ?? 'Trimestral'}` : 'Corretiva';

const MESES_POR_PERIODICIDADE: Record<PeriodicidadePreventiva, number> = { Trimestral: 3, Semestral: 6 };

export const servicoVazio = (): ServicoItem => ({
	id: novoId(),
	prestadorId: '',
	descricao: '',
	notaNumero: '',
	notaTipo: '',
	notaValor: '',
	notaData: '',
	valorIndividual: '',
});

export const manutencaoVazia = (equipamentoId = '', tipo: TipoManutencao = 'corretiva'): ManutencaoDraft => ({
	equipamentoId,
	tipo,
	periodicidadePreventiva: tipo === 'preventiva' ? 'Trimestral' : undefined,
	data: hoje(),
	problemaAtestado: '',
	solucao: '',
	status: 'Aberta',
	servicos: [servicoVazio()],
	observacoes: '',
});

/** Soma dos valores globais das notas fiscais */
export const totalNotasManutencao = (servicos: ServicoItem[]) => 
	(servicos ?? []).reduce((acc, s) => acc + toNumber(s.notaValor), 0);

/** Soma dos valores individuais gastos com o equipamento */
export const totalIndividualManutencao = (servicos: ServicoItem[]) => 
	(servicos ?? []).reduce((acc, s) => acc + toNumber(s.valorIndividual), 0);

/** Calcula custo individual acumulado de um equipamento */
export const custoIndividualAcumulado = (manutencoes: Manutencao[]) =>
	(manutencoes ?? []).reduce((acc, m) => acc + totalIndividualManutencao(m.servicos), 0);

/** Retorna a manutenção preventiva concluída mais recente, ou null. */
export const ultimaPreventiva = (manutencoes: Manutencao[]): Manutencao | null => {
	const preventivas = (manutencoes ?? [])
		.filter((m) => m.tipo === 'preventiva' && m.status === 'Concluída')
		.sort((a, b) => (a.data > b.data ? -1 : 1));
	return preventivas[0] ?? null;
};

/** Calcula a próxima data de manutenção preventiva com base na periodicidade da última (3 ou 6 meses). */
export const proximaPreventiva = (manutencoes: Manutencao[]): Date | null => {
	const ultima = ultimaPreventiva(manutencoes);
	if (!ultima) return null;

	const meses = MESES_POR_PERIODICIDADE[ultima.periodicidadePreventiva ?? 'Trimestral'];
	const proxima = new Date(ultima.data);
	proxima.setMonth(proxima.getMonth() + meses);
	return proxima;
};

/** Verifica se a preventiva está atrasada */
export const preventivaAtrasada = (manutencoes: Manutencao[]): boolean => {
	const proxima = proximaPreventiva(manutencoes);
	if (!proxima) return false;
	return proxima < new Date();
};
