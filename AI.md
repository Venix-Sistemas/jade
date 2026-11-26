# Colors with Jade: rules for AI assistants

This project's colors come from `@venix-sistemas/jade`. Themes, light and dark modes and the
visitor's own choices change them at runtime, so a color is right only if it is right on **all**
of them. Follow these rules, then run the audit.

## Use only the semantic tokens

| What you are painting | Background | Text on it |
| --- | --- | --- |
| The page | `--jade-bg` | `--jade-text`, secondary text `--jade-text-muted` |
| A card, panel or field | `--jade-bg-subtle` or `--jade-bg-muted` | `--jade-text`, `--jade-text-muted` |
| A row or item under the pointer / selected | `--jade-bg-hover` / `--jade-bg-active` | `--jade-text` |
| A main button, a strong badge | `--jade-fill-<role>` (hover `--jade-fill-<role>-hover`) | **only** `--jade-on-<role>` |
| A soft highlight, badge or alert | `--jade-bg-<role>` | `--jade-text-<role>` or `--jade-text` |
| Colored text or a link on the page or a card | (unchanged) | `--jade-text-<role>` (stronger: `--jade-text-<role>-strong`) |

`<role>` is `primary`, `secondary`, `accent`, `error`, `info`, `success` or `warning`.

Outlines: `--jade-border` (decorative), `--jade-border-strong` (form fields), `--jade-border-focus`
(focus ring).

## Colored areas

Don't paint a side menu, header or card in the brand color by hand. Mark it, and every token
inside it is redefined for that background, so the same classes keep working:

- `data-jade-surface="menu"`: a side menu. It stands apart from the page, discreet or strong
  as the theme (or the visitor) chooses.
- `data-jade-surface="bold"`: a header or a highlight card, painted in the brand color on bold
  themes and left as it is on the others.

Inside them, still use `--jade-text`, `--jade-bg-hover`, `--jade-fill-primary` and so on. A
custom property that reads a token (`--title: var(--jade-text)`) must be declared on
`:root, [data-jade-surface]`, or it keeps the page's value inside the area.

## Never

- `--jade-primary`, `--jade-secondary` or `--jade-fill-<role>` as a **text** color. They are
  fills. Text uses `--jade-text-<role>`.
- A fixed color (`#fff`, `black`, `rgb(…)`) for text or backgrounds.
- `opacity` to make text lighter: use `--jade-text-muted`.
- `color-mix()` of tokens: the result has no guaranteed contrast.
- A separate set of colors for dark mode: the tokens already change with the mode.
- A `--jade-*` name that isn't in this file or the README: it won't exist.

## Recipes

```css
.card { background: var(--jade-bg-subtle); border: 1px solid var(--jade-border); color: var(--jade-text); }
.card__hint { color: var(--jade-text-muted); }
.button { background: var(--jade-fill-primary); color: var(--jade-on-primary); }
.button:hover { background: var(--jade-fill-primary-hover); }
.link { color: var(--jade-text-primary); }
.badge--warning { background: var(--jade-bg-warning); color: var(--jade-text-warning); }
.menu__item:hover { background: var(--jade-bg-hover); }
.menu__item[aria-current] { background: var(--jade-bg-active); font-weight: 600; }
.field { background: var(--jade-bg); border: 1px solid var(--jade-border-strong); color: var(--jade-text); }
```

## Before you finish

```bash
npx venix-jade audit                                  # the code
npx venix-jade audit --url http://localhost:3000      # also the screen, on every theme and mode
```

Fix every error and run it again until there are none. Pass one `--url` per page you changed
(the dev server must be running). Silence a finding with a `jade-audit-ignore` comment only when
it is intended, and say why. The audit measures contrast; whether an area stands out enough from
the page is still yours to check.
