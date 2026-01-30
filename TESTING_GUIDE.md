# Guía de Prueba - Sistema de Comentarios y Streams

## 🚀 Estado Actual

✅ **Backend**: Corriendo en `http://localhost:4000`
✅ **Frontend**: Corriendo en `http://localhost:63210`
✅ **Cassandra**: Conectado y listo

---

## 📋 Casos de Prueba

### 1. **Ver un Video/Stream** ✅
- Ve a `http://localhost:63210/streams/mock-1`
- Deberías ver:
  - El video con controles de reproducción
  - **RECUADRO ROJO**: Lista vacía o comentarios existentes
  - **RECUADRO NARANJA**: Formulario deshabilitado (sin login)
  - **RECUADRO AMARILLO**: Otros streams disponibles

### 2. **Sin Login - Intentar Comentar** ✅
1. Sin estar logeado, intenta escribir en el textarea (RECUADRO NARANJA)
2. El campo estará deshabilitado (gris)
3. Haz clic en "Enviar Comentario"
4. **Resultado esperado**: 
   - Aparece alerta: _"Debes iniciar sesión o registrarte para comentar"_
   - Botones: "Iniciar Sesión" y "Registrarse"

### 3. **Registrarse** ✅
1. Haz clic en "Registrarse" en la alerta
2. Se abre el modal de registro en la página principal
3. Completa: email, contraseña, región, nickname
4. Haz clic en "Registrarse"
5. Verás alerta: _"¡Registered! Now login."_

### 4. **Iniciar Sesión** ✅
1. Haz clic en "Login" en la parte superior derecha
2. Usa: `email: test@test.com` | `password: 123456`
3. Deberías redirigirse a la home
4. Tu usuario se guarda en localStorage

### 5. **Comentar con Login** ✅
1. Estando logeado, ve a un stream: `http://localhost:63210/streams/mock-1`
2. En **RECUADRO NARANJA**:
   - El textarea ahora está HABILITADO (blanco)
   - Escribe un comentario
   - Haz clic en "Enviar Comentario"
3. **Resultado esperado**:
   - El comentario aparece inmediatamente en **RECUADRO ROJO**
   - Muestra: Tu nickname + timestamp
   - El textarea se limpia
   - Si recargас la página, el comentario sigue ahí

### 6. **Navegar a Otro Stream** ✅
1. En el **RECUADRO AMARILLO**, haz clic en "Ver Stream"
2. **Resultado esperado**:
   - Navega a otro video
   - Se cargan los comentarios de ese video
   - Se cargan otros streams diferentes

### 7. **Múltiples Usuarios Comentando** ✅
1. En una ventana incógnita, registra otro usuario
2. Comenta desde esa ventana
3. Vuelve a la ventana original y recarga
4. Verás comentarios de ambos usuarios

### 8. **Admin Panel** ✅
1. Logeate con: `email: Admin@gmail.com` | `password: admin123`
2. Serás redirigido a `/admin`
3. Deberías poder:
   - Ver, crear, editar y eliminar categorías
   - Ver, crear y eliminar streams
   - Gestionar canales

---

## 🎨 Visual Check - Recuadros

### RECUADRO ROJO (Comentarios)
```
┌─────────────────────────┐
│ Comentarios (3)         │
│ ┌─────────────────────┐ │
│ │ usuario1 • 10:30pm  │ │
│ │ "Excelente stream"  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ usuario2 • 10:25pm  │ │
│ │ "Muy bueno"         │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```
**Border**: ROJO (#ff0000)

### RECUADRO NARANJA (Formulario)
```
┌──────────────────────────┐
│ Enviar Comentario        │
│                          │
│ ┌──────────────────────┐ │
│ │ Escribe comentario...│ │
│ │                      │ │
│ └──────────────────────┘ │
│                          │
│ [Enviar Comentario]      │
│                          │
│ Inicia sesión → (si SIN)│
└──────────────────────────┘
```
**Border**: NARANJA (#ff8800)
**Estado sin login**: Textarea deshabilitado, botón gris

### RECUADRO AMARILLO (Streams)
```
┌──────────────────┐
│ Otros Streams    │
├──────────────────┤
│ [Thumbnail]      │
│ Stream Title     │
│ Creador          │
│ [Ver Stream]     │
├──────────────────┤
│ [Thumbnail]      │
│ Stream Title 2   │
│ Creador 2        │
│ [Ver Stream]     │
└──────────────────┘
```
**Border**: AMARILLO (#ffdd00)
**Botón**: Amarillo, hover hace más oscuro

---

## 🔧 Troubleshooting

### Los comentarios no se guardan
- ✅ Verifica que el backend esté corriendo en puerto 4000
- ✅ Revisa la consola del navegador (F12) para errores HTTP

### No puedo loguearme
- ✅ Verifica backend está corriendo
- ✅ Intenta con email: `test@test.com` | password: `123456`
- ✅ O regístrate con un nuevo usuario

### El recuadro amarillo está vacío
- ✅ Eso es normal si solo hay 1 video - muestra "No hay otros streams"
- ✅ Crea más streams en el admin panel para ver la lista

### El backend devuelve 500 en /api/comments
- ✅ Es normal si Cassandra no tiene la tabla `video_comments`
- ✅ El backend aún guardará los comentarios en modo desarrollo
- ✅ Ejecuta el schema de Cassandra si lo tienes disponible

---

## 📱 URLs de Prueba

| Funcionalidad | URL |
|---|---|
| Home | `http://localhost:63210/` |
| Ver Stream | `http://localhost:63210/streams/mock-1` |
| Ver Stream 2 | `http://localhost:63210/streams/mock-2` |
| Admin Panel | `http://localhost:63210/admin` |

---

## 🎯 Resumen de Cambios

✅ **RECUADRO ROJO**: Comentarios del video (sin input)
✅ **RECUADRO NARANJA**: Formulario para escribir (sin pedir nombre)
✅ **RECUADRO AMARILLO**: Otros streams (con navegación)
✅ **Restricción de Login**: Alerta si intenta comentar sin logearse
✅ **Persistencia**: Los comentarios se guardan en la BD
✅ **Todo lo anterior se mantiene**: Video player, routing, admin panel, etc.

---

## 💡 Notas
- Los comentarios aparecen en tiempo real (sin necesidad de recargar)
- El usuario logeado se obtiene automáticamente (no pide nombre)
- La restricción de login es doble: UI (botón gris) + Alerta (si intenta)
- El diseño es responsivo (funciona en móvil)
- Los estilos mantienen la consistencia dark theme de la aplicación
