# Maxi Basquet Cuotas

App web MVP para gestionar cuotas, pagos y deuda de un equipo de Maxi Basquet.

## Estado actual

- App publicada en GitHub Pages.
- Datos compartidos con Supabase.
- Vista jugador enfocada en pago: `Mi cuota`.
- Acceso simple por codigo de jugador.
- Modo admin con PIN simple.
- Seleccion de mes para consultar abril, mayo u otras cuotas cargadas.
- Pagos informados con estado `pendiente`, `aprobado` o `rechazado`.
- Solo pagos aprobados descuentan deuda.
- Proteccion para no duplicar pagos por jugador y cuota.
- Borrado logico de pagos con `deleted_at`.
- Modo prueba de pago configurable.

URL publica:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

## Vista jugador

El jugador puede:

- seleccionar su nombre
- ingresar su codigo de acceso
- elegir el mes a consultar
- ver cuota esperada
- ver pagado aprobado
- ver saldo pendiente
- ver si esta al dia, pendiente o moroso
- informar pago

Tambien se puede preparar un link directo por jugador:

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
- cargar cuotas
- ajustar bases de cobro
- registrar pagos manuales
- aprobar pagos
- rechazar pagos
- eliminar pagos de prueba
- ver historial
- exportar/importar backup JSON
- editar tesoreria

## Supabase

La configuracion esta en:

```txt
src/config/supabaseConfig.js
```

SQL del esquema:

```txt
supabase/schema.sql
```

Tablas sincronizadas:

- `players`
- `fees`
- `payments`
- `treasury_config`

Campos importantes:

- `players.access_code`: codigo simple de acceso por jugador.
- `payments.deleted_at`: borrado logico para evitar que pagos eliminados reaparezcan.

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

## Cuotas

La cuota se calcula por mes.

Costos actuales:

- Turno martes/jueves: `$55.000`
- Domingo: `$90.000`

Cada cuota puede definir:

- base de cobro entrenamientos
- base de cobro domingos
- porcentaje de interes desde el dia 11

La app redondea hacia arriba al multiplo de `$5.000`.

## Prueba real actual

Prueba recomendada:

1. Limpiar pagos de prueba si hace falta.
2. Asignar codigos a 3-5 jugadores.
3. Pedirles que entren a la URL publica.
4. Cada jugador informa pago de abril.
5. Cada jugador informa pago de mayo.
6. Admin aprueba o rechaza.
7. Verificar que la deuda baje solo con pagos aprobados.

Mensaje base para jugadores:

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

Resumen general:

```txt
docs/resumen-proyecto.md
```

Publicacion en GitHub Pages:

```txt
docs/publicacion-github-pages.md
```

Guia Supabase:

```txt
supabase/README.md
```

## Advertencia MVP

Esta version todavia no tiene login real. El codigo de jugador y el PIN admin son barreras simples para una prueba controlada. Las policies de Supabase estan abiertas para MVP; antes de usarlo como app publica definitiva hay que agregar autenticacion y permisos reales.
