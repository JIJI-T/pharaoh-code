(function () {
  const C = window.APP_CONFIG, $ = id => document.getElementById(id);
  const SYM = { "+": "+", "-": "−", "*": "×", "/": "÷", "(": "(", ")": ")" };
  const MIN_DICE = 2; // 규칙서: 주사위 2개 또는 3개 사용
  let me = null, mode = null;

  // ================= 공통 화면 =================
  function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
  }
  function msg(text, cls) { $("gameMsg").textContent = text; $("gameMsg").className = "msg " + (cls || ""); }
  function setTimerBar(ratio, text) {
    $("timerFill").style.width = Math.max(0, Math.min(1, ratio)) * 100 + "%";
    $("timerTxt").textContent = text;
  }

  $("modeNote").textContent = Store.online ? "● 실시간 연결됨" : "체험 모드: 이 기기 안에서만 저장돼요";
  document.querySelectorAll(".capTxt").forEach(e => e.textContent = C.CLASS_TILE_CAP);
  $("ruleBtn").onclick = () => $("ruleModal").classList.add("show");

  // ================= 로그인 / 메뉴 =================
  function enterMenu() { $("menuWho").textContent = me.cls + "반 " + me.num + "번"; show("menu"); }
  try { const saved = JSON.parse(sessionStorage.getItem("pc_me")); if (saved) { me = saved; enterMenu(); } } catch (e) {}

  $("loginBtn").onclick = () => {
    const pw = $("pw").value.trim(), cls = parseInt($("cls").value), num = parseInt($("num").value);
    const lm = $("loginMsg"); lm.className = "msg bad";
    if (pw !== C.STUDENT_PASSWORD) return lm.textContent = "비밀번호가 틀렸어요.";
    if (!cls || cls < 1) return lm.textContent = "반을 입력하세요.";
    if (!num || num < 1) return lm.textContent = "번호를 입력하세요.";
    me = { cls, num, key: cls + "-" + num };
    sessionStorage.setItem("pc_me", JSON.stringify(me));
    lm.textContent = "";
    enterMenu();
  };
  $("logoutBtn").onclick = () => { sessionStorage.removeItem("pc_me"); me = null; $("pw").value = ""; show("login"); };
  $("practiceBtn").onclick = startPractice;
  $("classBtn").onclick = startClass;
  $("menuBtn").onclick = () => {
    if (mode === "practice" && P && P.round > 0 && !confirm("연습을 그만두고 메뉴로 갈까요?")) return;
    leave(); enterMenu();
  };
  $("toMenuBtn").onclick = () => { leave(); enterMenu(); };
  $("againBtn").onclick = () => { if (mode === "practice") startPractice(); };
  $("nextBtn").onclick = () => { if (mode === "practice") practiceNext(); };
  $("claimBtn").onclick = () => mode === "practice" ? claimPractice() : claimClass();

  function leave() {
    if (P) clearInterval(P.timer); P = null;
    offs.forEach(f => f()); offs = []; clearInterval(classTick);
    mode = null;
  }

  // ================= 식 입력 패드 =================
  const pad = { dice: null, used: [false, false, false], tokens: [] };

  function renderDice(anim) {
    const box = $("dice"); box.innerHTML = "";
    PC.DICE_SIDES.forEach((s, i) => {
      const b = document.createElement("button");
      const v = pad.dice ? pad.dice[i] : "?";
      b.className = "die d" + s + (pad.used[i] ? " used" : "") + (anim ? " roll" : "");
      b.innerHTML = v + "<small>" + s + "면</small>";
      b.onclick = () => addDie(i);
      box.appendChild(b);
    });
  }
  function addDie(i) {
    if (!pad.dice || pad.used[i]) return;
    const last = pad.tokens[pad.tokens.length - 1];
    if (last && (last.t === "n" || last.v === ")")) return msg("숫자 사이에는 기호가 필요해요.", "bad");
    pad.used[i] = true;
    pad.tokens.push({ t: "n", v: pad.dice[i], die: i });
    renderExpr();
  }
  document.querySelectorAll("[data-op]").forEach(b => b.onclick = () => {
    if (!pad.dice) return;
    pad.tokens.push({ t: "o", v: b.dataset.op }); renderExpr();
  });
  $("backBtn").onclick = () => {
    const tk = pad.tokens.pop();
    if (tk && tk.t === "n") pad.used[tk.die] = false;
    renderExpr();
  };
  $("clearBtn").onclick = () => { clearExpr(); };
  function clearExpr() { pad.tokens = []; pad.used = [false, false, false]; renderExpr(); }
  function setDice(d) { pad.dice = d; pad.tokens = []; pad.used = [false, false, false]; renderDice(!!d); renderExpr(true); }

  function renderExpr(keepDice) {
    if (!keepDice) renderDice();
    $("expr").innerHTML = pad.tokens.length
      ? pad.tokens.map(t => t.t === "n" ? t.v : SYM[t.v]).join(" ")
      : '<span class="ph">' + (pad.dice ? "주사위 2~3개와 기호를 눌러 식을 만드세요" : "주사위를 기다리는 중…") + "</span>";
    const r = evaluate();
    $("result").textContent = "= " + (r.ok ? fmt(r.val) : "?");
    msg("");
  }

  // 분수로 정확하게 계산
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  function F(n, d = 1) { if (d === 0) throw "0으로 나눌 수 없어요."; if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const fmt = f => f.d === 1 ? String(f.n) : f.n + "/" + f.d;

  function evaluate() {
    const tk = pad.tokens; let p = 0;
    if (!tk.length) return { ok: false, err: "식을 만들어 주세요." };
    function expr() { let v = term(); while (p < tk.length && (tk[p].v === "+" || tk[p].v === "-")) { const o = tk[p++].v; const r = term(); v = o === "+" ? add(v, r) : sub(v, r); } return v; }
    function term() { let v = factor(); while (p < tk.length && (tk[p].v === "*" || tk[p].v === "/")) { const o = tk[p++].v; const r = factor(); v = o === "*" ? mul(v, r) : div(v, r); } return v; }
    function factor() {
      const t = tk[p];
      if (!t) throw "식이 끝나지 않았어요.";
      if (t.t === "n") { p++; return F(t.v); }
      if (t.v === "(") { p++; const v = expr(); if (!tk[p] || tk[p].v !== ")") throw "괄호를 닫아 주세요."; p++; return v; }
      throw "식이 올바르지 않아요.";
    }
    try { const v = expr(); if (p !== tk.length) throw "식이 올바르지 않아요."; return { ok: true, val: v }; }
    catch (e) { return { ok: false, err: typeof e === "string" ? e : "식이 올바르지 않아요." }; }
  }

  // 식이 올바르고 피라미드에 그 숫자가 있으면 칸 번호, 아니면 null
  function readAnswer(board) {
    const r = evaluate();
    if (!r.ok) { msg(r.err, "bad"); return null; }
    if (pad.used.filter(Boolean).length < MIN_DICE) { msg("주사위를 2개 이상 써야 해요!", "bad"); return null; }
    if (r.val.d !== 1 || r.val.n < 1) { msg("결과가 자연수가 아니에요. (" + fmt(r.val) + ")", "bad"); return null; }
    const v = r.val.n, i = ((board && board.s) || []).indexOf(v);
    if (i < 0) { msg(v + "은(는) 지금 피라미드에 없는 숫자예요.", "bad"); return null; }
    return { v, i };
  }
  function flash(i) { const t = $("pyramid").querySelector('[data-slot="' + i + '"]'); if (!t) return; t.classList.add("hit"); setTimeout(() => t.classList.remove("hit"), 600); }
  function slotInfo(board, i, cap) {
    const n = board && board.s && board.s[i];
    if (!n) return msg("빈칸이에요. 이 색의 더미가 다 떨어졌어요.");
    const c = board.c && board.c["s" + i];
    const cnt = c && c.t === n && c.by ? Object.keys(c.by).length : 0;
    msg(PC.LEVELS[PC.SLOT_LEVEL[i]].name + " " + n + "번 타일 · " + PC.pts(n) + "점" + (cap ? " · " + cnt + "/" + cap + "명 획득" : ""));
  }

  // ================= 개인 플레이 =================
  let P = null;
  function startPractice() {
    leave(); mode = "practice";
    P = { round: 0, score: 0, count: 0, board: PC.newBoard(), timer: null };
    $("modeLabel").textContent = "개인";
    $("roundMax").textContent = "/" + C.PRACTICE_ROUNDS;
    $("score").textContent = 0;
    $("nextBtn").style.display = ""; $("claimBtn").disabled = false;
    PC.buildPyramid($("pyramid"), i => slotInfo(P.board, i));
    PC.paintBoard($("pyramid"), P.board);
    show("game");
    practiceNext();
  }
  function practiceNext() {
    clearInterval(P.timer);
    if (P.round >= C.PRACTICE_ROUNDS || PC.boardEmpty(P.board)) return endPractice();
    P.round++;
    $("roundNo").textContent = P.round;
    setDice(PC.rollDice());
    const T = C.PRACTICE_SECONDS; let left = T;
    setTimerBar(1, "⏳ " + left + "초");
    P.timer = setInterval(() => {
      left--; setTimerBar(left / T, "⏳ " + left + "초");
      if (left <= 0) {
        clearInterval(P.timer);
        msg("⏰ 시간 끝! 다음 라운드로 넘어가요.", "bad");
        setTimeout(() => { if (mode === "practice") practiceNext(); }, 1500);
      }
    }, 1000);
  }
  function claimPractice() {
    const a = readAnswer(P.board); if (!a) return;
    const gain = PC.pts(a.v);
    P.score += gain; P.count++;
    PC.refill(P.board, a.i);
    PC.paintBoard($("pyramid"), P.board);
    $("score").textContent = P.score;
    flash(a.i); clearExpr();
    msg("🎉 " + a.v + "번 타일 획득! +" + gain + "점", "ok");
    if (PC.boardEmpty(P.board)) setTimeout(endPractice, 1200);
  }
  function endPractice() {
    if (!P) return;
    clearInterval(P.timer);
    const k = "pc_best_" + me.key;
    const best = Math.max(P.score, parseInt(localStorage.getItem(k) || "0"));
    try { localStorage.setItem(k, best); } catch (e) {}
    $("endTitle").textContent = "연습 끝!";
    $("finalScore").textContent = P.score;
    $("finalInfo").textContent = "가져온 타일 " + P.count + "장 · 내 연습 최고 점수 " + best + "점";
    $("againBtn").style.display = "";
    show("end");
  }

  // ================= 학급 플레이 =================
  let R = null, B = null, mine = null, offs = [], classTick = null, lastRound = null, joining = false, endedShown = null;

  function startClass() {
    leave(); mode = "class";
    R = null; B = null; mine = null; lastRound = null; endedShown = null;
    $("modeLabel").textContent = "학급";
    $("roundMax").textContent = "";
    $("roundNo").textContent = "-";
    $("score").textContent = 0;
    $("nextBtn").style.display = "none";
    PC.buildPyramid($("pyramid"), i => slotInfo(B, i, cap()));
    PC.paintBoard($("pyramid"), null);
    setDice(null);
    show("game");
    offs.push(Store.on("room", onRoom));
    offs.push(Store.on("board", b => { B = b; paint(); }));
    offs.push(Store.on("players/" + me.key, onMine));
    classTick = setInterval(updateClassTimer, 250);
  }

  const cap = () => (R && R.tileCap) || C.CLASS_TILE_CAP;
  const remaining = () => R && R.status === "playing" && R.roundStart
    ? Math.max(0, (R.roundStart + R.timeLimit * 1000 - Store.now()) / 1000) : 0;
  const roundOpen = () => remaining() > 0;
  const paint = () => PC.paintBoard($("pyramid"), B, { cap: cap(), me: me.key });

  function ensureJoined() {
    if (!R || !R.gameId || joining) return;
    if (mine && mine.gameId === R.gameId) return;
    joining = true;
    Store.set("players/" + me.key, { cls: me.cls, num: me.num, score: 0, tiles: 0, gameId: R.gameId, updatedAt: Store.ts() })
      .catch(e => console.error(e)).finally(() => { joining = false; });
  }

  function onRoom(r) {
    R = r;
    document.querySelectorAll(".capTxt").forEach(e => e.textContent = cap());
    if (!R || !R.gameId) { setDice(null); $("roundNo").textContent = "-"; return; }
    ensureJoined();
    $("roundNo").textContent = R.round || "-";
    const roundKey = R.gameId + ":" + (R.round || 0);
    if (roundKey !== lastRound) { lastRound = roundKey; setDice(R.dice && R.round ? R.dice : null); }
    paint();
    if (R.status === "ended" && endedShown !== R.gameId) { endedShown = R.gameId; showClassEnd(); }
    if (R.status !== "ended" && $("end").classList.contains("active") && mode === "class") show("game");
  }

  function onMine(rec) {
    mine = rec;
    $("score").textContent = rec && R && rec.gameId === R.gameId ? (rec.score || 0) : 0;
    if (R && R.gameId && (!rec || rec.gameId !== R.gameId)) ensureJoined();
  }

  function updateClassTimer() {
    if (!R || !R.gameId) { setTimerBar(0, "⌛ 선생님이 게임을 열 때까지 기다려요"); $("claimBtn").disabled = true; return; }
    const open = roundOpen();
    $("claimBtn").disabled = !open;
    if (R.status === "ready" || !R.round) setTimerBar(0, "⌛ 선생님이 주사위를 굴릴 때까지 기다려요");
    else if (R.status === "ended") setTimerBar(0, "🏁 게임이 끝났어요");
    else if (open) { const left = remaining(); setTimerBar(left / R.timeLimit, "⏳ " + Math.ceil(left) + "초"); }
    else setTimerBar(0, "⏰ 라운드 끝! 다음 주사위를 기다려요");
  }

  async function claimClass() {
    if (!roundOpen()) return msg("지금은 타일을 가져올 수 없어요.", "bad");
    const a = readAnswer(B); if (!a) return;
    const c0 = B.c && B.c["s" + a.i];
    if (c0 && c0.t === a.v && c0.by && c0.by[me.key]) return msg(a.v + "번 타일은 이미 가져왔어요.", "bad");
    $("claimBtn").disabled = true;
    const limit = cap(), key = me.key, v = a.v;
    try {
      const res = await Store.transaction("board", b => {
        if (!b) return b;
        const i = (b.s || []).indexOf(v);
        if (i < 0) return;                         // 이미 다른 타일로 바뀜
        b.c = b.c || {};
        const k = "s" + i;
        let c = b.c[k];
        if (!c || c.t !== v) c = { t: v, by: {} };
        c.by = c.by || {};
        if (c.by[key]) return;                     // 이미 가져감
        c.by[key] = true;
        if (Object.keys(c.by).length >= limit) { delete b.c[k]; PC.refill(b, i); }  // 정원 차면 새 타일
        else b.c[k] = c;
        return b;
      });
      if (!res.committed || !res.value) {
        return msg("아쉬워요! 그 사이 " + v + "번 타일을 " + limit + "명이 다 가져가서 새 타일로 바뀌었어요.", "bad");
      }
      const gain = PC.pts(v);
      await Store.transaction("players/" + key, p => {
        if (!p) return p;
        p.score = (p.score || 0) + gain; p.tiles = (p.tiles || 0) + 1; p.updatedAt = Date.now();
        return p;
      });
      flash(a.i); clearExpr();
      msg("🎉 " + v + "번 타일 획득! +" + gain + "점", "ok");
    } catch (e) {
      console.error(e); msg("연결이 불안정해요. 다시 눌러 주세요.", "bad");
    } finally { $("claimBtn").disabled = !roundOpen(); }
  }

  async function showClassEnd() {
    const all = Object.values((await Store.get("players")) || {}).filter(p => p.gameId === R.gameId);
    const my = (mine && mine.score) || 0;
    const rank = all.filter(p => (p.score || 0) > my).length + 1;
    $("endTitle").textContent = "학급 플레이 끝!";
    $("finalScore").textContent = my;
    $("finalInfo").textContent = "가져온 타일 " + ((mine && mine.tiles) || 0) + "장 · " + all.length + "명 중 " + rank + "위";
    $("againBtn").style.display = "none";
    show("end");
  }
})();
