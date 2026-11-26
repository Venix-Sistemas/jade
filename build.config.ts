// build.config.ts
// @nuxt/module-builder only copies `src/runtime/` verbatim into `dist/runtime/`.
// `src/runtime/**` files import from `../../shared/**` (types, constants, utils, theme.json),
// so `src/shared/` must also be copied (as a real mkdist entry, not rollup-bundled)
// or those imports resolve to a non-existent `dist/shared/**` once published.
export default {
  // The `nuxt-module-builder:runtime-externals` plugin externalizes any import
  // matching a mkdist entry (now also `src/shared/`), which makes unbuild's
  // dependency validator take those local `dist/shared/*.js` paths for
  // "implicit dependencies". They are the package's own files, so they are
  // declared external here and the build stays quiet.
  externals: [/^\.\.\/dist\/shared\//],
  entries: [
    {
      input: 'src/shared/',
      outDir: 'dist/shared',
      addRelativeDeclarationExtensions: true,
      ext: 'js',
      pattern: [
        '**',
        '!**/*.stories.{js,cts,mts,ts,jsx,tsx}',
        '!**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}',
      ],
    },
  ],
}
