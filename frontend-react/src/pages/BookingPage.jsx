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

function getAuthUserId(user) {
  return user?.id || user?.user_id || user?.customer_id || "";
}

function getBookingDraftKey(user) {
  const userId = getAuthUserId(user);
  return userId ? `${BOOKING_DRAFT_KEY}_${userId}` : BOOKING_DRAFT_KEY;
}

function hasSensitiveDraftData(draft) {
  return !!(
    draft?.customer_name ||
    draft?.customer_email ||
    draft?.customer_phone ||
    draft?.customer_address ||
    draft?.event_title ||
    draft?.event_type ||
    draft?.guest_count ||
    draft?.event_details
  );
}

function readBookingDraft(user) {
  const scopedDraft = readJson(getBookingDraftKey(user));

  if (scopedDraft) {
    return scopedDraft;
  }

  const oldGlobalDraft = readJson(BOOKING_DRAFT_KEY);

  // Only allow old global draft if it contains slot info only.
  // Do not load old personal information from another user.
  if (hasSensitiveDraftData(oldGlobalDraft)) {
    return {};
  }

  return oldGlobalDraft || {};
}

function saveBookingDraft(value, user) {
  const userId = getAuthUserId(user);

  if (!userId) {
    return;
  }

  removeJson(BOOKING_DRAFT_KEY);

  saveJson(getBookingDraftKey(user), {
    ...value,
    __owner_user_id: userId,
  });
}

function clearAllBookingSessionData() {
  Object.keys(sessionStorage).forEach((key) => {
    if (
      key === SELECTED_SLOT_KEY ||
      key === ACTIVE_HOLD_KEY ||
      key === BOOKING_DRAFT_KEY ||
      key.startsWith(`${BOOKING_DRAFT_KEY}_`)
    ) {
      sessionStorage.removeItem(key);
    }
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Same brand system as HomePage: ivory/champagne canvas, gold-foil accents,
// espresso used only as a small accent (nav-on-scroll, calendar jewel box, footer).
const bookingPageStyles = String.raw`
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

    --night:        #34305f;
    --night-light:  #55508f;
    --burgundy:     #7c2436;
    --burgundy-l:   #9c3348;
    --copper:       #c97a35;
    --bronze:       #a07d23;
    --taupe:        #8d8071;
    --success:      #6d7a2e;

    --text:         #2b2318;
    --text-soft:    #5b4f3d;
    --text-mute:    #8a7d68;
    --cream-text:   #f8f1dd;

    --radius: 16px;
    --radius-lg: 26px;
    --shadow-sm: 0 4px 18px rgba(80,60,20,0.08);
    --shadow-md: 0 16px 44px rgba(80,60,20,0.12);
    --shadow-lg: 0 30px 80px rgba(40,28,10,0.18);
    --shadow-gold: 0 12px 32px rgba(184,135,58,0.28);
    --transition: 0.35s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Poppins', sans-serif;
    background:
      radial-gradient(circle at 12% 6%, rgba(184,135,58,0.07), transparent 40%),
      radial-gradient(circle at 90% 96%, rgba(184,135,58,0.06), transparent 46%),
      var(--paper);
    color: var(--text);
    overflow-x: hidden;
  }
  a { text-decoration: none; color: inherit; }
  .container { width: 90%; max-width: 1200px; margin: auto; position:relative; z-index:1; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: var(--paper-deep); }
  ::-webkit-scrollbar-thumb { background: linear-gradient(var(--gold-bright), var(--gold-deep)); border-radius: 10px; }
  .serif { font-family:'Cormorant Garamond',serif; }

  [data-aos] { opacity: 0; transition: opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1), filter .9s ease; }
  [data-aos-delay="150"] { transition-delay: .15s; }
  [data-aos="fade-right"] { transform: translateX(-35px); filter: blur(3px); }
  [data-aos="fade-left"]  { transform: translateX(35px); filter: blur(3px); }
  [data-aos].aos-animate  { opacity: 1; transform: none; filter: blur(0); }

  @keyframes heroZoom { from{transform:scale(1.06)} to{transform:scale(1.12)} }
  @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-25px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideUp { from{opacity:0;transform:translateY(35px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cardSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes overlayFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes modalSlideUp { from{opacity:0;transform:translateY(40px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin { to{transform:translateY(-50%) rotate(360deg)} }
  @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(184,135,58,.45)} 50%{box-shadow:0 0 0 9px rgba(184,135,58,0)} }
  @keyframes shimmerGold { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes sweep { from{transform:translateX(0) skewX(-20deg)} to{transform:translateX(360%) skewX(-20deg)} }
  @keyframes crownGlow { 0%,100%{filter:drop-shadow(0 0 2px rgba(232,199,102,.5))} 50%{filter:drop-shadow(0 0 8px rgba(232,199,102,.9))} }
  @keyframes scrollDot { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(16px);opacity:0} }

  /* ═══ CREST (brand monogram) ═══ */
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
  .nav-back svg { transition:var(--transition); }
  .nav-back:hover svg { transform:translateX(-3px); }

  /* ═══ PAGE HERO ═══ */
  .page-hero {
    min-height:50vh; padding-top:130px; position:relative; overflow:hidden;
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

  /* ═══ FORM SECTION ═══ */
  .form-page-section { background: var(--paper); padding: 70px 0 100px; }
  .form-layout-wrapper { display:grid; grid-template-columns: 1fr 370px; gap:32px; align-items:start; max-width:1100px; margin:auto; }

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

  .form-section-label {
    font-size:11px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:var(--gold-deep);
    margin-bottom:16px; margin-top:28px; display:flex; align-items:center; gap:10px;
  }
  .form-section-label:first-of-type { margin-top:0; }
  .form-section-label::after { content:''; flex:1; height:1px; background:var(--line); }

  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  .form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:16px; position:relative; }
  .form-group:last-child { margin-bottom:0; }
  .form-group label { font-size:12.5px; font-weight:600; color:var(--text-mute); letter-spacing:.3px; padding-left:2px; }
  .form-group .input-wrap { display:flex; flex-direction:column; position:relative; }

  .input-icon-box {
    position:absolute; left:0; top:0; bottom:0; width:44px; display:flex; align-items:center; justify-content:center;
    color:var(--text-mute); pointer-events:none; transition:var(--transition); z-index:1;
  }
  .input-icon-box.top { align-items:flex-start; padding-top:14px; }
  .input-icon-box svg { width:16px;height:16px; stroke-width:2; }

  .form-group input, .form-group select, .form-group textarea {
    width:100%; padding:13px 16px 13px 44px; border:1.5px solid var(--line); border-radius:12px; outline:none;
    font-size:14.5px; font-family:'Poppins',sans-serif; color:var(--text); background:var(--paper-deep);
    transition:var(--transition); appearance:none; -webkit-appearance:none; position:relative; z-index:0;
  }
  .form-group select { padding-right:40px; }
  .form-group textarea { resize:vertical; min-height:110px; padding-top:14px; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    border-color: var(--gold-mid); background: var(--gold-pale); box-shadow: 0 0 0 3px rgba(184,135,58,0.14);
  }
  .form-group input:focus ~ .input-icon-box, .form-group select:focus ~ .input-icon-box, .form-group textarea:focus ~ .input-icon-box { color: var(--gold-deep); }
  .form-group input[readonly], .form-group input[readonly]:focus {
    background: #efe9da; border-color: var(--line); color: var(--text-mute); cursor:not-allowed; box-shadow:none;
  }

  .readonly-badge {
    position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:10px;
    background: var(--gold-pale); color: var(--gold-deep); border:1px solid var(--gold-mid);
    padding:2px 8px; border-radius:20px; font-weight:700; letter-spacing:.5px; z-index:2;
  }
  .select-arrow-icon { position:absolute; right:14px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-mute); z-index:2; }
  .select-arrow-icon svg { width:14px;height:14px; stroke-width:2.5; }

  .form-actions { display:flex; flex-direction:column; gap:12px; margin-top:28px; }

  .btn {
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid),var(--gold-bright));
    background-size:220% auto; color:var(--ivory); padding:15px 32px; border-radius:50px;
    font-weight:700; font-size:15px; font-family:'Poppins',sans-serif;
    transition: var(--transition), background-position .6s ease; cursor:pointer; border:none;
    position:relative; overflow:hidden; letter-spacing:.3px; text-align:center;
    box-shadow: var(--shadow-gold);
  }
  .btn svg { width:18px;height:18px; stroke-width:2.2; flex-shrink:0; }
  .btn::before { content:''; position:absolute; top:0; left:-60%; width:40%; height:100%; background:linear-gradient(120deg,transparent,rgba(255,255,255,.55),transparent); transform:skewX(-20deg); }
  .btn:hover::before { animation: sweep .9s ease; }
  .btn:hover { background-position:right center; transform:translateY(-3px); box-shadow: 0 18px 40px rgba(184,135,58,0.35); }
  .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }

  .btn-secondary { background:transparent; color:var(--gold-deep); border:1.5px solid var(--gold-mid); box-shadow:none; }
  .btn-secondary:hover { background:var(--gold-pale); border-color:var(--gold-deep); transform:translateY(-3px); box-shadow:var(--shadow-sm); }

  .btn.loading { pointer-events:none; opacity:.88; padding-right:52px; }
  .btn.loading::after {
    content:''; position:absolute; right:18px; top:50%; transform:translateY(-50%); width:18px;height:18px;
    border:2px solid rgba(255,255,255,0.6); border-top-color:white; border-radius:50%; animation: spin .8s linear infinite;
  }

  .booking-message { min-height:22px; font-size:13.5px; font-weight:600; text-align:center; transition:var(--transition); border-radius:10px; white-space:pre-line; }
  .booking-message:not(:empty) { padding:12px 16px; margin-top:4px; }
  .booking-message.success { color: var(--success); background: rgba(109,122,46,0.1); border:1px solid rgba(109,122,46,0.25); }
  .booking-message.error { color: var(--burgundy); background: rgba(124,36,54,0.08); border:1px solid rgba(124,36,54,0.22); }

  /* ═══ SIDEBAR ═══ */
  .sidebar { display:flex; flex-direction:column; gap:20px; }

  .summary-card { background:var(--ivory); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); overflow:hidden; border:1px solid var(--gold-border, var(--line)); animation: cardSlideUp .7s ease .15s both; }
  .summary-card-header {
    background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%);
    padding:20px 24px; position:relative; overflow:hidden;
  }
  .summary-card-header::before { content:''; position:absolute; right:-20px; top:-20px; width:100px;height:100px; background:rgba(255,255,255,0.15); border-radius:50%; }
  .summary-card-header h3 { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:700; color:var(--espresso); position:relative; z-index:1; }
  .summary-card-header p { font-size:12px; color:rgba(35,26,18,0.68); position:relative; z-index:1; margin-top:3px; }
  .summary-card-body { padding:22px 24px; }

  .summary-row { display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--paper-deep); gap:12px; }
  .summary-row:last-child { border-bottom:none; padding-bottom:0; }
  .summary-label { font-size:12.5px; color:var(--text-mute); font-weight:500; flex-shrink:0; display:flex; align-items:center; gap:6px; }
  .summary-label svg { width:13px;height:13px; stroke-width:2; }
  .summary-value { font-size:13px; font-weight:700; color:var(--text); text-align:right; }

  .summary-amount-box { background: var(--gold-pale); border:1px solid var(--gold-mid); border-radius:12px; padding:16px; text-align:center; margin-top:16px; }
  .summary-amount-label { font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:var(--gold-deep); font-weight:600; margin-bottom:4px; }
  .summary-amount-value { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:800; color:var(--gold-deep); line-height:1; }

  .change-slot-card { background:var(--ivory); border:1px solid var(--line); border-radius: var(--radius-lg); padding:22px 24px; animation: cardSlideUp .7s ease .3s both; box-shadow: var(--shadow-sm); }
  .change-slot-card-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .change-slot-icon { width:36px;height:36px; border-radius:10px; background:var(--gold-pale); border:1px solid var(--gold-mid); display:flex; align-items:center; justify-content:center; color:var(--gold-deep); flex-shrink:0; }
  .change-slot-icon svg { width:18px;height:18px; stroke-width:2; }
  .change-slot-card h4 { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:700; color:var(--text); }
  .change-slot-card p { font-size:13px; color:var(--text-mute); margin-bottom:16px; line-height:1.6; }

  .help-card { background:var(--ivory); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding:24px; border:1px solid var(--line); animation: cardSlideUp .7s ease .45s both; }
  .help-card h4 { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:700; color:var(--text); margin-bottom:14px; display:flex; align-items:center; gap:8px; }
  .help-card h4 svg { width:16px;height:16px; stroke-width:2; color:var(--gold-deep); }
  .help-item { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid var(--paper-deep); font-size:13px; color:var(--text-mute); line-height:1.6; }
  .help-item:last-child { border-bottom:none; }
  .help-item-num {
    width:22px;height:22px; background:var(--gold-pale); border:1px solid var(--gold-mid); border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:var(--gold-deep); flex-shrink:0; margin-top:1px;
  }

  /* ═══ CALENDAR MODAL — jewel box ═══ */
  .cal-modal-overlay {
    display:none; position:fixed; inset:0; background:rgba(35,26,18,0.6); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    z-index:9998; justify-content:center; align-items:center; padding:20px;
  }
  .cal-modal-overlay.open { display:flex; animation: overlayFadeIn .3s ease; }
  .cal-modal {
    background:var(--ivory); border-radius:28px; width:100%; max-width:920px; max-height:92vh; overflow:hidden;
    box-shadow: 0 30px 80px rgba(35,26,18,0.35), 0 0 0 1px var(--gold-mid);
    animation: modalSlideUp .4s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:column;
  }
  .cal-modal-header {
    background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%);
    padding:24px 30px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between; position:relative; overflow:hidden;
  }
  .cal-modal-header::before { content:''; position:absolute; top:-40px; right:-40px; width:160px;height:160px; background:rgba(255,255,255,0.14); border-radius:50%; }
  .cal-modal-header-left { position:relative; z-index:1; }
  .cal-modal-header h3 { font-family:'Cormorant Garamond',serif; font-size:21px; font-weight:700; color:var(--espresso); margin-bottom:4px; }
  .cal-modal-header p { font-size:13px; color:rgba(35,26,18,0.7); }
  .cal-modal-close {
    width:38px;height:38px; background:rgba(35,26,18,0.16); border:none; border-radius:50%; color:var(--espresso);
    cursor:pointer; display:flex; align-items:center; justify-content:center; transition:var(--transition); position:relative; z-index:1; flex-shrink:0;
  }
  .cal-modal-close svg { width:18px;height:18px; stroke-width:2.5; }
  .cal-modal-close:hover { background:rgba(35,26,18,0.3); transform:rotate(90deg); }
  .cal-modal-body { padding:28px; overflow-y:auto; flex:1; background: linear-gradient(180deg,var(--paper) 0%, var(--paper-deep) 100%); }

  .cal-legend { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin-bottom:22px; }
  .cal-legend-item {
    display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600; color:var(--text-soft);
    background:var(--ivory); border:1px solid var(--line); padding:7px 14px; border-radius:100px;
  }
  .cal-legend-dot { width:11px;height:11px; border-radius:50%; box-shadow: 0 0 6px currentColor; }

  #inPageCalendar { width:100%; }
  #inPageCalendar .fc { width:100% !important; }
  #inPageCalendar table { table-layout:fixed !important; }

  .fc-toolbar-title { font-family:'Cormorant Garamond',serif !important; font-size:22px !important; color:var(--espresso) !important; font-weight:700 !important; }
  .fc-button-primary {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-mid)) !important; border:none !important;
    font-family:'Poppins',sans-serif !important; font-weight:600 !important; color:var(--ivory) !important;
    border-radius:10px !important; padding:7px 14px !important; transition:var(--transition) !important; font-size:13px !important;
  }
  .fc-button-primary:hover { transform:translateY(-1px) !important; }
  .fc-button-primary:not(:disabled).fc-button-active { background: linear-gradient(120deg,var(--night),var(--night-light)) !important; }
  .fc-col-header-cell {
    background: var(--gold-pale) !important; color:var(--gold-deep) !important; font-weight:700 !important;
    font-size:12px !important; text-transform:uppercase !important; letter-spacing:1px !important; padding:10px 0 !important;
  }
  .fc .fc-daygrid-day { cursor:pointer; background:var(--ivory); }
  .fc .fc-daygrid-day-frame { min-height:90px; }
  .fc .fc-daygrid-day:hover { background: var(--gold-pale) !important; }
  .fc .fc-daygrid-event {
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11px; padding:3px 7px;
    border-radius:7px !important; font-weight:600; font-family:'Poppins',sans-serif; cursor:pointer; border:none !important;
  }
  .fc .fc-daygrid-day-number { font-size:14px; font-weight:600; padding:7px; color:var(--text-soft); }
  .fc .fc-daygrid-day.fc-day-today { background: var(--gold-pale) !important; }
  .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
    background: linear-gradient(120deg,var(--gold-deep),var(--gold-bright)); color:var(--espresso); border-radius:50%;
    width:28px;height:28px; display:flex; align-items:center; justify-content:center;
  }
  .fc-theme-standard td, .fc-theme-standard th { border-color: var(--line) !important; }

  /* ═══ SLOT POPUP ═══ */
  .slot-popup-overlay { display:none; position:fixed; inset:0; background:rgba(35,26,18,0.5); backdrop-filter:blur(6px); z-index:10000; justify-content:center; align-items:center; padding:20px; }
  .slot-popup-overlay.open { display:flex; animation: overlayFadeIn .25s ease; }
  .slot-popup-box { background:var(--ivory); border-radius:24px; width:100%; max-width:480px; max-height:85vh; overflow-y:auto; box-shadow: 0 30px 80px rgba(35,26,18,0.3), 0 0 0 1px var(--gold-mid); animation: modalSlideUp .35s cubic-bezier(.4,0,.2,1); }
  .slot-popup-header { background: linear-gradient(120deg,var(--gold-deep) 0%,var(--gold-mid) 55%,var(--gold-bright) 100%); padding:24px 26px; border-radius:24px 24px 0 0; position:relative; overflow:hidden; }
  .slot-popup-header::before { content:''; position:absolute; top:-30px; right:-30px; width:120px;height:120px; background:rgba(255,255,255,0.15); border-radius:50%; }
  .slot-popup-header-content { position:relative; z-index:1; }
  .slot-popup-header h3 { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:700; color:var(--espresso); margin-bottom:6px; }
  .slot-popup-date-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(35,26,18,0.16); color:var(--espresso); padding:5px 13px; border-radius:50px; font-size:12.5px; font-weight:700; }
  .slot-popup-date-badge svg { width:13px;height:13px; stroke-width:2; }
  .slot-popup-close {
    position:absolute; top:18px; right:18px; width:34px;height:34px; background:rgba(35,26,18,0.16); border:none; border-radius:50%;
    color:var(--espresso); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:var(--transition); z-index:2;
  }
  .slot-popup-close svg { width:16px;height:16px; stroke-width:2.5; }
  .slot-popup-close:hover { background:rgba(35,26,18,0.3); transform:rotate(90deg); }
  .slot-popup-body { padding:24px 26px; }
  .slot-popup-subtitle { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--text-mute); margin-bottom:16px; }

  .slot-radio-group { display:flex; flex-direction:column; gap:12px; }
  .slot-radio-item { position:relative; }
  .slot-radio-item input[type="radio"] { position:absolute; opacity:0; width:0;height:0; }
  .slot-radio-label { display:flex; align-items:center; gap:13px; padding:15px 16px; border:1.5px solid var(--line); border-radius:14px; cursor:pointer; transition:var(--transition); background:var(--paper); user-select:none; }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label { border-color: var(--gold-mid); background: var(--gold-pale); }
  .slot-radio-label:hover { border-color: var(--gold-mid); }
  .slot-radio-label.disabled { cursor:not-allowed; opacity:.55; pointer-events:none; }
  .slot-radio-custom { width:20px;height:20px; border-radius:50%; border:2px solid rgba(43,35,24,0.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:var(--transition); }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label .slot-radio-custom { border-color: var(--gold-deep); background: var(--gold-deep); }
  .slot-radio-item input[type="radio"]:checked + .slot-radio-label .slot-radio-custom::after { content:''; width:7px;height:7px; background:var(--ivory); border-radius:50%; }
  .slot-info { flex:1; }
  .slot-name { font-size:14px; font-weight:700; color:var(--text); margin-bottom:3px; }
  .slot-time { font-size:12.5px; color:var(--text-mute); font-weight:500; display:flex; align-items:center; gap:5px; }
  .slot-time svg { width:12px;height:12px; stroke-width:2; }
  .slot-price { font-size:13.5px; font-weight:700; color: var(--gold-deep); margin-top:3px; }
  .slot-status-badge { padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; letter-spacing:.3px; flex-shrink:0; }
  .badge-available { background: var(--gold-pale); color: var(--gold-deep); border:1px solid var(--gold-mid); }
  .badge-booked { background: rgba(124,36,54,0.1); color: var(--burgundy); border:1px solid rgba(124,36,54,0.28); }
  .badge-blocked { background: rgba(141,128,113,0.14); color: var(--taupe); border:1px solid rgba(141,128,113,0.3); }
  .badge-progress { background: rgba(201,122,53,0.14); color: var(--copper); border:1px solid rgba(201,122,53,0.32); }
  .badge-pending { background: rgba(160,125,35,0.14); color: var(--bronze); border:1px solid rgba(160,125,35,0.32); }

  .slot-popup-footer { padding:0 26px 24px; display:flex; flex-direction:column; gap:10px; }
  .slot-proceed-btn { width:100%; font-size:15px; font-weight:700; border-radius:13px; padding:14px; }
  .slot-cancel-btn {
    width:100%; font-size:14px; font-weight:600; background:var(--paper-deep); color:var(--text-mute); border-radius:13px;
    padding:12px; border:1px solid var(--line); cursor:pointer; font-family:'Poppins',sans-serif; transition:var(--transition);
  }
  .slot-cancel-btn:hover { background:var(--line); color:var(--text); }

  .slot-popup-empty { text-align:center; padding:20px 0; color:var(--text-mute); font-size:14.5px; }
  .slot-popup-empty-icon { width:56px;height:56px; margin:0 auto 14px; background:var(--gold-pale); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gold-deep); }
  .slot-popup-empty-icon svg { width:26px;height:26px; stroke-width:1.8; }

  /* ═══ FOOTER — espresso accent band ═══ */
  footer { background: linear-gradient(160deg,var(--espresso),var(--espresso-2)); color:var(--cream-text); padding:55px 0 35px; position:relative; }
  footer::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--gold-bright),transparent); }
  .footer-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; padding-bottom:30px; border-bottom:1px solid rgba(232,199,102,0.15); margin-bottom:28px; }
  .footer-brand .logo-mark .word { color: var(--cream-text); }
  .footer-brand .logo-mark .word b { color: var(--gold-bright); }
  .footer-brand p { font-size:13px; color:rgba(248,241,221,0.55); margin-top:8px; }
  .footer-links { display:flex; gap:24px; flex-wrap:wrap; }
  .footer-links a { font-size:13px; color:rgba(248,241,221,0.6); transition:var(--transition); }
  .footer-links a:hover { color: var(--gold-bright); }
  .footer-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
  .footer-bottom p { font-size:13px; color:rgba(248,241,221,0.4); }
  .footer-gold { color: var(--gold-bright); }

  @media(max-width: 992px) {
    .form-layout-wrapper { grid-template-columns:1fr; }
    .sidebar { order:-1; }
  }
  @media(max-width: 768px) {
    .nav-links a:not(.nav-back) { display:none; }
    .form-row { grid-template-columns:1fr; }
    .form-card-body { padding:24px 20px; }
    .hero-steps { gap:6px; flex-wrap:wrap; justify-content:center; }
    .hero-step-line { width:30px; }
    .footer-inner { flex-direction:column; align-items:flex-start; }
    .footer-bottom { flex-direction:column; text-align:center; }
    .cal-modal-body { padding:18px; }
  }
  @media(max-width: 480px) {
    .hero-steps { flex-direction:column; align-items:center; gap:8px; }
    .hero-step-line { display:none; }
    #inPageCalendar .fc { min-width:600px; }
    .cal-modal-body { overflow-x:auto; }
  }
`;

const initialFormData = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_address: "",
  hall_id: "",
  booking_slot_id: "",
  booking_date: "",
  booking_slot_label: "",
  event_title: "",
  event_type: "",
  guest_count: "",
  total_amount: "",
  event_details: "",
};

// Status colors — gold/burgundy/copper/bronze/taupe family. No green, no black background.
const colorMap = {
  available: "#c9a227",
  booked: "#7c2436",
  blocked: "#8d8071",
  payment_in_progress: "#c97a35",
  pending_approval: "#a07d23",
};

function saveJson(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function readJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function removeJson(key) {
  sessionStorage.removeItem(key);
}

function readLocalJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function parseServerDateTime(value) {
  if (!value) return null;
  const text = String(value);
  return new Date(text.includes("T") ? text : text.replace(" ", "T")).getTime();
}

function getSlotExpiryTime(slot) {
  return parseServerDateTime(slot?.hold_expires_at_iso || slot?.hold_expires_at);
}

function getRemainingText(slot) {
  const expiry = getSlotExpiryTime(slot);
  if (!expiry) return "";
  const remaining = expiry - Date.now();
  return remaining <= 0 ? "00:00" : formatCountdown(remaining);
}

function formatSlotLabel(slot) {
  return `${slot.shift_name} (${slot.start_time} - ${slot.end_time})`;
}

function calculateAmount(slot) {
  return Number(slot?.price || slot?.shift_price || slot?.total_amount || 0);
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

function buildCustomerHeaders() {
  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
  let helperHeaders = {};

  try {
    helperHeaders = typeof customerHeaders === "function" ? customerHeaders(token) : {};
  } catch {
    try {
      helperHeaders = typeof customerHeaders === "function" ? customerHeaders() : {};
    } catch {
      helperHeaders = {};
    }
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(helperHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requestApi(endpoint, options = {}) {
  if (typeof apiRequest === "function") {
    return apiRequest(endpoint, options);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = payload?.errors ? Object.values(payload.errors).flat().join("\n") : "";
    throw new Error(payload?.error || validationErrors || payload?.message || "API request failed");
  }

  return payload;
}

function getCalendarSlotTitle(slot) {
  if (slot.slot_status === "payment_in_progress") {
    return `${slot.shift_name} · In Progress ${getRemainingText(slot)}`;
  }

  if (slot.slot_status === "pending_approval") {
    return `${slot.shift_name} · Pending Approval`;
  }

  return slot.calendar_title || `${slot.shift_name} · ${slot.slot_status}`;
}

function buildCalEvent(slot) {
  const color = colorMap[slot.slot_status] || "#8d8071";

  return {
    id: String(slot.slot_id),
    title: getCalendarSlotTitle(slot),
    start: slot.slot_date,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor: slot.slot_status === "available" ? "#231a12" : "#fdf8ea",
    classNames: [`slot-${slot.slot_status}`],
    extendedProps: { slot },
  };
}

function getStatusBadge(status) {
  const map = {
    available: { label: "Available", cls: "badge-available" },
    booked: { label: "Booked", cls: "badge-booked" },
    blocked: { label: "Blocked", cls: "badge-blocked" },
    payment_in_progress: { label: "In Progress", cls: "badge-progress" },
    pending_approval: { label: "Pending Approval", cls: "badge-pending" },
  };

  return map[status] || { label: status, cls: "badge-blocked" };
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

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function BookingPage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const calendarRef = useRef(null);
  const slotsByDateRef = useRef({});
  const activeUserRef = useRef(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [context, setContext] = useState(null);
  const [halls, setHalls] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isSlotPopupOpen, setIsSlotPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState("");
  const [popupSlots, setPopupSlots] = useState([]);
  const [popupSelectedSlot, setPopupSelectedSlot] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [, setClockTick] = useState(0);

  const summary = useMemo(() => {
    const amount = Number(formData.total_amount || selectedSlot?.total_amount || 0);
    const hall = halls.find((item) => String(item.id) === String(formData.hall_id));

    return {
      hall: selectedSlot?.hall_name || hall?.name || "Main Hall",
      date: formData.booking_date || "—",
      shift: formData.booking_slot_label || "—",
      amount,
    };
  }, [formData.booking_date, formData.booking_slot_label, formData.hall_id, formData.total_amount, halls, selectedSlot]);

  const formattedPopupDate = useMemo(() => {
    if (!popupDate) return "—";

    return new Date(`${popupDate}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [popupDate]);

  const setBookingMessage = useCallback((text, type = "") => {
    setMessage({ text, type });
  }, []);

  const updateFormData = useCallback((field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const applySelectedSlotToForm = useCallback(
    (slot, successMessage = "") => {
      if (!slot) return;

      const amount = calculateAmount(slot);
      const label = slot.booking_slot_label || formatSlotLabel(slot);
      const selected = {
        ...slot,
        booking_slot_id: slot.booking_slot_id || slot.slot_id,
        booking_date: slot.booking_date || slot.slot_date,
        booking_slot_label: label,
        total_amount: amount,
        selected_at: slot.selected_at || new Date().toISOString(),
      };

      const existingDraft = readBookingDraft(activeUserRef.current) || {};
      const nextDraft = {
        ...existingDraft,
        hall_id: selected.hall_id || existingDraft.hall_id || context?.default_hall_id || DEFAULT_HALL_ID,
        booking_slot_id: selected.booking_slot_id,
        booking_date: selected.booking_date,
        booking_slot_label: selected.booking_slot_label,
        total_amount: amount,
      };

      saveJson(SELECTED_SLOT_KEY, selected);
      saveBookingDraft(nextDraft, activeUserRef.current);

      setSelectedSlot(selected);
      setFormData((current) => ({
        ...current,
        ...nextDraft,
        hall_id: String(nextDraft.hall_id || current.hall_id || ""),
        booking_slot_id: String(nextDraft.booking_slot_id || ""),
        total_amount: String(amount || ""),
      }));

      if (successMessage) {
        setBookingMessage(successMessage, "success");
      }
    },
    [context?.default_hall_id, setBookingMessage]
  );

  const forceCalResize = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    calendarApi.updateSize();

    setTimeout(() => {
      calendarRef.current?.getApi()?.updateSize();
    }, 200);
  }, []);

  const loadBookingContext = useCallback(async () => {
    const payload = await requestApi("/booking-context", {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const data = normalizeApiData(payload);
    setContext(data);
    setHalls(data?.halls || []);

    setFormData((current) => ({
      ...current,
      hall_id: current.hall_id || String(data?.default_hall_id || DEFAULT_HALL_ID),
    }));

    return data;
  }, []);

  const requireLoggedInUser = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);

    if (!token) {
      navigate("/login?redirect=booking");
      return null;
    }

    const localUser = readLocalJson(CUSTOMER_USER_KEY);

    try {
      const payload = await requestApi("/auth/panel", {
        method: "GET",
        headers: buildCustomerHeaders(),
      });

      const data = normalizeApiData(payload);
      const user = data?.profile || data?.user || data?.customer || data || localUser;

      if (user && typeof user === "object") {
        localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
      }

      activeUserRef.current = user;

      return user;
    } catch {
      if (localUser) {
        activeUserRef.current = localUser;
        return localUser;
      }

      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_USER_KEY);
      navigate("/login?redirect=booking");
      return null;
    }
  }, [navigate]);

  const fillUserFromLogin = useCallback((user) => {
    if (!user) return;

    setFormData((current) => ({
      ...current,
      customer_name: user.name || current.customer_name || "",
      customer_email: user.email || current.customer_email || "",
      customer_phone: user.phone || current.customer_phone || "",
      customer_address: user.address || current.customer_address || "",
    }));
  }, []);

  const populateSelectedSlot = useCallback(async () => {
    const cachedSelected = readJson(SELECTED_SLOT_KEY);
    const draft = readBookingDraft(activeUserRef.current) || {};

    if (!cachedSelected?.booking_slot_id) {
      setFormData((current) => ({
        ...current,
        ...draft,
        hall_id: String(draft.hall_id || current.hall_id || context?.default_hall_id || DEFAULT_HALL_ID),
        booking_slot_id: draft.booking_slot_id ? String(draft.booking_slot_id) : "",
        total_amount: draft.total_amount ? String(draft.total_amount) : "",
      }));

      setSelectedSlot(null);
      setBookingMessage("No slot selected. Use the calendar to select a slot.", "error");
      return;
    }

    // Cached slot may hold a stale price (e.g. from before a rate change), so
    // re-check against the live backend and use that price if it differs.
    let selected = cachedSelected;
    try {
      const hallId = selected.hall_id || context?.default_hall_id || DEFAULT_HALL_ID;
      const params = new URLSearchParams({
        hall_id: String(hallId),
        from: selected.booking_date,
        to: selected.booking_date,
      });

      const payload = await requestApi(`/calendar-slots?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const freshSlots = normalizeApiData(payload) || [];
      const freshSlot = freshSlots.find(
        (slot) => String(slot.booking_slot_id || slot.slot_id) === String(selected.booking_slot_id)
      );

      if (freshSlot) {
        selected = { ...selected, ...freshSlot };
      }
    } catch {
      // Keep the cached slot if the live lookup fails.
    }

    const amount = calculateAmount(selected);
    const slotDraft = {
      ...draft,
      hall_id: selected.hall_id || draft.hall_id || context?.default_hall_id || DEFAULT_HALL_ID,
      booking_slot_id: selected.booking_slot_id,
      booking_date: selected.booking_date,
      booking_slot_label: selected.booking_slot_label,
      price: amount,
      shift_price: amount,
      total_amount: amount,
    };

    setSelectedSlot(selected);
    setFormData((current) => ({
      ...current,
      ...slotDraft,
      hall_id: String(slotDraft.hall_id || ""),
      booking_slot_id: String(slotDraft.booking_slot_id || ""),
      total_amount: String(slotDraft.total_amount || ""),
    }));

    saveJson(SELECTED_SLOT_KEY, selected);
    saveBookingDraft(slotDraft, activeUserRef.current);
    setBookingMessage("", "");
  }, [context?.default_hall_id, setBookingMessage]);

  const collectBookingPayload = useCallback(() => {
    return {
      customer_name: formData.customer_name.trim(),
      customer_email: formData.customer_email.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim(),
      hall_id: Number(formData.hall_id),
      booking_slot_id: Number(formData.booking_slot_id),
      booking_date: formData.booking_date,
      booking_slot_label: formData.booking_slot_label,
      event_title: formData.event_title.trim(),
      event_type: formData.event_type.trim(),
      guest_count: formData.guest_count ? Number(formData.guest_count) : null,
      total_amount: Number(formData.total_amount),
      event_details: formData.event_details.trim(),
    };
  }, [formData]);

  const releaseActiveHold = useCallback(async () => {
    const hold = readJson(ACTIVE_HOLD_KEY);
    if (!hold?.booking_id || !hold?.hold_token) return false;

    try {
      await requestApi("/booking-holds/release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          booking_id: hold.booking_id,
          hold_token: hold.hold_token,
        }),
      });

      removeJson(ACTIVE_HOLD_KEY);
      return true;
    } catch {
      removeJson(ACTIVE_HOLD_KEY);
      return false;
    }
  }, []);

  const submitBooking = useCallback(
    async (event) => {
      event.preventDefault();

      const form = formRef.current;

      if (form && !form.checkValidity()) {
        form.reportValidity();
        setBookingMessage("Please complete all required fields before continuing.", "error");
        return;
      }

      if (!formData.booking_slot_id) {
        setBookingMessage("Please select a free slot from the calendar first.", "error");
        return;
      }

      if (!formData.booking_date || !formData.booking_slot_label || !formData.total_amount) {
        setBookingMessage("Slot information is missing. Please select a slot again.", "error");
        return;
      }

      const payload = collectBookingPayload();
      saveBookingDraft(payload, activeUserRef.current);

      setIsSubmitting(true);

      try {
        const result = await requestApi("/booking-holds", {
          method: "POST",
          headers: buildCustomerHeaders(),
          body: JSON.stringify(payload),
        });

        const data = normalizeApiData(result);

        saveJson(ACTIVE_HOLD_KEY, {
          ...payload,
          booking_id: data.booking_id,
          hold_token: data.hold_token,
          hold_expires_at: data.hold_expires_at,
          total_amount: payload.total_amount,
        });

        setBookingMessage(result?.message || "Slot held for payment.", "success");
        navigate("/payment");
      } catch (error) {
        setBookingMessage(error.message || "Unable to hold this slot.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [collectBookingPayload, formData.booking_date, formData.booking_slot_id, formData.booking_slot_label, formData.total_amount, navigate, setBookingMessage]
  );

  const loadCalSlots = useCallback(
    async (fetchInfo, successCallback, failureCallback) => {
      try {
        const hallId = String(context?.default_hall_id || formData.hall_id || DEFAULT_HALL_ID);
        const params = new URLSearchParams({
          hall_id: hallId,
          from: fetchInfo.startStr.slice(0, 10),
          to: fetchInfo.endStr.slice(0, 10),
        });

        const payload = await requestApi(`/calendar-slots?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const slots = normalizeApiData(payload) || [];

        slotsByDateRef.current = slots.reduce((acc, slot) => {
          if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
          acc[slot.slot_date].push(slot);
          return acc;
        }, {});

        successCallback(slots.map(buildCalEvent));
      } catch (error) {
        failureCallback(error);
      }
    },
    [context?.default_hall_id, formData.hall_id]
  );

  const openSlotPopup = useCallback((dateStr, slots) => {
    setPopupDate(dateStr);
    setPopupSlots(slots || []);
    setPopupSelectedSlot(null);
    setIsSlotPopupOpen(true);
  }, []);

  const closeSlotPopup = useCallback(() => {
    setIsSlotPopupOpen(false);
    setPopupSelectedSlot(null);
  }, []);

  const openCalendarModal = useCallback(() => {
    setIsCalendarModalOpen(true);

    setTimeout(() => {
      forceCalResize();
      calendarRef.current?.getApi()?.refetchEvents();
    }, 80);
  }, [forceCalResize]);

  const closeCalendarModal = useCallback(() => {
    setIsCalendarModalOpen(false);
  }, []);

  const handleCalendarDateClick = useCallback(
    (info) => {
      info.jsEvent.preventDefault();
      openSlotPopup(info.dateStr, slotsByDateRef.current[info.dateStr] || []);
    },
    [openSlotPopup]
  );

  const handleCalendarEventClick = useCallback(
    (info) => {
      const slot = info.event.extendedProps?.slot;
      if (!slot) return;

      openSlotPopup(slot.slot_date, slotsByDateRef.current[slot.slot_date] || [slot]);
    },
    [openSlotPopup]
  );

  const confirmSlotFromPopup = useCallback(() => {
    if (!popupSelectedSlot) return;

    applySelectedSlotToForm(popupSelectedSlot, "Slot updated successfully. Please review and proceed.");
    closeSlotPopup();
    closeCalendarModal();
  }, [applySelectedSlotToForm, closeCalendarModal, closeSlotPopup, popupSelectedSlot]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-aos]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("aos-animate");
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [isReady, isCalendarModalOpen, isSlotPopupOpen]);

  useEffect(() => {
    let mounted = true;

async function bootPage() {
  try {
    await loadBookingContext();
  } catch (error) {
    setBookingMessage(error.message || "Backend connection is not ready.", "error");
  }

  const loggedInUser = await requireLoggedInUser();
  if (!loggedInUser) return;

  activeUserRef.current = loggedInUser;

  await populateSelectedSlot();

  fillUserFromLogin(loggedInUser);

  if (mounted) {
    setIsReady(true);
  }
}

    bootPage();

    return () => {
      mounted = false;
    };
  }, [fillUserFromLogin, loadBookingContext, populateSelectedSlot, requireLoggedInUser, setBookingMessage]);

useEffect(() => {
  if (!isReady) return;
  if (!activeUserRef.current) return;

  saveBookingDraft(formData, activeUserRef.current);
}, [formData, isReady]);

  useEffect(() => {
    document.body.style.overflow = isCalendarModalOpen || isSlotPopupOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCalendarModalOpen, isSlotPopupOpen]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setClockTick((value) => value + 1);

      const calendarApi = calendarRef.current?.getApi();
      if (!calendarApi) return;

      let shouldRefetch = false;

      calendarApi.getEvents().forEach((event) => {
        const slot = event.extendedProps?.slot;
        if (!slot || slot.slot_status !== "payment_in_progress") return;

        const expiry = getSlotExpiryTime(slot);

        if (expiry && expiry <= Date.now()) {
          shouldRefetch = true;
          return;
        }

        event.setProp("title", getCalendarSlotTitle(slot));
      });

      if (shouldRefetch) {
        calendarApi.refetchEvents();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (isSlotPopupOpen) {
        closeSlotPopup();
        return;
      }

      if (isCalendarModalOpen) {
        closeCalendarModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeCalendarModal, closeSlotPopup, isCalendarModalOpen, isSlotPopupOpen]);

  return (
    <>
      <style>{bookingPageStyles}</style>

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
            <Link to="/" className="nav-back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: "15px", height: "15px", strokeWidth: 2.5 }}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Home
            </Link>
          </div>
        </div>
      </div>

      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-overlay" />

        <div className="container">
          <div className="hero-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: "14px", height: "14px", strokeWidth: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Secure Booking Process
          </div>

          <h1>
            Booking <span>Information</span>
          </h1>

          <p>
            Complete your event and contact details. Your selected hall, date, shift, and amount are pre-filled from the
            calendar.
          </p>

          <div className="hero-steps">
            <div className="hero-step done">
              <div className="hero-step-num">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: "14px", height: "14px", strokeWidth: 3 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Select Slot</span>
            </div>

            <div className="hero-step-line done" />

            <div className="hero-step active">
              <div className="hero-step-num">2</div>
              <span>Booking Info</span>
            </div>

            <div className="hero-step-line" />

            <div className="hero-step">
              <div className="hero-step-num">3</div>
              <span>Payment</span>
            </div>
          </div>
        </div>
      </section>

      <section className="form-page-section" id="booking-page">
        <div className="container">
          <div className="form-layout-wrapper">
            <div className="form-card" data-aos="fade-right">
              <div className="form-card-header">
                <h2>Event &amp; Contact Details</h2>
                <p>All fields marked with * are required to proceed</p>
              </div>

              <div className="form-card-body">
                <form ref={formRef} id="bookingForm" noValidate onSubmit={submitBooking}>
                  <input type="hidden" value={formData.booking_slot_id} readOnly />

                  <div className="form-section-label">Personal Information</div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="customerName">Full Name *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="customerName"
                          placeholder="Enter full name"
                          required
                          value={formData.customer_name}
                          readOnly
                          onChange={(event) => updateFormData("customer_name", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="customerEmail">Email Address *</label>
                      <div className="input-wrap">
                        <input
                          type="email"
                          id="customerEmail"
                          placeholder="your@email.com"
                          required
                          value={formData.customer_email}
                          readOnly
                          onChange={(event) => updateFormData("customer_email", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="customerPhone">Phone Number *</label>
                      <div className="input-wrap">
                        <input
                          type="tel"
                          id="customerPhone"
                          placeholder="+880 1X00-000000"
                          required
                          value={formData.customer_phone}
                          readOnly
                          onChange={(event) => updateFormData("customer_phone", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.37 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="customerAddress">Address *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="customerAddress"
                          placeholder="Your full address"
                          required
                          value={formData.customer_address}
                          onChange={(event) => updateFormData("customer_address", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-section-label">Booking Details</div>

                  <div className="form-group">
                    <label htmlFor="hallSelect">Select Hall *</label>
                    <div className="input-wrap">
                      <select
                        id="hallSelect"
                        required
                        value={formData.hall_id}
                        onChange={(event) => updateFormData("hall_id", event.target.value)}
                      >
                        {halls.length === 0 ? (
                          <option value={formData.hall_id || DEFAULT_HALL_ID}>Main Hall</option>
                        ) : (
                          halls.map((hall) => (
                            <option key={hall.id} value={hall.id}>
                              {hall.name}
                            </option>
                          ))
                        )}
                      </select>

                      <span className="input-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>

                      <span className="select-arrow-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="bookingDate">Booking Date *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="bookingDate"
                          placeholder="Auto-filled from calendar"
                          readOnly
                          required
                          value={formData.booking_date}
                        />
                        <span className="input-icon-box">
                          <IconCalendar />
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="bookingSlotLabel">Selected Shift *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="bookingSlotLabel"
                          placeholder="Auto-filled from calendar"
                          readOnly
                          required
                          value={formData.booking_slot_label}
                        />
                        <span className="input-icon-box">
                          <IconClock />
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-section-label">Event Information</div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventTitle">Event Title *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="eventTitle"
                          placeholder="e.g. Rahman-Hasan Wedding"
                          required
                          value={formData.event_title}
                          onChange={(event) => updateFormData("event_title", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="8 6 21 6" />
                            <polyline points="8 12 21 12" />
                            <polyline points="8 18 21 18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="eventType">Event Type *</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          id="eventType"
                          placeholder="e.g. Wedding, Reception"
                          required
                          value={formData.event_type}
                          onChange={(event) => updateFormData("event_type", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guestCount">Number of Guests *</label>
                      <div className="input-wrap">
                        <input
                          type="number"
                          id="guestCount"
                          placeholder="Estimated guest count"
                          min="1"
                          required
                          value={formData.guest_count}
                          onChange={(event) => updateFormData("guest_count", event.target.value)}
                        />
                        <span className="input-icon-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="totalAmount">Total Amount (৳) *</label>
                      <div className="input-wrap">
                        <input
                          type="number"
                          id="totalAmount"
                          placeholder="Auto-filled"
                          min="0"
                          step="0.01"
                          readOnly
                          required
                          value={formData.total_amount}
                        />
                        <span className="input-icon-box">
                          <span style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1 }}>৳</span>
                        </span>
                        <span className="readonly-badge">AUTO</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventDetails">Event Details *</label>
                    <div className="input-wrap">
                      <textarea
                        id="eventDetails"
                        rows="5"
                        placeholder="Describe your event requirements, special requests, decoration preferences..."
                        required
                        value={formData.event_details}
                        onChange={(event) => updateFormData("event_details", event.target.value)}
                      />
                      <span className="input-icon-box top">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className={`btn${isSubmitting ? " loading" : ""}`}
                      type="submit"
                      id="bookingSubmitButton"
                      disabled={isSubmitting || !formData.booking_slot_id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      {isSubmitting ? "Creating Payment Session..." : "Proceed to Payment"}
                    </button>

                    <div className={`booking-message ${message.type || ""}`.trim()}>{message.text}</div>
                  </div>
                </form>
              </div>
            </div>

            <div className="sidebar" data-aos="fade-left" data-aos-delay="150">
              <div className="summary-card">
                <div className="summary-card-header">
                  <h3>Your Booking Summary</h3>
                  <p>Pre-filled from your calendar selection</p>
                </div>

                <div className="summary-card-body">
                  <div className="summary-row">
                    <span className="summary-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      Hall
                    </span>
                    <span className="summary-value">{summary.hall}</span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">
                      <IconCalendar />
                      Date
                    </span>
                    <span className="summary-value">{summary.date}</span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">
                      <IconClock />
                      Shift
                    </span>
                    <span className="summary-value">{summary.shift}</span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Status
                    </span>
                    <span className="summary-value" style={{ color: "var(--success)" }}>
                      Available
                    </span>
                  </div>

                  <div className="summary-amount-box">
                    <div className="summary-amount-label">Total Booking Amount</div>
                    <div className="summary-amount-value">৳ {Number(summary.amount || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="change-slot-card">
                <div className="change-slot-card-header">
                  <div className="change-slot-icon">
                    <IconCalendar />
                  </div>
                  <h4>Change Your Slot</h4>
                </div>

                <p>Need a different date or shift? Open the calendar below and choose another available slot from here</p>

                <button className="btn btn-secondary" type="button" style={{ width: "100%" }} onClick={openCalendarModal}>
                  <IconCalendar />
                  Open Booking Calendar
                </button>
              </div>

              <div className="help-card">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  How It Works
                </h4>

                <div className="help-item">
                  <div className="help-item-num">1</div>
                  <span>Fill in your personal and event details accurately.</span>
                </div>

                <div className="help-item">
                  <div className="help-item-num">2</div>
                  <span>
                    Click <strong>Proceed to Payment</strong> to hold your slot for 10 minutes.
                  </span>
                </div>

                <div className="help-item">
                  <div className="help-item-num">3</div>
                  <span>Complete the payment to confirm your booking permanently.</span>
                </div>

                <div className="help-item">
                  <div className="help-item-num">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: "11px", height: "11px", strokeWidth: 2.5 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <span>A confirmation email will be sent to your registered address.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`cal-modal-overlay${isCalendarModalOpen ? " open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeCalendarModal();
        }}
      >
        <div className="cal-modal">
          <div className="cal-modal-header">
            <div className="cal-modal-header-left">
              <h3>Select a New Slot</h3>
              <p>Click any date or event to view available shifts</p>
            </div>

            <button className="cal-modal-close" type="button" onClick={closeCalendarModal}>
              <IconClose />
            </button>
          </div>

          <div className="cal-modal-body">
            <div className="cal-legend">
              <div className="cal-legend-item">
                <div className="cal-legend-dot" style={{ background: "#c9a227", color: "#c9a227" }} />
                Available
              </div>
              <div className="cal-legend-item">
                <div className="cal-legend-dot" style={{ background: "#7c2436", color: "#7c2436" }} />
                Booked
              </div>
              <div className="cal-legend-item">
                <div className="cal-legend-dot" style={{ background: "#c97a35", color: "#c97a35" }} />
                In Progress
              </div>
              <div className="cal-legend-item">
                <div className="cal-legend-dot" style={{ background: "#a07d23", color: "#a07d23" }} />
                Pending Approval
              </div>
              <div className="cal-legend-item">
                <div className="cal-legend-dot" style={{ background: "#8d8071", color: "#8d8071" }} />
                Blocked
              </div>
            </div>

            <div id="inPageCalendar">
              {isCalendarModalOpen && (
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
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,listMonth",
                  }}
                  buttonText={{
                    today: "Today",
                    month: "Month",
                    listMonth: "List",
                  }}
                  events={loadCalSlots}
                  viewDidMount={forceCalResize}
                  datesSet={forceCalResize}
                  eventsSet={forceCalResize}
                  dateClick={handleCalendarDateClick}
                  eventClick={handleCalendarEventClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`slot-popup-overlay${isSlotPopupOpen ? " open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSlotPopup();
        }}
      >
        <div className="slot-popup-box">
          <div className="slot-popup-header">
            <button className="slot-popup-close" type="button" onClick={closeSlotPopup}>
              <IconClose />
            </button>

            <div className="slot-popup-header-content">
              <h3>Select Your Shift</h3>
              <div className="slot-popup-date-badge">
                <IconCalendar />
                <span>{formattedPopupDate}</span>
              </div>
            </div>
          </div>

          <div className="slot-popup-body">
            <p className="slot-popup-subtitle">Available Shifts for This Date</p>

            <div className="slot-radio-group">
              {popupSlots.length === 0 ? (
                <div className="slot-popup-empty">
                  <div className="slot-popup-empty-icon">
                    <IconCalendar />
                  </div>
                  <p>No slots available for this date yet.</p>
                </div>
              ) : (
                popupSlots.map((slot, index) => {
                  const isAvailable = slot.slot_status === "available";
                  const uid = `slot_r_${index}_${slot.slot_id}`;
                  const amount = calculateAmount(slot);
                  const statusBadge = getStatusBadge(slot.slot_status);

                  return (
                    <div className="slot-radio-item" key={uid}>
                      <input
                        type="radio"
                        name="inPageSlotChoice"
                        id={uid}
                        value={slot.slot_id}
                        disabled={!isAvailable}
                        checked={String(popupSelectedSlot?.slot_id || "") === String(slot.slot_id)}
                        onChange={() => setPopupSelectedSlot(slot)}
                      />

                      <label htmlFor={uid} className={`slot-radio-label${!isAvailable ? " disabled" : ""}`}>
                        <div className="slot-radio-custom" />

                        <div className="slot-info">
                          <div className="slot-name">{slot.shift_name}</div>

                          <div className="slot-time">
                            <IconClock />
                            {slot.start_time} – {slot.end_time}
                          </div>

                          {slot.slot_status === "payment_in_progress" && (
                            <div className="slot-time" style={{ color: "var(--copper)" }}>
                              <IconClock />
                              Expires: {getRemainingText(slot)}
                            </div>
                          )}

                          {amount > 0 && <div className="slot-price">৳ {Number(amount).toLocaleString()}</div>}
                        </div>

                        <span className={`slot-status-badge ${statusBadge.cls}`}>{statusBadge.label}</span>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="slot-popup-footer">
            <button
              type="button"
              className="btn slot-proceed-btn"
              disabled={!popupSelectedSlot}
              onClick={confirmSlotFromPopup}
              style={{
                opacity: popupSelectedSlot ? "1" : "0.5",
                cursor: popupSelectedSlot ? "pointer" : "not-allowed",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirm This Slot
            </button>

            <button type="button" className="slot-cancel-btn" onClick={closeSlotPopup}>
              Back to Calendar
            </button>
          </div>
        </div>
      </div>

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
            <p>
              © 2026 <span className="footer-gold">Elite Convention Hall</span>. All Rights Reserved.
            </p>
            <p>Dhaka, Bangladesh</p>
          </div>
        </div>
      </footer>
    </>
  );
}