import { hoje, novoId, toNumber } from '@/lib/format';
import type { Equipamento, Manutencao, ServicoItem, TipoManutencao } from '@/lib/types';

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
	patrimonio: '',
	status: 'Em operação',
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
	tipo,
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

/** Calcula próxima data de manutenção preventiva (90 dias após a última) */
export const proximaPreventiva = (manutencoes: Manutencao[]): Date | null => {
	const preventivas = (manutencoes ?? [])
		.filter((m) => m.tipo === 'preventiva' && m.status === 'Concluída')
		.sort((a, b) => (a.data > b.data ? -1 : 1));
	
	if (preventivas.length === 0) return null;
	
	const ultima = new Date(preventivas[0].data);
	ultima.setDate(ultima.getDate() + 90);
	return ultima;
};

/** Verifica se a preventiva está atrasada */
export const preventivaAtrasada = (manutencoes: Manutencao[]): boolean => {
	const proxima = proximaPreventiva(manutencoes);
	if (!proxima) return false;
	return proxima < new Date();
};
