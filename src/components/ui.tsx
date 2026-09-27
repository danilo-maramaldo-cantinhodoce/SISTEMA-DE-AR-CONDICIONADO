import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from 'react';
import type { Tone } from '@/lib/ui-helpers';

export function Card({ children, className = '' }: {children: ReactNode;className?: string;}) {
  return <div data-ev-id="ev_492b8d30eb" className={`rounded-xl border border-border bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon, action }: {title: string;subtitle?: string;icon?: ReactNode;action?: ReactNode;}) {
  return (
    <div data-ev-id="ev_32de7ec899" className="flex flex-row items-start justify-between gap-4 border-b border-border px-5 py-4">
			<div data-ev-id="ev_731ad96fe5" className="flex flex-row items-center gap-3">
				{icon ? <div data-ev-id="ev_1c16182d54" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div> : null}
				<div data-ev-id="ev_79f5dbb2a1" className="flex flex-col gap-0.5">
					<h2 data-ev-id="ev_5083decb7d" className="text-base font-semibold text-gray-900">{title}</h2>
					{subtitle ? <p data-ev-id="ev_14ccf5867f" className="text-sm text-muted-foreground">{subtitle}</p> : null}
				</div>
			</div>
			{action}
		</div>);

}

export function Field({ label, hint, required, children, className = '' }: {label: string;hint?: string;required?: boolean;children: ReactNode;className?: string;}) {
  return (
    <label data-ev-id="ev_add61aaed9" className={`flex flex-col gap-1.5 ${className}`}>
			<span data-ev-id="ev_16b8f71bd8" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
				{label} {required ? <span data-ev-id="ev_e185d9720c" className="text-destructive">*</span> : null}
			</span>
			{children}
			{hint ? <span data-ev-id="ev_77e349dd26" className="text-xs text-muted-foreground">{hint}</span> : null}
		</label>);

}

const base =
'w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:bg-muted disabled:text-muted-foreground';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input data-ev-id="ev_c25ef46c99" {...rest} className={`${base} ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return <select data-ev-id="ev_d074712583" {...rest} className={`${base} ${className}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea data-ev-id="ev_1783783a77" {...rest} className={`${base} min-h-24 resize-y ${className}`} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'outline' | 'ghost' | 'danger';};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-blue-700',
    outline: 'border border-border bg-white text-gray-800 hover:bg-muted',
    ghost: 'text-gray-700 hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-red-700'
  };
  return (
    <button data-ev-id="ev_b3264d0431"
    {...rest}
    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} />);


}

export function Badge({ children, tone = 'neutral' }: {children: ReactNode;tone?: Tone;}) {
  const tones: Record<string, string> = {
    neutral: 'bg-muted text-gray-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  };
  return <span data-ev-id="ev_1cf5505a93" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, description }: {icon?: ReactNode;title: string;description?: string;}) {
  return (
    <div data-ev-id="ev_eb0fb13b17" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
			{icon ? <div data-ev-id="ev_78ac7244f4" className="text-muted-foreground">{icon}</div> : null}
			<p data-ev-id="ev_56b83e2aaa" className="text-sm font-semibold text-gray-800">{title}</p>
			{description ? <p data-ev-id="ev_e09d4369ff" className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
		</div>);

}