# Wallhaven Picker

App de barra de menú para macOS que permite buscar y aplicar wallpapers desde [Wallhaven](https://wallhaven.cc) sin salir del teclado ni abrir el navegador.

![App Main Window](sshots/app.jpg)

## ¿Qué hace?

- Vive como un ícono en la barra de menú (menu bar), sin aparecer en el Dock
- Busca wallpapers por keyword directamente desde la API de Wallhaven
- Filtra automáticamente por la resolución nativa de tu pantalla (activable/desactivable)
- Vista tipo slideshow para navegar entre resultados con preview grande
- Aplica el wallpaper seleccionado directamente al escritorio con un click
- Guarda localmente cada wallpaper aplicado en `~/WallhavenPicker/Wallpapers`
- Pestaña "Mis Wallpapers" para ver y reaplicar wallpapers ya descargados, sin volver a buscar
- Gestión de almacenamiento: ver cuánto espacio ocupan tus wallpapers guardados y limpiarlo con un click
- Filtro de categorías y purity (SFW/Sketchy/NSFW) con soporte de API key

## Stack

- **[Tauri](https://tauri.app)** — runtime nativo (Rust) + webview
- **React + TypeScript** — interfaz
- **Wallhaven API** — fuente de los wallpapers
- **AppleScript (vía `osascript`)** — aplicar el wallpaper al sistema, ya que macOS no expone una API nativa simple para esto

## Requisitos

- macOS
- Node.js
- Rust (`rustup`)
- Xcode Command Line Tools

## Desarrollo

```bash
pnpm install
pnpm tauri dev
```

## Build / instalación local

Para generar la app compilada (.app) y su instalador (.dmg):

```bash
pnpm install
pnpm tauri build
```

Los artefactos quedan en `src-tauri/target/release/bundle/`:
- `macos/wallhaven-picker.app` — la app en sí
- `dmg/wallhaven-picker_x.x.x_aarch64.dmg` — instalador tipo imagen de disco

**Nota sobre Gatekeeper:** esta app no está firmada con una cuenta de Apple Developer, así que macOS puede mostrar una advertencia de "no se puede verificar el desarrollador" al abrirla por primera vez. Para permitir su ejecución:

- Click derecho sobre la app → "Abrir" → confirmar en el diálogo, o
- Desde terminal: `xattr -cr /ruta/a/wallhaven-picker.app`

Una vez abierta la primera vez, funciona con doble-click normalmente.

## Cómo funciona (resumen técnico)

- El ícono de la barra de menú controla la visibilidad de una única ventana (popover), que se oculta automáticamente al perder el foco
- La app corre con política de activación `Accessory` de macOS, para no aparecer en el Dock ni cerrarse al ocultar la ventana
- Las búsquedas usan el plugin `http` de Tauri contra la API pública de Wallhaven (`wallhaven.cc/api/v1/search`)
- Los wallpapers aplicados se descargan a `~/WallhavenPicker/Wallpapers` (carpeta propia en el home, sin restricciones de permisos de macOS) y se aplican corriendo un script de AppleScript vía el plugin `shell`
- Las preferencias (como el filtro de resolución) se persisten con el plugin `store` de Tauri

## Roadmap / ideas pendientes

- Rotación automática de wallpaper (slideshow real, no solo preview)
- Favoritos / colecciones

---

Proyecto personal, hecho para dejar de entrar a Wallhaven manualmente cada vez que quiero cambiar de fondo de pantalla.