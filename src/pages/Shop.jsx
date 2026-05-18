// === KOMPONENTE: Shop ===
// Hauptansicht des Shops – zeigt alle Items mit Suchfeld, Rollenfilter und Grid

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

// Rollendefinitionen: jede Rolle hat ein Label, eine Beschreibung
// und eine match-Funktion die prüft ob ein Item zu ihr gehört
const ROLES = [
  {
    key: "fighter",
    label: "Fighter",
    desc: "Bruiser / Diver",
    match: (i) =>
      i.tags.includes("Damage") && i.tags.includes("Health") ||
      i.tags.includes("Damage") && i.tags.includes("Armor") ||
      i.tags.includes("Damage") && i.tags.includes("MagicResist") ||
      i.name.match(/Sterak|Trinity|Black Cleaver|Stridebreaker|Goredrinker|Sundered|Ravenous|Phage|Maw|Death.s Dance|Heartsteel|Overlord|Titanic|Hullbreaker|Jak.E|Iceborn|Frostfire|Warmog|Divine Sunderer|Spear of Shojin|Riftmaker/i),
  },
  {
    key: "tank",
    label: "Tank",
    desc: "Vanguard / Warden",
    match: (i) =>
      i.tags.includes("Tank") ||
      i.tags.includes("Health") && i.tags.includes("Armor") && !i.tags.includes("Damage") ||
      i.tags.includes("Health") && i.tags.includes("MagicResist") && !i.tags.includes("Damage") ||
      i.tags.includes("Armor") && i.tags.includes("MagicResist") ||
      i.name.match(/Sunfire|Thornmail|Frozen Heart|Gargoyle|Kaenic|Hollow Radiance|Unending|Force of Nature|Warmog|Spirit Visage|Randuin|Iceborn|Frostfire|Abyssal|Heartsteel|Overlord|Aegis|Locket|Null-Magic|Cloth Armor|Chain Vest|Negatron|Giant.s Belt|Ruby Crystal|Crystalline Bracer/i),
  },
  {
    key: "mage",
    label: "Mage",
    desc: "Battle / Artillery",
    match: (i) =>
      i.tags.includes("SpellDamage") ||
      i.tags.includes("Mana") && i.tags.includes("Health") ||
      i.name.match(/Needlessly|Blasting|Amplifying|Lost Chapter|Fiendish|Haunting|Forbidden Idol|Hextech|Rod of Ages|Seraph|Archangel|Tear|Catalyst|Rylai|Liandry|Demonic|Cosmic Drive|Shadowflame|Luden|Horizon|Stormsurge|Void Staff|Cryptbloom|Malignance|Zhonya|Rabadon|Nashor|Lich Bane|Moonstone|Shard of True Ice|Imperial Mandate|Staff of Flowing/i),
  },
  {
    key: "assassin",
    label: "Assassin",
    desc: "Skirmisher / Slayer",
    match: (i) =>
      i.tags.includes("Damage") && !i.tags.includes("Health") && !i.tags.includes("SpellDamage") && !i.tags.includes("CriticalStrike") && !i.tags.includes("AttackSpeed") ||
      i.name.match(/Duskblade|Edge of Night|Serpent.s Fang|Prowler|Axiom Arc|Hubris|Voltaic|Long Sword|Caulfield|Pickaxe|B\.F\.|Serrated|Dirk|Executioner/i),
  },
  {
    key: "marksman",
    label: "Marksman",
    desc: "ADC",
    match: (i) =>
      i.tags.includes("CriticalStrike") ||
      i.tags.includes("AttackSpeed") && i.tags.includes("Damage") ||
      i.name.match(/Infinity Edge|Kraken|Galeforce|Immortal Shieldbow|Navori|Lord Dominik|Mortal Reminder|Phantom Dancer|Runaan|Stormrazor|Wit.s End|Guinsoo|Rageblade|Recurve|Zeal|Cloak|Kircheis|Noonquiver|Vampiric/i),
  },
  {
    key: "support",
    label: "Support",
    desc: "Enchanter / Catcher",
    match: (i) =>
      i.tags.includes("Support") ||
      i.tags.includes("Vision") ||
      i.tags.includes("Stealth") ||
      i.name.match(/Ardent|Redemption|Locket|Mikael|Moonstone|Staff of Flow|Shurelya|Chemtech|Shelter|Vigilance|Zeke|Echoes|Forbidden Idol|Bandleglass|Frostfang|Relic Shield|Spectral|Spellthief|Steel Shoulderguards|World Atlas|Runic Compass|Bounty|Medallion|Targon|Verdant|Watchful|Control Ward|Stealth Ward|Oracle/i),
  },
  {
    key: "jungle",
    label: "Jungle",
    desc: "Smite Items",
    match: (i) => i.tags.includes("Jungle"),
  },
  {
    key: "boots",
    label: "Boots",
    desc: "Movement Items",
    match: (i) => i.tags.includes("Boots") || i.name.match(/Boots|Greaves|Treads|Sorcerer|Swiftness|Ionian|Mobility|Plated/i),
  },
];

// Hilfsfunktion: ordnet ein Item einer Rolle zu – erste passende Rolle 
function getRole(item) {
  if (item.tags.includes("Boots") || item.name.match(/Boots|Greaves|Treads|Sorcerer.s Shoes|Swiftness|Ionian|Mobility Boots|Plated Steelcaps/i))
    return "boots";
  if (item.tags.includes("Jungle")) return "jungle";
  for (const role of ROLES) {
    if (role.key !== "boots" && role.key !== "jungle" && role.match(item)) return role.key;
  }
  return "other";
}

function Shop() {
  // === STATE ===
  // items: Liste aller Items von der API → wird einmal beim Mount geladen (useEffect)
  const [items, setItems]           = useState([]);

  // search: kontrolliertes Formular-Element → State ist single source of truth
  const [search, setSearch]         = useState("");

  // activeRole: aktuell ausgewählter Filter → null = alle Items anzeigen
  const [activeRole, setActiveRole] = useState(null);

  
  const { addToCart } = useCart();

  // === useEffect: Daten laden ===
  // Wird einmal nach dem ersten Rendern ausgeführt (leeres Dependency-Array [])
  // Fetcht Items von der Riot Data Dragon API und speichert sie im State
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

        // Array.map(): Objekt-Einträge in ein einheitliches Format umwandeln
        const arr = Object.entries(data.data).map(([id, item]) => ({
          id,
          name: item.name,
          price: item.gold?.total ?? 0,
          purchasable: item.gold?.purchasable ?? true,
          tags: item.tags ?? [],                                                          //-----------------------------------------------
          requiredChampion: item.requiredChampion ?? null,
          requiredAlly: item.requiredAlly ?? null,
          image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`,
        }));

        // Array.filter(): Unnötige Items (Event-Items, Champion-spezifisch, etc.) entfernen
        const cleaned = arr.filter((i) =>
          i.price > 0 &&
          i.name &&
          i.purchasable === true &&
          !i.requiredChampion &&
          !i.requiredAlly &&
          !i.name.toLowerCase().includes("test") &&
          !i.name.toLowerCase().includes("disabled") &&
          !i.name.toLowerCase().includes("party favor") &&
          !i.name.toLowerCase().includes("cappa juice")
        );

        // Spread-Operator + Map: Duplikate nach Name entfernen
        const unique = Array.from(
          new Map(cleaned.map((item) => [item.name, item])).values()
        );

        setItems(unique);
      } catch (err) {
        console.log(err);
      }
    }
    load();
  }, []); // leeres Array = nur einmal beim ersten Rendern

  const allRoles = [
    ...ROLES, // Spread-Operator: ROLES-Array erweitern
    { key: "other", label: "Other", desc: "Components & More" },
  ];

  // Array.filter(): Items nach Suche UND aktiver Rolle filtern
  // Beide Bedingungen müssen true sein → logisches UND (&&)
  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !activeRole || getRole(i) === activeRole;
    return matchSearch && matchRole;
  });

  // Array.find(): Aktive Rollendaten für Überschrift holen
  const activeRoleData = allRoles.find(r => r.key === activeRole);

  return (
    <div className="shopLayout">

      {/* === SIDEBAR: Rollenfilter ===
          Unterkomponente könnte man auslagern – hier inline, da State (activeRole)
          direkt in Shop liegt und per onClick verändert wird (kein State-Lifting nötig) */}
      <aside className="sidebar">
        <div className="sidebarTitle">Filter</div>
        <ul className="filterList">

          {/* "All Items" Button – setzt activeRole zurück auf null */}
          <li>
            {/* Conditional Styling mit ternärem Operator:
                activeRole === null → "active"-Klasse hinzufügen, sonst leerer String */}
            <button
              className={`filterItem ${!activeRole ? "active" : ""}`}
              onClick={() => setActiveRole(null)} // Eventhandling: State zurücksetzen
            >
              <span className="filterDot" />
              <span className="filterLabel">
                All Items
                <span className="filterDesc">Full Shop</span>
              </span>
              <span className="filterCount">{items.length}</span>
            </button>
          </li>

          <li className="filterSeparator" />

          {/* Array.map(): Alle Rollen als Buttons rendern → key-Attribut nicht vergessen! */}
          {allRoles.map(role => {
            // Array.filter() + .length: Anzahl der Items pro Rolle berechnen
            const count = items.filter(i => getRole(i) === role.key).length;

            // Conditional Rendering mit &&: Rolle ausblenden wenn keine Items vorhanden
            if (count === 0) return null;

            return (
              <li key={role.key}> {/* key-Attribut: eindeutige ID für React's Reconciliation */}
                <button
                  // Conditional Styling: aktive Rolle bekommt "active"-Klasse
                  className={`filterItem ${activeRole === role.key ? "active" : ""}`}
                  // Eventhandling: Klick togglet die Rolle (nochmal klicken = deaktivieren)
                  onClick={() => setActiveRole(activeRole === role.key ? null : role.key)}
                >
                  <span className="filterDot" />
                  <span className="filterLabel">
                    {role.label}
                    <span className="filterDesc">{role.desc}</span>
                  </span>
                  <span className="filterCount">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* === HAUPTBEREICH: Suchfeld + Item-Grid === */}
      <div className="shopMain">
        <div className="hero">
          {/* Conditional Rendering mit ternärem Operator:
              Wenn eine Rolle aktiv ist → Rollenname anzeigen, sonst "Item Shop" */}
          <h1>{activeRoleData ? activeRoleData.label : "Item Shop"}</h1>
          <div className="heroRow">
            {/* Kontrolliertes Formular-Element:
                value kommt aus State (search), onChange schreibt zurück in State
                → State ist die single source of truth für den Input-Wert */}
            <input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)} // Eventhandling: State aktualisieren
            />
            <span className="resultsCount">
              {filtered.length} Items
              {/* Conditional Rendering mit &&: Rolenanzeige nur wenn Filter aktiv */}
              {activeRoleData && ` · ${activeRoleData.desc}`}
            </span>
          </div>
        </div>

        {/* Array.map(): Gefilterte Items als Cards rendern */}
        <div className="grid">
          {filtered.map((item) => (
            // key-Attribut: item.id als eindeutiger Schlüssel für React
            <div className="card" key={item.id}>
              {/* Router: Link-Komponente aus react-router-dom für Navigation zur Detailseite */}
              <Link to={`/item/${item.id}`}>
                <img src={item.image} alt={item.name} />
              </Link>
              <div className="cardContent">
                <h3>{item.name}</h3>
                <p>{item.price} Gold</p>
                {/* Eventhandling + Context: addToCart kommt aus CartContext (kein Prop-Drilling)
                    item wird als Prop-ähnliches Argument übergeben */}
                <button onClick={() => addToCart(item)}>Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Shop;
