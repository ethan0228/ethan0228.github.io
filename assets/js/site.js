// Edu × AI — 前台互動
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // ---- 主題切換 ----
  $('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('eduxai-theme', next); } catch {}
  });

  // ---- 行動版選單 ----
  const menuBtn = $('[data-menu]');
  menuBtn?.addEventListener('click', () => {
    const open = $('#nav-links').classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });

  // ---- 捲動進度 ----
  const bar = $('.progress i');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- 進場動畫 ----
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 70 + 'ms');
      io.observe(el);
    });
  }

  // ---- 數字跳動 ----
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    if (reduced || !to) return;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  });

  // ---- 卡片游標光暈 ----
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest?.('.card');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });

  // ---- Hero 知識圖譜 ----
  const cv = $('#net');
  if (cv) {
    const ctx = cv.getContext('2d');
    let hubs = [];
    try { hubs = JSON.parse(cv.dataset.hubs || '[]'); } catch {}
    let w = 0, h = 0, R = 0, RY = 0, nodes = [], dust = [], mouse = null, raf = 0;
    const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
    const init = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = Math.min(w, h);
      R = m * (m < 420 ? 0.39 : 0.34); RY = R * 0.82;
      nodes = hubs.map((label, i) => ({ label, i, a: (i / hubs.length) * Math.PI * 2 - Math.PI / 2, ph: Math.random() * 6, x: 0, y: 0 }));
      dust = Array.from({ length: 26 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: .8 + Math.random() * 1.4,
      }));
    };
    const draw = (t) => {
      const light = root.dataset.theme === 'light';
      const primary = css('--primary'), cyan = css('--cyan'), accent = css('--accent');
      const text = css('--text'), surface = css('--surface'), line2 = css('--line2');
      const hubColors = [primary, cyan, accent, '#8b5cf6', '#10b981'];
      const cx = w / 2, cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // 柔光背景
      const blob = (x, y, rad, color, alpha) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, color); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
      };
      // 半徑不超出畫布，避免光暈在邊界被切出方框
      const half0 = Math.min(w, h) / 2;
      blob(cx, cy, half0, primary, light ? .22 : .32);
      blob(cx + half0 * .4, cy + half0 * .35, half0 * .55, accent, light ? .12 : .14);
      blob(cx - half0 * .4, cy - half0 * .35, half0 * .55, cyan, light ? .12 : .14);

      // 軌道
      ctx.lineWidth = 1; ctx.strokeStyle = light ? primary : cyan;
      [[1.2, .16, [2, 7]], [1, .4, []], [.56, .28, [4, 6]]].forEach(([k, alpha, dash]) => {
        ctx.globalAlpha = alpha; ctx.setLineDash(dash);
        ctx.beginPath(); ctx.ellipse(cx, cy, R * k, RY * k, 0, 0, 7); ctx.stroke();
      });
      ctx.setLineDash([]);

      // 背景粒子
      for (const d of dust) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        if (mouse) {
          const dx = d.x - mouse.x, dy = d.y - mouse.y, dd = Math.hypot(dx, dy);
          if (dd < 90 && dd > 0) { d.x += (dx / dd) * .9; d.y += (dy / dd) * .9; }
        }
      }
      ctx.strokeStyle = primary;
      for (let i = 0; i < dust.length; i++) {
        for (let j = i + 1; j < dust.length; j++) {
          const a = dust[i], b = dust[j], dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < 100) {
            ctx.globalAlpha = (1 - dd / 100) * .2;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = primary; ctx.globalAlpha = .45;
      for (const d of dust) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }

      // 主題節點位置：沿軌道緩慢公轉
      const spin = reduced ? 0 : t / 42000;
      for (const n of nodes) {
        n.x = cx + Math.cos(n.a + spin) * R;
        n.y = cy + Math.sin(n.a + spin) * RY + Math.sin(t / 1900 + n.ph) * 4;
      }
      // 核心到節點的連線與訊號
      nodes.forEach((n) => {
        const c = hubColors[n.i % hubColors.length];
        const g = ctx.createLinearGradient(cx, cy, n.x, n.y);
        g.addColorStop(0, primary); g.addColorStop(1, c);
        ctx.globalAlpha = .5; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
        const k = ((t / 2800) + n.i / nodes.length) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(cx + (n.x - cx) * k, cy + (n.y - cy) * k, 3, 0, 7); ctx.fill();
      });

      // 核心
      const S = Math.max(68, Math.min(104, R * .5)), half = S / 2;
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = light ? 'rgba(37, 99, 235, .45)' : 'rgba(79, 140, 255, .7)';
      ctx.shadowBlur = 44; ctx.shadowOffsetY = 14;
      const core = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
      core.addColorStop(0, primary); core.addColorStop(1, cyan);
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.roundRect(cx - half, cy - half, S, S, S * .3); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(S * .2)}px "Space Grotesk", sans-serif`;
      ctx.fillText('EDU', cx, cy - S * .13);
      ctx.fillText('× AI', cx, cy + S * .13);
      ctx.strokeStyle = cyan; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const arc = t / 1400;
      ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.arc(cx, cy, half + 16, arc, arc + 1.5); ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.beginPath(); ctx.arc(cx, cy, half + 16, arc + Math.PI, arc + Math.PI + .7); ctx.stroke();
      ctx.lineCap = 'butt';

      // 主題標籤
      const small = Math.min(w, h) < 420;
      ctx.font = `500 ${small ? 12 : 13}px "Noto Sans TC", sans-serif`; ctx.textAlign = 'left';
      nodes.forEach((n) => {
        const c = hubColors[n.i % hubColors.length];
        const tw = ctx.measureText(n.label).width + 40, th = small ? 30 : 34;
        const x = Math.max(2, Math.min(w - tw - 2, n.x - tw / 2)), y = n.y - th / 2;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowColor = light ? 'rgba(15, 27, 51, .16)' : 'rgba(0, 0, 0, .55)';
        ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        ctx.fillStyle = surface;
        ctx.beginPath(); ctx.roundRect(x, y, tw, th, th / 2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeStyle = line2;
        ctx.beginPath(); ctx.roundRect(x, y, tw, th, th / 2); ctx.stroke();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x + 16, n.y, 4, 0, 7); ctx.fill();
        ctx.globalAlpha = .25;
        ctx.beginPath(); ctx.arc(x + 16, n.y, 7.5, 0, 7); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = text;
        ctx.fillText(n.label, x + 28, n.y + 1);
      });
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    const start = () => { cancelAnimationFrame(raf); init(); raf = requestAnimationFrame(draw); };
    cv.parentElement.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    cv.parentElement.addEventListener('pointerleave', () => { mouse = null; });
    new ResizeObserver(start).observe(cv);
    document.fonts?.ready.then(start);
    // 靜態模式下切換主題時重繪一次
    if (reduced) new MutationObserver(start).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ---- 知識庫篩選 ----
  const grid = $('#lib-grid');
  if (grid) {
    const cards = $$('.card', grid);
    const q = $('#lib-q');
    const params = new URLSearchParams(location.search);
    const state = { type: params.get('type') || '', cat: params.get('cat') || '', tag: params.get('tag') || '', q: params.get('q') || '' };
    q.value = state.q;
    const apply = () => {
      const kw = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let n = 0;
      cards.forEach((c) => {
        const ok = (!state.type || c.dataset.type === state.type)
          && (!state.cat || c.dataset.cat === state.cat)
          && (!state.tag || c.dataset.tags.split('|').includes(state.tag))
          && kw.every((k) => c.dataset.text.includes(k));
        c.classList.toggle('hide', !ok);
        if (ok) { n++; c.classList.add('in'); }
      });
      $('#lib-n').textContent = n;
      $('#lib-empty').hidden = n > 0;
      $('#lib-reset').hidden = !(state.type || state.cat || state.tag || state.q);
      $$('[data-f]').forEach((b) => b.classList.toggle('on', state[b.dataset.f] === b.dataset.v));
      const sp = new URLSearchParams();
      Object.entries(state).forEach(([k, v]) => v && sp.set(k, v));
      history.replaceState(null, '', sp.size ? '?' + sp : location.pathname);
    };
    $$('[data-f]').forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.f;
      state[f] = f === 'tag' && state.tag === b.dataset.v ? '' : b.dataset.v;
      apply();
    }));
    q.addEventListener('input', () => { state.q = q.value; apply(); });
    $('#lib-reset').addEventListener('click', () => { state.type = state.cat = state.tag = state.q = ''; q.value = ''; apply(); });
    apply();
  }

  // ---- 內容頁目錄 ----
  const prose = $('#prose'), toc = $('#toc');
  if (prose && toc) {
    const heads = $$('h2, h3', prose);
    if (heads.length < 2) toc.classList.add('none');
    else {
      const ol = $('ol', toc);
      heads.forEach((hd, i) => {
        hd.id = 'sec-' + (i + 1);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + hd.id; a.textContent = hd.textContent;
        if (hd.tagName === 'H3') a.className = 'sub';
        li.append(a); ol.append(li);
      });
      const links = $$('a', ol);
      const spy = () => {
        let cur = 0;
        heads.forEach((hd, i) => { if (hd.getBoundingClientRect().top < 130) cur = i; });
        links.forEach((a, i) => a.classList.toggle('on', i === cur));
      };
      addEventListener('scroll', spy, { passive: true });
      spy();
    }
  }
  $('[data-copy]')?.addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(location.href); e.target.textContent = '已複製連結 ✓'; }
    catch { e.target.textContent = '複製失敗，請手動複製網址'; }
  });

  // ---- 搜尋面板（⌘K） ----
  const pal = $('#palette'), pq = $('#palette-q'), pl = $('#palette-list');
  let index = null, sel = 0, lastFocus = null;
  const TYPE = { article: '觀點文章', practice: '實踐案例', talk: '演講工作坊', resource: '資源工具', weekly: 'AI 趨勢週報' };
  const render = () => {
    const kw = pq.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hits = (index || []).filter((i) => {
      const t = (i.title + ' ' + i.summary + ' ' + i.tags.join(' ') + ' ' + i.category).toLowerCase();
      return kw.every((k) => t.includes(k));
    }).slice(0, 8);
    sel = Math.min(sel, Math.max(0, hits.length - 1));
    pl.replaceChildren();
    if (!index) { pl.innerHTML = '<li class="none">載入中…</li>'; return; }
    if (!hits.length) { pl.innerHTML = '<li class="none">找不到相關內容</li>'; return; }
    hits.forEach((i, n) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/k/' + encodeURIComponent(i.slug) + '/';
      if (n === sel) a.className = 'sel';
      const b = document.createElement('b'); b.textContent = i.title;
      const s = document.createElement('small'); s.textContent = [TYPE[i.type], i.category].filter(Boolean).join(' · ');
      a.append(b, s); li.append(a); pl.append(li);
    });
  };
  const openPal = async () => {
    lastFocus = document.activeElement;
    pal.hidden = false; pq.value = ''; sel = 0; render(); pq.focus();
    if (!index) {
      try { index = await (await fetch('/search.json')).json(); } catch { index = []; }
      render();
    }
  };
  const closePal = () => { pal.hidden = true; lastFocus?.focus?.(); };
  $$('[data-open-search]').forEach((b) => b.addEventListener('click', openPal));
  pal.addEventListener('click', (e) => { if (e.target === pal) closePal(); });
  pq.addEventListener('input', () => { sel = 0; render(); });
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') closePal();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = $$('a', pl).length;
      if (n) { sel = (sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; render(); }
    } else if (e.key === 'Enter') {
      const a = $('a.sel', pl);
      if (a) location.href = a.href;
    }
  });
})();
