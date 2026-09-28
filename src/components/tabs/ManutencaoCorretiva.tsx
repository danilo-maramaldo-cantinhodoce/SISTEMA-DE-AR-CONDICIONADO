import { useState } from 'react';
import { CheckCircle2, Plus, Save, Shield, Trash2, Wrench } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import ManutencaoForm from '@/components/ManutencaoForm';
import { manutencaoVazia, type ManutencaoDraft } from '@/lib/drafts';
import ManutencaoCard from '@/components/ManutencaoCard';
import { useAcm } from '@/hooks/use-acm';
import { formatBRL, novoId, toNumber } from '@/lib/format';
import { TIPOS_NOTA } from '@/lib/constants';
import type { ItemManutencaoNota, TipoManutencao, TipoManutencaoItem, TipoNota } from '@/lib/types';

const novaLinhaNota = (): ItemManutencaoNota => ({
  id: novoId(),
  equipamentoId: '',
  tipoManutencao: 'Corretiva',
  custoIndividual: '',
});

export default function ManutencaoCorretiva() {
  const { equipamentosDaLoja, addManutencao, addManutencaoEmLote, manutencoesDoEquipamento, prestadores, addNotaFiscalLote } = useAcm();
  const [loja, setLoja] = useState('');
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [tipoManutencao, setTipoManutencao] = useState<TipoManutencao>('corretiva');
  const [draft, setDraft] = useState<ManutencaoDraft>(manutencaoVazia('', 'corretiva'));
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [tipoNota, setTipoNota] = useState<TipoNota | ''>('DANFE');
  const [dataNota, setDataNota] = useState(new Date().toISOString().slice(0, 10));
  const [prestadorNota, setPrestadorNota] = useState('');
  const [itensNota, setItensNota] = useState<ItemManutencaoNota[]>([novaLinhaNota()]);
  const [sucessoNota, setSucessoNota] = useState('');
  const [erroNota, setErroNota] = useState('');

  const equipamentos = loja ? equipamentosDaLoja(loja) : [];
  const totalNota = itensNota.reduce((total, item) => total + toNumber(item.custoIndividual), 0);

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
      addManutencao({ ...draft, equipamentoId: equipamentoIds[0], tipo: tipoManutencao === 'preventiva' ? draft.tipo : tipoManutencao });
    } else {
      addManutencaoEmLote(equipamentoIds, { ...draft, tipo: tipoManutencao === 'preventiva' ? draft.tipo : tipoManutencao });
    }

    const tipoLabel = tipoManutencao === 'preventiva' ? 'Preventiva' : 'Corretiva';
    setDraft(manutencaoVazia('', tipoManutencao));
    setErro('');
    setOk(`Manutenção ${tipoLabel} registrada para ${equipamentoIds.length} equipamento(s).`);
    setEquipamentoIds([]);
  };

  const salvarNota = () => {
    if (!numeroNota.trim()) return setErroNota('Informe o número da nota fiscal.');
    if (!prestadorNota) return setErroNota('Selecione o prestador da nota fiscal.');
    if (itensNota.length === 0 || itensNota.some((item) => !item.equipamentoId || toNumber(item.custoIndividual) <= 0)) {
      return setErroNota('Cada linha precisa de uma máquina e um custo maior que zero.');
    }
    addNotaFiscalLote({
      id: novoId(),
      numero: numeroNota.trim(),
      tipo: tipoNota,
      prestadorId: prestadorNota,
      data: dataNota,
      valorTotal: totalNota,
      itens: itensNota,
    });
    setNumeroNota('');
    setPrestadorNota('');
    setItensNota([novaLinhaNota()]);
    setErro('');
    setErroNota('');
    setSucessoNota(`Nota ${numeroNota.trim()} registrada. Total: ${formatBRL(totalNota)}.`);
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

      <Card>
        <CardHeader
          icon={<Save size={18} />}
          title="Cadastrar nota fiscal por máquina"
          subtitle="Adicione uma linha para cada serviço. A mesma máquina pode aparecer mais de uma vez com tipos e custos diferentes."
        />
        <div className="flex flex-col gap-5 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Número da nota" required>
              <Input value={numeroNota} onChange={(event) => setNumeroNota(event.target.value)} />
            </Field>
            <Field label="Tipo de nota">
              <Select value={tipoNota} onChange={(event) => setTipoNota(event.target.value as TipoNota | '')}>
                {TIPOS_NOTA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </Select>
            </Field>
            <Field label="Prestador" required>
              <Select value={prestadorNota} onChange={(event) => setPrestadorNota(event.target.value)}>
                <option value="">Selecione...</option>
                {prestadores.map((prestador) => <option key={prestador.id} value={prestador.id}>{prestador.nome}</option>)}
              </Select>
            </Field>
            <Field label="Data da nota">
              <Input type="date" value={dataNota} onChange={(event) => setDataNota(event.target.value)} />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">Serviços e máquinas</h3>
              <Button type="button" variant="outline" onClick={() => setItensNota((items) => [...items, novaLinhaNota()])}>
                <Plus size={15} /> Adicionar máquina
              </Button>
            </div>
            {!loja && <p className="text-sm text-muted-foreground">Selecione a loja no formulário acima para listar as máquinas disponíveis.</p>}
            {itensNota.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_1fr_180px_auto]">
                <Field label={`Máquina ${index + 1}`} required>
                  <Select value={item.equipamentoId} onChange={(event) => setItensNota((items) => items.map((row) => row.id === item.id ? { ...row, equipamentoId: event.target.value } : row))}>
                    <option value="">Selecione...</option>
                    {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.tag} · {equipamento.local}</option>)}
                  </Select>
                </Field>
                <Field label="Tipo de manutenção" required>
                  <Select value={item.tipoManutencao} onChange={(event) => setItensNota((items) => items.map((row) => row.id === item.id ? { ...row, tipoManutencao: event.target.value as TipoManutencaoItem } : row))}>
                    <option value="Preventiva Semestral">Preventiva semestral</option>
                    <option value="Preventiva Trimestral">Preventiva trimestral</option>
                    <option value="Corretiva">Corretiva</option>
                  </Select>
                </Field>
                <Field label="Custo individual (R$)" required>
                  <Input inputMode="decimal" value={String(item.custoIndividual)} onChange={(event) => setItensNota((items) => items.map((row) => row.id === item.id ? { ...row, custoIndividual: event.target.value } : row))} placeholder="0,00" />
                </Field>
                <Button type="button" variant="ghost" className="text-red-600" disabled={itensNota.length === 1} onClick={() => setItensNota((items) => items.filter((row) => row.id !== item.id))} aria-label={`Remover máquina ${index + 1}`}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div><span className="text-sm text-muted-foreground">Total automático da nota</span><strong className="ml-3 text-lg">{formatBRL(totalNota)}</strong></div>
            <Button onClick={salvarNota}><Save size={16} /> Registrar nota fiscal</Button>
          </div>
          {erroNota && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroNota}</p>}
          {sucessoNota && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{sucessoNota}</p>}
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