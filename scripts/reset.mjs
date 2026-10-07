// npm run reset   →  deja los datos como al principio (deshace las asignaciones de los ensayos).
import { copyFileSync } from 'node:fs';

for (const fichero of ['consultores.json', 'proyectos.json']) {
  copyFileSync(
    new URL(`../data/semilla/${fichero}`, import.meta.url),
    new URL(`../data/${fichero}`, import.meta.url),
  );
}
console.log('✔ Datos restaurados: nadie asignado a Banco Meridiano (PRJ-05).');
