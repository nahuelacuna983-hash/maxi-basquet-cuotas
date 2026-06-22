# Maxi Basquet Cuotas

App web MVP para gestionar cuotas, pagos y deuda de un equipo de Maxi Basquet.

URL publica:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

## Estado actual

- MVP cerrada para uso controlado con jugadores reales.
- App publicada en GitHub Pages.
- Datos compartidos con Supabase.
- Vista jugador separada en pestanas: `Mi cuota` y `Entrenamientos`.
- Jugadores mostrados por apellido y nombre, ordenados alfabeticamente.
- Acceso simple por codigo de jugador.
- La app instalada recuerda el acceso del jugador en ese dispositivo para no pedir codigo al minimizar o reabrir.
- Link directo por jugador con `?player=ID_DEL_JUGADOR`.
- Modo admin con PIN simple.
- Panel admin organizado por pestanas y subtabs internos para ver una sola herramienta por vez.
- Estado y tipo de jugador editables desde la tabla admin.
- Secciones base disponibles para estadisticas, convocatorias y VIP.
- Votacion real v1: despues del entrenamiento bloquea la vista jugador hasta guardar destacado y esponja.
- Asistencia historica inicial cargada para iniciar estadisticas reales.
- Responsabilidad descuenta bajas, faltas explicitas, `No voy` con penalidad menor y ausencias inferidas de jugadores activos en entrenamientos cerrados.
- Las estadisticas consideran todos los martes y jueves cerrados desde el `2026-04-02`, primer dia de datos historicos cargados, aunque no haya ningun registro cargado.
- Seleccion de mes para consultar abril, mayo u otras cuotas cargadas.
- Pagos con estado `pendiente`, `aprobado` o `rechazado`.
- Solo pagos aprobados descuentan deuda.
- Proteccion para no duplicar pagos por jugador y cuota.
- Borrado logico de pagos con `deleted_at`.
- Modo prueba de pago configurable.
- Metodo de pago real por alias Mercado Pago `maxisuda`.
- Instalable en celular como PWA simple.
- Listado temporal de entrenamientos martes/jueves.
- Informes MVP por jugador, pagos general, asistencia general, responsabilidad general, historial detallado, resumen de equipo y graficos simples.
- Escrituras principales protegidas con RPC en Supabase.

## Criterio de cambios

La version actual queda congelada como base operativa. Las proximas modificaciones deben salir de uso real: textos confusos, problemas de celular, datos mal calculados o acciones admin que resulten dificiles. No se agregan modulos grandes hasta tener esa devolucion.

## Vista jugador

El jugador puede:

- seleccionar su nombre
- ingresar su codigo de acceso
- elegir el mes a consultar
- ver cuota esperada
- ver pagado aprobado
- ver saldo pendiente
- ver si esta al dia, pendiente o moroso
- ver deuda atrasada
- ver proxima cuota estimada
- ver alias e instrucciones de pago
- informar pago
- ver una tarjeta clara cuando el pago ya fue informado, aprobado o rechazado
- responder al listado temporal de entrenamiento cuando esta abierto
- marcar `Solo cena` los jueves y sumar emoticones opcionales como cena, cocinero, vino, pan o bebida
- ver el listado de entrenamiento separado de la cuota

Link directo por jugador:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/?player=ID_DEL_JUGADOR
```

El link selecciona al jugador, pero igual pide codigo.

## Admin

El modo admin se activa con PIN simple.

Permite:

- ver jugadores
- cargar jugadores
- importar jugadores masivamente
- asignar codigo de acceso
- modificar habilitado interno
- cargar cuotas
- ajustar bases de cobro
- registrar pagos manuales desde admin
- aprobar pagos pendientes
- rechazar pagos pendientes
- eliminar pagos de prueba
- ver historial de pagos
- anotar o corregir una respuesta de entrenamiento por un jugador que no pudo usar la app
- exportar/importar backup JSON
- editar configuracion de tesoreria

## Supabase

Configuracion:

```txt
src/config/supabaseConfig.js
```

SQL base:

```txt
supabase/schema.sql
```

Tablas principales:

- `players`
- `fees`
- `payments`
- `attendances`
- `training_votes`
- `treasury_config`

Funciones RPC usadas por la app:

- `list_public_players`
- `admin_list_players`
- `validate_player_access`
- `admin_upsert_player`
- `admin_upsert_fee`
- `submit_payment`
- `submit_training_attendance`
- `submit_training_vote`
- `admin_upsert_attendance`
- `admin_delete_guest_attendance`
- `admin_review_payment`
- `admin_soft_delete_payment`
- `admin_update_treasury_config`

SQL adicional para emoticones de entrenamiento:

```txt
supabase/attendance-tags-v1.sql
```

SQL adicional para invitados en listado temporal:

```txt
supabase/attendance-guests-v1.sql
supabase/attendance-delete-guest-v1.sql
```

## Seguridad MVP

Estado actual:

- `payments`: lectura permitida de pagos activos; insercion de pagos pendientes; update/delete directo bloqueado.
- `treasury_config`: lectura permitida; escritura directa bloqueada; cambios por RPC admin.
- `fees`: lectura permitida; escritura directa bloqueada; cambios por RPC admin.
- `players`: lectura directa bloqueada; listado publico por RPC sin `access_code`; validacion de codigo por RPC; cambios admin por RPC.

Importante:

- Todavia no hay login real.
- El PIN admin y el codigo de jugador son barreras simples para una prueba controlada.
- Antes de uso publico definitivo conviene agregar Supabase Auth y roles reales.
- La `anon key` de Supabase puede vivir en frontend si RLS/policies estan bien configuradas; no se debe exponer una `service_role key`.

## Pagos

Estados:

- `pendiente`
- `aprobado`
- `rechazado`

Reglas:

- Solo `aprobado` descuenta deuda.
- Un jugador no puede informar dos pagos activos para la misma cuota.
- Si el admin carga un pago para una cuota que ya tiene pago, la app pregunta si quiere reemplazar.
- El pago se aplica al mes seleccionado, no automaticamente al mes de la fecha.
- Los pagos eliminados quedan con `deleted_at` y no vuelven a aparecer.

Metodo actual:

- Alias Mercado Pago: `maxisuda`.
- El jugador paga desde su billetera, banco o Mercado Pago.
- Luego vuelve a la app y toca `Informar pago`.
- La app no adjunta archivos todavia; solo registra numero de operacion u observacion.
- El pago queda pendiente hasta validacion de Tesoreria.

## Cuotas

La cuota se calcula por mes.

Costos actuales:

- Turno martes/jueves: `$55.000`
- Domingo: `$90.000`

Cada cuota puede definir:

- base de cobro entrenamientos
- base de cobro domingos
- monto fijo historico para solo entrenamientos
- monto fijo historico para competidor
- porcentaje de interes desde el dia 11

La app redondea hacia arriba al multiplo de `$5.000`.

Si una cuota tiene montos fijos historicos, esos montos reemplazan la formula normal solo para ese mes.

Desde admin se puede crear la cuota del mes siguiente a partir de la ultima cuota cargada. Esa cuota queda como mes real para registrar pagos anticipados. No copia montos fijos historicos.

Los selectores de mes muestran si una cuota es `mes anterior`, `mes actual` o `cuota futura`. Al crear una cuota futura, los formularios de carga de pago quedan preseleccionados en ese nuevo mes para reducir errores al registrar pagos anticipados.

## Asistencia / listado temporal

Para activar esta parte en Supabase hay que ejecutar:

```txt
supabase/attendance-v1.sql
```

Hasta que ese SQL no este ejecutado, la app oculta el listado temporal en la vista publica para no romper pagos.

Reglas de la primera version:

- Martes abre el viernes anterior.
- Jueves abre el miercoles anterior.
- El listado publico cierra para respuestas el mismo dia a las `20:30`.
- Despues de las `20:30`, el listado queda visible solo como consulta hasta fin del dia.
- Desde las `12:00` aparece `Baja sobre la hora`.
- Entrenamientos no tienen maximo de jugadores.
- Minimo sugerido para entrenar: `10`.
- `Todavia no respondieron` muestra jugadores activos sin respuesta.
- Los jugadores `Esporadicos` pueden anotarse cuando participan, pero no pagan cuota mensual ni aparecen como ausentes si no responden.
- `No voy` queda registrado, no aparece en el listado principal y resta menos que no responder.
- Admin conserva el historico para presentismo y estadisticas.
- Si un martes o jueves ya cerro y nadie respondio, la fecha cuenta igual para estadisticas: todos los jugadores activos quedan como ausentes inferidos.
- En responsabilidad: no responder resta 10, `No voy` resta 2 y acumular 3 o mas `No voy/Falto` en un mes suma 5 puntos extra de descuento.
- En modo admin se puede agregar o quitar un invitado del listado temporal. El invitado aparece como `Nombre (invitado)`, no se crea como jugador y no afecta cuotas, deuda ni responsabilidad.
- En jueves se pueden agregar emoticones opcionales, incluida esponja `🧽` para lavado/platos.

- En celular, el listado muestra contadores por bloque, evita que se corten los numeros y deja la lista larga de `No me interesa` con scroll interno para no tapar toda la pantalla.

## Votaciones de entrenamiento

La votacion de entrenamiento se abre despues del entrenamiento y guarda votos reales en Supabase.

Reglas actuales:

- Aparece como pantalla pendiente para jugadores con codigo de acceso que participaron.
- Se abre a las 22:01 del dia del entrenamiento.
- Cierra al dia siguiente a las 23:59.
- Lee asistencias ya cargadas.
- Propone como candidatos a jugadores reales con `Voy`, `Avisa mas tarde`, `Llega sobre la hora` o `Asistio`.
- Guarda un `Destacado` con premio `Pelota` o `Copa`, y un voto separado de `Esponja`.
- Si el jugador tiene una votacion pendiente, no puede usar `Mi cuota` o `Entrenamientos` hasta guardar.
- No modifica todavia responsabilidad ni estadisticas.

## Informes

La pestana `Reportes` permite generar:

- informe individual por jugador
- pagos general
- asistencia general
- responsabilidad general
- general del equipo
- historial detallado
- graficos simples

El `Historial detallado` muestra pagos, asistencia/no respuestas y votaciones guardadas en el periodo elegido. No modifica datos y no genera PDF todavia.

## Altas nuevas y deuda historica

Cada jugador puede tener `Inicio cobro`, con formato `AAAA-MM`.

- Si esta vacio, el jugador cuenta como antes para todas las cuotas cargadas.
- Si tiene un mes, por ejemplo `2026-06`, no se le calcula deuda de cuotas anteriores.
- Ese jugador tampoco entra en el divisor automatico de meses anteriores.

Esto sirve para jugadores agregados tarde, invitados que pasan a ser activos o altas nuevas que no deben abril/mayo.

Estados de jugador:

- `Voy`
- `No voy`
- `Avisa mas tarde`
- `Llega sobre la hora`
- `Baja sobre la hora`

## Prueba real actual

Prueba recomendada:

1. Exportar backup completo previo a limpieza.
2. Limpiar pagos de prueba y datos invalidos.
3. Revisar jugadores, codigos, tipos, estados y cuotas reales.
4. Exportar backup limpio para prueba controlada.
5. Asignar codigos a 3-5 jugadores.
6. Pedirles que entren a la URL publica.
7. Cada jugador elige su nombre e ingresa su codigo.
8. Cada jugador informa pago del mes correspondiente.
9. Admin aprueba o rechaza.
10. Verificar que la deuda baje solo con pagos aprobados.

Nombres sugeridos de backup:

```txt
backup-pre-limpieza-2026-05-08.json
backup-prueba-controlada-2026-05-08.json
```

Mensaje base para jugadores:

```txt
Entra aca:
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/

1. Elegi tu nombre.
2. Ingresa tu codigo.
3. Elegi el mes a pagar.
4. Revisa el monto.
5. Informa el pago con monto, fecha, metodo y numero de operacion u observacion.
6. Avisame cuando termines.

El pago queda pendiente hasta que lo valide el administrador.
```

## Instalar en celular

La app funciona como PWA simple. No pasa por Play Store ni App Store.

Android:

1. Abrir la URL publica en Chrome.
2. Tocar el menu de tres puntos.
3. Elegir `Instalar app` o `Agregar a pantalla principal`.
4. Abrirla desde el icono `Maxi Cuotas`.

iPhone:

1. Abrir la URL publica en Safari.
2. Tocar compartir.
3. Elegir `Agregar a inicio`.
4. Abrirla desde el icono `Maxi Cuotas`.

La app necesita internet para consultar Supabase. El service worker no cachea datos para evitar que el celular use versiones viejas. Cuando se publica una version nueva, la app instalada revisa actualizaciones y se recarga sola.

## Lo que falta

Para cerrar una version mas firme:

- documentar SQL final completo de Supabase en `supabase/schema.sql`
- revisar datos de prueba y limpiar pagos de prueba antes de operar real
- agregar Supabase Auth para admin real
- separar roles reales: jugador, admin y posible usuario extendido
- mejorar auditoria de acciones admin
- definir si se mantiene GitHub Pages o se migra a Next.js/Vercel
- evaluar dominio propio

Funcionalidades pendientes:

- asistencia real de martes/jueves por jugador
- cierre de jornada con destacados
- ranking de responsabilidad calculado desde eventos
- reporte WhatsApp mas completo
- Mercado Pago API o debito automatico
- PDF
- graficos
- modulo VIP/extendido
- cocina/lavado, si finalmente se decide incluir

## Desarrollo local

Con Vite:

```bash
npm run dev
```

URL local:

```txt
http://127.0.0.1:5173/
```

URL LAN, cambiando la IP por la de la PC:

```txt
http://192.168.0.8:5173/
```

## Documentacion

Control de avance, pendientes y estimacion:

```txt
docs/control-proyecto.md
```

Resumen general:

```txt
docs/resumen-proyecto.md
```

Manual de uso admin:

```txt
docs/manual-admin.md
```

Publicacion en GitHub Pages:

```txt
docs/publicacion-github-pages.md
```

Guia Supabase:

```txt
supabase/README.md
```

Asistencia historica inicial:

```txt
docs/asistencia-historica-2026-04.md
```

## Advertencia MVP

Esta version es usable para prueba controlada con jugadores reales, pero todavia no debe considerarse una app publica definitiva. El proximo salto de seguridad serio es agregar autenticacion real con Supabase Auth y roles.

## Dependencias publicadas

La app usa una copia local de Supabase JS en `src/vendor/supabase.umd.js`. Esto evita que celulares o redes que bloquean CDNs externos fallen al guardar pagos o asistencias.
