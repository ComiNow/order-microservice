<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

# Order Microservice - CoffeeNow ☕

Este microservicio es responsable de gestionar las órdenes dentro de la aplicación CoffeeNow. Administra el estado de las órdenes, los detalles de cada ítem y soporta tanto compras presenciales como en línea.

---

## 🧩 Funcionalidades

- Registro de nuevas órdenes con estado inicial `PENDING`.
- Transición de estados de la orden (`PENDING` → `PAID` → `DELIVERED`).
- Asignación de múltiples productos por orden.
- Soporte para compras online y físicas.
- Registro del total de ítems, monto total y fecha de pago.

---

## 🚀 Entorno de desarrollo

### 1. Clonar el repositorio

### 2. Instalar dependencias:

```bash
npm install
```

### 3. Crear un archivo `.env` basado en `.env.template`

### 4. Levantar la base de datos con Docker

```bash
docker-compose up -d
```

> Esto levantará un contenedor con PostgreSQL configurado para Prisma.

### 5. Ejecutar comandos de Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### 6. Iniciar el servidor en modo desarrollo

```bash
npm run start:dev
```

## 📂 Estructura básica

```

src/
 ├── orders/
 │   ├── controllers/
 │   ├── dto/
 │   ├── services/
 │   └── ...
 ├── common/
 └── main.ts
```

## 🛠️ Tecnologías

- **NestJS** (Framework principal)
- **Prisma** (ORM y migraciones)
- **PostgreSQL** (Base de datos)
- **Docker** (Contenedores)

---

## 📄 Licencia

Este proyecto es desarrollado por el equipo **CoffeeNow** ☕
