// === KOMPONENTE: BuildPlaner ===
// 6-Item Build-Planer mit kombinierter Stat-Anzeige und Item-Suche

import { useEffect, useState } from "react";

// Stat-Definitionen: welche Stats angezeigt werden und mit welchem Max-Wert
// für die Prozent-Balken (Max ist ein sinnvoller Spielwert, nicht API-Max)
const STAT_CONFIG = [
  { key: "FlatPhysicalDamageMod",    label: "Attack Damage",    max: 120 },
  { key: "FlatMagicDamageMod",       label: "Ability Power",    max: 200 },
  { key: "FlatHPPoolMod",            label: "Health",           max: 1200 },
  { key: "FlatMPPoolMod",            label: "Mana",             max: 1000 },
  { key: "FlatArmorMod",             label: "Armor",            max: 100  },
  { key: "FlatSpellBlockMod",        label: "Magic Resist",     max: 100  },
  { key: "FlatCritChanceMod",        label: "Crit Chance",      max: 1,   percent: true },
  { key: "FlatMovementSpeedMod",     label: "Move Speed",       max: 60   },
  { key: "PercentAttackSpeedMod",    label: "Attack Speed",     max: 1,   percent: true },
  { key: "PercentLifeStealMod",      label: "Life Steal",       max: 0.3, percent: true },
];

const MAX_SLOTS = 6;

function BuildPlaner() {
  // === STATE ===
  // allItems: alle ladbaren Items für die Suche
  const [allItems, setAllItems]     = useState([]);
  // build: Array mit bis zu 6 Items (oder null für leere Slots)
  const [build, setBuild]           = useState(Array(MAX_SLOTS).fill(null));
  // search: kontrolliertes Eingabefeld zum Durchsuchen der Item-Liste
  const [search, setSearch]         = useState("");

  // === useEffect: Items von API laden ===
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

        // Array.map(): Rohdaten in einheitliches Format
        const arr = Object.entries(data.data).map(([id, item]) => ({
          id,
          name: item.name,
          price: item.gold?.total ?? 0,
          purchasable: item.gold?.purchasable ?? true,
          tags: item.tags ?? [],
          stats: item.stats ?? {},
          requiredChampion: item.requiredChampion ?? null,
          requiredAlly: item.requiredAlly ?? null,
          image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`,
        }));

        // Array.filter(): Event-Items, Champion-spezifische Items, etc. entfernen
        const cleaned = arr.filter(i =>
          i.price > 0 && i.purchasable &&
          !i.requiredChampion && !i.requiredAlly &&
          !i.name.toLowerCase().includes("test") &&
          !i.name.toLowerCase().includes("disabled") &&
          !i.name.toLowerCase().includes("party favor") &&
          !i.name.toLowerCase().includes("cappa juice")
        );

        // Spread + Map: Duplikate nach Name entfernen
        const unique = Array.from(
          new Map(cleaned.map(i => [i.name, i])).values()
        );

        setAllItems(unique);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  // Item zum Build hinzufügen – in ersten leeren Slot
  function addToBuild(item) {
    // Array.find(): ersten leeren Slot (null) finden
    const emptyIdx = build.findIndex(s => s === null);
    if (emptyIdx === -1) return; // Build voll

    // Spread-Operator: Build-Array kopieren und Slot befüllen
    const newBuild = [...build];
    newBuild[emptyIdx] = item;
    setBuild(newBuild);
  }

  // Item aus Slot entfernen
  function removeFromBuild(idx) {
    const newBuild = [...build];
    newBuild[idx] = null;
    setBuild(newBuild);
  }

  // Build leeren
  function clearBuild() {
    setBuild(Array(MAX_SLOTS).fill(null));
  }

  // === Kombinierte Stats berechnen ===
  // Array.filter() + reduce(): Alle nicht-null Slots zusammenaddieren
  const filledItems = build.filter(Boolean);

  // Array.reduce(): Stats aller Items aufaddieren
  const combinedStats = filledItems.reduce((acc, item) => {
    Object.entries(item.stats).forEach(([key, val]) => {
      acc[key] = (acc[key] ?? 0) + val;
    });
    return acc;
  }, {});

  // Array.reduce(): Gesamtgold berechnen
  const totalGold = filledItems.reduce((sum, i) => sum + i.price, 0);

  const filledSlots = filledItems.length;

  // Array.filter(): Items nach Suche filtern
  const searchResults = allItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 80); // Max 80 für Performance

  // Items die schon im Build sind → als disabled markieren
  const buildIds = new Set(build.filter(Boolean).map(i => i.id));

  return (
    <div className="build-page">
      <div className="build-header">
        <div>
          <h1>Build Planer</h1>
          <p>Stelle dein 6-Item Build zusammen und sieh die kombinierten Stats</p>
        </div>
        {/* Conditional Rendering mit && */}
        {filledSlots > 0 && (
          <span style={{ color: 'var(--lol-muted)', fontSize: '11px', letterSpacing: '1px' }}>
            {filledSlots} / {MAX_SLOTS} Items
          </span>
        )}
      </div>

      <div className="build-layout">

        {/* ─── LINKE SPALTE: Slots + Item-Suche ─── */}
        <div>
          <div className="slots-label">Item Slots</div>

          {/* Array.map() mit Index: 6 Slots rendern – key = Index */}
          <div className="slots-grid">
            {build.map((item, idx) => (
              <div
                key={idx}
                className={`slot ${item ? "filled" : "empty"}`}
              >
                {/* Conditional Rendering: gefüllter Slot zeigt Item, leerer Slot zeigt + */}
                {item ? (
                  <>
                    <img src={item.image} alt={item.name} />
                    {/* Hover-Overlay zum Entfernen */}
                    <div className="slot-remove" onClick={() => removeFromBuild(idx)}>✕</div>
                  </>
                ) : null}
              </div>
            ))}
          </div>

          {/* Aktions-Buttons */}
          <div className="build-actions">
            <button className="build-btn danger" onClick={clearBuild}>
              Build leeren
            </button>
          </div>

          {/* ─── Item-Suche ─── */}
          <div className="build-search-section" style={{ marginTop: '28px' }}>
            <div className="build-search-label">Items hinzufügen</div>

            {/* Kontrolliertes Formular-Element */}
            <input
              className="build-search-input"
              placeholder="Item suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {/* Array.map(): Item-Thumbnails rendern */}
            <div className="build-item-list">
              {searchResults.map(item => (
                <div
                  key={item.id}
                  // Conditional Styling: Items die schon im Build sind → disabled
                  className={`build-item-thumb ${buildIds.has(item.id) || filledSlots >= MAX_SLOTS ? "disabled" : ""}`}
                  onClick={() => {
                    if (!buildIds.has(item.id) && filledSlots < MAX_SLOTS) addToBuild(item);
                  }}
                >
                  <img src={item.image} alt={item.name} />
                  <div className="build-item-tooltip">{item.name} · {item.price}g</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RECHTE SPALTE: Stats-Panel ─── */}
        <div>
          <div className="build-panel">
            <div className="build-panel-header">
              <span>Build Stats</span>
              {/* Conditional Rendering: Gesamtgold nur wenn Items im Build */}
              {totalGold > 0
                ? <span className="build-total-gold">⬡ {totalGold.toLocaleString()} Gold</span>
                : <span style={{ color: 'var(--lol-muted)', fontSize: '10px' }}>Leer</span>
              }
            </div>

            <div className="build-stats-body">
              {/* Conditional Rendering: leer vs. Stats */}
              {filledSlots === 0 ? (
                <div className="build-empty-msg">
                  Klicke auf Items unten links,<br />
                  um sie zum Build hinzuzufügen.
                </div>
              ) : (
                <>
                  {/* Array.filter() + map(): Nur Stats anzeigen die > 0 sind */}
                  {STAT_CONFIG.filter(s => combinedStats[s.key] > 0).map(stat => {
                    const raw = combinedStats[stat.key] ?? 0;
                    const display = stat.percent
                      ? Math.round(raw * 100) + "%"
                      : Math.round(raw);
                    const pct = Math.min((raw / stat.max) * 100, 100);

                    return (
                      <div className="build-stat" key={stat.key}>
                        <span className="build-stat-name">{stat.label}</span>
                        <div className="build-stat-bar-wrap">
                          <div className="build-stat-bar" style={{ width: pct + "%" }} />
                        </div>
                        <span className="build-stat-val">{display}</span>
                      </div>
                    );
                  })}

                  {/* Conditional Rendering: Wenn keine Stats vorhanden */}
                  {STAT_CONFIG.filter(s => combinedStats[s.key] > 0).length === 0 && (
                    <div className="build-empty-msg">
                      Diese Items haben keine<br />messbaren Stats.
                    </div>
                  )}

                  {/* Item-Zusammenfassung */}
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--lol-gold-4)', paddingTop: '12px' }}>
                    <div className="slots-label" style={{ marginBottom: '8px' }}>Im Build</div>
                    {/* Array.filter() + map(): Nur gefüllte Slots auflisten */}
                    {build.filter(Boolean).map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 0',
                        borderBottom: '1px solid rgba(200,155,60,0.06)',
                        fontSize: '11px', color: 'var(--lol-text-light)'
                      }}>
                        <img src={item.image} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ color: 'var(--lol-gold-3)', fontWeight: 700 }}>{item.price}g</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default BuildPlaner;