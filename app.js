(function () {
  'use strict';
  var app = document.getElementById('app');
  var RED = '#C8302B';
  var FEED_MS = 10 * 60 * 1000;

  // ---------- storage (best effort) ----------
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var scale = load('scale', 1);
  document.documentElement.style.setProperty('--scale', scale);
  var draft = load('draft', { temp: '', salt: '', leave: [] });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function daysSince(ts) { return Math.floor((Date.now() - ts) / 86400000); }

  // ---------- annotated photo ----------
  function tw(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) < 128 ? 0.58 : 1; return n; }
  function photo(st) {
    var dim = IMG[st.img], NW = dim[0], NH = dim[1];
    var fs = NW > NH ? 56 : 44, pad = fs * 0.45, bh = fs * 1.6, mid = 'm' + Math.random().toString(36).slice(2, 7);
    var arrows = '', labels = '';
    (st.anns || []).forEach(function (a, i) {
      var text = a[0], cx = a[1], cy = a[2], bw = tw(text) * fs + pad * 2;
      if (a.length > 3) {
        var tx = a[3], ty = a[4], dx = tx - cx, dy = ty - cy;
        var sx = dx ? (bw / 2) / Math.abs(dx) : 1e9, sy = dy ? (bh / 2) / Math.abs(dy) : 1e9, s = Math.min(sx, sy);
        var x1 = cx + dx * s, y1 = cy + dy * s, L = Math.hypot(tx - x1, ty - y1) || 1;
        var ux = (tx - x1) / L, uy = (ty - y1) / L, ex = tx - ux * fs * 0.45, ey = ty - uy * fs * 0.45;
        var nd = 'style="--dx:' + (ux * fs * 0.35).toFixed(1) + 'px;--dy:' + (uy * fs * 0.35).toFixed(1) + 'px;animation-delay:' + (i * 0.15) + 's"';
        arrows += '<g class="ann">' +
          '<circle class="ring" cx="' + tx + '" cy="' + ty + '" r="' + (fs * 0.9) + '" fill="none" stroke="' + RED + '" stroke-width="' + (fs * 0.16) + '"></circle>' +
          '<g class="arrow" ' + nd + '>' +
          '<line x1="' + x1.toFixed(0) + '" y1="' + y1.toFixed(0) + '" x2="' + ex.toFixed(0) + '" y2="' + ey.toFixed(0) + '" stroke="#fff" stroke-width="' + (fs * 0.45) + '" stroke-linecap="round"></line>' +
          '<line x1="' + x1.toFixed(0) + '" y1="' + y1.toFixed(0) + '" x2="' + ex.toFixed(0) + '" y2="' + ey.toFixed(0) + '" stroke="' + RED + '" stroke-width="' + (fs * 0.22) + '" stroke-linecap="round" marker-end="url(#' + mid + ')"></line>' +
          '</g></g>';
      }
      labels += '<g class="ann"><g class="lab" style="transform-box:fill-box;transform-origin:center">' +
        '<rect x="' + (cx - bw / 2).toFixed(0) + '" y="' + (cy - bh / 2).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" rx="' + (fs * 0.3) + '" fill="' + RED + '" stroke="#fff" stroke-width="' + (fs * 0.12) + '"></rect>' +
        '<text x="' + cx + '" y="' + (cy + fs * 0.36).toFixed(0) + '" text-anchor="middle" font-size="' + fs + '" font-weight="800" fill="#fff">' + esc(text) + '</text></g></g>';
    });
    var svg = '<svg viewBox="0 0 ' + NW + ' ' + NH + '" aria-hidden="true"><defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + RED + '"></path></marker></defs>' + arrows + labels + '</svg>';
    var alt = st.img2 ? '<img class="alt" src="img/' + st.img2 + '.jpg" alt=""><div class="swaptag">' + esc(st.swap || '') + '</div>' : '';
    return '<div class="photo" style="aspect-ratio:' + NW + '/' + NH + '"><img src="img/' + st.img + '.jpg" alt="" width="' + NW + '" height="' + NH + '">' + alt + svg + '</div>';
  }

  // ---------- views ----------
  function top(title, back) {
    return '<div class="top">' + (back ? '<button class="back" data-go="' + back + '">‹ 返回</button>' : '') +
      '<h1>' + esc(title) + '</h1><button class="zoom" data-act="zoom" aria-label="字体大小">字 ' + (scale > 1.2 ? '大' : scale > 1 ? '中' : '小') + '</button></div>';
  }

  function home() {
    var recs = load('records', []), lastW = load('lastWater', 0), note;
    if (!lastW) note = '<div class="notice due">还没有换水记录。换完水后在“每周换水”最后一步点“换水完成”。</div>';
    else {
      var d = daysSince(lastW);
      note = d >= 7 ? '<div class="notice due">上次换水是 ' + d + ' 天前，今天该换水了。</div>'
        : '<div class="notice ok">上次换水是 ' + (d === 0 ? '今天' : d + ' 天前') + '，还有 ' + (7 - d) + ' 天再换。</div>';
    }
    app.innerHTML = top('海缸照顾') +
      '<div class="home">' +
      '<p class="sub">一步一步跟着做就行。看不清可以点右上角把字放大。</p>' + note +
      tile('daily', '1', '每次来要做的事', '清蛋分杯、喂食、加 AB 液、看水温盐度', 'main') +
      tile('feed', '2', '只喂食', '暂停水泵 → 喂鱼 → 打开蛋分', '') +
      tile('water', '3', '每周换水', '配海水 → 抽旧水 → 加新水 → 换滤棉', '') +
      '<button class="tile red" data-go="#/emergency"><span class="num">!</span><span><span class="t">出事了怎么办</span><span class="d" style="display:block">水温低、停电、漏水、缺水……</span></span></button>' +
      '<div class="row2">' +
      '<button class="tile" data-go="#/guide/know/0"><span class="t">认识设备</span><span class="d">插排、控制器、温控器</span></button>' +
      '<button class="tile" data-go="#/records"><span class="t">记录</span><span class="d">' + (recs.length ? '已记 ' + recs.length + ' 次' : '还没有记录') + '</span></button>' +
      '</div></div>';
  }
  function tile(g, n, t, d, cls) {
    return '<button class="tile ' + cls + '" data-go="#/guide/' + g + '/0"><span class="num">' + n + '</span><span><span class="t">' + t + '</span><span class="d" style="display:block">' + d + '</span></span></button>';
  }

  function guide(g, i) {
    var G = GUIDES[g]; if (!G) return home();
    i = Math.max(0, Math.min(G.steps.length - 1, i | 0));
    var st = S[G.steps[i]], n = G.steps.length;
    var prog = ''; for (var k = 0; k < n; k++) prog += '<i class="' + (k <= i ? 'on' : '') + '"></i>';
    var body = '<div class="progress">' + prog + '</div><div class="stepno">第 ' + (i + 1) + ' 步，共 ' + n + ' 步</div><h2>' + esc(st.title) + '</h2>';
    if (G.section && i >= G.section.from && i <= G.section.to) body = body.replace('<h2>', '<div class="section-tag">' + esc(G.section.label) + '</div><h2>');
    if (st.img) body += photo(st);
    if (st.figure) body += '<div class="big-figure">' + esc(st.figure) + '<small>' + esc(st.figureSub || '') + '</small></div>';
    if (st.text) body += '<div class="text">' + st.text + '</div>';
    if (st.warn) body += '<div class="warn">' + st.warn + '</div>';
    if (st.widget) body += widget(st.widget, g);
    var last = i === n - 1;
    var nav = '<div class="nav">' + (i > 0 ? '<button class="btn prev" data-go="#/guide/' + g + '/' + (i - 1) + '">上一步</button>' : '<button class="btn prev" data-go="#/">首页</button>') +
      (last ? (st.widget === 'leave' || st.widget === 'waterDone' ? '' : '<button class="btn next" data-go="#/">做完了，回首页</button>')
        : '<button class="btn next" data-go="#/guide/' + g + '/' + (i + 1) + '">下一步 ›</button>') + '</div>';
    app.innerHTML = top(G.name, '#/') + '<div class="step">' + body + '</div>' + nav;
    window.scrollTo(0, 0);
    if (st.widget === 'tempSalt') bindTempSalt();
  }

  function widget(w, g) {
    if (w === 'timerStart') {
      return '<div class="widget"><button class="btn big red" data-act="timer">两个泵都停了 → 开始 10 分钟倒计时</button>' +
        '<div class="hint">倒计时到了会响铃、震动，提醒你打开蛋分。</div></div>';
    }
    if (w === 'tempSalt') {
      return '<div class="widget">' +
        '<div class="field" id="fTemp"><label for="iTemp">水温</label><input id="iTemp" inputmode="decimal" placeholder="比如 25" value="' + esc(draft.temp) + '"><span class="unit">℃</span></div>' +
        '<div class="hint" id="hTemp"></div>' +
        '<div class="field" id="fSalt"><label for="iSalt">盐度</label><input id="iSalt" inputmode="decimal" placeholder="比如 1.026" value="' + esc(draft.salt) + '"></div>' +
        '<div class="hint" id="hSalt"></div></div>';
    }
    if (w === 'leave') {
      var h = '<div class="widget">';
      LEAVE.forEach(function (t, k) {
        var on = draft.leave.indexOf(k) >= 0;
        h += '<button class="check ' + (on ? 'on' : '') + '" data-act="leave" data-k="' + k + '"><span class="box">' + (on ? '✓' : '') + '</span>' + esc(t) + '</button>';
      });
      return h + '<button class="btn big green" data-act="finish">完成，保存这次记录</button></div>';
    }
    if (w === 'waterDone') {
      return '<div class="widget"><button class="btn big green" data-act="waterDone">换水完成</button></div>';
    }
    return '';
  }

  function tempBad(v) { var t = parseFloat(v); return isNaN(t) ? null : (t < 23 ? 'low' : (t > 27 ? 'high' : '')); }
  function saltBad(v) { var s = parseFloat(v); return isNaN(s) ? null : (s < 1.025 || s > 1.027 ? 'bad' : ''); }
  function bindTempSalt() {
    var it = document.getElementById('iTemp'), is = document.getElementById('iSalt');
    function upd() {
      draft.temp = it.value.trim(); draft.salt = is.value.trim(); save('draft', draft);
      var tb = tempBad(draft.temp), sb = saltBad(draft.salt), ht = document.getElementById('hTemp'), hs = document.getElementById('hSalt');
      document.getElementById('fTemp').className = 'field' + (tb ? ' bad' : '');
      document.getElementById('fSalt').className = 'field' + (sb ? ' bad' : '');
      ht.className = 'hint ' + (tb ? 'bad' : 'ok');
      ht.textContent = tb == null ? '' : tb === 'low' ? '水温太低！马上拍照发给我，再看首页的“出事了怎么办”。' : tb === 'high' ? '水温偏高，拍照发给我。' : '水温正常。';
      hs.className = 'hint ' + (sb ? 'bad' : 'ok');
      hs.textContent = sb == null ? '' : sb ? '盐度不对（要在 1.025～1.027），拍照发给我。' : '盐度正常。';
    }
    it.addEventListener('input', upd); is.addEventListener('input', upd); upd();
  }

  function emergency() {
    var h = '<div class="list">';
    EMERG.forEach(function (e) { h += '<div class="card ' + (e.red ? 'red' : '') + '"><h3>' + esc(e.t) + '</h3><p>' + esc(e.d) + '</p></div>'; });
    h += '<div class="card"><h3>每次走之前看一眼</h3><p>门窗关好了 · 水温正常 · 水泵和造浪泵在转 · 蛋分开着 · 鱼粮收进柜子</p></div></div>';
    app.innerHTML = top('出事了怎么办', '#/') + '<div class="text" style="padding:12px 14px 0">先照着做，再<b>拍照或视频发给我</b>。</div>' + h +
      '<div class="nav"><button class="btn next" data-go="#/">回首页</button></div>';
  }

  function records() {
    var recs = load('records', []);
    var h = '<div class="list"><div class="text">每次点“完成”都会记在这里。需要的话可以截图发给我。</div>';
    if (!recs.length) h += '<div class="card"><p>还没有记录。</p></div>';
    else {
      h += '<table class="rec"><thead><tr><th>日期</th><th>水温</th><th>盐度</th><th>换水</th></tr></thead><tbody>';
      recs.slice().reverse().forEach(function (r) {
        h += '<tr><td>' + esc(r.date) + '</td><td class="' + (tempBad(r.temp) ? 'bad' : '') + '">' + esc(r.temp || '—') + '</td><td class="' + (saltBad(r.salt) ? 'bad' : '') + '">' + esc(r.salt || '—') + '</td><td>' + (r.water ? '✓' : '') + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    app.innerHTML = top('记录', '#/') + h + '</div><div class="nav"><button class="btn next" data-go="#/">回首页</button></div>';
  }

  function doneView(msg) {
    app.innerHTML = top('做完了', '#/') + '<div class="done"><div class="ok-mark">✓</div><div class="text"><b>' + esc(msg) + '</b></div>' +
      '<button class="btn big" style="background:#123A5A;color:#fff" data-go="#/">回首页</button></div>';
  }

  function addRecord(water) {
    var recs = load('records', []), d = today(), last = recs[recs.length - 1];
    if (last && last.date === d) {
      if (draft.temp) last.temp = draft.temp;
      if (draft.salt) last.salt = draft.salt;
      if (water) last.water = true;
    } else recs.push({ date: d, temp: draft.temp, salt: draft.salt, water: !!water });
    if (recs.length > 200) recs = recs.slice(-200);
    save('records', recs);
  }

  // ---------- feed timer ----------
  var tick = null, audioCtx = null, beepTimer = null;
  function startTimer() {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) {}
    save('timerEnd', Date.now() + FEED_MS);
    runTimer();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {}
  }
  function runTimer() {
    var bar = document.getElementById('timerBar');
    clearInterval(tick);
    function upd() {
      var end = load('timerEnd', 0);
      if (!end) { bar.hidden = true; document.body.classList.remove('has-timer'); clearInterval(tick); return; }
      var left = end - Date.now();
      if (left <= 0) { save('timerEnd', 0); bar.hidden = true; document.body.classList.remove('has-timer'); clearInterval(tick); ring(); return; }
      var m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
      bar.hidden = false; document.body.classList.add('has-timer');
      bar.textContent = '水泵暂停中，还剩 ' + m + ':' + (s < 10 ? '0' : '') + s + '　到时间要打开蛋分';
    }
    upd(); tick = setInterval(upd, 1000);
  }
  function beep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.25;
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  }
  function ring() {
    document.getElementById('alarm').hidden = false;
    beep(); try { navigator.vibrate && navigator.vibrate([600, 300, 600, 300, 600]); } catch (e) {}
    clearInterval(beepTimer);
    beepTimer = setInterval(function () { beep(); try { navigator.vibrate && navigator.vibrate(500); } catch (e) {} }, 1500);
  }
  document.getElementById('alarmOk').addEventListener('click', function () {
    document.getElementById('alarm').hidden = true; clearInterval(beepTimer);
  });

  // ---------- events & routing ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go],[data-act]'); if (!el) return;
    if (el.dataset.go) { location.hash = el.dataset.go; return; }
    var a = el.dataset.act;
    if (a === 'zoom') { scale = scale >= 1.3 ? 1 : (scale >= 1.15 ? 1.3 : 1.15); save('scale', scale); document.documentElement.style.setProperty('--scale', scale); route(); }
    else if (a === 'timer') { startTimer(); el.textContent = '倒计时已开始，可以喂鱼了'; }
    else if (a === 'leave') {
      var k = +el.dataset.k, p = draft.leave.indexOf(k);
      if (p >= 0) draft.leave.splice(p, 1); else draft.leave.push(k);
      save('draft', draft); route();
    }
    else if (a === 'finish') {
      if (draft.leave.length < LEAVE.length && !confirmLeave()) return;
      addRecord(false); draft = { temp: '', salt: '', leave: [] }; save('draft', draft);
      doneView('这次的记录保存好了，辛苦了！');
    }
    else if (a === 'waterDone') { save('lastWater', Date.now()); addRecord(true); doneView('换水完成，记录好了！下次换水在 7 天后。'); }
  });
  function confirmLeave() {
    var b = document.querySelector('[data-act="finish"]');
    if (b.dataset.sure) return true;
    b.dataset.sure = '1'; b.textContent = '还有没打勾的，确定完成就再点一次'; b.className = 'btn big red';
    return false;
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'guide') guide(h[1], parseInt(h[2], 10) || 0);
    else if (h[0] === 'emergency') emergency();
    else if (h[0] === 'records') records();
    else home();
  }
  window.addEventListener('hashchange', route);
  route();
  runTimer();

  // ---------- offline + auto update ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!reloaded && !load('timerEnd', 0)) { reloaded = true; location.reload(); } });
  }
})();
