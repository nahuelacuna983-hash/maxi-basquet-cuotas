# Resumen del proyecto Maxi Basquet

## Objetivo

Crear una app web simple para gestionar cuotas, pagos y estado de jugadores de un equipo de Maxi Basquet.

La prioridad actual es permitir una prueba real con pocos jugadores desde sus celulares, manteniendo una experiencia simple para el jugador y un panel separado para administracion.

## Estado actual

La app ya funciona como MVP local y tiene una primera integracion multiusuario con Supabase.

La pantalla principal es `Mi cuota`. El jugador puede:

- elegir su nombre
- elegir mes a consultar
- ver cuanto debe
- ver estado del mes
- ver vencimiento
- informar un pago
- usar modo prueba de pago sin abrir Mercado Pago

El panel admin queda separado por PIN simple.

## Roles actuales

### Jugador

Es la vista por defecto. No ve paneles administrativos.

Puede:

- ver su cuota
- seleccionar mes
- informar pago

### Administrador

Se activa con PIN simple.

Puede:

- ver jugadores
- cargar jugadores
- importar jugadores masivamente
- cargar cuotas
- ajustar bases de cobro
- registrar pagos manuales
- aprobar pagos
- rechazar pagos
- eliminar pagos de prueba
- ver historial de pagos
- exportar/importar backup JSON
- quitar datos de prueba
- editar tesoreria
- ver morosos, cuotas, reportes y responsabilidad

### Usuario extendido/VIP

Queda como idea futura. No esta implementado.

## Datos que gestiona

Actualmente la app trabaja con:

- jugadores
- cuotas
- pagos
- asistencias
- ajustes de responsabilidad
- configuracion de tesoreria

Para la prueba multiusuario inicial con Supabase se sincronizan:

- `players`
- `fees`
- `payments`
- `treasury_config`

Asistencias y responsabilidad quedan todavia locales para no agrandar la migracion.

## Jugadores

Cada jugador tiene:

- nombre
- telefono
- tipo
- estado
- habilitado interno
- puntos de responsabilidad

Tipos:

- `competidor`
- `solo_entrenamientos`

Estados:

- `activo`
- `lesionado`
- `lista_espera`
- `esporadico`
- `baja`

Solo los jugadores `activo` cuentan para cuota mensual.

## Formula de cuotas

La app no calcula con todos los jugadores cargados, sino con jugadores facturables.

Jugador facturable:

- estado `activo`
- tipo `competidor` o `solo_entrenamientos`

Costos actuales:

- turno martes/jueves: `$55.000`
- domingo: `$90.000`

Los entrenamientos se dividen entre la base de cobro de entrenamientos.

Los domingos se dividen entre la base de cobro de domingos.

Si una base de cobro esta vacia, la app usa la cantidad real:

- jugadores activos para entrenamientos
- competidores activos para domingos

Esto permite cargar todo el plantel real, pero cobrar con una base prudente para no quedar cubriendo faltantes.

## Base de cobro

Cada cuota puede tener:

- base cobro entrenamientos
- base cobro domingos

Ejemplo con base `15 / 15`:

- abril competidor: aproximadamente `$60.000`
- abril solo entrenamientos: aproximadamente `$35.000`
- mayo competidor: aproximadamente `$60.000`
- mayo solo entrenamientos: aproximadamente `$30.000`

La app redondea siempre hacia arriba al multiplo de `$5.000`.

Ejemplos:

- `$57.600` pasa a `$60.000`
- `$52.500` pasa a `$55.000`
- `$29.333` pasa a `$30.000`

## Pagos

Los pagos pueden estar en tres estados:

- `pendiente`
- `aprobado`
- `rechazado`

Solo los pagos `aprobado` descuentan deuda.

El jugador informa:

- monto
- fecha
- metodo
- observacion o comprobante

Metodos:

- transferencia
- efectivo

El pago informado queda pendiente hasta validacion admin.

## Modo prueba de pago

La configuracion de tesoreria incluye:

- alias
- titular
- instrucciones
- link de pago
- modo prueba de pago

Mientras `paymentTestMode` esta activo:

- el boton `Pagar` no abre Mercado Pago
- muestra un mensaje indicando que es modo prueba
- el jugador debe usar `Informar pago`

Cuando se desactive:

- `Pagar` abre `paymentLink`

No hay integracion real con Mercado Pago API todavia.

## Persistencia local

La app guarda automaticamente en `localStorage`:

- jugadores
- cuotas
- pagos
- asistencias
- ajustes de responsabilidad
- configuracion de tesoreria

Tambien permite:

- exportar backup JSON
- importar backup JSON
- restablecer datos de prueba
- quitar datos de prueba

Esto sigue siendo util como respaldo aunque se use Supabase.

## Supabase

Se agrego una integracion minima opcional con Supabase.

Archivo de configuracion:

```txt
src/config/supabaseConfig.js
```

Tablas creadas:

- `players`
- `fees`
- `payments`
- `treasury_config`

SQL:

```txt
supabase/schema.sql
```

Guia:

```txt
supabase/README.md
```

La prueba confirmada:

- un pago informado desde la app llego a Supabase
- el admin lo vio
- el admin lo aprobo
- el estado paso a `aprobado`

## Limitaciones actuales

- El PIN admin no es login real.
- Las policies de Supabase estan abiertas para prueba MVP.
- GitHub Pages o deploy publico todavia no esta hecho para esta app.
- Asistencia y responsabilidad no estan migradas a Supabase.
- No hay Mercado Pago API.
- No hay PDF.
- No hay usuarios reales con autenticacion.
- No hay debito automatico.

## Prueba real con 3 o 4 jugadores

Flujo recomendado:

1. Verificar Supabase conectado.
2. Verificar jugadores, cuotas y bases de cobro.
3. Mantener `Modo prueba de pago` activo.
4. Compartir URL publica cuando este deployada.
5. Cada jugador selecciona su nombre.
6. Selecciona mes.
7. Informa pago.
8. Admin revisa `Validacion de pagos`.
9. Admin aprueba o rechaza.
10. Revisar que deuda baje solo si esta aprobado.
11. Exportar backup JSON al terminar.

## Proximo paso recomendado

Publicar la app para que no dependa de la misma red WiFi.

Opcion simple:

- subir a GitHub
- activar GitHub Pages
- usar Supabase como base compartida

La URL local `http://192.168.0.8:5174` solo funciona en la misma red.

Una URL de GitHub Pages funcionaria desde cualquier celular con internet.

## Decisiones pendientes

- Si se mantiene cuota mensual variable o se avanza a cuota anual proyectada.
- Si se implementa debito automatico con monto fijo.
- Como definir permisos reales para admin y jugadores.
- Si los esporadicos van a pagar eventos sueltos mas adelante.
- Si abril queda con interes o se ajusta manualmente.
- Como migrar asistencia y ranking a Supabase.

