export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

export function statusTone(status: string): Tone {
	switch (status) {
		case 'Em operação':
		case 'Concluída':
			return 'green';
		case 'Em manutenção':
		case 'Em andamento':
			return 'amber';
		case 'Inoperante':
		case 'Aberta':
			return 'red';
		case 'Reserva':
			return 'blue';
		default:
			return 'neutral';
	}
}
