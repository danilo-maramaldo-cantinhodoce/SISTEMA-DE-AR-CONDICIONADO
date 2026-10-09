import { hoje, novoId, toNumber } from '@/lib/format';
import type { Equipamento, Manutencao, ServicoItem, TipoManutencao } from '@/lib/types';

export type EquipamentoDraft = Omit<Equipamento, 'id' | 'criadoEm' | 'atualizadoEm'>;

export type ManutencaoDraft = Omit<Manutencao, 'id' | 'criadoEm' | 'atualizadoEm'> & {
	/** Campos temporários usados apenas pelo formulário de manutenção. */
	lojaCnpj?: string;
	equipamentoIds?: string[];
};

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
	patrimonio: '',
	status: 'Em Operação',
	observacoes: '',
});

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
	tipo: tipo === 'preventiva' ? 'Preventiva Trimestral' : tipo,
	data: hoje(),
	problemaAtestado: '',
	solucao: '',
	status: 'Aberta',
	servicos: [servicoVazio()],
	observacoes: '',
});

export const ehPreventiva = (tipo: string) => tipo.toLowerCase().includes('preventiva');

/** Soma dos valores globais das notas fiscais */
export const totalNotasManutencao = (servicos: ServicoItem[]) => 
	(servicos ?? []).reduce((acc, s) => acc + toNumber(s.notaValor), 0);

/** Soma dos valores individuais gastos com o equipamento */
export const totalIndividualManutencao = (servicos: ServicoItem[]) => 
	(servicos ?? []).reduce((acc, s) => acc + toNumber(s.valorIndividual), 0);

/** Calcula custo individual acumulado de um equipamento */
export const custoIndividualAcumulado = (manutencoes: Manutencao[]) =>
	(manutencoes ?? []).reduce((acc, m) => acc + totalIndividualManutencao(m.servicos), 0);

export const cronogramaPreventiva = (manutencoes: Manutencao[]) => {
	const preventivas = (manutencoes ?? [])
		.filter((m) => ehPreventiva(String(m.tipo)))
		.sort((a, b) => (a.data > b.data ? -1 : 1));
	if (preventivas.length === 0) return null;
	const ultima = preventivas[0];
	const dataProxima = new Date(`${ultima.data}T12:00:00`);
	const ultimaSemestral = String(ultima.tipo).toLowerCase().includes('semestral');
	const tipoProxima = ultimaSemestral ? 'Preventiva Trimestral' : 'Preventiva Semestral';
	const dia = dataProxima.getDate();
	dataProxima.setDate(1);
	dataProxima.setMonth(dataProxima.getMonth() + 3);
	const ultimoDiaMes = new Date(dataProxima.getFullYear(), dataProxima.getMonth() + 1, 0).getDate();
	dataProxima.setDate(Math.min(dia, ultimoDiaMes));
	return { ultima, tipoProxima, dataProxima };
};

/** Alterna o tipo registrado a cada preventiva, realizada em ciclos de três meses. */
export const proximaPreventiva = (manutencoes: Manutencao[]): Date | null => {
	return cronogramaPreventiva(manutencoes)?.dataProxima ?? null;
};

/** Verifica se a preventiva está atrasada */
export const preventivaAtrasada = (manutencoes: Manutencao[]): boolean => {
	const proxima = proximaPreventiva(manutencoes);
	if (!proxima) return false;
	return proxima < new Date();
};
