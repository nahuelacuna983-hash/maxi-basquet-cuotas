# Resumen del proyecto Maxi Basquet

## Objetivo

Crear una app web simple para que un equipo de Maxi Basquet pueda gestionar cuotas, pagos, deuda y estado de cobro desde celulares.

La prioridad actual es cerrar una prueba real controlada con pocos jugadores, usando GitHub Pages como publicacion y Supabase como base compartida.

## Estado actual

La app ya esta publicada y conectada a Supabase.

URL publica:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

La pantalla principal es `Mi cuota`. El jugador solo ve su experiencia de cobro.

El panel admin esta separado por PIN simple.

## Roles actuales

### Jugador

Vista por defecto.

Puede:

- seleccionar su nombre
- ingresar codigo de acceso
- elegir mes a consultar
- ver cuanto debe
- ver estado del mes
- informar pago

No ve:

- tabla de jugadores
- morosos generales
- ranking
- reportes
- configuracion
- tesoreria admin

### Administrador

Modo protegido por PIN simple.

Puede:

- ver jugadores
- cargar jugadores
- importar jugadores masivamente
- asignar codigo de acceso
- cargar cuotas
- ajustar bases de cobro
- registrar pagos manuales
- aprobar pagos
- rechazar pagos
- eliminar pagos de prueba
- ver historial de pagos
- exportar/importar backup JSON
- editar tesoreria
- ver morosos, cuotas, reportes y responsabilidad

### Usuario extendido/VIP

Queda como idea futura. No esta implementado.

## Acceso por jugador

Cada jugador puede tener un codigo simple en:

```txt
players.access_code
```

La app pide:

- jugador
- codigo

Si el codigo coincide, muestra la informacion de cuota.

Si no coincide, no muestra los datos economicos.

Tambien se puede usar link directo:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/?player=ID_DEL_JUGADOR
```

El link selecciona al jugador, pero igual pide codigo.

Esto no es login real. Es una barrera minima para prueba MVP.

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

Asistencias y responsabilidad quedan todavia fuera de la prueba multiusuario principal.

## Jugadores

Cada jugador tiene:

- nombre
- telefono
- tipo
- estado
- habilitado interno
- puntos de responsabilidad
- codigo de acceso

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

La app calcula la cuota mensual con jugadores facturables.

Jugador facturable:

- estado `activo`
- tipo `competidor` o `solo_entrenamientos`

Costos actuales:

- turno martes/jueves: `$55.000`
- domingo: `$90.000`

Los entrenamientos se dividen entre la base de cobro de entrenamientos.

Los domingos se dividen entre la base de cobro de domingos.

Si una base esta vacia, la app usa cantidad real:

- jugadores activos para entrenamientos
- competidores activos para domingos

Esto permite cargar todo el plantel real, pero cobrar con una base prudente.

## Base de cobro

Cada cuota puede tener:

- base cobro entrenamientos
- base cobro domingos

Ejemplo con base `15 / 15`:

- competidor: aproximadamente `$60.000`
- solo entrenamientos: aproximadamente `$30.000` a `$35.000`, segun mes

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

Solo `aprobado` descuenta deuda.

El jugador informa:

- monto
- fecha
- metodo
- observacion o comprobante

Metodos:

- transferencia
- efectivo

Reglas actuales:

- El pago informado queda pendiente hasta validacion admin.
- Un jugador no puede informar dos pagos activos para la misma cuota.
- Si el admin carga un pago para una cuota que ya tiene pago, la app pregunta si reemplaza los anteriores.
- El pago se aplica al mes seleccionado.
- La fecha del pago es solo la fecha real en que dice haber pagado.

## Borrado de pagos

Los pagos no se borran fisicamente.

Se usa borrado logico:

```txt
payments.deleted_at
```

La app ignora pagos con `deleted_at`.

Esto evita que pagos eliminados reaparezcan por sincronizacion entre dispositivos.

## Modo prueba de pago

La configuracion de tesoreria incluye:

- alias
- titular
- instrucciones
- link de pago
- modo prueba de pago

Mientras `paymentTestMode` esta activo:

- el boton `Pagar` no abre Mercado Pago
- muestra mensaje de modo prueba
- el jugador debe usar `Informar pago`

Cuando se desactive:

- `Pagar` abre `paymentLink`

No hay integracion real con Mercado Pago API todavia.

## Persistencia local

La app guarda automaticamente en `localStorage`.

Guarda:

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

Aunque Supabase este activo, el backup local sigue siendo util como respaldo.

## Supabase

Archivo de configuracion:

```txt
src/config/supabaseConfig.js
```

Tablas:

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

- un jugador informa pago desde celular
- el pago llega a Supabase
- el admin lo ve
- el admin aprueba/rechaza
- solo aprobado descuenta deuda

## Prueba real con jugadores

Flujo recomendado:

1. Asignar codigo a 3-5 jugadores.
2. Limpiar pagos de prueba si hace falta.
3. Mantener `Modo prueba de pago` activo.
4. Compartir la URL publica.
5. Cada jugador selecciona nombre e ingresa codigo.
6. Cada jugador informa pago de abril.
7. Cada jugador informa pago de mayo.
8. Admin revisa `Validacion de pagos`.
9. Admin aprueba o rechaza.
10. Revisar que deuda baje solo si esta aprobado.

Mensaje base:

```txt
Entrá acá:
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/

1. Elegí tu nombre.
2. Ingresá tu código.
3. Elegí 04/2026.
4. Informá pago de abril con observación "prueba abril".
5. Después elegí 05/2026.
6. Informá pago de mayo con observación "prueba mayo".
7. Avisame cuando termines.

No hace falta transferir plata real durante la prueba.
```

## Limitaciones actuales

- El PIN admin no es login real.
- El codigo de jugador no es autenticacion real.
- Las policies de Supabase estan abiertas para prueba MVP.
- No hay Supabase Auth.
- No hay Mercado Pago API.
- No hay PDF.
- No hay debito automatico.
- Asistencia y responsabilidad no estan cerradas para prueba multiusuario.

## Decisiones pendientes

- Como pasar de codigo simple a login real.
- Si se mantiene cuota mensual variable o se avanza a cuota anual proyectada.
- Si se implementa debito automatico con monto fijo.
- Como definir permisos reales para admin y jugadores.
- Si los esporadicos pagaran eventos sueltos.
- Como migrar asistencia y ranking a Supabase.
