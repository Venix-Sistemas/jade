<script setup lang="ts">
const stats = [
  { label: 'Volume em estoque', value: '17.598 L', note: 'R$ 103.651,74', bold: true },
  { label: 'Saídas nas últimas 24 h', value: '0 L', note: '0 abastecimentos', bold: false },
  { label: 'Alertas', value: '3', note: 'Ver alertas', bold: true },
]

const rows = [
  { name: 'Tanque Obra · S10', place: 'Canteiro Beta Centro', fill: 37, value: 'R$ 17.338,92', days: '63,8 dias' },
  { name: 'Tanque Gasolina', place: 'Posto Ágil Filial Norte', fill: 12, value: 'R$ 3.654,27', days: '9,6 dias' },
  { name: 'Tanque 1 — S10', place: 'Posto Ágil Matriz', fill: 61, value: 'R$ 54.080,27', days: '63,0 dias' },
]
</script>

<template>
  <article
    id="bold-demo"
    class="bold-demo"
  >
    <h3 class="bold-demo__title">
      Superfícies <code>bold</code>
    </h3>
    <p class="bold-demo__hint">
      A página segue neutra. Os cabeçalhos e alguns cards usam <code>data-jade-surface="bold"</code> e ganham a
      cor da marca quando o tema é <code>bold</code>. O menu usa <code>data-jade-surface="menu"</code>: discreto
      ou forte, conforme a opção <code>menu</code> do tema.
    </p>

    <div class="shell">
      <aside
        class="shell__side"
        data-jade-surface="menu"
      >
        <strong class="shell__brand">Painel</strong>
        <nav class="shell__nav">
          <a
            href="#bold-demo"
            class="shell__link shell__link--on"
          >Início</a>
          <a
            href="#bold-demo"
            class="shell__link"
          >Reservatórios</a>
          <a
            href="#bold-demo"
            class="shell__link"
          >Saídas</a>
          <a
            href="#bold-demo"
            class="shell__link"
          >Alertas</a>
        </nav>
        <button
          type="button"
          class="btn"
        >
          Abrir o Monitor
        </button>
      </aside>

      <div class="shell__main">
        <header class="shell__top">
          <div>
            <h3 class="shell__hello">
              Olá, Usuário
            </h3>
            <p class="shell__muted">
              Atualizado às 11:09
            </p>
          </div>
          <span class="chip">Todos os postos</span>
        </header>

        <div class="stats">
          <article
            v-for="stat in stats"
            :key="stat.label"
            class="stat"
            :data-jade-surface="stat.bold ? 'bold' : undefined"
          >
            <span class="stat__label">{{ stat.label }}</span>
            <strong class="stat__value">{{ stat.value }}</strong>
            <span class="stat__note">{{ stat.note }}</span>
          </article>
        </div>

        <article class="panel">
          <header
            class="panel__head"
            data-jade-surface="bold"
          >
            Reservatórios
          </header>
          <div
            v-for="row in rows"
            :key="row.name"
            class="row"
          >
            <div>
              <strong>{{ row.name }}</strong>
              <div class="shell__muted">
                {{ row.place }}
              </div>
            </div>
            <div class="bar">
              <span
                class="bar__fill"
                :style="{ width: `${row.fill}%` }"
              />
            </div>
            <span>{{ row.value }}</span>
            <span class="pill">{{ row.days }}</span>
          </div>
        </article>
      </div>
    </div>
  </article>
</template>

<style scoped>
.bold-demo {
  min-width: 0;
  color: var(--jade-text);
}

.bold-demo__title { margin: 0 0 0.25rem; }
.bold-demo__hint { margin: 0 0 1rem; color: var(--jade-text-muted); }

.shell {
  display: grid;
  grid-template-columns: 13rem 1fr;
  gap: 1rem;
  background: var(--jade-bg);
  border: 1px solid var(--jade-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.shell__side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-right: 1px solid var(--jade-border);
}

.shell__brand { font-size: 1.15rem; }
.shell__nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }

.shell__link {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--jade-text);
  text-decoration: none;
}

.shell__link:hover { background: var(--jade-bg-primary-hover); }
.shell__link--on { background: var(--jade-bg-primary-active); font-weight: 700; }

.btn {
  padding: 0.6rem 0.9rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--jade-fill-primary);
  color: var(--jade-on-primary);
  font-weight: 600;
  cursor: pointer;
}

.btn:hover { background: var(--jade-fill-primary-hover); }

.shell__main { display: flex; flex-direction: column; gap: 1rem; padding: 1rem 1rem 1rem 0; }
.shell__top { display: flex; justify-content: space-between; align-items: center; }
.shell__hello { margin: 0; }
.shell__muted { margin: 0; font-size: 0.85rem; color: var(--jade-text-muted); }

.chip {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--jade-border-strong);
  border-radius: 0.4rem;
  color: var(--jade-text);
}

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.9rem;
  border: 1px solid var(--jade-border);
  border-radius: 0.6rem;
  background: var(--jade-bg-subtle);
  color: var(--jade-text);
}

.stat__label { font-weight: 600; }
.stat__value { font-size: 1.6rem; }
.stat__note { color: var(--jade-text-muted); font-size: 0.9rem; }

.panel { border: 1px solid var(--jade-border); border-radius: 0.6rem; overflow: hidden; background: var(--jade-bg-subtle); }
.panel__head { padding: 0.7rem 1rem; font-weight: 700; }

.row {
  display: grid;
  grid-template-columns: 1.3fr 1.5fr 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid var(--jade-border);
}

.bar { height: 0.6rem; border-radius: 1rem; background: var(--jade-bg-active); overflow: hidden; }
.bar__fill { display: block; height: 100%; background: var(--jade-fill-primary); }

.pill {
  padding: 0.15rem 0.6rem;
  border-radius: 1rem;
  background: var(--jade-bg-primary);
  color: var(--jade-text-primary);
  font-size: 0.85rem;
}

@media (max-width: 48rem) {
  .shell { grid-template-columns: 1fr; }
  .shell__side { border-right: 0; border-bottom: 1px solid var(--jade-border); }
  .shell__main { padding: 0 1rem 1rem; }
  .stats { grid-template-columns: 1fr; }
  .row { grid-template-columns: 1fr 1fr; }
}
</style>
