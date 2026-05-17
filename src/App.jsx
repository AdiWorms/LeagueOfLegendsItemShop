import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import Shop from "./pages/Shop";
import CartPage from "./pages/CartPage";
import ItemDetail from "./pages/ItemDetail";
import BuildPlaner from "./pages/BuildPlaner";
import { CartProvider, useCart } from "./context/CartContext";

function Navbar() {
  const { cart } = useCart();
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="nav">
      <Link to="/" className="logo">LoL · Item Shop</Link>

      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Shop
        </NavLink>
        <NavLink to="/build" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Build Planer
        </NavLink>
      </nav>

      <div className="nav-right">
        <Link to="/cart" className="cartBtn">
          Cart
          {total > 0 && <span className="cart-badge">{total}</span>}
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/build" element={<BuildPlaner />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;