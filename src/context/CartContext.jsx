// === CONTEXT: CartContext ===
// Globaler State für den Warenkorb – verhindert Prop-Drilling durch alle Komponenten
// Ohne Context müsste cart + alle Funktionen von App → Navbar → CartBtn
// und App → Shop → ItemCard durchgereicht werden (tief verschachtelt)

import { createContext, useContext, useEffect, useState } from "react";

// Context-Objekt erstellen – wird später mit Provider befüllt
const CartContext = createContext();

// === PROVIDER-KOMPONENTE ===
// Umschließt die gesamte App (in App.jsx) und stellt den State für alle
// Kind-Komponenten bereit, die useCart() aufrufen
export function CartProvider({ children }) { // children: Prop-Drilling ersetzt durch Context

  // === STATE: cart ===
  // Initialisierung mit Funktion: liest gespeicherten Warenkorb aus localStorage
  // → persistiert den State über Seiten-Neuladen hinweg
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : []; // Conditional: falls vorhanden parsen, sonst leeres Array
  });

  // === useEffect: Warenkorb speichern ===
 //läuft jedes mal wenn sich cart ändert 
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart)); //localStorage kann nur strings speichern ----------------------------
  }, [cart]); 

  // === STATE-ÄNDERUNGSFUNKTIONEN ===
  // Alle Funktionen die den State verändern sind hier definiert (wo der State liegt)
  // und werden per Context-Value weitergereicht → kein Prop-Drilling nötig

  // Item hinzufügen oder Menge erhöhen
  function addToCart(item) {
    setCart((prev) => {
      // Array.find(): prüfen ob Item bereits im Warenkorb ist
      const exists = prev.find(i => i.id === item.id);

      if (exists) {
        // Array.map(): Item-Menge erhöhen, alle anderen unverändert lassen
        // Spread-Operator {...i, quantity: ...}: Item-Objekt kopieren und quantity überschreiben
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 } // Conditional mit ternärem Operator
            : i
        );
      }

      // Spread-Operator: neues Item ans Ende des Arrays anhängen
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  // Item entfernen
  function removeFromCart(id) {
    // Array.filter(): Item mit dieser ID aus dem Array herausfiltern 
    setCart((prev) => prev.filter(i => i.id !== id));
  }

  // Warenkorb leeren
  function clearCart() {
    setCart([]);
  }

  // Context-Value: alle Werte und Funktionen die Kindkomponenten brauchen
  return (
    <CartContext.Provider value={{
      cart,          // State: aktuelle Warenkorbeinträge
      addToCart,     // Funktion: Item hinzufügen
      removeFromCart,// Funktion: Item entfernen
      clearCart      // Funktion: alles leeren
    }}>
      {children}
    </CartContext.Provider>
  );
}

// Custom Hook: vereinfacht den Zugriff auf den Context in Kindkomponenten
// Statt useContext(CartContext) überall → einfach useCart() aufrufen
export const useCart = () => useContext(CartContext);
