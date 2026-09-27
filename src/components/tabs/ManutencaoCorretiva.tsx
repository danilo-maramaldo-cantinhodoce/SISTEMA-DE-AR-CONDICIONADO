import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Save } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, TextArea } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import { linhaNotaVazia, labelTipoManutencao, type LinhaNotaFiscal } from '@/lib/drafts';
import ManutencaoCard from '@/components/ManutencaoCard';
import { useAcm } from '@/hooks/use-acm';
import { PERIODICIDADES_PREVENTIVA, TIPOS_NOTA } from '@/lib/constants';
import { formatBRL, hoje, toNumber } from '@/lib/format';
import type { DadosNotaFiscal } from '@/context/acm-context';
import type { PeriodicidadePreventiva, TipoManutencao, TipoNota } from '@/lib/types';

const dadosNotaVazios = (): DadosNotaFiscal => ({
  prestadorId: '',
  notaNumero: '',
  notaTipo: '',
  notaData: hoje(),
  descricao: '',
});

/** Nota Fiscal com uma ou mais máquinas: cada máquina tem seu próprio tipo de manutenção e custo individual. */
export default function ManutencaoCorretiva() {
  const { equipamentosDaLoja, prestadores, addNotaFiscalMultipla, manutencoesDoEquipamento } = useAcm();
  const [loja, setLoja] = useState('');
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<LinhaNotaFiscal[]>([]);
  const [dadosNota, setDadosNota] = useState<DadosNotaFiscal>(dadosNotaVazios());
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const equipamentos = loja ? equipamentosDaLoja(loja) : [];
  const historico = equipamentoIds.length === 1 ? manutencoesDoEquipamento(equipamentoIds[0]) : [];

  // Mantém "linhas" sincronizadas com os equipamentos selecionados
  useEffect(() => {
    setLinhas((prev) => {
      const mantidas = prev.filter((l) => equipamentoIds.includes(l.equipamentoId));
      const existentes = new Set(mantidas.map((l) => l.equipamentoId));
      const novas = equipamentoIds.filter((id) => !existentes.has(id)).map((id) => linhaNotaVazia(id));
      // preserva a ordem de seleção
      const porId = new Map([...mantidas, ...novas].map((l) => [l.equipamentoId, l]));
      return equipamentoIds.map((id) => porId.get(id)!);
    });
  }, [equipamentoIds]);

  const toggleEquipamento = (id: string) => {
    setEquipamentoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setOk('');
  };

  const selecionarTodos = () => {
    setEquipamentoIds(equipamentoIds.length === equipamentos.length ? [] : equipamentos.map((eq) => eq.id));
    setOk('');
  };

  const patchLinha = (id: string, patch: Partial<LinhaNotaFiscal>) =>
    setLinhas((prev) => prev.map((l) => (l.equipamentoId === id ? { ...l, ...patch } : l)));

  const totalNota = linhas.reduce((acc, l) => acc + toNumber(l.valorIndividual), 0);

  const salvar = () => {
    if (equipamentoIds.length === 0) return setErro('Selecione pelo menos um equipamento.');
    if (linhas.some((l) => !toNumber(l.valorIndividual))) return setErro('Informe o custo individual de cada máquina.');

    addNotaFiscalMultipla(dadosNota, linhas);

    setErro('');
    setOk(`Nota fiscal registrada para ${equipamentoIds.length} equipamento(s), totalizando ${formatBRL(totalNota)}.`);
    setEquipamentoIds([]);
    setLinhas([]);
    setDadosNota(dadosNotaVazios());
  };

  return (
    <div data-ev-id="ev_7677126cfd" className="flex flex-col gap-5">
      <Card>
        <CardHeader
          icon={<FileText size={18} />}
          title="Nota Fiscal de Manutenção"
          subtitle="Uma nota pode cobrir várias máquinas. Para cada uma, informe o tipo de manutenção e o custo individual — o total da nota é somado automaticamente." />

        <div className="flex flex-col gap-5 p-5">
          {/* Dados da nota fiscal */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Prestador de serviço / fornecedor">
              <Select value={dadosNota.prestadorId} onChange={(e) => setDadosNota((p) => ({ ...p, prestadorId: e.target.value }))}>
                <option value="">Selecione…</option>
                {prestadores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}{p.documento ? ` — ${p.documento}` : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label="Número da NF">
              <Input value={dadosNota.notaNumero} onChange={(e) => setDadosNota((p) => ({ ...p, notaNumero: e.target.value }))} placeholder="Ex.: 000123" />
            </Field>
            <Field label="Tipo da NF">
              <Select value={dadosNota.notaTipo} onChange={(e) => setDadosNota((p) => ({ ...p, notaTipo: e.target.value as TipoNota | '' }))}>
                <option value="">Selecione…</option>
                {TIPOS_NOTA.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Data da NF">
              <Input type="date" value={dadosNota.notaData} onChange={(e) => setDadosNota((p) => ({ ...p, notaData: e.target.value }))} />
            </Field>
          </div>

          <Field label="Serviço executado / observações da nota">
            <TextArea value={dadosNota.descricao} onChange={(e) => setDadosNota((p) => ({ ...p, descricao: e.target.value }))} placeholder="" />
          </Field>

          <div className="h-px bg-border" />

          {/* Loja e seleção de equipamentos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <LojaSelect
              value={loja}
              onChange={(cnpj) => { setLoja(cnpj); setEquipamentoIds([]); setOk(''); }}
              required />
          </div>

          {loja &&
          <div className="flex flex-col gap-3">
            <div className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Equipamentos desta nota *</span>
                <span className="text-xs text-muted-foreground">
                  {equipamentoIds.length === 0 ? 'Selecione as máquinas cobertas por esta nota' : `${equipamentoIds.length} equipamento(s) selecionado(s)`}
                </span>
              </div>
              <Button variant="outline" onClick={selecionarTodos}>
                {equipamentoIds.length === equipamentos.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            {equipamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado nesta loja.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {equipamentos.map((eq) => {
                  const selecionado = equipamentoIds.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipamento(eq.id)}
                      className={`flex cursor-pointer flex-row items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition ${
                        selecionado ? 'border-primary bg-primary/10' : 'border-border bg-white hover:bg-muted/60'}`}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                        selecionado ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                        {selecionado && <CheckCircle2 size={14} />}
                      </div>
                      <div className="flex flex-col gap-0">
                        <span className="text-sm font-semibold text-gray-900">{eq.tag}</span>
                        <span className="text-xs text-muted-foreground">{eq.local} · {eq.marca} {eq.potencia}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          }

          {/* Linhas por máquina: tipo de manutenção + custo individual */}
          {linhas.length > 0 &&
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-900">Manutenção e custo por máquina</h3>
            {linhas.map((linha) => {
              const eq = equipamentos.find((e) => e.id === linha.equipamentoId);
              return (
                <div key={linha.equipamentoId} className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-4">
                  <div className="flex flex-col gap-0.5 md:col-span-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Máquina</span>
                    <span className="text-sm font-bold text-gray-900">{eq?.tag ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">{eq?.local}</span>
                  </div>
                  <Field label="Tipo de manutenção">
                    <Select
                      value={linha.tipo}
                      onChange={(e) => patchLinha(linha.equipamentoId, { tipo: e.target.value as TipoManutencao })}>
                      <option value="corretiva">Corretiva</option>
                      <option value="preventiva">Preventiva</option>
                    </Select>
                  </Field>
                  {linha.tipo === 'preventiva' &&
                  <Field label="Periodicidade">
                    <Select
                      value={linha.periodicidadePreventiva}
                      onChange={(e) => patchLinha(linha.equipamentoId, { periodicidadePreventiva: e.target.value as PeriodicidadePreventiva })}>
                      {PERIODICIDADES_PREVENTIVA.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </Field>
                  }
                  <Field label="Custo individual (R$)">
                    <Input
                      value={linha.valorIndividual}
                      onChange={(e) => patchLinha(linha.equipamentoId, { valorIndividual: e.target.value })}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="bg-green-50" />
                  </Field>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
                    <Badge tone={linha.tipo === 'preventiva' ? 'purple' : 'neutral'}>{labelTipoManutencao(linha)}</Badge>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-row items-center justify-end gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <span className="text-sm font-semibold text-blue-900">Total automático da nota fiscal:</span>
              <span className="text-lg font-bold text-blue-900">{formatBRL(totalNota)}</span>
            </div>
          </div>
          }

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}
          {ok &&
          <p className="flex flex-row items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <CheckCircle2 size={16} /> {ok}
          </p>
          }

          <div>
            <Button onClick={salvar}>
              <Save size={16} /> Registrar nota fiscal {equipamentoIds.length > 1 ? `(${equipamentoIds.length} equip.)` : ''}
            </Button>
          </div>
        </div>
      </Card>

      {equipamentoIds.length === 1 && historico.length > 0 &&
      <Card>
        <CardHeader title="Manutenções deste equipamento" subtitle={`${historico.length} registro(s) — editáveis a qualquer momento`} />
        <div className="flex flex-col gap-3 p-5">
          {historico.map((m) => <ManutencaoCard key={m.id} manutencao={{ ...m, tipo: m.tipo || 'corretiva' }} />)}
        </div>
      </Card>
      }
    </div>
  );
}
