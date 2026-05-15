## Objetivo

Redesenhar a UX das telas `/planilha-5km|10km|21km|42km` mantendo todo o backend existente (zonas, PDF, customizer, persistência por aluno). Mudanças são puramente de UI/presentation.

## Escopo

Aplicar em todas as 4 telas `src/routes/_authenticated/planilha-*km.tsx`:

1. **Seletor de planilha (topo)** — cards visuais para 5/10/21/42km
2. **Seletor de aluno** — substituir o `Select` atual por search + popover
3. **Toggle Nível 1 / Nível 2** — visual mais claro (mantém lógica atual)
4. **Visualização das semanas** — desktop grid (já é), mobile vira accordion
5. **Badges de intensidade** por tipo de treino (verde/amarelo/vermelho)
6. **FAB mobile "Atribuir"** — abre o seletor de aluno
7. **Toast de confirmação** ao trocar/atribuir aluno

## Componentes novos (compartilhados)

- `src/components/planilha/distance-selector.tsx` — 4 cards (5/10/21/42), aceita `current` e usa `<Link>` para navegar entre rotas. Card ativo: `border-primary bg-primary/5`. Cada card: ícone + título ("10 km") + subtítulo ("Para corredores de 45 a 55 min").
- `src/components/planilha/student-picker.tsx` — Popover + Command (shadcn) com search por nome. Renderiza como botão "Atribuir a aluno" no desktop e como FAB no mobile (prop `variant`). Toast: `"Planilha {distância} Nível {n} atribuída a {nome}"`.
- `src/components/planilha/intensity-badge.tsx` — mapeia `WORKOUT_TYPES_*` → cor (regenerativo/leve = verde, moderado/limiar = amarelo, intervalado/VO2/intenso = vermelho).
- `src/components/planilha/weeks-view.tsx` — wrapper responsivo: `hidden md:grid` para o grid de semanas atual + `md:hidden` com `<Accordion>` (shadcn) onde cada item é uma semana. Recebe `weeks` (já calculado pela página) e renderiza cada treino com `IntensityBadge` + dia + duração/volume.

## Mudanças por página `planilha-*km.tsx`

Cada uma das 4 páginas recebe edições paralelas e mínimas:

- **Topo da página**: inserir `<DistanceSelector current="10km" />` antes do bloco de seleção de aluno.
- **Bloco de aluno**: trocar o `Select` por `<StudentPicker variant="inline" value={studentId} onChange={setStudentId} />`.
- **Toggle de nível**: manter o `Tabs` atual mas estilizar como pill-toggle maior (border/active state em `primary`).
- **Lista de semanas**: substituir o JSX que hoje renderiza o grid por `<WeeksView weeks={weeks} />`. A lógica de cálculo (`distributeWeek`, `applyOverrides`, `phase`) fica intacta — só muda o componente de apresentação.
- **FAB mobile**: adicionar `<StudentPicker variant="fab" .../>` no fim do JSX (fixed bottom-right, `md:hidden`, respeita o bottom-nav existente com `bottom-20`).
- Tipos de treino → cor da badge: derivar de `WORKOUT_TYPES_5KM/10KM/21KM/42KM` (já existem em `src/lib/planilha-*-data.ts`).

## Notas técnicas

- Acordeão mobile usa o componente `accordion` de shadcn (já presente em `src/components/ui/accordion.tsx`).
- Cards de distância: `Link to="/planilha-Xkm"` — rotas já existem.
- Intensidade: criar uma função única `getIntensity(typeKey: string): "leve" | "moderado" | "intenso"` em `src/lib/workout-intensity.ts` para ser usada pelas 4 planilhas.
- Não mexer em: PDF (`generatePlanilha10kmPdf`), customizer (`PlanilhaCustomizerSheet`), cálculo de zonas, `savePlanilha*Config`, schema do banco.
- Sem migrations, sem mudanças em RLS, sem novas dependências.

## Fora de escopo

- Sidebar (continua com 4 itens; cards no topo já facilitam navegação).
- Refatorar a lógica de `distributeWeek` ou overrides.
- Persistência de "atribuição" diferente — o fluxo atual já salva o plano por `student_id` quando o usuário escolhe um aluno e configura.

## Arquivos

**Criar:**
- `src/components/planilha/distance-selector.tsx`
- `src/components/planilha/student-picker.tsx`
- `src/components/planilha/intensity-badge.tsx`
- `src/components/planilha/weeks-view.tsx`
- `src/lib/workout-intensity.ts`

**Editar (apenas UI nas 4):**
- `src/routes/_authenticated/planilha-5km.tsx`
- `src/routes/_authenticated/planilha-10km.tsx`
- `src/routes/_authenticated/planilha-21km.tsx`
- `src/routes/_authenticated/planilha-42km.tsx`
