import { useState } from 'react';
import { CheckCircle2, Save, Shield, Wrench } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import ManutencaoForm from '@/components/ManutencaoForm';
import { manutencaoVazia, type ManutencaoDraft } from '@/lib/drafts';
import ManutencaoCard from '@/components/ManutencaoCard';
import { useAcm } from '@/hooks/use-acm';
import type { TipoManutencao } from '@/lib/types';

export default function ManutencaoCorretiva() {
  const { equipamentosDaLoja, addManutencao, addManutencaoEmLote, manutencoesDoEquipamento } = useAcm();
  const [loja, setLoja] = useState('');
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [tipoManutencao, setTipoManutencao] = useState<TipoManutencao>('corretiva');
  const [draft, setDraft] = useState<ManutencaoDraft>(manutencaoVazia('', 'corretiva'));
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const equipamentos = loja ? equipamentosDaLoja(loja) : [];

  // Histórico do primeiro equipamento selecionado
  const historico = equipamentoIds.length === 1 ? manutencoesDoEquipamento(equipamentoIds[0]) : [];

  const toggleEquipamento = (id: string) => {
    setEquipamentoIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setOk('');
  };

  const selecionarTodos = () => {
    if (equipamentoIds.length === equipamentos.length) {
      setEquipamentoIds([]);
    } else {
      setEquipamentoIds(equipamentos.map((eq) => eq.id));
    }
    setOk('');
  };

  const salvar = () => {
    if (equipamentoIds.length === 0) return setErro('Selecione pelo menos um equipamento.');

    if (equipamentoIds.length === 1) {
      addManutencao({ ...draft, equipamentoId: equipamentoIds[0], tipo: tipoManutencao });
    } else {
      addManutencaoEmLote(equipamentoIds, { ...draft, tipo: tipoManutencao });
    }

    const tipoLabel = tipoManutencao === 'preventiva' ? 'Preventiva' : 'Corretiva';
    setDraft(manutencaoVazia('', tipoManutencao));
    setErro('');
    setOk(`Manutenção ${tipoLabel} registrada para ${equipamentoIds.length} equipamento(s).`);
    setEquipamentoIds([]);
  };

  return (
    <div data-ev-id="ev_7677126cfd" className="flex flex-col gap-5">
			<Card>
				<CardHeader
          icon={tipoManutencao === 'preventiva' ? <Shield size={18} /> : <Wrench size={18} />}
          title={`Manutenção ${tipoManutencao === 'preventiva' ? 'Preventiva' : 'Corretiva'}`}
          subtitle="Selecione um ou mais equipamentos para registrar a mesma manutenção em lote. Informe o valor individual gasto com cada equipamento." />

				<div data-ev-id="ev_07bb9e423a" className="flex flex-col gap-5 p-5">
					{/* Tipo de manutenção */}
					<div data-ev-id="ev_5f03d2ac32" className="flex flex-row gap-2">
						<Button
              variant={tipoManutencao === 'corretiva' ? 'primary' : 'outline'}
              onClick={() => {setTipoManutencao('corretiva');setDraft(manutencaoVazia('', 'corretiva'));}}>

							<Wrench size={16} /> Corretiva
						</Button>
						<Button
              variant={tipoManutencao === 'preventiva' ? 'primary' : 'outline'}
              onClick={() => {setTipoManutencao('preventiva');setDraft(manutencaoVazia('', 'preventiva'));}}>

							<Shield size={16} /> Preventiva
						</Button>
					</div>

					<div data-ev-id="ev_a05a5a2b88" className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<LojaSelect
              value={loja}
              onChange={(cnpj) => {
                setLoja(cnpj);
                setEquipamentoIds([]);
                setOk('');
              }}
              required />

					</div>

					{/* Seleção de equipamentos */}
					{loja &&
          <div data-ev-id="ev_afde929c5f" className="flex flex-col gap-3">
							<div data-ev-id="ev_cce9d9e806" className="flex flex-row flex-wrap items-center justify-between gap-2">
								<div data-ev-id="ev_6dfdd719ba" className="flex flex-col gap-0.5">
									<span data-ev-id="ev_ef550c8e41" className="text-xs font-semibold uppercase tracking-wide text-gray-600">Equipamentos *</span>
									<span data-ev-id="ev_b5e3b17266" className="text-xs text-muted-foreground">
										{equipamentoIds.length === 0 ?
                  'Selecione os equipamentos para esta manutenção' :
                  `${equipamentoIds.length} equipamento(s) selecionado(s)`
                  }
									</span>
								</div>
								<Button variant="outline" onClick={selecionarTodos}>
									{equipamentoIds.length === equipamentos.length ? 'Desmarcar todos' : 'Selecionar todos'}
								</Button>
							</div>

							{equipamentos.length === 0 ?
            <p data-ev-id="ev_4d5a92c8e3" className="text-sm text-muted-foreground">Nenhum equipamento cadastrado nesta loja.</p> :

            <div data-ev-id="ev_a32e2e8748" className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
									{equipamentos.map((eq) => {
                const selecionado = equipamentoIds.includes(eq.id);
                return (
                  <button data-ev-id="ev_54c17a73ad"
                  key={eq.id}
                  type="button"
                  onClick={() => toggleEquipamento(eq.id)}
                  className={`flex cursor-pointer flex-row items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition ${
                  selecionado ?
                  'border-primary bg-primary/10' :
                  'border-border bg-white hover:bg-muted/60'}`
                  }>

												<div data-ev-id="ev_5666120346" className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    selecionado ? 'border-primary bg-primary text-white' : 'border-gray-300'}`
                    }>
													{selecionado && <CheckCircle2 size={14} />}
												</div>
												<div data-ev-id="ev_2805d2af38" className="flex flex-col gap-0">
													<span data-ev-id="ev_45430a98d0" className="text-sm font-semibold text-gray-900">{eq.tag}</span>
													<span data-ev-id="ev_39d1f2323d" className="text-xs text-muted-foreground">
														{eq.local} · {eq.marca} {eq.potencia}
													</span>
												</div>
											</button>);

              })}
								</div>
            }
						</div>
          }

					{equipamentoIds.length > 1 &&
          <div data-ev-id="ev_23d1ad50f7" className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
							<p data-ev-id="ev_9be527f4e1" className="text-sm text-blue-800">
								<strong data-ev-id="ev_7217559299">Manutenção em lote:</strong> A mesma NF e serviço serão atrelados a {equipamentoIds.length} equipamentos. 
								Informe o <strong data-ev-id="ev_8bbf49ec6b">valor individual</strong> referente ao gasto real de cada máquina (ex: 60.000 BTUs = R$ 400, 9.000 BTUs = R$ 200).
							</p>
						</div>
          }

					<div data-ev-id="ev_255a82b14c" className="h-px bg-border" />

					<ManutencaoForm draft={{ ...draft, tipo: tipoManutencao }} onChange={(p) => setDraft((prev) => ({ ...prev, ...p }))} />

					{erro && <p data-ev-id="ev_3856fa9d65" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}
					{ok &&
          <p data-ev-id="ev_4329ab2c7d" className="flex flex-row items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
							<CheckCircle2 size={16} /> {ok}
						</p>
          }

					<div data-ev-id="ev_8bec69e869">
						<Button onClick={salvar}>
							<Save size={16} /> Registrar manutenção {equipamentoIds.length > 1 ? `(${equipamentoIds.length} equip.)` : ''}
						</Button>
					</div>
				</div>
			</Card>

			{equipamentoIds.length === 1 && historico.length > 0 &&
      <Card>
					<CardHeader title="Manutenções deste equipamento" subtitle={`${historico.length} registro(s) — editáveis a qualquer momento`} />
					<div data-ev-id="ev_d49d31a10a" className="flex flex-col gap-3 p-5">
						{historico.map((m) => <ManutencaoCard key={m.id} manutencao={{ ...m, tipo: m.tipo || 'corretiva' }} />)}
					</div>
				</Card>
      }
		</div>);

}