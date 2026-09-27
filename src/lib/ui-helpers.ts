export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

export function statusTone(status: string): Tone {
	switch (status) {
		case 'Em operação':
		case 'Concluída':
			return 'green';
		case 'Em andamento':
			return 'amber';
		case 'Desativada':
		case 'Aberta':
			return 'red';
		default:
			return 'neutral';
	}
}
