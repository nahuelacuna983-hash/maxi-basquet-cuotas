# Supabase

Guia tecnica de Supabase para la MVP de cuotas.

SQL incremental:

```txt
supabase/attendance-v1.sql
supabase/attendance-tags-v1.sql
supabase/attendance-guests-v1.sql
supabase/attendance-delete-guest-v1.sql
supabase/training-votes-v1.sql
supabase/player-billing-start-v1.sql
supabase/player-birthdays-v1.sql
supabase/player-documents-v1.sql
supabase/treasury-cash-v1.sql
supabase/treasury-cash-auto-v1.sql
supabase/treasury-movement-categories-v1.sql
supabase/scholarships-v1.sql
```

## Tablas principales

- `players`
- `fees`
- `payments`
- `attendances`
- `training_votes`
- `player_documents`
- `scholarship_offers`
- `treasury_movements`
- `treasury_config`

## Seguridad actual

La app ya no depende de policies abiertas para las escrituras principales.

Estado:

- `players`: listado publico por RPC sin `access_code`; validacion de codigo por RPC; escritura admin por RPC.
- `fees`: lectura permitida; escritura directa bloqueada; escritura admin por RPC.
- `payments`: lectura de pagos activos; insercion de pagos pendientes; aprobacion/rechazo/eliminacion por RPC.
- `attendances`: lectura de listados; respuestas de jugador por RPC con codigo; correcciones admin por RPC; eliminacion de invitados por RPC.
- `training_votes`: lectura permitida; escritura de votos por RPC con codigo de jugador y ventana horaria.
- `player_documents`: lectura solo por RPC admin; sin policies directas de lectura/escritura.
- `scholarship_offers`: lectura/escritura solo por RPC; admin ve historial completo, jugador ve y responde solo su propia beca con codigo.
- `treasury_movements`: lectura y escritura solo por RPC admin.
- `treasury_movements.source`: permite distinguir egresos `manual` y `auto`.
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
- `admin_list_player_documents`
- `list_player_documents_for_player`
- `admin_upsert_player_document_requirement`
- `admin_list_scholarship_offers`
- `list_player_scholarship_offers`
- `admin_upsert_scholarship_offer`
- `respond_scholarship_offer`
- `admin_list_treasury_movements`
- `admin_upsert_treasury_movement`
- `admin_delete_treasury_movement`

## Campos relevantes

`players`:

- `access_code`: codigo simple del jugador. No debe salir en el listado publico.
- `billing_start_month`: mes desde el que el jugador empieza a participar del cobro. Si esta vacio, conserva el comportamiento historico y cuenta desde las cuotas cargadas.
- `birth_date`: fecha de nacimiento opcional para avisos de cumpleanos.

`fees`:

- `training_billing_base`: base de cobro para entrenamientos.
- `sunday_billing_base`: base de cobro para domingos.
- `fixed_training_only_amount`: monto fijo historico para solo entrenamientos.
- `fixed_competitor_amount`: monto fijo historico para competidores.
- `cash_adjustment_amount`: ajuste de caja que suma o descuenta del total a dividir.

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
- `source`: `jugador` o `admin`. Para emoticones puede incluir tags, por ejemplo `jugador|tags=meat,cook` o `admin|guest=Nombre|tags=meat` para invitado solo cena.

`training_votes`:

- `date`: fecha del entrenamiento votado.
- `voter_player_id`: jugador que voto.
- `featured_player_id`: jugador elegido como destacado.
- `award`: `pelota` o `copa`.
- `sponge_player_id`: jugador elegido como esponja.

`player_documents`:

- `player_id`: jugador asociado. Puede quedar vacio si falta revisar.
- `player_name`: nombre de respaldo o texto libre para avisos sin asociar.
- `document_type`: `estudios_medicos`, `djdr`, `pase`, `seguro` o `lista_buena_fe`.
- `drive_url`: opcional. Para avisos sin archivo queda vacio.
- `status`: `cargado`, `pendiente`, `revisar` o `vencido`.
- `expires_at`: fecha de vencimiento si aplica.
- La app no marca pendientes por ausencia de filas. Solo notifica avisos cargados por admin.

`scholarship_offers`:

- `fee_id`: cuota a la que aplica la beca.
- `player_id`: jugador al que se ofrece la beca.
- `status`: `pending`, `accepted`, `declined`, `no_response` o `cancelled`.
- `response_deadline`: fecha limite para aceptar o renunciar.
- `explanation_seen`: evita repetir el mensaje largo despues de la primera decision.
- Si el jugador acepta, `respond_scholarship_offer` crea un ajuste de cuota a $0 con motivo `beca`.

`treasury_movements`:

- `fee_id`: cuota/mes al que pertenece el egreso.
- `movement_type`: por ahora `egreso`.
- `category`: `entrenamiento`, `domingo`, `seguro_documentacion`, `aporte_club` u `otro`.
- `amount`: monto pagado.
- `occurred_at`: fecha del gasto.
- `description`: detalle libre.
- `source`: `manual` o `auto`. Los automaticos se generan desde la cuota del mes sin duplicar fecha/concepto/monto.
- `active`: borrado logico.

La carga inicial de links de Drive no es necesaria para avisos de vencimiento. Si alguna vez se usa, no se versiona en GitHub:

```txt
private/player-documents-seed.local.sql
```

Para mostrar vencimientos, checklist propio y guardar avisos desde admin, ejecutar:

```txt
supabase/player-documents-expiry-v1.sql
```

## Nota de seguridad

La `anon key` puede estar en frontend si RLS y policies estan bien configuradas.
No usar ni publicar la `service_role key` en la app.

Antes de una version publica definitiva, el siguiente paso es Supabase Auth con roles reales.
