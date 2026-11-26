# Regras do projeto

## O seletor de tema não tem cor

`<VenixThemeSwitcher>` (`src/runtime/components/VenixThemeSwitcher.vue`) é por onde o visitante sai de um tema difícil de ler. Ele precisa ser o mais visível possível, quaisquer que sejam as cores do projeto.

- Só preto, branco e cinzas. Nunca cores do tema: nada de `--color-*`, `--jade-*` (tokens e escopo `bold`), `--v-theme-*` nem cor herdada da página, nem em temas com tokens.
- A única coisa que ele segue é o modo claro/escuro em vigor.
- Texto com contraste AA (4.5:1) nos dois modos; o contorno e as chaves com pelo menos 3:1. Cinzas suaves, não preto puro sobre branco: isso parece o modo de alto contraste do sistema (AAA foi testado e ficou pesado demais).
- Sem texto desbotado por `opacity`.
- Uma mudança de tema, tokens ou superfícies na biblioteca **não** se aplica ao seletor. Não o inclua em migrações de cores.
- Só há três exceções, pedidas pelo usuário:
  - a prop `buttonColors` deixa quem usa o módulo escolher as cores do botão que abre o menu (sem ela o botão é neutro);
  - no menu, o nome e o ícone de cada tema usam a cor `primary` dele, ajustada até ficar em AA (`src/shared/utils/switcher-color.ts`). Ícones sem fundo próprio; fundos, contornos, a seleção e o resto continuam neutros;
  - no editor de cores aberto pelo lápis, um menu lateral à direita (`ThemeLabPanel.vue`, `color.lab`), só os campos de cor mostram as cores em edição. O resto do painel segue as regras acima, com as mesmas variáveis `--venix-switcher-*`.

`test/unit/switcher-neutral.test.ts` verifica essas regras. Se ele falhar, corrija o estilo; só mude o teste ou a regra se o usuário pedir.
