// 데이터 저장소: Firebase Realtime Database(실시간) / 설정이 없으면 localStorage(체험 모드)
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const ROOT = "pharaohCode";
  let db = null, offset = 0;

  if (cfg.apiKey && cfg.databaseURL && window.firebase) {
    try {
      firebase.initializeApp(cfg);
      db = firebase.database();
      db.ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
    } catch (e) { console.error("Firebase 초기화 실패", e); db = null; }
  }

  // ----- 체험 모드(localStorage) -----
  const LS = "pharaohCode_db";
  const bc = ("BroadcastChannel" in window) ? new BroadcastChannel("pharaohCode") : null;
  let listeners = [];
  const keys = p => p.split("/").filter(Boolean);
  const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
  function root() { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch (e) { return {}; } }
  function getAt(o, p) { return keys(p).reduce((a, k) => a == null ? undefined : a[k], o); }
  function setAt(o, p, v) {
    const ks = keys(p); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) {
      if (typeof cur[ks[i]] !== "object" || cur[ks[i]] === null) cur[ks[i]] = {};
      cur = cur[ks[i]];
    }
    const last = ks[ks.length - 1];
    if (v === null || v === undefined) delete cur[last]; else cur[last] = v;
  }
  function notify() { const r = root(); listeners.forEach(l => l.cb(clone(getAt(r, l.path)))); }
  function save(r) { try { localStorage.setItem(LS, JSON.stringify(r)); } catch (e) {} if (bc) bc.postMessage(1); notify(); }
  if (bc) bc.onmessage = notify;
  window.addEventListener("storage", e => { if (e.key === LS) notify(); });

  const ref = p => db.ref(ROOT + "/" + p);

  window.Store = {
    online: !!db,
    now: () => Date.now() + offset,                       // 서버 기준 현재 시각
    ts: () => db ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
    async get(p) { if (db) return (await ref(p).get()).val(); return clone(getAt(root(), p)); },
    async set(p, v) { if (db) return ref(p).set(v); const r = root(); setAt(r, p, v); save(r); },
    async update(p, obj) {
      if (db) return ref(p).update(obj);
      const r = root(); for (const k in obj) setAt(r, p + "/" + k, obj[k]); save(r);
    },
    async remove(p) { return this.set(p, null); },
    on(p, cb) {
      if (db) { const h = ref(p).on("value", s => cb(s.val())); return () => ref(p).off("value", h); }
      const l = { path: p, cb }; listeners.push(l); cb(clone(getAt(root(), p)));
      return () => { listeners = listeners.filter(x => x !== l); };
    },
    // fn이 undefined를 돌려주면 취소
    async transaction(p, fn) {
      if (db) { const r = await ref(p).transaction(fn); return { committed: r.committed, value: r.snapshot.val() }; }
      const r = root(); const cur = clone(getAt(r, p)); const nv = fn(cur);
      if (nv === undefined) return { committed: false, value: cur };
      setAt(r, p, nv); save(r); return { committed: true, value: nv };
    }
  };
})();
