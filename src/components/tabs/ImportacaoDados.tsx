import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  RefreshCw,
  Table,
  Trash2,
  HelpCircle,
  Check,
  Building2
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { useAcm } from '@/hooks/use-acm';
import { LOJAS_LISTA, lojaNome } from '@/lib/constants';
import type { EquipamentoDraft, StatusEquipamento, TipoEquipamento, Voltagem } from '@/lib/drafts';

interface LinhaImportacao {
  idTemp: string;
  draft: EquipamentoDraft;
  erros: string[];
  valido: boolean;
}

export default function ImportacaoDados() {
  const { addEquipamento } = useAcm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [linhas, setLinhas] = useState<LinhaImportacao[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [importadoSucesso, setImportadoSucesso] = useState<number | null>(null);

  // 1. Download do Modelo CSV
  const baixarModeloCSV = () => {
    const cabecalhos = [
      'lojaCnpj',
      'tag',
      'local',
      'marca',
      'potencia',
      'tipoEquipamento',
      'modelo',
      'numeroSerie',
      'patrimonio',
      'voltagem',
      'gasRefrigerante',
      'dataInstalacao',
      'status',
      'observacoes'
    ];

    const exemplo1 = [
      LOJAS_LISTA[0]?.cnpj || '00000000000000',
      'AC-01',
      'Atendimento / Caixa',
      'Elgin',
      '18000 BTU',
      'Hi-Wall',
      'Eco Logic',
      'SN123456789',
      'PAT-9988',
      '220V',
      'R-410A',
      '2024-01-15',
      'Ativo',
      'Equipamento em bom estado'
    ];

    const exemplo2 = [
      LOJAS_LISTA[1]?.cnpj || '11111111111111',
      'AC-02',
      'Depósito',
      'Midea',
      '36000 BTU',
      'Piso Teto',
      'Liva',
      'SN987654321',
      'PAT-9989',
      '220V',
      'R-32',
      '2023-08-10',
      'Ativo',
      'Manutenção preventiva em dia'
    ];

    const conteudoCSV =
      '\uFEFF' + // UTF-8 BOM para abrir corretamente no Excel
      [cabecalhos.join(';'), exemplo1.join(';'), exemplo2.join(';')].join('\n');

    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_equipamentos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 2. Processamento e Validação do CSV/JSON
  const validarEConverterLinha = (dado: Record<string, string>, index: number): LinhaImportacao => {
    const erros: string[] = [];

    const lojaCnpj = (dado.lojaCnpj || dado.cnpj || '').trim();
    const tag = (dado.tag || dado.TAG || '').trim();
    const local = (dado.local || dado.Local || '').trim();
    const marca = (dado.marca || dado.Marca || '').trim();
    const potencia = (dado.potencia || dado.Potencia || dado.potência || '').trim();

    if (!lojaCnpj) erros.push('CNPJ da Loja é obrigatório.');
    if (!tag) erros.push('TAG do equipamento é obrigatória.');
    if (!local) erros.push('Localização é obrigatória.');

    const statusValidos: StatusEquipamento[] = ['Ativo', 'Inativo', 'Em Manutenção', 'Descartado'];
    const statusInformado = (dado.status || 'Ativo').trim() as StatusEquipamento;
    const status: StatusEquipamento = statusValidos.includes(statusInformado) ? statusInformado : 'Ativo';

    const draft: EquipamentoDraft = {
      lojaCnpj,
      tag,
      local,
      marca,
      potencia,
      tipoEquipamento: (dado.tipoEquipamento || dado.tipo || '') as TipoEquipamento,
      modelo: dado.modelo || '',
      numeroSerie: dado.numeroSerie || dado.serie || '',
      patrimonio: dado.patrimonio || '',
      voltagem: (dado.voltagem || '220V') as Voltagem,
      gasRefrigerante: dado.gasRefrigerante || dado.gas || '',
      dataInstalacao: dado.dataInstalacao || '',
      status,
      observacoes: dado.observacoes || ''
    };

    return {
      idTemp: `row-${index}-${Date.now()}`,
      draft,
      erros,
      valido: erros.length === 0
    };
  };

  const processarTextoCSV = (texto: string) => {
    const linhasTexto = texto.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (linhasTexto.length < 2) {
      alert('O arquivo selecionado está vazio ou não possui cabeçalhos válidos.');
      return;
    }

    // Detecta separador (; ou ,)
    const primeiraLinha = linhasTexto[0];
    const separador = primeiraLinha.includes(';') ? ';' : ',';

    const cabecalhos = primeiraLinha.split(separador).map((c) => c.trim().replace(/^"|"$/g, ''));

    const resultado: LinhaImportacao[] = [];

    for (let i = 1; i < linhasTexto.length; i++) {
      const valores = linhasTexto[i].split(separador).map((v) => v.trim().replace(/^"|"$/g, ''));
      if (valores.length <= 1 && !valores[0]) continue;

      const objetoLinha: Record<string, string> = {};
      cabecalhos.forEach((col, idx) => {
        objetoLinha[col] = valores[idx] || '';
      });

      resultado.push(validarEConverterLinha(objetoLinha, i));
    }

    setLinhas(resultado);
    setImportadoSucesso(null);
  };

  const processarArquivo = (file: File) => {
    setNomeArquivo(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (Array.isArray(json)) {
            const parsed = json.map((obj, idx) => validarEConverterLinha(obj, idx));
            setLinhas(parsed);
            setImportadoSucesso(null);
          } else {
            alert('O JSON deve conter um array de objetos de equipamentos.');
          }
        } catch {
          alert('Erro ao ler arquivo JSON. Verifique a formatação.');
        }
      };
      reader.readAsText(file);
    } else {
      // Trata CSV / TXT
      reader.onload = (e) => {
        const conteudo = e.target?.result as string;
        processarTextoCSV(conteudo);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processarArquivo(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processarArquivo(e.dataTransfer.files[0]);
    }
  };

  const removerLinha = (idTemp: string) => {
    setLinhas((prev) => prev.filter((l) => l.idTemp !== idTemp));
  };

  // 3. Execução da Importação em Lote
  const confirmarImportacao = () => {
    const validos = linhas.filter((l) => l.valido);
    if (validos.length === 0) return;

    validos.forEach((item) => {
      addEquipamento(item.draft);
    });

    setImportadoSucesso(validos.length);
    setLinhas([]);
    setNomeArquivo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalValidos = linhas.filter((l) => l.valido).length;
  const totalErros = linhas.filter((l) => !l.valido).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Informações e Modelo */}
      <Card>
        <CardHeader
          icon={<FileSpreadsheet className="text-emerald-600" size={18} />}
          title="Importação em Lote de Equipamentos"
          subtitle="Cadastre múltiplos ar-condicionados de uma só vez utilizando uma planilha de modelo padrão (CSV)."
          action={
            <Button variant="outline" className="text-xs gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={baixarModeloCSV}>
              <Download size={14} /> Baixar Planilha Modelo (CSV)
            </Button>
          }
        />
        <div className="p-5">
          <div className="flex flex-col md:flex-row items-start gap-4 rounded-xl bg-emerald-50/60 p-4 border border-emerald-100 text-xs text-emerald-900">
            <HelpCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">Instruções para Importação:</span>
              <p>
                1. Faça o download do arquivo modelo clicando no botão acima.<br />
                2. Preencha os dados no Excel ou Google Sheets mantendo os nomes das colunas intactos.<br />
                3. Certifique-se de preencher os campos obrigatórios: <strong>lojaCnpj</strong>, <strong>tag</strong> e <strong>local</strong>.<br />
                4. Salve como <strong>CSV (separado por ponto e vírgula ou vírgula)</strong> e faça o upload na área abaixo.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerta de Sucesso após Importar */}
      {importadoSucesso !== null && (
        <div className="flex flex-row items-center justify-between gap-3 rounded-xl bg-green-50 p-4 border border-green-200 text-green-900">
          <div className="flex flex-row items-center gap-3">
            <CheckCircle2 size={24} className="text-green-600" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Importação Concluída com Sucesso!</span>
              <span className="text-xs text-green-700">
                {importadoSucesso} equipamento(s) foram adicionados ao sistema.
              </span>
            </div>
          </div>
          <Button variant="ghost" className="h-8 w-8 p-0 text-green-700" onClick={() => setImportadoSucesso(null)}>
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Zona de Upload */}
      <Card>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition m-5 ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, .json, text/plain"
            className="hidden"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload size={24} />
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-sm font-bold text-gray-900">
              {nomeArquivo ? `Arquivo selecionado: ${nomeArquivo}` : 'Arraste seu arquivo CSV ou clique para selecionar'}
            </span>
            <span className="text-xs text-muted-foreground">
              Suporta arquivos .CSV e .JSON formatados
            </span>
          </div>
        </div>
      </Card>

      {/* Pré-visualização dos Dados Carregados */}
      {linhas.length > 0 && (
        <Card>
          <CardHeader
            icon={<Table size={18} />}
            title="Pré-visualização e Validação"
            subtitle="Revise os itens importados antes de salvar no sistema."
            action={
              <div className="flex flex-row items-center gap-2">
                <Button
                  variant="outline"
                  className="text-xs text-red-600"
                  onClick={() => {
                    setLinhas([]);
                    setNomeArquivo('');
                  }}
                >
                  <RefreshCw size={13} className="mr-1" /> Limpar
                </Button>
                <Button
                  disabled={totalValidos === 0}
                  onClick={confirmarImportacao}
                  className="text-xs gap-1.5"
                >
                  <Check size={15} /> Confirmar Importação ({totalValidos})
                </Button>
              </div>
            }
          />

          <div className="flex flex-col gap-4 p-5">
            {/* Resumo da Validação */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="flex flex-col items-center rounded-lg bg-blue-50 p-3 text-blue-900 border border-blue-100">
                <span className="text-lg font-bold">{linhas.length}</span>
                <span className="text-xs">Linhas Lido</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-green-50 p-3 text-green-900 border border-green-100">
                <span className="text-lg font-bold">{totalValidos}</span>
                <span className="text-xs">Prontos para Importar</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-red-50 p-3 text-red-900 border border-red-100">
                <span className="text-lg font-bold">{totalErros}</span>
                <span className="text-xs">Com Inconsistências</span>
              </div>
            </div>

            {/* Tabela de Registros */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Loja (CNPJ)</th>
                    <th className="p-3">TAG</th>
                    <th className="p-3">Local</th>
                    <th className="p-3">Marca / Potência</th>
                    <th className="p-3">Tipo / Modelo</th>
                    <th className="p-3">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {linhas.map((item) => (
                    <tr key={item.idTemp} className={!item.valido ? 'bg-red-50/50' : 'hover:bg-muted/30'}>
                      <td className="p-3">
                        {item.valido ? (
                          <Badge tone="green">
                            <CheckCircle2 size={11} className="mr-1" /> Válido
                          </Badge>
                        ) : (
                          <Badge tone="red">
                            <AlertTriangle size={11} className="mr-1" /> Incompleto
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        <div className="flex flex-col">
                          <span>{lojaNome(item.draft.lojaCnpj)}</span>
                          <span className="text-[10px] text-muted-foreground">{item.draft.lojaCnpj}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-gray-900">{item.draft.tag || '—'}</td>
                      <td className="p-3">{item.draft.local || '—'}</td>
                      <td className="p-3">
                        {item.draft.marca || '—'} {item.draft.potencia ? `· ${item.draft.potencia}` : ''}
                      </td>
                      <td className="p-3">
                        {item.draft.tipoEquipamento || '—'} {item.draft.modelo ? `· ${item.draft.modelo}` : ''}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                          onClick={() => removerLinha(item.idTemp)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}