import { Plus, Trash2, Link2 } from 'lucide-react';
import { Badge, Button, Field, Input, Select, TextArea } from '@/components/ui';
import { STATUS_MANUTENCAO, TIPOS_NOTA } from '@/lib/constants';
import { formatBRL, toNumber } from '@/lib/format';
import { servicoVazio, totalNotasManutencao, totalIndividualManutencao, type ManutencaoDraft } from '@/lib/drafts';
import { useAcm } from '@/hooks/use-acm';
import type { ServicoItem, StatusManutencao, TipoNota } from '@/lib/types';

export default function ManutencaoForm({ draft, onChange }: {draft: ManutencaoDraft;onChange: (patch: Partial<ManutencaoDraft>) => void;}) {
  const { prestadores } = useAcm();

  const setServico = (id: string, patch: Partial<ServicoItem>) =>
  onChange({ servicos: (draft.servicos ?? []).map((s) => s.id === id ? { ...s, ...patch } : s) });

  const totalNotas = totalNotasManutencao(draft.servicos);
  const totalIndividual = totalIndividualManutencao(draft.servicos);

  return (
    <div data-ev-id="ev_c4261e24c3" className="flex flex-col gap-5">
			<div data-ev-id="ev_c960f79dd9" className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Field label="Data do atendimento">
					<Input type="date" value={draft.data} onChange={(e) => onChange({ data: e.target.value })} />
				</Field>
				<Field label="Status da manutenção">
					<Select value={draft.status} onChange={(e) => onChange({ status: e.target.value as StatusManutencao })}>
						{STATUS_MANUTENCAO.map((s) =>
            <option data-ev-id="ev_c72e1550d8" key={s} value={s}>
								{s}
							</option>
            )}
					</Select>
				</Field>
				<Field label="Valor global das NFs" hint="Soma dos valores das notas">
					<Input readOnly value={formatBRL(totalNotas)} className="font-semibold bg-blue-50" />
				</Field>
				<Field label="Custo individual" hint="Gasto real deste equipamento">
					<Input readOnly value={formatBRL(totalIndividual)} className="font-semibold bg-green-50" />
				</Field>
			</div>

			{draft.tipo === 'corretiva' &&
      <Field label="Problema atestado" hint="Se nenhuma informação for inserida, o campo permanece em branco">
					<TextArea value={draft.problemaAtestado} onChange={(e) => onChange({ problemaAtestado: e.target.value })} placeholder="" />
				</Field>
      }

			<Field label={draft.tipo === 'preventiva' ? 'Serviços realizados' : 'Serviço executado / solução'}>
				<TextArea value={draft.solucao} onChange={(e) => onChange({ solucao: e.target.value })} placeholder="" />
			</Field>

			<div data-ev-id="ev_4fd93cb841" className="flex flex-col gap-3">
				<div data-ev-id="ev_e4df5d63b1" className="flex flex-row flex-wrap items-center justify-between gap-2">
					<div data-ev-id="ev_c777aac859" className="flex flex-col gap-0.5">
						<h3 data-ev-id="ev_91dfd4f5e2" className="text-sm font-bold text-gray-900">Prestadores e notas fiscais</h3>
						<p data-ev-id="ev_4d5f88250a" className="text-xs text-muted-foreground">
							Cada prestador está atrelado à nota fiscal. Informe o <strong data-ev-id="ev_7db84da6cd">valor global da NF</strong> e o <strong data-ev-id="ev_7aaa2d18c8">valor individual</strong> gasto com este equipamento.
						</p>
					</div>
					<Button type="button" variant="outline" onClick={() => onChange({ servicos: [...(draft.servicos ?? []), servicoVazio()] })}>
						<Plus size={16} /> Adicionar prestador / nota
					</Button>
				</div>

				{prestadores.length === 0 &&
        <p data-ev-id="ev_e0d455fe54" className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
						Nenhum prestador cadastrado ainda. Cadastre na aba “Terceirizado / Prestador” para vincular aqui.
					</p>
        }

				{(draft.servicos ?? []).map((s, i) =>
        <div data-ev-id="ev_2847e7462b" key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
						<div data-ev-id="ev_52276e32ac" className="flex flex-row items-center justify-between gap-2">
							<Badge tone="blue">
								<Link2 size={12} /> Serviço {i + 1}
							</Badge>
							<Button
              type="button"
              variant="ghost"
              className="px-2 text-destructive"
              onClick={() => onChange({ servicos: (draft.servicos ?? []).filter((x) => x.id !== s.id) })}>

								<Trash2 size={16} /> Remover
							</Button>
						</div>

						<div data-ev-id="ev_a62292f382" className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<Field label="Prestador de serviço / fornecedor">
								<Select value={s.prestadorId} onChange={(e) => setServico(s.id, { prestadorId: e.target.value })}>
									<option data-ev-id="ev_9c1a627579" value="">Selecione…</option>
									{prestadores.map((p) =>
                <option data-ev-id="ev_8a7efec386" key={p.id} value={p.id}>
											{p.nome}
											{p.documento ? ` — ${p.documento}` : ''}
										</option>
                )}
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
									{TIPOS_NOTA.map((t) =>
                <option data-ev-id="ev_b201b904ff" key={t} value={t}>
											{t}
										</option>
                )}
								</Select>
							</Field>
							<Field label="Valor global NF (R$)" hint="Valor total da nota">
								<Input
                value={s.notaValor}
                onChange={(e) => setServico(s.id, { notaValor: e.target.value })}
                placeholder="0,00"
                inputMode="decimal"
                className="bg-blue-50" />

							</Field>
							<Field label="Valor individual (R$)" hint="Gasto deste equip.">
								<Input
                value={s.valorIndividual}
                onChange={(e) => setServico(s.id, { valorIndividual: e.target.value })}
                placeholder="0,00"
                inputMode="decimal"
                className="bg-green-50" />

							</Field>
							<Field label="Data da NF">
								<Input type="date" value={s.notaData} onChange={(e) => setServico(s.id, { notaData: e.target.value })} />
							</Field>
						</div>
					</div>
        )}
			</div>

			<Field label="Observações da manutenção">
				<TextArea value={draft.observacoes} onChange={(e) => onChange({ observacoes: e.target.value })} placeholder="" />
			</Field>
		</div>);

}