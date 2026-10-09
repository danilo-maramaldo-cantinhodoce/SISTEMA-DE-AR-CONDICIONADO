import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AcmContext, emptyState, STORAGE_KEY, type Persisted, type StoreValue } from '@/context/acm-context';
import type { Equipamento, Manutencao, Prestador, TipoEvento, TipoManutencao, NotaFiscalLote, LinhaImportacaoPlanilha } from '@/lib/types';
import { LOJAS, TIPOS_EQUIPAMENTO } from '@/lib/constants';
import { calcularVidaUtil, formatarTagEquipamento, novoId, toNumber } from '@/lib/format';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import SupabaseAuth from '@/components/SupabaseAuth';

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
            tag: e.tag ? formatarTagEquipamento(e.tag) : '',
            status: e.dataDesativacao || String(e.status) === 'Desativado' ? 'Desativada' : (String(e.status) === 'Em operação' ? 'Em Operação' : e.status || 'Em Operação')
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
        tag: e.tag ? formatarTagEquipamento(e.tag) : '',
        status: e.dataDesativacao || String(e.status) === 'Desativado' || e.status === 'Desativada' ? 'Desativada' : 'Em Operação'
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
  const [cloudStatus, setCloudStatus] = useState<StoreValue['cloudStatus']>(supabaseConfigured ? 'loading' : 'disabled');
  const [cloudError, setCloudError] = useState('');
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);

  const carregarDadosDaNuvem = useCallback(async (userId: string) => {
    if (!supabase) return;
    setCloudStatus('loading');
    setCloudError('');
    const { data, error } = await supabase.from('acm_state').select('payload').eq('user_id', userId).maybeSingle();
    if (error) {
      setCloudError(error.message);
      setCloudStatus('error');
      return;
    }
    if (data?.payload) {
      const remoto = data.payload as Partial<Persisted>;
      setState({
        equipamentos: (remoto.equipamentos ?? []).map((equipamento) => ({
          ...equipamento,
          tag: equipamento.tag ? formatarTagEquipamento(equipamento.tag) : '',
        })),
        prestadores: remoto.prestadores ?? [],
        manutencoes: remoto.manutencoes ?? [],
        eventos: remoto.eventos ?? [],
      });
    }
    setCloudUserId(userId);
    setCloudStatus('ready');
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let ativo = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return;
      if (error) {
        setCloudError(error.message);
        setCloudStatus('error');
      } else if (data.session) {
        void carregarDadosDaNuvem(data.session.user.id);
      } else {
        setCloudStatus('auth');
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;
      if (event === 'SIGNED_IN' && session) {
        void carregarDadosDaNuvem(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCloudUserId(null);
        setCloudStatus('auth');
      }
    });
    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [carregarDadosDaNuvem]);

  const signIn: StoreValue['signIn'] = useCallback(async (email, password) => {
    if (!supabase) return 'Supabase não configurado.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp: StoreValue['signUp'] = useCallback(async (email, password) => {
    if (!supabase) return 'Supabase não configurado.';
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.session) return 'Conta criada. Confirme seu e-mail e depois entre no sistema.';
    return 'Conta criada e conectada.';
  }, []);

  const signOut: StoreValue['signOut'] = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage indisponível */
    }
  }, [state]);

  useEffect(() => {
    if (!supabase || cloudStatus !== 'ready' || !cloudUserId) return;
    const timeout = window.setTimeout(async () => {
      if (!supabase) return;
      const { error } = await supabase.from('acm_state').upsert({
        user_id: cloudUserId,
        payload: state,
        updated_at: new Date().toISOString(),
      });
      if (error) setCloudError(`Falha ao salvar na nuvem: ${error.message}`);
      else setCloudError('');
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [state, cloudStatus, cloudUserId]);

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
      signIn,
      signUp,
      signOut,
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
    signIn,
    signUp,
    signOut,
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
      {cloudStatus !== 'disabled' && cloudStatus !== 'ready' ? (
        <SupabaseAuth status={cloudStatus === 'loading' ? 'loading' : cloudStatus === 'error' ? 'error' : 'auth'} error={cloudError} onSignIn={signIn} onSignUp={signUp} />
      ) : (
        <>
          {cloudError && <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">{cloudError}</p>}
          {children}
        </>
      )}
    </AcmContext.Provider>
  );
}