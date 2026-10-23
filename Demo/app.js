/**
 * AURA STUDIO - Core Interactive Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State & Initial Data ---
  const initialProjects = [
    {
      id: 'proj-1',
      name: 'Vortex Latent Diffusion',
      category: 'generative',
      desc: 'High-fidelity cinematic texture synthesis model trained on deep space telemetry and fractal harmonics.',
      status: 'Live Endpoint',
      requests: '24.1k/day'
    },
    {
      id: 'proj-2',
      name: 'Hyperion Vision Agent',
      category: 'agents',
      desc: 'Autonomous multi-modal computer vision agent navigating continuous 3D environments with zero-shot transfer.',
      status: 'Standby',
      requests: '8.4k/day'
    },
    {
      id: 'proj-3',
      name: 'Quantum Flow Telemetry',
      category: 'analytics',
      desc: 'Real-time distributed token cost optimizer and latency auto-healing layer across 16 GPU regions.',
      status: 'Streaming',
      requests: '192k/day'
    },
    {
      id: 'proj-4',
      name: 'Chronos Voice Synthesis',
      category: 'generative',
      desc: 'Neural audio synthesis engine replicating emotional subtext, acoustic timbre, and multi-lingual inflections.',
      status: 'Live Endpoint',
      requests: '52.3k/day'
    },
    {
      id: 'proj-5',
      name: 'Sentinel Autonomous Auditor',
      category: 'agents',
      desc: 'Continuous security scanner and code generation verification agent utilizing tree-of-thought verification.',
      status: 'Scanning',
      requests: '15.6k/day'
    },
    {
      id: 'proj-6',
      name: 'Pulse Cluster Insights',
      category: 'analytics',
      desc: 'Anomaly detection and predictive memory pressure estimator for edge inference pipelines.',
      status: 'Healthy',
      requests: '88.9k/day'
    }
  ];

  let projects = [...initialProjects];
  let currentFilter = 'all';

  const surprisePrompts = [
    'Cyberpunk bioluminescent botanical garden with floating neon water droplets',
    'Hyper-detailed iridescent crystalline mechanical dragon over volcanic obsidian ridge',
    'Retro-futuristic 1980s neon synthwave supercomputer floating in hyperspace',
    'Architectural render of a zero-gravity glass library orbiting Jupiter',
    'Cinematic portrait of an ethereal android monk meditating beneath cherry blossoms'
  ];

  const themes = ['theme-violet', 'theme-cyan', 'theme-emerald', 'theme-rose'];
  let themeIndex = 0;

  // --- DOM Elements ---
  const projectsGrid = document.getElementById('projects-grid');
  const filterTabs = document.getElementById('filter-tabs');
  const searchInput = document.getElementById('project-search-input');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnQuickCreate = document.getElementById('btn-quick-create');
  const projectModal = document.getElementById('project-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const newProjectForm = document.getElementById('new-project-form');
  const toastContainer = document.getElementById('toast-container');
  const promptInput = document.getElementById('prompt-input');
  const styleSelect = document.getElementById('style-select');
  const stepsSlider = document.getElementById('steps-slider');
  const stepsVal = document.getElementById('steps-val');
  const btnGenerate = document.getElementById('btn-generate');
  const btnRandomPrompt = document.getElementById('btn-random-prompt');
  const generationLoader = document.getElementById('generation-loader');
  const loaderFill = document.getElementById('loader-fill');
  const previewHash = document.getElementById('preview-hash');
  const previewTime = document.getElementById('preview-time');
  const btnCopyMeta = document.getElementById('btn-copy-meta');
  const statLatency = document.getElementById('stat-latency');
  const statTokens = document.getElementById('stat-tokens');
  const canvas = document.getElementById('generative-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  // --- Generative Canvas Visualizer ---
  let animationFrameId = null;
  let particles = [];
  let currentRenderStyle = 'neural-flux';

  function initParticles(style) {
    particles = [];
    currentRenderStyle = style;
    const count = 70;
    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 3 + 1.5,
        hue: (Math.random() * 60 + 240) % 360,
        alpha: Math.random() * 0.6 + 0.3
      });
    }
  }

  function renderCanvasFrame() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Dark trails backdrop
    ctx.fillStyle = 'rgba(12, 14, 24, 0.22)';
    ctx.fillRect(0, 0, w, h);

    // Style-specific drawing
    if (currentRenderStyle === 'neural-flux') {
      // Flowing glowing nodes and connecting synapsis lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 90) * 0.4;
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 60%, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    } else if (currentRenderStyle === 'vector-synth') {
      // Synthwave perspective grid & neon sun
      const time = Date.now() * 0.002;
      ctx.fillStyle = '#090915';
      ctx.fillRect(0, 0, w, h);

      // Sun
      const grad = ctx.createLinearGradient(0, 50, 0, 200);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#f59e0b');
      ctx.beginPath();
      ctx.arc(w / 2, 150, 75, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#f43f5e';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Horizon line
      const horizon = 220;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // Perspective grid lines
      const vanishingX = w / 2;
      for (let x = -w; x <= w * 2; x += 60) {
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizon);
        ctx.lineTo(x, h);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.stroke();
      }

      // Horizontal moving lines
      const speed = (Date.now() * 0.05) % 40;
      for (let y = horizon; y <= h; y += 15 + (y - horizon) * 0.25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
        ctx.stroke();
      }
    } else {
      // Holographic / Cinematic Wave
      const time = Date.now() * 0.003;
      ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        const hue = (200 + k * 35) % 360;
        ctx.strokeStyle = `hsla(${hue}, 85%, 65%, 0.7)`;
        for (let x = 0; x <= w; x += 10) {
          const y = h / 2 + Math.sin(x * 0.015 + time + k) * (40 + k * 8) + Math.cos(x * 0.02 - time) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    animationFrameId = requestAnimationFrame(renderCanvasFrame);
  }

  if (canvas) {
    initParticles('neural-flux');
    renderCanvasFrame();
  }

  // --- Render Projects Grid ---
  function renderProjects() {
    const query = searchInput.value.trim().toLowerCase();
    
    const filtered = projects.filter(p => {
      const matchesFilter = currentFilter === 'all' || p.category === currentFilter;
      const matchesSearch = query === '' || 
        p.name.toLowerCase().includes(query) || 
        p.desc.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      projectsGrid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted);">
          <h3>No projects match your filter</h3>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">Try adjusting your search criteria or switch to another tab.</p>
        </div>
      `;
      return;
    }

    projectsGrid.innerHTML = filtered.map(p => {
      const catClass = `cat-${p.category}`;
      return `
        <article class="project-card glass-card" id="${p.id}">
          <div>
            <div class="project-card-header">
              <span class="project-category-badge ${catClass}">${p.category}</span>
              <span style="font-size: 0.8rem; color: #34d399; font-weight: 600;">● ${p.status}</span>
            </div>
            <h3 class="project-name">${p.name}</h3>
            <p class="project-desc">${p.desc}</p>
          </div>
          <div class="project-card-meta">
            <span class="project-stat-pill">${p.requests}</span>
            <button class="btn-card-action" onclick="window.viewProject('${p.id}')">Inspect &rarr;</button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Expose global action for buttons
  window.viewProject = function(id) {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      showToast(`Selected project: ${proj.name}`, 'info');
    }
  };

  // --- Filter Tabs Event ---
  filterTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.getAttribute('data-filter');
      renderProjects();
    }
  });

  // --- Search Input Event ---
  searchInput.addEventListener('input', () => {
    renderProjects();
  });

  // --- Steps Slider ---
  stepsSlider.addEventListener('input', (e) => {
    stepsVal.textContent = e.target.value;
  });

  // --- Surprise Me Button ---
  btnRandomPrompt.addEventListener('click', () => {
    const rand = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
    promptInput.value = rand;
    showToast('Loaded neural prompt inspiration!', 'info');
  });

  // --- Execute Generation ---
  btnGenerate.addEventListener('click', () => {
    const promptText = promptInput.value.trim();
    if (!promptText) {
      showToast('Please enter a creative prompt first.', 'info');
      return;
    }

    // Show loading overlay
    generationLoader.style.display = 'flex';
    loaderFill.style.width = '0%';
    btnGenerate.disabled = true;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      loaderFill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          generationLoader.style.display = 'none';
          btnGenerate.disabled = false;
          
          // Switch canvas style based on select
          const selectedStyle = styleSelect.value;
          initParticles(selectedStyle);

          // Update hash & latency
          const randomHash = '#' + Math.floor(Math.random()*16777215).toString(16).slice(0, 4) + '-' + Math.floor(Math.random()*16777215).toString(16).slice(0, 4);
          const compTime = Math.floor(Math.random() * 80 + 90) + 'ms';
          previewHash.textContent = randomHash;
          previewTime.textContent = compTime;

          showToast('Neural latent diffusion completed successfully!', 'success');
        }, 200);
      }
    }, 120);
  });

  // --- Theme Accent Switcher ---
  btnThemeToggle.addEventListener('click', () => {
    themes.forEach(t => document.body.classList.remove(t));
    themeIndex = (themeIndex + 1) % themes.length;
    const newTheme = themes[themeIndex];
    document.body.classList.add(newTheme);
    const colorName = newTheme.replace('theme-', '');
    showToast(`Switched theme accent to ${colorName.toUpperCase()}`, 'info');
  });

  // --- Modal Management ---
  btnQuickCreate.addEventListener('click', () => {
    projectModal.style.display = 'flex';
    document.getElementById('project-name').focus();
  });

  function closeModal() {
    projectModal.style.display = 'none';
    newProjectForm.reset();
  }

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) {
      closeModal();
    }
  });

  newProjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('project-name').value.trim();
    const category = document.getElementById('project-category-select').value;
    const desc = document.getElementById('project-description').value.trim() || 'Custom neural orchestration pipeline initiated by studio operator.';

    const newProj = {
      id: 'proj-' + Date.now(),
      name,
      category,
      desc,
      status: 'Live Endpoint',
      requests: '1.2k/day'
    };

    projects.unshift(newProj);
    renderProjects();
    closeModal();
    showToast(`Created workspace: "${name}"`, 'success');
  });

  // --- Copy Metadata Button ---
  btnCopyMeta.addEventListener('click', () => {
    const meta = `Aura Studio Payload | Hash: ${previewHash.textContent} | Model: ${styleSelect.value} | Prompt: "${promptInput.value}"`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(meta);
    }
    showToast('Copied generation payload to clipboard!', 'info');
  });

  // --- Toast Notification Helper ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Real-time telemetry subtle ticker ---
  setInterval(() => {
    if (statLatency) {
      const lat = 16 + Math.floor(Math.random() * 5);
      statLatency.textContent = lat;
    }
    if (statTokens) {
      const current = parseInt(statTokens.textContent.replace(/,/g, ''), 10);
      statTokens.textContent = (current + Math.floor(Math.random() * 25 + 5)).toLocaleString();
    }
  }, 2500);

  // Initial render
  renderProjects();
});
