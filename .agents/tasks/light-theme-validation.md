# Validación del tema claro

## Resumen

El tema claro está definido como la configuración base en `src/app/globals.css`, dentro del selector `:root`. Sin embargo, la aplicación no queda siempre en tema claro: el bloque `@media (prefers-color-scheme: dark)` sustituye esas variables cuando el sistema operativo o navegador del usuario indica preferencia por modo oscuro.

No se encontró una clase `.dark`, un proveedor `next-themes`, una declaración `color-scheme`, ni una clase o atributo de tema oscuro en los dos archivos revisados. `src/app/layout.tsx` tampoco fuerza el modo oscuro. Para dejar la aplicación siempre en tema claro, el cambio mínimo es eliminar el bloque `@media (prefers-color-scheme: dark)` de `src/app/globals.css`; no es necesario modificar `layout.tsx`.

## Evidencia

### `src/app/globals.css`

- El selector `:root` define los tokens base del tema visual: `--canvas: #fffdf8`, `--surface: #f7f5ef`, `--cream: #fff0bd`, `--ink: #17120f`, además de los colores naranja, amarillo, crema, bordes y sombras. Estos valores corresponden al tema claro.
- Dentro de `:root` también se inicializan `--background: var(--canvas)` y `--foreground: var(--ink)`. El selector `body` usa esos tokens mediante `background: var(--background)` y `color: var(--foreground)`.
- El bloque `@theme inline` expone los tokens CSS al sistema de utilidades, incluidos `--color-background`, `--color-foreground`, `--color-canvas`, `--color-cream` y `--color-ink`. No define un segundo tema ni cambia los valores base.
- Existe el bloque `@media (prefers-color-scheme: dark)`. Dentro de su selector `:root` se reemplazan los colores claros por valores oscuros, por ejemplo `--canvas: #211b17`, `--surface: #181411`, `--ink: #fff8ed`, `--hairline: #453a31` y `--surface-code: #0e0c0a`.
- No aparece un selector `.dark` en este archivo.
- No aparece una propiedad CSS `color-scheme` en este archivo.
- No aparece una regla basada en `data-theme`, ni otra clase o atributo usado para activar manualmente el modo oscuro.

### `src/app/layout.tsx`

- El elemento raíz `<html>` tiene `lang={locale}` y una `className` formada por las variables de las fuentes (`inter.variable`, `dmSerif.variable`, `jetbrainsMono.variable`), además de `h-full antialiased`.
- Esa `className` no contiene `dark` y el elemento `<html>` no tiene un atributo `data-theme` ni otro atributo de tema.
- El layout monta `NextIntlClientProvider`, `SessionProvider`, `SunsetStripe` y `SiteFooter`, pero no monta `ThemeProvider` de `next-themes` ni lógica de selección de tema.
- El `viewport` solo define `themeColor: "#ff5a1f"`; esto configura el color de la interfaz del navegador y no activa un modo oscuro.

### Dependencias

- En `package.json` no está declarada la dependencia `next-themes`.

## Conclusiones

1. Los estilos base del tema claro están en `src/app/globals.css`, principalmente en `:root`, junto con el uso de esos tokens en `body` y los componentes.
2. Sí existe una configuración de modo oscuro, pero es automática y depende de `prefers-color-scheme: dark`; no se activa mediante `.dark`, `next-themes`, `color-scheme` ni una clase/atributo del layout.
3. El tema claro es el valor inicial y predeterminado cuando no se detecta preferencia oscura.
4. El tema claro no es actualmente el resultado forzado en todos los equipos: si el sistema operativo está en oscuro, la media query sobrescribe los tokens y la app se ve oscura.

## Recomendación mínima

Para que la aplicación permanezca siempre en tema claro, eliminar únicamente el bloque completo `@media (prefers-color-scheme: dark) { ... }` de `src/app/globals.css`. La sección `:root` existente seguirá proporcionando todos los valores claros y `layout.tsx` puede permanecer sin cambios.

Si el objetivo es conservar en el futuro un selector claro/oscuro, no conviene eliminar la media query sin reemplazo; habría que implementar una estrategia explícita de tema. Para la solicitud actual de tema claro fijo, quitar la media query es la modificación más pequeña.

No se ejecutaron comandos de build o lint, conforme a la instrucción de esta validación de solo lectura.
