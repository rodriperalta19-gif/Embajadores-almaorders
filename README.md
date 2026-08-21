# 🚀 Alma Orders — Sistema de Embajadores

Panel profesional para la gestión de embajadores, comercios, comisiones y bonos de Alma Orders.

## Stack tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Estilos**: CSS puro con design system de Alma Orders
- **Hosting**: Vercel (recomendado)

---

## Estructura del proyecto

```
alma-embajadores/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Login
│   │   │   └── register/page.tsx       # Registro de embajadores
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Guard de autenticación
│   │   │   ├── page.tsx                # Panel principal del embajador
│   │   │   ├── comercios/page.tsx      # Registrar y ver comercios
│   │   │   ├── ganancias/page.tsx      # Historial de comisiones
│   │   │   ├── referidos/page.tsx      # Tracking de referidos
│   │   │   └── perfil/page.tsx         # Perfil del embajador
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Guard admin (solo role='admin')
│   │   │   ├── page.tsx                # Panel admin global
│   │   │   ├── comercios/page.tsx      # Aprobar/rechazar comercios
│   │   │   ├── embajadores/page.tsx    # Ver todos los embajadores
│   │   │   ├── ganancias/page.tsx      # Marcar pagos como pagados
│   │   │   └── stats/page.tsx          # Estadísticas avanzadas
│   │   ├── globals.css                 # Design system Alma Orders
│   │   └── layout.tsx                  # Root layout
│   ├── components/
│   │   └── dashboard/
│   │       └── DashboardShell.tsx      # Sidebar + topbar
│   ├── lib/
│   │   ├── supabase.ts                 # Clientes browser/server/admin
│   │   └── business.ts                 # Lógica de negocio (comisiones, bonos)
│   ├── types/
│   │   └── index.ts                    # Tipos TypeScript + config comisiones
│   └── middleware.ts                   # Protección de rutas
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Schema completo + RLS + triggers
└── .env.local.example                  # Variables de entorno necesarias
```

---

## ⚙️ Setup paso a paso

### 1. Clonar y instalar

```bash
git clone <tu-repo>
cd alma-embajadores
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un proyecto nuevo
2. Esperar a que el proyecto inicialice (~2 minutos)

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local` con tus valores de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

Estos valores los encontrás en **Supabase Dashboard → Settings → API**.

### 4. Ejecutar el schema SQL

1. Ir a **Supabase Dashboard → SQL Editor**
2. Copiar y pegar todo el contenido de `supabase/migrations/001_initial_schema.sql`
3. Ejecutar con el botón "Run"

Esto crea:
- Tablas: `ambassadors`, `commerces`, `earnings`, `referrals`
- Políticas RLS (seguridad por usuario)
- Triggers automáticos de comisiones y bonos
- Vista `ambassador_summary`
- Funciones helper

### 5. Crear el primer usuario admin

**Opción A — Interfaz de Supabase:**
1. Ir a **Authentication → Users → Add User**
2. Crear el usuario con tu email y contraseña
3. Copiar el UUID del usuario creado
4. Ir a **SQL Editor** y ejecutar:

```sql
INSERT INTO ambassadors (user_id, full_name, email, phone, referral_code, role)
VALUES (
  'PEGAR_UUID_AQUI',
  'Rodrigo Peralta',
  'admin@almaorders.com.ar',
  '+5492604660876',
  'ALMA-ADMIN-0001',
  'admin'
);
```

### 6. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deploy en Vercel

### 1. Conectar repositorio

```bash
# Inicializar git si no lo hiciste
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/alma-embajadores.git
git push -u origin main
```

### 2. Importar en Vercel

1. Ir a [vercel.com](https://vercel.com)
2. "New Project" → Importar tu repositorio
3. **Agregar variables de entorno** (las mismas del `.env.local`)
4. Deploy 🎉

---

## 🏗️ Lógica de negocio implementada

### Comisiones automáticas
Cuando un admin aprueba un comercio (cambia status a `activo`), el **trigger de PostgreSQL** automáticamente:
1. Genera un registro en `earnings` con el monto según el plan
2. Actualiza el referral a status `activo`
3. Verifica si el embajador alcanzó un umbral de bonus

### Tablas de comisiones
| Plan | Comisión embajador |
|------|--------------------|
| Avanzado ($25.000) | $10.000 (40%) |
| Élite ($35.000) | $14.000 (40%) |

### Sistema de bonos
| Comercios activos | Bono | Rango |
|---|---|---|
| 10 | $25.000 | Junior |
| 20 | $50.000 | Sénior |
| 30 | $80.000 | Experto |
| 50 | $150.000 | Élite |
| 100 | $300.000 | Legendario |

### Seguridad (RLS)
- Cada embajador solo puede ver **sus propios** datos
- Los admins tienen **acceso total** a todos los datos
- La tabla `earnings` solo puede ser modificada por admins
- Los triggers corren con `SECURITY DEFINER` (acceso privilegiado)

---

## 🔌 Preparado para escalar

### Integración con Alma Pay
```typescript
// En lib/business.ts, reemplazar la función de pagos:
async function processPago(earningId: string, amount: number) {
  // TODO: Integrar con Alma Pay API
  const response = await fetch('https://api.almapay.com/v1/transfers', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.ALMA_PAY_KEY}` },
    body: JSON.stringify({ amount, earning_id: earningId }),
  })
}
```

### Webhooks
Crear endpoint en `src/app/api/webhooks/` para recibir eventos externos.

### Notificaciones en tiempo real
```typescript
// Supabase Realtime ya está disponible:
supabase
  .channel('earnings-changes')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'earnings' }, payload => {
    // Notificar al embajador
  })
  .subscribe()
```

---

## 📞 Soporte

Rodrigo Peralta — Fundador de Alma Orders  
WhatsApp: +54 9 2604 66-0876  
Email: info@almaorders.com.ar
