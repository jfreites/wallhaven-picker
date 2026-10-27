# Wallflow

App de barra de menú para macOS que permite buscar y aplicar wallpapers desde [Wallhaven](https://wallhaven.cc), el [Art Institute of Chicago](https://www.artic.edu) y la [NASA](https://images.nasa.gov) sin salir del teclado ni abrir el navegador.

![App Main Window](sshots/app.jpg)

## ¿Qué hace?

- Vive como un ícono en la barra de menú (menu bar), sin aparecer en el Dock. Clic izquierdo abre o cierra la ventana; clic derecho muestra el menú con "Salir"
- Tres fuentes intercambiables desde un selector en "Buscar": **Wallhaven**, **Art Institute of Chicago** (obras de dominio público) y **NASA** (imágenes de espacio y Tierra). La última fuente usada se recuerda
- Sin texto de búsqueda muestra contenido destacado de cada fuente. En Wallhaven puedes ordenar por Latest, Hot, Toplist o Random; en NASA se sortea entre términos curados (Hubble, James Webb, nebulosas, la Tierra desde el espacio, galaxias)
- Solo muestra imágenes aptas como wallpaper: en Art Institute y NASA se descartan las verticales y las de baja resolución, y en NASA además logos, insignias y fotos de eventos
- Filtro por la resolución nativa de tu pantalla en Wallhaven (activable/desactivable en Ajustes)
- Cada thumbnail muestra al pasar el mouse sus acciones: aplicar, guardar o ver, junto con la atribución (autor o fuente, con enlace a la obra)
- Vista tipo slideshow a pantalla completa de la ventana, con navegación por flechas, `Esc` para cerrar, y autor, fuente y licencia
- Aplica el wallpaper seleccionado directamente al escritorio con un click. En NASA avisa si la imagen es menor que tu pantalla y rechaza las verticales
- Guarda localmente cada wallpaper aplicado o guardado en `~/WallhavenPicker/Wallpapers`, junto con su atribución
- Pestaña "Mis Wallpapers" para ver, reaplicar y eliminar uno por uno los wallpapers ya descargados, sin volver a buscar
- Gestión de almacenamiento: ver cuánto espacio ocupan tus wallpapers guardados y limpiarlo con un click
- Campo opcional de API key de Wallhaven en Ajustes
- Estética nativa de macOS: fondo translúcido (vibrancy), tema claro/oscuro automático según el sistema, `⌘K` para enfocar la búsqueda y navegación completa por teclado

### Atribución y licencias

Cada imagen conserva su autor y fuente. Las obras del Art Institute of Chicago son de dominio público (CC0). El contenido de la NASA se rige por las [pautas de uso de medios de la NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/). Wallhaven aloja contenido de sus usuarios: revisa los términos de cada imagen si vas a usarla fuera de tu escritorio.

## Stack

- **[Tauri](https://tauri.app)** — runtime nativo (Rust) + webview
- **React + TypeScript** — interfaz, con estilos propios organizados en tokens de diseño (sin librerías de UI)
- **Wallhaven API**, **Art Institute of Chicago API** (IIIF) y **NASA Image and Video Library** — fuentes de los wallpapers
- **AppleScript (vía `osascript`)** — aplicar el wallpaper al sistema, ya que macOS no expone una API nativa simple para esto

## Requisitos

- macOS
- Node.js y [pnpm](https://pnpm.io)
- Rust (`rustup`)
- Xcode Command Line Tools

## Desarrollo

```bash
pnpm install
pnpm tauri dev
```

La ventana empieza oculta: ábrela desde el ícono de la barra de menú. Se oculta sola al perder el foco, salvo que la fijes con el pin.

## Build / instalación local

Para generar la app compilada (.app) y su instalador (.dmg):

```bash
pnpm install
pnpm tauri build
```

Los artefactos quedan en `src-tauri/target/release/bundle/`:
- `macos/Wallflow.app` — la app en sí
- `dmg/Wallflow_x.x.x_aarch64.dmg` — instalador tipo imagen de disco

**Nota sobre Gatekeeper:** esta app no está firmada con una cuenta de Apple Developer, así que macOS puede mostrar una advertencia de "no se puede verificar el desarrollador" al abrirla por primera vez. Para permitir su ejecución:

- Click derecho sobre la app → "Abrir" → confirmar en el diálogo, o
- Desde terminal: `xattr -cr /ruta/a/Wallflow.app`

Una vez abierta la primera vez, funciona con doble-click normalmente.

## Cómo funciona (resumen técnico)

- El ícono de la barra de menú controla la visibilidad de una única ventana (popover) transparente con efecto vibrancy de macOS (`windowEffects` de Tauri, que requiere `macOSPrivateApi`), que se oculta automáticamente al perder el foco
- La app corre con política de activación `Accessory` de macOS, para no aparecer en el Dock ni cerrarse al ocultar la ventana
- Cada fuente es un adaptador en `src/sources/` que implementa la interfaz `WallpaperSource` y devuelve un modelo común `Wallpaper`. Agregar una fuente nueva es crear su archivo e incluirlo en el registro `src/sources/index.ts`. Cada una declara sus `capabilities`, y la UI oculta los filtros que no soporta
- Las peticiones usan el plugin `http` de Tauri. Los errores (límite de peticiones, sin conexión, API key rechazada) se traducen a mensajes uniformes por fuente
- El Art Institute exige identificar a la app con un header propio, que las `<img>` del webview no pueden enviar: sus imágenes se descargan con el plugin `http` y se muestran como blob
- En NASA, la búsqueda ya trae las URLs de cada imagen. Las dimensiones que faltan se leen de la cabecera del archivo con una petición `Range` y solo al abrir, descargar o aplicar, y se cachean en memoria
- Los wallpapers aplicados se descargan a `~/WallhavenPicker/Wallpapers` (carpeta propia en el home, sin restricciones de permisos de macOS) y se aplican corriendo un script de AppleScript vía el plugin `shell`
- Las preferencias (filtro de resolución, API key, última fuente) y la atribución de lo descargado se persisten con el plugin `store` de Tauri

## Roadmap / ideas pendientes

Wallflow Pro: ya existe el diseño de las funciones bloqueadas en Ajustes (insignia "Pro" y estado bloqueado reutilizable), pero ninguna está implementada todavía.

- Rotación automática de wallpaper (slideshow real, no solo preview)
- Soporte multi-monitor
- Favoritos / colecciones
- Más fuentes de museos

---

Proyecto personal, hecho para dejar de entrar a Wallhaven manualmente cada vez que quiero cambiar de fondo de pantalla.
