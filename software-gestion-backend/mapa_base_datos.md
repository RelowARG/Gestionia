# 🗺️ Mapa Oficial de la Base de Datos - Gestionia

*Generado el: 20/2/2026, 12:36:24*

---

## 🗄️ Tabla: `clientes`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Empresa` | varchar(255) | **NO** | **UNI** | - |
| `Cuit` | varchar(50) | Sí | **UNI** | - |
| `Contacto` | varchar(255) | Sí | - | - |
| `Telefono` | varchar(50) | Sí | - | - |
| `Mail` | varchar(255) | Sí | - | - |
| `Direccion` | text(65535) | Sí | - | - |

---

## 🗄️ Tabla: `compra_items`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Compra_id` | int | **NO** | **MUL** | - |
| `Producto_id` | int | **NO** | **MUL** | - |
| `Cantidad` | decimal | **NO** | - | - |
| `Precio_Unitario` | decimal | Sí | - | - |
| `Total_Item` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `compras`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Fecha` | date | **NO** | - | - |
| `Fact_Nro` | varchar(255) | **NO** | - | - |
| `Proveedor_id` | int | **NO** | **MUL** | - |
| `Estado` | varchar(50) | **NO** | - | - |
| `MontoTotal` | decimal | Sí | - | - |
| `Cotizacion_Dolar` | decimal | Sí | - | - |
| `Total_ARS` | decimal | Sí | - | - |
| `Pago` | varchar(50) | Sí | - | - |

---

## 🗄️ Tabla: `gastos`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Fecha` | date | **NO** | - | - |
| `Motivo` | varchar(255) | **NO** | - | - |
| `Tipo` | varchar(50) | **NO** | - | - |
| `Forma_Pago` | varchar(50) | Sí | - | - |
| `Monto_Pesos` | decimal | **NO** | - | - |
| `Cotizacion_Dolar` | decimal | Sí | - | - |
| `Monto_Dolares` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `historial_conversaciones`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Cliente_id` | int | **NO** | **MUL** | - |
| `Fecha` | datetime | Sí | - | DEFAULT_GENERATED |
| `Emisor` | enum(7) | **NO** | - | - |
| `Mensaje` | text(65535) | Sí | - | - |

---

## 🗄️ Tabla: `ia_acciones`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `tarea_id` | varchar(255) | Sí | **MUL** | - |
| `tipo_tarea` | varchar(50) | Sí | - | - |
| `accion` | varchar(50) | Sí | - | - |
| `fecha` | datetime | Sí | - | DEFAULT_GENERATED |

---

## 🗄️ Tabla: `ia_insights`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `fecha` | datetime | Sí | - | DEFAULT_GENERATED |
| `tipo` | varchar(50) | Sí | - | - |
| `mensaje` | text(65535) | Sí | - | - |
| `datos_extra` | text(65535) | Sí | - | - |
| `estado` | varchar(20) | Sí | - | - |

---

## 🗄️ Tabla: `leads_antiguos`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `nombre` | varchar(255) | Sí | - | - |
| `telefono` | varchar(50) | Sí | - | - |
| `contactado` | tinyint | Sí | - | - |
| `fecha_importacion` | timestamp | Sí | - | DEFAULT_GENERATED |
| `email` | varchar(150) | Sí | - | - |

---

## 🗄️ Tabla: `movimientos`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Fecha` | date | **NO** | - | - |
| `Tipo` | varchar(50) | **NO** | - | - |
| `Subtipo` | varchar(255) | Sí | - | - |
| `Referencia` | varchar(255) | Sí | - | - |
| `Referencia_Id` | int | Sí | - | - |
| `Cliente_Proveedor_id` | int | Sí | - | - |
| `Tipo_Cliente_Proveedor` | varchar(50) | Sí | - | - |
| `Forma_Pago` | varchar(50) | Sí | - | - |
| `Descripcion_Manual` | text(65535) | Sí | - | - |
| `Monto_USD` | decimal | **NO** | - | - |
| `Monto_ARS` | decimal | **NO** | - | - |
| `Cotizacion_Dolar` | decimal | **NO** | - | - |
| `Notas` | text(65535) | Sí | - | - |

---

## 🗄️ Tabla: `presupuesto_items`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Presupuesto_id` | int | **NO** | **MUL** | - |
| `Producto_id` | int | Sí | **MUL** | - |
| `Cantidad` | decimal | Sí | - | - |
| `Precio_Unitario` | decimal | Sí | - | - |
| `Descuento_Porcentaje` | decimal | Sí | - | - |
| `Total_Item` | decimal | Sí | - | - |
| `Descripcion_Personalizada` | text(65535) | Sí | - | - |
| `Precio_Unitario_Personalizada` | decimal | Sí | - | - |
| `Cantidad_Personalizada` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `presupuestos`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Numero` | varchar(255) | **NO** | **UNI** | - |
| `Fecha` | date | **NO** | - | - |
| `Cliente_id` | int | **NO** | **MUL** | - |
| `ValidezOferta` | int | Sí | - | - |
| `Comentarios` | text(65535) | Sí | - | - |
| `CondicionesPago` | text(65535) | Sí | - | - |
| `DatosPago` | text(65535) | Sí | - | - |
| `Subtotal` | decimal | Sí | - | - |
| `IVA_Porcentaje` | decimal | Sí | - | - |
| `IVA_Monto` | decimal | Sí | - | - |
| `Otro_Monto` | decimal | Sí | - | - |
| `Total_USD` | decimal | Sí | - | - |
| `Cotizacion_Dolar` | decimal | Sí | - | - |
| `Total_ARS` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `producto_costo_historico`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Producto_id` | int | **NO** | **MUL** | - |
| `Fecha_Valido_Desde` | datetime | **NO** | - | - |
| `costo_x_1000` | decimal | Sí | - | - |
| `costo_x_rollo` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `productos`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `codigo` | varchar(255) | **NO** | **UNI** | - |
| `Descripcion` | text(65535) | **NO** | - | - |
| `eti_x_rollo` | decimal | Sí | - | - |
| `costo_x_1000` | decimal | Sí | - | - |
| `costo_x_rollo` | decimal | Sí | - | - |
| `precio` | decimal | Sí | - | - |
| `banda` | varchar(255) | Sí | - | - |
| `material` | varchar(255) | Sí | - | - |
| `Buje` | varchar(255) | Sí | - | - |
| `tipo` | varchar(50) | Sí | - | - |

---

## 🗄️ Tabla: `proveedores`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Empresa` | varchar(255) | **NO** | **UNI** | - |
| `Cuit` | varchar(50) | **NO** | **UNI** | - |
| `Contacto` | varchar(255) | Sí | - | - |
| `Telefono` | varchar(50) | Sí | - | - |
| `Mail` | varchar(255) | Sí | - | - |
| `Direccion` | text(65535) | Sí | - | - |

---

## 🗄️ Tabla: `stock`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Producto_id` | int | **NO** | **UNI** | - |
| `Cantidad` | decimal | **NO** | - | - |

---

## 🗄️ Tabla: `usuarios`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `username` | varchar(255) | **NO** | **UNI** | - |
| `password` | varchar(255) | **NO** | - | - |
| `role` | varchar(50) | Sí | - | - |
| `created_at` | timestamp | Sí | - | DEFAULT_GENERATED |
| `updated_at` | timestamp | Sí | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

---

## 🗄️ Tabla: `venta_items`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Venta_id` | int | **NO** | **MUL** | - |
| `Producto_id` | int | Sí | **MUL** | - |
| `Cantidad` | decimal | Sí | - | - |
| `Precio_Unitario_Venta` | decimal | Sí | - | - |
| `Descripcion_Personalizada` | text(65535) | Sí | - | - |
| `Precio_Unitario_Personalizada` | decimal | Sí | - | - |
| `Cantidad_Personalizada` | decimal | Sí | - | - |
| `Total_Item` | decimal | Sí | - | - |
| `Descuento_Porcentaje` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `ventas`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Fecha` | date | **NO** | - | - |
| `Fact_Nro` | varchar(255) | Sí | **UNI** | - |
| `Cliente_id` | int | **NO** | **MUL** | - |
| `Estado` | varchar(50) | **NO** | - | - |
| `Pago` | varchar(50) | **NO** | - | - |
| `Subtotal` | decimal | Sí | - | - |
| `IVA` | decimal | Sí | - | - |
| `Total` | decimal | Sí | - | - |
| `Cotizacion_Dolar` | decimal | Sí | - | - |
| `Total_ARS` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `ventasx`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `Fecha` | date | **NO** | - | - |
| `Nro_VentaX` | varchar(255) | **NO** | **UNI** | - |
| `Cliente_id` | int | **NO** | **MUL** | - |
| `Estado` | varchar(50) | **NO** | - | - |
| `Pago` | varchar(50) | **NO** | - | - |
| `Subtotal` | decimal | Sí | - | - |
| `Total` | decimal | Sí | - | - |
| `Cotizacion_Dolar` | decimal | Sí | - | - |
| `Total_ARS` | decimal | Sí | - | - |

---

## 🗄️ Tabla: `ventasx_items`

| Columna | Tipo de Dato | ¿Nulo? | Llave | Extra |
|---------|--------------|--------|-------|-------|
| `id` | int | **NO** | **PRI** | auto_increment |
| `VentaX_id` | int | **NO** | **MUL** | - |
| `Producto_id` | int | Sí | **MUL** | - |
| `Cantidad` | decimal | Sí | - | - |
| `Precio_Unitario_Venta` | decimal | Sí | - | - |
| `Descripcion_Personalizada` | text(65535) | Sí | - | - |
| `Precio_Unitario_Personalizada` | decimal | Sí | - | - |
| `Cantidad_Personalizada` | decimal | Sí | - | - |
| `Total_Item` | decimal | Sí | - | - |
| `Descuento_Porcentaje` | decimal | Sí | - | - |

---

