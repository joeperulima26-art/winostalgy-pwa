# Prueba de iPhone en la red local

No se publicó en Internet ni se cambió JellyUploader.

PWA: https://192.168.18.222:4189/
Certificado público: http://192.168.18.222:4190/winostalgy-local-ca.crt

Conectar el iPhone al mismo Wi-Fi. Instalar manualmente el certificado y activar confianza para «Winostalgy Local Development CA» antes de abrir HTTPS. Confiar en esta CA permite al dispositivo aceptar certificados firmados por su clave; es solo para desarrollo. Retirar el perfil al terminar las pruebas. No compartir las claves privadas ni subir `.local-tls/` a Git.

Si aparece un aviso de certificado no válido, no continuar ignorándolo: comprobar instalación, confianza y dirección IP. Google OAuth no admite este origen basado en IP privada; probar acceso con usuario Jellyfin o compartido. Las credenciales viajan por HTTPS y las peticiones al servidor siguen utilizando HTTPS. Safari/CORS y el acceso real siguen sujetos a prueba en el teléfono.

Los servidores funcionan mientras la computadora permanezca encendida y conectada. No se abrieron puertos del router ni reglas de firewall. Si la conexión no llega, comprobar aislamiento Wi-Fi/firewall. La IP puede cambiar por DHCP y el certificado está ligado a la dirección actual.

Para volver a iniciar, desde la raíz del proyecto, en dos terminales:

```bash
python3 pwa/scripts/serve-https.py --bind 192.168.18.222
```

```bash
python3 -m http.server 4190 --bind 192.168.18.222 --directory pwa/.local-tls/public
```

Detener cada servidor con Ctrl+C. El segundo solo sirve el certificado público. El servidor HTTPS sirve exclusivamente `pwa/dist`. Ejecutar `npm --prefix pwa run build` tras cambios.

Validado desde la computadora: HTTPS 200 con verificación mediante CA local, descarga pública 200, intento de leer server.key 404. No se ha comprobado todavía desde un iPhone real.
