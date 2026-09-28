import { useState } from 'react';
import { AirVent, Briefcase, FileSpreadsheet, History, LogOut, Shield, Snowflake, Wrench } from 'lucide-react';
import CadastroEquipamento from '@/components/tabs/CadastroEquipamento';
import CadastroPrestador from '@/components/tabs/CadastroPrestador';
import Historico from '@/components/tabs/Historico';
import ManutencaoCorretiva from '@/components/tabs/ManutencaoCorretiva';
import ManutencaoPreventiva from '@/components/tabs/ManutencaoPreventiva';
import ImportacaoDados from '@/components/tabs/ImportacaoDados';
import { useAcm } from '@/hooks/use-acm';
import { ehPreventiva } from '@/lib/drafts';

type TabId = 'equipamento' | 'prestador' | 'historico' | 'manutencao' | 'preventiva' | 'importacao';

const TABS: { id: TabId; label: string; icon: typeof AirVent }[] = [
  { id: 'equipamento', label: 'Cadastramento de equipamento', icon: AirVent },
  { id: 'prestador', label: 'Terceirizado / Prestador', icon: Briefcase },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'manutencao', label: 'Manutenções Corretivas', icon: Wrench },
  { id: 'preventiva', label: 'Manutenções Preventivas', icon: Shield },
  { id: 'importacao', label: 'Importação em Lote', icon: FileSpreadsheet },
];

export default function Index() {
  const { equipamentos, prestadores, manutencoes, cloudStatus, signOut } = useAcm();
  const [tab, setTab] = useState<TabId>('equipamento');
  const [lojaFoco, setLojaFoco] = useState('');
  const [equipFoco, setEquipFoco] = useState('');

  const corretivas = (manutencoes ?? []).filter((m) => !ehPreventiva(String(m.tipo))).length;
  const preventivas = (manutencoes ?? []).filter((m) => ehPreventiva(String(m.tipo))).length;

  return (
    <div data-ev-id="ev_acc56ab6e0" className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header data-ev-id="ev_7b50803e67" className="border-b border-border bg-white">
        <div data-ev-id="ev_e3f9b515de" className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div data-ev-id="ev_b33291e338" className="flex flex-row items-center gap-3">
            <div data-ev-id="ev_ade1184a24" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Snowflake size={22} />
            </div>
            <div data-ev-id="ev_26e656ce76" className="flex flex-col gap-0.5">
              <h1 data-ev-id="ev_e09a483198" className="text-xl font-bold text-gray-900">Sistema de Gestão de Ar-Condicionado</h1>
              <p data-ev-id="ev_23611153b1" className="text-sm text-muted-foreground">Controle de equipamentos, prestadores, histórico e manutenção por loja</p>
            </div>
          </div>
          <div data-ev-id="ev_6911c8e7ac" className="flex flex-row flex-wrap justify-center gap-3 text-center">
            <div data-ev-id="ev_fad1834363" className="flex flex-col rounded-lg bg-muted px-3 py-2">
              <span data-ev-id="ev_c02aa1919f" className="text-lg font-bold text-gray-900">{equipamentos.length}</span>
              <span data-ev-id="ev_209777f238" className="text-xs text-muted-foreground">Equipamentos</span>
            </div>
            <div data-ev-id="ev_a93f5b01a0" className="flex flex-col rounded-lg bg-muted px-3 py-2">
              <span data-ev-id="ev_4b20cad863" className="text-lg font-bold text-gray-900">{prestadores.length}</span>
              <span data-ev-id="ev_26077ef9af" className="text-xs text-muted-foreground">Prestadores</span>
            </div>
            <div data-ev-id="ev_55e030db3d" className="flex flex-col rounded-lg bg-amber-50 px-3 py-2">
              <span data-ev-id="ev_a2ebd3116c" className="text-lg font-bold text-amber-900 flex items-center gap-1"><Wrench size={14} /> {corretivas}</span>
              <span data-ev-id="ev_b75fb7c6f7" className="text-xs text-amber-700">Corretivas</span>
            </div>
            <div data-ev-id="ev_e2e36520da" className="flex flex-col rounded-lg bg-purple-50 px-3 py-2">
              <span data-ev-id="ev_de4d05cd2e" className="text-lg font-bold text-purple-900 flex items-center gap-1"><Shield size={14} /> {preventivas}</span>
              <span data-ev-id="ev_ea203a3e1a" className="text-xs text-purple-700">Preventivas</span>
            </div>
            {cloudStatus === 'ready' && (
              <button type="button" title="Sair da conta" aria-label="Sair da conta" onClick={() => void signOut()} className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-gray-600 hover:bg-muted">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <nav data-ev-id="ev_eac5b24836" className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur">
        <div data-ev-id="ev_840636359f" className="mx-auto flex w-full max-w-7xl flex-row gap-1 overflow-x-auto px-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const ativo = tab === t.id;
            return (
              <button
                data-ev-id="ev_1eceb2b956"
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex cursor-pointer flex-row items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  ativo ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main data-ev-id="ev_81dbc989ce" className="mx-auto w-full max-w-7xl px-4 py-6">
        {tab === 'equipamento' && (
          <CadastroEquipamento
            onCadastrado={(lojaCnpj, equipamentoId) => {
              setLojaFoco(lojaCnpj);
              setEquipFoco(equipamentoId);
              setTab('historico');
            }}
          />
        )}
        {tab === 'prestador' && <CadastroPrestador />}
        {tab === 'historico' && <Historico lojaInicial={lojaFoco} equipamentoInicial={equipFoco} />}
        {tab === 'manutencao' && <ManutencaoCorretiva />}
        {tab === 'preventiva' && <ManutencaoPreventiva lojaInicial={lojaFoco} />}
        {tab === 'importacao' && <ImportacaoDados />}
      </main>
    </div>
  );
}