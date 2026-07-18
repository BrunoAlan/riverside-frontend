# Contrato de navegación de Excursiones (Backend ↔ Frontend)

Especificación de las acciones que **faltan** para que el agente y el frontend estén
sincronizados en la vista de itinerario, ahora que tiene dos tabs.

La vista de itinerario hoy tiene **dos tabs**: `Overview` (el mapa con las ciudades) y
`Excursions` (la grilla de excursiones). El agente **no sabe en cuál está parado el
usuario, y no puede cambiarlo**. Este documento detalla las seis acciones que faltan,
qué existe de cada una, y de qué lado está el trabajo.

Todo lo que sigue está verificado contra el código de ambos repos, con citas a
`archivo:línea`. Donde algo no existe, se dice explícitamente — no se asume.

---

## 0) Bloqueo previo: el tab no es estado compartido

**Esto es trabajo del frontend y tiene que pasar antes que los puntos 2 y 5.**

Hoy el tab activo vive en estado local de React:

```tsx
// components/panels/itinerary/itinerary-panel.tsx:16
const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');
```

No está en `UiView` (`lib/agent-ui/ui-view-types.ts:29-33`), que es lo único que los
`ui-commands` pueden modificar. **Un command para cambiar de tab no tendría nada que
tocar.** Primero hay que subir el tab al store:

```ts
// lib/agent-ui/ui-view-types.ts — propuesta
| {
    type: 'itinerary';
    itinerary?: ItineraryFull;
    activeTab?: 'overview' | 'excursions';   // ← nuevo
    detailCityId?: string;
    detailExperienceId?: string;
  }
```

No hace falta que el backend espere a esto para diseñar sus handlers, pero **los
commands de los puntos 2 y 5 no van a tener efecto visible hasta que lo hagamos.**

---

## 1) El usuario cambió a la tab de Excursiones → avisar al agente

**Dirección:** Frontend → Agente (`frontend-intent`)
**Estado:** no existe de ningún lado.

El frontend no manda nada al cambiar de tab, y el backend no tiene ningún intent de
navegación. El catálogo de intents es una tupla cerrada de 45 entradas y no hay nada
relacionado con tabs (`domain/intents/catalog.py:7-54`).

**Lo que pedimos:**

```ts
intent: 'view_excursions'
entities: {}          // ninguna
```

**Qué debería hacer el handler:** registrar en el estado que el usuario está mirando
excursiones, para que el agente pueda hablar en consecuencia ("veo que estás mirando
las excursiones de Budapest…") en vez de seguir describiendo el mapa.

**Nota de diseño:** proponemos `view_excursions` por simetría con los `view_*` que ya
existen (`view_cabin_selection`, `view_experience_selection`, `view_itinerary`). Si
prefieren un intent genérico de navegación con un entity `tab`, nos adaptamos — pero
avísennos, porque cambia lo que emitimos.

---

## 2) El agente quiere mostrar la tab de Excursiones

**Dirección:** Agente → Frontend (`ui-commands`)
**Estado:** no existe. Ningún command mueve al frontend entre tabs.

Los commands que hoy tocan la vista de itinerario son: `show_itinerary_options`,
`show_city_detail`, `show_experience_options`, `show_experience_detail`,
`sync_itinerary_experiences`, `add_experience_to_basket`,
`show_itinerary_walkthrough`, `show_itinerary_summary`. Ninguno cambia de tab.

**Lo que pedimos:**

```ts
type: 'show_itinerary_tab'
payload: { tab: 'overview' | 'excursions' }
```

Un solo command con el tab como payload cubre este punto **y el punto 5**, en vez de
dos commands separados. Sigue el mismo patrón que `show_city_detail { city_id }` y
`show_experience_detail { experience_id }`: un command, un identificador.

**Caso de uso:** el usuario dice "¿qué excursiones hay?" y el agente puede llevarlo a
la tab en vez de describirlas a ciegas mientras el usuario mira el mapa.

**Depende de la sección 0.**

---

## 3) El agente quiere abrir el detalle de una excursión

**Dirección:** Agente → Frontend (`ui-commands`)
**Estado:** el command existe, pero **el agente no puede originarlo**.

Esto es más profundo que un command faltante, y es la parte más importante de este
documento.

`show_experience_detail { experience_id }` ya existe y el frontend ya lo maneja. Pero
el agente **nunca puede emitirlo por iniciativa propia**, por tres razones acumuladas:

1. Los dos intents que lo emiten (`explore_experience`, `view_experience_selection`)
   están declarados como **frontend-driven** (`openai_llm_client.py:70-71`).
2. `explore_experience` exige `entities.experience_id` y hace soft-redirect si falta
   (`explore_experience.py:44`).
3. **`experience_id` no está en el esquema de entidades del LLM**
   (`openai_llm_client.py:139-148`). El esquema solo tiene `duration_days`,
   `duration_nights`, `embarkation_port`, `disembarkation_port`, `region`,
   `destinations`, `date_preferences`, `option_id`, `occasion`, `traveler_count`.

O sea: si el usuario dice *"contame más de la del Belvedere"*, no hay forma de que eso
llegue a `explore_experience` con el ID correcto.

**Lo que pedimos:** que el agente pueda resolver una excursión mencionada por voz.
Concretamente, agregar `experience_id` al esquema de entidades del LLM y un resolver
de nombre → ID sobre las excursiones del itinerario activo.

Hoy el único resolver de texto libre para excursiones es un mapa hardcodeado de 11
claves en `ask_experience_schedule.py:9-22` — y ese handler no emite ningún UI command,
solo escribe un `_temp_experience_schedule` en el estado (`:137-160`).

**Bug relacionado, de nuestro lado:** hoy `show_experience_detail` tiene tres
comportamientos distintos según dónde esté el usuario, y uno no hace nada visible:

| Dónde está el usuario | Qué pasa |
| --- | --- |
| Tab Excursions | Abre el dialog de la carta ✅ |
| Tab Overview, con una ciudad abierta | Expande la fila en el panel del mapa ✅ |
| Tab Overview, sin ciudad abierta | **Nada visible** ❌ |

El tercer caso es porque `CityExperiencesPanel` solo se renderiza si hay una ciudad
abierta (`panel-map.tsx:96-100`). Si implementan el punto 2, lo resolvemos combinando:
el command de tab primero, el de detalle después.

---

## 4) El agente agrega una excursión por iniciativa propia

**Dirección:** Agente → Frontend
**Estado:** no es posible, por la misma causa raíz del punto 3.

`select_experience` está clasificado como **solo-tap-de-UI**
(`openai_llm_client.py:72`) y exige `experience_id` **y** `day`, con soft-redirects
`MISSING_EXPERIENCE_ID` / `MISSING_DAY` (`select_experience.py:65-96`). Ninguno de los
dos se puede extraer del habla hoy.

**Lo que pedimos:** lo mismo del punto 3 (resolver de nombre → ID), más poder resolver
el día desde la conversación.

**Además, pedimos un marcador de origen.** Si el agente agrega algo por su cuenta, el
frontend necesita distinguirlo de un tap del usuario para poder mostrarlo distinto
("agregué esto por vos" vs. la confirmación silenciosa de un tap propio).

La buena noticia: **el backend ya sabe el origen internamente.** Existe
`source = "frontend-intent" if request.frontend_intent else "classifier"`
(`app/orchestration/turn_handler.py:143`), con el campo declarado en
`domain/actions/base.py:25`, y ya se usa en `explore_destination.py:35,38,93`.
**Solo falta propagarlo al envelope del command**, que hoy es
`{version, type, payload, timestamp, correlationId}` sin ningún campo de origen
(`domain/ui_commands/contract.py:6-13`).

Con eso alcanza — no hace falta un command nuevo.

---

## 5) El agente quiere volver a la tab de Overview

**Dirección:** Agente → Frontend
**Estado:** no existe.

**Cubierto por el mismo command del punto 2:**

```ts
type: 'show_itinerary_tab'
payload: { tab: 'overview' }
```

**Depende de la sección 0.**

---

## 6) El usuario volvió al itinerario → avisar al agente

**Dirección:** Frontend → Agente
**Estado:** **el frontend ya lo manda; el backend lo ignora.**

Esta es la que menos trabajo requiere y hoy está desperdiciada.

El frontend ya emite `view_itinerary` cuando el usuario vuelve al itinerario
(`components/panels/map/panel-map.tsx:59`). Pero el handler del backend es un no-op
literal:

```python
# domain/actions/handlers/view_itinerary.py:9-19
# devuelve state_patch={}, ui_commands=[], reason_code=ALREADY_VIEWED
```

**Lo que pedimos:** que `view_itinerary` deje registro de que el usuario volvió al
itinerario, para que el agente pueda retomar la conversación desde ahí. No hace falta
que emita ningún command — con que actualice el estado alcanza.

**Y un detalle importante:** si implementan el punto 1 (`view_excursions`), este
handler debería además marcar que el usuario **salió** de la tab de excursiones. Los
dos intents son las dos caras de la misma transición.

---

## Resumen del trabajo

| # | Acción | Backend | Frontend |
| --- | --- | --- | --- |
| 0 | Subir `activeTab` a `UiView` | — | **Nuestro** |
| 1 | Intent `view_excursions` | Handler nuevo | Emitirlo al cambiar de tab |
| 2 | Command `show_itinerary_tab` | Command nuevo | Aplicarlo al store |
| 3 | Detalle por voz | `experience_id` en el esquema del LLM + resolver | Ya está |
| 4 | Agregar por voz + marcador de origen | Lo del punto 3 + propagar `source` | Mostrar el origen |
| 5 | Volver a Overview | Cubierto por el punto 2 | Cubierto por el punto 2 |
| 6 | `view_itinerary` deja de ser no-op | Escribir estado | **Ya lo mandamos** |

---

## Anexo: cosas que ya están rotas

Esto no es parte del pedido, pero lo encontramos mientras auditábamos y conviene que
lo sepan.

### A. No se puede quitar ni cambiar de día una excursión

**Es el agujero más grave de todos.**

- No existe ningún intent de remove/deselect. Grep de
  `remove|deselect|unselect|reject|dismiss` sobre `domain/` y `app/` no devuelve nada
  aplicable; `upsert_basket_item` no tiene camino de borrado.
- Reenviar `select_experience` con otro día **acumula en vez de reemplazar**
  (`_basket_helpers.py:65-73`): mismo día es no-op, día distinto hace `append`. El
  docstring lo declara intencional — *"same experience on different days is allowed"*.

**Consecuencia:** si el usuario se equivoca de día, queda anotado en los dos, sin
vuelta atrás. El frontend no puede arreglar esto solo. Hoy lo mitigamos escondiendo el
selector una vez agregada la excursión, pero eso tapa el problema, no lo resuelve.

Sumado a esto: `sync_itinerary_experiences` **suprime el command cuando la lista está
vacía** (`select_experience.py:186-190`, `review_selection.py:43-47`), así que una lista
vacía nunca se transmite — lo que refuerza el mismo agujero.

### B. Dos commands se descartan en silencio

`transport.ts:33-58` tira cualquier command que falle el `safeParse`. Estos dos fallan
siempre:

| Command | Backend manda | Frontend espera |
| --- | --- | --- |
| `add_experience_to_basket` | `{experience_id}` (`select_experience.py:193`) | `{experience_id, day, passenger_count}` (`commands.ts:215-221`) |
| `soft_redirect` | `{reasonCode, suggestedIntent}` | `{reason_code, missing}` (`commands.ts:13-19`) |

Ninguno tiene impacto visible hoy — `sync_itinerary_experiences` ya trae la info del
basket, y `soft_redirect` solo pinta el enum crudo en un overlay de debug. Pero es
deuda: el día que quieran usarlos, no van a llegar.

**Decidan ustedes de qué lado se arregla** y nos avisan. Si van a converger a
snake_case, lo alineamos del lado del front.

### C. La documentación del backend no sirve como contrato

`docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md` (347 líneas) **no menciona
experiencias ni una sola vez** — ni `show_experience_detail`, ni
`sync_itinerary_experiences`, ni `add_experience_to_basket`. Documenta un set de
commands anterior.

`domain/ui_commands/contract.py` es un stub de 13 líneas sin unión de tipos ni
definiciones de payload, y `composer.py` tiene 11 líneas.

Hoy **los handlers son el único contrato real**. Lo decimos sin reproche —
simplemente, si alguien del front lee esos docs va a implementar mal.
