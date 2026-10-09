import { Calendar, Shield } from 'lucide-react';
import { Card, CardHeader, EmptyState } from '@/components/ui';
import { useAcm } from '@/hooks/use-acm';
import { LOJAS } from '@/lib/constants';
import { cronogramaPreventiva, ehPreventiva } from '@/lib/drafts';
import { formatData } from '@/lib/format';

function tipoLegivel(tipo: string): string {
  return String(tipo).replace(/^preventiva\s*/i, '').toUpperCase();
}

export default function ManutencaoPreventiva() {
  const { manutencoesDaLoja } = useAcm();
  const hoje = new Date();
  const agenda = LOJAS.map((loja) => {
    const preventivas = manutencoesDaLoja(loja.cnpj).filter((manutencao) => ehPreventiva(String(manutencao.tipo)));
    const cronograma = cronogramaPreventiva(preventivas);
    return { loja, cronograma };
  });
  const vencimentosDoMes = agenda.filter(({ cronograma }) => cronograma
    && cronograma.dataProxima.getFullYear() === hoje.getFullYear()
    && cronograma.dataProxima.getMonth() === hoje.getMonth());

  const renderResumo = (cronograma: ReturnType<typeof cronogramaPreventiva>) => {
    if (!cronograma) return <span className="text-sm text-muted-foreground">Ainda não há preventiva cadastrada.</span>;
    return (
      <>
        <span className="block text-sm text-gray-700">
          ÚLTIMA MANUTENÇÃO PREVENTIVA: {tipoLegivel(String(cronograma.ultima.tipo))} · DATA: {formatData(cronograma.ultima.data)}
        </span>
        <span className="mt-1 block text-sm font-semibold text-gray-900">
          PRÓXIMA MANUTENÇÃO PREVENTIVA: {tipoLegivel(cronograma.tipoProxima)} · DATA: {formatData(cronograma.dataProxima.toISOString())}
        </span>
      </>
    );
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<Calendar size={18} />}
          title="Cronograma de manutenção"
          subtitle="Preventivas registradas por loja, em ciclos de três meses alternando entre trimestral e semestral."
        />
        <div className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Shield size={16} />Vencimentos deste mês</h3>
          {vencimentosDoMes.length === 0 ? (
            <EmptyState title="Nenhuma preventiva vence neste mês" description="As datas são calculadas a partir do último cadastro de preventiva em cada loja." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {vencimentosDoMes.map(({ loja, cronograma }) => (
                <div key={loja.cnpj} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <strong className="mb-2 block text-sm text-gray-900">{loja.nome}</strong>
                  {renderResumo(cronograma)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Shield size={18} />} title="Cronograma por loja" subtitle="A última manutenção e a próxima previsão são obtidas do cadastro de preventivas." />
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr><th className="py-3 pr-4">Loja</th><th className="py-3 pr-4">Última manutenção</th><th className="py-3">Próxima manutenção</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agenda.map(({ loja, cronograma }) => (
                <tr key={loja.cnpj}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{loja.nome}</td>
                  <td className="py-3 pr-4">
                    {cronograma
                      ? `${tipoLegivel(String(cronograma.ultima.tipo))} · ${formatData(cronograma.ultima.data)}`
                      : 'SEM REGISTRO'}
                  </td>
                  <td className="py-3">
                    {cronograma
                      ? `${tipoLegivel(cronograma.tipoProxima)} · ${formatData(cronograma.dataProxima.toISOString())}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
