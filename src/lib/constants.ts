import type { Loja, StatusEquipamento, StatusManutencao, TipoNota } from '@/lib/types';

export const LOJAS: Loja[] = [
	{ cnpj: '19.644.944/0014-44', nome: 'Araçagy' },
	{ cnpj: '19.644.944/0010-10', nome: 'Bacabal' },
	{ cnpj: '19.644.944/0013-63', nome: 'Caxias' },
	{ cnpj: '44.016.976/0001-28', nome: 'CD-BR' },
	{ cnpj: '08.505.025/0001-59', nome: 'Centro' },
	{ cnpj: '19.644.944/0005-53', nome: 'Cohab' },
	{ cnpj: '19.644.944/0001-20', nome: 'Cohama' },
	{ cnpj: '44.016.976/0002-09', nome: 'Cohama Adm' },
	{ cnpj: '19.644.944/0009-87', nome: 'Dirceu' },
	{ cnpj: '44.016.976/0003-90', nome: 'Festi Africanos' },
	{ cnpj: '44.016.976/0005-51', nome: 'Festi Teresina' },
	{ cnpj: '19.644.944/0011-00', nome: 'Homero' },
	{ cnpj: '19.644.944/0003-91', nome: 'Maiobão' },
	{ cnpj: '19.644.944/0015-25', nome: 'Parque Piauí' },
	{ cnpj: '19.644.944/0004-72', nome: 'Renascença' },
	{ cnpj: '19.644.944/0008-04', nome: 'Santa Inês' },
	{ cnpj: '19.644.944/0006-34', nome: 'São Cristóvão' },
	{ cnpj: '19.644.944/0012-82', nome: 'Vila Isabel' },
];

export const MARCAS: string[] = ['Carrier', 'Daikin', 'Elgin', 'Fujitsu', 'Gree', 'LG', 'Philco', 'Samsung', 'Springer Midea'];

export const POTENCIAS: string[] = ['9000 BTUs', '12000 BTUs', '18000 BTUs', '24000 BTUs', '36000 BTUs', '60000 BTUs', '80000 BTUs'];

export const TIPOS_EQUIPAMENTO: string[] = ['Split Hi-Wall', 'Split Cassete', 'Split Piso-Teto', 'Multi Split', 'Janela / ACJ', 'Self Contained', 'VRF'];

export const VOLTAGENS: string[] = ['110V', '220V', '380V (Trifásico)'];

export const GASES: string[] = ['R-22', 'R-410A', 'R-32', 'R-134a'];

export const STATUS_EQUIPAMENTO: StatusEquipamento[] = ['Em operação', 'Em manutenção', 'Inoperante', 'Reserva', 'Desativado'];

export const STATUS_MANUTENCAO: StatusManutencao[] = ['Aberta', 'Em andamento', 'Concluída'];

export const TIPOS_NOTA: TipoNota[] = ['DANFE', 'NFSE'];

export const lojaNome = (cnpj: string) => LOJAS.find((l) => l.cnpj === cnpj)?.nome ?? '—';
