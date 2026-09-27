import { createContext } from 'react';
import type { Equipamento, Evento, Manutencao, Prestador, TipoManutencao } from '@/lib/types';

export const STORAGE_KEY = 'gestao-ar-condicionado-v2';

export interface Persisted {
	equipamentos: Equipamento[];
	prestadores: Prestador[];
	manutencoes: Manutencao[];
	eventos: Evento[];
}

export interface StoreValue extends Persisted {
	addEquipamento: (data: Omit<Equipamento, 'id' | 'criadoEm' | 'atualizadoEm'>) => Equipamento;
	updateEquipamento: (id: string, data: Partial<Equipamento>) => void;
	removeEquipamento: (id: string) => void;
	addPrestador: (data: Omit<Prestador, 'id' | 'criadoEm'>) => Prestador;
	updatePrestador: (id: string, data: Partial<Prestador>) => void;
	removePrestador: (id: string) => void;
	addManutencao: (data: Omit<Manutencao, 'id' | 'criadoEm' | 'atualizadoEm'>) => Manutencao;
	/** Adiciona a mesma manutenção para múltiplos equipamentos de uma vez */
	addManutencaoEmLote: (equipamentoIds: string[], data: Omit<Manutencao, 'id' | 'equipamentoId' | 'criadoEm' | 'atualizadoEm'>) => Manutencao[];
	updateManutencao: (id: string, data: Partial<Manutencao>) => void;
	removeManutencao: (id: string) => void;
	equipamentosDaLoja: (cnpj: string) => Equipamento[];
	manutencoesDoEquipamento: (equipamentoId: string) => Manutencao[];
	manutencoesDaLoja: (cnpj: string) => Manutencao[];
	eventosDoEquipamento: (equipamentoId: string) => Evento[];
	prestadorNome: (id: string) => string;
	/** Calcula custo individual acumulado de um equipamento */
	custoEquipamento: (equipamentoId: string) => number;
	/** Calcula custo total de uma loja (soma dos custos individuais) */
	custoLoja: (cnpj: string) => number;
	/** Conta manutenções de uma loja por tipo */
	contarManutencoes: (cnpj: string, tipo?: TipoManutencao) => number;
}

export const emptyState: Persisted = { equipamentos: [], prestadores: [], manutencoes: [], eventos: [] };

export const AcmContext = createContext<StoreValue | null>(null);
