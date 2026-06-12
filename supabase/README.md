# Supabase

Guia tecnica de Supabase para la MVP de cuotas.

SQL incremental de asistencia:

```txt
supabase/attendance-v1.sql
supabase/attendance-tags-v1.sql
supabase/attendance-guests-v1.sql
supabase/attendance-delete-guest-v1.sql
supabase/training-votes-v1.sql
supabase/player-billing-start-v1.sql
```

## Tablas principales

- `players`
- `fees`
- `payments`
- `attendances`
- `training_votes`
- `treasury_config`

## Seguridad actual

La app ya no depende de policies abiertas para las escrituras principales.

Estado:

- `players`: listado publico por RPC sin `access_code`; validacion de codigo por RPC; escritura admin por RPC.
- `fees`: lectura permitida; escritura directa bloqueada; escritura admin por RPC.
- `payments`: lectura de pagos activos; insercion de pagos pendientes; aprobacion/rechazo/eliminacion por RPC.
- `attendances`: lectura de listados; respuestas de jugador por RPC con codigo; correcciones admin por RPC; eliminacion de invitados por RPC.
- `training_votes`: lectura permitida; escritura de votos por RPC con codigo de jugador y ventana horaria.
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
- `admin_delete_guest_attendance`
- `submit_training_vote`

## Campos relevantes

`players`:

- `access_code`: codigo simple del jugador. No debe salir en el listado publico.
- `billing_start_month`: mes desde el que el jugador empieza a participar del cobro. Si esta vacio, conserva el comportamiento historico y cuenta desde las cuotas cargadas.

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
- `participant_type`: `player` o `guest`.
- `player_id`: jugador real; queda vacio para invitados.
- `guest_name`: nombre libre para invitados del listado temporal.
- `status`: `voy`, `no_voy`, `avisa_mas_tarde`, `llega_sobre_la_hora`, `baja_sobre_la_hora`, `asistio`, `falto` o `aviso_tarde`.
- `source`: `jugador` o `admin`. Para emoticones puede incluir tags, por ejemplo `jugador|tags=meat,cook`.

`training_votes`:

- `date`: fecha del entrenamiento votado.
- `voter_player_id`: jugador que voto.
- `featured_player_id`: jugador elegido como destacado.
- `award`: `pelota` o `copa`.
- `sponge_player_id`: jugador elegido como esponja.

## Nota de seguridad

La `anon key` puede estar en frontend si RLS y policies estan bien configuradas.
No usar ni publicar la `service_role key` en la app.

Antes de una version publica definitiva, el siguiente paso es Supabase Auth con roles reales.
