import { useState } from 'react';
import { FileText, Pencil, Save, Trash2, X, Wrench, Shield, Calendar } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { statusTone } from '@/lib/ui-helpers';
import ManutencaoForm from '@/components/ManutencaoForm';
import { totalNotasManutencao, totalIndividualManutencao, labelTipoManutencao, type ManutencaoDraft } from '@/lib/drafts';
import { useAcm } from '@/hooks/use-acm';
import { formatBRL, formatData, toNumber } from '@/lib/format';
import type { Manutencao } from '@/lib/types';

/** Card de uma manutenção, com edição completa in-place. */
export default function ManutencaoCard({ manutencao }: {manutencao: Manutencao;}) {
  const { updateManutencao, removeManutencao, prestadorNome } = useAcm();
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<ManutencaoDraft>(manutencao);

  const iniciarEdicao = () => {
    setDraft({ ...manutencao, servicos: [...(manutencao.servicos ?? [])] });
    setEditando(true);
  };

  const salvar = () => {
    updateManutencao(manutencao.id, draft);
    setEditando(false);
  };

  const tipoIcon = manutencao.tipo === 'preventiva' ? <Shield size={12} /> : <Wrench size={12} />;
  const tipoLabel = labelTipoManutencao(manutencao);
  const tipoTone = manutencao.tipo === 'preventiva' ? 'purple' : 'neutral';

  if (editando) {
    return (
      <div data-ev-id="ev_73835cabc9" className="flex flex-col gap-4 rounded-xl border-2 border-primary/40 bg-white p-4">
				<div data-ev-id="ev_69f9479988" className="flex flex-row items-center justify-between gap-2">
					<Badge tone="purple">
						<Pencil size={12} /> Editando manutenção de {formatData(manutencao.data)}
					</Badge>
				</div>
				<ManutencaoForm draft={draft} onChange={(p) => setDraft((prev) => ({ ...prev, ...p }))} />
				<div data-ev-id="ev_6133467d16" className="flex flex-row flex-wrap gap-2">
					<Button onClick={salvar}>
						<Save size={16} /> Salvar alterações
					</Button>
					<Button variant="outline" onClick={() => setEditando(false)}>
						<X size={16} /> Cancelar
					</Button>
				</div>
			</div>);

  }

  return (
    <div data-ev-id="ev_651a82c99c" className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4">
			<div data-ev-id="ev_91f2959a61" className="flex flex-row flex-wrap items-center justify-between gap-2">
				<div data-ev-id="ev_4d67aff427" className="flex flex-row flex-wrap items-center gap-2">
					<Badge tone={tipoTone as 'neutral' | 'purple'}>
						{tipoIcon} {tipoLabel} · {formatData(manutencao.data)}
					</Badge>
					<Badge tone={statusTone(manutencao.status)}>{manutencao.status}</Badge>
					<Badge tone="green">Individual: {formatBRL(totalIndividualManutencao(manutencao.servicos))}</Badge>
					{totalNotasManutencao(manutencao.servicos) !== totalIndividualManutencao(manutencao.servicos) &&
          <Badge tone="blue">NF Global: {formatBRL(totalNotasManutencao(manutencao.servicos))}</Badge>
          }
				</div>
				<div data-ev-id="ev_b3c5b31e23" className="flex flex-row gap-1">
					<Button variant="ghost" className="px-2" onClick={iniciarEdicao}>
						<Pencil size={15} /> Editar
					</Button>
					<Button variant="ghost" className="px-2 text-destructive" onClick={() => removeManutencao(manutencao.id)}>
						<Trash2 size={15} />
					</Button>
				</div>
			</div>

			<div data-ev-id="ev_8d97a34fb3" className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{manutencao.tipo === 'corretiva' && manutencao.problemaAtestado &&
        <div data-ev-id="ev_902088b61c" className="flex flex-col gap-1">
						<span data-ev-id="ev_78a9997095" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Problema atestado</span>
						<p data-ev-id="ev_1876861a80" className="whitespace-pre-wrap text-sm text-gray-800">{manutencao.problemaAtestado}</p>
					</div>
        }
				{manutencao.solucao &&
        <div data-ev-id="ev_3a0572a362" className="flex flex-col gap-1">
						<span data-ev-id="ev_c29b685136" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{manutencao.tipo === 'preventiva' ? 'Serviços realizados' : 'Serviço executado / solução'}
						</span>
						<p data-ev-id="ev_192421d077" className="whitespace-pre-wrap text-sm text-gray-800">{manutencao.solucao}</p>
					</div>
        }
			</div>

			{(manutencao.servicos ?? []).length > 0 &&
      <div data-ev-id="ev_28e5683337" className="flex flex-col gap-2">
					<span data-ev-id="ev_bb878b03dc" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prestadores e notas fiscais</span>
					<div data-ev-id="ev_5326371482" className="flex flex-col gap-2">
						{(manutencao.servicos ?? []).map((s) =>
          <div data-ev-id="ev_e4242206f8" key={s.id} className="flex flex-row flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
								<div data-ev-id="ev_4f16cd0c0f" className="flex flex-col gap-0.5">
									<span data-ev-id="ev_5cee3a4847" className="text-sm font-semibold text-gray-900">{s.prestadorId ? prestadorNome(s.prestadorId) : 'Prestador não informado'}</span>
									<span data-ev-id="ev_ec7ddfb370" className="text-xs text-muted-foreground">{s.descricao || '—'}</span>
								</div>
								<div data-ev-id="ev_734275b4ae" className="flex flex-row flex-wrap items-center gap-2 text-xs">
									<Badge tone="blue">
										<FileText size={12} /> {s.notaTipo || 'NF'} {s.notaNumero || '—'}
									</Badge>
									<span data-ev-id="ev_2ce2809c8c" className="font-semibold text-green-700">Indiv.: {formatBRL(toNumber(s.valorIndividual))}</span>
									{toNumber(s.notaValor) !== toNumber(s.valorIndividual) &&
              <span data-ev-id="ev_0bc4d07947" className="text-blue-700">NF: {formatBRL(toNumber(s.notaValor))}</span>
              }
									{s.notaData && <span data-ev-id="ev_503187924c" className="text-muted-foreground"><Calendar size={12} className="inline" /> {formatData(s.notaData)}</span>}
								</div>
							</div>
          )}
					</div>
				</div>
      }

			{manutencao.observacoes && <p data-ev-id="ev_79d47b7ad1" className="whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm text-gray-700">{manutencao.observacoes}</p>}
		</div>);

}