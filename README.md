# Maxi Basquet Cuotas

App web MVP para gestionar cuotas y pagos de un equipo de Maxi Basquet.

## Estado

- Vista jugador: consulta de cuota, deuda y pago informado.
- Modo admin con PIN simple.
- Persistencia local con `localStorage`.
- Integracion minima con Supabase para:
  - jugadores
  - cuotas
  - pagos
  - configuracion de tesoreria
- Modo prueba de pago activo.

## Desarrollo local

Abrir `index.html` desde un servidor local.

Opcion con Python:

```bash
python -m http.server 5174 --bind 0.0.0.0
```

URL local:

```txt
http://127.0.0.1:5174/
```

URL LAN, cambiando la IP por la de tu PC:

```txt
http://192.168.0.8:5174/
```

## Supabase

La configuracion esta en:

```txt
src/config/supabaseConfig.js
```

SQL inicial:

```txt
supabase/schema.sql
```

Guia:

```txt
supabase/README.md
```

## Documentacion del proyecto

Resumen general:

```txt
docs/resumen-proyecto.md
```

Publicacion en GitHub Pages:

```txt
docs/publicacion-github-pages.md
```

## Advertencia MVP

Esta version todavia no tiene login real. Las policies de Supabase estan abiertas para prueba controlada. Antes de usarlo como app publica definitiva hay que agregar autenticacion y permisos reales.
