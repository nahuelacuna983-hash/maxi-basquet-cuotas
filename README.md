# Maxi Basquet Cuotas

App web MVP para gestionar cuotas, pagos y deuda de un equipo de Maxi Basquet.

URL publica:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

## Estado actual

- App publicada en GitHub Pages.
- Datos compartidos con Supabase.
- Vista jugador enfocada en pago: `Mi cuota`.
- Acceso simple por codigo de jugador.
- Link directo por jugador con `?player=ID_DEL_JUGADOR`.
- Modo admin con PIN simple.
- Seleccion de mes para consultar abril, mayo u otras cuotas cargadas.
- Pagos con estado `pendiente`, `aprobado` o `rechazado`.
- Solo pagos aprobados descuentan deuda.
- Proteccion para no duplicar pagos por jugador y cuota.
- Borrado logico de pagos con `deleted_at`.
- Modo prueba de pago configurable.
- Escrituras principales protegidas con RPC en Supabase.

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
- informar pago

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
- registrar pagos manuales aprobados
- aprobar pagos pendientes
- rechazar pagos pendientes
- eliminar pagos de prueba
- ver historial de pagos
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
- `treasury_config`

Funciones RPC usadas por la app:

- `list_public_players`
- `admin_list_players`
- `validate_player_access`
- `admin_upsert_player`
- `admin_upsert_fee`
- `submit_payment`
- `admin_review_payment`
- `admin_soft_delete_payment`
- `admin_update_treasury_config`

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
5. Informa el pago con monto, fecha, metodo y observacion.
6. Avisame cuando termines.

El pago queda pendiente hasta que lo valide el administrador.
```

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

Publicacion en GitHub Pages:

```txt
docs/publicacion-github-pages.md
```

Guia Supabase:

```txt
supabase/README.md
```

## Advertencia MVP

Esta version es usable para prueba controlada con jugadores reales, pero todavia no debe considerarse una app publica definitiva. El proximo salto de seguridad serio es agregar autenticacion real con Supabase Auth y roles.
