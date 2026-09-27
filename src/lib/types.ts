export type TipoNota = 'DANFE' | 'NFSE';

/**
 * REQUISITO 5: O campo de status agora possui estritamente duas opções:
 * "Em Operação" e "Desativada".
 */
export type StatusEquipamento = 'Em Operação' | 'Desativada';

export type StatusManutencao = 'Aberta' | 'Em andamento' | 'Concluída';

export type TipoManutencao = 'corretiva' | 'preventiva';

/**
 * REQUISITO 3: Tipos específicos de manutenção realizados por máquina na Nota Fiscal
 */
export type TipoManutencaoItem = 'Preventiva Semestral' | 'Preventiva Trimestral' | 'Corretiva';

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
  /** REQUISITO 5: Data em que o equipamento foi desativado (opcional) */
  dataDesativacao?: string;
  /** REQUISITO 5: Vida útil no formato texto livre estruturado (ex: "6 anos e 3 meses") */
  vidaUtil?: string;
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

/** 
 * REQUISITO 3: Item individual de manutenção associado a uma máquina específica dentro de uma Nota Fiscal.
 * Uma mesma máquina pode ter múltiplos lançamentos (ex: Preventiva + Corretiva).
 */
export interface ItemManutencaoNota {
  id: string;
  equipamentoId: string;
  tipoManutencao: TipoManutencaoItem;
  custoIndividual: number | string;
  descricao?: string;
}

/**
 * REQUISITO 3: Estrutura para lançamento de Nota Fiscal vinculando múltiplas máquinas.
 */
export interface NotaFiscalLote {
  id: string;
  numero: string;
  tipo: TipoNota | '';
  prestadorId: string;
  data: string;
  valorTotal: number | string;
  observacoes?: string;
  itens: ItemManutencaoNota[];
  criadoEm?: string;
}

/** Um serviço = um prestador + a nota fiscal que ele emitiu (mantido para compatibilidade) */
export interface ServicoItem {
  id: string;
  prestadorId: string;
  descricao: string;
  notaNumero: string;
  notaTipo: TipoNota | '';
  notaValor: string;
  notaData: string;
  valorIndividual: string;
}

export interface Manutencao {
  id: string;
  equipamentoId: string;
  tipo: TipoManutencao | TipoManutencaoItem;
  data: string;
  problemaAtestado: string;
  solucao: string;
  status: StatusManutencao;
  servicos: ServicoItem[];
  custo?: number;
  notaFiscalId?: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * REQUISITO 2: Estrutura para controle e exibição de Manutenções Preventivas por Loja
 */
export interface RegistroPreventivaLoja {
  lojaCnpj: string;
  lojaNome: string;
  ultimaPreventiva?: {
    tipo: string; // ex: TRIMESTRAL, SEMESTRAL
    data: string; // DD/MM/AAAA
  };
  proximaPreventiva?: {
    tipo: string; // ex: TRIMESTRAL, SEMESTRAL
    data: string; // DD/MM/AAAA
  };
}

/**
 * REQUISITO 4: Modelo de linha para importação unificada de dados via planilha Excel/CSV
 */
export interface LinhaImportacaoPlanilha {
  lojaCnpj?: string;
  lojaNome?: string;
  tagEquipamento?: string;
  local?: string;
  marca?: string;
  potencia?: string;
  tipoEquipamento?: string;
  modelo?: string;
  numeroSerie?: string;
  voltagem?: string;
  gasRefrigerante?: string;
  dataInstalacao?: string;
  dataDesativacao?: string;
  vidaUtil?: string;
  patrimonio?: string;
  statusEquipamento?: StatusEquipamento;
  
  // Dados de Manutenção / NF vinculada
  dataManutencao?: string;
  tipoManutencao?: TipoManutencaoItem;
  custoManutencao?: number | string;
  notaNumero?: string;
  notaTipo?: TipoNota;
  prestadorNome?: string;
  prestadorDocumento?: string;
  observacoes?: string;
}

export type TipoEvento = 'cadastro' | 'edicao' | 'manutencao' | 'manutencao-edicao' | 'preventiva' | 'exclusao' | 'importacao';

export interface Evento {
  id: string;
  equipamentoId: string;
  tipo: TipoEvento;
  descricao: string;
  detalhe: string;
  data: string;
}