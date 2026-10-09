import { useState } from 'react';
import { Briefcase, Eye, EyeOff, Pencil, Save, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, TextArea } from '@/components/ui';
import { useAcm } from '@/hooks/use-acm';
import { detectTipoDocumento, formatDocumento, formatTelefone } from '@/lib/format';
import type { Prestador } from '@/lib/types';

type Draft = Omit<Prestador, 'id' | 'criadoEm'>;

const vazio = (): Draft => ({ nome: '', razaoSocial: '', documento: '', tipoDocumento: '', contato: '', email: '', observacoes: '' });

export default function CadastroPrestador() {
  const { prestadores, addPrestador, updatePrestador, removePrestador } = useAcm();
  const [draft, setDraft] = useState<Draft>(vazio());
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [mostrarLista, setMostrarLista] = useState(true);

  const tipo = detectTipoDocumento(draft.documento);

  const patch = (p: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setErro('');
  };

  const salvar = () => {
    if (!draft.nome.trim()) return setErro('Informe o nome do fornecedor / prestador de serviço.');
    const payload: Draft = {
      ...draft,
      nome: draft.nome.trim().toLocaleUpperCase('pt-BR'),
      razaoSocial: draft.razaoSocial.trim().toLocaleUpperCase('pt-BR'),
      documento: draft.documento.toLocaleUpperCase('pt-BR'),
      contato: draft.contato.toLocaleUpperCase('pt-BR'),
      email: draft.email.trim().toLocaleUpperCase('pt-BR'),
      observacoes: draft.observacoes.trim().toLocaleUpperCase('pt-BR'),
      tipoDocumento: tipo,
    };
    if (editando) updatePrestador(editando, payload);else
    addPrestador(payload);
    setDraft(vazio());
    setEditando(null);
  };

  const editar = (p: Prestador) => {
    setEditando(p.id);
    setDraft({
      nome: p.nome,
      razaoSocial: p.razaoSocial,
      documento: p.documento,
      tipoDocumento: p.tipoDocumento,
      contato: p.contato,
      email: p.email,
      observacoes: p.observacoes
    });
  };

  return (
    <div data-ev-id="ev_632b979e77" className="flex flex-col gap-5">
			<Card>
				<CardHeader
          icon={<Briefcase size={18} />}
          title={editando ? 'Editar terceirizado / prestador de serviço' : 'Cadastramento de terceirizado / prestador de serviço'}
          subtitle="O tipo do documento (CPF ou CNPJ) é identificado automaticamente pela quantidade de dígitos." />

				<div data-ev-id="ev_3a5e4adabf" className="flex flex-col gap-5 p-5">
					<div data-ev-id="ev_cdb543b135" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						<Field label="Nome do fornecedor / prestador" required>
							<Input value={draft.nome} onChange={(e) => patch({ nome: e.target.value })} placeholder="Ex.: João Refrigeração" />
						</Field>
						<Field label="Razão social">
							<Input value={draft.razaoSocial} onChange={(e) => patch({ razaoSocial: e.target.value })} placeholder="Ex.: João Clima LTDA" />
						</Field>
						<Field label="CPF / CNPJ" hint="11 dígitos = CPF · 14 dígitos = CNPJ">
							<div data-ev-id="ev_15656d8396" className="flex flex-row items-center gap-2">
								<Input value={draft.documento} onChange={(e) => patch({ documento: formatDocumento(e.target.value) })} placeholder="000.000.000-00" className="font-mono" />
								<Badge tone={tipo ? 'green' : 'neutral'}>{tipo || 'indefinido'}</Badge>
							</div>
						</Field>
						<Field label="Contato (telefone)">
							<Input value={draft.contato} onChange={(e) => patch({ contato: formatTelefone(e.target.value) })} placeholder="(98) 99999-9999" />
						</Field>
						<Field label="E-mail">
							<Input value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="contato@empresa.com" />
						</Field>
						<Field label="Observações" className="md:col-span-2 lg:col-span-3">
							<TextArea value={draft.observacoes} onChange={(e) => patch({ observacoes: e.target.value })} placeholder="" />
						</Field>
					</div>

					{erro ? <p data-ev-id="ev_5c36d6d636" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p> : null}

					<div data-ev-id="ev_52a57575d9" className="flex flex-row flex-wrap gap-3">
						<Button onClick={salvar}>
							<Save size={16} /> {editando ? 'Salvar alterações' : 'Cadastrar prestador'}
						</Button>
						{editando ?
            <Button
              variant="outline"
              onClick={() => {
                setEditando(null);
                setDraft(vazio());
              }}>

								<X size={16} /> Cancelar edição
							</Button> :
            null}
					</div>
				</div>
			</Card>

			<Card>
				<CardHeader
          title="Prestadores cadastrados"
          subtitle={`${prestadores.length} registro(s)`}
          action={<Button variant="outline" onClick={() => setMostrarLista((visivel) => !visivel)}>{mostrarLista ? <EyeOff size={15} /> : <Eye size={15} />}{mostrarLista ? 'Ocultar lista' : 'Mostrar lista'}</Button>}
        />
				{mostrarLista && <div data-ev-id="ev_4eeaa6722c" className="p-5">
					{prestadores.length === 0 ?
          <EmptyState icon={<Briefcase size={28} />} title="Nenhum prestador cadastrado" description="Cadastre os fornecedores e terceirizados para vincular às notas fiscais das manutenções." /> :

          <div data-ev-id="ev_019313768b" className="overflow-x-auto">
							<table data-ev-id="ev_de2a0397be" className="w-full min-w-[720px] text-sm">
								<thead data-ev-id="ev_bde9fd8d13">
									<tr data-ev-id="ev_96aca47dc7" className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
										<th data-ev-id="ev_78cb7177d5" className="py-2 pr-3">Nome</th>
										<th data-ev-id="ev_c1c6a0658f" className="py-2 pr-3">Razão social</th>
										<th data-ev-id="ev_f692fe519c" className="py-2 pr-3">CPF / CNPJ</th>
										<th data-ev-id="ev_c7342cf309" className="py-2 pr-3">Tipo</th>
										<th data-ev-id="ev_4e5dda4cc7" className="py-2 pr-3">Contato</th>
										<th data-ev-id="ev_98996e81c6" className="py-2" />
									</tr>
								</thead>
								<tbody data-ev-id="ev_90bce7cab0">
									{prestadores.map((p) =>
                <tr data-ev-id="ev_7eebb82cea" key={p.id} className="border-b border-border/60">
											<td data-ev-id="ev_f179bdffc6" className="py-2 pr-3 font-semibold text-gray-900">{p.nome}</td>
											<td data-ev-id="ev_b0099086fa" className="py-2 pr-3 text-gray-700">{p.razaoSocial || '—'}</td>
											<td data-ev-id="ev_abe96a9ab6" className="py-2 pr-3 font-mono text-gray-700">{p.documento || '—'}</td>
											<td data-ev-id="ev_ce4a3c9317" className="py-2 pr-3">
												<Badge tone={p.tipoDocumento ? 'green' : 'neutral'}>{p.tipoDocumento || '—'}</Badge>
											</td>
											<td data-ev-id="ev_a0a3f4ac69" className="py-2 pr-3 text-gray-700">{p.contato || '—'}</td>
											<td data-ev-id="ev_083123c6a6" className="py-2">
												<div data-ev-id="ev_9f8ed45a5b" className="flex flex-row justify-end gap-1">
													<Button variant="ghost" className="px-2" onClick={() => editar(p)}>
														<Pencil size={15} />
													</Button>
													<Button variant="ghost" className="px-2 text-destructive" onClick={() => {
                            if (window.confirm(`Confirma a exclusão do prestador ${p.nome}?`)) removePrestador(p.id);
                          }}>
														<Trash2 size={15} />
													</Button>
												</div>
											</td>
										</tr>
                )}
								</tbody>
							</table>
						</div>
          }
				</div>}
			</Card>
		</div>);

}