import { AlertTriangle, Calendar, Shield, Snowflake } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { useAcm } from '@/hooks/use-acm';
import { lojaNome } from '@/lib/constants';
import { ultimaPreventiva, proximaPreventiva, preventivaAtrasada } from '@/lib/drafts';
import { formatData } from '@/lib/format';
import type { Equipamento } from '@/lib/types';

interface ItemPreventiva {
  eq: Equipamento;
  ultimaTipo: string;
  ultimaData: string;
  proximaTipo: string;
  proximaData: Date;
  atrasada: boolean;
}

/** Lista, por loja, os equipamentos com preventiva mapeada (prevista) para o mês atual. */
export default function ManutencaoPreventivas() {
  const { equipamentos, manutencoesDoEquipamento } = useAcm();

  const agora = new Date();

  const itens: ItemPreventiva[] = (equipamentos ?? [])
    .map((eq) => {
      const mans = manutencoesDoEquipamento(eq.id);
      const ultima = ultimaPreventiva(mans);
      const proxima = proximaPreventiva(mans);
      if (!ultima || !proxima) return null;
      return {
        eq,
        ultimaTipo: ultima.periodicidadePreventiva ?? 'Trimestral',
        ultimaData: ultima.data,
        proximaTipo: ultima.periodicidadePreventiva ?? 'Trimestral',
        proximaData: proxima,
        atrasada: preventivaAtrasada(mans),
      };
    })
    .filter((i): i is ItemPreventiva => i !== null && i.proximaData.getMonth() === agora.getMonth() && i.proximaData.getFullYear() === agora.getFullYear());

  const porLoja = new Map<string, ItemPreventiva[]>();
  itens.forEach((i) => {
    const lista = porLoja.get(i.eq.lojaCnpj) ?? [];
    lista.push(i);
    porLoja.set(i.eq.lojaCnpj, lista);
  });

  const lojas = [...porLoja.keys()].sort((a, b) => lojaNome(a).localeCompare(lojaNome(b), 'pt-BR'));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          icon={<Shield size={18} />}
          title="Manutenções Preventivas do Mês"
          subtitle="Lojas e equipamentos com manutenção preventiva prevista para o mês atual, com base na última preventiva registrada e na periodicidade escolhida." />
      </Card>

      {lojas.length === 0 &&
      <Card>
        <div className="p-5">
          <EmptyState
            icon={<Snowflake size={28} />}
            title="Nenhuma preventiva mapeada para este mês"
            description="Assim que uma manutenção preventiva for concluída, a próxima é calculada automaticamente com base na periodicidade escolhida." />
        </div>
      </Card>
      }

      {lojas.map((cnpj) => (
        <Card key={cnpj}>
          <CardHeader title={lojaNome(cnpj)} subtitle={cnpj} />
          <div className="flex flex-col gap-3 p-5">
            {porLoja.get(cnpj)!.map((i) => (
              <div key={i.eq.id} className={`flex flex-col gap-2 rounded-xl border px-4 py-3 ${i.atrasada ? 'border-red-300 bg-red-50' : 'border-border bg-white'}`}>
                <div className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">{i.eq.tag} · {i.eq.local}</span>
                  {i.atrasada && <Badge tone="red"><AlertTriangle size={12} /> Atrasada</Badge>}
                </div>
                <span className="text-sm text-gray-800">
                  <strong>ÚLTIMA MANUTENÇÃO PREVENTIVA:</strong> {i.ultimaTipo.toUpperCase()} | DATA: {formatData(i.ultimaData)}
                </span>
                <span className="text-sm text-gray-800">
                  <strong>PRÓXIMA MANUTENÇÃO PREVENTIVA:</strong> {i.proximaTipo.toUpperCase()} | DATA: {formatData(i.proximaData.toISOString())}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={12} /> Periodicidade: {i.proximaTipo}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
