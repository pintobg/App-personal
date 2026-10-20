# Finanzas Personales Multimoneda (Venezuela)

Aplicación de finanzas personales multimoneda diseñada para Venezuela (React 19, Vite, Capacitor 8 para Android, Supabase para autenticación y PostgreSQL con RLS, Recharts y soporte offline).

## Configuración de Supabase

Para habilitar la autenticación real y la sincronización con la nube en tu base de datos Supabase:

1. Copia `.env.example` a un archivo `.env` en la raíz del proyecto:
   ```bash
   cp .env.example .env
   ```
2. Llena las variables con tus credenciales:
   - `VITE_SUPABASE_URL`: URL del proyecto (ej. `https://xyzcompany.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: Llave pública `anon` de la API de Supabase.

> **¿Dónde conseguir estas credenciales en Supabase?**
> Entra a tu panel en [supabase.com](https://supabase.com) -> Selecciona tu proyecto -> **Project Settings** (ícono de engranaje) -> Menú **API** -> Sección **Project URL** (copia la URL) y sección **Project API keys** (copia el valor de la clave llamada `anon` / `public`).

## Compilación y Generación del APK con Variables

Para compilar la aplicación para Android con las variables de entorno inyectadas:

1. Asegúrate de tener tu archivo `.env` configurado con tus credenciales de Supabase.
2. Sincroniza la build de Vite con el proyecto de Capacitor en Android:
   ```bash
   npm run cap:sync
   ```
   *(Este comando ejecuta internamente `vite build` para inyectar tus variables de entorno en el bundle `dist/` y luego ejecuta `npx cap sync android` para pasar los archivos a la carpeta nativa).*
3. Abre el proyecto en Android Studio:
   ```bash
   npx cap open android
   ```
4. En Android Studio:
   - Espera a que termine la sincronización de Gradle.
   - Ve al menú superior: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)** (o **Generate Signed Bundle / APK** para producción).
   - Una vez generado, transfiere el archivo APK a tu teléfono para instalarlo o ejecútalo directamente en tu dispositivo conectado con el botón **Run** (Play verde).

---

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local.
- `npm run build`: Compila el bundle de producción en `dist/`.
- `npm run lint`: Ejecuta el linter (Oxlint).
- `npm run cap:sync`: Compila y sincroniza con el proyecto Android nativo.

