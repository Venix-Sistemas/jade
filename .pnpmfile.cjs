// These tools still need the JS compiler API, which typescript@7 no longer
// exposes (see https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
// Pin them to typescript@6 until they support 7 (typescript-eslint: >=7.1, see
// https://github.com/typescript-eslint/typescript-eslint/issues/10940).
// Remove this file afterwards.
const NEEDS_TS6 = new Set(['@nuxt/module-builder', 'vue-tsc', 'typescript-eslint'])

function readPackage(pkg) {
  if (NEEDS_TS6.has(pkg.name) || pkg.name.startsWith('@typescript-eslint/')) {
    if (pkg.peerDependencies) delete pkg.peerDependencies.typescript
    if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript
    pkg.dependencies = { ...pkg.dependencies, typescript: 'npm:typescript@^6.0.3' }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
