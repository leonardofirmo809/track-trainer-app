## Remover avisos de "treinos intensos consecutivos" — Planilha 10km

### Mudanças em `src/routes/_authenticated/planilha-10km.tsx`

1. **Remover diálogo de confirmação** (linhas ~375–391): apagar o `<AlertDialog>` "Treinos intensos em dias consecutivos".
2. **Simplificar `handleApply`** (linhas ~128–143): remover a checagem `anyConsecutive` e o `setPendingApply`; aplicar direto.
3. **Remover estado `pendingApply`** (declaração e usos).
4. **Remover aviso inline na semana** (linhas ~467–471 em `WeekRow`): apagar o bloco `{dist.hasConsecutiveIntense && ...}` com o ícone `AlertTriangle`.
5. Limpar imports não utilizados (`AlertDialog*`, `AlertTriangle` se não usados em outro lugar).

A lógica de detecção em `planilha-10km-distribute.ts` permanece intacta (não é mais consumida na UI, mas não atrapalha). Sem mudanças em backend, dados ou PDF.
