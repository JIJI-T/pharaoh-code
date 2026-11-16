// 학생·교사 화면 공통 (규칙서 기준)
(function () {
  const LEVELS = [
    { name: "노랑", slots: 4, tiles: [17, 36, 30, 40, 21, 15, 24, 13, 8, 12, 11, 4, 14, 6, 18, 9, 5, 10, 7, 3, 20, 16] },
    { name: "파랑", slots: 3, tiles: [60, 35, 45, 28, 56, 22, 27, 32, 42, 19, 25, 72, 48] },
    { name: "빨강", slots: 2, tiles: [70, 50, 63, 54, 44, 26, 80, 23, 33] },
    { name: "검정", slots: 1, tiles: [90, 64, 49, 84] }
  ];
  // 같은 색 안에서 주사위로 만들기 어려운 절반이 높은 점수
  const HIGH = {
    0: [40, 36, 21, 30, 17, 20, 24, 18, 16, 13, 15], // 2점 (나머지 1점)
    1: [45, 25, 56, 35, 72, 27],                     // 4점 (나머지 3점)
    2: [44, 63, 33, 50],                             // 6점 (나머지 5점)
    3: [84, 49]                                      // 8점 (나머지 7점)
  };
  const BASE = [1, 3, 5, 7];
  const POINTS = {};
  LEVELS.forEach((L, li) => L.tiles.forEach(t => { POINTS[t] = BASE[li] + (HIGH[li].includes(t) ? 1 : 0); }));

  // 칸 번호: 0~3 노랑, 4~6 파랑, 7~8 빨강, 9 검정
  const SLOT_LEVEL = [];
  LEVELS.forEach((L, li) => { for (let k = 0; k < L.slots; k++) SLOT_LEVEL.push(li); });

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  window.PC = {
    DICE_SIDES: [8, 10, 12],
    LEVELS, POINTS, SLOT_LEVEL,
    pts: n => POINTS[n] || 0,
    rollDice() { return this.DICE_SIDES.map(s => 1 + Math.floor(Math.random() * s)); },

    // 새 판: 층별 더미를 섞고 피라미드 10칸을 채움
    newBoard() {
      const p = {}, s = [];
      LEVELS.forEach((L, li) => { p["L" + li] = shuffle(L.tiles.slice()); });
      SLOT_LEVEL.forEach(li => s.push(p["L" + li].pop() || 0));
      return { s, p };
    },
    // 칸 i를 같은 색 더미에서 새 타일로 채움 (board를 직접 수정)
    refill(board, i) {
      const k = "L" + SLOT_LEVEL[i];
      board.p = board.p || {};
      const pile = board.p[k] || [];
      board.s[i] = pile.length ? pile.pop() : 0;
      board.p[k] = pile;
    },
    pileLeft(board, li) { return ((board && board.p && board.p["L" + li]) || []).length; },
    boardEmpty(board) { return !board || !(board.s || []).some(Boolean); },

    // 피라미드 그리기 (위: 검정 → 아래: 노랑)
    buildPyramid(box, onTap) {
      box.innerHTML = "";
      let start = 0; const starts = LEVELS.map(L => { const s = start; start += L.slots; return s; });
      for (let li = LEVELS.length - 1; li >= 0; li--) {
        const row = document.createElement("div"); row.className = "prow";
        row.innerHTML = '<span class="pile pad"></span>';
        for (let k = 0; k < LEVELS[li].slots; k++) {
          const i = starts[li] + k;
          const t = document.createElement("div");
          t.className = "slot lv" + li; t.dataset.slot = i;
          t.innerHTML = "<b></b><em></em><i></i>";
          if (onTap) t.onclick = () => onTap(i);
          row.appendChild(t);
        }
        const pile = document.createElement("span"); pile.className = "pile"; pile.dataset.level = li;
        row.appendChild(pile);
        box.appendChild(row);
      }
    },
    // 판 상태 표시. opts: { cap, me }
    paintBoard(box, board, opts) {
      opts = opts || {};
      const s = (board && board.s) || [];
      box.querySelectorAll(".slot").forEach(el => {
        const i = +el.dataset.slot, n = s[i] || 0;
        el.classList.toggle("empty", !n);
        el.querySelector("b").textContent = n || "";
        el.querySelector("em").textContent = "";
        const c = board && board.c && board.c["s" + i];
        const by = c && c.t === n && c.by ? Object.keys(c.by) : [];
        el.querySelector("i").textContent = opts.cap && by.length ? by.length + "/" + opts.cap : "";
        el.classList.toggle("mine", !!(opts.me && by.includes(opts.me)));
      });
      box.querySelectorAll(".pile[data-level]").forEach(el => {
        el.textContent = "더미 " + this.pileLeft(board, +el.dataset.level);
      });
    }
  };
})();

// ===== 주사위 모양 · 굴리기 애니메이션 · 풍뎅이 =====
(function () {
  const FILL = { 8: ["#b8322a", "#7d1d17"], 10: ["#2f7a43", "#1b4d29"], 12: ["#2456a8", "#14336a"] };
  function poly(n, r, cx, cy, rot) {
    const p = []; for (let k = 0; k < n; k++) { const a = rot + k * 2 * Math.PI / n; p.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1)); } return p;
  }
  PC.dieSVG = function (sides) {
    const [c, d] = FILL[sides], L = 'stroke="#ffffff55" stroke-width="1.5" fill="none"';
    let s = '<svg viewBox="0 0 100 100" class="dieShape">';
    if (sides === 8) {
      s += `<polygon points="50,3 95,28 95,72 50,97 5,72 5,28" fill="${d}"/><polygon points="50,8 90,74 10,74" fill="${c}"/>`;
      s += `<path d="M50 8L50 3M90 74L95 72M10 74L5 72M10 74L50 97L90 74M90 74L95 28L50 8L5 28L10 74" ${L}/>`;
    } else if (sides === 10) {
      s += `<polygon points="50,3 96,48 50,97 4,48" fill="${d}"/><polygon points="50,7 83,55 50,74 17,55" fill="${c}"/>`;
      s += `<path d="M17 55L4 48M83 55L96 48M50 74L50 97" ${L}/>`;
    } else {
      const o = poly(10, 47, 50, 52, -Math.PI / 2), f = poly(5, 30, 50, 54, -Math.PI / 2);
      s += `<polygon points="${o.join(" ")}" fill="${d}"/><polygon points="${f.join(" ")}" fill="${c}"/>`;
      s += `<path d="${f.map((p, k) => "M" + p + "L" + o[k * 2]).join("")}" ${L}/>`;
    }
    return s + "</svg>";
  };
  // el 안에 주사위 모양 + 숫자
  PC.dieHTML = (sides, v) => PC.dieSVG(sides) + `<span class="num n${sides}">${v}</span><small>${sides}면</small>`;

  // 굴리기: els = 주사위 요소 3개, finals = 최종 눈, done = 끝난 뒤 호출
  PC.rollAnim = function (els, finals, done) {
    let left = els.length;
    els.forEach((el, i) => {
      const sides = PC.DICE_SIDES[i], num = el.querySelector(".num");
      el.classList.remove("landed"); void el.offsetWidth;
      el.style.animationDelay = (i * 0.12) + "s";
      el.classList.add("rolling");
      const end = Date.now() + 1100 + i * 120;
      const t = setInterval(() => {
        if (Date.now() >= end) {
          clearInterval(t); num.textContent = finals[i];
          el.classList.remove("rolling"); el.classList.add("landed");
          if (--left === 0 && done) done();
        } else num.textContent = 1 + Math.floor(Math.random() * sides);
      }, 70);
    });
  };

  PC.scarab = '<svg viewBox="0 0 40 40" class="scarab"><g fill="#f5c542" stroke="#8a5a00" stroke-width="1.2">' +
    '<path d="M8 14l-6-4M8 20H1M8 26l-6 4M32 14l6-4M32 20h7M32 26l6 4" fill="none" stroke-width="2"/>' +
    '<ellipse cx="20" cy="9" rx="5" ry="4"/><ellipse cx="20" cy="24" rx="11" ry="13"/>' +
    '<path d="M20 12v24M10 18q10 4 20 0" fill="none"/></g></svg>';
  PC.scarabs = n => Array(n).fill(PC.scarab).join("");
})();
