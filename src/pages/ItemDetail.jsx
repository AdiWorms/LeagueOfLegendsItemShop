// === KOMPONENTE: ItemDetail ===
// Detailansicht eines einzelnen Items – lädt Daten anhand der ID aus der URL

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

// Hilfsfunktion: parst den HTML-Beschreibungstext der LoL API in strukturierte Blöcke
// Die API gibt z.B. <mainText><stats>40 AD<br>35% AS</stats><passive>Passive</passive> Text</mainText> zurück
function parseDescription(html) {
  if (!html) return [];

  let str = html.replace(/<br\s*\/?>/gi, "\n");
  const blocks = [];

  str = str.replace(/<mainText>([\s\S]*?)<\/mainText>/gi, (_, inner) => {
    // Array.map() + filter(): Stat-Zeilen extrahieren und leere Strings entfernen
    const statMatches = [...inner.matchAll(/<stats>([\s\S]*?)<\/stats>/gi)];
    statMatches.forEach(m => {
      const statLines = m[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean); // filter(): leere Strings entfernen
      statLines.forEach(line => blocks.push({ type: "stat", text: line }));
    });

    let rest = inner.replace(/<stats>[\s\S]*?<\/stats>/gi, "");
    rest = rest.replace(/<passive>([\s\S]*?)<\/passive>/gi, (_, t) => `%%KEYWORD%%${t.trim()}%%ENDKEYWORD%%`);
    rest = rest.replace(/<active>([\s\S]*?)<\/active>/gi, (_, t) => `%%KEYWORD%%${t.trim()}%%ENDKEYWORD%%`);
    rest = rest.replace(/<attention>([\s\S]*?)<\/attention>/gi, (_, t) => `%%ATTENTION%%${t.trim()}%%ENDATTENTION%%`);
    rest = rest.replace(/<[^>]+>/g, "");

    const lines = rest.split("\n").map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (line.includes("%%KEYWORD%%") || line.includes("%%ATTENTION%%")) {
        blocks.push({ type: "ability", raw: line });
      } else {
        blocks.push({ type: "desc", text: line });
      }
    });
    return "";
  });

  const leftover = str.replace(/<[^>]+>/g, "").trim();
  if (leftover) {
    leftover.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
      blocks.push({ type: "desc", text: line });
    });
  }

  return blocks;
}

// Hilfsfunktion: rendert eine Ability-Zeile mit hervorgehobenen Keywords als JSX
function renderAbilityLine(raw) {
  const parts = [];
  let remaining = raw;
  let key = 0;

  const kwRegex = /%%KEYWORD%%(.*?)%%ENDKEYWORD%%/;
  const atRegex = /%%ATTENTION%%(.*?)%%ENDATTENTION%%/;

  while (remaining.length > 0) {
    const kwMatch = kwRegex.exec(remaining);
    const atMatch = atRegex.exec(remaining);

    // Array.filter() + sort(): ersten Match finden
    const firstMatch = [kwMatch, atMatch]
      .filter(Boolean)
      .sort((a, b) => a.index - b.index)[0];

    if (!firstMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, firstMatch.index)}</span>);
    }

    if (firstMatch === kwMatch) {
      parts.push(<span key={key++} className="desc-keyword">{firstMatch[1]}</span>);
    } else {
      parts.push(<span key={key++} className="desc-attention">{firstMatch[1]}</span>);
    }

    remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
  }

  return parts;
}

function ItemDetail() {
  // Router: URL-Parameter :id auslesen (aus Route path="/item/:id")
  const { id } = useParams();

  // Context: addToCart aus CartContext – kein Prop-Drilling nötig
  const { addToCart } = useCart();

  // === STATE ===
  const [item, setItem]       = useState(null);    // geladenes Item-Objekt
  const [loading, setLoading] = useState(true);    // Ladezustand für Conditional Rendering

  // === useEffect: Item-Daten laden ===
  // Wird ausgeführt wenn id sich ändert (z.B. Navigation zu anderem Item)
  // id im Dependency-Array → bei jeder neuen ID neu laden
  useEffect(() => {
    async function load() {
      try {
        const v = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
        const versions = await v.json();
        const version = versions[0];

        const res = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
        );
        const data = await res.json();
        const raw = data.data[id]; // direkter Zugriff auf Item per ID
        if (!raw) return;

        setItem({
          id,
          name: raw.name,
          price: raw.gold?.total ?? 0,
          descBlocks: parseDescription(raw.description ?? ""),
          image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`,
          tags: raw.tags ?? [],
          stats: raw.stats ?? {},
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false); // Ladezustand beenden egal ob Erfolg oder Fehler
      }
    }
    load();
  }, [id]); // id als Dependency → neu laden wenn andere Detailseite aufgerufen wird

  // Conditional Rendering mit &&-Operator: Ladeindikator anzeigen
  if (loading) return <div className="page detail"><p className="muted-text">Loading...</p></div>;
  // Conditional Rendering: Item nicht gefunden
  if (!item)   return <div className="page detail"><p className="muted-text">Item not found.</p></div>;

  // Array.filter(): Beschreibungsblöcke nach Typ trennen
  const statBlocks    = item.descBlocks.filter(b => b.type === "stat");
  const abilityBlocks = item.descBlocks.filter(b => b.type !== "stat");

  return (
    <div className="page detail">
      {/* Router: Link zurück zur Übersicht */}
      <Link to="/" className="back-link">← Back to Shop</Link>

      <div className="detail-card">
        <div className="detail-image-wrap">
          <img src={item.image} alt={item.name} />
        </div>

        <div className="detail-info">
          <h1>{item.name}</h1>

          <div className="detail-price">
            <span className="gold-coin">◈</span>
            {item.price} Gold
          </div>

          {/* Conditional Rendering mit &&: Tags nur anzeigen wenn vorhanden
              Array.filter(): NonbootsMovement ausblenden */}
          {item.tags.filter(t => t !== "NonbootsMovement").length > 0 && (
            <div className="detail-tags">
              {/* Array.map(): Tags als Badges rendern – key = tag-String */}
              {item.tags.filter(t => t !== "NonbootsMovement").map(tag => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
          )}

          {/* Conditional Rendering: Stat-Block nur wenn Stats vorhanden */}
          {statBlocks.length > 0 && (
            <div className="desc-stats">
              {/* Array.map(): Stat-Zeilen rendern – key = Index (Reihenfolge ist stabil) */}
              {statBlocks.map((b, i) => (
                <div className="desc-stat-line" key={i}>{b.text}</div>
              ))}
            </div>
          )}

          {/* Conditional Rendering mit &&: Ability-Beschreibung nur wenn vorhanden */}
          {abilityBlocks.length > 0 && (
            <div className="desc-body">
              {abilityBlocks.map((b, i) => (
                <p key={i} className={`desc-line desc-${b.type}`}>
                  {/* Conditional Rendering mit ternärem Operator:
                      ability-Typ → Keywords hervorheben, sonst reiner Text */}
                  {b.type === "ability"
                    ? renderAbilityLine(b.raw)
                    : b.text}
                </p>
              ))}
            </div>
          )}

          {/* Eventhandling + Context: addToCart mit aktuellem Item aufrufen */}
          <button className="detail-btn" onClick={() => addToCart(item)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetail;