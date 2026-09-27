import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AcmContext, emptyState, STORAGE_KEY, type Persisted, type StoreValue } from '@/context/acm-context';
import type { Equipamento, Manutencao, Prestador, TipoEvento, TipoManutencao } from '@/lib/types';
import { novoId, toNumber } from '@/lib/format';

// Migra dados da versão antiga
const OLD_KEY = 'gestao-ar-condicionado-v1';

function load(): Persisted {
	try {
		// Tenta carregar versão nova primeiro
		const raw = localStorage.getItem(STORAGE_KEY);
		
		// Se não existir, tenta migrar da versão antiga
		if (!raw) {
			const oldRaw = localStorage.getItem(OLD_KEY);
			if (oldRaw) {
				const oldData = JSON.parse(oldRaw) as Partial<Persisted>;
				// Migra manutenções para incluir tipo e valorIndividual
				const manutencoes = (oldData.manutencoes ?? []).map((m) => ({
					...m,
					tipo: (m as Manutencao).tipo || 'corretiva',
					servicos: ((m as Manutencao).servicos ?? []).map((s) => ({
						...s,
						valorIndividual: s.valorIndividual || s.notaValor || '',
					})),
				})) as Manutencao[];
				
				const migrated: Persisted = {
					equipamentos: oldData.equipamentos ?? [],
					prestadores: oldData.prestadores ?? [],
					manutencoes,
					eventos: oldData.eventos ?? [],
				};
				// Salva na versão nova
				localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
				return migrated;
			}
			return emptyState;
		}
		
		const parsed = JSON.parse(raw) as Partial<Persisted>;
		return {
			equipamentos: parsed.equipamentos ?? [],
			prestadores: parsed.prestadores ?? [],
			manutencoes: parsed.manutencoes ?? [],
			eventos: parsed.eventos ?? [],
		};
	} catch {
		return emptyState;
	}
}

export function AcmStoreProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<Persisted>(() => load());

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			/* storage indisponível */
		}
	}, [state]);

	const log = useCallback((equipamentoId: string, tipo: TipoEvento, descricao: string, detalhe = '') => {
		setState((prev) => ({
			...prev,
			eventos: [{ id: novoId(), equipamentoId, tipo, descricao, detalhe, data: new Date().toISOString() }, ...prev.eventos],
		}));
	}, []);

	const addEquipamento: StoreValue['addEquipamento'] = useCallback(
		(data) => {
			const agora = new Date().toISOString();
			const novo: Equipamento = { ...data, id: novoId(), criadoEm: agora, atualizadoEm: agora };
			setState((prev) => ({ ...prev, equipamentos: [novo, ...prev.equipamentos] }));
			log(novo.id, 'cadastro', 'Equipamento cadastrado', `${novo.tag} — ${novo.marca} ${novo.potencia} — Local: ${novo.local || '—'}`);
			return novo;
		},
		[log],
	);

	const updateEquipamento: StoreValue['updateEquipamento'] = useCallback(
		(id, data) => {
			setState((prev) => ({
				...prev,
				equipamentos: prev.equipamentos.map((e) => (e.id === id ? { ...e, ...data, atualizadoEm: new Date().toISOString() } : e)),
			}));
			log(id, 'edicao', 'Cadastro do equipamento atualizado', Object.keys(data).join(', '));
		},
		[log],
	);

	const removeEquipamento: StoreValue['removeEquipamento'] = useCallback((id) => {
		setState((prev) => ({
			...prev,
			equipamentos: prev.equipamentos.filter((e) => e.id !== id),
			manutencoes: prev.manutencoes.filter((m) => m.equipamentoId !== id),
			eventos: prev.eventos.filter((ev) => ev.equipamentoId !== id),
		}));
	}, []);

	const addPrestador: StoreValue['addPrestador'] = useCallback((data) => {
		const novo: Prestador = { ...data, id: novoId(), criadoEm: new Date().toISOString() };
		setState((prev) => ({ ...prev, prestadores: [novo, ...prev.prestadores] }));
		return novo;
	}, []);

	const updatePrestador: StoreValue['updatePrestador'] = useCallback((id, data) => {
		setState((prev) => ({ ...prev, prestadores: prev.prestadores.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
	}, []);

	const removePrestador: StoreValue['removePrestador'] = useCallback((id) => {
		setState((prev) => ({ ...prev, prestadores: prev.prestadores.filter((p) => p.id !== id) }));
	}, []);

	const addManutencao: StoreValue['addManutencao'] = useCallback(
		(data) => {
			const agora = new Date().toISOString();
			const nova: Manutencao = { ...data, id: novoId(), criadoEm: agora, atualizadoEm: agora };
			setState((prev) => ({ ...prev, manutencoes: [nova, ...prev.manutencoes] }));
			const tipoLabel = data.tipo === 'preventiva' ? 'Manutenção preventiva' : 'Manutenção corretiva';
			log(nova.equipamentoId, data.tipo === 'preventiva' ? 'preventiva' : 'manutencao', `${tipoLabel} registrada`, data.problemaAtestado || data.solucao || '');
			return nova;
		},
		[log],
	);

	const addManutencaoEmLote: StoreValue['addManutencaoEmLote'] = useCallback(
		(equipamentoIds, data) => {
			const agora = new Date().toISOString();
			const novas: Manutencao[] = equipamentoIds.map((equipamentoId) => ({
				...data,
				id: novoId(),
				equipamentoId,
				criadoEm: agora,
				atualizadoEm: agora,
			}));
			
			setState((prev) => ({ ...prev, manutencoes: [...novas, ...prev.manutencoes] }));
			
			const tipoLabel = data.tipo === 'preventiva' ? 'Manutenção preventiva' : 'Manutenção corretiva';
			novas.forEach((nova) => {
				log(nova.equipamentoId, data.tipo === 'preventiva' ? 'preventiva' : 'manutencao', `${tipoLabel} registrada (lote)`, data.problemaAtestado || data.solucao || '');
			});
			
			return novas;
		},
		[log],
	);

	const updateManutencao: StoreValue['updateManutencao'] = useCallback(
		(id, data) => {
			let equipamentoId = '';
			setState((prev) => {
				const manutencoes = prev.manutencoes.map((m) => {
					if (m.id !== id) return m;
					equipamentoId = m.equipamentoId;
					return { ...m, ...data, atualizadoEm: new Date().toISOString() };
				});
				return { ...prev, manutencoes };
			});
			if (equipamentoId) log(equipamentoId, 'manutencao-edicao', 'Manutenção atualizada', '');
		},
		[log],
	);

	const removeManutencao: StoreValue['removeManutencao'] = useCallback((id) => {
		setState((prev) => ({ ...prev, manutencoes: prev.manutencoes.filter((m) => m.id !== id) }));
	}, []);

	const value = useMemo<StoreValue>(() => {
		const equipamentosDaLoja = (cnpj: string) =>
			(state.equipamentos ?? []).filter((e) => e.lojaCnpj === cnpj).sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR', { numeric: true }));
		
		const manutencoesDoEquipamento = (equipamentoId: string) =>
			(state.manutencoes ?? []).filter((m) => m.equipamentoId === equipamentoId).sort((a, b) => (a.data < b.data ? 1 : -1));
		
		const manutencoesDaLoja = (cnpj: string) => {
			const eqIds = new Set(equipamentosDaLoja(cnpj).map((e) => e.id));
			return (state.manutencoes ?? []).filter((m) => eqIds.has(m.equipamentoId));
		};
		
		const custoEquipamento = (equipamentoId: string) => {
			const mans = manutencoesDoEquipamento(equipamentoId);
			return mans.reduce((acc, m) => {
				const total = (m.servicos ?? []).reduce((sum, s) => sum + toNumber(s.valorIndividual), 0);
				return acc + total;
			}, 0);
		};
		
		const custoLoja = (cnpj: string) => {
			const eqs = equipamentosDaLoja(cnpj);
			return eqs.reduce((acc, eq) => acc + custoEquipamento(eq.id), 0);
		};
		
		const contarManutencoes = (cnpj: string, tipo?: TipoManutencao) => {
			const mans = manutencoesDaLoja(cnpj);
			if (tipo) return mans.filter((m) => m.tipo === tipo).length;
			return mans.length;
		};
		
		return {
			...state,
			addEquipamento,
			updateEquipamento,
			removeEquipamento,
			addPrestador,
			updatePrestador,
			removePrestador,
			addManutencao,
			addManutencaoEmLote,
			updateManutencao,
			removeManutencao,
			equipamentosDaLoja,
			manutencoesDoEquipamento,
			manutencoesDaLoja,
			eventosDoEquipamento: (equipamentoId) => (state.eventos ?? []).filter((ev) => ev.equipamentoId === equipamentoId),
			prestadorNome: (id) => (state.prestadores ?? []).find((p) => p.id === id)?.nome ?? 'Prestador não informado',
			custoEquipamento,
			custoLoja,
			contarManutencoes,
		};
	}, [state, addEquipamento, updateEquipamento, removeEquipamento, addPrestador, updatePrestador, removePrestador, addManutencao, addManutencaoEmLote, updateManutencao, removeManutencao]);

	return <AcmContext.Provider value={value}>{children}</AcmContext.Provider>;
}
