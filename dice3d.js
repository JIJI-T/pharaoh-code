// ===== 3D 주사위 (8·10·12면체) — 외부 라이브러리 없이 캔버스로 그림 =====
(function () {
  // ---------- 벡터 · 쿼터니언 ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const avg = vs => scale(vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]), 1 / vs.length);

  const qAxis = (ax, ang) => { const s = Math.sin(ang / 2), n = norm(ax); return [Math.cos(ang / 2), n[0] * s, n[1] * s, n[2] * s]; };
  const qMul = (a, b) => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  function qSlerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(x => -x); d = -d; }
    if (d > 0.9995) { const r = a.map((x, i) => x + (b[i] - x) * t); const l = Math.hypot(...r); return r.map(x => x / l); }
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map((x, i) => x * wa + b[i] * wb);
  }
  function qRot(q, v) {
    const [w, x, y, z] = q;
    const m = [
      [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
      [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
      [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
    return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
  }
  function qFromRows(r) { // 회전행렬(행 r0,r1,r2) → 쿼터니언
    const m00 = r[0][0], m11 = r[1][1], m22 = r[2][2], tr = m00 + m11 + m22;
    let w, x, y, z;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (r[2][1] - r[1][2]) / s; y = (r[0][2] - r[2][0]) / s; z = (r[1][0] - r[0][1]) / s; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (r[2][1] - r[1][2]) / s; x = s / 4; y = (r[0][1] + r[1][0]) / s; z = (r[0][2] + r[2][0]) / s; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (r[0][2] - r[2][0]) / s; x = (r[0][1] + r[1][0]) / s; y = s / 4; z = (r[1][2] + r[2][1]) / s; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (r[1][0] - r[0][1]) / s; x = (r[0][2] + r[2][0]) / s; y = (r[1][2] + r[2][1]) / s; z = s / 4; }
    return [w, x, y, z];
  }

  // ---------- 다면체 모양 ----------
  function finish(verts, faces, upFn) {
    const R = Math.max(...verts.map(len)); verts = verts.map(v => scale(v, 1 / R));
    return faces.map((f, k) => {
      let vs = f.map(i => verts[i]);
      const c = avg(vs);
      let n = norm(cross(sub(vs[1], vs[0]), sub(vs[2], vs[0])));
      if (dot(n, c) < 0) { vs = vs.slice().reverse(); n = scale(n, -1); }
      let up = sub(upFn(vs, k), c); up = norm(sub(up, scale(n, dot(up, n))));
      const inr = Math.min(...vs.map((v, i) => { const w = vs[(i + 1) % vs.length]; const e = norm(sub(w, v)); const p = sub(c, v); return len(sub(p, scale(e, dot(p, e)))); }));
      return { vs, c, n, up, inr };
    });
  }
  function d8() {
    const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const f = [];
    for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) f.push([x, y, z]);
    return finish(v, f, vs => vs[0]);
  }
  function d10() {
    const a = 0.1056, h = 1.0, v = [[0, 0, h], [0, 0, -h]];
    for (let k = 0; k < 5; k++) { const t = k * 2 * Math.PI / 5; v.push([Math.cos(t), Math.sin(t), a]); }           // 2..6 위쪽 고리
    for (let k = 0; k < 5; k++) { const t = k * 2 * Math.PI / 5 + Math.PI / 5; v.push([Math.cos(t), Math.sin(t), -a]); } // 7..11 아래쪽 고리
    const f = [];
    for (let k = 0; k < 5; k++) {
      f.push([0, 2 + k, 7 + k, 2 + (k + 1) % 5]);
      f.push([1, 7 + k, 2 + (k + 1) % 5, 7 + (k + 1) % 5]);
    }
    return finish(v, f, (vs) => { // 꼭짓점(극) 쪽이 위
      return vs.reduce((b, p) => Math.abs(p[2]) > Math.abs(b[2]) ? p : b, vs[0]);
    });
  }
  function d12() {
    const p = (1 + Math.sqrt(5)) / 2, ip = 1 / p, v = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    for (const s of [-1, 1]) for (const t of [-1, 1]) { v.push([0, s * ip, t * p]); v.push([s * ip, t * p, 0]); v.push([s * p, 0, t * ip]); }
    const normals = [];
    for (const s of [-1, 1]) for (const t of [-1, 1]) { normals.push([0, s * p, t]); normals.push([s * p, t, 0]); normals.push([s, 0, t * p]); }
    const f = normals.map(nm => {
      const n = norm(nm), d = v.map(x => dot(x, n)), mx = Math.max(...d);
      const ids = v.map((_, i) => i).filter(i => d[i] > mx - 1e-6);
      const c = avg(ids.map(i => v[i])), e1 = norm(sub(v[ids[0]], c)), e2 = cross(n, e1);
      return ids.sort((i, j) => Math.atan2(dot(sub(v[i], c), e2), dot(sub(v[i], c), e1)) - Math.atan2(dot(sub(v[j], c), e2), dot(sub(v[j], c), e1)));
    });
    return finish(v, f, vs => vs[0]);
  }
  const SHAPES = { 8: d8(), 10: d10(), 12: d12() };
  // 반대쪽 면의 합이 (N+1)이 되도록 번호 붙이기 (실제 주사위처럼)
  Object.entries(SHAPES).forEach(([sides, faces]) => {
    const N = +sides; let next = 1; faces.forEach(f => f.num = 0);
    faces.forEach(f => {
      if (f.num) return;
      const opp = faces.reduce((b, g) => dot(g.n, f.n) < dot(b.n, f.n) ? g : b, faces[0]);
      f.num = next; opp.num = N + 1 - next; next++;
    });
  });

  const COLOR = { 8: [178, 40, 34], 10: [30, 112, 60], 12: [30, 74, 160] };
  const LIGHT = norm([-0.45, 0.65, 0.9]);
  const VIEW_TILT = qAxis([1, 0, 0], -0.38); // 살짝 위에서 내려다보는 각도

  // 결과 숫자 면이 정면(위가 위쪽)을 보도록 하는 방향
  function restQuat(sides, value, twist) {
    const f = SHAPES[sides].find(x => x.num === value) || SHAPES[sides][0];
    const t = f.up, n = f.n, a = cross(t, n);
    return qMul(VIEW_TILT, qMul(qAxis([0, 0, 1], twist || 0), qFromRows([a, t, n])));
  }
  function randQuat() { return norm4([Math.random() - .5, Math.random() - .5, Math.random() - .5, Math.random() - .5]); }
  function norm4(q) { const l = Math.hypot(...q) || 1; return q.map(x => x / l); }

  // ---------- 그리기 ----------
  function draw(cv, sides, q, opts) {
    opts = opts || {};
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 90, H = cv.clientHeight || 90;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext("2d"), S = Math.min(W, H) * 0.4, cx = W / 2, cy = H / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const base = COLOR[sides];
    const faces = SHAPES[sides].map(f => ({ f, n: qRot(q, f.n) })).filter(o => o.n[2] > 0.01).sort((a, b) => a.n[2] - b.n[2]);
    for (const { f, n } of faces) {
      const pts = f.vs.map(v => qRot(q, v));
      const lam = Math.max(0, dot(n, LIGHT)), spec = Math.pow(Math.max(0, dot(norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]), n)), 24);
      const k = 0.5 + 0.5 * lam;
      const col = base.map(c => Math.min(255, Math.round(c * k + 255 * spec * 0.22)));
      ctx.beginPath();
      pts.forEach((p, i) => { const x = cx + p[0] * S, y = cy - p[1] * S; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fillStyle = `rgb(${col})`; ctx.fill();
      ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke();
      if (opts.hideNums) continue;
      // 면 위에 숫자 (면 기울기에 맞춰 찌그러지게)
      const c = qRot(q, f.c), up = qRot(q, f.up), right = cross(up, n);
      const fs = f.inr * S * (sides === 8 ? 1.3 : sides === 10 ? 1.15 : 1.2);
      ctx.save();
      ctx.setTransform(dpr * right[0], -dpr * right[1], -dpr * up[0], dpr * up[1], dpr * (cx + c[0] * S), dpr * (cy - c[1] * S));
      ctx.globalAlpha = Math.min(1, n[2] * 1.6);
      ctx.font = `900 ${fs}px Cinzel, Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const label = String(f.num) + ((f.num === 6 || f.num === 9) && sides >= 10 ? "." : "");
      const dy = sides === 10 ? -fs * 0.08 : sides === 8 ? fs * 0.12 : fs * 0.04;
      ctx.lineWidth = Math.max(1.5, fs * 0.12); ctx.strokeStyle = "rgba(40,20,0,.55)"; ctx.strokeText(label, 0, dy);
      ctx.fillStyle = "#fff8e6"; ctx.fillText(label, 0, dy);
      ctx.restore();
    }
    if (opts.question) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `900 ${S * 0.9}px Cinzel, Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.strokeText("?", cx, cy + 2);
      ctx.fillStyle = "#fff"; ctx.fillText("?", cx, cy + 2);
    }
  }

  // ---------- 외부에서 쓰는 함수 ----------
  PC.dieHTML = (sides, v) =>
    `<canvas class="die3d" data-sides="${sides}" data-v="${v}"></canvas><span class="num" hidden>${v}</span><small>${sides}면</small>`;

  // 아직 안 그려진 주사위는 정지 상태로 그림
  function paintPending() {
    document.querySelectorAll("canvas.die3d:not([data-drawn])").forEach(cv => {
      if (!cv.isConnected || !cv.clientWidth) return;
      cv.dataset.drawn = "1";
      const sides = +cv.dataset.sides, v = parseInt(cv.dataset.v);
      if (isNaN(v)) { const q = qMul(VIEW_TILT, qAxis([0.3, 1, 0.2], 0.7)); draw(cv, sides, q, { hideNums: true, question: true }); }
      else draw(cv, sides, restQuat(sides, v, 0));
    });
    requestAnimationFrame(paintPending);
  }
  requestAnimationFrame(paintPending);
  // 글꼴이 늦게 로드되면 다시 그림
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll("canvas.die3d").forEach(c => { if (!c.dataset.rolling) delete c.dataset.drawn; }));

  // 굴리기: els = 주사위 요소들, finals = 나온 눈
  PC.rollAnim = function (els, finals, done) {
    let left = els.length;
    els.forEach((el, i) => {
      const cv = el.querySelector("canvas.die3d"), sides = PC.DICE_SIDES[i];
      cv.dataset.drawn = "1"; cv.dataset.rolling = "1"; cv.dataset.v = finals[i];
      const numEl = el.querySelector(".num"); if (numEl) numEl.textContent = finals[i];
      const q0 = randQuat(), axis = norm([Math.random() - .5, Math.random() - .5, Math.random() - .5]);
      const turns = (3.5 + Math.random() * 2) * Math.PI * 2;
      const qEnd = restQuat(sides, finals[i], (Math.random() - .5) * 0.5);
      const delay = i * 140, dur = 1700 + Math.random() * 300;
      const dir = Math.random() < .5 ? -1 : 1, X0 = dir * (40 + Math.random() * 30), H0 = 70 + Math.random() * 20;
      const t0 = performance.now() + delay;
      el.classList.add("rolling"); el.classList.remove("landed");
      function frame(now) {
        let t = (now - t0) / dur;
        if (t < 0) { el.style.transform = `translate(${X0}px,${-H0}px)`; el.style.opacity = 0; requestAnimationFrame(frame); return; }
        if (t > 1) t = 1;
        el.style.opacity = 1;
        const ang = turns * (1 - Math.pow(1 - t, 2.4));
        const spin = qMul(qAxis(axis, ang), q0);
        const w = t < 0.45 ? 0 : (x => x * x * (3 - 2 * x))((t - 0.45) / 0.55);
        const q = qSlerp(spin, qEnd, w);
        draw(cv, sides, q, { hideNums: false });
        // 튕기며 떨어지기
        const k = Math.pow(1 - t, 2);
        const y = -H0 * k * Math.abs(Math.cos(Math.PI * t * 3.2));
        const x = X0 * Math.pow(1 - t, 3);
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        if (t < 1) requestAnimationFrame(frame);
        else {
          el.style.transform = ""; delete cv.dataset.rolling;
          el.classList.remove("rolling"); el.classList.add("landed");
          if (--left === 0 && done) done();
        }
      }
      requestAnimationFrame(frame);
    });
  };
})();
