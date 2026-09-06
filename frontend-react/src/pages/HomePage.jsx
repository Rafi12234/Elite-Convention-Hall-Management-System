import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { apiRequest, customerHeaders } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_HALL_ID = 1;

const CUSTOMER_TOKEN_KEY = "dlc_customer_token_v1";
const CUSTOMER_USER_KEY = "dlc_customer_user_v1";
const SELECTED_SLOT_KEY = "dlc_selected_slot_v2";
const BOOKING_DRAFT_KEY = "dlc_booking_draft_v2";
const ACTIVE_HOLD_KEY = "dlc_active_hold_v2";
const HOMEPAGE_CACHE_KEY = "dlc_homepage_content_v1";
const HOMEPAGE_CACHE_TS_KEY = "dlc_homepage_content_ts_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Styles ───────────────────────────────────────────────────────────────────
// Theme: warm ivory/champagne canvas (the true brand palette — gold foil on
// paper), with deep espresso-charcoal used ONLY as a small accent (footer,
// calendar "jewel box", nav-on-scroll) — never as the page background.
const homePageStyles = String.raw`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --paper:        #faf6ec;
    --paper-deep:   #f2ead6;
    --ivory:        #fffdf7;
    --line:         rgba(138,106,31,0.22);

    --gold-deep:    #8a6a1f;
    --gold:         #b8873a;
    --gold-mid:     #c9a227;
    --gold-bright:  #e8c766;
    --gold-pale:    #f6ecd2;

    --espresso:     #231a12;
    --espresso-2:   #2e2216;
    --plum:         #3a2a3a;

    --night:        #34305f;
    --night-light:  #55508f;
    --burgundy:     #7c2436;
    --burgundy-l:   #9c3348;
    --copper:       #c97a35;
    --teal:         #2f7a6e;
    --taupe:        #8d8071;

    --text:         #2b2318;
    --text-soft:    #5b4f3d;
    --text-mute:    #8a7d68;
    --cream-text:   #f8f1dd;

    --radius: 20px;
    --radius-lg: 30px;
    --shadow-sm: 0 4px 18px rgba(80,60,20,0.08);
    --shadow-md: 0 16px 44px rgba(80,60,20,0.12);
    --shadow-lg: 0 30px 80px rgba(40,28,10,0.18);
    --shadow-gold: 0 12px 32px rgba(184,135,58,0.28);
    --transition: 0.4s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Poppins', sans-serif;
    background:
      radial-gradient(circle at 12% 8%, rgba(184,135,58,0.07), transparent 42%),
      radial-gradient(circle at 88% 92%, rgba(184,135,58,0.06), transparent 46%),
      var(--paper);
    color: var(--text);
    overflow-x: hidden;
  }
  a { text-decoration: none; color: inherit; }
  .container { width: 90%; max-width: 1240px; margin: auto; position: relative; z-index: 1; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: var(--paper-deep); }
  ::-webkit-scrollbar-thumb { background: linear-gradient(var(--gold-bright), var(--gold-deep)); border-radius: 10px; }
  .serif { font-family: 'Cormorant Garamond', serif; }

  section { padding: 130px 0; position: relative; z-index: 1; }

  /* ── reveal engine ── */
  [data-aos] { opacity: 0; transition: opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1), filter 1s ease; will-change: transform,opacity; }
  [data-aos-delay="100"]{transition-delay:.1s}[data-aos-delay="150"]{transition-delay:.15s}
  [data-aos-delay="200"]{transition-delay:.2s}[data-aos-delay="250"]{transition-delay:.25s}
  [data-aos-delay="300"]{transition-delay:.3s}[data-aos-delay="450"]{transition-delay:.45s}
  [data-aos-delay="500"]{transition-delay:.5s}[data-aos-delay="550"]{transition-delay:.55s}
  [data-aos="fade-up"]{transform:translateY(44px);filter:blur(3px)}
  [data-aos="fade-right"]{transform:translateX(-44px);filter:blur(3px)}
  [data-aos="fade-left"]{transform:translateX(44px);filter:blur(3px)}
  [data-aos="zoom-in"]{transform:scale(.92);filter:blur(3px)}
  [data-aos].aos-animate{opacity:1;transform:none;filter:blur(0)}

  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes spinSlow { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes spinSlowRev { from{transform:rotate(0)} to{transform:rotate(-360deg)} }
  @keyframes shimmerGold { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(184,135,58,.45)} 50%{box-shadow:0 0 0 9px rgba(184,135,58,0)} }
  @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes sparkle { 0%{transform:translateY(100vh) scale(.3);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-10vh) scale(1);opacity:0} }
  @keyframes popupFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes popupSlideUp { from{opacity:0;transform:translateY(46px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes galleryShimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
  @keyframes spin { to{transform:translateY(-50%) rotate(360deg)} }
  @keyframes underline { from{width:0} to{width:100%} }
  @keyframes crownGlow { 0%,100%{filter:drop-shadow(0 0 2px rgba(232,199,102,.5))} 50%{filter:drop-shadow(0 0 8px rgba(232,199,102,.9))} }

  .calendar-loading { padding:90px 20px; text-align:center; color:var(--gold-deep); font-weight:600; letter-spacing:1px; }
  .popup { transition: opacity .3s ease; } .popup.closing{opacity:0}
  .fc .fc-daygrid-day { cursor:pointer; }

  /* ═══ CREST (brand monogram, echoes the logo's circular "E") ═══ */
  .crest { position:relative; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  .crest .crest-ring {
    width:100%; height:100%; border-radius:50%;
    border:2px solid var(--gold); background: var(--ivory);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 0 0 4px var(--paper), var(--shadow-gold);
  }
  .crest .crest-letter {
    font-family:'Cormorant Garamond',serif; font-weight:800; color:var(--gold-deep);
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-bright));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .crest .crest-crown {
    position:absolute; top:-13px; left:50%; transform:translateX(-50%);
    width:60%; height:14px;
    clip-path: polygon(0% 100%, 0% 40%, 20% 100%, 30% 20%, 50% 100%, 70% 20%, 80% 100%, 100% 40%, 100% 100%);
    background: linear-gradient(180deg,var(--gold-bright),var(--gold-deep));
    animation: crownGlow 3s ease infinite;
  }

  .rule-flourish { display:flex; align-items:center; gap:12px; }
  .rule-flourish::before,.rule-flourish::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,transparent,var(--gold)); }
  .rule-flourish::after { background:linear-gradient(90deg,var(--gold),transparent); }
  .rule-diamond { width:7px;height:7px; background:var(--gold); transform:rotate(45deg); flex-shrink:0; }

  /* ═══ ANNOUNCEMENT BAR ═══ */
  .announce-bar {
    background: linear-gradient(90deg,var(--espresso),var(--espresso-2));
    color: var(--gold-bright); font-size:12.5px; font-weight:600; letter-spacing:1.2px;
    text-align:center; padding:9px 14px; position:relative; z-index:1001;
  }
  .announce-bar span { opacity:.9; }

  /* ═══ NAVBAR — floating pill ═══ */
  .nav-shell { position:fixed; top:20px; left:0; right:0; z-index:1000; display:flex; justify-content:center; padding:0 18px; transition:var(--transition); }
  .nav-shell.scrolled { top:14px; }
  .nav-pill {
    width:100%; max-width:1240px; display:flex; align-items:center; justify-content:space-between;
    background:rgba(255,253,247,0.72); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid var(--line); border-radius:100px; padding:10px 14px 10px 22px;
    box-shadow: var(--shadow-sm); transition: var(--transition);
  }
  .nav-shell.scrolled .nav-pill { background:rgba(255,253,247,0.94); box-shadow:var(--shadow-md); border-color:var(--gold-mid); }
  .logo-mark { display:flex; align-items:center; gap:10px; }
  .logo-mark .crest { width:38px; height:38px; }
  .logo-mark .crest-letter { font-size:16px; }
  .logo-mark .word { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:15.5px; letter-spacing:0.8px; color:var(--espresso); white-space:nowrap; }
  .logo-mark .word b { color: var(--gold-deep); }

  .nav-links { display:flex; gap:4px; align-items:center; }
  .nav-links a { font-size:13px; font-weight:500; color:var(--text-soft); padding:9px 16px; border-radius:100px; position:relative; transition:var(--transition); }
  .nav-links a:not(.login-link):not(.nav-cta):hover { color:var(--gold-deep); background:var(--gold-pale); }
  .login-link, .nav-cta {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid),var(--gold-bright),var(--gold-mid));
    background-size:250% auto; color:var(--ivory) !important; font-weight:700 !important;
    box-shadow: var(--shadow-gold); transition: var(--transition), background-position .6s ease;
  }
  .login-link:hover, .nav-cta:hover { background-position:right center; transform:translateY(-2px); }
  .logout-btn {
    background: linear-gradient(120deg,var(--burgundy),var(--burgundy-l)); color:white; border:none;
    padding:9px 20px; border-radius:100px; font-size:13px; font-weight:600; font-family:'Poppins',sans-serif;
    cursor:pointer; transition:var(--transition); box-shadow:0 8px 20px rgba(124,36,54,.28);
  }
  .logout-btn:hover { transform:translateY(-2px); }
  .profile-icon-link {
    width:48px; height:48px; border-radius:50%; background:var(--gold-pale); border:1px solid var(--gold-mid);
    color:var(--gold-deep) !important; display:none; align-items:center; justify-content:center; transition:var(--transition);
  }
  .profile-icon-link svg { width:24px;height:24px; }
  .profile-icon-link:hover { background:var(--gold-deep); color:var(--ivory) !important; transform:translateY(-2px) rotate(6deg); }

  /* ═══ HERO — split editorial ═══ */
  .hero-split {
    min-height:100vh; padding-top:120px;
    display:grid; grid-template-columns: 1.08fr .92fr; align-items:stretch;
    background: var(--paper); position:relative; overflow:hidden;
  }
  .hero-split::before {
    content:''; position:absolute; inset:0; pointer-events:none;
    background: radial-gradient(circle at 30% 20%, rgba(184,135,58,0.08), transparent 45%);
  }
  .hero-left { display:flex; flex-direction:column; justify-content:center; padding:40px 60px 70px; position:relative; z-index:2; }
  .hero-kicker { display:flex; align-items:center; gap:12px; margin-bottom:26px; }
  .hero-kicker .crest { width:46px; height:46px; }
  .hero-kicker .crest-letter { font-size:19px; }
  .hero-kicker span.txt { font-size:12.5px; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--gold-deep); }

  .hero-left h1 {
    font-family:'Cormorant Garamond',serif; font-weight:700; font-size:clamp(40px,5.2vw,68px);
    line-height:1.08; color:var(--espresso); margin-bottom:26px; letter-spacing:.2px;
  }
  .hero-left h1 span {
    display:block; font-style:italic;
    background: linear-gradient(110deg,var(--gold-deep) 0%,var(--gold-bright) 30%,var(--gold-mid) 55%,var(--gold-bright) 80%,var(--gold-deep) 100%);
    background-size:250% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    animation: shimmerGold 6s linear infinite;
  }
  .hero-left p { max-width:520px; line-height:1.9; font-size:16.5px; color:var(--text-soft); margin-bottom:38px; }
  .hero-actions { display:flex; gap:16px; flex-wrap:wrap; }

  .btn {
    display:inline-flex; align-items:center; gap:9px;
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid),var(--gold-bright));
    background-size:220% auto; color:var(--ivory); padding:16px 34px; border-radius:100px;
    font-weight:700; font-size:14px; font-family:'Poppins',sans-serif;
    transition: var(--transition), background-position .6s ease; border:none; position:relative; overflow:hidden;
    cursor:pointer; letter-spacing:.3px; box-shadow: var(--shadow-gold);
  }
  .btn::before { content:''; position:absolute; top:0; left:-60%; width:40%; height:100%; background:linear-gradient(120deg,transparent,rgba(255,255,255,.6),transparent); transform:skewX(-20deg); }
  .btn:hover::before { animation: sweep .9s ease; }
  @keyframes sweep { from{transform:translateX(0) skewX(-20deg)} to{transform:translateX(360%) skewX(-20deg)} }
  .btn:hover { background-position:right center; transform:translateY(-3px); box-shadow:0 18px 40px rgba(184,135,58,.35); }
  .btn-outline { background:transparent; border:1.5px solid var(--gold-deep); color:var(--gold-deep); box-shadow:none; }
  .btn-outline:hover { background:var(--gold-pale); color:var(--gold-deep); box-shadow:none; transform:translateY(-3px); }
  .btn-dark { background: linear-gradient(120deg,var(--espresso),var(--espresso-2)); color:var(--gold-bright); box-shadow:0 12px 30px rgba(35,26,18,.3); }
  .btn-dark:hover { background-position:right center; }

  .hero-right { position:relative; overflow:hidden; }
  .hero-right .hero-bg {
    position:absolute; inset:0; background-size:cover; background-position:center;
    border-radius: 0 0 0 260px; transform:scale(1.02);
    box-shadow: inset 0 0 0 2000px rgba(35,26,18,0.18);
  }
  .hero-right::after {
    content:''; position:absolute; inset:22px 22px 22px 0; border:2px solid var(--gold-mid);
    border-radius: 0 0 0 250px; pointer-events:none;
  }
  .hero-particles { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:1; }
  .particle { position:absolute; border-radius:50%; background: radial-gradient(circle,var(--gold-bright),var(--gold) 60%,transparent 70%); animation: sparkle linear infinite; }
  @keyframes scrollDot { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(16px);opacity:0} }

  @media(max-width:960px){
    .hero-split { grid-template-columns:1fr; padding-top:100px; }
    .hero-right { min-height:420px; order:-1; }
    .hero-right .hero-bg, .hero-right::after { border-radius:0 0 0 0; }
    .hero-left { padding:50px 26px 60px; }
  }

  /* ═══ STATS RIBBON ═══ */
  .stats-band { background: linear-gradient(120deg,var(--espresso),var(--espresso-2)); position:relative; z-index:10; padding:0; overflow:hidden; }
  .stats-band::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--gold-bright),transparent); }
  .stats-inner { display:grid; grid-template-columns:repeat(4,1fr); }
  .stat-item { padding:46px 20px; text-align:center; position:relative; border-right:1px solid rgba(232,199,102,0.14); transition:var(--transition); }
  .stat-item:last-child { border-right:none; }
  .stat-item:hover { background:rgba(232,199,102,0.05); }
  .stat-number {
    font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:800; display:block; line-height:1; margin-bottom:8px;
    background: linear-gradient(120deg,var(--gold-mid),var(--gold-bright)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .stat-label { font-size:11.5px; color:rgba(248,241,221,0.6); font-weight:500; letter-spacing:1.6px; text-transform:uppercase; }

  /* ═══ SECTION TITLE ═══ */
  .section-title { text-align:center; margin-bottom:70px; }
  .section-eyebrow { display:inline-flex; align-items:center; gap:12px; font-size:12px; font-weight:700; letter-spacing:3.5px; text-transform:uppercase; color:var(--gold-deep); margin-bottom:18px; }
  .section-eyebrow::before,.section-eyebrow::after { content:''; width:32px; height:1px; background:linear-gradient(90deg,transparent,var(--gold)); }
  .section-eyebrow::after { background:linear-gradient(90deg,var(--gold),transparent); }
  .section-title h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(32px,5vw,52px); font-weight:700; color:var(--espresso); margin-bottom:18px; }
  .section-title p { max-width:660px; margin:auto; color:var(--text-soft); line-height:1.9; font-size:15.5px; }

  /* ═══ CALENDAR — Jewel Box ═══ */
  .calendar-section { background: var(--paper-deep); }
  .daynight-toggle-row { display:flex; justify-content:center; gap:14px; margin-bottom:36px; flex-wrap:wrap; }
  .dn-chip { display:flex; align-items:center; gap:9px; padding:10px 20px; border-radius:100px; font-size:13px; font-weight:700; border:1.5px solid; }
  .dn-chip.day { background:var(--gold-pale); border-color:var(--gold-mid); color:var(--gold-deep); }
  .dn-chip.night { background:rgba(52,48,95,0.08); border-color:var(--night-light); color:var(--night); }

  .calendar-jewel { position:relative; max-width:1120px; margin:auto; }
  .calendar-jewel .corner { position:absolute; width:36px; height:36px; border:2px solid var(--gold-bright); z-index:5; }
  .corner.tl{top:-11px;left:-11px;border-right:none;border-bottom:none} .corner.tr{top:-11px;right:-11px;border-left:none;border-bottom:none}
  .corner.bl{bottom:-11px;left:-11px;border-right:none;border-top:none} .corner.br{bottom:-11px;right:-11px;border-left:none;border-top:none}

  #calendar {
    width:100%; margin:auto; padding:38px; box-sizing:border-box; overflow:hidden;
    background: linear-gradient(165deg,var(--ivory) 0%,var(--paper) 100%);
    border-radius: var(--radius-lg); border:1px solid var(--line);
    box-shadow: var(--shadow-lg);
  }
  #calendar .fc { width:100% !important; --fc-border-color:rgba(35,26,18,0.12); --fc-page-bg-color:transparent; --fc-neutral-bg-color:rgba(35,26,18,0.025); }
  #calendar .fc-view-harness,#calendar .fc-view,#calendar .fc-scrollgrid,#calendar .fc-daygrid,
  #calendar .fc-daygrid-body,#calendar .fc-daygrid-body table,#calendar .fc-col-header,#calendar .fc-scrollgrid-sync-table{width:100% !important}
  #calendar table { table-layout:fixed !important; }
  .fc-toolbar-title { font-family:'Cormorant Garamond',serif !important; font-size:27px !important; color:var(--espresso) !important; font-weight:700 !important; }
  .fc-button-primary {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid)) !important; border:none !important;
    font-family:'Poppins',sans-serif !important; font-weight:600 !important; color:var(--ivory) !important;
    border-radius:10px !important; padding:8px 16px !important; transition:var(--transition) !important;
  }
  .fc-button-primary:hover { transform:translateY(-2px) !important; }
  .fc-button-primary:not(:disabled).fc-button-active { background: linear-gradient(120deg,var(--night),var(--night-light)) !important; color:var(--cream-text) !important; }
  .fc-col-header-cell { background:rgba(35,26,18,0.04) !important; color:var(--gold-deep) !important; font-weight:700 !important; font-size:12px !important; text-transform:uppercase !important; letter-spacing:1.5px !important; padding:13px 0 !important; }
  .fc-daygrid-day { background:transparent; transition:background .3s ease; }
  .fc .fc-daygrid-day-frame { min-height:114px; }
  .fc .fc-daygrid-day:hover { background:rgba(232,199,102,0.1) !important; }
  .fc .fc-daygrid-event { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11px; padding:5px 8px; border-radius:8px !important; font-weight:700; cursor:pointer; transition:transform .25s ease; border:none !important; }
  .fc .fc-daygrid-event:hover { transform:translateY(-2px) scale(1.02); }
  .fc .fc-daygrid-day-number { font-size:14.5px; font-weight:600; padding:9px; color:rgba(35,26,18,0.55); }
  .fc .fc-daygrid-day-top { min-height:40px; align-items:center; }
  .fc .fc-daygrid-day:hover .fc-daygrid-day-number { color:var(--gold-deep); }
  .fc .fc-daygrid-day.fc-day-today { background:rgba(232,199,102,0.14) !important; }
  .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-bright)); color:var(--ivory); border-radius:50%;
    width:29px;height:29px; display:flex; align-items:center; justify-content:center; animation: ringPulse 2.2s ease infinite;
  }
  .fc-list,.fc-list-day-cushion { background:rgba(35,26,18,0.02) !important; color:var(--espresso) !important; }
  .fc-list-event-time,.fc-list-day-text,.fc-list-day-side-text { color:var(--gold-deep) !important; }
  .fc-theme-standard td,.fc-theme-standard th { border-color:var(--line) !important; }

  .calendar-legend { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:34px; }
  .legend-item { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:var(--text-soft); background:var(--ivory); border:1px solid var(--line); padding:9px 16px; border-radius:100px; transition:var(--transition); }
  .legend-item:hover { border-color:var(--gold-mid); transform:translateY(-2px); box-shadow:var(--shadow-sm); }
  .legend-dot { width:11px;height:11px;border-radius:50%; box-shadow:0 0 8px currentColor; flex-shrink:0; }

  /* ═══ ABOUT — editorial asymmetric ═══ */
  .about-section { background: var(--paper); }
  .about-wrapper { display:grid; grid-template-columns: .72fr 1.28fr; gap:70px; align-items:center; }
  .about-img-wrap { position:relative; }
  .about-img-wrap .arch {
    width:100%; aspect-ratio: 4/5; object-fit:cover; display:block; position:relative; z-index:2;
    border-radius: 200px 200px 24px 24px; border:1px solid var(--line); box-shadow:var(--shadow-lg);
  }
  .about-img-deco { position:absolute; inset:20px 20px 20px -20px; border:1.5px solid var(--gold-mid); border-radius:200px 200px 24px 24px; z-index:1; }

  .about-text .crest { width:56px; height:56px; margin-bottom:22px; }
  .about-text .crest-letter { font-size:22px; }
  .about-text h3 { font-family:'Cormorant Garamond',serif; font-size:clamp(28px,4vw,42px); font-weight:700; color:var(--espresso); margin-bottom:24px; line-height:1.25; }
  .about-text h3 em { font-style:italic; background:linear-gradient(120deg,var(--gold-deep),var(--gold-bright)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .about-text p { color:var(--text-soft); line-height:2; margin-bottom:18px; font-size:15.5px; }
  .about-checklist { margin-top:26px; display:flex; flex-direction:column; gap:0; }
  .about-checklist .row { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--line); font-size:14.5px; font-weight:600; color:var(--text); transition:var(--transition); }
  .about-checklist .row:hover { padding-left:8px; color:var(--gold-deep); }
  .about-checklist .row .tick { width:24px;height:24px;border-radius:50%; background:linear-gradient(120deg,var(--gold-deep),var(--gold-mid)); color:var(--ivory); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }

  @media(max-width:900px){ .about-wrapper{ grid-template-columns:1fr; gap:56px; } .about-img-deco{inset:20px} }

  /* ═══ GALLERY WALL — infinite carousel ═══ */
  .gallery-section { background: var(--paper-deep); }
  .gallery-carousel { overflow:hidden; width:100%; -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); }
  .gallery-track { display:flex; gap:20px; width:max-content; animation:galleryScroll 45s linear infinite; }
  .gallery-carousel:hover .gallery-track { animation-play-state:paused; }
  @keyframes galleryScroll { from { transform:translateX(0); } to { transform:translateX(-50%); } }
  .gallery-item {
    position:relative; border-radius:14px; overflow:hidden; cursor:pointer; display:block;
    background:var(--paper-deep); width:300px; height:220px; flex:0 0 auto; border:3px solid var(--ivory); outline:1px solid var(--line);
    box-shadow: var(--shadow-sm); transition: var(--transition);
  }
  .gallery-item:hover { outline-color:var(--gold-mid); box-shadow:var(--shadow-md); transform:translateY(-4px); }
  .gallery-item img { display:block; width:100%; height:100%; object-fit:cover; position:relative; z-index:1; transition:transform .7s cubic-bezier(.16,1,.3,1); }
  .gallery-shimmer { position:absolute; inset:0; z-index:2; pointer-events:none; background:linear-gradient(90deg,#f0e8d2 0%,#e9d9ab 40%,#f5ecd6 60%,#f0e8d2 100%); background-size:300% 100%; animation:galleryShimmer 1.6s ease-in-out infinite; transition:opacity .5s ease; opacity:1; }
  .gallery-shimmer.done { opacity:0; }
  .gallery-caption {
    position:absolute; left:0; right:0; bottom:0; z-index:4; padding:16px 16px 14px;
    background: linear-gradient(0deg, rgba(35,26,18,0.88) 0%, rgba(35,26,18,0) 100%);
    color:var(--gold-bright); font-size:13px; font-weight:600; letter-spacing:.3px;
    transform:translateY(100%); transition:transform .4s cubic-bezier(.16,1,.3,1);
  }
  .gallery-item:hover .gallery-caption { transform:translateY(0); }
  .gallery-item:hover img { transform:scale(1.08); }

  /* ═══ FEATURES — shield badges ═══ */
  .features-section { background: var(--paper); }
  .feature-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:30px; }
  .feature-card {
    background:var(--ivory); padding:46px 34px; border-radius:22px; text-align:center; transition:var(--transition);
    border:1px solid var(--line); position:relative; overflow:hidden;
  }
  .feature-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--gold-deep),var(--gold-bright),var(--gold-deep)); transform:scaleX(0); transform-origin:left; transition:transform .5s ease; }
  .feature-card:hover::before { transform:scaleX(1); }
  .feature-card:hover { transform:translateY(-10px); box-shadow:var(--shadow-md); border-color:var(--gold-mid); }
  .feature-shield {
    width:78px; height:86px; margin:0 auto 24px; position:relative; display:flex; align-items:center; justify-content:center; font-size:34px;
    clip-path: polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0% 62%, 0% 18%);
    background: var(--gold-pale); border:1.5px solid var(--gold-mid); transition:var(--transition);
  }
  .feature-card:hover .feature-shield { background: linear-gradient(160deg,var(--gold-deep),var(--gold-bright)); transform:scale(1.06) rotate(-4deg); }
  .feature-card h3 { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:var(--espresso); margin-bottom:14px; }
  .feature-card p { color:var(--text-soft); line-height:1.85; font-size:14.5px; }

  /* ═══ CTA — foil banner ═══ */
  .booking-cta { position:relative; overflow:hidden; background: linear-gradient(120deg,var(--gold-pale),var(--paper) 40%,var(--gold-pale)); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
  .booking-cta::before, .booking-cta::after { content:''; position:absolute; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle,rgba(184,135,58,0.16),transparent 70%); }
  .booking-cta::before { top:-150px; left:-100px; } .booking-cta::after { bottom:-160px; right:-100px; }
  .booking-cta .container { position:relative; z-index:2; text-align:center; }
  .booking-cta .crest { width:64px;height:64px; margin:0 auto 26px; }
  .booking-cta .crest-letter { font-size:26px; }
  .booking-cta h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(32px,5.4vw,54px); font-weight:700; color:var(--espresso); margin-bottom:22px; line-height:1.18; }
  .booking-cta h2 em { font-style:italic; background:linear-gradient(120deg,var(--gold-deep),var(--gold-bright)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .booking-cta p { max-width:640px; margin:0 auto 42px; line-height:1.9; color:var(--text-soft); font-size:16.5px; }

  /* ═══ FOOTER — charcoal accent band ═══ */
  footer { background: linear-gradient(160deg,var(--espresso),var(--espresso-2)); color:var(--cream-text); padding:80px 0 36px; position:relative; }
  footer::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--gold-bright),transparent); }
  .footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:56px; margin-bottom:52px; }
  .footer-brand { display:flex; flex-direction:column; gap:18px; }
  .footer-brand .logo-mark .word { color:var(--cream-text); }
  .footer-brand .logo-mark .word b { color:var(--gold-bright); }
  .footer-brand p { color:rgba(248,241,221,0.55); line-height:1.85; font-size:14px; max-width:290px; }
  .footer-col h4 { font-family:'Cormorant Garamond',serif; color:var(--gold-bright); font-size:16px; font-weight:700; letter-spacing:1.5px; margin-bottom:22px; }
  .footer-col a, .footer-col p { display:block; color:rgba(248,241,221,0.55); font-size:14px; line-height:1.75; margin-bottom:9px; transition:var(--transition); }
  .footer-col a:hover { color:var(--gold-bright); padding-left:5px; }
  .footer-bottom { border-top:1px solid rgba(232,199,102,0.15); padding-top:30px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  .footer-bottom p { color:rgba(248,241,221,0.4); font-size:13px; }
  .footer-gold { color:var(--gold-bright); }

  .float { animation: floatY 5.5s ease-in-out infinite; }

  /* ═══ POPUP ═══ */
  .popup { display:none; position:fixed; inset:0; background:rgba(35,26,18,0.55); backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px); justify-content:center; align-items:center; z-index:9999; padding:20px; animation:popupFadeIn .3s ease; }
  .popup.active { display:flex; }
  .popup-box { background:var(--ivory); border-radius:26px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg), 0 0 0 1px var(--gold-mid); animation:popupSlideUp .45s cubic-bezier(.16,1,.3,1); position:relative; }
  .popup-header { background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%); padding:30px 32px; border-radius:26px 26px 0 0; position:relative; overflow:hidden; }
  .popup-header::before { content:''; position:absolute; top:-40px; right:-40px; width:160px;height:160px; background:rgba(255,255,255,0.16); border-radius:50%; }
  .popup-header-content { position:relative; z-index:1; }
  .popup-header h3 { font-family:'Cormorant Garamond',serif; font-size:23px; font-weight:700; color:var(--espresso); margin-bottom:8px; }
  .popup-date-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(35,26,18,0.16); color:var(--espresso); padding:7px 15px; border-radius:100px; font-size:13px; font-weight:700; }
  .popup-close { position:absolute; top:20px; right:20px; width:36px;height:36px; background:rgba(35,26,18,0.16); border:none; border-radius:50%; color:var(--espresso); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:var(--transition); z-index:2; }
  .popup-close:hover { background:rgba(35,26,18,0.3); transform:rotate(90deg); }
  .popup-body { padding:30px 32px; }
  .popup-subtitle { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2.5px; color:var(--text-mute); margin-bottom:20px; }
  .slot-radio-group { display:flex; flex-direction:column; gap:14px; }
  .slot-radio-item { position:relative; }
  .slot-radio-item input[type="radio"] { position:absolute; opacity:0; width:0;height:0; }
  .slot-radio-label { display:flex; align-items:center; gap:14px; padding:17px 18px; border:1.5px solid var(--line); border-radius:16px; cursor:pointer; transition:var(--transition); background:var(--paper); user-select:none; }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label { border-color:var(--gold-mid); background:var(--gold-pale); box-shadow:var(--shadow-gold); }
  .slot-radio-label:hover { border-color:var(--gold-mid); }
  .slot-radio-label.disabled { cursor:not-allowed; opacity:.5; pointer-events:none; }
  .slot-radio-custom { width:22px;height:22px; border:2px solid rgba(43,35,24,0.25); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:var(--transition); }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label .slot-radio-custom { border-color:var(--gold-deep); background:var(--gold-deep); }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label .slot-radio-custom::after { content:''; width:8px;height:8px; background:var(--ivory); border-radius:50%; }
  .slot-info { flex:1; }
  .slot-name { font-size:15px; font-weight:700; color:var(--espresso); margin-bottom:4px; display:flex; align-items:center; gap:6px; }
  .slot-time { font-size:13px; color:var(--text-mute); font-weight:500; }
  .slot-status-badge { padding:5px 13px; border-radius:100px; font-size:11.5px; font-weight:700; letter-spacing:.4px; white-space:nowrap; }
  .badge-available { background:var(--gold-pale); color:var(--gold-deep); border:1px solid var(--gold-mid); }
  .badge-booked { background:rgba(124,36,54,0.1); color:var(--burgundy); border:1px solid rgba(124,36,54,0.3); }
  .badge-blocked { background:rgba(141,128,113,0.14); color:var(--taupe); border:1px solid rgba(141,128,113,0.3); }
  .badge-progress { background:rgba(201,122,53,0.14); color:var(--copper); border:1px solid rgba(201,122,53,0.35); }
  .badge-pending { background:rgba(47,122,110,0.14); color:var(--teal); border:1px solid rgba(47,122,110,0.35); }
  .slot-price { font-size:14px; font-weight:700; color:var(--gold-deep); margin-top:5px; }
  .popup-footer { padding:0 32px 30px; display:flex; gap:12px; flex-direction:column; }
  .popup-proceed-btn { width:100%; padding:17px; font-size:16px; font-weight:700; border-radius:14px; justify-content:center; }
  .popup-close-btn { background:var(--paper-deep); color:var(--text-mute); box-shadow:none; justify-content:center; }
  .popup-close-btn:hover { background:var(--line); color:var(--text); transform:translateY(-2px); box-shadow:none; }
  .popup-empty { text-align:center; padding:20px 0; color:var(--text-mute); font-size:15px; }
  .popup-empty-icon { font-size:42px; margin-bottom:14px; }
  .btn.loading { pointer-events:none; opacity:.88; padding-right:52px; }
  .btn.loading::after { content:''; position:absolute; right:18px; top:50%; transform:translateY(-50%); width:18px;height:18px; border:2px solid rgba(255,255,255,0.5); border-top-color:var(--ivory); border-radius:50%; animation:spin .8s linear infinite; }

  /* ═══ RESPONSIVE ═══ */
  @media(max-width:1024px){ .footer-grid{grid-template-columns:1fr 1fr} .stats-inner{grid-template-columns:repeat(2,1fr)} }
  @media(max-width:768px){
    section{padding:90px 0} .nav-links{display:none}
    .footer-grid{grid-template-columns:1fr;gap:34px}
    .footer-bottom{flex-direction:column;text-align:center}
    .stats-inner{grid-template-columns:repeat(2,1fr)}
    #calendar{padding:16px;overflow-x:auto} #calendar .fc{min-width:680px}
    .popup-box{border-radius:20px} .popup-header{padding:24px 22px;border-radius:20px 20px 0 0}
    .popup-body{padding:22px} .popup-footer{padding:0 22px 22px}
    .gallery-item{width:220px;height:170px}
  }
  @media(max-width:480px){ .stats-inner{grid-template-columns:repeat(2,1fr)} }
`;

// ─── Static data ──────────────────────────────────────────────────────────────
const EMPTY_HOMEPAGE_CONTENT = {
  hero: {
    title: "", highlight: "", subtitle: "", background_image: "",
    primary_button_text: "", primary_button_link: "",
    secondary_button_text: "", secondary_button_link: "",
  },
  our_story: { eyebrow: "", title: "", description: "" },
  creating_experiences: {
    image: "", image_alt: "", badge_text: "",
    eyebrow: "", title: "", description_1: "", description_2: "", points: [],
  },
  gallery: { eyebrow: "", title: "", description: "", images: [] },
  footer: { description: "", address: "", phone: "", email: "", copyright: "", tagline: "" },
};

const STATS = [
  { count: 500, label: "Events Hosted", delay: "" },
  { count: 1200, label: "Happy Families", delay: "100" },
  { count: 20, label: "Years Experience", delay: "200" },
  { count: 98, label: "% Client Satisfaction", delay: "300" },
];

const FEATURE_CARDS = [
  { icon: "📅", title: "Live Calendar", delay: "", text: "Browse the full year calendar and view Day & Night shift availability instantly with real-time updates." },
  { icon: "📝", title: "Online Booking", delay: "150", text: "Book event halls directly from the website with instant reservation requests and confirmation." },
  { icon: "💳", title: "Secure Payment", delay: "300", text: "Easy and secure online payment system with encrypted transactions for booking confirmations." },
  { icon: "🎉", title: "Event Management", delay: "450", text: "Full-service event coordination by our expert team to make your celebration flawless." },
  { icon: "🌟", title: "Premium Décor", delay: "500", text: "Stunning decoration packages crafted by professional designers for every occasion." },
  { icon: "🔔", title: "Instant Alerts", delay: "550", text: "Get real-time notifications and reminders for your upcoming events and booking updates." },
];

// Legend — each status uses a distinct hue so no two colors read as similar.
const LEGEND_ITEMS = [
  { color: "#c9a227", label: "Day Available", icon: "☀️" },
  { color: "#55508f", label: "Night Available", icon: "🌙" },
  { color: "#7c2436", label: "Booked", icon: "🔒" },
  { color: "#c97a35", label: "Booking In Progress", icon: "⏳" },
  { color: "#2f7a6e", label: "Pending Approval", icon: "🕒" },
  { color: "#8d8071", label: "Blocked", icon: "🚫" },
];

const CALENDAR_COLOR_MAP = {
  available_day: "#c9a227",
  available_night: "#55508f",
  booked: "#7c2436",
  blocked: "#8d8071",
  payment_in_progress: "#c97a35",
  pending_approval: "#2f7a6e",
};

const STATUS_BADGE_MAP = {
  available: { label: "Available", cls: "badge-available" },
  booked: { label: "Booked", cls: "badge-booked" },
  blocked: { label: "Blocked", cls: "badge-blocked" },
  payment_in_progress: { label: "In Progress", cls: "badge-progress" },
  pending_approval: { label: "Pending Approval", cls: "badge-pending" },
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage quota */ }
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

// ─── sessionStorage helpers ───────────────────────────────────────────────────
function ssGet(key) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}
function ssDel(key) {
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
}

// ─── Homepage content cache ───────────────────────────────────────────────────
function getCachedContent() {
  const ts = lsGet(HOMEPAGE_CACHE_TS_KEY);
  const content = lsGet(HOMEPAGE_CACHE_KEY);
  if (!content || !ts || Date.now() - ts > CACHE_TTL_MS) {
    lsDel(HOMEPAGE_CACHE_KEY);
    lsDel(HOMEPAGE_CACHE_TS_KEY);
    return null;
  }
  return content;
}
function setCachedContent(raw) {
  lsSet(HOMEPAGE_CACHE_KEY, raw);
  lsSet(HOMEPAGE_CACHE_TS_KEY, Date.now());
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function clearCustomerAuth() {
  lsDel(CUSTOMER_TOKEN_KEY);
  lsDel(CUSTOMER_USER_KEY);
}
function clearBookingSession() {
  Object.keys(sessionStorage).forEach((k) => {
    if (k === SELECTED_SLOT_KEY || k === ACTIVE_HOLD_KEY || k === BOOKING_DRAFT_KEY || k.startsWith(`${BOOKING_DRAFT_KEY}_`))
      sessionStorage.removeItem(k);
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function parseServerTime(v) {
  if (!v) return null;
  const s = String(v);
  return new Date(s.includes("T") ? s : s.replace(" ", "T")).getTime();
}
function getSlotExpiry(slot) { return parseServerTime(slot?.hold_expires_at_iso || slot?.hold_expires_at); }
function getRemainingText(slot) {
  const exp = getSlotExpiry(slot);
  if (!exp) return "";
  const rem = exp - Date.now();
  return rem <= 0 ? "00:00" : formatCountdown(rem);
}
function formatSlotLabel(slot) { return `${slot.shift_name} (${slot.start_time} - ${slot.end_time})`; }
function calcAmount(slot) { return Number(slot?.price || slot?.shift_price || slot?.total_amount || 0); }
function getStatusBadge(status) { return STATUS_BADGE_MAP[status] || { label: status, cls: "badge-blocked" }; }

// Determine Day/Night shift period from start time
function getShiftPeriod(slot) {
  const t = String(slot?.start_time || "").trim();
  if (!t) return "day";
  const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return "day";
  let hour = parseInt(match[1], 10) || 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour >= 17 || hour < 5 ? "night" : "day";
}

function getCalendarSlotTitle(slot) {
  if (slot.slot_status === "payment_in_progress")
    return `⏳ ${slot.shift_name} · ${getRemainingText(slot)}`;
  if (slot.slot_status === "pending_approval")
    return `🕒 ${slot.shift_name} · Pending`;
  if (slot.slot_status === "booked")
    return `🔒 ${slot.shift_name} · Booked`;
  if (slot.slot_status === "blocked")
    return `🚫 Blocked`;
  if (slot.slot_status === "available")
    return getShiftPeriod(slot) === "night" ? "🌙 Night Available" : "☀️ Day Available";
  return slot.calendar_title || `${slot.shift_name} · ${slot.slot_status}`;
}

function buildSlotEvent(slot) {
  let color;
  let textColor = "#fdf8ea";
  if (slot.slot_status === "available") {
    const night = getShiftPeriod(slot) === "night";
    color = night ? CALENDAR_COLOR_MAP.available_night : CALENDAR_COLOR_MAP.available_day;
    textColor = night ? "#e9e7ff" : "#231a12";
  } else {
    color = CALENDAR_COLOR_MAP[slot.slot_status] || CALENDAR_COLOR_MAP.blocked;
  }
  return {
    id: String(slot.slot_id),
    title: getCalendarSlotTitle(slot),
    start: slot.slot_date,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor,
    classNames: [`slot-${slot.slot_status}`, `period-${getShiftPeriod(slot)}`],
    extendedProps: { slot },
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────
function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}
function getAuthHeaders(token) {
  let helper = {};
  try { helper = typeof customerHeaders === "function" ? customerHeaders(token) : {}; } catch { /* noop */ }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(helper || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
async function requestApi(endpoint, options = {}) {
  if (typeof apiRequest === "function") return apiRequest(endpoint, options);
  const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.message || "API error");
  return payload;
}

// ─── Content normalisation ────────────────────────────────────────────────────
function resolveUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}
function versionedUploadUrl(url, version) {
  const resolvedUrl = resolveUrl(url);
  if (!resolvedUrl) return "";
  if (!resolvedUrl.includes("/uploads/homepage/")) return resolvedUrl;
  const safeVersion = version || Date.now();
  const separator = resolvedUrl.includes("?") ? "&" : "?";
  return `${resolvedUrl}${separator}v=${safeVersion}`;
}
function normalizeGalleryImages(images, version) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => img && (img.url || img.src))
    .map((img, i) => ({
      id: img.id || img.url || img.src || `g${i}`,
      url: versionedUploadUrl(img.url || img.src, version),
      alt: img.alt || img.title || `Gallery image ${i + 1}`,
    }));
}
function mergeContent(raw) {
  const inc = raw && typeof raw === "object" ? raw : {};
  const assetVersion = inc._cache_version || inc.cache_version || inc.updated_at || Date.now();

  const c = {
    hero: { ...EMPTY_HOMEPAGE_CONTENT.hero, ...(inc.hero || {}) },
    our_story: { ...EMPTY_HOMEPAGE_CONTENT.our_story, ...(inc.our_story || {}) },
    creating_experiences: { ...EMPTY_HOMEPAGE_CONTENT.creating_experiences, ...(inc.creating_experiences || {}) },
    gallery: { ...EMPTY_HOMEPAGE_CONTENT.gallery, ...(inc.gallery || {}) },
    footer: { ...EMPTY_HOMEPAGE_CONTENT.footer, ...(inc.footer || {}) },
  };

  c.hero.background_image = versionedUploadUrl(c.hero.background_image, assetVersion);
  c.creating_experiences.image = versionedUploadUrl(c.creating_experiences.image, assetVersion);
  c.creating_experiences.points = Array.isArray(c.creating_experiences.points)
    ? c.creating_experiences.points.filter(Boolean)
    : [];
  c.gallery.images = normalizeGalleryImages(c.gallery.images, assetVersion);

  return c;
}

// ─── Small brand components ───────────────────────────────────────────────────
function Crest({ size = 54 }) {
  return (
    <span className="crest" style={{ width: size, height: size }}>
      <span className="crest-crown" />
      <span className="crest-ring">
        <span className="crest-letter" style={{ fontSize: size * 0.4 }}>E</span>
      </span>
    </span>
  );
}

function Flourish() {
  return (
    <div className="rule-flourish" aria-hidden="true">
      <span className="rule-diamond" />
    </div>
  );
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function HighlightedTitle({ title }) {
  const safe = String(title || "").trim();
  if (!safe) return null;
  const words = safe.split(/\s+/);
  if (words.length === 1) return <em>{safe}</em>;
  const last = words.pop();
  return <>{words.join(" ")} <em>{last}</em></>;
}

function FooterCopyright({ text }) {
  const safe = String(text || "").trim();
  if (!safe) return null;
  const brand = "Elite Convention Hall";
  if (!safe.includes(brand)) return <>{safe}</>;
  const [before, after] = safe.split(brand);
  return <>{before}<span className="footer-gold">{brand}</span>{after}</>;
}

// ─── GalleryImage ─────────────────────────────────────────────────────────────
function GalleryImage({ url, alt }) {
  const shimmerRef = useRef(null);
  const imgRef = useRef(null);
  const doneRef = useRef(false);

  const markDone = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (shimmerRef.current) shimmerRef.current.classList.add("done");
  }, []);

  useEffect(() => {
    doneRef.current = false;
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) { markDone(); return; }
    if (img.complete && img.naturalWidth === 0) { markDone(); return; }

    const poll = setInterval(() => {
      if (imgRef.current?.complete) { markDone(); clearInterval(poll); }
    }, 80);
    const maxTimer = setTimeout(() => { markDone(); clearInterval(poll); }, 8000);

    return () => { clearInterval(poll); clearTimeout(maxTimer); };
  }, [url, markDone]);

  return (
    <div className="gallery-item">
      <img ref={imgRef} src={url} alt={alt} onLoad={markDone} onError={markDone} />
      <div ref={shimmerRef} className="gallery-shimmer" aria-hidden="true" />
      <div className="gallery-caption">{alt}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();

  const calendarRef = useRef(null);
  const slotsByDateRef = useRef({});
  const bookingCtxRef = useRef(null);
  const statsRef = useRef(null);
  const popupCloseTimer = useRef(null);
  const calendarSizeTimer = useRef(null);
  const aosObserverRef = useRef(null);

  const [content, setContent] = useState(() => {
    const cached = getCachedContent();
    return cached ? mergeContent(cached) : mergeContent(EMPTY_HOMEPAGE_CONTENT);
  });

  const [isScrolled, setIsScrolled] = useState(false);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupClosing, setPopupClosing] = useState(false);
  const [popupDate, setPopupDate] = useState("");
  const [popupSlots, setPopupSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const [counterStarted, setCounterStarted] = useState(false);
  const [counterValues, setCounterValues] = useState({ 500: 0, 1200: 0, 20: 0, 98: 0 });
  const [, setClockTick] = useState(0);

  const hero = content.hero;
  const story = content.our_story;
  const exp = content.creating_experiences;
  const gallery = content.gallery;
  const footer = content.footer;

  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => {
      const size = Math.random() * 5 + 2;
      return {
        id: i,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 16 + 10}s`,
          animationDelay: `${Math.random() * 10}s`,
          opacity: Math.random() * 0.6 + 0.2,
        },
      };
    }),
    []);

  const formattedPopupDate = useMemo(() => {
    if (!popupDate) return "Loading…";
    return new Date(`${popupDate}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }, [popupDate]);

  const galleryImages = gallery.images;

  const rerunAOS = useCallback(() => {
    aosObserverRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("aos-animate"); }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll("[data-aos]").forEach((el) => obs.observe(el));
    aosObserverRef.current = obs;
  }, []);

  useEffect(() => {
    rerunAOS();
    return () => aosObserverRef.current?.disconnect();
  }, [rerunAOS, calendarReady, content]);

  const forceCalendarResize = useCallback(() => {
    clearTimeout(calendarSizeTimer.current);
    calendarSizeTimer.current = setTimeout(() => {
      calendarRef.current?.getApi()?.updateSize();
    }, 120);
  }, []);

  const updateCountdowns = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    let needRefetch = false;
    api.getEvents().forEach((ev) => {
      const slot = ev.extendedProps?.slot;
      if (!slot || slot.slot_status !== "payment_in_progress") return;
      const exp = getSlotExpiry(slot);
      if (exp && exp <= Date.now()) { needRefetch = true; return; }
      ev.setProp("title", getCalendarSlotTitle(slot));
    });
    if (needRefetch) api.refetchEvents();
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    const localUser = lsGet(CUSTOMER_USER_KEY);
    if (!token) { setIsCustomerLoggedIn(false); return null; }
    let user = localUser;
    try {
      const data = normalizeApiData(
        await requestApi("/auth/panel", { method: "GET", headers: getAuthHeaders(token) })
      );
      user = data?.user || data?.customer || data || localUser;
      if (user && typeof user === "object") lsSet(CUSTOMER_USER_KEY, user);
    } catch { user = localUser; }
    const isCustomer = !!token && (!user || String(user?.user_type || "customer").toLowerCase() === "customer");
    setIsCustomerLoggedIn(isCustomer);
    return isCustomer ? user : null;
  }, []);

  const fetchCustomer = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    const localUser = lsGet(CUSTOMER_USER_KEY);
    if (!token) return null;
    try {
      const data = normalizeApiData(
        await requestApi("/auth/panel", { method: "GET", headers: getAuthHeaders(token) })
      );
      const user = data?.user || data?.customer || data || localUser;
      if (user && typeof user === "object") lsSet(CUSTOMER_USER_KEY, user);
      return user || localUser;
    } catch { return localUser; }
  }, []);

  const releaseHold = useCallback(async () => {
    const hold = ssGet(ACTIVE_HOLD_KEY);
    if (!hold?.booking_id || !hold?.hold_token) return;
    try {
      await requestApi("/booking-holds/release", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: hold.booking_id, hold_token: hold.hold_token }),
      });
    } catch { /* best-effort */ }
    ssDel(ACTIVE_HOLD_KEY);
  }, []);

  const loadBookingContext = useCallback(async () => {
    const data = normalizeApiData(
      await requestApi("/booking-context", { method: "GET", headers: { Accept: "application/json" } })
    );
    bookingCtxRef.current = data;
    return data;
  }, []);

  const loadSlots = useCallback(async (fetchInfo, onSuccess, onFail) => {
    try {
      const hallId = String(bookingCtxRef.current?.default_hall_id || DEFAULT_HALL_ID);
      const params = new URLSearchParams({
        hall_id: hallId,
        from: fetchInfo.startStr.slice(0, 10),
        to: fetchInfo.endStr.slice(0, 10),
      });
      const slots = normalizeApiData(
        await requestApi(`/calendar-slots?${params}`, { method: "GET", headers: { Accept: "application/json" } })
      ) || [];
      slotsByDateRef.current = slots.reduce((acc, s) => {
        (acc[s.slot_date] = acc[s.slot_date] || []).push(s);
        return acc;
      }, {});
      onSuccess(slots.map(buildSlotEvent));
    } catch (err) { onFail(err); }
  }, []);

  const closePopup = useCallback(() => {
    setPopupClosing(true);
    clearTimeout(popupCloseTimer.current);
    popupCloseTimer.current = setTimeout(() => {
      setPopupOpen(false); setPopupClosing(false);
      setPopupDate(""); setPopupSlots([]); setSelectedSlot(null);
    }, 280);
  }, []);

  const openPopup = useCallback((date, slots) => {
    clearTimeout(popupCloseTimer.current);
    setPopupDate(date); setPopupSlots(slots || []);
    setSelectedSlot(null); setPopupClosing(false); setPopupOpen(true);
  }, []);

  const handleDateClick = useCallback((info) => {
    info.jsEvent.preventDefault();
    openPopup(info.dateStr, slotsByDateRef.current[info.dateStr] || []);
  }, [openPopup]);

  const handleEventClick = useCallback((info) => {
    const slot = info.event.extendedProps?.slot;
    if (!slot) return;
    openPopup(slot.slot_date, slotsByDateRef.current[slot.slot_date] || [slot]);
  }, [openPopup]);

  const proceedWithSelected = useCallback(async () => {
    if (!selectedSlot || isProceeding) return;
    setIsProceeding(true);
    const sel = {
      ...selectedSlot,
      booking_slot_id: selectedSlot.slot_id,
      booking_date: selectedSlot.slot_date,
      booking_slot_label: formatSlotLabel(selectedSlot),
      total_amount: calcAmount(selectedSlot),
      selected_at: new Date().toISOString(),
    };
    ssSet(SELECTED_SLOT_KEY, sel);
    ssSet(BOOKING_DRAFT_KEY, {
      ...(ssGet(BOOKING_DRAFT_KEY) || {}),
      hall_id: selectedSlot.hall_id,
      booking_slot_id: selectedSlot.slot_id,
      booking_date: selectedSlot.slot_date,
      booking_slot_label: formatSlotLabel(selectedSlot),
      total_amount: calcAmount(selectedSlot),
    });
    const user = await fetchCustomer();
    if (!user) {
      setIsProceeding(false);
      navigate("/login?redirect=booking");
      return;
    }
    if (String(user.user_type || "customer").toLowerCase() !== "customer") {
      clearCustomerAuth();
      setIsCustomerLoggedIn(false);
      setIsProceeding(false);
      alert("Only customer accounts can place bookings. Please login with a customer account.");
      navigate("/login?redirect=booking");
      return;
    }
    setIsProceeding(false);
    navigate("/booking");
  }, [fetchCustomer, isProceeding, navigate, selectedSlot]);

  const handleLogout = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    try {
      if (token) await requestApi("/auth/logout", {
        method: "POST", headers: getAuthHeaders(token), body: JSON.stringify({}),
      });
    } catch { /* noop */ }
    await releaseHold();
    clearCustomerAuth();
    clearBookingSession();
    setIsCustomerLoggedIn(false);
    navigate("/", { replace: true });
  }, [navigate, releaseHold]);

  useEffect(() => {
    let mounted = true;
    // Calendar only needs its own /calendar-slots fetch, so mount it immediately
    // instead of waiting on content/auth/booking-context to all settle first.
    setCalendarReady(true);

    requestApi(`/homepage-content?t=${Date.now()}`, {
      method: "GET", headers: { Accept: "application/json" },
    }).then((raw0) => {
      if (!mounted) return;
      const raw = normalizeApiData(raw0);
      const merged = mergeContent(raw);
      setContent(merged);
      setCachedContent(raw);
    }).catch(() => {});

    refreshAuth();
    loadBookingContext().catch(console.error);

    return () => { mounted = false; };
  }, [loadBookingContext, refreshAuth]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", forceCalendarResize, { passive: true });
    const cdId = setInterval(() => { updateCountdowns(); setClockTick((v) => v + 1); }, 1000);
    const rfId = setInterval(() => {
      const api = calendarRef.current?.getApi();
      if (api) { api.refetchEvents(); forceCalendarResize(); }
    }, 15_000);
    return () => {
      window.removeEventListener("resize", forceCalendarResize);
      clearInterval(cdId);
      clearInterval(rfId);
      clearTimeout(calendarSizeTimer.current);
      clearTimeout(popupCloseTimer.current);
    };
  }, [forceCalendarResize, updateCountdowns]);

  useEffect(() => {
    if (!popupOpen) return;
    const fn = (e) => { if (e.key === "Escape") closePopup(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [closePopup, popupOpen]);

  useEffect(() => {
    if (counterStarted || !statsRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setCounterStarted(true);
        const frames = 60; let frame = 0;
        const tid = setInterval(() => {
          frame++;
          setCounterValues({
            500: Math.min(500, Math.floor(500 / frames * frame)),
            1200: Math.min(1200, Math.floor(1200 / frames * frame)),
            20: Math.min(20, Math.floor(20 / frames * frame)),
            98: Math.min(98, Math.floor(98 / frames * frame)),
          });
          if (frame >= frames) clearInterval(tid);
        }, 1500 / frames);
        obs.disconnect();
      },
      { threshold: 0.35 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [counterStarted]);

  return (
    <>
      <style>{homePageStyles}</style>

      {/* ── Navbar ── */}
      <div className={`nav-shell${isScrolled ? " scrolled" : ""}`}>
        <div className="nav-pill">
          <a href="#top" className="logo-mark" aria-label="Elite Convention Hall Home">
            <Crest size={38} />
            <span className="word">ELITE <b>CONVENTION HALL</b></span>
          </a>
          <div className="nav-links">
            <a href="#calendar-booking">Calendar</a>
            <a href="#about">About</a>
            <a href="#gallery">Gallery</a>
            <a href="#features">Features</a>
            <a href="#calendar-booking" className="btn nav-cta" style={{ padding: "10px 20px" }}>Book Now</a>
            {isCustomerLoggedIn ? (
              <>
                <Link
                  to="/customer-panel"
                  className="profile-icon-link"
                  title="My Profile"
                  aria-label="My Profile"
                  style={{ display: "inline-flex" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="login-link" style={{ padding: "10px 20px", borderRadius: "100px" }}>
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="hero-split" id="top">
        <div className="hero-left">
          <div className="hero-kicker">
            <Crest size={46} />
            <span className="txt">Elite Convention Hall</span>
          </div>
          <h1>
            {hero.title}
            <span>{hero.highlight}</span>
          </h1>
          <p>{hero.subtitle}</p>
          <div className="hero-actions">
            <a href={hero.primary_button_link || "#calendar-booking"} className="btn">
              {hero.primary_button_text}
            </a>
            <a href={hero.secondary_button_link || "#about"} className="btn btn-outline">
              {hero.secondary_button_text}
            </a>
          </div>
        </div>

        <div className="hero-right">
          <div
            className="hero-bg"
            style={hero.background_image ? { backgroundImage: `url(${hero.background_image})` } : undefined}
          />
          <div className="hero-particles">
            {particles.map((p) => <div key={p.id} className="particle" style={p.style} />)}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="stats-band" id="stats" ref={statsRef}>
        <div className="container">
          <div className="stats-inner">
            {STATS.map((item) => (
              <div className="stat-item" data-aos="fade-up" data-aos-delay={item.delay || undefined} key={item.label}>
                <span className="stat-number">{counterStarted ? `${counterValues[item.count]}+` : "0"}</span>
                <span className="stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar ── */}
      <section className="calendar-section" id="calendar-booking">
        <div className="container">
          <div className="section-title" data-aos="fade-up">
            <span className="section-eyebrow">Live Availability</span>
            <h2>Day &amp; Night Booking Calendar</h2>
            <p>
              Every date shows ☀️ Day and 🌙 Night shift availability in real time.
              Click any date or shift to view details and reserve instantly.
            </p>
          </div>

          <div className="daynight-toggle-row" data-aos="fade-up">
            <span className="dn-chip day">☀️ Day Shifts</span>
            <span className="dn-chip night">🌙 Night Shifts</span>
          </div>

          <div className="calendar-jewel" data-aos="zoom-in">
            <span className="corner tl" /><span className="corner tr" />
            <span className="corner bl" /><span className="corner br" />
            <div id="calendar">
              {calendarReady ? (
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  height="auto"
                  navLinks
                  editable={false}
                  selectable
                  dayMaxEvents
                  handleWindowResize
                  windowResizeDelay={150}
                  expandRows
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,listYear",
                  }}
                  buttonText={{ today: "Today", month: "Month", listYear: "Year View" }}
                  events={loadSlots}
                  viewDidMount={forceCalendarResize}
                  datesSet={forceCalendarResize}
                  eventsSet={forceCalendarResize}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                />
              ) : (
                <div className="calendar-loading">✦ Loading booking calendar…</div>
              )}
            </div>
          </div>

          <div className="calendar-legend" data-aos="fade-up">
            {LEGEND_ITEMS.map(({ color, label, icon }) => (
              <div className="legend-item" key={label}>
                <span>{icon}</span>
                <div className="legend-dot" style={{ background: color, color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="section-title" data-aos="fade-up">
            <span className="section-eyebrow">{story.eyebrow}</span>
            <h2>{story.title}</h2>
            <p>{story.description}</p>
          </div>
          <div className="about-wrapper">
            <div className="about-img-wrap" data-aos="fade-right">
              <div className="about-img-deco" />
              {exp.image && (
                <img className="arch" src={exp.image} alt={exp.image_alt || story.title || "Elite Convention Hall"} loading="lazy" decoding="async" />
              )}
            </div>
            <div className="about-text" data-aos="fade-left">
              <span className="section-eyebrow" style={{ display: "flex" }}>{exp.eyebrow}</span>
              <h3><HighlightedTitle title={exp.title} /></h3>
              <p>{exp.description_1}</p>
              <p>{exp.description_2}</p>
              <div className="about-checklist">
                {exp.points.map((f, i) => (
                  <div className="row" key={`${f}-${i}`}>
                    <span className="tick">✓</span>{f}
                  </div>
                ))}
              </div>
              <br />
              <a href="#calendar-booking" className="btn" style={{ marginTop: "10px" }}>Book a Visit</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section id="gallery" className="gallery-section">
        <div className="container">
          <div className="section-title" data-aos="fade-up">
            <span className="section-eyebrow">{gallery.eyebrow}</span>
            <h2>{gallery.title}</h2>
            <p>{gallery.description}</p>
          </div>
          {galleryImages.length > 0 && (
            <div className="gallery-carousel">
              <div className="gallery-track">
                {[...galleryImages, ...galleryImages].map((img, i) => (
                  <GalleryImage key={`${img.id || img.url}-${i}`} url={img.url} alt={img.alt} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-title" data-aos="fade-up">
            <span className="section-eyebrow">Why Choose Us</span>
            <h2>World-Class Features</h2>
            <p>Smart booking system with a live Day/Night calendar and secure payments — designed for a seamless experience.</p>
          </div>
          <div className="feature-grid">
            {FEATURE_CARDS.map((f) => (
              <div className="feature-card" data-aos="zoom-in" data-aos-delay={f.delay || undefined} key={f.title}>
                <div className="feature-shield">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="booking-cta">
        <div className="container" data-aos="zoom-in">
          <Crest size={64} />
          <h2>Plan Your <em>Dream Event</em> Today</h2>
          <p>
            Make your celebrations unforgettable with Elite Convention Hall&apos;s premium
            event management services. Your perfect event begins with a single click.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <a href="#calendar-booking" className="btn">Check Availability</a>
            <a href="tel:+8801700000000" className="btn btn-dark">Contact Us</a>
          </div>
        </div>
      </section>

      {/* ── Popup ── */}
      {popupOpen && (
        <div
          id="popup"
          className={`popup active${popupClosing ? " closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="popupTitle"
          onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
          <div className="popup-box">
            <div className="popup-header">
              <button type="button" className="popup-close" onClick={closePopup} aria-label="Close">✕</button>
              <div className="popup-header-content">
                <h3 id="popupTitle">Select Your Shift</h3>
                <div className="popup-date-badge">
                  <span>📅</span>
                  <span>{formattedPopupDate}</span>
                </div>
              </div>
            </div>

            <div className="popup-body">
              <p className="popup-subtitle">Available Shifts</p>
              {popupSlots.length > 0 ? (
                <div className="slot-radio-group">
                  {popupSlots.map((slot) => {
                    const ok = slot.slot_status === "available";
                    const amount = calcAmount(slot);
                    const badge = getStatusBadge(slot.slot_status);
                    const id = `slot_radio_${slot.slot_id}`;
                    const period = getShiftPeriod(slot);
                    return (
                      <div className="slot-radio-item" key={slot.slot_id}>
                        <input
                          type="radio"
                          name="slotChoice"
                          id={id}
                          value={slot.slot_id}
                          disabled={!ok}
                          checked={String(selectedSlot?.slot_id || "") === String(slot.slot_id)}
                          onChange={() => setSelectedSlot(slot)}
                        />
                        <label htmlFor={id} className={`slot-radio-label${!ok ? " disabled" : ""}`}>
                          <div className="slot-radio-custom" />
                          <div className="slot-info">
                            <div className="slot-name">
                              <span>{period === "night" ? "🌙" : "☀️"}</span>
                              {slot.shift_name}
                            </div>
                            <div className="slot-time">⏰ {slot.start_time} – {slot.end_time}</div>
                            {slot.slot_status === "payment_in_progress" && (
                              <div className="slot-time" style={{ color: "var(--copper)" }}>
                                Expires in: {getRemainingText(slot)}
                              </div>
                            )}
                            {amount > 0 && <div className="slot-price">৳ {Number(amount).toLocaleString()}</div>}
                          </div>
                          <span className={`slot-status-badge ${badge.cls}`}>{badge.label}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="slot-radio-group">
                  <div className="popup-empty">
                    <div className="popup-empty-icon">📭</div>
                    <p>No slot data available for this date yet.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="popup-footer">
              <button
                type="button"
                className={`btn popup-proceed-btn${isProceeding ? " loading" : ""}`}
                onClick={proceedWithSelected}
                disabled={!selectedSlot || isProceeding}
                style={{ opacity: selectedSlot ? 1 : 0.5, cursor: selectedSlot ? "pointer" : "not-allowed" }}
              >
                {isProceeding ? "Checking login…" : "Continue to Booking →"}
              </button>
              <button type="button" className="btn popup-close-btn" onClick={closePopup}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="logo-mark">
                <Crest size={44} />
                <span className="word">ELITE <b>CONVENTION HALL</b></span>
              </span>
              <p>{footer.description}</p>
            </div>
            <div className="footer-col">
              <h4>Quick Links</h4>
              <a href="#calendar-booking">Booking Calendar</a>
              <a href="#about">About Us</a>
              <a href="#gallery">Gallery</a>
              <a href="#features">Features</a>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <p>📍 {footer.address}</p>
              <p>📞 {footer.phone}</p>
              <p>✉️ {footer.email}</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p><FooterCopyright text={footer.copyright} /></p>
            <p>{footer.tagline}</p>
          </div>
        </div>
      </footer>
    </>
  );
}