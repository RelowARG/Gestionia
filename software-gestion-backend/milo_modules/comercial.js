// milo_modules/comercial.js (Fragmeto actualizado)
const query = `
    SELECT 
        p.codigo, p.Descripcion, p.precio as Precio_Lista, 
        COALESCE(
            (SELECT AVG(Precio_Unitario) FROM compra_items WHERE Producto_id = p.id AND Precio_Unitario > 0),
            p.costo_x_rollo, p.costo_x_1000, 0
        ) as Costo_Referencia,
        COALESCE(
            (SELECT AVG(Precio_Unitario_Venta) FROM (
                SELECT Producto_id, Precio_Unitario_Venta FROM venta_items
                UNION ALL
                SELECT Producto_id, Precio_Unitario_Venta FROM ventasx_items
            ) as h WHERE h.Producto_id = p.id AND h.Precio_Unitario_Venta > 0),
            p.precio, 0
        ) as Precio_Venta_Final,
        IFNULL((SELECT SUM(Cantidad) FROM (
            SELECT Producto_id, Cantidad FROM venta_items
            UNION ALL
            SELECT Producto_id, Cantidad FROM ventasx_items
        ) as t WHERE t.Producto_id = p.id), 0) as Unidades_Vendidas,
        IFNULL(s.Cantidad, 0) as Stock_Actual
    FROM productos p
    LEFT JOIN stock s ON p.id = s.Producto_id
    WHERE p.precio > 0
    ORDER BY Unidades_Vendidas DESC, Stock_Actual DESC
    LIMIT 50
`;