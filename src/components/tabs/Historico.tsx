import { useEffect, useState } from 'react';
import { AirVent, AlertTriangle, ChevronRight, ClipboardList, DollarSign, History, Pencil, Save, Shield, Wrench, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { statusTone } from '@/lib/ui-helpers';
import LojaSelect from '@/components/LojaSelect';
import EquipamentoFields from '@/components/EquipamentoFields';
import ManutencaoForm from '@/components/ManutencaoForm';
import { cronogramaPreventiva, ehPreventiva, manutencaoVazia, totalIndividualManutencao, type EquipamentoDraft, type ManutencaoDraft } from '@/lib/drafts';
import ManutencaoCard from '@/components/ManutencaoCard';
import { useAcm } from '@/hooks/use-acm';
import { formatBRL, formatData, formatDataHora, toNumber } from '@/lib/format';
import { lojaNome } from '@/lib/constants';
import type { TipoManutencao } from '@/lib/types';

const Info = ({ label, value }: { label: string; value: string }) => (
  <div data-ev-id="ev_a75861f896" className="flex flex-col gap-0.5">
    <span data-ev-id="ev_3c9b93061c" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span data-ev-id="ev_16613f6f76" className="text-sm font-medium text-gray-900">{value || '—'}</span>
  </div>
);

export default function Historico({ lojaInicial, equipamentoInicial }: { lojaInicial?: string; equipamentoInicial?: string }) {
  const {
    equipamentos, equipamentosDaLoja, manutencoesDoEquipamento, manutencoesDaLoja, eventosDoEquipamento,
    updateEquipamento, removeEquipamento, addManutencao, addManutencaoEmLote,
    custoTotalCorretiva, contarManutencoes
  } = useAcm();
  const [loja, setLoja] = useState(lojaInicial ?? '');
  const [selecionado, setSelecionado] = useState(equipamentoInicial ?? '');
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<EquipamentoDraft | null>(null);
  const [novaManutencao, setNovaManutencao] = useState<ManutencaoDraft | null>(null);
  const [tipoNova, setTipoNova] = useState<TipoManutencao>('corretiva');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useEffect(() => {
    if (lojaInicial) setLoja(lojaInicial);
    if (equipamentoInicial) setSelecionado(equipamentoInicial);
  }, [lojaInicial, equipamentoInicial]);

  const lista = loja ? equipamentosDaLoja(loja) : [];
  const equipamento = (equipamentos ?? []).find((e) => e.id === selecionado) ?? null;
  const manutencoes = equipamento ? manutencoesDoEquipamento(equipamento.id) : [];
  const eventos = equipamento ? eventosDoEquipamento(equipamento.id) : [];

  // Cálculos segregados por Tipo de Manutenção
  const custoDaManutencao = (m: typeof manutencoes[number]) =>
    m.custo !== undefined && toNumber(m.custo) > 0 ? toNumber(m.custo) : totalIndividualManutencao(m.servicos);

  const custoCorretivas = manutencoes
    .filter((m) => !ehPreventiva(String(m.tipo)))
    .reduce((acc, m) => acc + custoDaManutencao(m), 0);

  const cronogramaLoja = loja
    ? cronogramaPreventiva(manutencoesDaLoja(loja).filter((m) => ehPreventiva(String(m.tipo))))
    : null;
  const corretivasEquipamento = manutencoes.filter((m) => !ehPreventiva(String(m.tipo)));

  const abrirEdicao = () => {
    if (!equipamento) return;
    const { id, criadoEm, atualizadoEm, ...rest } = equipamento;
    void id; void criadoEm; void atualizadoEm;
    setDraft(rest);
    setEditando(true);
  };

  const salvarEdicao = () => {
    if (!equipamento || !draft) return;
    updateEquipamento(equipamento.id, draft);
    if (draft.lojaCnpj !== loja) setLoja(draft.lojaCnpj);
    setEditando(false);
  };

  const confirmarExclusao = () => {
    if (!equipamento) return;
    removeEquipamento(equipamento.id);
    setSelecionado('');
    setConfirmandoExclusao(false);
  };

  return (
    <div data-ev-id="ev_869dbf779c" className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<History size={18} />} title="Histórico" subtitle="Selecione a loja para listar os equipamentos e clique em um deles para ver todo o histórico." />
        <div data-ev-id="ev_980de90ad8" className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <LojaSelect
            value={loja}
            onChange={(cnpj) => {
              setLoja(cnpj);
              setSelecionado('');
              setEditando(false);
              setNovaManutencao(null);
              setConfirmandoExclusao(false);
            }}
          />
        </div>
      </Card>

      {loja && (
        <Card>
          <CardHeader title={`Equipamentos · ${lojaNome(loja)}`} subtitle={loja} />
          <div data-ev-id="ev_35cca66194" className="flex flex-col gap-4 p-5">
            {/* Contadores da loja */}
            <div data-ev-id="ev_0e8c8ee8ea" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div data-ev-id="ev_d4d056e2b4" className="flex flex-col items-center rounded-lg bg-blue-50 px-4 py-3">
                <AirVent size={20} className="text-blue-600 mb-1" />
                <span data-ev-id="ev_20838c0241" className="text-lg font-bold text-blue-900">{lista.length}</span>
                <span data-ev-id="ev_16fbed0b83" className="text-xs text-blue-700">Equipamentos</span>
              </div>
              <div data-ev-id="ev_60f953b529" className="flex flex-col items-center rounded-lg bg-amber-50 px-4 py-3">
                <Wrench size={20} className="text-amber-600 mb-1" />
                <span data-ev-id="ev_51f9cd3e9a" className="text-lg font-bold text-amber-900">{formatBRL(custoTotalCorretiva(loja))}</span>
                <span data-ev-id="ev_20f24d259e" className="text-xs text-amber-700">Custo corretiva</span>
              </div>
              <div data-ev-id="ev_60f953b529" className="flex flex-col items-center rounded-lg bg-amber-50 px-4 py-3">
                <Wrench size={20} className="text-amber-600 mb-1" />
                <span data-ev-id="ev_51f9cd3e9a" className="text-lg font-bold text-amber-900">{contarManutencoes(loja, 'corretiva')}</span>
                <span data-ev-id="ev_20f24d259e" className="text-xs text-amber-700">Corretivas</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-blue-50 px-4 py-3 text-center">
                <span className="mb-1 text-xs font-semibold text-blue-700">Última preventiva</span>
                <span className="text-sm font-bold text-blue-900">{cronogramaLoja ? formatData(cronogramaLoja.ultima.data) : '—'}</span>
                <span className="text-xs text-blue-700">{cronogramaLoja ? String(cronogramaLoja.ultima.tipo).replace(/^preventiva\s*/i, '').toLocaleUpperCase('pt-BR') : 'Sem registro'}</span>
              </div>
            </div>

            <div data-ev-id="ev_a2607dee11" className="flex flex-col gap-2">
              {lista.length === 0 ? (
                <EmptyState icon={<AirVent size={28} />} title="Nenhum equipamento nesta loja" description="Use a aba Cadastramento de equipamento para incluir o primeiro." />
              ) : (
                lista.map((eq) => {
                  const ativo = eq.id === selecionado;
                  const manutencoesEquipamento = manutencoesDoEquipamento(eq.id);
                  const corretivas = manutencoesEquipamento.filter((m) => !ehPreventiva(String(m.tipo)));
                  const custoCorretiva = corretivas.reduce((total, m) => total + custoDaManutencao(m), 0);
                  return (
                    <button
                      data-ev-id="ev_2affce2907"
                      key={eq.id}
                      type="button"
                      onClick={() => {
                        setSelecionado(ativo ? '' : eq.id);
                        setEditando(false);
                        setNovaManutencao(null);
                        setConfirmandoExclusao(false);
                      }}
                      className={`flex cursor-pointer flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        eq.status === 'Desativada'
                          ? 'border-red-300 bg-red-50 hover:bg-red-100'
                          : ativo ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-muted/60'
                      }`}
                    >
                      <div data-ev-id="ev_5e40972428" className="flex flex-row items-center gap-3">
                        <div data-ev-id="ev_4fb7c9ee46" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <AirVent size={17} />
                        </div>
                        <div data-ev-id="ev_d7c2980da1" className="flex flex-col gap-0.5">
                          <span data-ev-id="ev_38e374a841" className="text-sm font-bold text-gray-900">
                            {eq.tag} · {eq.local}
                          </span>
                          <span data-ev-id="ev_8d0d490ad2" className="text-xs text-muted-foreground">
                            {eq.marca} · {eq.potencia}
                            {eq.tipoEquipamento ? ` · ${eq.tipoEquipamento}` : ''}
                          </span>
                        </div>
                      </div>
                      <div data-ev-id="ev_f54356eb4e" className="flex flex-row items-center gap-2">
                        <Badge tone="amber">Corr. {formatBRL(custoCorretiva)} · {corretivas.length}</Badge>
                        <Badge tone={eq.status === 'Desativada' ? 'red' : statusTone(eq.status)}>{eq.status}</Badge>
                        <ChevronRight size={16} className={`text-muted-foreground transition ${ativo ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      )}

      {equipamento && (
        <Card>
          <CardHeader
            icon={<ClipboardList size={18} />}
            title={`${equipamento.tag} — histórico completo`}
            subtitle={`${lojaNome(equipamento.lojaCnpj)} · ${equipamento.lojaCnpj}`}
            action={
              <div data-ev-id="ev_ac8ca99b83" className="flex flex-row flex-wrap gap-2">
                {!editando && (
                  <Button variant="outline" onClick={abrirEdicao}>
                    <Pencil size={15} /> Editar cadastro
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setTipoNova('corretiva'); setNovaManutencao({ ...manutencaoVazia(equipamento.id, 'corretiva'), lojaCnpj: equipamento.lojaCnpj, equipamentoIds: [equipamento.id] }); }}>
                  <Wrench size={15} /> Corretiva
                </Button>
              </div>
            }
          />

          <div data-ev-id="ev_9254e90f8b" className="flex flex-col gap-6 p-5">
            {/* Projeção de preventiva */}
            {editando && draft ? (
              <div data-ev-id="ev_bf6d2d8c83" className="flex flex-col gap-4 rounded-xl border-2 border-primary/40 p-4">
                <Badge tone="purple">
                  <Pencil size={12} /> Edição total do equipamento
                </Badge>
                <EquipamentoFields draft={draft} onChange={(p) => setDraft((prev) => (prev ? { ...prev, ...p } : prev))} modoCompleto />
                <div data-ev-id="ev_34feac5eb8" className="flex flex-row flex-wrap gap-2">
                  <Button onClick={salvarEdicao}>
                    <Save size={16} /> Salvar cadastro
                  </Button>
                  <Button variant="outline" onClick={() => setEditando(false)}>
                    <X size={16} /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div data-ev-id="ev_97b921e43f" className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Info label="Tag" value={equipamento.tag} />
                <Info label="Local" value={equipamento.local} />
                <Info label="Marca" value={equipamento.marca} />
                <Info label="Potência" value={equipamento.potencia} />
                <Info label="Tipo" value={equipamento.tipoEquipamento} />
                <Info label="Modelo" value={equipamento.modelo} />
                <Info label="Número de série" value={equipamento.numeroSerie} />
                <Info label="Patrimônio" value={equipamento.patrimonio} />
                <Info label="Voltagem" value={equipamento.voltagem} />
                <Info label="Gás refrigerante" value={equipamento.gasRefrigerante} />
                <Info label="Instalação" value={equipamento.dataInstalacao ? formatData(equipamento.dataInstalacao) : ''} />
                <Info label="Status" value={equipamento.status} />
                {equipamento.dataDesativacao && <Info label="Data de desativação" value={formatData(equipamento.dataDesativacao)} />}
                {equipamento.vidaUtil && <Info label="Vida útil" value={equipamento.vidaUtil} />}

                {/* Custos e quantidade de corretivas deste equipamento */}
                <div className="flex flex-col gap-0.5 rounded-lg bg-amber-50/70 p-2.5 border border-amber-100">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">Custo corretivas · {corretivasEquipamento.length} serviço(s)</span>
                  <span className="text-sm font-bold text-amber-900">{formatBRL(custoCorretivas)}</span>
                </div>

                <Info label="Cadastrado em" value={formatDataHora(equipamento.criadoEm)} />
                <Info label="Última atualização" value={formatDataHora(equipamento.atualizadoEm)} />
                {equipamento.observacoes && <Info label="Observações" value={equipamento.observacoes} />}
              </div>
            )}

            {novaManutencao && (
              <div data-ev-id="ev_6fbd17d0c3" className="flex flex-col gap-4 rounded-xl border-2 border-primary/40 p-4">
                <Badge tone="purple">
                  {tipoNova === 'preventiva' ? <Shield size={12} /> : <Wrench size={12} />} Nova manutenção {tipoNova}
                </Badge>
                <ManutencaoForm draft={novaManutencao} onChange={(p) => setNovaManutencao((prev) => (prev ? { ...prev, ...p } : prev))} />
                <div data-ev-id="ev_43885da1d1" className="flex flex-row flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const {
                        lojaCnpj: _lojaCnpj,
                        equipamentoIds: idsSelecionados,
                        equipamentoId: _equipamentoId,
                        ...dadosManutencao
                      } = novaManutencao;
                      const ids = idsSelecionados?.length ? idsSelecionados : [equipamento.id];

                      if (ids.length > 1) {
                        addManutencaoEmLote(ids, dadosManutencao);
                      } else {
                        addManutencao({ ...dadosManutencao, equipamentoId: ids[0] });
                      }
                      setNovaManutencao(null);
                    }}
                  >
                    <Save size={16} /> Registrar manutenção
                  </Button>
                  <Button variant="outline" onClick={() => setNovaManutencao(null)}>
                    <X size={16} /> Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Manutenções separadas por tipo */}
            <div data-ev-id="ev_aa0528515b" className="flex flex-col gap-3">
              <h3 data-ev-id="ev_3b70aa4837" className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Wrench size={16} className="text-amber-600" /> Manutenções corretivas ({corretivasEquipamento.length})
              </h3>
              {corretivasEquipamento.length === 0 ? (
                <p data-ev-id="ev_2fdfe08be5" className="text-sm text-muted-foreground italic">Nenhuma manutenção corretiva registrada.</p>
              ) : (
                corretivasEquipamento.map((m) => <ManutencaoCard key={m.id} manutencao={{ ...m, tipo: m.tipo || 'corretiva' }} />)
              )}
            </div>

            <div data-ev-id="ev_b25bce968b" className="flex flex-col gap-3">
              <h3 data-ev-id="ev_69761c7d4d" className="text-sm font-bold text-gray-900">Linha do tempo ({eventos.length})</h3>
              <div data-ev-id="ev_33fdfe9d64" className="flex flex-col gap-2">
                {eventos.map((ev) => (
                  <div data-ev-id="ev_e32e4512aa" key={ev.id} className="flex flex-row items-start gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    <span data-ev-id="ev_ad6f0eb1f4" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div data-ev-id="ev_b60ee7b992" className="flex flex-col gap-0.5">
                      <span data-ev-id="ev_98a34799cc" className="text-sm font-semibold text-gray-900">{ev.descricao}</span>
                      {ev.detalhe && <span data-ev-id="ev_6cee3feaee" className="text-xs text-gray-600">{ev.detalhe}</span>}
                      <span data-ev-id="ev_0d9c448d6b" className="text-xs text-muted-foreground">{formatDataHora(ev.data)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusão segura */}
            <div data-ev-id="ev_6463b253d4" className="border-t border-border pt-4">
              {!confirmandoExclusao ? (
                <Button variant="ghost" className="text-muted-foreground text-xs" onClick={() => setConfirmandoExclusao(true)}>
                  Excluir este equipamento
                </Button>
              ) : (
                <div data-ev-id="ev_599403fae3" className="flex flex-col gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <div data-ev-id="ev_425acbab8c" className="flex flex-row items-center gap-2 text-red-800">
                    <AlertTriangle size={20} />
                    <span data-ev-id="ev_bf29e85bfd" className="font-bold">Confirmar exclusão</span>
                  </div>
                  <p data-ev-id="ev_699fa84627" className="text-sm text-red-700">
                    Você tem certeza que deseja excluir <strong data-ev-id="ev_376603d74a">{equipamento.tag}</strong>? 
                    Todas as manutenções e o histórico serão removidos permanentemente.
                  </p>
                  <div data-ev-id="ev_e6347aa697" className="flex flex-row gap-2">
                    <Button variant="danger" onClick={confirmarExclusao}>
                      Sim, excluir permanentemente
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmandoExclusao(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}