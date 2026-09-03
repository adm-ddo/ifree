/** Conteúdo estático do manual visual do sistema — disponível em
 * ifree.app.br/manual. É HTML/CSS puro (sem dados dinâmicos), por isso
 * injetado via dangerouslySetInnerHTML em vez de reescrito em JSX — evita
 * risco de erro de transcrição num bloco grande e mantém os dois em
 * sincronia fácil. */

export const MANUAL_CSS = `
  /* ===== Tokens ===== */
  :root{
    --bg:#F3F5F7;
    --surface:#FFFFFF;
    --surface-2:#EAEDF1;
    --ink:#12161B;
    --ink-soft:#525C68;
    --ink-faint:#8A93A0;
    --line:#DCE1E7;
    --navy:#0D1B2A;
    --navy-light:#16304A;
    --green:#00A87D;
    --green-deep:#00815F;
    --green-soft:#E1F7EF;
    --warn:#9A5B00;
    --warn-soft:#FBEEDA;
    --danger:#A32B22;
    --danger-soft:#FBE7E4;
    --shadow: 0 1px 2px rgba(13,27,42,.04), 0 8px 24px -12px rgba(13,27,42,.12);
    --radius: 14px;
    --font-display: var(--font-manual-display), 'Arial Narrow', sans-serif;
    --font-body: var(--font-manual-body), system-ui, sans-serif;
    --font-mono: var(--font-manual-mono), ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark){
    #manual-root:not([data-theme="light"]){
      --bg:#0A0F14;
      --surface:#121922;
      --surface-2:#1B2430;
      --ink:#EDF0F3;
      --ink-soft:#A7B0BB;
      --ink-faint:#6C7783;
      --line:#26313F;
      --navy:#0D1B2A;
      --navy-light:#1D3A57;
      --green:#12D6A0;
      --green-deep:#0BAE84;
      --green-soft:#0F2620;
      --warn:#E4A73B;
      --warn-soft:#2B2113;
      --danger:#E36F62;
      --danger-soft:#2B1613;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 28px -14px rgba(0,0,0,.55);
    }
  }
  #manual-root[data-theme="dark"]{
    --bg:#0A0F14;
    --surface:#121922;
    --surface-2:#1B2430;
    --ink:#EDF0F3;
    --ink-soft:#A7B0BB;
    --ink-faint:#6C7783;
    --line:#26313F;
    --navy:#0D1B2A;
    --navy-light:#1D3A57;
    --green:#12D6A0;
    --green-deep:#0BAE84;
    --green-soft:#0F2620;
    --warn:#E4A73B;
    --warn-soft:#2B2113;
    --danger:#E36F62;
    --danger-soft:#2B1613;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 28px -14px rgba(0,0,0,.55);
  }

  #manual-root{ background:var(--bg); color:var(--ink); font-family:var(--font-body); font-size:15.5px; line-height:1.55; -webkit-font-smoothing:antialiased; }
  #manual-root *{ box-sizing:border-box; }
  #manual-root h1, #manual-root h2, #manual-root h3{ font-family:var(--font-display); text-wrap:balance; letter-spacing:-.01em; margin:0; }
  #manual-root a{ color:inherit; }
  #manual-root svg.icon{ width:22px; height:22px; stroke:currentColor; fill:none; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; }
  #manual-root .mono{ font-family:var(--font-mono); }
  @media (prefers-reduced-motion: reduce){ #manual-root{ scroll-behavior:auto; } #manual-root *{ animation:none !important; transition:none !important; } }

  /* ===== Top bar ===== */
  #manual-root .topbar{
    position:sticky; top:0; z-index:40;
    display:flex; align-items:center; gap:12px;
    padding:14px 20px;
    background:color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter:blur(10px);
    border-bottom:1px solid var(--line);
  }
  #manual-root .topbar .mark{ display:flex; align-items:center; gap:9px; font-family:var(--font-display); font-weight:800; font-size:17px; }
  #manual-root .mark .dot{ width:11px; height:11px; border-radius:50%; background:var(--green); box-shadow:0 0 0 3px var(--green-soft); }
  #manual-root .topbar .kicker{ color:var(--ink-faint); font-size:12.5px; padding-left:10px; border-left:1px solid var(--line); }
  #manual-root .topbar .status{
    margin-left:auto; display:flex; align-items:center; gap:7px;
    font-size:12px; color:var(--ink-soft); background:var(--surface-2);
    padding:6px 11px; border-radius:99px; border:1px solid var(--line);
  }
  #manual-root .topbar .status .pulse{ width:7px; height:7px; border-radius:50%; background:var(--green); animation:manual-pulse 2.2s ease-in-out infinite; }
  @keyframes manual-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }

  /* ===== Shell / TOC ===== */
  #manual-root .shell{ display:grid; grid-template-columns:250px minmax(0,1fr); max-width:1240px; margin:0 auto; align-items:start; }
  #manual-root nav.toc{
    position:sticky; top:57px; align-self:start;
    height:calc(100vh - 57px);
    overflow-y:auto;
    padding:22px 14px 40px 20px;
    display:flex; flex-direction:column; gap:2px;
  }
  #manual-root nav.toc a{
    display:flex; align-items:center; gap:9px;
    text-decoration:none; color:var(--ink-soft);
    font-size:13.5px; padding:7px 10px; border-radius:9px;
    border-left:2px solid transparent;
  }
  #manual-root nav.toc a svg{ width:15px; height:15px; opacity:.8; }
  #manual-root nav.toc a:hover{ background:var(--surface-2); color:var(--ink); }
  #manual-root nav.toc a.active{ color:var(--green-deep); border-left-color:var(--green); background:var(--green-soft); font-weight:600; }
  #manual-root nav.toc .toc-label{ font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-faint); padding:14px 10px 4px; }
  #manual-root nav.toc .toc-label:first-child{ padding-top:2px; }

  #manual-root main{ min-width:0; padding:0 24px 90px; }

  #manual-root .toc-mobile{ display:none; }

  @media (max-width:900px){
    #manual-root .shell{ grid-template-columns:1fr; }
    #manual-root nav.toc{ display:none; }
    #manual-root .toc-mobile{
      display:flex; gap:8px; overflow-x:auto; padding:12px 16px;
      border-bottom:1px solid var(--line); position:sticky; top:57px; z-index:30;
      background:var(--bg);
    }
    #manual-root .toc-mobile a{
      flex:0 0 auto; font-size:12.5px; padding:7px 12px; border-radius:99px;
      background:var(--surface-2); color:var(--ink-soft); text-decoration:none; white-space:nowrap;
      border:1px solid var(--line);
    }
    #manual-root main{ padding:0 16px 70px; }
  }

  /* ===== Cover ===== */
  #manual-root .cover{ padding:52px 4px 30px; max-width:760px; }
  #manual-root .eyebrow{
    display:inline-flex; align-items:center; gap:7px;
    font-family:var(--font-mono); font-size:12px; letter-spacing:.06em;
    color:var(--green-deep); background:var(--green-soft);
    padding:5px 11px; border-radius:99px; margin-bottom:18px;
  }
  #manual-root .cover h1{ font-size:clamp(32px,5vw,46px); line-height:1.05; margin-bottom:14px; }
  #manual-root .cover h1 span{ color:var(--green-deep); }
  #manual-root .cover p.lede{ font-size:17px; color:var(--ink-soft); max-width:56ch; margin-bottom:22px; }
  #manual-root .facts{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:28px; }
  #manual-root .facts .fact{
    font-size:12.5px; color:var(--ink-soft); background:var(--surface);
    border:1px solid var(--line); padding:7px 12px; border-radius:10px;
    display:flex; align-items:center; gap:6px; box-shadow:var(--shadow);
  }
  #manual-root .facts .fact b{ color:var(--ink); font-weight:600; }

  #manual-root .index-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:6px; }
  @media (max-width:720px){ #manual-root .index-grid{ grid-template-columns:repeat(2,1fr); } }
  #manual-root .index-card{
    display:flex; flex-direction:column; gap:8px;
    background:var(--surface); border:1px solid var(--line); border-radius:12px;
    padding:14px; text-decoration:none; color:var(--ink); box-shadow:var(--shadow);
  }
  #manual-root .index-card svg{ color:var(--green-deep); }
  #manual-root .index-card .t{ font-weight:600; font-size:13.5px; }
  #manual-root .index-card .d{ font-size:12px; color:var(--ink-faint); line-height:1.4; }

  /* ===== Sections ===== */
  #manual-root section{ padding:52px 4px 8px; border-top:1px solid var(--line); scroll-margin-top:75px; }
  #manual-root section:first-of-type{ border-top:none; }
  #manual-root .section-head{ display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  #manual-root .section-head .ic{
    width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center;
    background:var(--navy); color:var(--green);
  }
  #manual-root .section-head h2{ font-size:23px; }
  #manual-root .section-sub{ color:var(--ink-soft); font-size:14.5px; max-width:70ch; margin:10px 0 28px; }
  #manual-root .n{
    font-family:var(--font-mono); font-size:11px; color:var(--ink-faint);
    letter-spacing:.08em; text-transform:uppercase; margin-bottom:4px; display:block;
  }
  #manual-root h3.sub-head{ font-size:16.5px; margin:34px 0 6px; }

  /* ===== Explainer (O que é o iFREE) ===== */
  #manual-root .explainer-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:24px; }
  @media (max-width:720px){ #manual-root .explainer-grid{ grid-template-columns:1fr; } }
  #manual-root .explainer-card{
    background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
    padding:20px 22px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:8px;
  }
  #manual-root .explainer-card .num{ font-family:var(--font-mono); font-size:11px; color:var(--green-deep); letter-spacing:.08em; text-transform:uppercase; }
  #manual-root .explainer-card h3{ font-size:16.5px; }
  #manual-root .explainer-card p{ margin:0; font-size:13.5px; color:var(--ink-soft); line-height:1.55; }
  #manual-root .explainer-card ul{ margin:2px 0 0; padding-left:18px; font-size:13px; color:var(--ink-soft); }
  #manual-root .explainer-card li{ margin-bottom:3px; }
  #manual-root .pull-quote{
    margin-top:20px; background:var(--navy); color:#EDF0F3; border-radius:var(--radius);
    padding:22px 26px; font-family:var(--font-display); font-size:17px; line-height:1.4;
  }
  #manual-root .pull-quote b{ color:var(--green); }

  /* ===== How it works strip ===== */
  #manual-root .how{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  @media (max-width:720px){ #manual-root .how{ grid-template-columns:1fr; } }
  #manual-root .how .step{ background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); padding:18px; box-shadow:var(--shadow); position:relative; }
  #manual-root .how .step .num{ font-family:var(--font-mono); font-size:12px; color:var(--green-deep); font-weight:600; }
  #manual-root .how .step h3{ font-size:15.5px; margin:8px 0 6px; }
  #manual-root .how .step p{ margin:0; font-size:13.5px; color:var(--ink-soft); }

  #manual-root .fork{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:16px; }
  @media (max-width:720px){ #manual-root .fork{ grid-template-columns:1fr; } }
  #manual-root .fork .path{ border-radius:var(--radius); padding:16px 18px; }
  #manual-root .fork .path.extra{ background:var(--green-soft); border:1px solid color-mix(in srgb, var(--green) 35%, transparent); }
  #manual-root .fork .path.clt{ background:var(--surface-2); border:1px solid var(--line); }
  #manual-root .fork .path .tag{ font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
  #manual-root .fork .path.extra .tag{ color:var(--green-deep); }
  #manual-root .fork .path.clt .tag{ color:var(--ink-soft); }
  #manual-root .fork .path h4{ font-family:var(--font-display); font-size:15px; margin:6px 0 4px; }
  #manual-root .fork .path p{ margin:0; font-size:13px; color:var(--ink-soft); }

  /* ===== Stepper ===== */
  #manual-root .stepper{ display:flex; gap:0; margin-top:6px; }
  @media (max-width:820px){ #manual-root .stepper{ flex-direction:column; } }
  #manual-root .stepper .cell{ flex:1; display:flex; flex-direction:column; gap:10px; padding:0 14px 0 0; position:relative; }
  #manual-root .stepper .cell:not(:last-child)::after{
    content:""; position:absolute; top:19px; right:-1px; width:calc(100% - 8px); height:1px;
    background:repeating-linear-gradient(to right, var(--line) 0 6px, transparent 6px 11px);
  }
  @media (max-width:820px){
    #manual-root .stepper .cell{ padding:0 0 22px 34px; }
    #manual-root .stepper .cell:not(:last-child)::after{ top:8px; left:15px; right:auto; width:1px; height:calc(100% - 4px);
      background:repeating-linear-gradient(to bottom, var(--line) 0 6px, transparent 6px 11px); }
  }
  #manual-root .stepper .badge{
    width:38px; height:38px; border-radius:50%; background:var(--navy); color:var(--green);
    display:flex; align-items:center; justify-content:center; z-index:1;
    position:relative;
  }
  @media (max-width:820px){ #manual-root .stepper .badge{ position:absolute; left:0; top:0; } }
  #manual-root .stepper .cell h4{ font-family:var(--font-display); font-size:14.5px; margin:2px 0 2px; }
  #manual-root .stepper .cell p{ margin:0; font-size:12.5px; color:var(--ink-soft); line-height:1.45; }
  #manual-root .stepper.alt .badge{ background:var(--green); color:var(--navy); }

  #manual-root .flow-note{
    display:flex; gap:10px; align-items:flex-start; margin-top:22px;
    background:var(--surface-2); border:1px solid var(--line); border-radius:12px; padding:13px 16px;
    font-size:13px; color:var(--ink-soft);
  }
  #manual-root .flow-note svg{ color:var(--green-deep); margin-top:1px; }

  /* ===== Feature cards grid ===== */
  #manual-root .grid-cards{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  @media (max-width:820px){ #manual-root .grid-cards{ grid-template-columns:1fr; } }
  #manual-root .card{
    background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
    padding:18px 20px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:10px;
  }
  #manual-root .card .head{ display:flex; align-items:center; gap:10px; }
  #manual-root .card .head .ic{ width:32px; height:32px; border-radius:9px; background:var(--green-soft); color:var(--green-deep); display:flex; align-items:center; justify-content:center; }
  #manual-root .card .head h3{ font-size:15.5px; }
  #manual-root .card .head .path{ font-family:var(--font-mono); font-size:10.5px; color:var(--ink-faint); margin-left:auto; }
  #manual-root .card p.desc{ margin:0; font-size:13.3px; color:var(--ink-soft); }
  #manual-root .card ul.pts{ margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:5px; }
  #manual-root .card ul.pts li{ font-size:12.8px; color:var(--ink-soft); padding-left:14px; position:relative; }
  #manual-root .card ul.pts li::before{ content:"–"; position:absolute; left:0; color:var(--ink-faint); }
  #manual-root .card .tags{ display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
  #manual-root .card .tags span{
    font-size:11px; font-family:var(--font-mono); color:var(--green-deep); background:var(--green-soft);
    padding:3px 8px; border-radius:6px;
  }

  /* ===== Config / mini cards ===== */
  #manual-root .sec-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:24px; }
  @media (max-width:720px){ #manual-root .sec-grid{ grid-template-columns:1fr; } }
  #manual-root .mini-card{ background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:15px 17px; box-shadow:var(--shadow); }
  #manual-root .mini-card .head{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  #manual-root .mini-card .head svg{ color:var(--green-deep); width:17px; height:17px; }
  #manual-root .mini-card .head h4{ font-family:var(--font-display); font-size:13.5px; }
  #manual-root .mini-card .head .default{
    font-family:var(--font-mono); font-size:10px; color:var(--green-deep); background:var(--green-soft);
    padding:2px 7px; border-radius:6px; margin-left:auto; white-space:nowrap;
  }
  #manual-root .mini-card p{ margin:0; font-size:12.5px; color:var(--ink-soft); }
  #manual-root .mini-card p + p{ margin-top:6px; }

  /* ===== Example / calculation box ===== */
  #manual-root .notice.example{ background:var(--surface-2); border:1px solid var(--line); }
  #manual-root .notice.example svg{ color:var(--green-deep); }
  #manual-root .notice.example h4{ color:var(--ink); }
  #manual-root .notice.example p{ color:var(--ink-soft); }
  #manual-root .notice.example .calc{
    display:block; font-family:var(--font-mono); font-size:12.5px; color:var(--ink);
    margin-top:8px; line-height:1.7;
  }

  /* ===== Timeline (security) ===== */
  #manual-root .timeline{ display:flex; flex-direction:column; gap:0; margin-top:8px; }
  #manual-root .tl-item{ display:grid; grid-template-columns:88px 30px 1fr; gap:0; }
  #manual-root .tl-item .time{ font-family:var(--font-mono); font-size:13px; color:var(--ink); font-weight:600; padding-top:14px; }
  #manual-root .tl-item .rail{ display:flex; flex-direction:column; align-items:center; }
  #manual-root .tl-item .rail .pt{ width:11px; height:11px; border-radius:50%; background:var(--green); margin-top:16px; flex-shrink:0; }
  #manual-root .tl-item .rail .ln{ width:1px; flex:1; background:var(--line); }
  #manual-root .tl-item:last-child .rail .ln{ display:none; }
  #manual-root .tl-item .body{ padding:10px 0 26px 16px; }
  #manual-root .tl-item .body h4{ font-family:var(--font-display); font-size:14.5px; margin-bottom:4px; }
  #manual-root .tl-item .body p{ margin:0; font-size:13px; color:var(--ink-soft); }

  /* ===== Notices ===== */
  #manual-root .notice{ display:flex; gap:12px; border-radius:var(--radius); padding:16px 18px; margin-bottom:12px; }
  #manual-root .notice svg{ flex-shrink:0; margin-top:1px; }
  #manual-root .notice h4{ font-family:var(--font-display); font-size:14px; margin-bottom:4px; }
  #manual-root .notice p{ margin:0; font-size:13px; line-height:1.5; }
  #manual-root .notice.warn{ background:var(--warn-soft); color:var(--warn); border:1px solid color-mix(in srgb, var(--warn) 30%, transparent); }
  #manual-root .notice.warn p{ color:var(--ink-soft); }
  #manual-root .notice.danger{ background:var(--danger-soft); color:var(--danger); border:1px solid color-mix(in srgb, var(--danger) 30%, transparent); }
  #manual-root .notice.danger p{ color:var(--ink-soft); }

  #manual-root footer{ padding:44px 4px 60px; border-top:1px solid var(--line); margin-top:40px; }
  #manual-root footer .fbar{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  #manual-root footer .mark{ display:flex; align-items:center; gap:8px; font-family:var(--font-display); font-weight:800; font-size:15px; color:var(--ink-soft); }
  #manual-root footer .mark .dot{ width:9px; height:9px; border-radius:50%; background:var(--green); }
  #manual-root footer p{ font-size:12.5px; color:var(--ink-faint); margin:0; }
`;

export const MANUAL_BODY_HTML = `
<svg style="display:none">
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>
  <symbol id="i-building" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h1M8 11h1M8 15h1M15 7h1M15 11h1M15 15h1M10 21v-4h4v4"/></symbol>
  <symbol id="i-tablet" viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="M12 18.2h.01"/></symbol>
  <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.8 4.4-5.7 7.5-5.7s6.1 1.9 7.5 5.7"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M2.7 20c1.2-3.4 3.6-5.1 6.3-5.1s5.1 1.7 6.3 5.1"/><circle cx="17.3" cy="8.6" r="2.6"/><path d="M15.3 14.4c2.3.2 4.1 1.8 5 4.6"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8.5 14l2 2 4.5-4.5"/></symbol>
  <symbol id="i-wallet" viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><path d="M16 12.2h3.2M18.5 5.5 14 3l-8.5 3"/><circle cx="16.4" cy="12.2" r=".2"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2.5 20h19"/></symbol>
  <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7M18.1 18.1l-1.7-1.7M7.6 7.6 5.9 5.9"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3.2 5 5.8v5.6c0 4.6 2.9 7.7 7 9.4 4.1-1.7 7-4.8 7-9.4V5.8z"/><path d="M9 12l2 2 4-4.2"/></symbol>
  <symbol id="i-calc" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 15.5h.01M12 15.5h.01M16 15.5h.01M8 19h.01M12 19h.01M16 19h.01"/></symbol>
  <symbol id="i-id" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M6 16c.5-1.7 1.7-2.5 2.5-2.5s2 .8 2.5 2.5M14 9.5h4M14 13h4"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></symbol>
  <symbol id="i-camera" viewBox="0 0 24 24"><path d="M3.5 8h4L9 5.5h6L16.5 8h4v11h-17z"/><circle cx="12" cy="13.2" r="3.4"/></symbol>
  <symbol id="i-sign" viewBox="0 0 24 24"><path d="M3 18c2-.5 3-4 4.5-4 1.6 0 1 3.4 2.6 3.4S12 12 14 12s1.4 4.4 3 4.4 2-2 4-2.4"/><path d="M3 21h18"/></symbol>
  <symbol id="i-qr" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 15h2.2v2.2M20.5 15v2.5M17 20.5h3.5v-3M14.5 20.5h1"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.5 2.5L16 9.3"/></symbol>
  <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.5 3h8l4 4v14h-12z"/><path d="M14 3v4.5h4M9 12.5h6M9 16h6"/></symbol>
  <symbol id="i-cpf" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6.5 12h.01M9.5 10.5h5M9.5 13.5h4"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15.5M14 6.5 19.5 12 14 17.5"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3 21.5 20h-19z"/><path d="M12 10v4.2M12 17.2h.01"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.2S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.5a4.4 4.4 0 0 1 8.5 2.4C20.5 15 12 20.2 12 20.2z"/></symbol>
  <symbol id="i-repeat" viewBox="0 0 24 24"><path d="M3.5 11a8.5 8.5 0 0 1 14.8-5.7M20.5 13a8.5 8.5 0 0 1-14.8 5.7"/><path d="M18.3 3v4.6h-4.6M5.7 21v-4.6h4.6"/></symbol>
</svg>

<div class="topbar">
  <div class="mark"><span class="dot"></span> iFREE</div>
  <div class="kicker">Manual do sistema</div>
  <div class="status"><span class="pulse"></span> Em produção · observação ativa</div>
</div>

<div class="toc-mobile" id="manualTocMobile">
  <a href="#explicacao">O que é</a>
  <a href="#como-funciona">Como funciona</a>
  <a href="#fluxo-extra">Fluxo do extra</a>
  <a href="#fluxo-clt">Fluxo do CLT</a>
  <a href="#painel">Painel</a>
  <a href="#configuracoes">Config.</a>
  <a href="#seguranca">Segurança</a>
  <a href="#avisos">Avisos</a>
</div>

<div class="shell">
  <nav class="toc" id="manualTocDesktop">
    <span class="toc-label">Conceito</span>
    <a href="#inicio"><svg class="icon"><use href="#i-clock"/></svg>Visão geral</a>
    <a href="#explicacao"><svg class="icon"><use href="#i-heart"/></svg>O que é o iFREE</a>
    <a href="#como-funciona"><svg class="icon"><use href="#i-arrow"/></svg>Como funciona</a>
    <span class="toc-label">No tablet</span>
    <a href="#fluxo-extra"><svg class="icon"><use href="#i-camera"/></svg>Fluxo do extra</a>
    <a href="#fluxo-clt"><svg class="icon"><use href="#i-cpf"/></svg>Fluxo do CLT</a>
    <span class="toc-label">Painel administrativo</span>
    <a href="#painel"><svg class="icon"><use href="#i-briefcase"/></svg>Telas do painel</a>
    <a href="#configuracoes"><svg class="icon"><use href="#i-gear"/></svg>Configurações</a>
    <a href="#master"><svg class="icon"><use href="#i-shield"/></svg>Área master</a>
    <span class="toc-label">Por baixo dos panos</span>
    <a href="#seguranca"><svg class="icon"><use href="#i-lock"/></svg>Segurança e backups</a>
    <a href="#avisos"><svg class="icon"><use href="#i-alert"/></svg>Avisos importantes</a>
  </nav>

  <main>
    <section id="inicio" style="border-top:none;">
      <div class="cover">
        <div class="eyebrow"><svg class="icon" style="width:14px;height:14px;"><use href="#i-info"/></svg> GUIA VISUAL · TODAS AS TELAS E FLUXOS</div>
        <h1>O manual do <span>iFREE</span>, do jeito que ele funciona hoje.</h1>
        <p class="lede">iFREE controla a entrada, saída e pagamento de extras via PIX — e, desde agosto de 2026, também o ponto interno de funcionários CLT. Este guia explica cada tela, cada botão e cada fluxo do totem, em ordem prática.</p>
        <div class="facts">
          <div class="fact"><svg class="icon" style="width:14px;height:14px;"><use href="#i-doc"/></svg> <b>14</b> áreas do painel</div>
          <div class="fact"><svg class="icon" style="width:14px;height:14px;"><use href="#i-tablet"/></svg> <b>2</b> fluxos de totem — extra e CLT</div>
          <div class="fact"><svg class="icon" style="width:14px;height:14px;"><use href="#i-lock"/></svg> backup automático <b>3x/dia</b></div>
        </div>
        <div class="index-grid">
          <a class="index-card" href="#explicacao"><svg class="icon"><use href="#i-heart"/></svg><span class="t">O que é</span><span class="d">Resumo pra quem nunca usou</span></a>
          <a class="index-card" href="#como-funciona"><svg class="icon"><use href="#i-arrow"/></svg><span class="t">Como funciona</span><span class="d">A ideia central em 3 passos</span></a>
          <a class="index-card" href="#fluxo-extra"><svg class="icon"><use href="#i-camera"/></svg><span class="t">Fluxo do extra</span><span class="d">Do CPF à assinatura no tablet</span></a>
          <a class="index-card" href="#fluxo-clt"><svg class="icon"><use href="#i-cpf"/></svg><span class="t">Fluxo do CLT</span><span class="d">Bater ponto sem mostrar valores</span></a>
          <a class="index-card" href="#painel"><svg class="icon"><use href="#i-briefcase"/></svg><span class="t">Painel admin</span><span class="d">As 14 telas de gestão</span></a>
          <a class="index-card" href="#configuracoes"><svg class="icon"><use href="#i-gear"/></svg><span class="t">Configurações</span><span class="d">Os 7 ajustes por empresa</span></a>
          <a class="index-card" href="#seguranca"><svg class="icon"><use href="#i-lock"/></svg><span class="t">Segurança</span><span class="d">Backups e fechamento automático</span></a>
          <a class="index-card" href="#avisos"><svg class="icon"><use href="#i-alert"/></svg><span class="t">Avisos</span><span class="d">O que o sistema ainda não faz</span></a>
        </div>
      </div>
    </section>

    <section id="explicacao">
      <span class="n">Pra quem nunca usou</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-heart"/></svg></div><h2>O que é o iFREE, em miúdos</h2></div>
      <p class="section-sub">Antes de entrar tela por tela — o resumo direto, sem termo técnico, pra quem vai usar o sistema pela primeira vez ou pra explicar pra alguém de fora.</p>

      <div class="explainer-grid">
        <div class="explainer-card">
          <span class="num">O que é</span>
          <h3>Um jeito de controlar quem trabalhou e quanto pagar, sem planilha</h3>
          <p>O iFREE fica de olho em quem trabalha na empresa — do extra que vem só num dia de movimento até o funcionário fixo — através de um tablet fixo na entrada. Sem app pra baixar, sem senha pra decorar.</p>
        </div>
        <div class="explainer-card">
          <span class="num">Para que serve</span>
          <h3>Troca o "no olho" pelo automático</h3>
          <p>Hoje, quando chama um extra, normalmente alguém anota a hora num papel ou grupo de WhatsApp, calcula o valor de cabeça e faz o PIX torcendo pra não errar. O iFREE bate o CPF, tira foto, assina na tela — e quando a pessoa sai, o valor já está certo, com contrato e recibo prontos.</p>
        </div>
        <div class="explainer-card">
          <span class="num">Para quem serve</span>
          <h3>Quem contrata extra com frequência — ou quer parar de olhar câmera</h3>
          <ul>
            <li>Restaurantes, bares, casas de festa e buffets que chamam extras com frequência.</li>
            <li>Qualquer negócio pequeno/médio que hoje resolve isso "no olho" e já sentiu esse tipo de dor de cabeça.</li>
            <li>Empresas com poucos funcionários fixos que só querem saber horário de chegada, sem virar questão jurídica.</li>
          </ul>
        </div>
        <div class="explainer-card">
          <span class="num">Quanto pode ajudar</span>
          <h3>Cinco ganhos práticos, no dia a dia</h3>
          <ul>
            <li>Tira o dono do meio do cálculo de hora e PIX.</li>
            <li>Acaba com a discussão de "quanto eu ia receber".</li>
            <li>Profissionaliza — contrato e recibo automáticos, sem RH.</li>
            <li>Dá visão em tempo real de quem está trabalhando agora.</li>
            <li>Escala junto: funciona igual pra 2 extras ou pra uma rede inteira.</li>
          </ul>
        </div>
      </div>

      <div class="pull-quote">Em uma frase: o iFREE troca <b>"confiar na memória e na planilha"</b> por <b>"confiar num registro automático, com foto e assinatura de quem estava lá."</b></div>
    </section>

    <section id="como-funciona">
      <span class="n">Conceito</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-arrow"/></svg></div><h2>Como o sistema funciona</h2></div>
      <p class="section-sub">Um tablet fica fixo na entrada do estabelecimento. A pessoa se identifica só com o documento — sem app, sem senha, sem depender do celular pessoal dela.</p>

      <div class="how">
        <div class="step"><span class="num">01</span><h3>Bate o CPF no tablet</h3><p>A pessoa digita CPF ou CNPJ na tela do totem. O sistema reconhece se ela já está cadastrada e qual o tipo de vínculo — extra ou CLT.</p></div>
        <div class="step"><span class="num">02</span><h3>Tira uma foto</h3><p>Toda entrada e saída é registrada com uma foto pela câmera do próprio tablet — comprovação simples de quem esteve lá e quando.</p></div>
        <div class="step"><span class="num">03</span><h3>O sistema cuida do resto</h3><p>Para o extra: calcula o valor, gera contrato e recibo, e a empresa paga via PIX. Para o CLT: só registra o horário, sem nenhum valor envolvido.</p></div>
      </div>

      <div class="fork">
        <div class="path extra">
          <span class="tag">Trabalhador extra</span>
          <h4>Pago por turno, via PIX</h4>
          <p>Autocadastro no próprio totem, escolhe a função, assina contrato e recibo na tela. Vê o valor/hora antes de assinar e o total ao final do turno.</p>
        </div>
        <div class="path clt">
          <span class="tag">Funcionário CLT</span>
          <h4>Controle interno de jornada</h4>
          <p>Cadastro feito pela empresa em "Funcionários". No totem só bate entrada/intervalo/saída com foto — nenhum valor é mostrado em tela alguma.</p>
        </div>
      </div>
    </section>

    <section id="fluxo-extra">
      <span class="n">No tablet</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-camera"/></svg></div><h2>Fluxo do extra no totem</h2></div>
      <p class="section-sub">Chegada — do documento até o turno aberto:</p>

      <div class="stepper">
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-cpf"/></svg></div><h4>Documento</h4><p>Digita CPF ou CNPJ no teclado do totem.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-id"/></svg></div><h4>Cadastro (se novo)</h4><p>Nome, telefone, endereço e chave PIX — só na primeira vez. O tipo de chave (CPF, e-mail, celular ou aleatória) é reconhecido sozinho pelo que a pessoa digita.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-camera"/></svg></div><h4>Foto</h4><p>Foto de entrada pela câmera do tablet. Dá pra tocar em "Atualizar meus dados" antes de seguir.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-briefcase"/></svg></div><h4>Função</h4><p>Escolhe a função do dia; o valor/hora já aparece na tela, antes de qualquer assinatura.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-doc"/></svg></div><h4>Termos</h4><p>Lê e marca "Li e concordo" com o contrato configurado pela empresa.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-sign"/></svg></div><h4>Assinatura</h4><p>Assina na tela → turno aberto, com função e valor travados a partir daqui.</p></div>
      </div>

      <p class="section-sub" style="margin-top:36px;">Saída — quando volta para encerrar o turno:</p>
      <div class="stepper alt">
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-cpf"/></svg></div><h4>Documento</h4><p>Bate o CPF de novo; o sistema já sabe que há turno aberto.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-camera"/></svg></div><h4>Foto de saída</h4><p>Nova foto no encerramento.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-clock"/></svg></div><h4>Conferência</h4><p>Vê o tempo trabalhado, ao vivo, antes de assinar.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-sign"/></svg></div><h4>Assina e encerra</h4><p>Confirma o recibo com assinatura na tela.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-wallet"/></svg></div><h4>Valor total</h4><p>Vê o total em R$; PIX é feito depois pelo painel de Pagamentos.</p></div>
      </div>

      <div class="flow-note"><svg class="icon" style="width:16px;height:16px;"><use href="#i-info"/></svg><span>Nenhum extra acessa o link do totem pelo próprio celular — só no tablet fixo ou num aparelho da própria empresa. Isso evita disputa sobre "quanto eu ia receber" fora do ambiente controlado.</span></div>

      <h3 class="sub-head">Como o valor é calculado</h3>
      <p class="section-sub" style="margin:6px 0 16px;">Duas formas de pagar, escolhidas por pessoa em Freelancers — e o modo/valor usado ficam travados no momento em que a pessoa bate entrada: mudar a função ou o valor depois não afeta turnos já abertos.</p>

      <div class="notice example">
        <svg class="icon"><use href="#i-clock"/></svg>
        <div><h4>Por hora — arredondado em blocos de 5 minutos</h4>
        <p>O tempo trabalhado é arredondado pro bloco de 5min mais próximo (empate exato de 2min30s arredonda pra baixo), e só depois multiplicado pelo valor/hora da função.</p>
        <span class="calc">6h02min trabalhados → conta 6h00min<br/>6h03min trabalhados → conta 6h05min</span>
        </div>
      </div>

      <div class="notice example">
        <svg class="icon"><use href="#i-wallet"/></svg>
        <div><h4>Diária fixa — paga por faixa de horas</h4>
        <p>A pessoa recebe um valor fixo combinado, escalonado por dois limiares configurados em Configurações (padrão: 4h e 6h). Abaixo do 1º limiar paga metade, entre os dois paga 75%, no 2º limiar ou acima paga o valor cheio.</p>
        <span class="calc">Diária de R$ 150 · trabalhou 3h → R$ 75,00 (50%)<br/>Diária de R$ 150 · trabalhou 5h → R$ 112,50 (75%)<br/>Diária de R$ 150 · trabalhou 7h → R$ 150,00 (100%)</span>
        </div>
      </div>

      <div class="notice example">
        <svg class="icon"><use href="#i-repeat"/></svg>
        <div><h4>Pagamento semanal, se configurado</h4>
        <p>Por padrão cada turno gera um pagamento próprio. Se a pessoa estiver marcada como "Semanal", o valor de cada turno continua sendo calculado igual — só que o relatório semanal soma tudo o que ela trabalhou na semana fechada e mostra o total a pagar de uma vez, no dia de pagamento configurado (padrão: quarta-feira da semana seguinte à que fechou).</p>
        </div>
      </div>
    </section>

    <section id="fluxo-clt">
      <span class="n">No tablet</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-cpf"/></svg></div><h2>Fluxo do funcionário CLT no totem</h2></div>
      <p class="section-sub">Muito mais curto que o do extra — sem função, sem contrato, sem assinatura, sem valores.</p>

      <div class="stepper">
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-cpf"/></svg></div><h4>Documento</h4><p>Bate o CPF. Só funciona se já foi cadastrado pela empresa em "Funcionários".</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-clock"/></svg></div><h4>Ação</h4><p>Entrada, saída pro intervalo, volta do intervalo ou saída final — o sistema já filtra o que faz sentido no momento.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-camera"/></svg></div><h4>Foto</h4><p>Uma foto por marcação, com lembrete de conferir uniforme/EPI.</p></div>
        <div class="cell"><div class="badge"><svg class="icon" style="width:17px;height:17px;"><use href="#i-check"/></svg></div><h4>Confirmação</h4><p>Tela de "registrada!" — sem número, sem valor, sem recibo.</p></div>
      </div>

      <div class="flow-note"><svg class="icon" style="width:16px;height:16px;"><use href="#i-info"/></svg><span>Se só há uma ação possível no momento (ex: intervalo já iniciado), o sistema pula a tela de escolha e vai direto pra foto — um toque a menos.</span></div>

      <h3 class="sub-head">Turno extra pago no dia — opcional, por pessoa</h3>
      <p class="section-sub" style="margin:6px 0 16px;">Pra quando um CLT também cobre um turno extra fora da jornada normal e a empresa quer pagar isso no mesmo dia, como um extra de verdade — com contrato próprio — em vez de ficar pendurado ou pago "por fora". Configurado em Funcionários, pessoa por pessoa. Duas formas de fazer isso, e as duas convivem.</p>

      <div class="fork">
        <div class="path extra">
          <span class="tag">Opção A · No totem</span>
          <h4>A pessoa escolhe na hora</h4>
          <p>Com "Permitir fazer extra com recebimento diário" ligado, ao bater entrada o totem pergunta: bater ponto CLT normal ou fazer um extra pago hoje? Escolhendo extra, segue o fluxo completo do extra — função, contrato, assinatura e pagamento — igual a qualquer turno normal.</p>
        </div>
        <div class="path clt">
          <span class="tag">Opção B · Pelo painel</span>
          <h4>O dono lança manualmente</h4>
          <p>Em Funcionários, "Lançar turno extra manualmente" cria o turno direto — função, data e horários — sem passar pelo totem. Sem foto nem assinatura (impossível sem o tablet ali na hora): fica registrado com quem lançou, mas entra no fluxo de pagamento normal do mesmo jeito.</p>
        </div>
      </div>

      <div class="flow-note" style="margin-top:20px;"><svg class="icon" style="width:16px;height:16px;"><use href="#i-info"/></svg><span>As duas opções são independentes: mesmo com a Opção A desligada pra alguém, a Opção B continua disponível pro dono lançar um turno extra pontual quando precisar.</span></div>

      <h3 class="sub-head">Escala de trabalho — só referência</h3>
      <p class="section-sub" style="margin:6px 0 16px;">Cadastrada em Funcionários, aparece nas telas como informação de contexto — o sistema não compara automaticamente a escala combinada com o que foi batido no tablet.</p>
      <div class="sec-grid" style="margin-top:0;">
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-calendar"/></svg><h4>5x2</h4></div><p>Cinco dias trabalhados, dois de folga.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-calendar"/></svg><h4>6x1</h4></div><p>Seis dias trabalhados, um de folga.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-calendar"/></svg><h4>12x36</h4></div><p>12 horas trabalhadas, 36 horas de descanso.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-calendar"/></svg><h4>Outra</h4></div><p>Qualquer escala fora dos padrões acima.</p></div>
      </div>

      <div class="flow-note" style="margin-top:20px;"><svg class="icon" style="width:16px;height:16px;"><use href="#i-info"/></svg><span>Quando alguém esquece de bater a saída, o registro fica "Pendente de correção" em Funcionários. O dono só preenche o horário de saída — o sistema recalcula sozinho as horas trabalhadas e fecha o registro.</span></div>
    </section>

    <section id="painel">
      <span class="n">Painel administrativo</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-briefcase"/></svg></div><h2>As telas do painel</h2></div>
      <p class="section-sub">Tudo que a empresa configura e acompanha, acessado por login (e-mail + senha) em qualquer navegador.</p>

      <div class="grid-cards">
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-clock"/></svg></div><h3>Painel</h3><span class="path">/dashboard</span></div>
          <p class="desc">Visão do dia: quem está em turno agora, turnos de hoje, pagamentos pendentes, funções e totens ativos. Atualiza sozinho.</p>
          <ul class="pts"><li>Lista "Em turno agora" combina extra e CLT, com etiqueta indicando qual é qual</li><li>Lista "Ontem" com valor por pessoa e impressão do recibo</li></ul>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-building"/></svg></div><h3>Empresas</h3><span class="path">/empresas</span></div>
          <p class="desc">Um mesmo login pode gerenciar várias empresas — a relação é muitos-para-muitos, não uma conta por empresa. Cada uma com nome, CNPJ e endereço próprios.</p>
          <div class="tags"><span>Entrar</span><span>Remover</span><span>Excluir tudo</span></div>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-tablet"/></svg></div><h3>Totens</h3><span class="path">/totens</span></div>
          <p class="desc">Cada tablet tem um link único, com um token de 192 bits gerado por criptografia embutido — impossível de adivinhar, e não exige login no aparelho.</p>
          <div class="tags"><span>Copiar link</span><span>Ativar/Desativar</span><span>Gerar novo link</span></div>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-briefcase"/></svg></div><h3>Funções</h3><span class="path">/funcoes</span></div>
          <p class="desc">Os cargos que aparecem pro extra escolher no totem (Garçom, Cozinha, Bar...), cada um com valor/hora próprio — é a base do cálculo "por hora".</p>
          <div class="tags"><span>Editar nome</span><span>Valor/hora inline</span><span>Ativar/Desativar</span></div>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-user"/></svg></div><h3>Freelancers</h3><span class="path">/freelancers</span></div>
          <p class="desc">Todo mundo que já bateu ponto como extra. Por pessoa: modo de pagamento (por hora ou diária fixa), frequência de recebimento (a cada turno ou semanal), dados e chave PIX.</p>
          <ul class="pts"><li>Histórico de turnos com contrato e recibo em PDF, individual ou em lote</li><li>"Converter para CLT" pergunta se zera os valores de extra ou se a pessoa já era CLT desde uma data anterior — nesse caso a admissão fica retroativa, sem mexer nos turnos de extra já pagos nesse meio-tempo</li></ul>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-users"/></svg></div><h3>Funcionários (CLT)</h3><span class="path">/funcionarios</span></div>
          <p class="desc">Cadastro manual pela empresa. Salário e escala ficam como referência, não entram em cálculo nenhum — a não ser que a pessoa também faça turnos extras (ver "Turno extra pago no dia" na seção do fluxo do CLT).</p>
          <ul class="pts">
            <li>Histórico de ponto com correção manual (só o horário de saída) quando alguém esquece de bater</li>
            <li>"Permitir fazer extra com recebimento diário" — liga a pergunta no totem, pessoa por pessoa</li>
            <li>"Lançar turno extra manualmente" — registra um turno direto no painel, sem passar pelo totem</li>
          </ul>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-calendar"/></svg></div><h3>Turnos</h3><span class="path">/turnos</span></div>
          <p class="desc">Histórico completo dos check-ins de extras: filtro por status, período, frequência de pagamento (diária/semanal) e busca por nome. Cada turno mostra fotos e assinaturas de entrada e saída, com selo ☀️ Dia / 🌙 Noite conforme o horário de início.</p>
          <ul class="pts"><li>Atalhos de período: hoje, ontem, semana, mês</li><li>Seleção múltipla — imprime termos e recibos de vários turnos em lote</li></ul>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-wallet"/></svg></div><h3>Pagamentos</h3><span class="path">/pagamentos</span></div>
          <p class="desc">Cada turno concluído entra como "aguardando PIX manual". A empresa transfere pelo próprio banco e marca como pago no sistema. Filtro por frequência (todos, diária ou semanal) — no modo semanal, agrupa por pessoa.</p>
          <ul class="pts"><li>Seleção múltipla — marca vários pagamentos como pagos de uma vez</li></ul>
          <div class="tags"><span>Marcar como pago</span><span>Relatório semanal PDF</span></div>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-chart"/></svg></div><h3>Relatórios</h3><span class="path">/relatorios · /relatorios/horas</span></div>
          <p class="desc">Custo de extras por período, por função e por pessoa, com atalho "Ontem" e filtro por frequência (diária/semanal). E, à parte, horas trabalhadas pelos CLT no mesmo formato de período.</p>
          <ul class="pts"><li>Imprimir tudo, por função ou por pessoa — cada um em PDF próprio</li></ul>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-gear"/></svg></div><h3>Configurações</h3><span class="path">/configuracoes</span></div>
          <p class="desc">Sete blocos de ajuste — dados da empresa, contrato, pausas, diária, fechamento automático e semana de pagamento. Ver seção completa abaixo.</p>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-users"/></svg></div><h3>Equipe</h3><span class="path">/equipe</span></div>
          <p class="desc">Cria logins extras (ex: financeiro) com acesso total às empresas escolhidas — sem dividir a própria senha. Não existe nível de permissão: é tudo ou nada por empresa.</p>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-calc"/></svg></div><h3>Estimativa CLT</h3><span class="path">/estimativa-clt</span></div>
          <p class="desc">Simula quanto custaria registrar um extra como CLT — férias, 13º, FGTS e multa — a partir dos turnos já pagos.</p>
        </div>
        <div class="card">
          <div class="head"><div class="ic"><svg class="icon" style="width:18px;height:18px;"><use href="#i-id"/></svg></div><h3>Meus dados</h3><span class="path">/meus-dados</span></div>
          <p class="desc">Nome, e-mail e troca de senha da própria conta de acesso.</p>
        </div>
      </div>

      <h3 class="sub-head">Contas, login e várias empresas</h3>
      <p class="section-sub" style="margin:6px 0 16px;">Como o acesso ao sistema funciona por trás — vale entender antes de convidar alguém da equipe.</p>
      <div class="sec-grid" style="margin-top:0;">
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-id"/></svg><h4>Cadastro</h4></div><p>Criar uma conta (nome, CPF, e-mail, senha) não cria uma empresa junto — isso é passo separado em Empresas. Um único login pode acabar dono de várias.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-lock"/></svg><h4>Login e recuperação</h4></div><p>Entra com e-mail + senha. Esqueceu? Recupera confirmando nome completo + CPF — sem depender de e-mail chegando.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-building"/></svg><h4>Empresa ativa</h4></div><p>Com mais de uma empresa, o sistema pede pra escolher qual fica "ativa" — é ela que aparece no Painel e no resto do sistema até trocar de novo.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-users"/></svg><h4>Acesso da equipe</h4></div><p>Sem nível de permissão — quem recebe acesso a uma empresa enxerga e edita tudo nela, igual ao dono.</p></div>
      </div>
    </section>

    <section id="configuracoes">
      <span class="n">Ajustes por empresa</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-gear"/></svg></div><h2>Configurações, bloco por bloco</h2></div>
      <p class="section-sub">Tudo aqui vale pra empresa inteira — todos os totens dela seguem a mesma regra. Não dá pra configurar diferente por totem ou por pessoa (exceto onde indicado).</p>

      <div class="sec-grid">
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-building"/></svg><h4>Dados da empresa</h4></div>
          <p>Nome, CNPJ e endereço — usados nos PDFs de contrato e recibo gerados pelo sistema.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-doc"/></svg><h4>Termos do contrato</h4></div>
          <p>Um único texto, compartilhado por todas as funções e totens da empresa. Botão "Restaurar padrão" volta pro texto de fábrica.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-clock"/></svg><h4>Pausa dos extras <span class="default">padrão: nenhuma</span></h4></div>
          <p>Três modos: nenhuma, 30min ou 60min automáticos. Só desconta se o turno passar de 6h — e desconta hora e valor pago ao mesmo tempo.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-cpf"/></svg><h4>Intervalo dos CLT <span class="default">padrão: desligado</span></h4></div>
          <p>Um interruptor só, vale pra empresa toda: liga ou desliga a exigência de bater saída/volta do intervalo no ponto — não dá pra configurar pessoa por pessoa.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-calc"/></svg><h4>Diária por faixas <span class="default">padrão: 4h / 6h</span></h4></div>
          <p>Os dois limiares de horas que definem 50% / 75% / 100% da diária (ver exemplo na seção do fluxo do extra). Só vale pra quem está configurado com pagamento por diária.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-check"/></svg><h4>Turnos do dia e da noite <span class="default">padrão: 9h / 16h</span></h4></div>
          <p>Dois horários de início (dia e noite) decidem se quem não tem turno fixo configurado é classificado como ☀️ dia ou 🌙 noite — quem chega depois do meio do caminho entre os dois já conta como noite.</p>
          <p>Também define, separado por dia/noite, o horário de fechamento automático de turnos esquecidos abertos (padrão: 17h pro turno do dia, 23:30 pro da noite). Só entram nessa varredura turnos com entrada anterior a hoje.</p>
        </div>
        <div class="mini-card">
          <div class="head"><svg class="icon"><use href="#i-repeat"/></svg><h4>Semana de pagamento <span class="default">padrão: seg. / qua.</span></h4></div>
          <p>Dia de início da semana e dia de pagamento — usados só por freelancers com frequência "Semanal", alimentando o relatório semanal.</p>
        </div>
      </div>

      <div class="notice warn" style="margin-top:24px;">
        <svg class="icon"><use href="#i-alert"/></svg>
        <div><h4>Editar o contrato muda o passado também</h4><p>O PDF do contrato não guarda uma cópia congelada do texto no momento da assinatura — ele é gerado sob demanda, sempre com o texto atual de "Termos do contrato". Se o texto for editado depois, reimprimir um contrato antigo mostra o texto novo, não o que a pessoa realmente leu naquele dia. Pra alterações relevantes, vale guardar uma cópia externa do texto anterior.</p></div>
      </div>
    </section>

    <section id="master">
      <span class="n">Só para a conta principal</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-shield"/></svg></div><h2>Área master</h2></div>
      <p class="section-sub">Visão de dono do sistema — visível só pra conta marcada como master, não aparece pros clientes.</p>
      <div class="sec-grid">
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-building"/></svg><h4>Todas as empresas</h4></div><p>Lista todo cliente cadastrado e permite entrar em qualquer empresa pra dar suporte, mesmo sem ser o dono.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-user"/></svg><h4>Freelancers globais</h4></div><p>Cadastro de pessoas de todas as empresas do sistema, com exclusão definitiva permitida só pra quem nunca teve turno.</p></div>
      </div>
    </section>

    <section id="seguranca">
      <span class="n">Por baixo dos panos</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-lock"/></svg></div><h2>Segurança e automações</h2></div>
      <p class="section-sub">Três rotinas rodam sozinhas todo dia, sem precisar de ninguém abrir o painel.</p>

      <div class="timeline">
        <div class="tl-item">
          <div class="time">01:00</div>
          <div class="rail"><div class="pt"></div><div class="ln"></div></div>
          <div class="body"><h4>Fechamento automático</h4><p>Encerra turnos e registros de ponto esquecidos abertos. Turno de extra some sozinho? Não — só quando ninguém bateu a saída, o sistema fecha usando o horário configurado em Configurações; ponto CLT esquecido fica marcado como "pendente de correção" em vez de inventar horário.</p></div>
        </div>
        <div class="tl-item">
          <div class="time">06:00</div>
          <div class="rail"><div class="pt"></div><div class="ln"></div></div>
          <div class="body"><h4>Backup diário</h4><p>Gera uma cópia completa de todos os dados — empresas, pessoas, turnos, pagamentos, pontos CLT — e guarda em armazenamento privado por 30 dias.</p></div>
        </div>
        <div class="tl-item">
          <div class="time">07:00</div>
          <div class="rail"><div class="pt"></div></div>
          <div class="body"><h4>Rede de segurança</h4><p>Segunda passada de fechamento automático, criada em 19/08/2026 — cobre qualquer falha pontual da rodada da 01:00 (ex: deploy em andamento). Rodar duas vezes no mesmo dia não causa efeito colateral.</p></div>
        </div>
      </div>

      <div class="sec-grid" style="margin-top:8px;">
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-tablet"/></svg><h4>Token por totem</h4></div><p>192 bits de aleatoriedade criptográfica por link — impossível de adivinhar. "Gerar novo link" invalida o antigo na hora, sem prazo de tolerância.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-camera"/></svg><h4>Fotos e assinaturas</h4></div><p>Guardadas em armazenamento privado (Vercel Blob) — nunca com link público direto. Só aparecem dentro do sistema, pra quem tem acesso à empresa.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-lock"/></svg><h4>Backup também a cada fechamento</h4></div><p>Além do horário fixo, todo disparo do fechamento automático (01:00 e 07:00) também gera um backup fresco na mesma chamada.</p></div>
        <div class="mini-card"><div class="head"><svg class="icon"><use href="#i-check"/></svg><h4>Rodar duas vezes não corrompe nada</h4></div><p>As rotinas automáticas só mexem em turno/registro ainda aberto — repetir a mesma verificação no mesmo dia não duplica nem altera o que já foi fechado.</p></div>
      </div>
    </section>

    <section id="avisos">
      <span class="n">Antes de confiar de olhos fechados</span>
      <div class="section-head"><div class="ic"><svg class="icon" style="width:20px;height:20px;"><use href="#i-alert"/></svg></div><h2>Avisos importantes</h2></div>
      <p class="section-sub">O que o sistema faz muito bem hoje, e o que ainda não faz — pra não gerar expectativa errada.</p>

      <div class="notice warn">
        <svg class="icon"><use href="#i-wallet"/></svg>
        <div><h4>PIX ainda é manual</h4><p>O sistema calcula o valor certinho e deixa pronto pra pagar, mas o envio do PIX é feito pela empresa no próprio banco — ainda não há integração automática (ex: Stone) pra disparar o pagamento sozinho.</p></div>
      </div>
      <div class="notice warn">
        <svg class="icon"><use href="#i-cpf"/></svg>
        <div><h4>Ponto CLT é controle interno, não REP-P oficial</h4><p>O módulo de funcionários registra jornada com validade só para controle interno da empresa. Não substitui um relógio de ponto homologado pela Portaria MTE 671/2021 — decisão deliberada, já validada com o advogado.</p></div>
      </div>
      <div class="notice warn">
        <svg class="icon"><use href="#i-doc"/></svg>
        <div><h4>Reimpressão de contrato usa o texto de hoje</h4><p>Ver detalhes na seção Configurações — editar "Termos do contrato" muda como turnos antigos são reimpressos, não só os novos.</p></div>
      </div>
      <div class="notice danger">
        <svg class="icon"><use href="#i-calc"/></svg>
        <div><h4>Estimativa CLT não é documento</h4><p>Os números de "Estimativa de custo CLT" são só apoio a decisão interna — não é recibo, holerite nem parecer jurídico ou contábil.</p></div>
      </div>
      <div class="notice warn">
        <svg class="icon"><use href="#i-clock"/></svg>
        <div><h4>Período de observação</h4><p>O sistema está em produção real desde agosto de 2026. A recomendação é acompanhar os próximos ~15 dias de uso direto antes de considerar todos os fluxos 100% validados.</p></div>
      </div>
    </section>

    <footer>
      <div class="fbar">
        <div class="mark"><span class="dot"></span> iFREE</div>
        <p>Manual atualizado em 23 de agosto de 2026 · reflete o sistema em produção nesta data.</p>
      </div>
    </footer>
  </main>
</div>
`;
