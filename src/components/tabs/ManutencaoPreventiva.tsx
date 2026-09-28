import { useState } from 'react';
import {
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  X,
  AirVent,
  DollarSign,
  Filter,
  Wrench
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import ManutencaoForm from '@/components/ManutencaoForm';
import ManutencaoCard from '@/components/ManutencaoCard';
import { useAcm } from '@/hooks/use-acm';
import { formatBRL, formatData } from '@/lib/format';
import { LOJAS, lojaNome } from '@/lib/constants';
import {
  cronogramaPreventiva,
  ehPreventiva,
  manutencaoVazia,
  proximaPreventiva,
  preventivaAtrasada,
  totalIndividualManutencao,
  type ManutencaoDraft
} from '@/lib/drafts';

type FiltroStatus = 'todos' | 'atrasados' | 'proximos' | 'em_dia';

export default function ManutencaoPreventiva({ lojaInicial }: { lojaInicial?: string }) {
  const { equipamentosDaLoja, manutencoesDoEquipamento, addManutencao } = useAcm();

  const [loja, setLoja] = useState<string>(lojaInicial ?? '');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string | null>(null);
  const [novaManutencao, setNovaManutencao] = useState<ManutencaoDraft | null>(null);

  const listaEquipamentos = loja ? equipamentosDaLoja(loja) : [];
  const lojasComPreventivaNoMes = LOJAS.flatMap((lojaInfo) => {
    const hoje = new Date();
    const equipamentosDevidos = equipamentosDaLoja(lojaInfo.cnpj).flatMap((equipamento) => {
      const cronograma = cronogramaPreventiva(manutencoesDoEquipamento(equipamento.id));
      if (!cronograma || cronograma.dataProxima.getFullYear() !== hoje.getFullYear() || cronograma.dataProxima.getMonth() !== hoje.getMonth()) return [];
      return [{ equipamento, cronograma }];
    });
    if (equipamentosDevidos.length === 0) return [];
    equipamentosDevidos.sort((a, b) => a.cronograma.dataProxima.getTime() - b.cronograma.dataProxima.getTime());
    return [{ loja: lojaInfo, cronograma: equipamentosDevidos[0].cronograma, equipamentos: equipamentosDevidos.map(({ equipamento }) => equipamento) }];
  });

  // Mapeia o estado de preventiva de cada equipamento da loja
  const equipamentosComPreventiva = listaEquipamentos.map((eq) => {
    const manutencoes = manutencoesDoEquipamento(eq.id);
    const preventivas = manutencoes.filter((m) => ehPreventiva(String(m.tipo)));
    const proxima = proximaPreventiva(manutencoes);
    const atrasada = preventivaAtrasada(manutencoes);

    // Última data de preventiva
    const ultimaPreventiva = preventivas.length > 0
      ? preventivas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0].data
      : null;

    // Custo acumulado de preventivas no equipamento
    const custoPreventivas = preventivas.reduce((acc, m) => acc + totalIndividualManutencao(m.servicos), 0);

    // Define proximidade (nos próximos 30 dias)
    const trintaDias = 30 * 24 * 60 * 60 * 1000;
    const proximoDeVencer = proxima && !atrasada && (proxima.getTime() - Date.now() <= trintaDias);

    let statusPreventiva: 'atrasado' | 'proximo' | 'em_dia' = 'em_dia';
    if (atrasada) statusPreventiva = 'atrasado';
    else if (proximoDeVencer) statusPreventiva = 'proximo';

    return {
      equipamento: eq,
      preventivas,
      proxima,
      atrasada,
      proximoDeVencer,
      statusPreventiva,
      ultimaPreventiva,
      custoPreventivas
    };
  });

  // Métricas da Loja
  const totalAtrasados = equipamentosComPreventiva.filter((item) => item.statusPreventiva === 'atrasado').length;
  const totalProximos = equipamentosComPreventiva.filter((item) => item.statusPreventiva === 'proximo').length;
  const totalEmDia = equipamentosComPreventiva.filter((item) => item.statusPreventiva === 'em_dia').length;
  const custoTotalPreventivasLoja = equipamentosComPreventiva.reduce((acc, item) => acc + item.custoPreventivas, 0);

  // Filtragem da lista
  const equipamentosFiltrados = equipamentosComPreventiva.filter((item) => {
    if (filtroStatus === 'atrasados') return item.statusPreventiva === 'atrasado';
    if (filtroStatus === 'proximos') return item.statusPreventiva === 'proximo';
    if (filtroStatus === 'em_dia') return item.statusPreventiva === 'em_dia';
    return true;
  });

  const abrirNovaPreventiva = (equipamentoId: string) => {
    setEquipamentoSelecionado(equipamentoId);
    setNovaManutencao(manutencaoVazia(equipamentoId, 'preventiva'));
  };

  const salvarPreventiva = () => {
    if (!novaManutencao || !equipamentoSelecionado) return;
    addManutencao({ ...novaManutencao, equipamentoId: equipamentoSelecionado });
    setNovaManutencao(null);
    setEquipamentoSelecionado(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Seleção da Loja */}
      <Card>
        <CardHeader
          icon={<Shield className="text-purple-600" size={18} />}
          title="Manutenções Preventivas por Loja"
          subtitle="Monitore o cronograma de manutenção preventiva periódica dos equipamentos de cada unidade."
        />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <LojaSelect
            value={loja}
            onChange={(cnpj) => {
              setLoja(cnpj);
              setNovaManutencao(null);
              setEquipamentoSelecionado(null);
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<Calendar className="text-amber-600" size={18} />}
          title="Lojas com preventiva neste mês"
          subtitle="Agenda calculada pela última preventiva registrada e sua periodicidade."
        />
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {lojasComPreventivaNoMes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma loja tem preventiva prevista para este mês.</p>
          ) : lojasComPreventivaNoMes.map(({ loja: lojaInfo, cronograma, equipamentos }) => (
            <button key={lojaInfo.cnpj} type="button" onClick={() => setLoja(lojaInfo.cnpj)} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100">
              <strong className="text-sm text-gray-900">{lojaInfo.nome}</strong>
              <span className="mt-1 block text-xs text-gray-600">{equipamentos.length} equipamento(s) previsto(s): {equipamentos.map((equipamento) => equipamento.tag).join(', ')}</span>
              <span className="mt-2 block text-xs text-gray-700">Última manutenção preventiva: {cronograma.ultima.tipo} · {formatData(cronograma.ultima.data)}</span>
              <span className="mt-1 block text-xs font-semibold text-amber-900">Próxima manutenção preventiva: {cronograma.tipoProxima} · {formatData(cronograma.dataProxima.toISOString())}</span>
            </button>
          ))}
        </div>
      </Card>

      {loja && (
        <>
          {/* Dashboard de Indicadores de Preventiva */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex flex-col items-center rounded-xl bg-purple-50 p-4 border border-purple-100">
              <Shield size={22} className="text-purple-600 mb-1" />
              <span className="text-xl font-bold text-purple-900">{listaEquipamentos.length}</span>
              <span className="text-xs font-medium text-purple-700">Total de Equipamentos</span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-red-50 p-4 border border-red-100">
              <AlertTriangle size={22} className="text-red-600 mb-1" />
              <span className="text-xl font-bold text-red-900">{totalAtrasados}</span>
              <span className="text-xs font-medium text-red-700">Preventivas Atrasadas</span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-amber-50 p-4 border border-amber-100">
              <Clock size={22} className="text-amber-600 mb-1" />
              <span className="text-xl font-bold text-amber-900">{totalProximos}</span>
              <span className="text-xs font-medium text-amber-700">A vencer em 30 dias</span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-green-50 p-4 border border-green-100">
              <DollarSign size={22} className="text-green-600 mb-1" />
              <span className="text-xl font-bold text-green-900">{formatBRL(custoTotalPreventivasLoja)}</span>
              <span className="text-xs font-medium text-green-700">Investimento em Preventivas</span>
            </div>
          </div>

          {/* Filtros e Lista de Equipamentos */}
          <Card>
            <CardHeader
              title={`Plano de Preventivas · ${lojaNome(loja)}`}
              subtitle="Status das revisões conforme a periodicidade preventiva registrada"
              action={
                <div className="flex flex-row items-center gap-1.5 bg-muted p-1 rounded-lg">
                  <Button
                    variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                    className="text-xs h-8 px-2.5"
                    onClick={() => setFiltroStatus('todos')}
                  >
                    Todos ({listaEquipamentos.length})
                  </Button>
                  <Button
                    variant={filtroStatus === 'atrasados' ? 'primary' : 'ghost'}
                    className="text-xs h-8 px-2.5 text-red-600"
                    onClick={() => setFiltroStatus('atrasados')}
                  >
                    Atrasadas ({totalAtrasados})
                  </Button>
                  <Button
                    variant={filtroStatus === 'proximos' ? 'primary' : 'ghost'}
                    className="text-xs h-8 px-2.5 text-amber-600"
                    onClick={() => setFiltroStatus('proximos')}
                  >
                    Próximas ({totalProximos})
                  </Button>
                  <Button
                    variant={filtroStatus === 'em_dia' ? 'primary' : 'ghost'}
                    className="text-xs h-8 px-2.5 text-green-600"
                    onClick={() => setFiltroStatus('em_dia')}
                  >
                    Em dia ({totalEmDia})
                  </Button>
                </div>
              }
            />

            <div className="flex flex-col gap-4 p-5">
              {/* Form de Nova Preventiva Modal/Inline */}
              {novaManutencao && equipamentoSelecionado && (
                <div className="flex flex-col gap-4 rounded-xl border-2 border-purple-400 bg-purple-50/30 p-4">
                  <div className="flex flex-row items-center justify-between">
                    <Badge tone="purple">
                      <Shield size={12} className="mr-1" /> Novo Registro de Preventiva
                    </Badge>
                    <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => setNovaManutencao(null)}>
                      <X size={16} />
                    </Button>
                  </div>
                  <ManutencaoForm
                    draft={novaManutencao}
                    onChange={(p) => setNovaManutencao((prev) => (prev ? { ...prev, ...p } : prev))}
                  />
                  <div className="flex flex-row gap-2">
                    <Button onClick={salvarPreventiva}>
                      <Save size={16} /> Salvar Preventiva
                    </Button>
                    <Button variant="outline" onClick={() => setNovaManutencao(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {equipamentosFiltrados.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={32} className="text-green-600" />}
                  title="Nenhum equipamento encontrado"
                  description="Não há equipamentos que correspondam ao filtro selecionado nesta loja."
                />
              ) : (
                equipamentosFiltrados.map(({ equipamento, statusPreventiva, ultimaPreventiva, proxima, preventivas, custoPreventivas }) => (
                  <div
                    key={equipamento.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-purple-200"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      {/* Dados do Equipamento */}
                      <div className="flex flex-row items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                          <AirVent size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {equipamento.tag} · {equipamento.local}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {equipamento.marca} · {equipamento.potencia}
                            {equipamento.tipoEquipamento ? ` · ${equipamento.tipoEquipamento}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Status da Preventiva & Ações */}
                      <div className="flex flex-wrap items-center gap-2">
                        {statusPreventiva === 'atrasado' && (
                          <Badge tone="red">
                            <AlertTriangle size={12} className="mr-1" /> Preventiva Atrasada
                          </Badge>
                        )}
                        {statusPreventiva === 'proximo' && (
                          <Badge tone="amber">
                            <Clock size={12} className="mr-1" /> Vence em breve
                          </Badge>
                        )}
                        {statusPreventiva === 'em_dia' && (
                          <Badge tone="green">
                            <CheckCircle2 size={12} className="mr-1" /> Em dia
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                          onClick={() => abrirNovaPreventiva(equipamento.id)}
                        >
                          <Plus size={14} /> Lançar Preventiva
                        </Button>
                      </div>
                    </div>

                    {/* Detalhes e Prazos */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground block">Última Realizada:</span>
                        <span className="font-semibold text-gray-800">
                          {ultimaPreventiva ? formatData(ultimaPreventiva) : 'Nenhuma'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Próxima Prevista:</span>
                        <span className={`font-semibold ${statusPreventiva === 'atrasado' ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                          {proxima ? formatData(proxima.toISOString()) : 'Pendente'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Preventivas Realizadas:</span>
                        <span className="font-semibold text-gray-800">{preventivas.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Total Investido:</span>
                        <span className="font-semibold text-green-700">{formatBRL(custoPreventivas)}</span>
                      </div>
                    </div>

                    {/* Histórico Recente de Preventivas do Equipamento */}
                    {preventivas.length > 0 && (
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                          <Calendar size={13} /> Histórico de Preventivas ({preventivas.length})
                        </span>
                        <div className="flex flex-col gap-2">
                          {preventivas.slice(0, 2).map((m) => (
                            <ManutencaoCard key={m.id} manutencao={m} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}