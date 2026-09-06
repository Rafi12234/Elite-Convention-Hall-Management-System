import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PENDING_CONFIRMATION_KEY = "dlc_booking_pending_v1";

const congratulationsPageStyles = String.raw`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --gold:        #b8860b;
    --gold-light:  #d4a017;
    --gold-dark:   #8f6908;
    --gold-pale:   #fdf6e3;
    --gold-border: #ead7a6;
    --bg:          #faf7f2;
    --white:       #ffffff;
    --text:        #1a1a2e;
    --text-muted:  #6b7280;
    --success:     #198754;
    --danger:      #dc3545;
    --shadow-sm:   0 2px 10px rgba(0,0,0,0.06);
    --shadow-md:   0 8px 30px rgba(0,0,0,0.10);
    --shadow-lg:   0 20px 60px rgba(0,0,0,0.14);
    --radius:      16px;
    --radius-lg:   24px;
    --transition:  0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  .container {
    width: 90%;
    max-width: 900px;
    margin: auto;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--gold);
    border-radius: 10px;
  }

  nav {
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    transition: var(--transition);
  }

  nav.scrolled .nav-inner {
    background: rgba(255,255,255,0.97);
    box-shadow: 0 4px 30px rgba(184,134,11,0.12);
    border-bottom-color: var(--gold-border);
  }

  .nav-inner {
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(234,215,166,0.3);
    transition: var(--transition);
  }

  .nav-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
  }

  .logo img {
    height: 38px;
    width: auto;
    max-width: 160px;
    object-fit: contain;
    display: block;
    transition: var(--transition);
  }

  .logo img:hover {
    transform: scale(1.04);
  }

  .nav-home-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    color: var(--gold-dark);
    padding: 8px 18px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    transition: var(--transition);
    font-family: 'Poppins', sans-serif;
  }

  .nav-home-btn svg {
    width: 15px;
    height: 15px;
    stroke-width: 2.5;
  }

  .nav-home-btn:hover {
    background: var(--gold);
    color: white;
    border-color: var(--gold);
  }

  .confetti-canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    width: 100%;
    height: 100%;
  }

  .success-section {
    padding: 110px 0 80px;
    position: relative;
    z-index: 1;
  }

  .success-card {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(234,215,166,0.4);
    overflow: hidden;
    opacity: 0;
    transform: translateY(40px) scale(0.97);
    animation: cardEntrance 0.85s cubic-bezier(0.4,0,0.2,1) 0.3s forwards;
  }

  @keyframes cardEntrance {
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .card-hero {
    background: linear-gradient(135deg, var(--gold) 0%, #d4a017 60%, #c8940e 100%);
    padding: 50px 45px 45px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .card-hero::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 220px;
    height: 220px;
    background: rgba(255,255,255,0.07);
    border-radius: 50%;
  }

  .card-hero::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: -50px;
    width: 200px;
    height: 200px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
  }

  .success-icon-ring {
    position: relative;
    z-index: 1;
    width: 96px;
    height: 96px;
    margin: 0 auto 24px;
  }

  .success-icon-ring::before,
  .success-icon-ring::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    animation: ringPulse 2.2s ease-out infinite;
  }

  .success-icon-ring::after {
    animation-delay: 1.1s;
  }

  @keyframes ringPulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }

    100% {
      transform: scale(1.7);
      opacity: 0;
    }
  }

  .success-icon-inner {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    border: 2px solid rgba(255,255,255,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
    z-index: 2;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    animation: iconPop 0.6s cubic-bezier(0.4,0,0.2,1) 0.8s both;
  }

  @keyframes iconPop {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }

    70% {
      transform: scale(1.12);
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .success-icon-inner svg {
    width: 44px;
    height: 44px;
    stroke-width: 2.5;
  }

  .card-hero h1 {
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 800;
    color: white;
    line-height: 1.15;
    margin-bottom: 10px;
    position: relative;
    z-index: 1;
    animation: fadeSlideUp 0.7s ease 1s both;
  }

  .card-hero h1 span {
    display: block;
    font-size: 0.6em;
    font-weight: 500;
    color: rgba(255,255,255,0.78);
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .card-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.35);
    color: white;
    padding: 7px 18px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 16px;
    position: relative;
    z-index: 1;
    animation: fadeSlideUp 0.7s ease 1.15s both;
  }

  .card-hero-badge svg {
    width: 13px;
    height: 13px;
    stroke-width: 2;
  }

  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .steps-complete-bar {
    display: flex;
    justify-content: center;
    gap: 0;
    padding: 22px 30px;
    background: var(--gold-pale);
    border-bottom: 1px solid var(--gold-border);
    flex-wrap: wrap;
    animation: fadeSlideUp 0.7s ease 1.25s both;
  }

  .sc-step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--gold-dark);
  }

  .sc-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--gold);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .sc-step-num svg {
    width: 12px;
    height: 12px;
    stroke-width: 3;
  }

  .sc-step-line {
    width: 50px;
    height: 2px;
    background: var(--gold);
    margin: 0 6px;
    opacity: 0.5;
    align-self: center;
  }

  .card-body {
    padding: 40px 45px;
  }

  .subtitle {
    text-align: center;
    color: var(--text-muted);
    font-size: 15px;
    line-height: 1.75;
    margin-bottom: 32px;
    animation: fadeSlideUp 0.7s ease 1.35s both;
  }

  .missing-box {
    background: rgba(220,53,69,0.07);
    color: #842029;
    border: 1px solid rgba(220,53,69,0.22);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 600;
    align-items: center;
    gap: 10px;
  }

  .missing-box svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
    flex-shrink: 0;
    color: var(--danger);
  }

  .details-box {
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 32px;
    animation: fadeSlideUp 0.7s ease 1.45s both;
  }

  .details-box-header {
    background: linear-gradient(135deg, var(--gold) 0%, #d4a017 100%);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .details-box-header::before {
    content: '';
    position: absolute;
    right: -20px;
    top: -20px;
    width: 80px;
    height: 80px;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
  }

  .details-box-header h3 {
    font-size: 14px;
    font-weight: 700;
    color: white;
    position: relative;
    z-index: 1;
  }

  .details-box-header svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
    color: rgba(255,255,255,0.85);
    position: relative;
    z-index: 1;
  }

  .details-inner {
    padding: 8px 0;
  }

  .detail-row {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 12px;
    padding: 13px 24px;
    border-bottom: 1px solid rgba(184,134,11,0.1);
    transition: background var(--transition);
    align-items: center;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-row:hover {
    background: rgba(184,134,11,0.04);
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--gold-dark);
  }

  .label svg {
    width: 13px;
    height: 13px;
    stroke-width: 2;
    color: var(--gold);
    flex-shrink: 0;
  }

  .value {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    word-break: break-word;
  }

  .value.highlight {
    color: var(--gold);
    font-size: 16px;
    font-weight: 800;
  }

  .value.status-confirmed {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--success);
  }

  .value.status-confirmed::before {
    content: '';
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    display: inline-block;
    box-shadow: 0 0 0 3px rgba(25,135,84,0.2);
    animation: statusPulse 2s ease infinite;
  }

  @keyframes statusPulse {
    0%, 100% {
      box-shadow: 0 0 0 3px rgba(25,135,84,0.2);
    }

    50% {
      box-shadow: 0 0 0 6px rgba(25,135,84,0.08);
    }
  }

  .info-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 32px;
    animation: fadeSlideUp 0.7s ease 1.55s both;
  }

  .info-strip-item {
    background: white;
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    padding: 18px 16px;
    text-align: center;
    transition: var(--transition);
  }

  .info-strip-item:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--gold);
  }

  .info-strip-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
    color: var(--gold);
  }

  .info-strip-icon svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  .info-strip-item strong {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 3px;
  }

  .info-strip-item span {
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .card-actions {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    animation: fadeSlideUp 0.7s ease 1.65s both;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--gold);
    color: white;
    padding: 14px 30px;
    border-radius: 50px;
    font-weight: 700;
    font-size: 15px;
    font-family: 'Poppins', sans-serif;
    transition: var(--transition);
    cursor: pointer;
    border: none;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .btn svg {
    width: 17px;
    height: 17px;
    stroke-width: 2.2;
    flex-shrink: 0;
  }

  .btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 100%);
    opacity: 0;
    transition: var(--transition);
  }

  .btn:hover::before {
    opacity: 1;
  }

  .btn:hover {
    background: var(--gold-dark);
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(184,134,11,0.4);
  }

  .btn-outline {
    background: transparent;
    color: var(--gold);
    border: 2px solid var(--gold-border);
  }

  .btn-outline:hover {
    background: var(--gold-pale);
    border-color: var(--gold);
    box-shadow: var(--shadow-sm);
  }

  footer {
    background: #0f0f1a;
    color: white;
    padding: 40px 0 30px;
    margin-top: 0;
  }

  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .footer-bottom p {
    font-size: 13px;
    color: #6b7280;
  }

  .footer-gold {
    color: var(--gold);
  }

  @media(max-width: 768px) {
    .card-hero {
      padding: 38px 24px 32px;
    }

    .card-body {
      padding: 28px 22px;
    }

    .detail-row {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .value {
      font-size: 13px;
    }

    .info-strip {
      grid-template-columns: 1fr;
    }

    .steps-complete-bar {
      gap: 8px;
    }

    .sc-step-line {
      width: 24px;
    }
  }

  @media(max-width: 480px) {
    .card-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }

    .sc-step-line {
      display: none;
    }
  }

  @media print {
    nav,
    .info-strip,
    .card-actions,
    footer,
    .confetti-canvas {
      display: none !important;
    }

    body {
      background: white;
    }

    .success-section {
      padding: 20px 0;
    }

    .success-card {
      box-shadow: none;
      border: 1px solid #ddd;
    }
  }
`;

function readJsonFromSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatMoney(amount) {
  return `৳${Number(amount || 0).toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="20 6 9 17 4 12" />
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

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.37 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function CongratulationsPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const hasConfirmation = !!confirmation;

  const statusText = useMemo(() => {
    if (!confirmation?.status) return "Pending Admin Approval";

    if (String(confirmation.status).toLowerCase() === "pending") {
      return "Pending Admin Approval";
    }

    return String(confirmation.status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [confirmation]);

  const confirmationMessage = useMemo(() => {
    return (
      confirmation?.message ||
      "Your booking request has been submitted successfully. Admin will review it soon."
    );
  }, [confirmation]);

  const clearPendingAndGoHome = useCallback(
    (event) => {
      if (event) event.preventDefault();
      sessionStorage.removeItem(PENDING_CONFIRMATION_KEY);
      navigate("/");
    },
    [navigate]
  );

  useEffect(() => {
    setConfirmation(readJsonFromSession(PENDING_CONFIRMATION_KEY));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;

    const colors = [
      "#b8860b",
      "#d4a017",
      "#f0d080",
      "#198754",
      "#ffffff",
      "#ead7a6",
      "#fdf6e3",
      "#8f6908",
    ];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height - height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.12,
        vx: (Math.random() - 0.5) * 2.5,
        vy: Math.random() * 2.5 + 1.5,
        alpha: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      };
    }

    function drawParticle(particle) {
      context.save();
      context.globalAlpha = particle.alpha;
      context.fillStyle = particle.color;
      context.translate(particle.x, particle.y);
      context.rotate(particle.rot);

      if (particle.shape === "circle") {
        context.beginPath();
        context.arc(0, 0, particle.w / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
      }

      context.restore();
    }

    function updateParticle(particle) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rot += particle.rotV;

      if (particle.y > height + 20) {
        particle.alpha -= 0.04;
      }
    }

    function loop() {
      context.clearRect(0, 0, width, height);

      particlesRef.current = particlesRef.current.filter((particle) => particle.alpha > 0);

      particlesRef.current.forEach((particle) => {
        updateParticle(particle);
        drawParticle(particle);
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(loop);
      } else {
        context.clearRect(0, 0, width, height);
      }
    }

    resize();
    particlesRef.current = [];

    const timers = [];

    for (let index = 0; index < 160; index += 1) {
      const timer = setTimeout(() => {
        particlesRef.current.push(createParticle());

        if (!animationRef.current) {
          animationRef.current = requestAnimationFrame(loop);
        }
      }, index * 12);

      timers.push(timer);
    }

    animationRef.current = requestAnimationFrame(loop);

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      timers.forEach((timer) => clearTimeout(timer));

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style>{congratulationsPageStyles}</style>

      <canvas ref={canvasRef} className="confetti-canvas" />

      <nav className={isScrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <div className="container nav-wrapper">
            <div className="logo">
              <Link to="/" onClick={clearPendingAndGoHome}>
                <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall Logo" />
              </Link>
            </div>

            <Link to="/" className="nav-home-btn" onClick={clearPendingAndGoHome}>
              <IconHome />
              Return to Home
            </Link>
          </div>
        </div>
      </nav>

      <section className="success-section">
        <div className="container">
          <div className="success-card">
            <div className="card-hero">
              <div className="success-icon-ring">
                <div className="success-icon-inner">
                  <IconCheck />
                </div>
              </div>

              <h1>
                Booking Request Submitted
                <span>Pending admin approval</span>
              </h1>

              <div className="card-hero-badge">
                <IconShield />
                Pending Approval
              </div>
            </div>

            <div className="steps-complete-bar">
              <div className="sc-step">
                <div className="sc-step-num">
                  <IconCheck />
                </div>
                <span>Slot Selected</span>
              </div>

              <div className="sc-step-line" />

              <div className="sc-step">
                <div className="sc-step-num">
                  <IconCheck />
                </div>
                <span>Booking Info</span>
              </div>

              <div className="sc-step-line" />

              <div className="sc-step">
                <div className="sc-step-num">
                  <IconCheck />
                </div>
                <span>Payment Done</span>
              </div>
            </div>

            <div className="card-body">
              <p className="subtitle">
                Your booking request has been submitted successfully. It is now pending admin approval. The admin will
                review your booking information and confirm or reject the booking.
              </p>

              {!hasConfirmation && (
                <div className="missing-box" style={{ display: "flex" }}>
                  <IconAlert />
                  Booking confirmation data was not found. Please return home and check your booking again.
                </div>
              )}

              {hasConfirmation && (
                <div className="details-box">
                  <div className="details-box-header">
                    <IconShield />
                    <h3>Booking Status</h3>
                  </div>

                  <div className="details-inner">
                    <div className="detail-row">
                      <div className="label">Current Status</div>
                      <div className="value highlight">{statusText}</div>
                    </div>

                    <div className="detail-row">
                      <div className="label">Message</div>
                      <div className="value">{confirmationMessage}</div>
                    </div>

                    {confirmation.booking_no && (
                      <div className="detail-row">
                        <div className="label">Booking No</div>
                        <div className="value">{confirmation.booking_no}</div>
                      </div>
                    )}

                    {confirmation.customer_name && (
                      <div className="detail-row">
                        <div className="label">Customer Name</div>
                        <div className="value">{confirmation.customer_name}</div>
                      </div>
                    )}

                    {confirmation.customer_email && (
                      <div className="detail-row">
                        <div className="label">Customer Email</div>
                        <div className="value">{confirmation.customer_email}</div>
                      </div>
                    )}

                    {confirmation.event_title && (
                      <div className="detail-row">
                        <div className="label">Event Title</div>
                        <div className="value">{confirmation.event_title}</div>
                      </div>
                    )}

                    {confirmation.event_type && (
                      <div className="detail-row">
                        <div className="label">Event Type</div>
                        <div className="value">{confirmation.event_type}</div>
                      </div>
                    )}

                    {confirmation.guest_count && (
                      <div className="detail-row">
                        <div className="label">Guest Count</div>
                        <div className="value">{confirmation.guest_count}</div>
                      </div>
                    )}

                    {confirmation.booking_date && (
                      <div className="detail-row">
                        <div className="label">Booking Date</div>
                        <div className="value">{confirmation.booking_date}</div>
                      </div>
                    )}

                    {confirmation.booking_slot_label && (
                      <div className="detail-row">
                        <div className="label">Selected Shift</div>
                        <div className="value">{confirmation.booking_slot_label}</div>
                      </div>
                    )}

                    {confirmation.total_amount && (
                      <div className="detail-row">
                        <div className="label">Paid Amount</div>
                        <div className="value highlight">{formatMoney(confirmation.total_amount)}</div>
                      </div>
                    )}

                    {confirmation.submitted_at && (
                      <div className="detail-row">
                        <div className="label">Submitted At</div>
                        <div className="value">{formatDateTime(confirmation.submitted_at)}</div>
                      </div>
                    )}

                    <div className="detail-row">
                      <div className="label">Next Step</div>
                      <div className="value">Please wait for admin approval.</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-strip">
                <div className="info-strip-item">
                  <div className="info-strip-icon">
                    <IconMail />
                  </div>
                  <strong>Confirmation Email</strong>
                  <span>Sent to your registered email address</span>
                </div>

                <div className="info-strip-item">
                  <div className="info-strip-icon">
                    <IconPhone />
                  </div>
                  <strong>Need Assistance?</strong>
                  <span>Contact our events team anytime</span>
                </div>

                <div className="info-strip-item">
                  <div className="info-strip-icon">
                    <IconPrint />
                  </div>
                  <strong>Save Your Receipt</strong>
                  <span>Print or screenshot for your records</span>
                </div>
              </div>

              <div className="card-actions">
                <Link to="/" className="btn" onClick={clearPendingAndGoHome}>
                  <IconHome />
                  Return to Home
                </Link>

                <button type="button" className="btn btn-outline" onClick={() => window.print()}>
                  <IconPrint />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
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