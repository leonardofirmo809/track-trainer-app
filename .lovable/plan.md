# Plano — Layout responsivo completo

## 1. Layout shell (`src/routes/_authenticated.tsx`)

- Envolver em `SidebarProvider` com `defaultOpen` controlado por breakpoint:
  - `≥1024px`: sidebar expandida (240px).
  - `768–1023px`: sidebar colapsada em ícones (64px) via `defaultOpen={false}` + `collapsible="icon"`.
  - `<768px`: sidebar escondida; usar `Sheet` (drawer) controlado por estado próprio.
- Detectar breakpoint via hook `useIsMobile` existente (`src/hooks/use-mobile.tsx`) + criar `useIsTablet` se necessário.
- Header:
  - Desktop/tablet: header atual com `SidebarTrigger`.
  - Mobile: header fixo (`sticky top-0`) com logo à esquerda + botão hamburguer (`Menu` icon) que abre o drawer.
- Main:
  - Padding responsivo: `p-4 sm:p-6 lg:p-8`.
  - Mobile: adicionar `pb-20` para não ficar atrás do bottom nav.
- Renderizar `<MobileBottomNav />` apenas em `<768px`.

## 2. Sidebar (`src/components/app-sidebar.tsx`)

- Desktop expandida (240px): manter conteúdo atual; aplicar estilo do item ativo:
  - `data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:rounded-l-none` no `SidebarMenuButton`.
- Tablet colapsada (64px): shadcn já mostra só ícones; garantir `tooltip` no `SidebarMenuButton` (`tooltip={i.title}`) para mostrar nome ao hover.
- Footer: manter avatar + nome + logout (botão de logout sempre visível, mesmo colapsado, como ícone).

## 3. Drawer mobile

- Reaproveitar `Sheet` (`@/components/ui/sheet`) com `side="left"`.
- Conteúdo: mesma lista de navegação da sidebar (extrair em componente `<SidebarNav />` compartilhado para evitar duplicação).
- Overlay escuro automático do `Sheet`; fecha ao clicar fora.
- Trigger: botão hamburguer no header mobile.

## 4. Bottom Navigation (`src/components/mobile-bottom-nav.tsx` — novo)

- Fixo no rodapé: `fixed bottom-0 inset-x-0 z-40 h-16 bg-card border-t`.
- 4 itens: Dashboard (`/dashboard`, Home), Alunos (`/alunos`, Users), Planilhas (`/planilha-5km` ou menu), Perfil (`/minha-marca`, User).
- Cada item: ícone (24px) + label pequeno (`text-[10px]`), `flex-col items-center justify-center`, mínimo 44px touch.
- Item ativo: `text-primary`; inativo: `text-muted-foreground`.
- Renderizar via `md:hidden`.

## 5. Ajustes globais de touch + iOS (`src/styles.css`)

- Garantir `font-size: 16px` em inputs/textareas/selects via `@layer base` (evitar zoom iOS).
- Botões mínimo 44px: ajustar variante `default`/`sm` do `Button` apenas no mobile via classe utilitária `min-h-11 md:min-h-9` ou adicionar `min-h-[44px]` na variante padrão (preferir abordagem de classe utilitária só onde necessário para não inflar tudo no desktop).
- `body { overflow-x: hidden }` para garantir nada vaze horizontalmente.

## 6. Tabelas → cards no mobile

- Páginas alvo com `<Table>`: `admin.treinadores.tsx`, `admin.alunos.tsx`, `admin.auditoria.tsx`, `alunos.index.tsx`.
- Padrão: `<div className="hidden md:block"><Table>…</Table></div>` + `<div className="md:hidden space-y-3">{rows.map(r => <Card>…</Card>)}</div>`.
- Card mostra os mesmos campos da linha em layout vertical com labels.

## 7. Fora de escopo

- Sem mudanças em lógica de negócio, queries, RLS ou rotas.
- Sem alteração nas planilhas `planilha-*.tsx` internamente (apenas wrapper de padding responsivo já cobre).

## Arquivos afetados

- editar: `src/routes/_authenticated.tsx`, `src/components/app-sidebar.tsx`, `src/styles.css`
- criar: `src/components/mobile-bottom-nav.tsx`, `src/components/sidebar-nav.tsx` (extração compartilhada)
- editar tabelas: `src/routes/_authenticated/admin.treinadores.tsx`, `admin.alunos.tsx`, `admin.auditoria.tsx`, `alunos.index.tsx`
