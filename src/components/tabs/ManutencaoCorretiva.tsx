import { useState } from 'react';
import { CheckCircle2, Save, Shield, Wrench } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Select, TextArea } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import { useAcm } from '@/hooks/use-acm';
import { formatBRL, hoje, novoId, toNumber } from '@/lib/format';
import { TIPOS_MANUTENCAO_ITEM } from '@/lib/constants';

type Categoria = 'preventiva' | 'corretiva';

export default function ManutencaoCorretiva() {
  const { equipamentosDaLoja, manutencoesDaLoja, addManutencao, prestadores } = useAcm();
  const [categoria, setCategoria] = useState<Categoria>('corretiva');
  const [lojaCnpj, setLojaCnpj] = useState('');
  const [data, setData] = useState(hoje());
  const [tipoPreventiva, setTipoPreventiva] = useState<'Preventiva Trimestral' | 'Preventiva Semestral'>('Preventiva Trimestral');
  const [numeroNota, setNumeroNota] = useState('');
  const [valorGlobal, setValorGlobal] = useState('');
  const [valorEquipamento, setValorEquipamento] = useState('');
  const [equipamentoId, setEquipamentoId] = useState('');
  const [prestadorId, setPrestadorId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const equipamentos = lojaCnpj ? equipamentosDaLoja(lojaCnpj) : [];
  const registros = lojaCnpj ? manutencoesDaLoja(lojaCnpj) : [];
  const preventivas = registros.filter((m) => String(m.tipo).toLowerCase().includes('preventiva'));
  const corretivas = registros.filter((m) => !String(m.tipo).toLowerCase().includes('preventiva'));

  const mudarCategoria = (novaCategoria: Categoria) => {
    setCategoria(novaCategoria);
    setErro('');
    setSucesso('');
  };

  const salvar = () => {
    setErro('');
    setSucesso('');
    if (!lojaCnpj) return setErro('Selecione a loja.');
    if (!data) return setErro('Informe a data da manutenção.');
    if (!numeroNota.trim()) return setErro('Informe o número da nota fiscal.');
    if (!prestadorId) return setErro('Selecione o prestador de serviço.');
    if (toNumber(valorGlobal) <= 0) return setErro('Informe um valor global maior que zero.');
    if (categoria === 'corretiva' && (!equipamentoId || toNumber(valorEquipamento) <= 0)) {
      return setErro('Selecione a máquina e informe seu valor individual.');
    }

    const preventiva = categoria === 'preventiva';
    addManutencao({
      equipamentoId: preventiva ? '' : equipamentoId,
      lojaCnpj,
      tipo: preventiva ? tipoPreventiva : 'Corretiva',
      data,
      problemaAtestado: '',
      solucao: observacoes.trim().toLocaleUpperCase('pt-BR'),
      status: 'Concluída',
      servicos: [{
        id: novoId(),
        prestadorId,
        descricao: observacoes.trim().toLocaleUpperCase('pt-BR'),
        notaNumero: numeroNota.trim().toLocaleUpperCase('pt-BR'),
        notaTipo: '',
        notaValor: valorGlobal,
        notaData: data,
        valorIndividual: preventiva ? valorGlobal : valorEquipamento,
      }],
      custo: preventiva ? toNumber(valorGlobal) : toNumber(valorEquipamento),
      valorGlobal: toNumber(valorGlobal),
      valorEquipamento: preventiva ? undefined : toNumber(valorEquipamento),
      numeroNota: numeroNota.trim().toLocaleUpperCase('pt-BR'),
      prestadorId,
      observacoes: observacoes.trim().toLocaleUpperCase('pt-BR'),
    });
    setSucesso(`${preventiva ? 'Preventiva' : 'Corretiva'} registrada com sucesso (${formatBRL(toNumber(valorGlobal))} global).`);
    setNumeroNota('');
    setValorGlobal('');
    setValorEquipamento('');
    setEquipamentoId('');
    setObservacoes('');
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<Wrench size={18} />}
          title="Manutenções Corretiva/Preventivas"
          subtitle="Cadastre preventivas para a loja inteira ou corretivas para uma máquina específica."
        />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <Button variant={categoria === 'preventiva' ? 'primary' : 'outline'} onClick={() => mudarCategoria('preventiva')}>
              <Shield size={16} /> Cadastro de preventiva
            </Button>
            <Button variant={categoria === 'corretiva' ? 'primary' : 'outline'} onClick={() => mudarCategoria('corretiva')}>
              <Wrench size={16} /> Cadastro de corretiva
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <LojaSelect value={lojaCnpj} onChange={(value) => { setLojaCnpj(value); setEquipamentoId(''); }} required />
            <Field label="Data" required>
              <Input type="date" value={data} onChange={(event) => setData(event.target.value)} />
            </Field>
            {categoria === 'preventiva' ? (
              <Field label="Tipo" required>
                <Select value={tipoPreventiva} onChange={(event) => setTipoPreventiva(event.target.value as typeof tipoPreventiva)}>
                  {TIPOS_MANUTENCAO_ITEM.filter((tipo) => tipo !== 'Corretiva').map((tipo) => <option key={tipo}>{tipo}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Máquina" required>
                <Select value={equipamentoId} onChange={(event) => setEquipamentoId(event.target.value)}>
                  <option value="">Selecione a máquina…</option>
                  {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.tag} · {equipamento.local}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Número da NF" required>
              <Input value={numeroNota} onChange={(event) => setNumeroNota(event.target.value)} />
            </Field>
            <Field label="Valor global da NF (R$)" required>
              <Input inputMode="decimal" value={valorGlobal} onChange={(event) => setValorGlobal(event.target.value)} placeholder="0,00" />
            </Field>
            {categoria === 'corretiva' && (
              <Field label="Valor desta máquina (R$)" required>
                <Input inputMode="decimal" value={valorEquipamento} onChange={(event) => setValorEquipamento(event.target.value)} placeholder="0,00" />
              </Field>
            )}
            <Field label="Prestador de serviço" required>
              <Select value={prestadorId} onChange={(event) => setPrestadorId(event.target.value)}>
                <option value="">Selecione o prestador…</option>
                {prestadores.map((prestador) => <option key={prestador.id} value={prestador.id}>{prestador.nome}</option>)}
              </Select>
            </Field>
            <Field label="Observação" className="md:col-span-2">
              <TextArea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Descreva o serviço realizado…" />
            </Field>
          </div>
          {categoria === 'preventiva' && <p className="text-sm text-muted-foreground">A preventiva será registrada uma única vez para todas as máquinas da loja selecionada.</p>}
          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {sucesso && <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={16} />{sucesso}</p>}
          <Button onClick={salvar}><Save size={16} /> Registrar {categoria}</Button>
        </div>
      </Card>

      {lojaCnpj && (
        <Card>
          <CardHeader title={`Manutenções registradas · ${categoria === 'preventiva' ? 'Preventivas' : 'Corretivas'}`} subtitle={categoria === 'preventiva' ? `${preventivas.length} registro(s) para a loja` : `${corretivas.length} registro(s) para a loja`} />
          <div className="p-5 text-sm text-muted-foreground">
            {categoria === 'preventiva'
              ? (preventivas.length ? preventivas.map((m) => <p key={m.id} className="border-b border-border py-2">{m.data} · {m.tipo} · NF {m.numeroNota || '—'} · {formatBRL(toNumber(m.valorGlobal ?? m.custo))}</p>) : 'Nenhuma preventiva cadastrada nesta loja.')
              : (corretivas.length ? corretivas.map((m) => {
                const equipamento = equipamentos.find((item) => item.id === m.equipamentoId);
                return <p key={m.id} className="border-b border-border py-2">{m.data} · {equipamento?.tag ?? 'MÁQUINA'} · NF {m.numeroNota || m.servicos?.[0]?.notaNumero || '—'} · {formatBRL(toNumber(m.valorEquipamento ?? m.custo))}</p>;
              }) : 'Nenhuma corretiva cadastrada nesta loja.')}
          </div>
        </Card>
      )}
    </div>
  );
}
