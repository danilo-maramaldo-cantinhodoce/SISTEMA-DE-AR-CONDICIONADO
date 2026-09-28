import { useState } from 'react';
import { Cloud, LogIn, UserPlus } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input } from '@/components/ui';

export default function SupabaseAuth({
  status,
  error,
  onSignIn,
  onSignUp,
}: {
  status: 'loading' | 'auth' | 'error';
  error: string;
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
}) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    setMensagem('');
    const resultado = modoCadastro ? await onSignUp(email, senha) : await onSignIn(email, senha);
    setMensagem(resultado || (modoCadastro ? 'Conta criada. Verifique seu e-mail para confirmar o cadastro.' : 'Acesso realizado.'));
    setEnviando(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader icon={<Cloud size={19} />} title="Acesso aos dados do sistema" subtitle="Entre com sua conta Supabase para acessar os dados sincronizados." />
        <div className="flex flex-col gap-4 p-5">
          {status === 'loading' ? <p className="text-sm text-muted-foreground">Conectando ao Supabase...</p> : (
            <>
              <Field label="E-mail" required>
                <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Senha" required>
                <Input type="password" autoComplete={modoCadastro ? 'new-password' : 'current-password'} value={senha} onChange={(event) => setSenha(event.target.value)} />
              </Field>
              {(error || mensagem) && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{error || mensagem}</p>}
              <Button disabled={enviando || !email || senha.length < 6} onClick={enviar}>
                {modoCadastro ? <UserPlus size={16} /> : <LogIn size={16} />}
                {enviando ? 'Aguarde...' : modoCadastro ? 'Criar conta' : 'Entrar'}
              </Button>
              <Button variant="ghost" onClick={() => { setModoCadastro((modo) => !modo); setMensagem(''); }}>
                {modoCadastro ? 'Já tenho uma conta' : 'Criar conta de acesso'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}