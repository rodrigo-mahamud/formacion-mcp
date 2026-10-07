// ─────────────────────────────────────────────────────────────
//  datos.ts · La "base de datos" de nuestra consultora ficticia
// ─────────────────────────────────────────────────────────────
//  Esto NO es MCP. Es lo que ya tendrías en tu empresa: una API
//  interna, una BBDD, Jira, SAP, un Excel compartido...
//  El servidor MCP solo envuelve esta capa para que la IA pueda usarla.
//
//  Aquí son unos JSON en la carpeta data/ (npm run reset los restaura).

import { readFileSync, writeFileSync } from 'node:fs';

export type Seniority = 'Junior' | 'Mid' | 'Senior';

export interface Consultor {
  id: string;
  nombre: string;
  rol: string;
  seniority: Seniority;
  skills: string[];
  ubicacion: string;
  proyecto: string | null; // id del proyecto actual, o null si está en banquillo
  libreDesde: string; // fecha YYYY-MM-DD desde la que está disponible
}

export interface Proyecto {
  id: string;
  cliente: string;
  sector: string;
  nombre: string;
  estado: 'en curso' | 'por arrancar';
  inicio: string;
  fin: string;
  modalidad: string;
  stack: string[];
  equipo: string[]; // ids de consultores
  necesita: { rol: string; seniority: Seniority[]; skills: string[] }[];
}

const carpeta = new URL('../data/', import.meta.url);

function leer<T>(fichero: string): T {
  return JSON.parse(readFileSync(new URL(fichero, carpeta), 'utf8')) as T;
}

function escribir(fichero: string, contenido: unknown): void {
  writeFileSync(new URL(fichero, carpeta), JSON.stringify(contenido, null, 2) + '\n');
}

export const leerConsultores = (): Consultor[] => leer<Consultor[]>('consultores.json');
export const leerProyectos = (): Proyecto[] => leer<Proyecto[]>('proyectos.json');
export const guardarConsultores = (consultores: Consultor[]): void => escribir('consultores.json', consultores);
export const guardarProyectos = (proyectos: Proyecto[]): void => escribir('proyectos.json', proyectos);
export const leerPolitica = (): string => readFileSync(new URL('politica-staffing.md', carpeta), 'utf8');
