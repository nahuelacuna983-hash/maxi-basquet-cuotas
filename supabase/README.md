# Prueba multiusuario mínima con Supabase

## 1. Crear tablas

1. Entrá a tu proyecto de Supabase.
2. Andá a `SQL Editor`.
3. Tocá `New query`.
4. Copiá todo el contenido de `supabase/schema.sql`.
5. Ejecutá con `Run`.

Para esta prueba MVP las policies son abiertas. Sirve para probar con 3 o 4 jugadores, pero no es seguridad final.

## 2. Cargar URL y anon key en la app

1. En Supabase, andá a `Project Settings`.
2. Entrá en `API`.
3. Copiá:
   - `Project URL`
   - `anon public key`
4. Abrí `src/config/supabaseConfig.js`.
5. Cambiá:

```js
export const supabaseConfig = {
  enabled: true,
  url: "TU_PROJECT_URL",
  anonKey: "TU_ANON_PUBLIC_KEY",
};
```

No uses la `service_role key` en el navegador.

## 3. Subir tus datos actuales

1. Abrí la app en la PC.
2. Entrá en modo admin.
3. Verificá que aparezca `Supabase conectado`.
4. Hacé un cambio chico, por ejemplo guardar tesorería o editar una base de cuota.
5. La app sincroniza `players`, `fees`, `payments` y `treasury_config` con Supabase.
6. En Supabase, revisá `Table Editor` para confirmar que se cargaron datos.

## 4. Probar con un jugador

1. En el celular del jugador abrí la URL publicada o la URL LAN.
2. Elegí su nombre.
3. Elegí el mes.
4. Tocá `Pagar`.
5. Como `Modo prueba de pago` está activo, no abre Mercado Pago.
6. Cargá `Informar pago`.
7. Ese pago queda `pendiente` en Supabase.

## 5. Aprobar desde admin

1. En tu PC abrí modo admin.
2. Esperá hasta 10 segundos o recargá.
3. En `Validacion de pagos`, debería aparecer el pago pendiente.
4. Tocá `Aprobar`.
5. Solo desde ese momento descuenta deuda.

## Problemas comunes

- Si aparece `Error Supabase: Failed to fetch`, revisá URL, anon key o conexión.
- Si aparece error de RLS/policies, volvé a ejecutar `supabase/schema.sql`.
- Si el jugador informa pago y no aparece, esperá 10 segundos o recargá admin.
- Si no hay jugadores en Supabase, abrí primero la app desde tu PC con tus datos locales y modo admin.
