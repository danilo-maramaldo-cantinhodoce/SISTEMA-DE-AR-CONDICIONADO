import { Field, Input, Select } from '@/components/ui';
import { LOJAS } from '@/lib/constants';

/** Seleção da loja + campo de CNPJ preenchido automaticamente (somente leitura). */
export default function LojaSelect({ value, onChange, required }: {value: string;onChange: (cnpj: string) => void;required?: boolean;}) {
  return (
    <>
			<Field label="Loja" required={required}>
				<Select value={value} onChange={(e) => onChange(e.target.value)}>
					<option data-ev-id="ev_c371388abf" value="">Selecione a loja…</option>
					{LOJAS.map((l) =>
          <option data-ev-id="ev_0c0103b847" key={l.cnpj} value={l.cnpj}>
							{l.nome}
						</option>
          )}
				</Select>
			</Field>
			<Field label="CNPJ" hint="Preenchido automaticamente conforme a loja selecionada">
				<Input value={value} readOnly placeholder="—" className="font-mono" />
			</Field>
		</>);

}