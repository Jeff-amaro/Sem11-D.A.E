# Entregables - Semana 11: Los hooks del agente

## 1. Resumen de pruebas

| Etapa | Comando | Resultado |
|---|---|---|
| Estado inicial | `npm test` | 57 pruebas: 17 pasan, 40 fallan |
| `useDebounce` | `npm test -- useDebounce` | 10/10 |
| `usePlans` | `npm test -- usePlans` | 12/12 |
| `useAgentRun` | `npm test -- useAgentRun` | 18/18 |
| IA (antes de corregir) | `npm run test:ai` | 37 pasan, 20 fallan |
| IA (después de corregir) | `npm run test:ai` | 57/57 |
| Suite final | `npm test` | 57/57 |
| Build final | `npm run build` | OK (1.26s) |

## 2. Revisión de diffs por hook

### `useDebounce`

1. Hooks en el mismo orden y nivel superior: sí, `useState` y `useEffect` se llaman siempre en el nivel superior.
2. `useEffect` que abre un temporizador lo limpia: sí, `clearTimeout(timer)` en la función de limpieza.
3. Tres estados: no aplica; devuelve el valor tranquilo.
4. El dato vive en el ancestro más bajo que lo necesita: sí, estado local del hook.

### `usePlans`

1. Hooks en el mismo orden y nivel superior: sí.
2. `useEffect` que abre una petición la cierra: sí, `cancelled = true` en la limpieza.
3. Tres estados resueltos y visibles: sí, `loading`, `ready` y `error`; `App` muestra esqueleto, datos y `ErrorBanner`.
4. El dato vive en el ancestro más bajo que lo necesita: sí, `usePlans` vive en `App`, que es el ancestro común de `Header` e `Inbox`.

### `useAgentRun`

1. Hooks en el mismo orden y nivel superior: sí, sin `if`, bucles ni `return` antes de los hooks.
2. `useEffect` que abre una ejecución la cierra: sí, la limpieza aborta el `AbortController` al desmontar.
3. Estados resueltos y visibles: sí, `idle`, `running`, `awaiting_approval`, `done` y `error`; `RunPanel` los muestra.
4. El dato vive en el ancestro más bajo que lo necesita: sí, el estado de ejecución vive en `RunPanel`.

## 3. Elevación de estados

El contador de pendientes vive en `App` y no en `Header` porque `Header` solo necesita mostrar el número, mientras que las decisiones (`decisions`) las necesita `Inbox` para filtrar planes y `RunPanel` para saber cuáles están aprobados. `App` es el ancestro común más bajo de `Header` e `Inbox`; por eso ahí se guardan las decisiones y se deriva `pendingCount`. Si viviera en `Header`, `Inbox` no podría leerlas ni actualizarlas; si viviera en `Inbox`, `Header` no podría mostrar el contador. El estado se eleva al ancestro compartido mínimo, no "por si acaso".

## 4. Árbol de componentes y nivel de cada dato

```text
App
├── estado: decisions (localStorage), failing
├── derivado: pendingCount
├── usePlans(fetchPlans) -> status, plans, error, reload
├── Header (props: pendingCount)
├── toolbar (failing, reload)
├── PlansSkeleton / ErrorBanner (status)
└── Inbox (props: plans, decisions, onDecide, runAgent)
    ├── estado local: query
    ├── useDebounce(query, 300) -> quietQuery
    ├── PlanCard (props: plan, onDecide)
    └── RunPanel (props: approvedPlans, runAgent)
        └── useAgentRun(runAgent) -> status, plan, result, error, start, approve, reject
```

| Dato | Dónde vive | Por qué |
|---|---|---|
| `plans`, `status`, `error` | `App` (`usePlans`) | Compartido por `Header` (contador) e `Inbox` |
| `decisions` | `App` | Compartido por `Header` (contador) e `Inbox`/`RunPanel` |
| `pendingCount` | Derivado en `App` | Se pasa solo el número a `Header` |
| `failing` | `App` | Controla la red simulada y el checkbox |
| `query` | `Inbox` | Solo el buscador lo usa |
| `quietQuery` | `Inbox` (`useDebounce`) | Derivado del texto ingresado |
| estado de ejecución | `RunPanel` (`useAgentRun`) | Solo el panel de ejecución lo usa |

## 5. Frontera de seguridad

Esta interfaz no es la frontera de seguridad. Es una ayuda de decisión y ensayo local: todos los datos, decisiones y estados viven en el navegador, en `localStorage` y en memoria, y la red es simulada. El control real de permisos, validación del `plan_hash`, idempotencia y auditoría debe imponerlo el servidor (semana 8/12). La confirmación de R2 (escribir el hash) y la aprobación final son barreras de usabilidad para evitar errores humanos, no controles de seguridad: pueden ser omitidas por llamadas directas a la API o por manipulación del cliente.

## 6. Fallos típicos de la IA corregidos

1. `useDebounce`: no cancelaba el temporizador anterior; se unificó en un solo `useEffect` con limpieza.
2. `usePlans`: en `.catch` no guardaba el error ni cambiaba a `error`.
3. `usePlans`: no ignoraba respuestas viejas (`cancelled`).
4. `useAgentRun`: retornaba antes de llamar a hooks cuando `runAgent` faltaba, violando las reglas de hooks.
5. `useAgentRun`: un plan R2 pasaba directo a `done` en vez de `awaiting_approval`.
6. `useAgentRun`: no abortaba la ejecución al desmontar.

## 7. Tabla de uso de IA

| Herramienta | Uso | Evidencia |
|---|---|---|
| Asistente de IA | Borradores iniciales de `src/ai/*` con 6 fallos típicos | `npm run test:ai` antes: 20 fallan |
| Asistente de IA | Corrección de `src/hooks/*` y `src/ai/*` guiada por pruebas | `npm test`, `npm test -- useDebounce`, `npm test -- usePlans`, `npm test -- useAgentRun`, `npm run test:ai` |
| Pruebas automatizadas | Validación final | 57/57 en `npm test` y `npm run test:ai` |
