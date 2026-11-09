# Winostalgy PWA — 0.3.0

Primera base funcional independiente de Android. **No modifica JellyUploader, Jellyfin ni la configuración de producción.** Cliente estático sin dependencias de ejecución empaquetadas; Google Identity Services se carga solo al solicitar acceso Google.

## Ejecutar

Requiere Node 22+ para pruebas/build y Python 3 para servidor local:

```bash
cd /home/joe/Proyectos/winostalgy/pwa
npm test
npm run build
npm start
```

Abrir http://localhost:4173. `dist/` contiene los archivos estáticos publicables. El servidor de desarrollo escucha solo en localhost. Para iPhone se necesita alojamiento HTTPS accesible y un origen autorizado en Google; localhost del ordenador no es accesible como localhost del teléfono.

## Incluido en esta entrega

- Navegación Inicio, Explorar, Tu biblioteca y Crear; estilo oscuro/ámbar, safe areas y controles táctiles.
- Conexión con usuario Jellyfin y contraseña; sesión de pestaña o persistente por elección. Nunca guarda la contraseña.
- Google: solicita challenge y clientId al plugin, entrega nonce a Google y envía IdToken al endpoint existente. No altera validación ni crea usuarios directamente.
- Biblioteca paginada: canciones, álbumes, playlists y Me gusta; búsqueda del servidor al escribir. Apertura de colecciones con hasta 200 canciones en esta primera entrega.
- Me gusta: POST/DELETE seguido de lectura de confirmación; no consolida el corazón si hay error.
- Crear playlist privada en Nube y añadir una canción a las primeras 100 playlists accesibles.
- Un único audio entre pantallas, pausa, siguiente/anterior, posición y Media Session cuando está disponible.
- InstantMix conserva la respuesta del servidor como cola, bloquea solicitudes duplicadas y conserva la cola anterior si la consulta falla.
- Radio Browser paginado, filtro de país y favoritos de radios en este navegador.
- Manifiesto, iconos PNG e instalación. Service worker limitado a una lista exacta de archivos públicos; no cachea API, carátulas privadas, tokens ni música.

## Pendiente del port completo

Esta es una primera entrega, no paridad con Android: artistas/géneros,  reporte de búsquedas ausentes, carga/etiquetas desde PWA, descargas y audio offline, archivos locales, gestión completa de playlists, ecualizador y anuncios. El flujo Explorar Nube consulta Google Docs y aplica servidor, radioapi y país inicial. Configurar mi servidor permite conexión manual si el documento no es accesible por CORS.

El acceso compartido está identificado en la sesión y bloquea mutaciones tanto en interfaz como en el cliente HTTP. No guarda la contraseña demo; conserva únicamente el token de sesión cuando se solicita. No hay backend nuevo.

## Seguridad y compatibilidad

- Usar HTTPS. El cliente admite HTTP solamente en localhost para desarrollo. Servidores con subruta están soportados.
- Jellyfin y JellyUploader deben permitir peticiones del origen de la PWA (CORS) si se alojan en orígenes distintos. No se ha cambiado CORS ni proxy. Si no están permitidas, se informa error; no se intenta eludirlo.
- Registrar el origen web en el cliente OAuth Google que ya entrega el challenge. La firma SHA del APK no sustituye esta configuración. Esta entrega no modifica Google Cloud.
- Sesiones persistentes se guardan en localStorage, las temporales en sessionStorage: no equivalen a AndroidKeyStore. Un XSS comprometería esos datos; no insertar HTML de las API, no cargar scripts adicionales y publicar una política CSP compatible con Google. El cierre de sesión elimina ambas copias.
- El audio y las imágenes usan URLs estándar Jellyfin con token de usuario porque los elementos multimedia no permiten las cabeceras del cliente HTTP. No registrar URLs completas en proxy/analítica ni compartirlas. Las API y carátulas usan no-referrer. El documento usa strict-origin-when-cross-origin y el acceso Google local HTTP usa no-referrer-when-downgrade según su guía. No se usan tokens administrativos.
- Solo se reproducen emisoras HTTPS en esta versión. La compatibilidad de formato, transcodificación de Jellyfin y reproducción de fondo requieren validación real.
- No hay promesa de escucha offline: únicamente la interfaz queda disponible sin red.
- Los favoritos de radios no se sincronizan con Android.
- Actualización: incrementar la versión de caché en `sw.js` al publicar otra versión. No forzar activación sobre una sesión musical abierta.

## Pruebas

`tests/api.test.js`: validación de servidor, confirmación de favoritos, errores, desmarcado, usuario correcto, posición visual sin mutar filtros, respuesta Google e InstantMix.

`tests/browser.cjs`: prueba con Playwright y API simulada. Requiere un servidor en puerto 4173 y una instalación externa de Playwright/Chrome. Variables opcionales `PLAYWRIGHT_MODULE` (ruta a Playwright) y `CHROME_PATH` (ejecutable). No usa credenciales reales ni escribe en producción.

Pendiente: Safari/iPhone real, Google real desde origen autorizado, Jellyfin real con reproducción/transcodificación, radios reales y comportamiento con pantalla bloqueada.

### Resultado local, 8 de noviembre de 2026

Pruebas unitarias aprobadas y build estático generado. Prueba de navegador aprobada en Chrome de escritorio con API simulada: login, confirmación de Me gusta, crear playlist, cerrar sesión y ausencia de errores JavaScript. Sin desbordamiento horizontal a 390×844, 844×390 y 1280×800. Se inspeccionó captura móvil de Biblioteca. Esto no certifica Safari ni una conexión real a Jellyfin. No se desplegó en producción.

Memanto no pudo guardar la restricción de no modificar JellyUploader por un error de permisos en `secret_key.lock`; la restricción queda explícita en este documento.

### Origen OAuth local

En el cliente OAuth Web existente de Google, registrar en Orígenes JavaScript autorizados `http://localhost` y `http://localhost:4187`. Abrir la prueba desde `http://localhost:4187/` (no alternar con 127.0.0.1). No cambiar el cliente Android ni la firma, ni registrar estas direcciones como redirect URI: el flujo utiliza callback JavaScript. El dominio HTTPS definitivo debe autorizarse por separado.

## Incremento 0.2.0

Bienvenida con imagen existente de Winostalgy, botón principal Nube y enlace Usar Winostalgy. Selector Personalizado/Compartido con configuración remota compatible con Android, incluida ofuscación xor-v1 (pública y reversible, no protección criptográfica). Inicio Nube muestra Me gusta, recientes, sugeridos y playlists reales; en compartido omite las secciones personales. Cada sección informa vacío o error por separado. Las consultas recientes reflejan datos ya disponibles en Jellyfin: la PWA reporta eventos desde 0.3.0 para cuentas personales. No se modificó JellyUploader.

Validación 0.2.0: 14 pruebas unitarias aprobadas (9 de API y 5 de configuración/modo compartido), sintaxis y build correctos. En la vista previa real se verificaron bienvenida y lectura de Google Docs hasta mostrar Personalizado/Compartido; no se inició sesión de prueba en producción. Pendientes Google completo y Safari/iPhone. La prueba automatizada de navegador de 0.1.0 se adaptó a la nueva bienvenida, pero aún no se repitió para este incremento.


## Incremento 0.3.0 — prioridades solicitadas

- INI-01: paneles metálicos/ámbar, saludo por hora y accesos rápidos a Me gusta y playlists en Inicio; recurso gráfico original del proyecto. Falta evaluación visual con catálogo real y comparación final con Android.
- PER-03: perfil compacto con volver, recientes, estadísticas, mensajes deshabilitados, configuración, acerca de, permiso de edición comprobado por `/JellyUploader/api/session` y cierre de sesión con progreso. La edición abre la web existente del plugin sin pasar tokens en el enlace; el editor integrado sigue pendiente. Nombre/correo/avatar consultados a Jellyfin cuando existen.
- CFG-05: pantalla Acerca de con texto separado en `src/strings.js`, descripción transparente, recuadro QR vacío, Ko-fi, cerrar, atribuciones y versión generada desde package.json. El contenido describe solo capacidades web implementadas, sin prometer Android Auto ni descargas offline.
- Configuración real con país de radios; el selector ya no aparece en Explorar.
- Estadísticas: lista de canciones con contadores acumulados `PlayCount`, sin inventar minutos semanales.
- Reproductor ampliado al pulsar el título del minirreproductor: portada, controles, cola seleccionable, Me gusta, repetición y aleatorio explícitos. La cola aún no permite reordenar ni eliminar elementos.
- Reporte de inicio/progreso/fin al servidor por cuenta personal, sin datos de radios o compartido. Se notifica error de reporte sin detener el audio. El cierre abrupto del navegador puede impedir enviar el último evento. Validación real de estos eventos y transcodificación pendiente.

Validación 0.3.0: 18 pruebas unitarias aprobadas y build generado. Inspección visual real en navegador de Perfil, Acerca de y Configuración; Acerca de comprobado también a 390px sin desbordamiento horizontal. No se probaron sesión personal real, permisos de edición reales ni reproducción en iPhone. JellyUploader, Android y producción permanecen sin cambios. Memanto sigue bloqueado por permisos del archivo secret_key.lock.
