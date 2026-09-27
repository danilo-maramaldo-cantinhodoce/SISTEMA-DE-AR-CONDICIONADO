export type TipoNota = 'DANFE' | 'NFSE';

export type StatusEquipamento = 'Em operação' | 'Desativada';

export type StatusManutencao = 'Aberta' | 'Em andamento' | 'Concluída';

export type TipoManutencao = 'corretiva' | 'preventiva';

/** Periodicidade aplicável apenas quando tipo === 'preventiva'. */
export type PeriodicidadePreventiva = 'Trimestral' | 'Semestral';

export interface Loja {
	cnpj: string;
	nome: string;
}

export interface Equipamento {
	id: string;
	lojaCnpj: string;
	tag: string;
	local: string;
	marca: string;
	potencia: string;
	tipoEquipamento: string;
	modelo: string;
	numeroSerie: string;
	voltagem: string;
	gasRefrigerante: string;
	dataInstalacao: string;
	/** Preenchida quando o equipamento é desativado. */
	dataDesativacao: string;
	/** Texto livre estruturado, ex.: "6 anos e 3 meses". */
	vidaUtil: string;
	patrimonio: string;
	status: StatusEquipamento;
	observacoes: string;
	criadoEm: string;
	atualizadoEm: string;
}

export interface Prestador {
	id: string;
	nome: string;
	razaoSocial: string;
	documento: string;
	tipoDocumento: 'CPF' | 'CNPJ' | '';
	contato: string;
	email: string;
	observacoes: string;
	criadoEm: string;
}

/** Um serviço = um prestador + a nota fiscal que ele emitiu (vínculo obrigatório). */
export interface ServicoItem {
	id: string;
	prestadorId: string;
	descricao: string;
	notaNumero: string;
	notaTipo: TipoNota | '';
	notaValor: string;
	notaData: string;
	/** Valor gasto individual com este equipamento específico (rateio da NF) */
	valorIndividual: string;
}

export interface Manutencao {
	id: string;
	equipamentoId: string;
	tipo: TipoManutencao;
	/** Só relevante quando tipo === 'preventiva'. */
	periodicidadePreventiva?: PeriodicidadePreventiva;
	data: string;
	problemaAtestado: string;
	solucao: string;
	status: StatusManutencao;
	servicos: ServicoItem[];
	observacoes: string;
	criadoEm: string;
	atualizadoEm: string;
}

export type TipoEvento = 'cadastro' | 'edicao' | 'manutencao' | 'manutencao-edicao' | 'preventiva' | 'exclusao';

export interface Evento {
	id: string;
	equipamentoId: string;
	tipo: TipoEvento;
	descricao: string;
	detalhe: string;
	data: string;
}
