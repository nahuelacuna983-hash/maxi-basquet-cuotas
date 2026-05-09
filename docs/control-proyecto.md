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
