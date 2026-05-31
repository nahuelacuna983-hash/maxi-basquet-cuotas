# Control del proyecto

Ultima actualizacion: 2026-05-08

Este documento acompana al `README.md` y sirve para registrar avances, pendientes y estimacion de cierre.

## Regla de documentacion

A partir de ahora, cada cambio funcional importante debe actualizar documentacion.

Reglas:

- Si cambia el estado general del producto, actualizar `README.md`.
- Si cambia el plan, pendientes o estimacion, actualizar este archivo.
- Si se agrega una tabla, RPC o policy de Supabase, actualizar `README.md` y la documentacion de Supabase.
- Si se agrega una funcionalidad grande, registrar en este archivo que se completo y que queda pendiente.
- No considerar cerrado un cambio importante si no queda documentado.

## Estado resumido

La app esta en etapa MVP avanzada.

Ya permite:

- publicar la app en GitHub Pages
- compartir datos con Supabase
- acceso de jugador por codigo
- vista jugador enfocada en cobro
- consulta por mes
- informar pagos
- validar pagos desde admin
- calcular deuda con cuotas mensuales
- gestionar morosos
- configurar tesoreria
- registrar pagos manuales aprobados
- proteger escrituras principales con RPC
- registrar respuestas de listado temporal de entrenamientos

## Avances cerrados

- Pantalla `Mi cuota` para jugador.
- Selector de jugador y codigo de acceso.
- Link directo por jugador con `?player=...`.
- Carga de jugadores e importacion masiva.
- Estados de jugador: activo, lesionado, baja, lista de espera y esporadico.
- Tipo de jugador: competidor o solo entrenamientos.
- Carga mensual de cuotas.
- Bases de cobro para entrenamientos y domingos.
- Montos fijos historicos por mes para cuotas ya cobradas.
- Redondeo de cuota hacia arriba al multiplo de `$5.000`.
- Interes desde el dia 11.
- Informar pago como jugador.
- Informar pago pendiente.
- Carga admin de pago aprobado.
- Aprobar, rechazar y eliminar pagos.
- Historial de pagos.
- Borrado logico de pagos.
- Modo prueba de pago.
- Boton de pago configurable por link.
- Supabase conectado.
- GitHub Pages publicado.
- Listado temporal de entrenamientos para jugador comun.
- Policies endurecidas para `payments`.
- Policies endurecidas para `treasury_config`.
- Policies endurecidas para `fees`.
- Policies endurecidas para `players`.
- Validacion de codigo por RPC.
- Listado publico de jugadores sin exponer `access_code`.

## Pendiente inmediato

Antes de usar con todo el equipo:

- Limpiar jugadores de ejemplo, duplicados o invalidos.
- Revisar jugadores reales cargados.
- Revisar cuotas de abril y mayo.
- Dejar abril 2026 con monto fijo historico: competidor `$51.000`, solo entrenamientos `$30.000`.
- Confirmar bases de cobro reales por mes.
- Confirmar codigos de acceso de jugadores.
- Definir metodo de pago real antes de mandar el mensaje general.
- Probar circuito completo con 3 a 5 jugadores.
- Documentar SQL final completo de Supabase en `supabase/schema.sql`.

## Orden de trabajo acordado

Prioridad actual despues de la primera prueba:

1. Revisar flujo de pagos y cuotas del mes siguiente.
2. Pulir asistencia y listado temporal en celular.
3. Ordenar admin para que no sea una vista tipo sabana.
4. Volver a `Votaciones beta` y decidir si guarda votos reales.
5. Evaluar fixture/prode como modulo separado, al final del ciclo.

## Protocolo de backups

Antes de ampliar el uso real, se deben guardar dos puntos de restauracion.

1. Backup completo previo a limpieza:

```txt
backup-pre-limpieza-2026-05-08.json
```

Objetivo:

- conservar una foto completa del estado actual
- poder volver atras si la limpieza elimina algo necesario
- mantener pagos, pruebas y datos tal como estaban antes de ordenar

2. Backup limpio para prueba controlada:

```txt
backup-prueba-controlada-2026-05-08.json
```

Objetivo:

- guardar un estado sano antes de sumar mas jugadores
- dejar pagos de prueba fuera del circuito real
- dejar jugadores reales, cuotas y codigos revisados
- usarlo como punto de restauracion antes de operar con el equipo

La prueba controlada no debe empezar hasta tener el backup limpio exportado.

## Pendiente siguiente

Para version operativa mas firme:

- Supabase Auth para admin real.
- Roles reales: jugador y administrador.
- Auditoria de acciones admin.
- Mejor manejo de edicion/eliminacion de pagos.
- Mejorar pantalla admin sin redisenar todo.
- Definir si se mantiene GitHub Pages o si se migra a Next.js/Vercel.
- Evaluar dominio propio.

## Pendiente funcional

Queda fuera de la MVP de cobro actual:

- asistencia real martes/jueves por jugador
- cierre de jornada con destacados
- ranking de responsabilidad calculado desde eventos
- reporte WhatsApp mas completo
- habilitados por liga
- convocatoria automatica mas completa
- Mercado Pago API
- debito automatico
- PDF
- graficos
- modulo VIP o usuario extendido
- cocina/lavado

## Estimacion de cierre

Las fechas dependen de mantener el alcance controlado.

Estimacion actual:

- MVP de cobro segura: 90-95% completa.
- Prueba controlada con jugadores reales: 1 semana.
- MVP usable con todo el equipo: semana del 11 al 17 de mayo de 2026, si la prueba controlada no muestra errores graves.
- Version 1.0 con asistencia basica y admin mas ordenado: fines de mayo o primera semana de junio de 2026.
- Version mas completa con Auth real, asistencia, ranking, reportes y pagos mas automatizados: junio de 2026 o despues, segun alcance.

## Criterio de MVP cerrada

La MVP de cobro se considera cerrada cuando:

- todos los jugadores reales estan cargados
- cada jugador tiene codigo
- cuotas reales estan cargadas
- 3 a 5 jugadores probaron acceso e informe de pago
- admin pudo aprobar/rechazar
- deuda se recalculo bien
- no reaparecen pagos eliminados
- existen backup previo a limpieza y backup limpio de prueba controlada
- README y control del proyecto estan actualizados

## Ultimo estado conocido

Al 2026-05-08:

- La app esta publicada.
- Supabase esta conectado.
- Tablas principales estan protegidas por RPC/policies.
- La vista jugador sigue funcionando.
- Se exporto backup previo y se eliminaron logicamente 10 pagos de prueba.
- La prueba controlada salio bien.
- Se exporto backup post-prueba, se eliminaron logicamente 5 pagos de prueba y se genero backup limpio final.
- Se definio metodo de pago intermedio por alias Mercado Pago `maxisuda`.
- Se corrigio el monto sugerido al cambiar jugador o mes en `Mi cuota`.
- Se ajustaron textos de pago para no prometer adjunto de comprobante.
- Se agrego instalacion simple en celular como PWA, sin cache agresivo.
- Se comenzo Asistencia v1 con listado temporal martes/jueves y estados de respuesta.
- Para activar Asistencia v1 multiusuario falta ejecutar `supabase/attendance-v1.sql`.
- Quedan 0 pagos activos en Supabase.
- El siguiente trabajo recomendado es validar instrucciones de pago en la app y luego preparar el mensaje general al equipo.

Al 2026-05-09:

- Se ejecuto y verifico `supabase/attendance-v1.sql`.
- La tabla `attendances` responde correctamente.
- Las RPC `submit_training_attendance` y `admin_upsert_attendance` quedaron disponibles.
- Se ajusto la PWA para que la app instalada revise versiones nuevas, evite cache viejo y se recargue sola cuando haya cambios publicados.
- Se separo la vista publica en pestanas `Mi cuota` y `Entrenamientos`, sin modificar logica de cobro ni asistencia.
- Se ordenaron los jugadores por apellido/nombre, se cambio el texto publico de no respuesta a `Todavia no respondieron` y el modulo admin de asistencia quedo nombrado como correccion.
- Se agrego `docs/manual-admin.md` con explicacion de que es cada modulo, para que sirve, por que se usa asi, como usarlo y que evitar.
- Se reorganizo el panel admin en pestanas para evitar la vista tipo sabana sin cambiar logica ni datos.
- Se agregaron secciones base de `Estadisticas`, `Convocatorias` y `VIP` para que el mapa funcional de la app quede completo.
- Se cargo asistencia historica inicial en Supabase: 113 registros, 110 asistencias y 3 bajas sobre la hora.
- Se corrigio el descuento de responsabilidad para `baja_sobre_la_hora`.
- Se agrego descuento por ausencias inferidas: si un jugador activo no aparece en un entrenamiento cerrado, la app lo cuenta como ausente para responsabilidad y estadisticas sin crear registros falsos.

Al 2026-05-19:

- Se mejoro la claridad del informe de pago en celular: el jugador ve una tarjeta visible cuando ya informo, cuando esta aprobado o cuando fue rechazado.
- Si un pago esta pendiente o aprobado para ese mes, la app oculta el boton de pagar y el formulario para evitar duplicados.
- Se agrego `Respuesta admin` para que el administrador pueda anotar `Voy`, `No voy`, `Avisa mas tarde`, `Llega sobre la hora`, `Falto`, `Aviso tarde` o `Baja sobre la hora` por un jugador que no pudo usar la app.
- Se corrigio la fecha de `Respuesta admin`: la sincronizacion con Supabase ya no pisa la fecha elegida ni vuelve automaticamente al 06/04/2026.
- Se agrego soporte para jueves con `Solo cena`, lista secundaria de cena y emoticones opcionales por jugador sin repetir.
- Para que los emoticones queden compartidos por Supabase, se agrego `supabase/attendance-tags-v1.sql`.

Al 2026-05-24:

- Las estadisticas de asistencia y responsabilidad pasan a considerar todos los martes y jueves cerrados desde `attendanceStartDate`, aunque no exista ningun registro de esa fecha.
- Si una jornada cerrada no tiene respuestas, todos los jugadores activos cuentan como ausentes inferidos.
- La pestaña `Estadisticas` muestra cantidad de jornadas cerradas y cuantas no tuvieron ninguna respuesta.
- Se agrego la primera version de `Informes`: individual, pagos general, asistencia general, responsabilidad general, general del equipo y graficos simples.
- Los informes se generan en pantalla y se pueden copiar como texto; no modifican datos ni agregan PDF.
- Se agrego carga admin de invitados en el listado temporal. Los invitados aparecen como `Nombre (invitado)` y no crean jugadores ni afectan cuota/deuda/responsabilidad.
- Se agrego `supabase/attendance-guests-v1.sql` para que Supabase permita invitados sin romper la clave foranea de jugadores reales.
- Se agrego eliminacion admin de invitados del listado temporal mediante `supabase/attendance-delete-guest-v1.sql`.
- Se agrego edicion directa del estado de jugador desde la tabla de jugadores, para pasar por ejemplo de `Lesionado` a `Activo` sin recargarlo.
- Se agrego persistencia local del acceso de jugador en la app instalada para que al minimizar o reabrir no vuelva a pedir codigo. El modo admin sigue sin persistirse.
- Se agrego creacion admin de la cuota del mes siguiente para registrar pagos anticipados.
- Se ajusto el flujo de pagos anticipados: los selectores indican si el mes es anterior, actual o futuro, y al crear la cuota siguiente los formularios de pago quedan preseleccionados en ese nuevo mes.
- Se pulio la vista celular del listado temporal con contadores por bloque, botones mas tocables, numeros visibles y scroll interno para la lista de `No me interesa`.
- Se agrego emoticon `🧽` para lavado/platos en el listado de jueves.
- Se agrego pestaña admin `Votaciones beta` para simular destacado con premio y voto esponja por entrenamiento sin mostrarlo a jugadores ni guardar votos.
