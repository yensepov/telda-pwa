import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// TeldA v4 — Контроль средней скорости | Трассы Казахстана
// Telegram Mini App + PWA
// Симулятор скрыт: 5 быстрых тапов по логотипу TeldA
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes();
}

// ─── Трасса: Алматы ↔ Шымкент ───
const ROUTE_ALMATY_SHYMKENT = [
  { from: "Алматы", to: "Кайнар", km: 237, lat1: 43.238, lon1: 76.946, lat2: 43.516, lon2: 75.093 },
  { from: "Кайнар", to: "Ахтоган", km: 112, lat1: 43.516, lon1: 75.093, lat2: 43.182, lon2: 74.724 },
  { from: "Ахтоган", to: "Луговое", km: 31, lat1: 43.182, lon1: 74.724, lat2: 43.122, lon2: 74.637 },
  { from: "Луговое", to: "Акшолак", km: 74, lat1: 43.122, lon1: 74.637, lat2: 43.060, lon2: 73.633 },
  { from: "Акшолак", to: "Тараз", km: 24, lat1: 43.060, lon1: 73.633, lat2: 42.922, lon2: 71.395 },
  { from: "Тараз", to: "Тараз²", km: 58, lat1: 42.922, lon1: 71.395, lat2: 42.880, lon2: 71.300 },
  { from: "Тараз²", to: "Куйик", km: 21, lat1: 42.880, lon1: 71.300, lat2: 42.800, lon2: 70.870 },
  { from: "Куйик", to: "Шакпак", km: 40, lat1: 42.800, lon1: 70.870, lat2: 42.750, lon2: 70.420 },
  { from: "Шакпак", to: "Машат", km: 60, lat1: 42.750, lon1: 70.420, lat2: 42.510, lon2: 69.870 },
  { from: "Машат", to: "Ынтымак", km: 21, lat1: 42.510, lon1: 69.870, lat2: 42.406, lon2: 69.633 },
  { from: "Ынтымак", to: "Темирлан", km: 53, lat1: 42.406, lon1: 69.633, lat2: 42.355, lon2: 69.635 },
  { from: "Темирлан", to: "Спатаев", km: 35, lat1: 42.355, lon1: 69.635, lat2: 42.316, lon2: 69.589 },
  { from: "Спатаев", to: "Староикан", km: 62, lat1: 42.316, lon1: 69.589, lat2: 42.190, lon2: 69.350 },
  { from: "Староикан", to: "Шымкент", km: 32, lat1: 42.190, lon1: 69.350, lat2: 42.340, lon2: 69.520 },
];

// ─── Трасса: Шымкент ↔ Кызылорда ───
const ROUTE_SHYMKENT_KYZYLORDA = [
  { from: "Телемост", to: "Темирлан", km: 16, lat1: 42.5528, lon1: 69.3191, lat2: 42.6564, lon2: 69.2335 },
  { from: "Темирлан", to: "Жиенкум", km: 34, lat1: 42.6564, lon1: 69.2335, lat2: 42.8854, lon2: 69.0217 },
  { from: "Жиенкум", to: "Староикан", km: 62, lat1: 42.8854, lon1: 69.0217, lat2: 43.2287, lon2: 68.4436 },
  { from: "Староикан", to: "Туркестан", km: 32, lat1: 43.2287, lon1: 68.4436, lat2: 43.3533, lon2: 68.1433 },
  { from: "Туркестан", to: "Беш-Арык", km: 35, lat1: 43.3533, lon1: 68.1433, lat2: 43.5270, lon2: 67.7909 },
  { from: "Беш-Арык", to: "Сунаката", km: 98, lat1: 43.5270, lon1: 67.7909, lat2: 44.1375, lon2: 66.9689 },
  { from: "Сунаката", to: "Байгекум", km: 47, lat1: 44.1375, lon1: 66.9689, lat2: 44.3082, lon2: 66.4956 },
  { from: "Байгекум", to: "Бирказан", km: 87, lat1: 44.3082, lon1: 66.4956, lat2: 44.8081, lon2: 65.6776 },
];

const ROUTES = {
  "almaty-shymkent": { name: "Алматы ↔ Шымкент", segments: ROUTE_ALMATY_SHYMKENT, cityA: "Алматы", cityB: "Шымкент" },
  "shymkent-kyzylorda": { name: "Шымкент ↔ Кызылорда", segments: ROUTE_SHYMKENT_KYZYLORDA, cityA: "Шымкент", cityB: "Кызылорда" },
};

const SPEED_LIMIT = 110;
const CAM_RADIUS = 0.4; // km

const getSegmentsReverse = (segs) =>
  [...segs].reverse().map(s => ({
    ...s, from: s.to, to: s.from,
    lat1: s.lat2, lon1: s.lon2, lat2: s.lat1, lon2: s.lon1,
  }));

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

const fmtTime = s => { if (s < 0) s = 0; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
const fmtDelta = s => { const a = Math.abs(Math.floor(s)); return `${s >= 0 ? "+" : "−"}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };

const C = {
  bg: "#0a0e17", surface: "#111827", surfaceLight: "#1a2236", border: "#1e2d4a",
  text: "#e2e8f0", textDim: "#64748b",
  safe: "#10b981", safeBg: "#052e1c", warn: "#f59e0b", warnBg: "#3b2506",
  danger: "#ef4444", dangerBg: "#3b0f0f", accent: "#38bdf8", accentDim: "#0c4a6e",
};
const sCol = s => s <= 100 ? C.safe : s <= 110 ? C.warn : C.danger;
const sBg = s => s <= 100 ? C.safeBg : s <= 110 ? C.warnBg : C.dangerBg;
const sText = s => s <= 100 ? "Норма" : s <= 110 ? "Внимание" : "Превышение!";

// ═══════════════════════════════════════════════════════════════
export default function TeldA() {
  const [screen, setScreen] = useState("start");
  const [mode, setMode] = useState("gps");
  const [devMode, setDevMode] = useState(false);
  const [routeKey, setRouteKey] = useState("almaty-shymkent");
  const [direction, setDirection] = useState("forward");
  const [segments, setSegments] = useState(ROUTE_ALMATY_SHYMKENT);
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [dist, setDist] = useState(0);
  const [avg, setAvg] = useState(0);
  const [simSpeed, setSimSpeed] = useState(110);
  const [simOn, setSimOn] = useState(false);
  const [done, setDone] = useState([]);
  const [gps, setGps] = useState("off");
  const [gpsAcc, setGpsAcc] = useState(null);
  const [gpsSpd, setGpsSpd] = useState(null);
  const [gpsDist2Cam, setGpsDist2Cam] = useState(null);
  const [started, setStarted] = useState(false);
  const [wakeLock, setWakeLockState] = useState(false);

  const tapRef = useRef({ count: 0, timer: null });
  const watchRef = useRef(null);
  const wlRef = useRef(null);
  const scrollRef = useRef(null);
  const lastPos = useRef(null);
  const gpsDist = useRef(0);

  const seg = segments[idx] || segments[0];
  const minT = (seg.km / SPEED_LIMIT) * 3600;
  const delta = minT - elapsed;
  const prog = seg.km > 0 ? Math.min(dist / seg.km, 1) : 0;
  const remain = Math.max(seg.km - dist, 0);
  const totalKm = segments.reduce((a, s) => a + s.km, 0);
  const doneKm = done.reduce((a, s) => a + s.km, 0) + dist;

  // Secret dev mode: 5 taps on logo
  const handleLogoTap = () => {
    tapRef.current.count++;
    clearTimeout(tapRef.current.timer);
    if (tapRef.current.count >= 5) {
      setDevMode(d => !d);
      tapRef.current.count = 0;
    } else {
      tapRef.current.timer = setTimeout(() => { tapRef.current.count = 0; }, 800);
    }
  };

  // Wake Lock
  const reqWL = async () => {
    try {
      if ("wakeLock" in navigator) {
        wlRef.current = await navigator.wakeLock.request("screen");
        setWakeLockState(true);
        wlRef.current.addEventListener("release", () => setWakeLockState(false));
      }
    } catch (e) {}
  };
  const relWL = () => { if (wlRef.current) { wlRef.current.release(); wlRef.current = null; setWakeLockState(false); } };

  useEffect(() => {
    const h = () => { if (document.visibilityState === "visible" && screen === "driving" && mode === "gps") reqWL(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [screen, mode]);

  // GPS timer
  useEffect(() => {
    if (screen !== "driving" || !started) return;
    if (mode === "gps") {
      const t = setInterval(() => setElapsed(p => p + 1), 1000);
      return () => clearInterval(t);
    }
  }, [screen, mode, started]);

  // Sim engine
  useEffect(() => {
    if (!simOn || screen !== "driving" || mode !== "sim") return;
    const t = setInterval(() => {
      setElapsed(p => p + 1);
      setDist(p => p + simSpeed / 3600);
    }, 100);
    return () => clearInterval(t);
  }, [simOn, simSpeed, screen, mode]);

  // Avg speed
  useEffect(() => {
    if (elapsed > 0 && dist > 0) setAvg((dist / elapsed) * 3600);
  }, [elapsed, dist]);

  // Complete segment
  const completeSeg = useCallback(() => {
    const c = { ...seg, avgSpeed: elapsed > 0 ? (seg.km / elapsed) * 3600 : 0, time: elapsed };
    setDone(p => [...p, c]);
    if (idx < segments.length - 1) {
      setIdx(p => p + 1);
      setElapsed(0); setDist(0); setAvg(0); setGpsDist2Cam(null);
      gpsDist.current = 0;
      setStarted(true);
    } else {
      setSimOn(false); stopGPS(); relWL(); setScreen("done");
    }
  }, [seg, elapsed, idx, segments]);

  // Sim auto-advance
  useEffect(() => {
    if (mode === "sim" && dist >= seg.km && screen === "driving") completeSeg();
  }, [dist, seg.km, screen, mode]);

  // GPS watcher
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGps("error"); return; }
    setGps("searching");
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
        setGpsAcc(Math.round(accuracy));
        setGpsSpd(speed != null ? Math.round(speed * 3.6) : null);
        setGps("locked");

        if (lastPos.current && started) {
          const d = haversine(lastPos.current.lat, lastPos.current.lon, lat, lon);
          if (d > 0.005 && d < 2) { gpsDist.current += d; setDist(gpsDist.current); }
        }
        lastPos.current = { lat, lon };

        // Real distance to next camera
        const distToEnd = haversine(lat, lon, seg.lat2, seg.lon2);
        setGpsDist2Cam(distToEnd);

        // Check end camera
        if (started) {
          if (distToEnd < CAM_RADIUS) completeSeg();
        }

        // Check start camera
        if (!started) {
          const dStart = haversine(lat, lon, seg.lat1, seg.lon1);
          if (dStart < CAM_RADIUS) {
            setStarted(true); setElapsed(0); setDist(0);
            gpsDist.current = 0; lastPos.current = { lat, lon };
          }
        }
      },
      () => setGps("error"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [seg, started, completeSeg]);

  const stopGPS = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setGps("off");
  };

  useEffect(() => {
    if (screen === "driving" && mode === "gps" && gps === "off") startGPS();
  }, [screen, mode, gps, startGPS]);

  // Scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-idx="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [idx]);

  useEffect(() => () => { stopGPS(); relWL(); }, []);

  // Telegram Back Button
  useEffect(() => {
    if (!tg) return;
    if (screen === "start") {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      const handler = () => reset();
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
  }, [screen]);

  const startDriving = (m) => {
    const route = ROUTES[routeKey];
    const segs = direction === "forward" ? route.segments : getSegmentsReverse(route.segments);
    setSegments(segs); setMode(m); setIdx(0); setElapsed(0); setDist(0); setAvg(0);
    setDone([]); setSimOn(false); setStarted(m === "sim"); gpsDist.current = 0;
    lastPos.current = null; setScreen("driving");
    if (m === "gps") reqWL();
  };

  const reset = () => {
    setSimOn(false); stopGPS(); relWL(); setScreen("start");
    setIdx(0); setElapsed(0); setDist(0); setAvg(0); setDone([]); setStarted(false); setGpsDist2Cam(null);
  };

  // ═══ START ═══
  if (screen === "start") {
    const route = ROUTES[routeKey];
    const segs = direction === "forward" ? route.segments : getSegmentsReverse(route.segments);
    const tot = segs.reduce((a, s) => a + s.km, 0);
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace" }}>
        <div style={{ padding: "28px 24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "12px", letterSpacing: "6px", color: C.accent, textTransform: "uppercase", marginBottom: "6px", fontWeight: 500 }}>Контроль скорости</div>
          <div onClick={handleLogoTap} style={{ fontSize: "46px", fontWeight: 800, letterSpacing: "-2px", background: `linear-gradient(135deg, ${C.accent}, ${C.safe})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "default", userSelect: "none" }}>
            TeldA
          </div>
          <div style={{ fontSize: "11px", color: C.textDim, marginTop: "6px" }}>
            Средняя скорость между камерами • Офлайн
            {devMode && <span style={{ color: C.warn, marginLeft: "6px" }}>• DEV</span>}
          </div>
        </div>

        {/* Выбор трассы */}
        <div style={{ padding: "0 20px", marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", color: C.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "6px", paddingLeft: "4px" }}>Трасса</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(ROUTES).map(([key, r]) => (
              <button key={key} onClick={() => { setRouteKey(key); setDirection("forward"); }} style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px", border: routeKey === key ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                background: routeKey === key ? C.accentDim : C.surface, color: routeKey === key ? C.accent : C.textDim,
              }}>
                {r.name}
                <span style={{ float: "right", fontSize: "11px", fontWeight: 500, opacity: 0.7 }}>
                  {r.segments.length} уч. • {r.segments.reduce((a, s) => a + s.km, 0)} км
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Направление */}
        <div style={{ padding: "0 20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "6px", background: C.surface, borderRadius: "12px", padding: "3px", border: `1px solid ${C.border}` }}>
            {[{ k: "forward", l: `${route.cityA} → ${route.cityB}` }, { k: "reverse", l: `${route.cityB} → ${route.cityA}` }].map(d => (
              <button key={d.k} onClick={() => setDirection(d.k)} style={{
                flex: 1, padding: "12px 6px", borderRadius: "10px", border: "none", fontSize: "12px", fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer",
                background: direction === d.k ? C.accentDim : "transparent", color: direction === d.k ? C.accent : C.textDim,
              }}>{d.l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 20px", overflowY: "auto", maxHeight: "42vh", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: C.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", paddingLeft: "4px" }}>
            {segs.length} участков • {tot} км • лимит {SPEED_LIMIT} км/ч
          </div>
          {segs.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 12px", marginBottom: "3px", background: i % 2 === 0 ? C.surface : "transparent", borderRadius: "9px", gap: "10px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.from} → {s.to}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: C.accent, flexShrink: 0 }}>{s.km} км</div>
              <div style={{ fontSize: "10px", color: C.textDim, flexShrink: 0, width: "38px", textAlign: "right" }}>{Math.ceil((s.km / SPEED_LIMIT) * 60)}м</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "8px 20px 24px" }}>
          <button onClick={() => startDriving("gps")} style={{
            width: "100%", padding: "16px", borderRadius: "14px", border: "none", fontSize: "15px", fontWeight: 700,
            fontFamily: "inherit", cursor: "pointer",
            background: `linear-gradient(135deg, ${C.safe}, #059669)`, color: "#fff",
            boxShadow: `0 4px 20px ${C.safe}33`,
          }}>
            📡 ПОЕХАЛИ
          </button>
          {devMode && (
            <button onClick={() => startDriving("sim")} style={{
              width: "100%", padding: "12px", borderRadius: "12px", border: `1px solid ${C.warn}44`,
              fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              background: C.warnBg, color: C.warn, marginTop: "8px",
            }}>
              🎮 СИМУЛЯТОР (DEV)
            </button>
          )}
          <div style={{ textAlign: "center", fontSize: "10px", color: C.textDim, marginTop: "10px" }}>
            Работает офлайн • GPS телефона • Экран не гаснет
          </div>
        </div>
      </div>
    );
  }

  // ═══ DONE ═══
  if (screen === "done") {
    const over = done.filter(s => s.avgSpeed > SPEED_LIMIT);
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace", padding: "28px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "44px", marginBottom: "6px" }}>{over.length === 0 ? "✓" : "⚠"}</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: over.length === 0 ? C.safe : C.danger }}>
            {over.length === 0 ? "Отлично! Без превышений" : `Превышений: ${over.length}`}
          </div>
        </div>
        {done.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "10px 12px", marginBottom: "4px",
            background: C.surface, borderRadius: "9px",
            borderLeft: `3px solid ${s.avgSpeed > SPEED_LIMIT ? C.danger : C.safe}`, gap: "8px",
          }}>
            <div style={{ flex: 1, fontSize: "11px", fontWeight: 600 }}>{s.from} → {s.to}</div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: s.avgSpeed > SPEED_LIMIT ? C.danger : C.safe }}>{Math.round(s.avgSpeed)}</div>
            <div style={{ fontSize: "9px", color: C.textDim }}>км/ч</div>
          </div>
        ))}
        <button onClick={reset} style={{
          width: "100%", marginTop: "20px", padding: "14px", borderRadius: "12px",
          border: `1px solid ${C.border}`, fontSize: "13px", fontWeight: 600,
          fontFamily: "inherit", cursor: "pointer", background: C.surface, color: C.text,
        }}>← На главную</button>
      </div>
    );
  }

  // ═══ DRIVING ═══
  const sc2 = sCol(avg), sb2 = sBg(avg);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace", display: "flex", flexDirection: "column" }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 6px" }}>
        <button onClick={reset} style={{ background: "none", border: "none", color: C.textDim, fontSize: "12px", fontFamily: "inherit", cursor: "pointer", padding: "4px 6px" }}>✕</button>
        <div onClick={handleLogoTap} style={{ fontSize: "13px", fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, ${C.safe})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "default", userSelect: "none" }}>TeldA</div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {mode === "gps" && (
            <div style={{
              fontSize: "9px", padding: "3px 7px", borderRadius: "6px",
              background: gps === "locked" ? C.safeBg : gps === "error" ? C.dangerBg : C.warnBg,
              color: gps === "locked" ? C.safe : gps === "error" ? C.danger : C.warn, fontWeight: 600,
            }}>
              {gps === "locked" ? `±${gpsAcc}м` : gps === "searching" ? "GPS..." : "GPS ✕"}
            </div>
          )}
          {wakeLock && <div style={{ fontSize: "8px", padding: "3px 5px", borderRadius: "5px", background: C.accentDim, color: C.accent }}>🔒</div>}
          <div style={{ fontSize: "10px", color: C.textDim, padding: "3px 7px", background: C.surface, borderRadius: "6px" }}>{idx + 1}/{segments.length}</div>
        </div>
      </div>

      {/* GPS waiting */}
      {mode === "gps" && !started && (
        <div style={{ margin: "0 14px 8px", padding: "18px", borderRadius: "14px", background: C.warnBg, border: `1px solid ${C.warn}33`, textAlign: "center" }}>
          <div style={{ fontSize: "26px", marginBottom: "6px" }}>📡</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: C.warn, marginBottom: "5px" }}>
            {gps === "locked" ? "GPS подключён" : gps === "searching" ? "Ищу спутники..." : "Включите GPS"}
          </div>
          <div style={{ fontSize: "11px", color: C.textDim, lineHeight: 1.5 }}>
            {gps === "locked" ? `Подъезжайте к камере «${seg.from}»` : "Проверьте настройки геолокации"}
          </div>
          {gpsSpd != null && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: C.text }}>
              Скорость: <span style={{ fontWeight: 700, color: C.accent }}>{gpsSpd} км/ч</span>
              {gpsAcc && <span style={{ color: C.textDim }}> • ±{gpsAcc}м</span>}
            </div>
          )}
        </div>
      )}

      {/* Segment */}
      <div style={{ textAlign: "center", padding: "2px 20px 8px" }}>
        <div style={{ fontSize: "17px", fontWeight: 700 }}>
          {seg.from}<span style={{ color: C.accent, margin: "0 8px", fontSize: "13px" }}>→</span>{seg.to}
        </div>
        <div style={{ fontSize: "10px", color: C.textDim, marginTop: "3px" }}>{seg.km} км • лимит {SPEED_LIMIT} • мин. {fmtTime(minT)}</div>
      </div>

      {/* BIG SPEED */}
      <div style={{ margin: "0 14px", padding: "22px 16px", borderRadius: "18px", background: sb2, border: `2px solid ${sc2}33`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", width: "180px", height: "80px", background: `radial-gradient(ellipse, ${sc2}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: sc2, fontWeight: 600, marginBottom: "6px" }}>Средняя скорость</div>
        <div style={{ fontSize: "68px", fontWeight: 900, lineHeight: 1, color: sc2, letterSpacing: "-3px", textShadow: `0 0 36px ${sc2}44` }}>
          {elapsed > 0 ? Math.round(avg) : "—"}
        </div>
        <div style={{ fontSize: "13px", color: sc2, fontWeight: 600, marginTop: "3px", opacity: 0.7 }}>км/ч</div>
        <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 700, color: sc2, letterSpacing: "1px" }}>
          {elapsed > 0 ? sText(avg) : (mode === "gps" && !started ? "Ожидание камеры..." : "Ожидание...")}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", padding: "8px 14px" }}>
        {[
          { l: "Запас", v: elapsed > 0 ? fmtDelta(delta) : "—", c: elapsed > 0 ? (delta >= 0 ? C.safe : C.danger) : C.textDim },
          { l: "До камеры", v: mode === "gps" && gpsDist2Cam != null ? (gpsDist2Cam < 1 ? (gpsDist2Cam * 1000).toFixed(0) + " м" : gpsDist2Cam.toFixed(1)) : remain.toFixed(1), u: mode === "gps" && gpsDist2Cam != null && gpsDist2Cam >= 1 ? "км" : (mode === "gps" && gpsDist2Cam != null ? "" : "км"), c: C.accent },
          { l: "Время", v: fmtTime(elapsed), c: C.text },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: "12px", padding: "11px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "9px", color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{s.l}</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: s.c }}>{s.v}</div>
            {s.u && <div style={{ fontSize: "8px", color: C.textDim }}>{s.u}</div>}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ padding: "2px 14px 4px" }}>
        <div style={{ height: "7px", borderRadius: "4px", background: C.surfaceLight, overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", width: `${prog * 100}%`, borderRadius: "4px", background: `linear-gradient(90deg, ${sc2}, ${C.accent})`, transition: "width 0.3s" }} />
          <div style={{ position: "absolute", right: "-2px", top: "-4px", fontSize: "13px", filter: "grayscale(0.5)" }}>📷</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: C.textDim, marginTop: "3px" }}>
          <span>{seg.from}</span><span>{dist.toFixed(1)}/{seg.km} км</span><span>{seg.to}</span>
        </div>
      </div>

      {/* Strip */}
      <div ref={scrollRef} style={{ display: "flex", gap: "5px", padding: "6px 14px", overflowX: "auto", scrollbarWidth: "none" }}>
        {segments.map((s, i) => {
          const d2 = i < idx, cr = i === idx, dd = done[i];
          return (
            <div key={i} data-idx={i} style={{
              flexShrink: 0, width: "52px", padding: "6px 3px", borderRadius: "9px", textAlign: "center",
              background: cr ? C.accentDim : d2 ? C.surface : "transparent",
              border: cr ? `2px solid ${C.accent}` : `1px solid ${d2 ? C.border : C.border}44`,
              opacity: !d2 && !cr ? 0.35 : 1,
            }}>
              <div style={{ fontSize: "8px", fontWeight: 700, color: cr ? C.accent : d2 ? (dd?.avgSpeed > SPEED_LIMIT ? C.danger : C.safe) : C.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "1px" }}>{s.from.slice(0, 5)}</div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: d2 ? (dd?.avgSpeed > SPEED_LIMIT ? C.danger : C.safe) : cr ? C.text : C.textDim }}>
                {d2 && dd ? Math.round(dd.avgSpeed) : cr && avg > 0 ? Math.round(avg) : "—"}
              </div>
              <div style={{ fontSize: "7px", color: C.textDim }}>{s.km}км</div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ padding: "4px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: 1, height: "3px", borderRadius: "2px", background: C.surfaceLight, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(doneKm / totalKm) * 100}%`, background: C.accent, borderRadius: "2px" }} />
        </div>
        <div style={{ fontSize: "9px", color: C.textDim }}>{Math.round(doneKm)}/{totalKm} км</div>
      </div>

      {/* Bottom — GPS info or SIM controls */}
      <div style={{ padding: "6px 14px 18px", marginTop: "auto" }}>
        {mode === "sim" ? (
          <div style={{ background: C.surface, borderRadius: "14px", padding: "12px 14px", border: `1px solid ${C.warn}33` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "9px", color: C.warn, textTransform: "uppercase", letterSpacing: "2px" }}>DEV Симулятор</span>
              <span style={{ fontSize: "11px", color: C.accent, fontWeight: 700 }}>{simSpeed} км/ч</span>
            </div>
            <input type="range" min="60" max="160" step="5" value={simSpeed} onChange={e => setSimSpeed(Number(e.target.value))}
              style={{ width: "100%", height: "5px", appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to right, ${C.safe} 0%, ${C.safe} 25%, ${C.warn} 50%, ${C.danger} 75%, ${C.danger} 100%)`, borderRadius: "3px", outline: "none", marginBottom: "10px" }} />
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setSimOn(!simOn)} style={{
                flex: 1, padding: "12px", borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer",
                background: simOn ? `linear-gradient(135deg, ${C.warn}, #d97706)` : `linear-gradient(135deg, ${C.accent}, #2563eb)`, color: "#fff",
              }}>{simOn ? "⏸ ПАУЗА" : "▶ СТАРТ"}</button>
              {simOn && <button onClick={() => setDist(seg.km + 0.1)} style={{ padding: "12px 16px", borderRadius: "10px", border: `1px solid ${C.border}`, fontSize: "13px", fontFamily: "inherit", cursor: "pointer", background: C.surfaceLight, color: C.textDim }}>⏭</button>}
            </div>
          </div>
        ) : (
          <div style={{ background: C.surface, borderRadius: "14px", padding: "12px 14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
              {gpsSpd != null && (
                <div>
                  <div style={{ color: C.textDim, fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>Мгновенная</div>
                  <div style={{ fontWeight: 800, fontSize: "18px", color: C.text }}>{gpsSpd} <span style={{ fontSize: "10px", color: C.textDim }}>км/ч</span></div>
                </div>
              )}
              {gpsAcc != null && (
                <div>
                  <div style={{ color: C.textDim, fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>GPS точность</div>
                  <div style={{ fontWeight: 800, fontSize: "18px", color: gpsAcc < 20 ? C.safe : gpsAcc < 50 ? C.warn : C.danger }}>±{gpsAcc} <span style={{ fontSize: "10px", color: C.textDim }}>м</span></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
