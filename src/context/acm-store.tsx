import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AcmContext, emptyState, STORAGE_KEY, type Persisted, type StoreValue } from '@/context/acm-context';
import type { Equipamento, Manutencao, Prestador, TipoEvento, TipoManutencao, NotaFiscalLote, LinhaImportacaoPlanilha } from '@/lib/types';
import { LOJAS, TIPOS_EQUIPAMENTO } from '@/lib/constants';
import { calcularVidaUtil, formatarTagEquipamento, novoId, toNumber } from '@/lib/format';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const OLD_KEY = 'gestao-ar-condicionado-v1';
const SHARED_STATE_ID = 1;

function isTipoPreventiva(tipo: string): boolean {
  if (!tipo) return false;
  const t = tipo.toLowerCase();
  return t.includes('preventiva');
}

function normalizeState(data: Partial<Persisted>): Persisted {
  return {
    equipamentos: (data.equipamentos ?? []).map((equipamento) => ({
      ...equipamento,
      tag: equipamento.tag ? formatarTagEquipamento(equipamento.tag) : '',
      status: equipamento.dataDesativacao || String(equipamento.status) === 'Desativado' || equipamento.status === 'Desativada'
        ? 'Desativada'
        : 'Em Operação',
    })),
    prestadores: data.prestadores ?? [],
    manutencoes: data.manutencoes ?? [],
    eventos: data.eventos ?? [],
  };
}

function loadLocalMigration(): Persisted {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_KEY);
  if (!raw) return emptyState;

  const parsed = JSON.parse(raw) as Partial<Persisted>;
  const manutencoes = (parsed.manutencoes ?? []).map((manutencao) => ({
    ...manutencao,
    tipo: (manutencao as Manutencao).tipo || 'corretiva',
    servicos: ((manutencao as Manutencao).servicos ?? []).map((servico) => ({
      ...servico,
      valorIndividual: servico.valorIndividual || servico.notaValor || '',
    })),
  })) as Manutencao[];

  return normalizeState({ ...parsed, manutencoes });
}

function hasData(data: Persisted): boolean {
  return data.equipamentos.length > 0
    || data.prestadores.length > 0
    || data.manutencoes.length > 0
    || data.eventos.length > 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado ao conectar ao Supabase.';
}

function CloudStatus({ loading, error }: { loading: boolean; error: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {loading ? 'Conectando ao banco de dados' : 'Não foi possível conectar ao Supabase'}
        </h1>
        <p role={loading ? undefined : 'alert'} className="mt-2 text-sm text-slate-600">
          {loading ? 'Carregando os dados salvos na nuvem...' : error}
        </p>
      </div>
    </main>
  );
}

export function AcmStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(emptyState);
  const [cloudStatus, setCloudStatus] = useState<StoreValue['cloudStatus']>(supabaseConfigured ? 'loading' : 'error');
  const [cloudError, setCloudError] = useState(supabaseConfigured ? '' : 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para iniciar o sistema.');
  const cloudReady = useRef(false);

  useEffect(() => {
    let ativo = true;

    const conectar = async () => {
      if (!supabase) return;
      try {
        const [equipamentos, prestadores, manutencoes, eventos, estadoLegado] = await Promise.all([
          supabase.from('acm_equipamentos').select('payload'),
          supabase.from('acm_prestadores').select('payload'),
          supabase.from('acm_manutencoes').select('payload'),
          supabase.from('acm_eventos').select('payload'),
          supabase.from('acm_shared_state').select('payload').eq('id', SHARED_STATE_ID).maybeSingle(),
        ]);
        const erroLeitura = equipamentos.error ?? prestadores.error ?? manutencoes.error ?? eventos.error ?? estadoLegado.error;
        if (erroLeitura) throw new Error(erroLeitura.message);

        const remoto = normalizeState({
          equipamentos: (equipamentos.data ?? []).map((registro) => registro.payload as Equipamento),
          prestadores: (prestadores.data ?? []).map((registro) => registro.payload as Prestador),
          manutencoes: (manutencoes.data ?? []).map((registro) => registro.payload as Manutencao),
          eventos: (eventos.data ?? []).map((registro) => registro.payload as Persisted['eventos'][number]),
        });
        const legado = estadoLegado.data?.payload
          ? normalizeState(estadoLegado.data.payload as Partial<Persisted>)
          : emptyState;
        const local = hasData(remoto) || hasData(legado) ? emptyState : loadLocalMigration();
        const inicial = hasData(remoto) ? remoto : hasData(legado) ? legado : local;

        if (!hasData(remoto) && (hasData(legado) || hasData(local))) {
          const { error: migrationError } = await supabase.rpc('sync_acm_data', { p_payload: inicial });
          if (migrationError) throw new Error(`Falha ao migrar os dados para as tabelas do Supabase: ${migrationError.message}`);
        }
        if (ativo) setState(inicial);

        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(OLD_KEY);
        if (ativo) {
          cloudReady.current = true;
          setCloudError('');
          setCloudStatus('ready');
        }
      } catch (error) {
        if (ativo) {
          setCloudError(errorMessage(error));
          setCloudStatus('error');
        }
      }
    };

    void conectar();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !cloudReady.current || cloudStatus !== 'ready') return;
    const timeout = window.setTimeout(async () => {
      try {
        const { error } = await client.rpc('sync_acm_data', { p_payload: state });
        if (error) throw new Error(error.message);
        setCloudError('');
      } catch (error) {
        setCloudError(`Falha ao salvar no Supabase: ${errorMessage(error)}`);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [state, cloudStatus]);

  const log = useCallback((equipamentoId: string, tipo: TipoEvento, descricao: string, detalhe = '') => {
    setState((prev) => ({
      ...prev,
      eventos: [{ id: novoId(), equipamentoId, tipo, descricao, detalhe, data: new Date().toISOString() }, ...prev.eventos],
    }));
  }, []);

  const addEquipamento: StoreValue['addEquipamento'] = useCallback(
    (data) => {
      const agora = new Date().toISOString();
      const novo: Equipamento = {
        ...data,
        tag: formatarTagEquipamento(data.tag),
        local: data.local.toLocaleUpperCase('pt-BR'),
        numeroSerie: data.numeroSerie.toLocaleUpperCase('pt-BR'),
        patrimonio: data.patrimonio.toLocaleUpperCase('pt-BR'),
        observacoes: data.observacoes.toLocaleUpperCase('pt-BR'),
        status: data.dataDesativacao ? 'Desativada' : data.status,
        id: novoId(),
        criadoEm: agora,
        atualizadoEm: agora,
      };
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
        equipamentos: prev.equipamentos.map((e) => {
          if (e.id !== id) return e;
          const atualizado = {
            ...e,
            ...data,
            tag: data.tag ? formatarTagEquipamento(data.tag) : e.tag,
            local: (data.local ?? e.local).toLocaleUpperCase('pt-BR'),
            numeroSerie: (data.numeroSerie ?? e.numeroSerie).toLocaleUpperCase('pt-BR'),
            patrimonio: (data.patrimonio ?? e.patrimonio).toLocaleUpperCase('pt-BR'),
            observacoes: (data.observacoes ?? e.observacoes).toLocaleUpperCase('pt-BR'),
            atualizadoEm: new Date().toISOString(),
          };
          if (Object.prototype.hasOwnProperty.call(data, 'dataDesativacao')) {
            atualizado.status = data.dataDesativacao ? 'Desativada' : (data.status || 'Em Operação');
          }
          return atualizado;
        }),
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
      const normalizada = {
        ...data,
        problemaAtestado: data.problemaAtestado.toLocaleUpperCase('pt-BR'),
        solucao: data.solucao.toLocaleUpperCase('pt-BR'),
        observacoes: data.observacoes.toLocaleUpperCase('pt-BR'),
        numeroNota: data.numeroNota?.toLocaleUpperCase('pt-BR'),
        servicos: (data.servicos ?? []).map((servico) => ({
          ...servico,
          descricao: servico.descricao.toLocaleUpperCase('pt-BR'),
          notaNumero: servico.notaNumero.toLocaleUpperCase('pt-BR'),
        })),
      };
      const nova: Manutencao = { ...normalizada, id: novoId(), criadoEm: agora, atualizadoEm: agora };
      setState((prev) => ({ ...prev, manutencoes: [nova, ...prev.manutencoes] }));
      const isPrev = isTipoPreventiva(data.tipo);
      if (nova.equipamentoId) {
        log(nova.equipamentoId, isPrev ? 'preventiva' : 'manutencao', `Manutenção ${data.tipo} registrada`, data.problemaAtestado || data.solucao || '');
      }
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
          const atualizado = { ...m, ...data, atualizadoEm: new Date().toISOString() };
          atualizado.problemaAtestado = atualizado.problemaAtestado.toLocaleUpperCase('pt-BR');
          atualizado.solucao = atualizado.solucao.toLocaleUpperCase('pt-BR');
          atualizado.observacoes = atualizado.observacoes.toLocaleUpperCase('pt-BR');
          atualizado.numeroNota = atualizado.numeroNota?.toLocaleUpperCase('pt-BR');
          atualizado.servicos = (atualizado.servicos ?? []).map((servico) => ({
            ...servico,
            descricao: servico.descricao.toLocaleUpperCase('pt-BR'),
            notaNumero: servico.notaNumero.toLocaleUpperCase('pt-BR'),
          }));
          return atualizado;
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
      const countManutencoes = 0;
      const agora = new Date().toISOString();

      setState((prev) => {
        const novosEquipamentos = [...prev.equipamentos];
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
              tag: formatarTagEquipamento(linha.tagEquipamento),
              local: (linha.local || '').toLocaleUpperCase('pt-BR'),
              marca: linha.marca || 'Outra',
              potencia: linha.potencia || '',
              tipoEquipamento: linha.tipoEquipamento || TIPOS_EQUIPAMENTO[1],
              modelo: linha.modelo || '',
              numeroSerie: (linha.numeroSerie || '').toLocaleUpperCase('pt-BR'),
              voltagem: linha.voltagem || '220V',
              gasRefrigerante: linha.gasRefrigerante || 'R-410A',
              dataInstalacao: linha.dataInstalacao || new Date().toISOString().substring(0, 10),
              dataDesativacao: linha.dataDesativacao || '',
              vidaUtil: linha.vidaUtil || calcularVidaUtil(linha.dataInstalacao || '', linha.dataDesativacao || ''),
              patrimonio: (linha.patrimonio || '').toLocaleUpperCase('pt-BR'),
              status: linha.dataDesativacao || linha.statusEquipamento === 'Desativada' ? 'Desativada' : 'Em Operação',
              observacoes: (linha.observacoes || 'Importado via planilha').toLocaleUpperCase('pt-BR'),
              criadoEm: agora,
              atualizadoEm: agora,
            };
            novosEquipamentos.push(eq);
            countEquipamentos++;
          } else {
            // Atualiza dados adicionais se informados
            if (linha.dataDesativacao) eq.dataDesativacao = linha.dataDesativacao;
            if (linha.dataDesativacao) eq.status = 'Desativada';
            if (linha.vidaUtil || linha.dataDesativacao) eq.vidaUtil = linha.vidaUtil || calcularVidaUtil(eq.dataInstalacao, linha.dataDesativacao || eq.dataDesativacao || '');
            if (linha.statusEquipamento) eq.status = linha.statusEquipamento;
          }

        });

        return {
          ...prev,
          equipamentos: novosEquipamentos,
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
      return (state.manutencoes ?? []).filter((m) => m.lojaCnpj === cnpj || eqIds.has(m.equipamentoId));
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
      cloudStatus,
      cloudError,
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
    cloudStatus,
    cloudError,
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

  return (
    <AcmContext.Provider value={value}>
      {cloudStatus !== 'ready' ? (
        <CloudStatus loading={cloudStatus === 'loading'} error={cloudError} />
      ) : (
        <>
          {cloudError && <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">{cloudError}</p>}
          {children}
        </>
      )}
    </AcmContext.Provider>
  );
}