/* Cenário em toda a janela, independente do enquadramento 16:9 dos slides. */
(() => {
  const scene = document.getElementById('cenario-animado');
  const boat = document.getElementById('barco-wrapper');
  const balance = document.getElementById('barco-balance');
  const river = document.getElementById('rio-layer');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tracks = [...document.querySelectorAll('.wave-track')];
  const birds = Array.from({ length: 5 }, (_, i) => {
    const bird = document.createElement('span');
    bird.className = 'bird';
    // Perfil lateral: cabeça e bico apontam no mesmo sentido da travessia.
    bird.innerHTML = `<svg viewBox="0 0 64 36" aria-hidden="true">
      <path class="bird-wing far" d="M31 20 Q20 10 19 3 Q35 6 41 20Z"/>
      <path d="M12 21 3 15 7 25 20 25 Q34 31 46 23 Q50 22 52 18 L61 17 52 14 Q49 8 44 13 L39 18 Q25 16 12 21Z"/>
      <path class="bird-wing" d="M31 22 Q20 12 24 1 Q40 7 43 21Z"/>
    </svg>`;
    bird.querySelectorAll('.bird-wing').forEach((wing, wingIndex) => {
      wing.style.animationDelay = `${-i * .19 - wingIndex * .27}s`;
      wing.style.animationDuration = `${.65 + i * .09}s`;
    });
    document.getElementById('aves').appendChild(bird);
    return bird;
  });
  const rain = document.getElementById('chuva');
  for (let i = 0; i < 320; i++) {
    const drop = document.createElement('span');
    const layer = i % 5 === 0 ? ' near' : i % 3 === 0 ? ' far' : '';
    drop.className = `rain-drop${layer}`;
    drop.style.left = `${(i * 29.7) % 118 - 6}%`;
    drop.style.animationDelay = `${-(i * .113) % 2.4}s`;
    drop.style.animationDuration = `${.55 + (i % 9) * .08}s`;
    rain.appendChild(drop);
  }
  for (let i = 0; i < 48; i++) {
    const ripple = document.createElement('span');
    ripple.className = 'rain-ripple';
    ripple.style.left = `${1 + (i * 2.15) % 98}%`;
    ripple.style.bottom = `${12 + (i * 17) % 70}px`;
    ripple.style.animationDelay = `${-i * .19}s`;
    rain.appendChild(ripple);
  }
  for (let i = 0; i < 36; i++) {
    const splash = document.createElement('span');
    splash.className = 'rain-splash';
    splash.style.left = `${2 + (i * 2.7) % 96}%`;
    splash.style.bottom = `${8 + (i * 11) % 36}px`;
    splash.style.animationDelay = `${-i * .23}s`;
    rain.appendChild(splash);
  }
  const journey = { x:24, target:24, elapsed:0, waveTime:0, storm:0, slideTime:0, index:0, count:1, last:0, frame:0, docked:false, swell:1 };
  const START_X = 24, WAVE_PERIOD = 2560;
  let dockX = 852;

  function resizeScene() {
    const width = scene.clientWidth, height = scene.clientHeight;
    const scale = Math.max(.45, Math.min(1.35, width / 1280, height / 720));
    const worldWidth = width / scale;
    const oldDockX = dockX;
    // A proa termina junto à borda do cais, em qualquer proporção de tela.
    dockX = worldWidth - 428;
    journey.x = START_X + (journey.x - START_X) / (oldDockX - START_X) * (dockX - START_X);
    journey.target = START_X + (dockX - START_X) * journey.index / Math.max(1, journey.count - 1);
    river.style.width = `${worldWidth}px`;
    river.style.transform = `scale(${scale})`;
    // Pares original/espelho suficientes até para monitores ultralargos.
    const tileCount = (Math.ceil(worldWidth / WAVE_PERIOD) + 1) * 2;
    tracks.forEach(track => {
      while (track.children.length < tileCount) {
        const img = document.createElement('img');
        img.src = '1.png'; img.alt = ''; img.draggable = false;
        track.appendChild(img);
      }
    });
    renderJourney(0);
  }

  function syncJourney(initial = false) {
    const slides = Reveal.getSlides();
    journey.index = slides.indexOf(Reveal.getCurrentSlide());
    journey.count = slides.length;
    journey.slideTime = 0;
    journey.target = START_X + (dockX - START_X) * journey.index / Math.max(1, slides.length - 1);
    if (initial || reducedMotion.matches) journey.x = journey.target;
    journey.docked = false;
    scene.classList.toggle('is-raining', Reveal.getCurrentSlide().dataset.rain === 'true');
    scene.classList.toggle('is-arriving', journey.index === slides.length - 1);
    scene.classList.toggle('scene-dark', Reveal.getCurrentSlide().dataset.backgroundColor === '#10303C');
    scene.classList.toggle('scene-reduced', reducedMotion.matches);
    renderJourney(0);
  }

  function renderJourney(dt) {
    const finalSlide = journey.index === journey.count - 1;
    // Deriva limitada ao trecho atual: não chega ao próximo slide sozinha.
    const segment = (dockX - START_X) / Math.max(1, journey.count - 1);
    const drift = finalSlide || reducedMotion.matches ? 0 : segment * .28 * (1 - Math.exp(-journey.slideTime / 22));
    const target = journey.target + drift;
    journey.x += (target - journey.x) * (1 - Math.exp(-dt * (finalSlide ? 1.3 : 1.8)));
    if (finalSlide && Math.abs(journey.x - dockX) < .15) {
      journey.x = dockX;
      journey.docked = true;
    }
    scene.classList.toggle('is-docked', journey.docked);
    const raining = scene.classList.contains('is-raining');
    journey.storm += ((raining ? 1 : 0) - journey.storm) * (1 - Math.exp(-dt * 1.3));
    journey.waveTime += dt * (1 + journey.storm * 2.1);
    const swellTarget = journey.docked ? .16 : raining ? 2.6 : 1;
    journey.swell += (swellTarget - journey.swell) * (1 - Math.exp(-dt * 1.6));
    const t = journey.elapsed;
    let frontSurge = 0, frontScale = 1, frontPhase = 0;
    tracks.forEach((track, i) => {
      // Exatamente um par original/espelho, sem reinício visível ou faixa vazia.
      const speed = Number(track.dataset.speed);
      const phase = (journey.waveTime * speed + i * 210) % WAVE_PERIOD;
      const surge = reducedMotion.matches ? 0 : journey.storm * (Math.sin(journey.waveTime * 2.3 + i * 1.8) * 15 - 20);
      const waveHeight = 1 + journey.storm * (.65 + Math.sin(journey.waveTime * 1.7 + i) * .12);
      track.style.transform = `translate3d(${-phase}px,${surge}px,0) scaleY(${waveHeight})`;
      if (track.id === 'ondas-container' || i === tracks.length - 1) {
        frontSurge = surge;
        frontScale = waveHeight;
        frontPhase = phase;
      }
    });
    // Barco acompanha a superfície da frente: surge, escala e crista sob a proa.
    const crest = Math.sin((frontPhase + journey.x) * (Math.PI * 2 / 640));
    const crestSlope = Math.cos((frontPhase + journey.x) * (Math.PI * 2 / 640));
    const calmHeave = Math.sin(t * 1.55) * 4 + Math.sin(t * 2.7 + .4) * 1.2;
    const calmPitch = Math.sin(t * 1.55 + .7) * 1.7 + Math.sin(t * .81) * .5;
    const rideHeave = frontSurge * .72 + (frontScale - 1) * 36 + crest * (5 + journey.storm * 11);
    const ridePitch = crestSlope * (2.2 + journey.storm * 5.5) + Math.sin(journey.waveTime * 2.3 + .7) * journey.storm * 2.4;
    const dockFactor = journey.docked ? .16 : 1;
    const heave = reducedMotion.matches ? 0 : (calmHeave * (1 - journey.storm * .9) + rideHeave) * dockFactor;
    const pitch = reducedMotion.matches ? 0 : (calmPitch * (1 - journey.storm * .9) + ridePitch) * dockFactor;
    boat.style.transform = `translate3d(${journey.x.toFixed(3)}px,0,0)`;
    balance.style.transform = `translate3d(0,${heave.toFixed(3)}px,0) rotate(${pitch.toFixed(3)}deg)`;
    birds.forEach((bird, i) => {
      const flightWidth = scene.clientWidth + 160;
      const x = ((t * (65 + i * 8) + i * flightWidth / 5) % flightWidth) - 80;
      const y = 12 + (i % 3) * 12 + Math.sin(t * .55 + i) * 2;
      bird.style.transform = `translate3d(${x}px,${y}px,0) scale(${.55 + i * .07})`;
    });
  }

  function animateJourney(now) {
    const dt = journey.last ? Math.min((now - journey.last) / 1000, .05) : 0;
    journey.last = now;
    journey.elapsed += dt;
    journey.slideTime += dt;
    renderJourney(dt);
    journey.frame = requestAnimationFrame(animateJourney);
  }

  function resumeJourney() {
    cancelAnimationFrame(journey.frame);
    journey.last = 0;
    const paused = document.hidden || Reveal.isOverview() || Reveal.isPaused();
    scene.classList.toggle('scene-paused', paused);
    if (!paused && !reducedMotion.matches) journey.frame = requestAnimationFrame(animateJourney);
  }
  const start = () => { resizeScene(); syncJourney(true); resumeJourney(); };
  if (Reveal.isReady()) start();
  else Reveal.on('ready', start);
  Reveal.on('slidechanged', () => syncJourney());
  ['overviewshown', 'overviewhidden', 'paused', 'resumed'].forEach(event => Reveal.on(event, resumeJourney));
  document.addEventListener('visibilitychange', resumeJourney);
  window.addEventListener('resize', resizeScene);
  reducedMotion.addEventListener('change', () => { syncJourney(true); resumeJourney(); });
})();
