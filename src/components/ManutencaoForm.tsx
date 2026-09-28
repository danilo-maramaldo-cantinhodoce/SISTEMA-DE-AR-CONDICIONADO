import { Plus, Trash2, Link2, Calculator, CheckSquare, Square, Cpu } from 'lucide-react';
import { Badge, Button, Field, Input, Select, TextArea } from '@/components/ui';
import { STATUS_MANUTENCAO, TIPOS_NOTA } from '@/lib/constants';
import { formatBRL, toNumber } from '@/lib/format';
import { servicoVazio, totalNotasManutencao, totalIndividualManutencao, type ManutencaoDraft } from '@/lib/drafts';
import { useAcm } from '@/hooks/use-acm';
import type { ServicoItem, StatusManutencao, TipoNota } from '@/lib/types';
import { ehPreventiva } from '@/lib/drafts';

export default function ManutencaoForm({
  draft,
  onChange,
}: {
  draft: ManutencaoDraft;
  onChange: (patch: Partial<ManutencaoDraft>) => void;
}) {
  const { prestadores, equipamentos = [] } = useAcm();

  // Filtra equipamentos da loja selecionada (se houver lojaCnpj no draft)
  const equipamentosLoja = draft.lojaCnpj
    ? equipamentos.filter((e) => e.lojaCnpj === draft.lojaCnpj)
    : equipamentos;

  const setServico = (id: string, patch: Partial<ServicoItem>) =>
    onChange({
      servicos: (draft.servicos ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  // Múltiplos equipamentos selecionados no atendimento
  const equipamentosSelecionados = draft.equipamentoIds ?? (draft.equipamentoId ? [draft.equipamentoId] : []);

  // Alterna seleção de equipamento e recalcula automaticamente o valor individual
  const toggleEquipamento = (eqId: string) => {
    let novosIds: string[];
    if (equipamentosSelecionados.includes(eqId)) {
      novosIds = equipamentosSelecionados.filter((id) => id !== eqId);
    } else {
      novosIds = [...equipamentosSelecionados, eqId];
    }

    const qtd = novosIds.length || 1;
    const novosServicos = (draft.servicos ?? []).map((s) => {
      const valorGlobalNum = toNumber(s.notaValor);
      if (valorGlobalNum > 0) {
        const valorInd = (valorGlobalNum / qtd).toFixed(2);
        return { ...s, valorIndividual: valorInd };
      }
      return s;
    });

    onChange({
      equipamentoIds: novosIds,
      equipamentoId: novosIds[0] || '',
      servicos: novosServicos,
    });
  };

  // Ao alterar o valor global da NF, divide automaticamente pelo total de máquinas selecionadas
  const handleValorGlobalChange = (servicoId: string, valorGlobalStr: string) => {
    const valorGlobalNum = toNumber(valorGlobalStr);
    const qtd = equipamentosSelecionados.length || 1;
    const valorIndividualCalculado = (valorGlobalNum / qtd).toFixed(2);

    setServico(servicoId, {
      notaValor: valorGlobalStr,
      valorIndividual: valorGlobalNum > 0 ? valorIndividualCalculado : '',
    });
  };

  const totalNotas = totalNotasManutencao(draft.servicos);
  const totalIndividual = totalIndividualManutencao(draft.servicos);
  const preventiva = ehPreventiva(String(draft.tipo));

  return (
    <div data-ev-id="ev_c4261e24c3" className="flex flex-col gap-5">
      {/* Resumo e Datas */}
      <div data-ev-id="ev_c960f79dd9" className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Field label="Data do atendimento">
          <Input type="date" value={draft.data} onChange={(e) => onChange({ data: e.target.value })} />
        </Field>
        <Field label="Status da manutenção">
          <Select value={draft.status} onChange={(e) => onChange({ status: e.target.value as StatusManutencao })}>
            {STATUS_MANUTENCAO.map((s) => (
              <option data-ev-id="ev_c72e1550d8" key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor global das NFs" hint="Soma dos valores das notas">
          <Input readOnly value={formatBRL(totalNotas)} className="font-semibold bg-blue-50 text-blue-900" />
        </Field>
        <Field label="Custo individual / máquina" hint="Gasto por equipamento">
          <Input readOnly value={formatBRL(totalIndividual)} className="font-semibold bg-green-50 text-green-900" />
        </Field>
      </div>

      {/* Seleção Múltipla de Máquinas / Rateio */}
      {equipamentosLoja.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
              <Cpu size={16} className="text-blue-600" />
              <span>Máquinas vinculadas a esta Nota Fiscal ({equipamentosSelecionados.length} selecionada(s))</span>
            </div>
            {equipamentosSelecionados.length > 1 && (
              <Badge tone="blue">
                <Calculator size={12} className="mr-1 inline" />
                Rateio automático ativado (1/{equipamentosSelecionados.length} do valor global)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Selecione as máquinas atendidas. O valor total da Nota Fiscal será rateado igualmente entre as selecionadas.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {equipamentosLoja.map((eq) => {
              const selected = equipamentosSelecionados.includes(eq.id);
              return (
                <button
                  type="button"
                  key={eq.id}
                  onClick={() => toggleEquipamento(eq.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {selected ? <CheckSquare size={15} className="text-blue-600 shrink-0" /> : <Square size={15} className="text-slate-400 shrink-0" />}
                  <span className="truncate">{eq.tag} — {eq.local}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {preventiva && (
        <Field label="Periodicidade da preventiva">
          <Select value={String(draft.tipo).toLowerCase().includes('semestral') ? 'Preventiva Semestral' : 'Preventiva Trimestral'} onChange={(e) => onChange({ tipo: e.target.value as ManutencaoDraft['tipo'] })}>
            <option value="Preventiva Semestral">Semestral</option>
            <option value="Preventiva Trimestral">Trimestral</option>
          </Select>
        </Field>
      )}

      {!preventiva && (
        <Field label="Problema atestado" hint="Se nenhuma informação for inserida, o campo permanece em branco">
          <TextArea value={draft.problemaAtestado} onChange={(e) => onChange({ problemaAtestado: e.target.value })} placeholder="" />
        </Field>
      )}

      <Field label={preventiva ? 'Serviços realizados' : 'Serviço executado / solução'}>
        <TextArea value={draft.solucao} onChange={(e) => onChange({ solucao: e.target.value })} placeholder="" />
      </Field>

      {/* Lista de Prestadores e Notas Fiscais */}
      <div data-ev-id="ev_4fd93cb841" className="flex flex-col gap-3">
        <div data-ev-id="ev_e4df5d63b1" className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div data-ev-id="ev_c777aac859" className="flex flex-col gap-0.5">
            <h3 data-ev-id="ev_91dfd4f5e2" className="text-sm font-bold text-gray-900">Prestadores e notas fiscais</h3>
            <p data-ev-id="ev_4d5f88250a" className="text-xs text-muted-foreground">
              Cada prestador está atrelado à nota fiscal. Digite o <strong data-ev-id="ev_7db84da6cd">valor global da NF</strong> para rateio automático ou ajuste o <strong data-ev-id="ev_7aaa2d18c8">valor individual</strong> manualmente.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => onChange({ servicos: [...(draft.servicos ?? []), servicoVazio()] })}>
            <Plus size={16} /> Adicionar prestador / nota
          </Button>
        </div>

        {prestadores.length === 0 && (
          <p data-ev-id="ev_e0d455fe54" className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Nenhum prestador cadastrado ainda. Cadastre na aba “Terceirizado / Prestador” para vincular aqui.
          </p>
        )}

        {(draft.servicos ?? []).map((s, i) => (
          <div data-ev-id="ev_2847e7462b" key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <div data-ev-id="ev_52276e32ac" className="flex flex-row items-center justify-between gap-2">
              <Badge tone="blue">
                <Link2 size={12} /> Serviço {i + 1}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                className="px-2 text-destructive"
                onClick={() => onChange({ servicos: (draft.servicos ?? []).filter((x) => x.id !== s.id) })}
              >
                <Trash2 size={16} /> Remover
              </Button>
            </div>

            <div data-ev-id="ev_a62292f382" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Prestador de serviço / fornecedor">
                <Select value={s.prestadorId} onChange={(e) => setServico(s.id, { prestadorId: e.target.value })}>
                  <option data-ev-id="ev_9c1a627579" value="">Selecione…</option>
                  {prestadores.map((p) => (
                    <option data-ev-id="ev_8a7efec386" key={p.id} value={p.id}>
                      {p.nome}
                      {p.documento ? ` — ${p.documento}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="O que este prestador forneceu / executou">
                <Input value={s.descricao} onChange={(e) => setServico(s.id, { descricao: e.target.value })} placeholder="Ex.: Venda da placa eletrônica / Mão de obra" />
              </Field>
            </div>

            <div data-ev-id="ev_654a2c5785" className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <Field label="Número da NF">
                <Input value={s.notaNumero} onChange={(e) => setServico(s.id, { notaNumero: e.target.value })} placeholder="Ex.: 000123" />
              </Field>
              <Field label="Tipo">
                <Select value={s.notaTipo} onChange={(e) => setServico(s.id, { notaTipo: e.target.value as TipoNota | '' })}>
                  <option data-ev-id="ev_8847ad72cf" value="">Selecione…</option>
                  {TIPOS_NOTA.map((t) => (
                    <option data-ev-id="ev_b201b904ff" key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Valor global NF (R$)" hint="Valor total da nota">
                <Input
                  value={s.notaValor}
                  onChange={(e) => handleValorGlobalChange(s.id, e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="bg-blue-50"
                />
              </Field>
              <Field
                label="Valor individual (R$)"
                hint={equipamentosSelecionados.length > 1 ? `1/${equipamentosSelecionados.length} do global` : 'Gasto deste equip.'}
              >
                <Input
                  value={s.valorIndividual}
                  onChange={(e) => setServico(s.id, { valorIndividual: e.target.value })}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="bg-green-50"
                />
              </Field>
              <Field label="Data da NF">
                <Input type="date" value={s.notaData} onChange={(e) => setServico(s.id, { notaData: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <Field label="Observações da manutenção">
        <TextArea value={draft.observacoes} onChange={(e) => onChange({ observacoes: e.target.value })} placeholder="" />
      </Field>
    </div>
  );
}