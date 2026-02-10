// src/components/Navbar.js (Modificado para añadir "Usuarios" dentro de "Configuración")
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ onLogout }) {
  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li className="nav-item">
          <Link to="/">Inicio</Link>
        </li>

        {/* Facturacion */}
        <li className="nav-item has-dropdown">
          Facturacion
          <ul className="dropdown-content">
            <li><Link to="/presupuestos">Presupuesto</Link></li>
            <li><Link to="/ventas">Venta</Link></li>
            <li><Link to="/ventasx">Venta X</Link></li>
          </ul>
        </li>

        {/* Administracion */}
        <li className="nav-item has-dropdown">
          Administracion
          <ul className="dropdown-content">
            <li><Link to="/clientes">Clientes</Link></li>
            <li><Link to="/compras">Compras</Link></li>
            <li><Link to="/proveedores">Proveedores</Link></li>
          </ul>
        </li>

        {/* Stock */}
        <li className="nav-item has-dropdown">
          Stock
          <ul className="dropdown-content">
            <li><Link to="/productos">Productos</Link></li>
            <li><Link to="/stock">Stock</Link></li>
          </ul>
        </li>

        {/* Movimientos/Finanzas */}
        <li className="nav-item has-dropdown">
          Finanzas
          <ul className="dropdown-content">
             <li><Link to="/balance">Balance</Link></li>
            <li><Link to="/cashflow">CashFlow</Link></li>
          </ul>
        </li>

         {/* Listado */}
         <li className="nav-item has-dropdown">
           Listado
           <ul className="dropdown-content">
             <li><Link to="/listados-ventas">List. Ventas</Link></li>
             <li><Link to="/listados-ventasx">List. VentasX</Link></li>
             <li><Link to="/listados-compras">List. Compras</Link></li>
            </ul>
         </li>

         {/* Estadisticas Dropdown */}
         <li className="nav-item has-dropdown">
           Estadisticas
           <ul className="dropdown-content">
             <li><Link to="/estadisticas?stat=inactiveClients">Clientes Inactivos</Link></li>
             <li><Link to="/estadisticas?stat=topClients">Mejores Clientes</Link></li>
             <li><Link to="/estadisticas?stat=topProducts">Productos Más Vendidos</Link></li>
             <li><Link to="/estadisticas?stat=leastSoldProducts">Productos Menos Vendidos</Link></li>
             <li><Link to="/estadisticas?stat=topMonths">Mejores Meses</Link></li>
             <li><Link to="/estadisticas?stat=monthlyYearlySalesComparison">Comparativa Mes/Año</Link></li>
             <li><Link to="/estadisticas?stat=stockRotation">Stock vs Rotación</Link></li>
           </ul>
         </li>

        {/* --- NUEVO: Menú de Configuración con Usuarios dentro --- */}
         <li className="nav-item has-dropdown">
           Configuración {/* Nuevo elemento del menú principal */}
           <ul className="dropdown-content">
             <li><Link to="/usuarios">Usuarios</Link></li> {/* Mover enlace de Usuarios aquí */}
             {/* Puedes añadir otros enlaces de configuración aquí en el futuro */}
             {/* <li><Link to="/configuracion/ajustes">Ajustes Generales</Link></li> */}
           </ul>
         </li>
         {/* --- FIN NUEVO MENÚ --- */}


         {/* Elemento para Cerrar Sesión */}
          <li className="nav-item" onClick={onLogout} style={{ cursor: 'pointer', marginLeft: 'auto' }}>
             Cerrar Sesión
         </li>
      </ul>
    </nav>
  );
}

export default Navbar;