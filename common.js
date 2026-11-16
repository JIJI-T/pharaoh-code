// 학생·교사 화면 공통
window.PC = {
  DICE_SIDES: [6, 8, 12],
  ROWS: [3, 5, 7, 9, 11, 12, 13],          // 피라미드 위→아래, 합계 60
  pts: n => Math.ceil(n / 10),              // 1~10:1점 … 51~60:6점
  rollDice() { return this.DICE_SIDES.map(s => 1 + Math.floor(Math.random() * s)); },
  buildPyramid(box, onTap) {
    box.innerHTML = "";
    let n = 60;
    this.ROWS.forEach(len => {
      const row = document.createElement("div"); row.className = "prow";
      const nums = []; for (let i = 0; i < len; i++) nums.unshift(n--);
      nums.forEach(v => {
        const t = document.createElement("div");
        t.className = "tile l" + this.pts(v); t.dataset.n = v;
        t.innerHTML = "<span>" + v + "</span><i></i>";
        if (onTap) t.onclick = () => onTap(v);
        row.appendChild(t);
      });
      box.appendChild(row);
    });
  },
  tile(box, v) { return box.querySelector('[data-n="' + v + '"]'); }
};
