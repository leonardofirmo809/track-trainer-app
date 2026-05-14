## Bug: Aquecimento de "Corrida Rápida Longa" (21km)

### Causa
Em `src/lib/planilha-21km-data.ts`, várias chamadas a `corridaRapidaLonga(...)` passam `wuZ1m: 1600` quando deveriam usar o padrão `800` (Z1) + 1600 (Z2). O default do builder já está correto (800/1600); o problema são overrides indevidos.

### Regra
- Padrão correto: **800m Z1 + 1600m Z2**
- Exceção (manter 1600m Z1): apenas **Nível 2, Planilhas 3 e 4** (carga mais alta)

### Alterações em `src/lib/planilha-21km-data.ts`
Remover `wuZ1m:1600` (deixar default 800) nas seguintes linhas:

- **N1_P3** (Nível 1, Planilha 3)
  - T08 (Sem 2, Slot 4): `corridaRapidaLonga("T08",4,7,{wuZ1m:1600,recZ1m:800})` → `{recZ1m:800}`
  - T16 (Sem 4, Slot 4): `corridaRapidaLonga("T16",4,8,{wuZ1m:1600,recZ1m:800})` → `{recZ1m:800}`
- **N1_P4** (Nível 1, Planilha 4)
  - T08: `{wuZ1m:1600,recZ1m:800}` → `{recZ1m:800}`
  - T16: `{wuZ1m:1600,recZ1m:800}` → `{recZ1m:800}`
- **N1_P5** — não tem CR Longa
- **N2_P2** (Nível 2, Planilha 2)
  - T16 (Sem 4, Slot 4): `corridaRapidaLonga("T16",4,10,{wuZ1m:1600,recZ1m:800})` → `{recZ1m:800}`

Manter inalterado (1600 Z1 é correto):
- N2_P3 T08, T16
- N2_P4 T04, T12

Já corretos (800 Z1 explícito ou default):
- N2_P2 T12, N2_P5 T12

### Verificação
Após edição, conferir no preview `/planilha-21km` que os treinos de "Corrida Rápida Longa" das planilhas 1, 2 (parcial), 3 e 4 do Nível 1 e Planilha 2 do Nível 2 mostrem aquecimento "800m Z1 + 1600m Z2".
