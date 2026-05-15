## Identidade visual: assessoria esportiva de corrida

A boa notícia é que o projeto já usa tokens semânticos (`--primary`, `--background`, `--card`, etc.) consumidos por todos os componentes shadcn (Button, Input, Badge, Card…). Então **não preciso editar componentes**: basta reescrever o token central em `src/styles.css` e trocar a fonte. Tudo se propaga.

### 1. Fontes
- Em `src/routes/__root.tsx` (head links): substituir Inter+Sora pelo Google Font **Plus Jakarta Sans** (pesos 400, 500, 600, 700).
- Em `src/styles.css` `@theme inline`:
  - `--font-sans: "Plus Jakarta Sans", system-ui, sans-serif;`
  - `--font-display: "Plus Jakarta Sans", system-ui, sans-serif;` (mesma família, peso 600/700 nos títulos via h1–h4)
- Pesos aplicados via base layer: `body { font-weight: 400 }`, `label { font-weight: 500 }`, `h1–h4 { font-weight: 600 }`.

### 2. Paleta (light theme — `:root`)
Converter os hex pedidos para `oklch` (formato exigido pela base do projeto):

| Token | Hex | oklch |
|---|---|---|
| `--primary` | #0F6E56 | `oklch(0.475 0.105 165)` |
| `--primary-foreground` | #FFFFFF | `oklch(1 0 0)` |
| `--accent` (primary light bg) | #E1F5EE | `oklch(0.95 0.035 165)` |
| `--accent-foreground` (primary dark) | #085041 | `oklch(0.36 0.085 165)` |
| `--ring` | primary | mesma de `--primary` |
| `--destructive` | #E24B4A | `oklch(0.62 0.20 25)` |
| `--warning` | #BA7517 | `oklch(0.60 0.13 65)` |
| `--success` | #1D9E75 (accent) | `oklch(0.62 0.13 165)` |
| `--background` | #FAFAFA | `oklch(0.985 0 0)` |
| `--card` / `--popover` | #FFFFFF | `oklch(1 0 0)` |
| `--foreground` / `--card-foreground` | #1C1C1E | `oklch(0.20 0.005 270)` |
| `--muted` | #F4F4F5 | `oklch(0.965 0.002 270)` |
| `--muted-foreground` | #6B7280 | `oklch(0.55 0.015 265)` |
| `--secondary` | #F4F4F5 | `oklch(0.965 0.002 270)` |
| `--secondary-foreground` | #1C1C1E | `oklch(0.20 0.005 270)` |
| `--border` / `--input` | #E4E4E7 | `oklch(0.92 0.003 270)` |

Variável extra para uso semântico onde fizer sentido:
- `--primary-dark: oklch(0.36 0.085 165)` (#085041) — disponível como `bg-[var(--primary-dark)]` se necessário; não é estritamente requerido pelos componentes shadcn.

Os tokens de **zone/volume/intensity** (pace charts) ficam como estão — não foram pedidos e são domínio específico das planilhas.

Sidebar (atualmente escura) — manter padrão escuro neutro com accent verde:
- `--sidebar: oklch(0.20 0.005 270)` (#1C1C1E)
- `--sidebar-foreground: oklch(0.96 0 0)`
- `--sidebar-primary: var(--primary)`
- `--sidebar-accent: oklch(0.26 0.005 270)`
- `--sidebar-border: oklch(1 0 0 / 10%)`

### 3. Dark theme (`.dark`)
Realinhar para a mesma família verde — mantém `bg` neutro escuro `#1C1C1E`, `card` levemente mais claro, `primary` em `oklch(0.62 0.13 165)` (versão mais clara para contraste em fundo escuro). Não mudar a estrutura.

### 4. Raios e sombras
- `--radius: 0.5rem` (8px) → vira o raio base de botões e inputs (`--radius-md` = 0.5rem - 2px = ~6px; `--radius-lg` = 8px). Cards usam `rounded-xl` no shadcn → `--radius-xl = radius + 4px = 12px`. Bate exatamente com o briefing.
- Adicionar tokens de sombra no `@theme inline`:
  - `--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);`
  - `--shadow-card-hover: 0 4px 12px rgba(0,0,0,0.08);`
- Aplicar via regra base: `.card, [data-slot="card"] { box-shadow: var(--shadow-card); transition: box-shadow .2s; } .card:hover, [data-slot="card"]:hover { box-shadow: var(--shadow-card-hover); }` — só nos cards "interativos" (links/botões dentro). Para evitar hover ruidoso em cards estáticos de formulário, vou aplicar **somente o shadow base nos cards** e o hover apenas em `a > [data-slot="card"]` ou `button > [data-slot="card"]`.

### 5. Ajustes finos para os componentes existentes
Tudo é gerado automaticamente pelos tokens, mas vou validar:
- **Botão primário** → já usa `bg-primary text-primary-foreground hover:bg-primary/90`. Resultado: verde #0F6E56 → branco, hover levemente mais escuro. Atende o briefing.
- **Botão secundário (variant outline)** → já usa `border border-input bg-background hover:bg-accent hover:text-accent-foreground`. Para que fique "borda primary, texto primary, hover primary light", vou ajustar **apenas a variant `outline`** em `src/components/ui/button.tsx` para `border-primary text-primary hover:bg-accent hover:text-accent-foreground`. Ajuste mínimo, segue padrão shadcn.
- **Inputs** → `src/components/ui/input.tsx` usa `border-input focus-visible:border-ring focus-visible:ring-ring/50`. Com os novos tokens, focus já fica verde com halo claro. OK sem alteração.
- **Links e ícones ativos** → sidebar e nav já usam `text-sidebar-primary` e `text-primary` em estado ativo. Vão herdar a nova cor.
- **Badges de status** → variants destructive/secondary/outline já mapeiam. Onde o código usa cores hardcoded (ex.: `bg-amber-500`), não vou tocar nesta passada — fora do escopo de tokens globais.

### 6. Validação
Após o commit, abrir o preview em `/dashboard`, `/alunos`, `/admin/treinadores` e `/login` e conferir botões, sidebar, cards e badges. Toast com Sonner já lê os tokens.

### Fora de escopo
- Não vou refatorar componentes que usam Tailwind colors hardcoded pontualmente (ex.: avisos amber em `admin.configuracoes`).
- Não vou mexer nos tokens de zone/volume/intensity das planilhas.
- Não vou criar nova logo.
