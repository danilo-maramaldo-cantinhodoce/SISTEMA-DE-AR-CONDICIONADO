# Supabase

1. Crie um projeto Supabase e execute `supabase/schema.sql` no SQL Editor.
2. Na raiz do projeto, copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL do projeto e a chave pública `anon` em **Project Settings → API**. Nunca coloque a chave `service_role` no navegador ou no `.env` do Vite.
3. Reinicie `npm run dev`, crie uma conta na tela de acesso e entre. Se a confirmação de e-mail estiver habilitada, confirme o endereço antes de entrar.

Com Supabase configurado, a aplicação exige autenticação e salva o estado em `public.acm_state`, isolado por usuário via RLS. No primeiro acesso sem estado remoto, os dados locais existentes são enviados para essa conta. O `localStorage` permanece como cópia local de contingência.

Cada conta possui seus próprios dados. Para compartilhar a mesma base entre dispositivos, entre com a mesma conta. Como o sistema sincroniza um único documento JSON por conta, evite edições simultâneas em vários dispositivos; para colaboração concorrente, o próximo passo é normalizar os registros em tabelas relacionais.

Os novos campos de manutenção preventiva por loja continuam dentro do mesmo documento `payload`; não é necessário alterar o SQL ao atualizar a aplicação. Para publicar o app, cadastre essas mesmas duas variáveis no ambiente de build/deploy.