import { Field, Input, Select, TextArea } from '@/components/ui';
import LojaSelect from '@/components/LojaSelect';
import { GASES, MARCAS, MODELOS_EQUIPAMENTO, POTENCIAS, STATUS_EQUIPAMENTO, TIPOS_EQUIPAMENTO, VOLTAGENS } from '@/lib/constants';
import type { EquipamentoDraft } from '@/lib/drafts';
import type { StatusEquipamento } from '@/lib/types';
import { calcularVidaUtil } from '@/lib/format';
import { formatarTagEquipamento } from '@/lib/format';

interface Props {
  draft: EquipamentoDraft;
  onChange: (patch: Partial<EquipamentoDraft>) => void;
  /** Modo completo mostra todos os campos (edição); modo cadastro oculta número de série e patrimônio */
  modoCompleto?: boolean;
}

/** Todos os campos do equipamento — reutilizado no cadastro e na edição total. */
export default function EquipamentoFields({ draft, onChange, modoCompleto = false }: Props) {
  return (
    <div data-ev-id="ev_c84282e5a8" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <LojaSelect value={draft.lojaCnpj} onChange={(lojaCnpj) => onChange({ lojaCnpj })} required />

      <Field label="Tag do equipamento" required hint="O prefixo EQ é fixo; informe somente o número.">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-input bg-muted px-3 py-2 text-sm font-semibold text-gray-700">EQ</span>
          <Input
            inputMode="numeric"
            value={draft.tag.replace(/^eq\s*\.?\s*/i, '')}
            onChange={(e) => onChange({ tag: e.target.value.replace(/\D/g, '') })}
            onBlur={() => onChange({ tag: formatarTagEquipamento(draft.tag) })}
            placeholder="01"
          />
        </div>
      </Field>

      <Field label="Local" required hint="Digite livremente — pode ser alterado se a máquina for substituída" className="md:col-span-2">
        <Input value={draft.local} onChange={(e) => onChange({ local: e.target.value })} placeholder="Ex.: Sala do gerente, Caixa 03, Depósito…" />
      </Field>

      <Field label="Marca" required>
        <Select value={draft.marca} onChange={(e) => onChange({ marca: e.target.value })}>
          <option data-ev-id="ev_faca99b04a" value="">Selecione…</option>
          {MARCAS.map((m) => (
            <option data-ev-id="ev_dfd27ee60c" key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Potência (BTUs)" required>
        <Select value={draft.potencia} onChange={(e) => onChange({ potencia: e.target.value })}>
          <option data-ev-id="ev_8c5c5a1189" value="">Selecione…</option>
          {POTENCIAS.map((p) => (
            <option data-ev-id="ev_ca86a647fb" key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tipo de equipamento">
        <Select value={draft.tipoEquipamento} onChange={(e) => onChange({ tipoEquipamento: e.target.value })}>
          <option data-ev-id="ev_9d9b002651" value="">Selecione…</option>
          {TIPOS_EQUIPAMENTO.map((t) => (
            <option data-ev-id="ev_8cdde5f18d" key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      {/* REQUISITO 5: Seleção de status restrita a 'Em Operação' e 'Desativada' */}
      <Field label={draft.dataDesativacao ? 'Status · equipamento desativado' : 'Status'}>
        <Select
          className={draft.dataDesativacao ? 'border-red-500 bg-red-50 font-semibold text-red-700' : ''}
          disabled={Boolean(draft.dataDesativacao)}
          value={draft.dataDesativacao ? 'Desativada' : draft.status}
          onChange={(e) => onChange({ status: e.target.value as StatusEquipamento })}
        >
          {STATUS_EQUIPAMENTO.map((s) => (
            <option data-ev-id="ev_b5ab3b8a3a" key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Modelo">
        <Select value={draft.modelo} onChange={(e) => onChange({ modelo: e.target.value })}>
          <option value="">Selecione…</option>
          {MODELOS_EQUIPAMENTO.map((modelo) => <option key={modelo} value={modelo}>{modelo}</option>)}
        </Select>
      </Field>

      {modoCompleto && (
        <>
          <Field label="Número de série">
            <Input value={draft.numeroSerie} onChange={(e) => onChange({ numeroSerie: e.target.value })} placeholder="Ex.: 812TAQK3F210" />
          </Field>

          <Field label="Patrimônio">
            <Input value={draft.patrimonio} onChange={(e) => onChange({ patrimonio: e.target.value })} placeholder="Ex.: 004512" />
          </Field>
        </>
      )}

      <Field label="Voltagem">
        <Select value={draft.voltagem} onChange={(e) => onChange({ voltagem: e.target.value })}>
          <option data-ev-id="ev_f92400d916" value="">Selecione…</option>
          {VOLTAGENS.map((v) => (
            <option data-ev-id="ev_85c8aee359" key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Gás refrigerante">
        <Select value={draft.gasRefrigerante} onChange={(e) => onChange({ gasRefrigerante: e.target.value })}>
          <option data-ev-id="ev_cdf545bb07" value="">Selecione…</option>
          {GASES.map((g) => (
            <option data-ev-id="ev_3c30bcb757" key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Data de instalação">
        <Input
          type="date"
          value={draft.dataInstalacao || ''}
          max={draft.dataDesativacao || undefined}
          onChange={(e) => onChange({
            dataInstalacao: e.target.value,
            vidaUtil: calcularVidaUtil(e.target.value, draft.dataDesativacao || ''),
          })}
        />
      </Field>

      {/* REQUISITO 5: Novos campos Data de Desativação e Vida Útil dispostos lado a lado */}
      <Field label="Data de desativação" hint="Preencher apenas se o equipamento for desativado">
        <Input
          type="date"
          value={draft.dataDesativacao || ''}
          min={draft.dataInstalacao || undefined}
          onChange={(e) => {
            const dataDesativacao = e.target.value;
            onChange({
              dataDesativacao,
              status: dataDesativacao ? 'Desativada' : 'Em Operação',
              vidaUtil: calcularVidaUtil(draft.dataInstalacao || '', dataDesativacao),
            });
          }}
        />
      </Field>

      <Field label="Vida útil" hint="Calculada a partir das datas de instalação e desativação">
        <Input
          readOnly
          value={draft.vidaUtil || ''}
          placeholder="Preencha as datas de instalação e desativação"
        />
      </Field>

      <Field label="Observações" className="md:col-span-2 lg:col-span-3">
        <TextArea value={draft.observacoes} onChange={(e) => onChange({ observacoes: e.target.value })} placeholder="Informações adicionais do equipamento…" />
      </Field>
    </div>
  );
}