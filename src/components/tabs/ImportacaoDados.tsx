import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload, UploadCloud } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useAcm } from '@/hooks/use-acm';
import { LOJAS } from '@/lib/constants';
import { downloadTextFile, hoje, novoId, parseCsv } from '@/lib/format';
import type { Equipamento, StatusEquipamento, StatusManutencao, TipoManutencao, PeriodicidadePreventiva, TipoNota } from '@/lib/types';

const CABECALHO = [
  'tipo_registro', 'loja', 'tag', 'local', 'marca', 'potencia', 'tipo_equipamento', 'modelo',
  'numero_serie', 'voltagem', 'gas_refrigerante', 'data_instalacao', 'data_desativacao', 'vida_util',
  'patrimonio', 'status', 'observacoes_equipamento',
  'manutencao_tipo', 'periodicidade_preventiva', 'manutencao_data', 'manutencao_status',
  'prestador', 'nota_numero', 'nota_tipo', 'nota_valor', 'valor_individual',
  'problema_atestado', 'solucao', 'observacoes_manutencao',
];

const LINHA_EXEMPLO_EQUIPAMENTO = [
  'equipamento', 'Cohama', 'EQ. 01', 'Sala do gerente', 'LG', '12000 BTUs', 'Split Hi-Wall', 'Dual Inverter',
  '812TAQK3F210', '220V', 'R-410A', '2022-03-15', '', '', '004512', 'Em operação', '',
  '', '', '', '', '', '', '', '', '', '', '', '',
];

const LINHA_EXEMPLO_MANUTENCAO = [
  'manutencao', 'Cohama', 'EQ. 01', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '',
  'preventiva', 'Trimestral', '2026-06-10', 'Concluída',
  'Refrigera Ar Ltda', '000123', 'DANFE', '250', '250',
  '', 'Higienização e troca de filtros', '',
];

function baixarModelo() {
  const linhas = [CABECALHO, LINHA_EXEMPLO_EQUIPAMENTO, LINHA_EXEMPLO_MANUTENCAO];
  const csv = linhas.map((l) => l.map((v) => (v.includes(',') ? `"${v}"` : v)).join(',')).join('\n');
  downloadTextFile('modelo-importacao-ar-condicionado.csv', csv);
}

function cnpjPorNomeLoja(nome: string): string | null {
  const alvo = nome.trim().toLowerCase();
  return LOJAS.find((l) => l.nome.trim().toLowerCase() === alvo)?.cnpj ?? null;
}

export default function ImportacaoDados() {
  const { equipamentos, addEquipamento, prestadores, addPrestador, addManutencao } = useAcm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState<{ equipamentos: number; manutencoes: number; erros: string[] } | null>(null);

  const processarArquivo = async (file: File) => {
    setProcessando(true);
    const erros: string[] = [];
    let totalEquip = 0;
    let totalMan = 0;

    try {
      const texto = await file.text();
      const linhas = parseCsv(texto);
      if (linhas.length < 2) {
        setResumo({ equipamentos: 0, manutencoes: 0, erros: ['Arquivo vazio ou sem linhas de dados.'] });
        setProcessando(false);
        return;
      }

      const header = linhas[0].map((h) => h.trim().toLowerCase());
      const idx = (nome: string) => header.indexOf(nome);
      const col = (linha: string[], nome: string) => (idx(nome) >= 0 ? (linha[idx(nome)] ?? '').trim() : '');

      // Mapa local tag+loja -> equipamentoId, começando com os já existentes
      const chave = (loja: string, tag: string) => `${loja}::${tag.trim().toLowerCase()}`;
      const mapaEquip = new Map<string, string>();
      (equipamentos ?? []).forEach((eq) => mapaEquip.set(chave(eq.lojaCnpj, eq.tag), eq.id));

      const linhasEquip = linhas.slice(1).filter((l) => col(l, 'tipo_registro').toLowerCase() === 'equipamento');
      const linhasMan = linhas.slice(1).filter((l) => col(l, 'tipo_registro').toLowerCase() === 'manutencao');

      // Passo 1: equipamentos
      linhasEquip.forEach((linha, i) => {
        const lojaNomeCsv = col(linha, 'loja');
        const cnpj = cnpjPorNomeLoja(lojaNomeCsv);
        const tag = col(linha, 'tag');
        if (!cnpj) return erros.push(`Linha equipamento ${i + 2}: loja "${lojaNomeCsv}" não encontrada.`);
        if (!tag) return erros.push(`Linha equipamento ${i + 2}: tag não informada.`);

        const statusCsv = col(linha, 'status');
        const status: StatusEquipamento = statusCsv === 'Desativada' ? 'Desativada' : 'Em operação';

        const novo: Omit<Equipamento, 'id' | 'criadoEm' | 'atualizadoEm'> = {
          lojaCnpj: cnpj,
          tag,
          local: col(linha, 'local'),
          marca: col(linha, 'marca'),
          potencia: col(linha, 'potencia'),
          tipoEquipamento: col(linha, 'tipo_equipamento'),
          modelo: col(linha, 'modelo'),
          numeroSerie: col(linha, 'numero_serie'),
          voltagem: col(linha, 'voltagem'),
          gasRefrigerante: col(linha, 'gas_refrigerante'),
          dataInstalacao: col(linha, 'data_instalacao'),
          dataDesativacao: col(linha, 'data_desativacao'),
          vidaUtil: col(linha, 'vida_util'),
          patrimonio: col(linha, 'patrimonio'),
          status,
          observacoes: col(linha, 'observacoes_equipamento'),
        };

        const criado = addEquipamento(novo);
        mapaEquip.set(chave(cnpj, tag), criado.id);
        totalEquip++;
      });

      // Passo 2: manutenções (referenciando equipamentos já existentes ou recém-criados)
      linhasMan.forEach((linha, i) => {
        const lojaNomeCsv = col(linha, 'loja');
        const cnpj = cnpjPorNomeLoja(lojaNomeCsv);
        const tag = col(linha, 'tag');
        if (!cnpj) return erros.push(`Linha manutenção ${i + 2}: loja "${lojaNomeCsv}" não encontrada.`);

        const equipamentoId = mapaEquip.get(chave(cnpj, tag));
        if (!equipamentoId) return erros.push(`Linha manutenção ${i + 2}: equipamento "${tag}" não encontrado em ${lojaNomeCsv}.`);

        const tipoCsv = col(linha, 'manutencao_tipo').toLowerCase();
        const tipo: TipoManutencao = tipoCsv === 'preventiva' ? 'preventiva' : 'corretiva';
        const periodicidadeCsv = col(linha, 'periodicidade_preventiva');
        const periodicidadePreventiva: PeriodicidadePreventiva | undefined =
          tipo === 'preventiva' ? (periodicidadeCsv === 'Semestral' ? 'Semestral' : 'Trimestral') : undefined;

        const nomePrestador = col(linha, 'prestador');
        let prestadorId = '';
        if (nomePrestador) {
          const existente = prestadores.find((p) => p.nome.trim().toLowerCase() === nomePrestador.trim().toLowerCase());
          if (existente) {
            prestadorId = existente.id;
          } else {
            const novoPrestador = addPrestador({
              nome: nomePrestador, razaoSocial: '', documento: '', tipoDocumento: '', contato: '', email: '', observacoes: '',
            });
            prestadorId = novoPrestador.id;
          }
        }

        const notaTipoCsv = col(linha, 'nota_tipo');
        const notaTipo: TipoNota | '' = notaTipoCsv === 'DANFE' || notaTipoCsv === 'NFSE' ? notaTipoCsv : '';
        const statusManCsv = col(linha, 'manutencao_status');
        const statusManutencao: StatusManutencao = (['Aberta', 'Em andamento', 'Concluída'] as StatusManutencao[]).includes(statusManCsv as StatusManutencao)
          ? (statusManCsv as StatusManutencao)
          : 'Concluída';

        addManutencao({
          equipamentoId,
          tipo,
          periodicidadePreventiva,
          data: col(linha, 'manutencao_data') || hoje(),
          problemaAtestado: col(linha, 'problema_atestado'),
          solucao: col(linha, 'solucao'),
          status: statusManutencao,
          observacoes: col(linha, 'observacoes_manutencao'),
          servicos: [{
            id: novoId(),
            prestadorId,
            descricao: col(linha, 'solucao'),
            notaNumero: col(linha, 'nota_numero'),
            notaTipo,
            notaValor: col(linha, 'nota_valor'),
            notaData: col(linha, 'manutencao_data') || hoje(),
            valorIndividual: col(linha, 'valor_individual'),
          }],
        });
        totalMan++;
      });
    } catch {
      erros.push('Não foi possível ler o arquivo. Verifique se é um CSV válido.');
    }

    setResumo({ equipamentos: totalEquip, manutencoes: totalMan, erros });
    setProcessando(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          icon={<UploadCloud size={18} />}
          title="Importação de Dados"
          subtitle="Use uma única planilha (CSV) para carregar equipamentos e o histórico de manutenções de uma vez." />

        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
            <p><strong>Como funciona:</strong> baixe o modelo, preencha uma linha por equipamento (tipo_registro = "equipamento") e uma linha por manutenção (tipo_registro = "manutencao"), depois envie o arquivo. Máquinas são associadas pela combinação Loja + Tag.</p>
          </div>

          <div className="flex flex-row flex-wrap gap-3">
            <Button variant="outline" onClick={baixarModelo}>
              <Download size={16} /> Baixar modelo CSV
            </Button>
            <Button onClick={() => inputRef.current?.click()} disabled={processando}>
              <Upload size={16} /> {processando ? 'Importando…' : 'Selecionar arquivo CSV'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processarArquivo(file);
                e.target.value = '';
              }} />
          </div>

          {resumo &&
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-row flex-wrap gap-2">
              <Badge tone="green"><CheckCircle2 size={12} /> {resumo.equipamentos} equipamento(s) importado(s)</Badge>
              <Badge tone="green"><CheckCircle2 size={12} /> {resumo.manutencoes} manutenção(ões) importada(s)</Badge>
              {resumo.erros.length > 0 && <Badge tone="red"><AlertTriangle size={12} /> {resumo.erros.length} erro(s)</Badge>}
            </div>
            {resumo.erros.length > 0 &&
            <ul className="list-disc pl-5 text-xs text-red-700">
              {resumo.erros.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
            }
          </div>
          }
        </div>
      </Card>
    </div>
  );
}
