# Supabase

Guia tecnica de Supabase para la MVP de cuotas.

SQL incremental de asistencia:

```txt
supabase/attendance-v1.sql
```

## Tablas principales

- `players`
- `fees`
- `payments`
- `attendances`
- `treasury_config`

## Seguridad actual

La app ya no depende de policies abiertas para las escrituras principales.

Estado:

- `players`: listado publico por RPC sin `access_code`; validacion de codigo por RPC; escritura admin por RPC.
- `fees`: lectura permitida; escritura directa bloqueada; escritura admin por RPC.
- `payments`: lectura de pagos activos; insercion de pagos pendientes; aprobacion/rechazo/eliminacion por RPC.
- `attendances`: lectura de listados; respuestas de jugador por RPC con codigo; correcciones admin por RPC.
- `treasury_config`: lectura permitida; escritura admin por RPC.

## RPC usadas

- `list_public_players`
- `admin_list_players`
- `validate_player_access`
- `admin_upsert_player`
- `admin_upsert_fee`
- `submit_payment`
- `admin_review_payment`
- `admin_soft_delete_payment`
- `admin_update_treasury_config`
- `submit_training_attendance`
- `admin_upsert_attendance`

## Campos relevantes

`players`:

- `access_code`: codigo simple del jugador. No debe salir en el listado publico.

`fees`:

- `training_billing_base`: base de cobro para entrenamientos.
- `sunday_billing_base`: base de cobro para domingos.
- `fixed_training_only_amount`: monto fijo historico para solo entrenamientos.
- `fixed_competitor_amount`: monto fijo historico para competidores.

`payments`:

- `status`: `pendiente`, `aprobado` o `rechazado`.
- `deleted_at`: borrado logico.

`attendances`:

- `date`: fecha del entrenamiento.
- `event_type`: por ahora `entrenamiento`.
- `status`: `voy`, `no_voy`, `avisa_mas_tarde`, `llega_sobre_la_hora`, `baja_sobre_la_hora`, `asistio`, `falto` o `aviso_tarde`.
- `source`: `jugador` o `admin`.

## Nota de seguridad

La `anon key` puede estar en frontend si RLS y policies estan bien configuradas.
No usar ni publicar la `service_role key` en la app.

Antes de una version publica definitiva, el siguiente paso es Supabase Auth con roles reales.
