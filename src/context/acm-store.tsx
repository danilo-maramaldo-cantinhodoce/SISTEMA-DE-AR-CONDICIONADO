import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AcmContext, emptyState, STORAGE_KEY, type Persisted, type StoreValue } from '@/context/acm-context';
import type { Equipamento, Manutencao, Prestador, TipoEvento, TipoManutencao, NotaFiscalLote, LinhaImportacaoPlanilha } from '@/lib/types';
import { LOJAS } from '@/lib/constants';
import { novoId, toNumber } from '@/lib/format';

const OLD_KEY = 'gestao-ar-condicionado-v1';

function isTipoPreventiva(tipo: string): boolean {
  if (!tipo) return false;
  const t = tipo.toLowerCase();
  return t.includes('preventiva');
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    
    if (!raw) {
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        const oldData = JSON.parse(oldRaw) as Partial<Persisted>;
        const manutencoes = (oldData.manutencoes ?? []).map((m) => ({
          ...m,
          tipo: (m as Manutencao).tipo || 'corretiva',
          servicos: ((m as Manutencao).servicos ?? []).map((s) => ({
            ...s,
            valorIndividual: s.valorIndividual || s.notaValor || '',
          })),
        })) as Manutencao[];
        
        const migrated: Persisted = {
          equipamentos: (oldData.equipamentos ?? []).map(e => ({
            ...e,
            status: String(e.status) === 'Desativado' ? 'Desativada' : (String(e.status) === 'Em operação' ? 'Em Operação' : e.status || 'Em Operação')
          })),
          prestadores: oldData.prestadores ?? [],
          manutencoes,
          eventos: oldData.eventos ?? [],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return emptyState;
    }
    
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      equipamentos: (parsed.equipamentos ?? []).map(e => ({
        ...e,
        status: (String(e.status) === 'Desativado' || e.status === 'Desativada') ? 'Desativada' : 'Em Operação'
      })),
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
      const isPrev = isTipoPreventiva(data.tipo);
      log(nova.equipamentoId, isPrev ? 'preventiva' : 'manutencao', `Manutenção ${data.tipo} registrada`, data.problemaAtestado || data.solucao || '');
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
      
      const isPrev = isTipoPreventiva(data.tipo);
      novas.forEach((nova) => {
        log(nova.equipamentoId, isPrev ? 'preventiva' : 'manutencao', `Manutenção ${data.tipo} registrada (lote)`, data.problemaAtestado || data.solucao || '');
      });
      
      return novas;
    },
    [log],
  );

  /**
   * REQUISITO 3: Salva Nota Fiscal com múltiplos itens de manutenção distribuídos por equipamento
   */
  const addNotaFiscalLote: StoreValue['addNotaFiscalLote'] = useCallback(
    (nota: NotaFiscalLote) => {
      const agora = new Date().toISOString();
      const novasManutencoes: Manutencao[] = nota.itens.map((item) => {
        const valorItem = toNumber(item.custoIndividual);
        const isPrev = isTipoPreventiva(item.tipoManutencao);
        return {
          id: novoId(),
          equipamentoId: item.equipamentoId,
          tipo: item.tipoManutencao,
          data: nota.data,
          problemaAtestado: item.descricao || `Serviço NF ${nota.numero}`,
          solucao: `Lançado via NF ${nota.numero}`,
          status: 'Concluída',
          custo: valorItem,
          notaFiscalId: nota.id,
          servicos: [
            {
              id: novoId(),
              prestadorId: nota.prestadorId,
              descricao: item.descricao || `${item.tipoManutencao} - NF ${nota.numero}`,
              notaNumero: nota.numero,
              notaTipo: nota.tipo,
              notaValor: String(nota.valorTotal),
              notaData: nota.data,
              valorIndividual: String(item.custoIndividual),
            },
          ],
          observacoes: nota.observacoes || '',
          criadoEm: agora,
          atualizadoEm: agora,
        };
      });

      setState((prev) => ({
        ...prev,
        manutencoes: [...novasManutencoes, ...prev.manutencoes],
      }));

      novasManutencoes.forEach((m) => {
        const isPrev = isTipoPreventiva(m.tipo);
        log(m.equipamentoId, isPrev ? 'preventiva' : 'manutencao', `NF ${nota.numero} — ${m.tipo}`, `Custo: R$ ${toNumber(m.custo).toFixed(2)}`);
      });
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

  /**
   * REQUISITO 4: Importação unificada de equipamentos e manutenções por planilha
   */
  const importarDadosPlanilha: StoreValue['importarDadosPlanilha'] = useCallback(
    (linhas: LinhaImportacaoPlanilha[]) => {
      let countEquipamentos = 0;
      let countManutencoes = 0;
      const agora = new Date().toISOString();

      setState((prev) => {
        const novosEquipamentos = [...prev.equipamentos];
        const novasManutencoes = [...prev.manutencoes];
        const novosPrestadores = [...prev.prestadores];

        linhas.forEach((linha) => {
          if (!linha.tagEquipamento) return;

          // Resolve CNPJ da Loja
          let lojaCnpj = linha.lojaCnpj || '';
          if (!lojaCnpj && linha.lojaNome) {
            const enc = LOJAS.find((l) => l.nome.toLowerCase() === linha.lojaNome?.toLowerCase());
            if (enc) lojaCnpj = enc.cnpj;
          }

          // Busca se equipamento já existe por TAG + LOJA
          let eq = novosEquipamentos.find(
            (e) => e.tag.toLowerCase() === linha.tagEquipamento?.toLowerCase() && (lojaCnpj ? e.lojaCnpj === lojaCnpj : true)
          );

          if (!eq) {
            eq = {
              id: novoId(),
              lojaCnpj: lojaCnpj || LOJAS[0].cnpj,
              tag: linha.tagEquipamento,
              local: linha.local || '',
              marca: linha.marca || 'Outra',
              potencia: linha.potencia || '',
              tipoEquipamento: linha.tipoEquipamento || 'Split Hi-Wall',
              modelo: linha.modelo || '',
              numeroSerie: linha.numeroSerie || '',
              voltagem: linha.voltagem || '220V',
              gasRefrigerante: linha.gasRefrigerante || 'R-410A',
              dataInstalacao: linha.dataInstalacao || new Date().toISOString().substring(0, 10),
              dataDesativacao: linha.dataDesativacao || '',
              vidaUtil: linha.vidaUtil || '',
              patrimonio: linha.patrimonio || '',
              status: linha.statusEquipamento === 'Desativada' ? 'Desativada' : 'Em Operação',
              observacoes: linha.observacoes || 'Importado via planilha',
              criadoEm: agora,
              atualizadoEm: agora,
            };
            novosEquipamentos.push(eq);
            countEquipamentos++;
          } else {
            // Atualiza dados adicionais se informados
            if (linha.dataDesativacao) eq.dataDesativacao = linha.dataDesativacao;
            if (linha.vidaUtil) eq.vidaUtil = linha.vidaUtil;
            if (linha.statusEquipamento) eq.status = linha.statusEquipamento;
          }

          // Verifica se há manutenção na linha
          if (linha.tipoManutencao || linha.custoManutencao || linha.notaNumero) {
            let prestadorId = '';
            if (linha.prestadorNome) {
              let p = novosPrestadores.find((pr) => pr.nome.toLowerCase() === linha.prestadorNome?.toLowerCase());
              if (!p) {
                p = {
                  id: novoId(),
                  nome: linha.prestadorNome,
                  razaoSocial: linha.prestadorNome,
                  documento: linha.prestadorDocumento || '',
                  tipoDocumento: 'CNPJ',
                  contato: '',
                  email: '',
                  observacoes: 'Cadastrado na importação',
                  criadoEm: agora,
                };
                novosPrestadores.push(p);
              }
              prestadorId = p.id;
            }

            const custoVal = toNumber(linha.custoManutencao);
            const man: Manutencao = {
              id: novoId(),
              equipamentoId: eq.id,
              tipo: linha.tipoManutencao || 'Corretiva',
              data: linha.dataManutencao || new Date().toISOString().substring(0, 10),
              problemaAtestado: linha.observacoes || `Importado via planilha`,
              solucao: 'Concluído',
              status: 'Concluída',
              custo: custoVal,
              servicos: linha.notaNumero
                ? [
                    {
                      id: novoId(),
                      prestadorId,
                      descricao: `Importação NF ${linha.notaNumero}`,
                      notaNumero: linha.notaNumero,
                      notaTipo: linha.notaTipo || 'DANFE',
                      notaValor: String(custoVal),
                      notaData: linha.dataManutencao || new Date().toISOString().substring(0, 10),
                      valorIndividual: String(custoVal),
                    },
                  ]
                : [],
              observacoes: linha.observacoes || '',
              criadoEm: agora,
              atualizadoEm: agora,
            };
            novasManutencoes.push(man);
            countManutencoes++;
          }
        });

        return {
          ...prev,
          equipamentos: novosEquipamentos,
          prestadores: novosPrestadores,
          manutencoes: novasManutencoes,
        };
      });

      return { countEquipamentos, countManutencoes };
    },
    [],
  );

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
        if (m.custo !== undefined && m.custo !== null && m.custo > 0) {
          return acc + toNumber(m.custo);
        }
        const totalServs = (m.servicos ?? []).reduce((sum, s) => sum + toNumber(s.valorIndividual), 0);
        return acc + totalServs;
      }, 0);
    };
    
    const custoLoja = (cnpj: string) => {
      const eqs = equipamentosDaLoja(cnpj);
      return eqs.reduce((acc, eq) => acc + custoEquipamento(eq.id), 0);
    };

    /**
     * REQUISITO 1: Cálculo exclusivo do Custo Total de Preventiva
     */
    const custoTotalPreventiva = (cnpj?: string) => {
      const mans = cnpj ? manutencoesDaLoja(cnpj) : (state.manutencoes ?? []);
      return mans.filter((m) => isTipoPreventiva(m.tipo)).reduce((acc, m) => {
        if (m.custo !== undefined && m.custo !== null && m.custo > 0) {
          return acc + toNumber(m.custo);
        }
        return acc + (m.servicos ?? []).reduce((sum, s) => sum + toNumber(s.valorIndividual), 0);
      }, 0);
    };

    /**
     * REQUISITO 1: Cálculo exclusivo do Custo Total de Corretiva
     */
    const custoTotalCorretiva = (cnpj?: string) => {
      const mans = cnpj ? manutencoesDaLoja(cnpj) : (state.manutencoes ?? []);
      return mans.filter((m) => !isTipoPreventiva(m.tipo)).reduce((acc, m) => {
        if (m.custo !== undefined && m.custo !== null && m.custo > 0) {
          return acc + toNumber(m.custo);
        }
        return acc + (m.servicos ?? []).reduce((sum, s) => sum + toNumber(s.valorIndividual), 0);
      }, 0);
    };
    
    const contarManutencoes = (cnpj: string, tipo?: TipoManutencao) => {
      const mans = manutencoesDaLoja(cnpj);
      if (tipo) return mans.filter((m) => isTipoPreventiva(m.tipo) === isTipoPreventiva(tipo)).length;
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
      addNotaFiscalLote,
      updateManutencao,
      removeManutencao,
      importarDadosPlanilha,
      equipamentosDaLoja,
      manutencoesDoEquipamento,
      manutencoesDaLoja,
      eventosDoEquipamento: (equipamentoId) => (state.eventos ?? []).filter((ev) => ev.equipamentoId === equipamentoId),
      prestadorNome: (id) => (state.prestadores ?? []).find((p) => p.id === id)?.nome ?? 'Prestador não informado',
      custoEquipamento,
      custoLoja,
      custoTotalPreventiva,
      custoTotalCorretiva,
      contarManutencoes,
    };
  }, [
    state,
    addEquipamento,
    updateEquipamento,
    removeEquipamento,
    addPrestador,
    updatePrestador,
    removePrestador,
    addManutencao,
    addManutencaoEmLote,
    addNotaFiscalLote,
    updateManutencao,
    removeManutencao,
    importarDadosPlanilha,
  ]);

  return <AcmContext.Provider value={value}>{children}</AcmContext.Provider>;
}