## Objetivo
Permitir realizar testes de 3KM avulsos, sem precisar selecionar um aluno. O cálculo de FTP e zonas funciona normalmente; o salvamento no perfil do aluno só fica disponível quando há aluno selecionado.

## Mudanças

### 1. `src/routes/_authenticated/teste-3km.tsx`
- Tornar o campo "Aluno" opcional (remover o `*` e a validação que bloqueia o cálculo).
- Em `handleCalcular`: remover o `if (!studentId)` — basta validar o tempo.
- No cabeçalho do resultado: mostrar "Aluno: {nome}" só quando houver aluno; caso contrário exibir "Teste avulso".
- Botão "Salvar no perfil do aluno":
  - Se não houver aluno selecionado → botão desabilitado com tooltip/hint "Selecione um aluno para salvar".
  - Adicionar texto auxiliar próximo: "Para salvar este resultado, selecione um aluno acima."
- Adicionar botão secundário "Limpar" para reiniciar o formulário rapidamente entre testes avulsos.
- Trocar placeholder do select para incluir opção implícita "Nenhum (teste avulso)" — manter o select limpável (ou adicionar um item "— Nenhum (avulso) —" no topo da lista que zera `studentId`).

### Fora do escopo
- Persistir testes avulsos no banco (não há vínculo com aluno/coach, e a tabela `tests` exige `student_id` e `coach_id` NOT NULL).
- Histórico de testes avulsos.

Apenas mudanças de frontend; nenhuma migração ou alteração de lógica de cálculo.