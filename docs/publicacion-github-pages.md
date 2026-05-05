# Publicacion en GitHub Pages

Repo sugerido:

```txt
maxi-basquet-cuotas
```

## 1. Verificar proyecto en VS Code

Abrir esta carpeta:

```txt
C:\Users\yanam\Documents\Codex\2026-05-01\quiero-crear-una-app-web-para
```

Deberias ver:

```txt
docs/
src/
supabase/
index.html
package.json
README.md
vite.config.js
```

## 2. Verificar Supabase

Abrir:

```txt
src/config/supabaseConfig.js
```

Debe tener:

```js
export const supabaseConfig = {
  enabled: true,
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_ANON_PUBLIC_KEY",
};
```

No usar `service_role key`.

## 3. Crear repo en GitHub

1. Entrar a GitHub.
2. Crear repositorio nuevo.
3. Nombre:

```txt
maxi-basquet-cuotas
```

4. Dejarlo publico para GitHub Pages.
5. No hace falta crear README desde GitHub porque el proyecto ya tiene uno.

## 4. Subir archivos con VS Code

En VS Code, abrir terminal:

```txt
Terminal > New Terminal
```

Ejecutar:

```bash
git init
git add .
git commit -m "MVP cuotas Maxi Basquet"
git branch -M main
git remote add origin https://github.com/nahuelacuna983-hash/maxi-basquet-cuotas.git
git push -u origin main
```

Si GitHub pide login, seguir el flujo del navegador o token.

## 5. Activar GitHub Pages

1. Entrar al repo en GitHub.
2. Ir a `Settings`.
3. Ir a `Pages`.
4. En `Build and deployment` elegir:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guardar.

La URL esperada sera:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

## 6. Probar desde celular

1. Abrir la URL publica desde datos moviles.
2. Elegir jugador.
3. Elegir mes.
4. Informar pago en modo prueba.
5. Verificar en Supabase tabla `payments`.
6. Entrar admin y aprobar.

## Problemas comunes

### No carga estilos o JS

Revisar que la URL termine con `/`:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/
```

### El pago no llega a Supabase

Revisar:

- `src/config/supabaseConfig.js`
- tabla `payments`
- policies del SQL
- que existan `players` y `fees` en Supabase

### Se ve viejo

Probar con version en la URL:

```txt
https://nahuelacuna983-hash.github.io/maxi-basquet-cuotas/?v=1
```

## Nota de seguridad

Esta publicacion sirve para prueba MVP. Las policies actuales son abiertas. Antes de compartir masivamente hay que implementar autenticacion real y permisos por rol.
