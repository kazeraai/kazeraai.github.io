// ui/concierge_boot.js  ← GitHub Pages から配信
// 1) パックの読み込み
const packUrl = 'https://kazeraai.github.io/ui/kz_concierge_scripts.json?v='+Date.now();

const ConciergePack = {
  _cache: null,
  async load(){ if(this._cache) return this._cache;
    const r = await fetch(packUrl, {cache:'force-cache'});
    const d = await r.json();
    this._cache = (d.scripts||[]).filter(s=>Array.isArray(s.steps)&&s.steps.length>=4);
    return this._cache;
  },
  pick({avoid=9}={}){
    const used = JSON.parse(localStorage.getItem('kz_concierge_recent')||'[]');
    const bank = this._cache||[];
    const filtered = bank.filter(s=>!used.includes(s.id));
    const pool = filtered.length ? filtered : bank;
    const choice = pool[Math.floor(Math.random()*pool.length)];
    used.unshift(choice.id); while(used.length>avoid) used.pop();
    localStorage.setItem('kz_concierge_recent', JSON.stringify(used));
    return choice;
  }
};

// 2) 表示コンポーネント（最小版）
const ConciergeFlow =(()=>{let el,idx=0,timer=null;
  const css=`.kz-concierge{font:14px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Sans","Noto Sans JP",sans-serif;color:#111;background:#fff;border:1px solid #eee;border-radius:12px;padding:12px 14px;margin:10px 0;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.kz-concierge .row{display:flex;gap:10px;opacity:.65;transform:translateY(3px);transition:opacity .25s,transform .25s}
.kz-concierge .row.active{opacity:1;transform:translateY(0)}
.kz-concierge .dot{width:8px;height:8px;border-radius:50%;margin-top:6px;background:#111}
.kz-concierge .ellipsis::after{content:"";display:inline-block;width:1.2em;height:1em;vertical-align:-.15em;background:radial-gradient(circle closest-side,#bbb 60%,transparent 61%) 0% 50%/33% 100% repeat-x}`;
  function ensureMount(){
    if (!document.getElementById('kz-concierge-css')){
      const st=document.createElement('style'); st.id='kz-concierge-css'; st.textContent=css; document.head.appendChild(st);
    }
    let v=document.getElementById('kz-concierge');
    if(!v){ v=document.createElement('div'); v.id='kz-concierge'; v.className='kz-concierge'; v.setAttribute('aria-live','polite'); v.setAttribute('aria-busy','true'); document.body.appendChild(v); }
    el=v; el.innerHTML=''; idx=0;
  }
  function mount(lines){
    ensureMount();
    lines.forEach((t,i)=>{
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`<span class="dot"></span><div class="text">${String(t).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;'}[m]))}${i<lines.length-1?'<span class="ellipsis"></span>':''}</div>`;
      el.appendChild(row);
    });
  }
  function start({lines=[],stepMs=1050}={}){
    if(!lines.length) return;
    mount(lines);
    const rows=[...el.querySelectorAll('.row')];
    rows[0].classList.add('active'); idx=1;
    timer=setInterval(()=>{ if(idx>=rows.length) return clearInterval(timer);
      rows[idx++].classList.add('active'); if(idx===rows.length) setTimeout(done,1200);
    }, stepMs);
  }
  function tick(){ const rows=[...el.querySelectorAll('.row')]; if(idx<rows.length) rows[idx++].classList.add('active'); }
  function done(){ if(timer){clearInterval(timer);timer=null;} el.setAttribute('aria-busy','false'); el.style.transition='opacity .28s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }
  return {start,tick,done};
})();

// 3) 送信/受信にフック（ページ改修なし）
//   - Enterキー or 送信ボタン → start()
//   - 最初のトークン → tick()（簡易検知）
//   - 10秒後に自動で閉じる保険
(async function attach(){
  await ConciergePack.load();
  const pickLines=()=>{ const p=ConciergePack.pick({avoid:9});
    return p? p.steps : ["はい、拝見しますね。えっと…","まずはご意図をまとめています。","社内ノートを開いて照合中…","お待たせしました。要点から。"]; };
  const input = document.querySelector('textarea, input[type="text"]');
  const send  = document.querySelector('button, [role="button"]');
  function hook(){ if(input){ input.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){ setTimeout(()=>ConciergeFlow.start({lines:pickLines()}),10);} }); }
                   if(send){ send.addEventListener('click', ()=> ConciergeFlow.start({lines:pickLines()})); } }
  const obs = new MutationObserver(m=>{ if(m.some(x=>[...x.addedNodes].some(n=>(n.className||'').toString().match(/assistant|ai|bubble|message/i)))) ConciergeFlow.tick(); });
  obs.observe(document.body,{childList:true,subtree:true});
  hook(); setTimeout(()=>ConciergeFlow.done(), 10000);
})();
