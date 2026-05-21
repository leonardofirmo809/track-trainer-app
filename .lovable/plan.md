## Problema

Hoje, depois de gerar a planilha, dá pra mexer nos checkboxes de dias da UI, mas em alguns casos a alteração é bloqueada:

- **Planilha 21km e 42km**: o servidor exige exatamente 4 dias (`z.array(DAY).length(4)`). Qualquer tentativa de salvar com 3, 5 ou 6 dias retorna erro de validação.
- **Planilha 10km, 21km e 42km**: ao reabrir um plano já salvo, o carregamento descarta `weekDays` se a contagem não bater com `allowedDayCounts*` / `=== 4`, e os checkboxes voltam zerados — passando a impressão de que a planilha "trava" a quantidade de dias.
- **Planilha 5km**: já está livre (`min(1).max(7)` no servidor, sem guarda no load).

A intenção (já refletida nos textos "Você pode escolher quantos quiser" e em `suggestedDayCount*`) é que a contagem fixa seja apenas **sugestão**, não regra.

## Mudança

Tudo é ajuste de validação/carregamento. Sem mudança de UI nem de distribuição.

### 1. `src/lib/planilha-21km.functions.ts` e `src/lib/planilha-42km.functions.ts`

Trocar no schema de save:

```ts
weekDays: z.array(DAY).length(4),
```

por:

```ts
weekDays: z.array(DAY).min(1).max(7),
```

(igual ao que já existe em `planilha-5km.functions.ts` e `planilha-10km.functions.ts`).

### 2. `src/routes/_authenticated/planilha-21km.tsx` e `planilha-42km.tsx`

Na função de carregar plano salvo, trocar:

```ts
const validDays = Array.isArray(p.weekDays) && p.weekDays.length === 4 ? p.weekDays : [];
```

por:

```ts
const validDays = Array.isArray(p.weekDays) && p.weekDays.length >= 1 ? p.weekDays : [];
```

### 3. `src/routes/_authenticated/planilha-10km.tsx`

Trocar:

```ts
const validDays = Array.isArray(p.weekDays) && allowed.includes(p.weekDays.length) ? p.weekDays : [];
```

por:

```ts
const validDays = Array.isArray(p.weekDays) && p.weekDays.length >= 1 ? p.weekDays : [];
```

(remove a dependência de `allowedDayCounts10km`, que está obsoleta na lógica nova.)

## Resultado

- O treinador pode marcar/desmarcar livremente qualquer quantidade de dias (1 a 7) após gerar a planilha, em qualquer das 4 distâncias (5/10/21/42 km).
- Recarregar um plano preserva a seleção exata de dias salva, qualquer que seja a contagem.
- As mensagens suaves de "Sugestão: X dias" continuam aparecendo quando a contagem difere da recomendação (sem bloquear).

## Fora de escopo

- UI dos checkboxes (já permite toggle livre).
- Distribuição/realocação de treinos extras (já tratada pela bandeja "Treinos sem dia" no `PlanilhaCustomizerSheet`).
- Editor de treino por aluno (`PrescricaoEditor`).
- PDF, stats, banco.
