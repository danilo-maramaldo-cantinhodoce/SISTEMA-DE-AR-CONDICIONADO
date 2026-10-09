# Supabase

1. Execute `supabase/schema.sql` no SQL Editor do projeto Supabase. O script cria as tabelas `acm_equipamentos`, `acm_prestadores`, `acm_manutencoes` e `acm_eventos`, mais a função transacional usada para sincronizar as alterações.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` usando a URL do projeto e a chave pública `anon` em **Project Settings → API**. Configure-as no `.env` local e também nos ambientes de build da Vercel. Nunca use a chave `service_role` no navegador.
3. Reinicie `npm run dev` ou publique um novo deployment da Vercel.

Não há cadastro ou tela de login. Equipamentos, prestadores, manutenções e eventos são gravados como registros separados nas respectivas tabelas, preservando os campos do cadastro em `payload` JSONB. Todas as alterações são gravadas no Supabase; o navegador não mantém uma cópia local persistente. Se as tabelas ainda estiverem vazias, o sistema migra dados da tabela legada `acm_shared_state` ou do `localStorage` antigo do navegador que fizer o primeiro acesso com dados.

O acesso anônimo permite que qualquer pessoa que consiga usar o site leia, altere ou apague os dados compartilhados. A chave `anon` é pública e não protege os dados; essa configuração atende ao uso sem login solicitado, mas não deve ser usada para informações confidenciais. Como o sistema sincroniza o conjunto de registros em lote, alterações concorrentes em dispositivos diferentes podem se sobrescrever.