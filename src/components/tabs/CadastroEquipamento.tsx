import { useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { AirVent, Save, RotateCcw, CheckCircle2, AlertCircle, ListFilter } from 'lucide-react';
import EquipamentoFields from '@/components/EquipamentoFields';
import { draftVazio, type EquipamentoDraft } from '@/lib/drafts';
import { useAcm } from '@/hooks/use-acm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
};

function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  const variantClass = variant === 'outline'
    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variantClass} ${className}`}
      {...props}
    />
  );
}

function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 p-5">
      <div className="text-blue-600">{icon}</div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function CadastroEquipamento({ onCadastrado }: { onCadastrado: (lojaCnpj: string, equipamentoId: string) => void; }) {
  const { addEquipamento, equipamentos = [] } = useAcm();
  const [draft, setDraft] = useState<EquipamentoDraft>(draftVazio());
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const patch = (p: Partial<EquipamentoDraft>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setErro('');
    setOk('');
  };

  const salvar = () => {
    if (!draft.lojaCnpj) return setErro('Selecione a loja.');
    if (!draft.tag.trim()) return setErro('Informe a tag do equipamento (ex.: EQ. 01).');
    if (!draft.local.trim()) return setErro('Informe o local do equipamento.');
    if (!draft.marca) return setErro('Selecione a marca.');
    if (!draft.potencia) return setErro('Selecione a potência (BTUs).');

    const novo = addEquipamento({ ...draft, tag: draft.tag.trim(), local: draft.local.trim() });
    setOk(`${novo.tag} cadastrado com sucesso e enviado para o Histórico.`);
    setDraft(draftVazio());
    onCadastrado(novo.lojaCnpj, novo.id);
  };

  // Filtra equipamentos para exibir na listagem (filtrando pela loja selecionada se houver)
  const equipamentosLoja = draft.lojaCnpj
    ? equipamentos.filter((eq) => eq.lojaCnpj === draft.lojaCnpj)
    : equipamentos;

  const isFormDesativado = draft.status === 'Desativada';

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <Card className={isFormDesativado ? 'border-red-400 ring-1 ring-red-400' : ''}>
        <CardHeader
          icon={<AirVent size={18} />}
          title="Cadastramento de equipamento"
          subtitle="Após salvar, o equipamento passa a constar na aba Histórico da loja selecionada."
        />

        <div data-ev-id="ev_9653e01f73" className="flex flex-col gap-5 p-5">
          <EquipamentoFields draft={draft} onChange={patch} />

          {erro ? (
            <p data-ev-id="ev_2e72def2fb" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {erro}
            </p>
          ) : null}

          {ok ? (
            <p data-ev-id="ev_b49b4be030" className="flex flex-row items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 size={16} /> {ok}
            </p>
          ) : null}

          <div data-ev-id="ev_7ed576e2e0" className="flex flex-row flex-wrap gap-3">
            <Button onClick={salvar}>
              <Save size={16} /> Cadastrar equipamento
            </Button>
            <Button variant="outline" onClick={() => setDraft(draftVazio())}>
              <RotateCcw size={16} /> Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela/Lista de Equipamentos Cadastrados */}
      {equipamentosLoja.length > 0 && (
        <Card>
          <CardHeader
            icon={<ListFilter size={18} />}
            title="Equipamentos Registrados"
            subtitle={draft.lojaCnpj ? "Exibindo equipamentos da loja selecionada" : "Exibindo todos os equipamentos"}
          />
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tag</th>
                    <th className="px-4 py-3">Local</th>
                    <th className="px-4 py-3">Marca / Potência</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Instalação</th>
                    <th className="px-4 py-3">Desativação / Vida Útil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {equipamentosLoja.map((eq) => {
                    const isDesativado = eq.status === 'Desativada';
                    return (
                      <tr
                        key={eq.id}
                        className={`transition-colors ${
                          isDesativado
                            ? 'border-l-4 border-l-red-500 bg-red-50/40 hover:bg-red-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{eq.tag}</td>
                        <td className="px-4 py-3">{eq.local}</td>
                        <td className="px-4 py-3">{eq.marca} - {eq.potencia}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isDesativado
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isDesativado && <AlertCircle size={12} />}
                            {eq.status || 'Em Operação'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{eq.dataInstalacao || '—'}</td>
                        <td className="px-4 py-3">
                          {isDesativado ? (
                            <div className="text-xs">
                              <div><strong className="text-red-700">Desativado:</strong> {eq.dataDesativacao || '—'}</div>
                              <div><strong className="text-slate-600">Vida útil:</strong> {eq.vidaUtil || '—'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}