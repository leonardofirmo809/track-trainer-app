## Diagnóstico

Verifiquei o banco: a tabela de convites (`coach_invites`) está **completamente vazia** e o log de auditoria (`admin_audit_log`) também não tem nenhum registro de `invite_created`. O único usuário existente é o seu (LEONARDO, admin). Ou seja, o `INSERT` do convite **nunca chegou ao banco**, embora você tenha visto o toast de sucesso.

Hipóteses prováveis:
1. **Site publicado desatualizado.** Mudanças de frontend só vão ao ar quando você clica em **Publish → Update**. Se a versão publicada ainda não tem a tela de convite atual, o botão pode estar exibindo sucesso sem realmente persistir (versão antiga do código).
2. **Toast otimista com erro silencioso.** O código atual mostra erro via `toast.error(error.message)` — então isso é menos provável, mas vale confirmar.
3. **E-mail digitado em outra tela** (ex.: cadastro de aluno) por engano.

## Plano de correção

### 1. Republicar o app
- Abrir o diálogo de Publish e clicar em **Update** para garantir que a versão publicada tem a tela atual de Treinadores.

### 2. Endurecer a tela `admin.treinadores.tsx`
Para evitar "sucesso fantasma" no futuro:
- No `createInvite`, só mostrar toast de sucesso se `data?.id` estiver presente; caso contrário mostrar erro detalhado.
- Logar `error` no console com prefixo `[invite]` para facilitar debug pelo console do navegador.
- Após `load()`, validar que o novo convite aparece na lista; se não aparecer, mostrar aviso.

### 3. Reproduzir o caso do gustavohdeoli@gmail.com
- Após republicar, refazer o convite com o console do navegador aberto.
- Se ainda falhar, capturar o erro do console/network (request `POST /rest/v1/coach_invites`) — aí teremos a causa raiz (RLS, validação, etc.).

### Fora do escopo
- Mudar o fluxo de convite (continua sendo link copiado).
- Envio de e-mail automático para o convidado.

Apenas mudanças de frontend em `src/routes/_authenticated/admin.treinadores.tsx`.