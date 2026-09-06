import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SELECTED_SLOT_KEY = "dlc_selected_slot_v2";
const BOOKING_DRAFT_KEY = "dlc_booking_draft_v2";
const ACTIVE_HOLD_KEY = "dlc_active_hold_v2";
const PENDING_CONFIRMATION_KEY = "dlc_booking_pending_v1";

// ─── Styles ───────────────────────────────────────────────────────────────────
// Brand system (identical tokens to HomePage): warm ivory/champagne canvas,
// gold-foil accents, espresso used only as a small accent (nav-on-scroll,
// jewel vault banner, card face, footer). Concept for this page: "The Golden
// Ledger" — a flip-able gold membership card.
const paymentPageStyles = `
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

    --text:         #2b2318;
    --text-soft:    #5b4f3d;
    --text-mute:    #8a7d68;
    --success:      #6d7a2e;
    --danger:       #9c3348;
    --cream-text:   #f8f1dd;

    --radius: 16px;
    --radius-lg: 26px;
    --shadow-sm: 0 4px 18px rgba(80,60,20,0.08);
    --shadow-md: 0 16px 44px rgba(80,60,20,0.12);
    --shadow-lg: 0 30px 80px rgba(40,28,10,0.18);
    --shadow-gold: 0 12px 32px rgba(184,135,58,0.28);
    --transition: 0.35s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body {
    font-family:'Poppins', sans-serif;
    background:
      radial-gradient(circle at 12% 6%, rgba(184,135,58,0.07), transparent 40%),
      radial-gradient(circle at 90% 96%, rgba(184,135,58,0.06), transparent 46%),
      var(--paper);
    color: var(--text);
    overflow-x:hidden;
  }
  a { text-decoration:none; color:inherit; }
  .container { width:90%; max-width:1200px; margin:auto; position:relative; z-index:1; }
  ::-webkit-scrollbar { width:8px; }
  ::-webkit-scrollbar-track { background: var(--paper-deep); }
  ::-webkit-scrollbar-thumb { background: linear-gradient(var(--gold-bright), var(--gold-deep)); border-radius:10px; }
  .serif { font-family:'Cormorant Garamond',serif; }

  [data-aos] { opacity:0; transition:opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1), filter .9s ease; }
  [data-aos-delay="150"] { transition-delay:.15s; }
  [data-aos="fade-up"]    { transform:translateY(35px); filter:blur(3px); }
  [data-aos="fade-right"] { transform:translateX(-35px); filter:blur(3px); }
  [data-aos="fade-left"]  { transform:translateX(35px); filter:blur(3px); }
  [data-aos].aos-animate  { opacity:1; transform:none; filter:blur(0); }

  @keyframes heroZoom { from{transform:scale(1.06)} to{transform:scale(1.12)} }
  @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-25px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideUp { from{opacity:0;transform:translateY(35px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cardSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:translateY(-50%) rotate(360deg)} }
  @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(184,135,58,.45)} 50%{box-shadow:0 0 0 9px rgba(184,135,58,0)} }
  @keyframes shimmerGold { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes sweep { from{transform:translateX(0) skewX(-20deg)} to{transform:translateX(360%) skewX(-20deg)} }
  @keyframes crownGlow { 0%,100%{filter:drop-shadow(0 0 2px rgba(232,199,102,.5))} 50%{filter:drop-shadow(0 0 8px rgba(232,199,102,.9))} }
  @keyframes cardSheen { 0%{transform:translateX(-120%) rotate(8deg)} 100%{transform:translateX(220%) rotate(8deg)} }
  @keyframes dangerPulse { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes popIn { from{opacity:0; transform:scale(.9)} to{opacity:1; transform:scale(1)} }
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes sparkle { 0%{transform:translateY(100vh) scale(.3);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-10vh) scale(1);opacity:0} }

  /* ═══ CREST ═══ */
  .crest { position:relative; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  .crest .crest-ring {
    width:100%; height:100%; border-radius:50%; border:2px solid var(--gold); background:var(--ivory);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 0 0 4px var(--paper), var(--shadow-gold);
  }
  .crest .crest-letter {
    font-family:'Cormorant Garamond',serif; font-weight:800;
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-bright));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .crest .crest-crown {
    position:absolute; top:-13px; left:50%; transform:translateX(-50%); width:60%; height:14px;
    clip-path: polygon(0% 100%, 0% 40%, 20% 100%, 30% 20%, 50% 100%, 70% 20%, 80% 100%, 100% 40%, 100% 100%);
    background: linear-gradient(180deg,var(--gold-bright),var(--gold-deep)); animation: crownGlow 3s ease infinite;
  }

  /* ═══ NAVBAR — floating pill ═══ */
  .nav-shell { position:fixed; top:20px; left:0; right:0; z-index:1000; display:flex; justify-content:center; padding:0 18px; transition:var(--transition); }
  .nav-shell.scrolled { top:10px; }
  .nav-pill {
    width:100%; max-width:1200px; display:flex; align-items:center; justify-content:space-between;
    background:rgba(255,253,247,0.78); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid var(--line); border-radius:100px; padding:10px 14px 10px 22px;
    box-shadow: var(--shadow-sm); transition: var(--transition);
  }
  .nav-shell.scrolled .nav-pill { background:rgba(255,253,247,0.96); box-shadow:var(--shadow-md); border-color:var(--gold-mid); }
  .logo-mark { display:flex; align-items:center; gap:10px; }
  .logo-mark .crest { width:38px; height:38px; }
  .logo-mark .crest-letter { font-size:16px; }
  .logo-mark .word { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:16px; letter-spacing:1.5px; color:var(--espresso); }
  .logo-mark .word b { color: var(--gold-deep); }

  .nav-links { display:flex; gap:4px; align-items:center; }
  .nav-links a { font-size:13px; font-weight:500; color:var(--text-soft); padding:9px 16px; border-radius:100px; transition:var(--transition); }
  .nav-links a:not(.nav-back):hover { color:var(--gold-deep); background:var(--gold-pale); }
  .nav-back {
    display:inline-flex; align-items:center; gap:7px;
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid),var(--gold-bright),var(--gold-mid));
    background-size:250% auto; color:var(--ivory) !important; font-weight:700 !important;
    padding:9px 20px; border-radius:100px; box-shadow: var(--shadow-gold);
    transition: var(--transition), background-position .6s ease;
  }
  .nav-back:hover { background-position:right center; transform:translateX(-3px); }

  /* ═══ PAGE HERO ═══ */
  .page-hero {
    min-height:48vh; padding-top:130px; position:relative; overflow:hidden;
    display:flex; align-items:center; text-align:center; color:white;
  }
  .page-hero-bg {
    position:absolute; inset:0; background:url('/assets/img/BG-01.jpeg') center/cover no-repeat;
    transform:scale(1.06); animation: heroZoom 18s ease-in-out infinite alternate; filter: grayscale(.1);
  }
  .page-hero-overlay {
    position:absolute; inset:0;
    background: linear-gradient(135deg, rgba(35,26,18,0.86) 0%, rgba(184,135,58,0.22) 50%, rgba(35,26,18,0.9) 100%);
  }
  .page-hero .container { position:relative; z-index:2; }
  .hero-eyebrow {
    display:inline-flex; align-items:center; gap:8px; background:rgba(232,199,102,0.16);
    border:1px solid rgba(232,199,102,0.4); color:var(--gold-bright); padding:7px 20px; border-radius:100px;
    font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; margin-bottom:22px;
    backdrop-filter: blur(8px); animation: fadeSlideDown .9s ease both;
  }
  .hero-eyebrow svg { width:14px; height:14px; stroke-width:2; }
  .page-hero h1 {
    font-family:'Cormorant Garamond',serif; font-size:clamp(34px,6vw,58px); font-weight:700;
    margin-bottom:16px; line-height:1.15; animation: fadeSlideUp .9s ease .15s both;
  }
  .page-hero h1 span {
    font-style: italic;
    background: linear-gradient(110deg,var(--gold-deep) 0%,var(--gold-bright) 30%,var(--gold-mid) 55%,var(--gold-bright) 80%,var(--gold-deep) 100%);
    background-size:250% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    animation: shimmerGold 6s linear infinite;
  }
  .page-hero p {
    max-width:680px; margin:0 auto; color:rgba(248,241,221,0.82); line-height:1.85; font-size:16px;
    animation: fadeSlideUp .9s ease .3s both;
  }

  .hero-steps { display:flex; justify-content:center; gap:0; margin-top:36px; animation:fadeSlideUp .9s ease .45s both; flex-wrap:wrap; }
  .hero-step { display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600; color:rgba(248,241,221,0.5); }
  .hero-step.active { color:white; }
  .hero-step.done { color:var(--gold-bright); }
  .hero-step-num {
    width:34px;height:34px; border-radius:50%; border:2px solid rgba(248,241,221,0.25);
    display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700;
    transition:var(--transition); flex-shrink:0;
  }
  .hero-step.done .hero-step-num { background: var(--gold-bright); border-color:var(--gold-bright); color:var(--espresso); }
  .hero-step.active .hero-step-num {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid)); border-color:var(--gold-mid); color:white;
    box-shadow: 0 0 0 4px rgba(184,135,58,0.28); animation: ringPulse 2.2s ease infinite;
  }
  .hero-step-line { width:60px; height:2px; background:rgba(248,241,221,0.18); margin:0 6px; align-self:center; }
  .hero-step-line.done { background: rgba(232,199,102,0.5); }

  /* ═══ MAIN FLOATING PARTICLES (subtle gold dust) ═══ */
  .gold-dust { position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
  .gold-dust span { position:absolute; border-radius:50%; background: radial-gradient(circle,var(--gold-bright),var(--gold) 60%,transparent 70%); animation: sparkle linear infinite; }

  /* ═══ FORM SECTION ═══ */
  .form-page-section { background: var(--paper); padding: 60px 0 100px; position:relative; z-index:1; }

  /* ═══ TIMER — Wax Seal Medallion ribbon ═══ */
  .timer-banner {
    background: linear-gradient(120deg, var(--espresso) 0%, var(--espresso-2) 100%);
    border: 1px solid rgba(232,199,102,0.28);
    border-radius: var(--radius-lg);
    padding: 16px 26px;
    display: flex; align-items: center; gap: 20px;
    margin: 0 auto; animation: cardSlideUp 0.5s ease both;
    width: 100%; max-width: 1100px;
    box-shadow: var(--shadow-md);
    position: relative; overflow: hidden;
  }
  .timer-banner::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background: linear-gradient(90deg, transparent, var(--gold-bright), transparent);
  }

  .seal-wrap { position:relative; width:64px; height:64px; flex-shrink:0; }
  .seal-wrap svg.ring-svg { transform: rotate(-90deg); width:64px; height:64px; }
  .seal-track { fill:none; stroke: rgba(255,255,255,0.08); stroke-width:5; }
  .seal-fill { fill:none; stroke-width:5; stroke-linecap:round; stroke: url(#sealGradient); transition: stroke-dashoffset 1s linear; }
  .seal-wrap.pulse .seal-fill { animation: ringPulse 2s ease infinite; }
  .seal-core {
    position:absolute; inset:8px; border-radius:50%;
    background: conic-gradient(from 0deg, var(--gold-deep), var(--gold-bright), var(--gold-deep));
    display:flex; align-items:center; justify-content:center;
  }
  .seal-core::before { content:''; position:absolute; inset:3px; border-radius:50%; background: var(--espresso); }
  .seal-core svg { position:relative; z-index:1; width:18px; height:18px; stroke-width:2; color: var(--gold-bright); }
  .seal-wrap.expiring .seal-core svg { color: #ff9d9d; animation: dangerPulse 1s ease infinite; }

  .timer-text { flex: 1; }
  .timer-text p { font-size: 12.5px; color: rgba(248,241,221,0.6); margin-bottom: 3px; letter-spacing: .3px; }
  .timer-text strong { font-size: 15px; color: var(--gold-bright); font-weight: 700; font-family:'Cormorant Garamond',serif; letter-spacing: .5px; }

  .payment-countdown {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 800; color: var(--gold-bright);
    font-variant-numeric: tabular-nums; letter-spacing: 1px; min-width: 100px; text-align: right; flex-shrink: 0;
    background: rgba(232,199,102,0.08); border: 1px solid rgba(232,199,102,0.25); padding: 6px 16px; border-radius: 12px;
  }
  .payment-countdown.expiring { color: #ff9d9d; border-color: rgba(156,51,72,0.4); animation: dangerPulse 1s ease infinite; }

  /* ═══ LAYOUT ═══ */
  .payment-layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 32px; align-items: start; max-width: 1100px; margin: 30px auto 0; }

  .form-card { background:var(--ivory); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow:hidden; border:1px solid var(--line); animation: cardSlideUp .7s ease both; }
  .form-card-header {
    background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%);
    padding: 28px 35px; position:relative; overflow:hidden;
  }
  .form-card-header::before { content:''; position:absolute; top:-50px; right:-50px; width:180px;height:180px; background:rgba(255,255,255,0.14); border-radius:50%; }
  .form-card-header::after { content:''; position:absolute; bottom:-70px; left:-40px; width:160px;height:160px; background:rgba(255,255,255,0.08); border-radius:50%; }
  .form-card-header h2 { font-family:'Cormorant Garamond',serif; font-size:23px; font-weight:700; color:var(--espresso); position:relative; z-index:1; margin-bottom:5px; }
  .form-card-header p { color:rgba(35,26,18,0.72); font-size:13.5px; position:relative; z-index:1; }
  .form-card-body { padding:35px; }

  /* ═══ THE VAULT CARD — 3D tilt + flip, foil-embossed ═══ */
  .card-stage { perspective: 1400px; margin-bottom: 34px; display: flex; justify-content: center; }
  .card-3d {
    width:100%; max-width: 380px; height: 216px; position:relative; transform-style: preserve-3d;
    transition: transform .18s ease-out;
  }
  .card-face {
    position:absolute; inset:0; border-radius:20px; backface-visibility:hidden;
    box-shadow: 0 24px 60px rgba(35,26,18,0.4), inset 0 0 0 1px rgba(232,199,102,0.25);
    padding:26px 28px; overflow:hidden;
  }
  .card-face.front {
    background:
      radial-gradient(circle at 85% 15%, rgba(232,199,102,0.18), transparent 55%),
      linear-gradient(135deg, var(--espresso) 0%, #35271a 45%, var(--gold-deep) 100%);
  }
  .card-face.back {
    background: linear-gradient(135deg, #2b2013 0%, var(--espresso) 100%);
    transform: rotateY(180deg);
    display:flex; flex-direction:column; justify-content:flex-start;
  }
  .card-sheen {
    position: absolute; top:-40%; left:-20%; width:60%; height:180%;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.14), transparent);
    animation: cardSheen 3.6s ease infinite; pointer-events:none;
  }
  .card-crest-watermark {
    position: absolute; right: -18px; bottom: -18px; width: 130px; height: 130px; opacity: 0.14;
    border-radius: 50%; border: 6px solid var(--gold-bright); display: flex; align-items: center; justify-content: center;
  }
  .card-crest-watermark span {
    font-family: 'Cormorant Garamond', serif; font-weight: 800; font-size: 62px; color: var(--gold-bright);
  }
  .card-top-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .card-top-row svg { width: 22px; height: 22px; stroke-width: 1.8; color: var(--gold-bright); flex-shrink: 0; }
  .card-brand-tag {
    font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--gold-bright); text-transform: uppercase;
  }
  .card-chip {
    width: 44px; height: 34px;
    background: linear-gradient(135deg, var(--gold-bright), var(--gold-deep));
    border-radius: 8px; margin: 16px 0 20px; position: relative; z-index: 1;
    display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 5px; overflow: hidden;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .card-chip-line { background: rgba(0,0,0,0.22); border-radius: 2px; }
  .card-chip-line:first-child { grid-column: 1/-1; }

  .card-number-display {
    font-size: 19px; font-weight: 600; letter-spacing: 4px; color: rgba(248,241,221,0.94);
    font-family: 'Courier New', monospace; margin-bottom: 20px; position: relative; z-index: 1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  .card-bottom { display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; gap: 12px; }
  .card-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(232,199,102,0.6); margin-bottom: 3px; }
  .card-value {
    font-size: 14px; font-weight: 700; color: rgba(248,241,221,0.92); letter-spacing: 0.5px;
    max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  .card-magstripe { height:42px; background:#150f09; margin: 4px -28px 20px; }
  .card-signature-row { display:flex; gap:14px; align-items:center; position:relative; z-index:1; padding:0 2px; }
  .card-signature { flex:1; height:34px; background: repeating-linear-gradient(45deg, rgba(232,199,102,0.08) 0 6px, transparent 6px 12px); border-radius:6px; display:flex; align-items:center; justify-content:flex-end; padding-right:10px; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:13px; color: rgba(248,241,221,0.55); }
  .card-cvv-box { width:56px; height:34px; background:var(--ivory); border-radius:6px; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-weight:700; font-size:14px; color:var(--espresso); letter-spacing:2px; }
  .card-back-note { margin-top:18px; font-size:10.5px; color:rgba(248,241,221,0.4); line-height:1.7; position:relative; z-index:1; }

  .form-section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--gold-deep);
    margin-bottom: 16px; margin-top: 28px; display: flex; align-items: center; gap: 10px;
  }
  .form-section-label:first-of-type { margin-top: 0; }
  .form-section-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* ═══ Floating-label fields (paper style) ═══ */
  .field { position: relative; margin-bottom: 20px; }
  .field:last-child { margin-bottom: 0; }
  .field-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-mute); pointer-events: none; transition: var(--transition); z-index: 2; }
  .field-icon svg { width: 16px; height: 16px; stroke-width: 2; }
  .field.textarea-field .field-icon { top: 18px; transform: none; }

  .field input, .field textarea {
    width: 100%; padding: 21px 16px 9px 44px; border: 1.5px solid var(--line); border-radius: 12px; outline: none;
    font-size: 14.5px; font-family: 'Poppins', sans-serif; color: var(--text); background: var(--paper-deep);
    transition: var(--transition); appearance: none; -webkit-appearance: none;
  }
  .field textarea { resize: vertical; min-height: 90px; padding-top: 28px; }
  .field label {
    position: absolute; left: 44px; top: 17px; font-size: 14px; color: var(--text-mute); pointer-events: none;
    transition: var(--transition); transform-origin: left top;
  }
  .field.textarea-field label { top: 19px; }
  .field input:focus, .field textarea:focus {
    border-color: var(--gold-mid); background: var(--gold-pale); box-shadow: 0 0 0 3px rgba(184,135,58,0.14);
  }
  .field input:focus + .field-icon, .field textarea:focus + .field-icon { color: var(--gold-deep); }
  .field input:focus ~ label,
  .field input:not(:placeholder-shown) ~ label,
  .field textarea:focus ~ label,
  .field textarea:not(:placeholder-shown) ~ label {
    top: 6px; font-size: 10.5px; color: var(--gold-deep); letter-spacing: .5px; font-weight: 700; text-transform: uppercase;
  }
  .field.textarea-field input:focus ~ label,
  .field.textarea-field textarea:focus ~ label,
  .field.textarea-field textarea:not(:placeholder-shown) ~ label { top: 8px; }

  .cvv-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none;
    cursor: pointer; color: var(--text-mute); z-index: 2; transition: var(--transition); padding: 4px;
  }
  .cvv-toggle:hover { color: var(--gold-deep); }
  .cvv-toggle svg { width: 16px; height: 16px; stroke-width: 2; }

  .security-row {
    display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 10px 14px;
    background: var(--gold-pale); border: 1px solid var(--gold-mid); border-radius: 10px;
  }
  .security-row svg { width: 15px; height: 15px; stroke-width: 2; color: var(--gold-deep); flex-shrink: 0; }
  .security-row span { font-size: 12px; color: var(--gold-deep); font-weight: 600; }

  .form-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 28px; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid),var(--gold-bright));
    background-size: 220% auto; color: var(--ivory); padding: 15px 32px; border-radius: 50px;
    font-weight: 700; font-size: 15px; font-family: 'Poppins', sans-serif;
    transition: var(--transition), background-position .6s ease; cursor: pointer; border: none;
    position: relative; overflow: hidden; letter-spacing: 0.3px; text-align: center;
    box-shadow: var(--shadow-gold);
  }
  .btn svg { width: 18px; height: 18px; stroke-width: 2.2; flex-shrink: 0; }
  .btn::before { content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(120deg,transparent,rgba(255,255,255,.55),transparent); transform: skewX(-20deg); }
  .btn:hover::before { animation: sweep .9s ease; }
  .btn:hover { background-position: right center; transform: translateY(-3px); box-shadow: 0 18px 40px rgba(184,135,58,0.35); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

  .btn-secondary { background: transparent; color: var(--text-mute); border: 1.5px solid var(--line); box-shadow: none; }
  .btn-secondary:hover { background: var(--paper-deep); border-color: var(--gold-mid); color: var(--text); transform: translateY(-2px); box-shadow: var(--shadow-sm); }

  .btn.loading { pointer-events: none; opacity: 0.88; padding-right: 52px; }
  .btn.loading::after {
    content: ''; position: absolute; right: 18px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.6); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
  }

  .booking-message { display:flex; align-items:center; gap:10px; min-height: 0; font-size: 13.5px; font-weight: 600; text-align: left; transition: var(--transition); border-radius: 10px; white-space: pre-line; animation: popIn .35s ease; }
  .booking-message:not(:empty) { padding: 12px 16px; margin-top: 4px; }
  .booking-message.success { color: var(--success); background: rgba(109,122,46,0.1); border: 1px solid rgba(109,122,46,0.25); }
  .booking-message.error { color: var(--danger); background: rgba(156,51,72,0.08); border: 1px solid rgba(156,51,72,0.22); }

  /* ═══ SIDEBAR ═══ */
  .sidebar { display: flex; flex-direction: column; gap: 20px; }

  .summary-card { background: var(--ivory); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); overflow: hidden; border: 1px solid var(--line); animation: cardSlideUp .7s ease .15s both; }
  .summary-card-header {
    background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%);
    padding: 20px 24px; position: relative; overflow: hidden;
  }
  .summary-card-header::before { content: ''; position: absolute; right: -20px; top: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.15); border-radius: 50%; }
  .summary-card-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 700; color: var(--espresso); position: relative; z-index: 1; }
  .summary-card-header p { font-size: 12px; color: rgba(35,26,18,0.68); position: relative; z-index: 1; margin-top: 3px; }
  .summary-card-body { padding: 22px 24px; }

  .summary-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--paper-deep); gap: 12px; }
  .summary-row:last-child { border-bottom: none; padding-bottom: 0; }
  .summary-label { font-size: 12.5px; color: var(--text-mute); font-weight: 500; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
  .summary-label svg { width: 13px; height: 13px; stroke-width: 2; }
  .summary-value { font-size: 13px; font-weight: 700; color: var(--text); text-align: right; }

  .summary-amount-box { background: var(--gold-pale); border: 1px solid var(--gold-mid); border-radius: 12px; padding: 16px; text-align: center; margin-top: 16px; }
  .summary-amount-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--gold-deep); font-weight: 600; margin-bottom: 4px; }
  .summary-amount-value { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 800; color: var(--gold-deep); line-height: 1; }

  .trust-card { background: var(--ivory); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: 24px; border: 1px solid var(--line); animation: cardSlideUp .7s ease .3s both; }
  .trust-card h4, .help-card h4 {
    font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 700; color: var(--text);
    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  }
  .trust-card h4 svg, .help-card h4 svg { width: 16px; height: 16px; color: var(--gold-deep); stroke-width: 2; }

  .trust-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--paper-deep); }
  .trust-item:last-child { border-bottom: none; }
  .trust-item-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: conic-gradient(from 0deg, var(--gold-pale), var(--gold-mid), var(--gold-pale));
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative;
  }
  .trust-item-icon::before { content: ''; position: absolute; inset: 2px; border-radius: 50%; background: var(--ivory); }
  .trust-item-icon svg { position: relative; z-index: 1; width: 16px; height: 16px; stroke-width: 2; color: var(--gold-deep); }
  .trust-item-text { flex: 1; }
  .trust-item-text strong { font-size: 13px; color: var(--text); font-weight: 700; display: block; margin-bottom: 2px; }
  .trust-item-text span { font-size: 12px; color: var(--text-mute); line-height: 1.5; }

  .help-card { background: var(--ivory); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--line); animation: cardSlideUp .7s ease .45s both; }
  .help-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--paper-deep); font-size: 13px; color: var(--text-mute); line-height: 1.6; }
  .help-item:last-child { border-bottom: none; }
  .help-item-num {
    width: 22px; height: 22px; background: var(--gold-pale); border: 1px solid var(--gold-mid); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--gold-deep);
    flex-shrink: 0; margin-top: 1px;
  }

  /* ═══ FOOTER — espresso accent band ═══ */
  footer { background: linear-gradient(160deg,var(--espresso),var(--espresso-2)); color: var(--cream-text); padding: 55px 0 35px; position: relative; }
  footer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,var(--gold-bright),transparent); }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; padding-bottom: 30px; border-bottom: 1px solid rgba(232,199,102,0.15); margin-bottom: 28px; }
  .footer-brand .logo-mark .word { color: var(--cream-text); }
  .footer-brand .logo-mark .word b { color: var(--gold-bright); }
  .footer-brand p { font-size: 13px; color: rgba(248,241,221,0.55); margin-top: 8px; }
  .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
  .footer-links a { font-size: 13px; color: rgba(248,241,221,0.6); transition: var(--transition); }
  .footer-links a:hover { color: var(--gold-bright); }
  .footer-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .footer-bottom p { font-size: 13px; color: rgba(248,241,221,0.4); }
  .footer-gold { color: var(--gold-bright); }

  @media(max-width: 992px) {
    .payment-layout { grid-template-columns: 1fr; }
    .sidebar { order: -1; }
  }
  @media(max-width: 768px) {
    .nav-links a:not(.nav-back) { display: none; }
    .form-row { grid-template-columns: 1fr; }
    .form-card-body { padding: 24px 20px; }
    .hero-steps { gap: 6px; flex-wrap: wrap; justify-content: center; }
    .hero-step-line { width: 30px; }
    .card-3d { height: 194px; }
    .footer-inner { flex-direction: column; align-items: flex-start; }
    .footer-bottom { flex-direction: column; text-align: center; }
  }
  @media(max-width: 480px) {
    .hero-steps { flex-direction: column; align-items: center; gap: 8px; }
    .hero-step-line { display: none; }
    .timer-banner { align-items: flex-start; flex-direction: column; }
    .payment-countdown { text-align: left; }
  }
`;

const initialPaymentForm = {
  cardholder_name: "",
  card_number: "",
  expiry_date: "",
  cvv: "",
  billing_address: "",
};

function saveJson(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function readJson(key) {
  try {
    const rawValue = sessionStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function removeJson(key) {
  sessionStorage.removeItem(key);
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseServerDateTime(value) {
  if (!value) return null;
  const text = String(value);
  return new Date(text.includes("T") ? text : text.replace(" ", "T")).getTime();
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

async function requestApi(endpoint, options = {}) {
  if (typeof apiRequest === "function") {
    return apiRequest(endpoint, options);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = payload?.errors
      ? Object.values(payload.errors).flat().join("\n")
      : "";

    throw new Error(payload?.error || validationErrors || payload?.message || "API request failed");
  }

  return payload;
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  let digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 2) {
    digits = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

function formatPreviewNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  const padded = digits.padEnd(16, "•");
  return padded.replace(/(.{4})/g, "$1 ").trim();
}

function Crest({ size = 38 }) {
  return (
    <span className="crest" style={{ width: size, height: size }}>
      <span className="crest-crown" />
      <span className="crest-ring">
        <span className="crest-letter" style={{ fontSize: size * 0.4 }}>E</span>
      </span>
    </span>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconEye({ closed = false }) {
  if (closed) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconWarn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function PaymentPage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const timerRef = useRef(null);
  const initialDurationRef = useRef(null);
  const cardStageRef = useRef(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [hold, setHold] = useState(null);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [showCvv, setShowCvv] = useState(false);
  const [cvvFocused, setCvvFocused] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [countdownText, setCountdownText] = useState("--:--");
  const [timerStatus, setTimerStatus] = useState("Session active");
  const [isExpiring, setIsExpiring] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dust] = useState(() =>
    Array.from({ length: 18 }, (_, i) => {
      const size = Math.random() * 4 + 2;
      return {
        id: i,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 16 + 10}s`,
          animationDelay: `${Math.random() * 10}s`,
          opacity: Math.random() * 0.5 + 0.15,
        },
      };
    })
  );

  const previewName = useMemo(() => {
    return paymentForm.cardholder_name.trim()
      ? paymentForm.cardholder_name.trim().toUpperCase()
      : "YOUR NAME";
  }, [paymentForm.cardholder_name]);

  const previewNumber = useMemo(() => {
    return paymentForm.card_number.trim()
      ? formatPreviewNumber(paymentForm.card_number)
      : "•••• •••• •••• ••••";
  }, [paymentForm.card_number]);

  const previewExpiry = useMemo(() => {
    return paymentForm.expiry_date.trim() || "MM/YY";
  }, [paymentForm.expiry_date]);

  const previewCvv = useMemo(() => {
    return paymentForm.cvv.trim() ? paymentForm.cvv.padEnd(3, "•") : "•••";
  }, [paymentForm.cvv]);

  const amount = Number(hold?.total_amount || 0);

  const setPaymentMessage = useCallback((text, type = "") => {
    setMessage({ text, type });
  }, []);

  const updatePaymentForm = useCallback((field, value) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  }, []);

  const stopPaymentTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseActiveHold = useCallback(async () => {
    const activeHold = readJson(ACTIVE_HOLD_KEY);
    if (!activeHold?.booking_id || !activeHold?.hold_token) return false;

    try {
      await requestApi("/booking-holds/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          booking_id: activeHold.booking_id,
          hold_token: activeHold.hold_token,
        }),
      });
      removeJson(ACTIVE_HOLD_KEY);
      return true;
    } catch {
      removeJson(ACTIVE_HOLD_KEY);
      return false;
    }
  }, []);

  const handleSessionExpired = useCallback(async () => {
    stopPaymentTimer();
    setPaymentMessage("Session Expired. Please select the slot again.", "error");
    setTimerStatus("Session expired");
    setCountdownText("00:00");
    setIsExpiring(true);
    setIsExpired(true);
    setProgressPercent(0);
    await releaseActiveHold();
  }, [releaseActiveHold, setPaymentMessage, stopPaymentTimer]);

  const updatePaymentCountdown = useCallback(
    (expiresAt) => {
      const expiresTime = parseServerDateTime(expiresAt);
      if (!expiresTime) {
        setCountdownText("--:--");
        return;
      }

      const remainingMs = expiresTime - Date.now();

      if (remainingMs > 0) {
        setCountdownText(formatCountdown(remainingMs));
        setIsExpiring(remainingMs < 120000);
        setTimerStatus(remainingMs < 120000 ? "Expiring soon!" : "Session active");
        const total = initialDurationRef.current || remainingMs;
        setProgressPercent(Math.min(100, Math.max(0, (remainingMs / total) * 100)));
      } else {
        handleSessionExpired();
      }
    },
    [handleSessionExpired]
  );

  const startPaymentTimer = useCallback(
    (expiresAt) => {
      stopPaymentTimer();
      const expiresTime = parseServerDateTime(expiresAt);
      initialDurationRef.current = expiresTime ? Math.max(expiresTime - Date.now(), 1) : 600000;
      updatePaymentCountdown(expiresAt);

      timerRef.current = setInterval(() => {
        const expTime = parseServerDateTime(expiresAt);
        if (!expTime || expTime - Date.now() <= 0) {
          handleSessionExpired();
          return;
        }
        updatePaymentCountdown(expiresAt);
      }, 1000);
    },
    [handleSessionExpired, stopPaymentTimer, updatePaymentCountdown]
  );

  const loadPaymentSummary = useCallback(() => {
    const activeHold = readJson(ACTIVE_HOLD_KEY);

    if (!activeHold?.booking_id || !activeHold?.hold_token || !activeHold?.hold_expires_at) {
      setHold(null);
      setIsExpired(true);
      setPaymentMessage("No active payment session. Please select a slot first.", "error");
      setTimerStatus("No active session");
      setCountdownText("--:--");
      setProgressPercent(0);
      return null;
    }

    if (parseServerDateTime(activeHold.hold_expires_at) <= Date.now()) {
      setHold(activeHold);
      handleSessionExpired();
      return null;
    }

    setHold(activeHold);
    setIsExpired(false);
    setPaymentMessage("", "");
    startPaymentTimer(activeHold.hold_expires_at);

    return activeHold;
  }, [handleSessionExpired, setPaymentMessage, startPaymentTimer]);

  const cancelPayment = useCallback(async () => {
    if (isCancelling) return;
    const activeHold = readJson(ACTIVE_HOLD_KEY);

    if (!activeHold?.booking_id) {
      navigate("/#calendar-booking");
      return;
    }

    setIsCancelling(true);
    try {
      await releaseActiveHold();
      stopPaymentTimer();
      navigate("/booking");
    } finally {
      setIsCancelling(false);
    }
  }, [isCancelling, navigate, releaseActiveHold, stopPaymentTimer]);

  const submitPayment = useCallback(
    async (event) => {
      event.preventDefault();
      const form = formRef.current;

      if (form && !form.checkValidity()) {
        form.reportValidity();
        setPaymentMessage("Please complete all required payment fields.", "error");
        return;
      }

      const activeHold = readJson(ACTIVE_HOLD_KEY);
      if (!activeHold?.booking_id || !activeHold?.hold_token) {
        setPaymentMessage("Your payment session is missing or expired. Please select a slot again.", "error");
        return;
      }

      if (parseServerDateTime(activeHold.hold_expires_at) <= Date.now()) {
        await handleSessionExpired();
        return;
      }

      setIsSubmitting(true);
      setPaymentMessage("", "");

      try {
        const result = await requestApi("/payments/process", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            booking_id: activeHold.booking_id,
            hold_token: activeHold.hold_token,
            cardholder_name: paymentForm.cardholder_name.trim(),
            card_number: paymentForm.card_number.trim(),
            expiry_date: paymentForm.expiry_date.trim(),
            cvv: paymentForm.cvv.trim(),
            billing_address: paymentForm.billing_address.trim(),
            amount: activeHold.total_amount || 0,
          }),
        });

        const data = normalizeApiData(result);

        saveJson(PENDING_CONFIRMATION_KEY, {
          status: data?.status || "pending",
          message: result?.message || "Your booking request has been submitted and is pending admin approval.",
          submitted_at: new Date().toISOString(),
          booking_id: activeHold.booking_id,
          booking_no: activeHold.booking_no || "",
          customer_name: activeHold.customer_name || "",
          customer_email: activeHold.customer_email || "",
          event_title: activeHold.event_title || "",
          event_type: activeHold.event_type || "",
          guest_count: activeHold.guest_count || "",
          booking_date: activeHold.booking_date || "",
          booking_slot_label: activeHold.booking_slot_label || "",
          total_amount: activeHold.total_amount || 0,
        });

        removeJson(ACTIVE_HOLD_KEY);
        navigate("/congratulations");
      } catch (error) {
        setPaymentMessage(error.message || "Unable to process payment.", "error");
        setIsSubmitting(false);
      }
    },
    [handleSessionExpired, navigate, paymentForm, setPaymentMessage]
  );

  const handleCardMouseMove = useCallback((event) => {
    if (!cardStageRef.current) return;
    const rect = cardStageRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 16, y: (px - 0.5) * 20 });
  }, []);

  const resetCardTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-aos]");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("aos-animate"); }),
      { threshold: 0.15 }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [hold]);

  useEffect(() => {
    loadPaymentSummary();
    return () => stopPaymentTimer();
  }, [loadPaymentSummary, stopPaymentTimer]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - progressPercent / 100);
  const cardTransform = cvvFocused
    ? "rotateY(180deg)"
    : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;

  return (
    <>
      <style>{paymentPageStyles}</style>

      <div className="gold-dust" aria-hidden="true">
        {dust.map((p) => <span key={p.id} style={p.style} />)}
      </div>

      {/* ── Navbar (floating pill) ── */}
      <div className={`nav-shell${isScrolled ? " scrolled" : ""}`}>
        <div className="nav-pill">
          <Link to="/" className="logo-mark">
            <Crest size={38} />
            <span className="word">ELITE <b>HALL</b></span>
          </Link>

          <div className="nav-links">
            <Link to="/#calendar-booking">Calendar</Link>
            <Link to="/#about">About</Link>
            <Link to="/#gallery">Gallery</Link>
            <Link to="/#features">Features</Link>
            <Link to="/booking" className="nav-back">
              <IconArrowLeft />
              Back
            </Link>
          </div>
        </div>
      </div>

      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-overlay" />

        <div className="container">
          <div className="hero-eyebrow">
            <IconCard />
            Secure Payment Gateway
          </div>

          <h1>
            Complete Your <span>Payment</span>
          </h1>

          <p>Your slot is temporarily held. Submit your payment information to complete your booking request</p>

          <div className="hero-steps">
            <div className="hero-step done">
              <div className="hero-step-num"><IconCheck /></div>
              <span>Select Slot</span>
            </div>
            <div className="hero-step-line done" />
            <div className="hero-step done">
              <div className="hero-step-num"><IconCheck /></div>
              <span>Booking Info</span>
            </div>
            <div className="hero-step-line done" />
            <div className="hero-step active">
              <div className="hero-step-num">3</div>
              <span>Payment</span>
            </div>
          </div>
        </div>
      </section>

      <section className="form-page-section" id="payment-page">
        <div className="container">
          <div className="timer-banner" data-aos="fade-up">
            <div className={`seal-wrap${isExpiring ? " expiring pulse" : ""}`}>
              <svg className="ring-svg" viewBox="0 0 64 64">
                <defs>
                  <linearGradient id="sealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--gold-deep)" />
                    <stop offset="100%" stopColor="var(--gold-bright)" />
                  </linearGradient>
                </defs>
                <circle className="seal-track" cx="32" cy="32" r={RING_RADIUS} />
                <circle
                  className="seal-fill"
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <span className="seal-core">
                {isExpiring ? <IconWarn /> : <IconClock />}
              </span>
            </div>

            <div className="timer-text">
              <p>Your slot is held in the Elite Vault — complete payment before it releases</p>
              <strong>{timerStatus}</strong>
            </div>

            <div className={`payment-countdown${isExpiring ? " expiring" : ""}`}>
              {countdownText}
            </div>
          </div>

          <div className="payment-layout">
            <div className="form-card" data-aos="fade-right">
              <div className="form-card-header">
                <h2>Payment Details</h2>
                <p>All transactions are encrypted and secure</p>
              </div>

              <div className="form-card-body">
                <div
                  className="card-stage"
                  ref={cardStageRef}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={resetCardTilt}
                >
                  <div className="card-3d" style={{ transform: cardTransform }}>
                    <div className="card-face front">
                      <div className="card-sheen" />
                      <div className="card-crest-watermark"><span>E</span></div>

                      <div className="card-top-row">
                        <span className="card-brand-tag">Elite Hall</span>
                        <IconShield />
                      </div>

                      <div className="card-chip">
                        <div className="card-chip-line" />
                        <div className="card-chip-line" />
                        <div className="card-chip-line" />
                      </div>

                      <div className="card-number-display">{previewNumber}</div>

                      <div className="card-bottom">
                        <div>
                          <div className="card-label">Card Holder</div>
                          <div className="card-value">{previewName}</div>
                        </div>
                        <div>
                          <div className="card-label">Expires</div>
                          <div className="card-value">{previewExpiry}</div>
                        </div>
                      </div>
                    </div>

                    <div className="card-face back">
                      <div className="card-magstripe" />
                      <div className="card-signature-row">
                        <div className="card-signature">{previewName}</div>
                        <div className="card-cvv-box">{previewCvv}</div>
                      </div>
                      <p className="card-back-note">
                        This card is protected by 256-bit SSL encryption. The security code
                        shown here is only visible to you during entry and is never stored.
                      </p>
                      <div className="card-crest-watermark"><span>E</span></div>
                    </div>
                  </div>
                </div>

                <form ref={formRef} id="paymentForm" noValidate onSubmit={submitPayment}>
                  <div className="form-section-label">Cardholder Information</div>

                  <div className="field">
                    <input
                      type="text"
                      id="cardholderName"
                      placeholder=" "
                      required
                      autoComplete="cc-name"
                      value={paymentForm.cardholder_name}
                      onChange={(event) => updatePaymentForm("cardholder_name", event.target.value)}
                    />
                    <label htmlFor="cardholderName">Cardholder Name *</label>
                    <span className="field-icon"><IconUser /></span>
                  </div>

                  <div className="form-section-label">Card Details</div>

                  <div className="field">
                    <input
                      type="text"
                      id="cardNumber"
                      placeholder=" "
                      maxLength="19"
                      required
                      autoComplete="cc-number"
                      inputMode="numeric"
                      value={paymentForm.card_number}
                      onChange={(event) => updatePaymentForm("card_number", formatCardNumber(event.target.value))}
                    />
                    <label htmlFor="cardNumber">Card Number *</label>
                    <span className="field-icon"><IconCard /></span>
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <input
                        type="text"
                        id="expiryDate"
                        placeholder=" "
                        maxLength="5"
                        required
                        autoComplete="cc-exp"
                        value={paymentForm.expiry_date}
                        onChange={(event) => updatePaymentForm("expiry_date", formatExpiry(event.target.value))}
                      />
                      <label htmlFor="expiryDate">Expiry Date *</label>
                      <span className="field-icon"><IconCalendar /></span>
                    </div>

                    <div className="field">
                      <input
                        type={showCvv ? "text" : "password"}
                        id="cvv"
                        placeholder=" "
                        maxLength="4"
                        inputMode="numeric"
                        pattern="\d{3,4}"
                        autoComplete="off"
                        required
                        value={paymentForm.cvv}
                        onFocus={() => setCvvFocused(true)}
                        onBlur={() => setCvvFocused(false)}
                        onChange={(event) => updatePaymentForm("cvv", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                      <label htmlFor="cvv">CVV / CVC *</label>
                      <span className="field-icon"><IconLock /></span>
                      <button
                        type="button"
                        className="cvv-toggle"
                        tabIndex="-1"
                        onClick={() => setShowCvv((current) => !current)}
                        aria-label="Toggle CVV visibility"
                      >
                        <IconEye closed={showCvv} />
                      </button>
                    </div>
                  </div>

                  <div className="form-section-label">Billing Address</div>

                  <div className="field textarea-field">
                    <textarea
                      id="billingAddress"
                      rows="3"
                      placeholder=" "
                      required
                      autoComplete="billing street-address"
                      value={paymentForm.billing_address}
                      onChange={(event) => updatePaymentForm("billing_address", event.target.value)}
                    />
                    <label htmlFor="billingAddress">Billing Address *</label>
                    <span className="field-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                  </div>

                  <div className="security-row">
                    <IconShield />
                    <span>256-bit SSL encrypted · Your card details are never stored</span>
                  </div>

                  <div className="form-actions">
                    <button
                      className={`btn${isSubmitting ? " loading" : ""}`}
                      type="submit"
                      disabled={isSubmitting || isExpired || !hold?.booking_id}
                    >
                      <IconShield />
                      {isSubmitting ? "Processing Payment..." : "Complete Payment"}
                    </button>

                    <button
                      className={`btn btn-secondary${isCancelling ? " loading" : ""}`}
                      type="button"
                      onClick={cancelPayment}
                      disabled={isCancelling || isSubmitting}
                    >
                      <IconArrowLeft />
                      {isExpired ? "Back to Calendar" : isCancelling ? "Cancelling..." : "Cancel & Edit Booking"}
                    </button>
                  </div>

                  <div className={`booking-message ${message.type || ""}`.trim()}>
                    {message.text ? (message.type === "error" ? <IconWarn /> : <IconCheck />) : null}
                    <span>{message.text}</span>
                  </div>
                </form>
              </div>
            </div>

            <div className="sidebar" data-aos="fade-left" data-aos-delay="150">
              <div className="summary-card">
                <div className="summary-card-header">
                  <h3>Booking Summary</h3>
                  <p>Your confirmed selection details</p>
                </div>

                <div className="summary-card-body">
                  {!hold?.booking_id ? (
                    <div style={{ padding: "10px 0", fontSize: "14px", color: "var(--text-mute)", textAlign: "center" }}>
                      <IconClock />
                      <br />
                      No active payment session.
                      <br />
                      Please select a slot first.
                    </div>
                  ) : (
                    <>
                      <div className="summary-row">
                        <span className="summary-label"><IconUser />Name</span>
                        <span className="summary-value">{hold.customer_name || "—"}</span>
                      </div>

                      <div className="summary-row">
                        <span className="summary-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="8 6 21 6" />
                            <polyline points="8 12 21 12" />
                            <polyline points="8 18 21 18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                          </svg>
                          Event
                        </span>
                        <span className="summary-value">{hold.event_title || "—"}</span>
                      </div>

                      <div className="summary-row">
                        <span className="summary-label"><IconCalendar />Date</span>
                        <span className="summary-value">{hold.booking_date || "—"}</span>
                      </div>

                      <div className="summary-row">
                        <span className="summary-label"><IconClock />Shift</span>
                        <span className="summary-value">{hold.booking_slot_label || "—"}</span>
                      </div>

                      <div className="summary-amount-box">
                        <div className="summary-amount-label">Total Payment Amount</div>
                        <div className="summary-amount-value">৳ {amount.toLocaleString()}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="trust-card">
                <h4><IconShield />Secure &amp; Trusted</h4>

                <div className="trust-item">
                  <div className="trust-item-icon"><IconLock /></div>
                  <div className="trust-item-text">
                    <strong>256-bit SSL Encryption</strong>
                    <span>All data transmitted over a fully encrypted secure connection</span>
                  </div>
                </div>

                <div className="trust-item">
                  <div className="trust-item-icon"><IconClock /></div>
                  <div className="trust-item-text">
                    <strong>10-Minute Hold</strong>
                    <span>Your slot is reserved exclusively for you during checkout</span>
                  </div>
                </div>

                <div className="trust-item">
                  <div className="trust-item-icon"><IconMail /></div>
                  <div className="trust-item-text">
                    <strong>Instant Confirmation</strong>
                    <span>Receive a booking confirmation email immediately on success</span>
                  </div>
                </div>
              </div>

              <div className="help-card">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Payment Steps
                </h4>

                <div className="help-item">
                  <div className="help-item-num">1</div>
                  <span>Enter your card details accurately in the fields provided.</span>
                </div>
                <div className="help-item">
                  <div className="help-item-num">2</div>
                  <span>Click <strong>Complete Payment</strong> to process the transaction securely.</span>
                </div>
                <div className="help-item">
                  <div className="help-item-num">3</div>
                  <span>After submission, your booking will be pending admin approval and the slot is locked.</span>
                </div>
                <div className="help-item">
                  <div className="help-item-num"><IconMail /></div>
                  <span>A receipt will be emailed to your registered address within minutes.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="logo-mark">
                <Crest size={40} />
                <span className="word">ELITE <b>HALL</b></span>
              </span>
              <p>Premium Convention &amp; Party Venue in Dhaka</p>
            </div>

            <div className="footer-links">
              <Link to="/#calendar-booking">Calendar</Link>
              <Link to="/#about">About</Link>
              <Link to="/#gallery">Gallery</Link>
              <Link to="/#features">Features</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 <span className="footer-gold">Elite Convention Hall</span>. All Rights Reserved.</p>
            <p>Dhaka, Bangladesh</p>
          </div>
        </div>
      </footer>
    </>
  );
}