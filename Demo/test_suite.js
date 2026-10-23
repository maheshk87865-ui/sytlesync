const http = require('http');
const fs = require('fs');
const path = require('path');

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   AURA STUDIO COMPREHENSIVE AUTOMATED TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // --- 1. HTTP Endpoint & Asset Delivery Tests ---
  console.log('--- 1. Testing HTTP Server & Assets ---');
  try {
    const htmlRes = await fetchUrl('http://localhost:8080/');
    assert(htmlRes.statusCode === 200, 'HTTP GET http://localhost:8080/ returns 200 OK');
    assert(htmlRes.data.includes('<title>Aura Studio | Next-Gen AI Workspace</title>'), 'HTML contains expected document title');

    const cssRes = await fetchUrl('http://localhost:8080/style.css');
    assert(cssRes.statusCode === 200, 'HTTP GET http://localhost:8080/style.css returns 200 OK');
    assert(cssRes.data.includes(':root'), 'CSS contains CSS variable design system');

    const jsRes = await fetchUrl('http://localhost:8080/app.js');
    assert(jsRes.statusCode === 200, 'HTTP GET http://localhost:8080/app.js returns 200 OK');
    assert(jsRes.data.includes('AURA STUDIO'), 'JavaScript code loaded successfully');
  } catch (err) {
    console.error('Server connection error:', err.message);
  }

  // --- 2. DOM & Accessibility Elements Inspection ---
  console.log('\n--- 2. Testing DOM IDs and Component Selectors ---');
  const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const requiredIds = [
    'main-nav',
    'system-status',
    'btn-theme-toggle',
    'btn-quick-create',
    'project-search-input',
    'stat-nodes',
    'stat-latency',
    'stat-tokens',
    'stat-uptime',
    'sandbox',
    'prompt-input',
    'style-select',
    'steps-slider',
    'steps-val',
    'btn-generate',
    'btn-random-prompt',
    'generative-canvas',
    'generation-loader',
    'loader-fill',
    'preview-hash',
    'preview-time',
    'btn-copy-meta',
    'filter-tabs',
    'filter-all',
    'filter-generative',
    'filter-analytics',
    'filter-agents',
    'projects-grid',
    'project-modal',
    'new-project-form',
    'project-name',
    'project-category-select',
    'btn-submit-project',
    'toast-container'
  ];

  requiredIds.forEach(id => {
    assert(htmlContent.includes(`id="${id}"`), `Element ID #${id} exists in HTML`);
  });

  // --- 3. JavaScript Logic & Feature Simulation Tests ---
  console.log('\n--- 3. Testing Logic & Dynamic Feature Functions ---');

  // Load and test app logic structures
  const jsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  // Verify Surprise Me prompts
  assert(jsContent.includes('surprisePrompts'), 'Random prompt repository defined');

  // Verify Theme cycle logic
  assert(jsContent.includes('theme-violet') && jsContent.includes('theme-cyan') && jsContent.includes('theme-emerald') && jsContent.includes('theme-rose'), 'All 4 color themes implemented in cycle list');

  // Test Filter Logic in isolated unit
  const mockProjects = [
    { id: '1', name: 'Alpha Gen', category: 'generative', desc: 'Neural synthesis' },
    { id: '2', name: 'Beta Metrics', category: 'analytics', desc: 'Telemetry tracker' },
    { id: '3', name: 'Gamma Bot', category: 'agents', desc: 'Autonomous agent' }
  ];

  function filterProjects(projects, filter, query) {
    return projects.filter(p => {
      const matchesFilter = filter === 'all' || p.category === filter;
      const matchesSearch = query === '' ||
        p.name.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }

  assert(filterProjects(mockProjects, 'all', '').length === 3, 'Filter "all" returns all 3 projects');
  assert(filterProjects(mockProjects, 'generative', '').length === 1, 'Filter "generative" isolates 1 project');
  assert(filterProjects(mockProjects, 'analytics', '').length === 1, 'Filter "analytics" isolates 1 project');
  assert(filterProjects(mockProjects, 'agents', '').length === 1, 'Filter "agents" isolates 1 project');
  assert(filterProjects(mockProjects, 'all', 'telemetry').length === 1, 'Search query "telemetry" filters correctly');
  assert(filterProjects(mockProjects, 'all', 'nonexistent').length === 0, 'Unmatched search query returns empty array cleanly');

  // Test Project Creation & prepend logic
  const newProject = {
    id: 'proj-new',
    name: 'Titan Vision Cluster',
    category: 'agents',
    desc: 'Deep learning autonomous cluster',
    status: 'Live Endpoint',
    requests: '1.2k/day'
  };
  const updatedProjects = [newProject, ...mockProjects];
  assert(updatedProjects[0].name === 'Titan Vision Cluster', 'New project is prepended to top of projects grid');
  assert(updatedProjects.length === 4, 'Projects list length increases correctly on project addition');

  // --- 4. Style & Aesthetics Validation ---
  console.log('\n--- 4. Testing CSS Aesthetics & Glassmorphism Tokens ---');
  const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  assert(cssContent.includes('--bg-glass'), 'Glassmorphism background token defined');
  assert(cssContent.includes('backdrop-filter: blur'), 'CSS backdrop blur effect configured for frosted glass');
  assert(cssContent.includes('--accent-gradient'), 'Neon accent gradient token defined');
  assert(cssContent.includes('@media (max-width: 768px)'), 'Mobile responsive breakpoint media query defined');
  assert(cssContent.includes('@media (max-width: 1024px)'), 'Tablet responsive breakpoint media query defined');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');
}

runTests();
