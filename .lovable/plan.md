## Mudanças

### 1. Remover aviso "Treinos intensos em dias consecutivos" (`src/routes/_authenticated/planilha-5km.tsx`)
- Apagar o `AlertDialog` de confirmação (linhas ~387-403).
- Apagar o estado `pendingApply` e a checagem `anyConsecutive` em `handleApply` (linhas ~148-155) — `handleApply` passa a apenas chamar `apply()` direto.
- Apagar o bloco de aviso inline com `<AlertTriangle/> Há treinos intensos em dias consecutivos.` (linhas ~502-506).
- Remover imports não usados (`AlertTriangle`, `AlertDialog*`) se ficarem órfãos.

As planilhas 10/21/42km não exibem esse aviso, então nada a mudar lá.

### 2. Remover subtítulos de tempo no seletor de distância (`src/components/planilha/distance-selector.tsx`)
Trocar os 4 subtítulos por strings vazias (ou simplesmente remover a renderização do subtítulo):
- 5 km: remover "Para corredores de 20 a 30 min"
- 10 km: remover "Para corredores de 45 a 55 min"
- 21 km: remover "Meia maratona — 1h30 a 2h15"
- 42 km: remover "Maratona — 3h30 a 5h"

Manter apenas o título da distância no card. (Confirme se prefere manter os rótulos "Meia maratona" / "Maratona" sem o tempo — posso preservar só a parte sem horários.)

### Fora de escopo
A lógica `hasConsecutiveIntense` em `planilha-5km-distribute.ts` é mantida (pode ser útil internamente); apenas a UI deixa de exibi-la.
