/**
 * LOST & FOUND CAMPUS PORTAL — CORE APPLICATION LOGIC
 * Fully integrated with REST backend API (Express + JSON persistence).
 * All data operations go through /api/* endpoints.
 * JWT token stored in localStorage for signed-in campus accounts.
 */

// ==========================================================================
// 1. API CLIENT & CONSTANTS
// ==========================================================================

const API_BASE = '/api';

const PRESET_IMAGES = [
  { name: "Casio Calculator",       url: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=600&q=80" },
  { name: "AirPods / Earbuds",      url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80" },
  { name: "College RFID ID & Lanyard", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
  { name: "Notebook & Pen",         url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80" },
  { name: "Black Leather Wallet",   url: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80" },
  { name: "Keys with Keychain",     url: "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80" },
  { name: "Laptop Backpack",        url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80" },
  { name: "Sports Water Bottle",    url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80" },
  { name: "Reading Glasses",        url: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80" },
  { name: "Apple MacBook",          url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80" }
];

const CAMPUS_ZONES_DATA = [
  { name: "Central Library",           icon: "fa-book-open-reader", custodian: "Dr. Anita Desai (Library Head)",        office: "1st Floor Circulation Desk",        desc: "Quiet reading halls, book stacks, digital cubicles, and circulation reception.", contact: "library.lostdesk@college.edu" },
  { name: "Science & Tech Block",      icon: "fa-atom",             custodian: "Prof. Rajesh Sharma (Faculty Custodian)", office: "Science Block Cabin 104",            desc: "Physics, Chemistry, and Nanotech laboratories, faculty chambers, and lecture galleries.", contact: "r.sharma@college.edu" },
  { name: "Engineering Block",         icon: "fa-gears",            custodian: "Prof. N. Kulkarni (Dean Academics)",     office: "Engineering Room E-201",             desc: "Workshop machinery wings, CAD laboratories, drawing halls, and student seminar rooms.", contact: "engg.custody@college.edu" },
  { name: "Main Cafeteria",            icon: "fa-utensils",         custodian: "Chief Officer Vikram (Campus Security)", office: "Gatehouse Custody Room 102",         desc: "Food court counters, dining halls, student plaza, and outdoor beverage patios.", contact: "security.admin@college.edu" },
  { name: "Sports Pavilion & Ground",  icon: "fa-volleyball",       custodian: "Prof. K. Sundaram (Athletics Director)", office: "Sports Complex Office S-04",         desc: "Football arena, basketball courts, gymnasium lockers, and tennis lawn pavilion.", contact: "sports.desk@college.edu" },
  { name: "Auditorium & Seminar Halls",icon: "fa-microphone-lines", custodian: "Cultural Affairs Directorate",          office: "Main Auditorium Greenroom 02",       desc: "1,200 seat main hall, guest lounges, projection rooms, and rehearsal galleries.", contact: "events.admin@college.edu" },
  { name: "Computer Labs (1-5)",       icon: "fa-laptop-code",      custodian: "IT Systems Administrator",              office: "Server Room Lab 1",                  desc: "High-spec computing centers, AI/ML clusters, and software development testing labs.", contact: "itdesk@college.edu" },
  { name: "Hostel & Common Room",      icon: "fa-bed",              custodian: "Chief Warden Office",                   office: "Hostel Block A Entry Desk",          desc: "Student dormitories, laundry areas, indoor games room, and mess corridors.", contact: "warden.office@college.edu" }
];

// ==========================================================================
// 2. APPLICATION STATE
// ==========================================================================

const State = {
  items:         [],
  history:       [],
  claims:        [],
  currentRole:   'student',
  currentUser:   null,
  token:         null,
  currentView:   'browse',
  activeCategory: 'all',
  searchQuery:   '',
  locationFilter:'',
  statusFilter:  'all',
  dateFilter:    'all',
  sortFilter:    'newest',
  selectedImageForPost: PRESET_IMAGES[0].url,
  isLoading:     false
};

// ==========================================================================
// 3. API HELPER
// ==========================================================================

async function apiRequest(method, endpoint, body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (State.token)  headers['Authorization'] = `Bearer ${State.token}`;

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    throw err;
  }
}

const api = {
  get:    (ep)           => apiRequest('GET',    ep),
  post:   (ep, body)     => apiRequest('POST',   ep, body),
  put:    (ep, body)     => apiRequest('PUT',    ep, body),
  delete: (ep)           => apiRequest('DELETE', ep),
  upload: (ep, formData) => apiRequest('POST',   ep, formData, true)
};

// ==========================================================================
// 4. SESSION / AUTH
// ==========================================================================

function loadSession() {
  const storedToken = localStorage.getItem('lostfound_jwt');
  const storedUser  = localStorage.getItem('lostfound_user');
  if (storedToken && storedUser) {
    State.token       = storedToken;
    State.currentUser = JSON.parse(storedUser);
    State.currentRole = State.currentUser.role || 'student';
  }
  const storedTheme = localStorage.getItem('lostfound_theme') || 'light';
  applyTheme(storedTheme);
}

function saveSession(token, teacher) {
  State.token       = token;
  State.currentUser = teacher;
  State.currentRole = teacher.role || 'student';
  localStorage.setItem('lostfound_jwt',  token);
  localStorage.setItem('lostfound_user', JSON.stringify(teacher));
}

function clearSession() {
  State.token       = null;
  State.currentUser = null;
  State.currentRole = 'student';
  localStorage.removeItem('lostfound_jwt');
  localStorage.removeItem('lostfound_user');
}

// ==========================================================================
// 5. DATA LOADERS (API calls)
// ==========================================================================

async function loadItems() {
  try {
    const params = new URLSearchParams();
    if (State.activeCategory !== 'all') params.set('category', State.activeCategory);
    if (State.locationFilter)           params.set('zone',     State.locationFilter);
    if (State.statusFilter !== 'all')   params.set('status',   State.statusFilter);
    if (State.searchQuery.trim())       params.set('q',        State.searchQuery.trim());
    if (State.dateFilter !== 'all')     params.set('dateRange',State.dateFilter);
    if (State.sortFilter)               params.set('sort',     State.sortFilter);

    const query = params.toString() ? `?${params}` : '';
    const data  = await api.get(`/items${query}`);
    State.items = data.items || [];
  } catch (err) {
    console.error('[loadItems]', err);
    showToast('Failed to load items from server.', 'error');
  }
}

async function loadHistory() {
  try {
    const histSearch = document.getElementById('historySearchInput');
    const histCat    = document.getElementById('historyCategoryFilter');
    const params     = new URLSearchParams();
    if (histSearch && histSearch.value.trim()) params.set('q',        histSearch.value.trim());
    if (histCat    && histCat.value !== 'all') params.set('category', histCat.value);

    const query = params.toString() ? `?${params}` : '';
    const data  = await api.get(`/history${query}`);
    State.history = data.history || [];
  } catch (err) {
    console.error('[loadHistory]', err);
    showToast('Failed to load return history.', 'error');
  }
}

async function loadStats() {
  try {
    const data = await api.get('/stats');
    if (data.stats) {
      const s = data.stats;
      const elActive   = document.getElementById('statActiveItems');
      const elReturned = document.getElementById('statReturnedItems');
      const elBadge    = document.getElementById('historyCounterBadge');
      const elHistTot  = document.getElementById('historyTotalReturned');
      const elPending  = document.getElementById('adminPendingCount');
      const elZones    = document.getElementById('statCampusZones');
      if (elActive)   elActive.textContent   = s.activeItems;
      if (elReturned) elReturned.textContent = s.totalReturned;
      if (elBadge)    elBadge.textContent    = s.totalReturned;
      if (elHistTot)  elHistTot.textContent  = s.totalReturned;
      if (elPending)  elPending.textContent  = s.pendingClaims;
      if (elZones)    elZones.textContent    = CAMPUS_ZONES_DATA.length;
    }
  } catch (err) {
    console.error('[loadStats]', err);
  }
}

// ==========================================================================
// 6. UI RENDERING
// ==========================================================================

function renderAuthBox() {
  const authBox    = document.getElementById('authBox');
  const adminBanner= document.getElementById('adminTopBanner');
  const adminGreeting = document.getElementById('adminGreetingText');

  if (State.currentRole === 'teacher' && State.currentUser) {
    authBox.innerHTML = `
      <button class="user-profile-pill" id="teacherProfileBtn" title="Open faculty menu" aria-expanded="false">
        <div class="user-avatar-circle"><i class="fa-solid fa-chalkboard-user"></i></div>
        <div class="user-meta-info">
          <span class="user-name-label">${escapeHtml(State.currentUser.name.split(' ').slice(-1)[0])}</span>
          <span class="user-role-label">Faculty Custodian</span>
        </div>
      </button>
      <div class="account-menu hidden" id="facultyAccountMenu">
        <button type="button" class="account-menu-item" id="facultyClaimsBtn">
          <i class="fa-solid fa-inbox"></i><span>Review Pending Claims</span>
        </button>
        <button type="button" class="account-menu-item" id="facultyPostBtn">
          <i class="fa-solid fa-plus"></i><span>Post New Found Item</span>
        </button>
        <button type="button" class="account-menu-item account-menu-danger" id="facultyLogoutBtn">
          <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
        </button>
      </div>`;
    adminBanner.classList.remove('hidden');
    if (adminGreeting) {
      adminGreeting.innerHTML = `Logged in as: <strong>${escapeHtml(State.currentUser.name)}</strong> (${escapeHtml(State.currentUser.dept)})`;
    }
  } else if (State.currentRole === 'student' && State.currentUser) {
    authBox.innerHTML = `
      <button class="user-profile-pill" id="studentProfileBtn" title="Open account menu" aria-expanded="false">
        <div class="user-avatar-circle"><i class="fa-solid fa-user"></i></div>
        <div class="user-meta-info">
          <span class="user-name-label">${escapeHtml(State.currentUser.name.split(' ').slice(-1)[0])}</span>
          <span class="user-role-label">Student Contributor</span>
        </div>
      </button>
      <div class="account-menu hidden" id="studentAccountMenu">
        <button type="button" class="account-menu-item" id="studentLogoutBtn">
          <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
        </button>
      </div>`;
    adminBanner.classList.add('hidden');
  } else {
    authBox.innerHTML = `
      <button class="btn btn-outline btn-sm" id="headerLoginBtn">
        <i class="fa-solid fa-right-to-bracket"></i><span>Login</span>
      </button>`;
    adminBanner.classList.add('hidden');
  }

  const loginBtn = document.getElementById('headerLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => openModal('loginModal'));

  const profileBtn = document.getElementById('teacherProfileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = document.getElementById('facultyAccountMenu');
      const isOpen = menu && !menu.classList.contains('hidden');
      if (menu) menu.classList.toggle('hidden', isOpen);
      profileBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  const facultyClaimsBtn = document.getElementById('facultyClaimsBtn');
  if (facultyClaimsBtn) facultyClaimsBtn.addEventListener('click', () => {
    document.getElementById('facultyAccountMenu').classList.add('hidden');
    openAdminClaimsManagerModal();
  });

  const facultyPostBtn = document.getElementById('facultyPostBtn');
  if (facultyPostBtn) facultyPostBtn.addEventListener('click', () => {
    document.getElementById('facultyAccountMenu').classList.add('hidden');
    openPostItemModal();
  });

  const facultyLogoutBtn = document.getElementById('facultyLogoutBtn');
  if (facultyLogoutBtn) facultyLogoutBtn.addEventListener('click', handleTeacherLogout);

  const studentProfileBtn = document.getElementById('studentProfileBtn');
  if (studentProfileBtn) {
    studentProfileBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = document.getElementById('studentAccountMenu');
      const isOpen = menu && !menu.classList.contains('hidden');
      if (menu) menu.classList.toggle('hidden', isOpen);
      studentProfileBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  const studentLogoutBtn = document.getElementById('studentLogoutBtn');
  if (studentLogoutBtn) studentLogoutBtn.addEventListener('click', handleTeacherLogout);

  if (!document.body.dataset.accountMenuListener) {
    document.addEventListener('click', (event) => {
      [
        ['studentAccountMenu', 'studentProfileBtn'],
        ['facultyAccountMenu', 'teacherProfileBtn']
      ].forEach(([menuId, profileId]) => {
        const menu = document.getElementById(menuId);
        const profile = document.getElementById(profileId);
        if (menu && profile && !menu.contains(event.target) && !profile.contains(event.target)) {
          menu.classList.add('hidden');
          profile.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.body.dataset.accountMenuListener = 'true';
  }
}

async function renderItemsGrid() {
  const grid       = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');
  const countEl    = document.getElementById('filterResultCount');
  const chips      = document.getElementById('activeFilterChips');

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Loading items...</p></div>`;
  emptyState.classList.add('hidden');

  await loadItems();

  const items = State.items;
  if (countEl) countEl.textContent = items.length;

  // Render active filter chips
  if (chips) {
    chips.innerHTML = '';
    if (State.activeCategory !== 'all') chips.innerHTML += `<span class="tag-pill">${escapeHtml(State.activeCategory)} <i class="fa-solid fa-xmark remove-chip" data-reset="category"></i></span>`;
    if (State.locationFilter)           chips.innerHTML += `<span class="tag-pill">${escapeHtml(State.locationFilter)} <i class="fa-solid fa-xmark remove-chip" data-reset="location"></i></span>`;
    if (State.searchQuery)              chips.innerHTML += `<span class="tag-pill">"${escapeHtml(State.searchQuery)}" <i class="fa-solid fa-xmark remove-chip" data-reset="search"></i></span>`;
    chips.querySelectorAll('.remove-chip').forEach(btn => {
      btn.addEventListener('click', e => {
        const t = e.currentTarget.getAttribute('data-reset');
        if (t === 'category') selectCategory('all');
        if (t === 'location') { State.locationFilter = ''; document.getElementById('heroLocationFilter').value = ''; renderItemsGrid(); }
        if (t === 'search')   { State.searchQuery = ''; document.getElementById('mainSearchInput').value = ''; document.getElementById('clearSearchBtn').classList.add('hidden'); renderItemsGrid(); }
      });
    });
  }

  if (items.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  grid.innerHTML = items.map(item => {
    let statusClass = 'status-available', statusIcon = 'fa-check';
    if (item.status === 'Under Verification') { statusClass = 'status-review';  statusIcon = 'fa-hourglass-half'; }
    if (item.status === 'Ready for Pickup')   { statusClass = 'status-pickup';  statusIcon = 'fa-bell'; }

    return `
      <article class="item-card" data-item-id="${item.id}">
        <div class="item-card-image-box">
          <span class="item-status-pill ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${item.status}</span>
          <span class="item-category-tag">${escapeHtml(item.category)}</span>
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'">
        </div>
        <div class="item-card-body">
          <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
          <p class="item-card-desc">${escapeHtml(item.publicDesc)}</p>
          <div class="item-meta-list">
            <div class="meta-row"><i class="fa-solid fa-location-dot"></i><span>Zone: <strong class="meta-highlight">${escapeHtml(item.locationZone)}</strong> (${escapeHtml(item.exactLocation)})</span></div>
            <div class="meta-row"><i class="fa-regular fa-calendar-days"></i><span>Found: ${formatHumanDate(item.dateFound)}</span></div>
            <div class="meta-row"><i class="fa-solid fa-user-shield"></i><span>Custodian: <strong>${escapeHtml(item.facultyCustodian)}</strong></span></div>
          </div>
          <div class="item-card-footer">
            <button class="btn btn-outline btn-sm view-item-details-btn" data-id="${item.id}"><i class="fa-solid fa-circle-info"></i> Details</button>
            <button class="btn btn-primary btn-sm claim-item-btn" data-id="${item.id}"><i class="fa-solid fa-hand-holding-heart"></i> Claim Item</button>
            ${State.currentRole === 'teacher' ? `<button class="btn btn-success btn-sm admin-return-quick-btn" data-id="${item.id}" title="Mark returned"><i class="fa-solid fa-check-double"></i> Return</button>` : ''}
          </div>
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('.view-item-details-btn').forEach(b => b.addEventListener('click', () => showItemDetails(b.getAttribute('data-id'))));
  grid.querySelectorAll('.claim-item-btn').forEach(b        => b.addEventListener('click', () => openClaimModal(b.getAttribute('data-id'))));
  grid.querySelectorAll('.admin-return-quick-btn').forEach(b=> b.addEventListener('click', () => openRecordReturnModal(b.getAttribute('data-id'))));
}

async function renderHistoryGrid() {
  const grid       = document.getElementById('historyGrid');
  const emptyState = document.getElementById('historyEmptyState');

  grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Loading history...</p></div>`;
  emptyState.classList.add('hidden');

  await loadHistory();
  const history = State.history;

  if (history.length === 0) { grid.innerHTML = ''; emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden');

  grid.innerHTML = history.map(item => `
    <div class="history-card">
      <div class="history-card-top">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="history-thumb"
             onerror="this.src='https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'">
        <div class="history-card-details">
          <span class="history-status-tag"><i class="fa-solid fa-circle-check"></i> Safely Returned to Owner</span>
          <h4 class="history-item-title">${escapeHtml(item.title)}</h4>
          <span class="history-category-label">${escapeHtml(item.category)} &bull; ${escapeHtml(item.locationFound || 'Campus Area')}</span>
        </div>
      </div>
      <div class="history-timeline-box">
        <div class="timeline-row"><span class="label"><i class="fa-regular fa-calendar-check"></i> Date Returned:</span><span class="val">${formatHumanDate(item.dateReturned)}</span></div>
        <div class="timeline-row"><span class="label"><i class="fa-solid fa-user-graduate"></i> Recipient:</span><span class="val">${escapeHtml(item.studentName)} (${escapeHtml(item.studentRollMasked)})</span></div>
        <div class="timeline-row"><span class="label"><i class="fa-solid fa-chalkboard-user"></i> Verified By:</span><span class="val">${escapeHtml(item.facultyCustodian)}</span></div>
      </div>
      <div class="history-handoff-note"><strong><i class="fa-solid fa-signature"></i> Verification Record:</strong> ${escapeHtml(item.handoffNotes)}</div>
    </div>`).join('');
}

function renderCampusZones() {
  const container = document.getElementById('campusZonesGrid');
  if (!container) return;

  container.innerHTML = CAMPUS_ZONES_DATA.map(zone => {
    const count = State.items.filter(i => i.locationZone === zone.name).length;
    return `
      <div class="zone-card">
        <div class="zone-card-top">
          <div class="zone-icon-box"><i class="fa-solid ${zone.icon}"></i></div>
          <span class="zone-items-count">${count} Item${count === 1 ? '' : 's'} Recovered</span>
        </div>
        <h3 class="zone-title">${escapeHtml(zone.name)}</h3>
        <p class="zone-desc">${escapeHtml(zone.desc)}</p>
        <div class="zone-custodian-box">
          <div class="custodian-avatar"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="custodian-info">
            <span class="custodian-name">${escapeHtml(zone.custodian)}</span>
            <span class="custodian-role"><i class="fa-solid fa-building"></i> ${escapeHtml(zone.office)}</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm filter-by-zone-btn" data-zone="${escapeHtml(zone.name)}">
          <i class="fa-solid fa-filter"></i> View Belongings from This Zone
        </button>
      </div>`;
  }).join('');

  container.querySelectorAll('.filter-by-zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.locationFilter = btn.getAttribute('data-zone');
      const heroLoc = document.getElementById('heroLocationFilter');
      if (heroLoc) heroLoc.value = State.locationFilter;
      switchView('browse');
    });
  });
}

function renderPresetImagesStrip() {
  const container = document.getElementById('presetImagesContainer');
  if (!container) return;
  container.innerHTML = PRESET_IMAGES.map((p, i) => `
    <button type="button" class="preset-thumb-btn ${i === 0 ? 'selected' : ''}" data-url="${p.url}" title="${p.name}">
      <img src="${p.url}" alt="${p.name}">
    </button>`).join('');

  container.querySelectorAll('.preset-thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.preset-thumb-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      State.selectedImageForPost = btn.getAttribute('data-url');
      const previewCont = document.getElementById('imagePreviewContainer');
      const previewImg  = document.getElementById('imagePreviewImg');
      const dropzone    = document.getElementById('imageUploadDropzone');
      previewImg.src = State.selectedImageForPost;
      previewCont.classList.remove('hidden');
      dropzone.classList.add('hidden');
    });
  });
}

// ==========================================================================
// 7. MODALS & ACTION FLOWS
// ==========================================================================

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('hidden'); document.body.style.overflow = 'auto'; }
}

// Item Details
async function showItemDetails(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;

  // If teacher, fetch full item (with secretDetails) from server
  let fullItem = item;
  if (State.currentRole === 'teacher') {
    try {
      const data = await api.get(`/items/${itemId}`);
      fullItem = data.item || item;
    } catch (_) { /* use cached */ }
  }

  const isTeacher = State.currentRole === 'teacher';
  const contentBox = document.getElementById('itemDetailModalContent');

  contentBox.innerHTML = `
    <button class="modal-close-btn" id="closeDetailModalBtn"><i class="fa-solid fa-xmark"></i></button>
    <div class="item-detail-view">
      <div class="form-row">
        <div class="detail-image-box" style="flex:1;max-width:320px;border-radius:12px;overflow:hidden;height:260px;">
          <img src="${escapeHtml(fullItem.imageUrl)}" alt="${escapeHtml(fullItem.title)}" style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div class="detail-main-info" style="flex:1.5;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span class="item-status-pill status-available">${fullItem.status}</span>
            <span class="tag-pill">${escapeHtml(fullItem.category)}</span>
            <span class="tag-pill" style="font-family:monospace;">${fullItem.id}</span>
          </div>
          <h2 style="font-size:1.5rem;font-weight:800;">${escapeHtml(fullItem.title)}</h2>
          <p style="color:var(--text-muted);font-size:0.92rem;line-height:1.5;">${escapeHtml(fullItem.publicDesc)}</p>
          <div style="background:var(--bg-secondary);padding:14px;border-radius:8px;font-size:0.85rem;display:flex;flex-direction:column;gap:8px;">
            <div><i class="fa-solid fa-location-dot" style="color:var(--brand-primary);width:20px;"></i> <strong>Found At:</strong> ${escapeHtml(fullItem.locationZone)} (${escapeHtml(fullItem.exactLocation)})</div>
            <div><i class="fa-regular fa-clock" style="color:var(--brand-primary);width:20px;"></i> <strong>Date &amp; Time Found:</strong> ${formatHumanDate(fullItem.dateFound)}</div>
            <div><i class="fa-solid fa-user-shield" style="color:var(--brand-primary);width:20px;"></i> <strong>Faculty Custodian:</strong> ${escapeHtml(fullItem.facultyCustodian)}</div>
            <div><i class="fa-solid fa-building" style="color:var(--brand-primary);width:20px;"></i> <strong>Claim Pickup Room:</strong> ${escapeHtml(fullItem.custodyRoom || 'Main Security Desk')}</div>
          </div>
        </div>
      </div>
      <div style="margin-top:20px;">
        ${isTeacher && fullItem.secretDetails ? `
          <div class="confidential-box">
            <div class="confidential-badge"><i class="fa-solid fa-shield-halved"></i> FACULTY CONFIDENTIAL RECORD (HIDDEN FROM STUDENTS)</div>
            <p style="font-size:0.92rem;color:var(--text-main);font-weight:500;">${escapeHtml(fullItem.secretDetails)}</p>
            <span class="helper-text">Compare this with student's claim details before handing over the item.</span>
          </div>` : `
          <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px;border:1px dashed var(--border-card);">
            <i class="fa-solid fa-lock" style="font-size:1.4rem;color:var(--brand-primary);"></i>
            <div>
              <strong style="font-size:0.88rem;">Secret Verification Security Active</strong>
              <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">Unique marks and details are held confidentially by faculty. You will be prompted to describe them when submitting a claim.</p>
            </div>
          </div>`}
      </div>
      <div class="modal-footer-actions" style="margin-top:24px;">
        <button class="btn btn-outline" id="closeDetailActionBtn">Close</button>
        <button class="btn btn-primary" id="detailClaimActionBtn"><i class="fa-solid fa-hand-holding-heart"></i> Claim This Belonging</button>
        ${isTeacher ? `<button class="btn btn-success" id="detailReturnActionBtn"><i class="fa-solid fa-check-double"></i> Mark Returned to Student</button>` : ''}
      </div>
    </div>`;

  openModal('itemDetailModal');
  document.getElementById('closeDetailModalBtn').addEventListener('click',  () => closeModal('itemDetailModal'));
  document.getElementById('closeDetailActionBtn').addEventListener('click', () => closeModal('itemDetailModal'));
  document.getElementById('detailClaimActionBtn').addEventListener('click', () => { closeModal('itemDetailModal'); openClaimModal(fullItem.id); });
  const retBtn = document.getElementById('detailReturnActionBtn');
  if (retBtn) retBtn.addEventListener('click', () => { closeModal('itemDetailModal'); openRecordReturnModal(fullItem.id); });
}

// Student Claim Flow
function openClaimModal(itemId) {
  const item = State.items.find(i => i.id === itemId);
  if (!item) return;
  document.getElementById('studentClaimForm').reset();
  document.getElementById('claimItemId').value = item.id;
  document.getElementById('claimItemSummary').innerHTML = `
    <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="claim-item-thumb">
    <div class="claim-item-details">
      <h4>${escapeHtml(item.title)}</h4>
      <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.locationZone)} &bull; Custodian: ${escapeHtml(item.facultyCustodian)}</p>
    </div>`;
  openModal('claimModal');
}

async function handleClaimSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitClaimBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  try {
    const body = new FormData();
    body.append('itemId', document.getElementById('claimItemId').value);
    body.append('studentName', document.getElementById('studentNameInput').value.trim());
    body.append('studentRoll', document.getElementById('studentRollInput').value.trim());
    body.append('studentEmail', document.getElementById('studentEmailInput').value.trim());
    body.append('studentPhone', document.getElementById('studentPhoneInput').value.trim());
    body.append('studentProof', document.getElementById('studentProofInput').value.trim());

    const proofImage = document.getElementById('claimProofImageInput').files[0];
    if (proofImage) body.append('proofImage', proofImage);

    const data = await api.upload('/claims', body);
    closeModal('claimModal');
    showToast(data.message, 'success');

    // Auto-switch to claim tracking view
    document.getElementById('trackClaimInput').value = data.claimId;
    switchView('claims');
    await trackClaimSearch(data.claimId);

    // Refresh items grid
    await renderItemsGrid();
    await loadStats();
  } catch (err) {
    showToast(err.message || 'Failed to submit claim.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Ownership Claim';
  }
}

// Teacher Login
async function handleTeacherLogin(e) {
  e.preventDefault();
  const btn      = document.getElementById('loginSubmitBtn');
  const errorMsg = document.getElementById('loginErrorMsg');
  btn.disabled   = true;
  btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
  errorMsg.classList.add('hidden');

  try {
    const email    = document.getElementById('teacherEmailInput').value.trim();
    const password = document.getElementById('teacherPasswordInput').value.trim();

    const data = await api.post('/auth/login', { email, password });
    saveSession(data.token, data.teacher);

    closeModal('loginModal');
    renderAuthBox();
    await renderItemsGrid();
    await loadStats();
    showToast(data.message, 'success');
  } catch (err) {
    errorMsg.textContent = err.message || 'Login failed.';
    errorMsg.classList.remove('hidden');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Authenticate &amp; Sign In';
  }
}

async function handleTeacherLogout() {
  const wasStudent = State.currentRole === 'student';
  clearSession();
  renderAuthBox();
  await renderItemsGrid();
  await loadStats();
  showToast(wasStudent ? 'Student session signed out.' : 'Faculty session signed out. Switched to Student public view.', 'info');
}

// Authenticated users can post found items; faculty-only actions remain protected.
function openPostItemModal() {
  if (!State.token || !State.currentUser) {
    showToast('Please sign in as a student or faculty member to post a found item.', 'error');
    openModal('loginModal');
    return;
  }
  document.getElementById('postItemForm').reset();
  document.getElementById('itemFacultyNameInput').value = State.currentUser.name;
  document.getElementById('itemCustodyRoomInput').value = State.currentUser.custodyRoom || '';
  const now     = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('itemFoundDateInput').value   = localIso;
  State.selectedImageForPost = PRESET_IMAGES[0].url;
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('imageUploadDropzone').classList.remove('hidden');
  renderPresetImagesStrip();
  openModal('postItemModal');
}

async function handlePostItemSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitPostItemBtn');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

  try {
    const body = {
      title:         document.getElementById('itemTitleInput').value.trim(),
      category:      document.getElementById('itemCategorySelect').value,
      locationZone:  document.getElementById('itemZoneSelect').value,
      exactLocation: document.getElementById('itemExactLocationInput').value.trim(),
      dateFound:     document.getElementById('itemFoundDateInput').value,
      imageUrl:      State.selectedImageForPost || PRESET_IMAGES[0].url,
      publicDesc:    document.getElementById('itemPublicDescInput').value.trim(),
      secretDetails: document.getElementById('itemSecretDetailsInput').value.trim(),
      custodyRoom:   document.getElementById('itemCustodyRoomInput').value.trim()
    };

    const data = await api.post('/items', body);
    closeModal('postItemModal');
    showToast(`"${body.title}" published to campus portal!`, 'success');
    await renderItemsGrid();
    renderCampusZones();
    await loadStats();
  } catch (err) {
    showToast(err.message || 'Failed to publish item.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Publish Item to Campus Portal';
  }
}

// Admin Claims Manager
async function openAdminClaimsManagerModal() {
  const container = document.getElementById('adminClaimsList');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem"></i></div>`;
  openModal('adminClaimsManagerModal');

  try {
    const data = await api.get('/claims/all');
    State.claims = data.claims || [];
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Failed to load claims: ${escapeHtml(err.message)}</p></div>`;
    return;
  }

  if (State.claims.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
        <h3>No Student Claims Submitted Yet</h3>
        <p>When students submit ownership claims they will appear here.</p>
      </div>`;
    return;
  }

  // Get items to fetch secret records
  let allItems = [];
  try { const d = await api.get('/items'); allItems = d.items || []; } catch (_) {}

  container.innerHTML = State.claims.map(claim => {
    const itemFull    = allItems.find(i => i.id === claim.itemId);
    const secretRecord = itemFull ? (itemFull.secretDetails || 'Record not available (item may be returned).') : 'Item not found in active list.';

    return `
      <div class="admin-claim-card" data-claim-id="${claim.claimId}">
        <div class="admin-claim-head">
          <div class="claimant-profile">
            <div class="claimant-avatar"><i class="fa-solid fa-user-graduate"></i></div>
            <div>
              <h4 style="margin:0;font-size:1.05rem;">${escapeHtml(claim.studentName)} (${escapeHtml(claim.studentRoll)})</h4>
              <p style="margin:0;font-size:0.8rem;color:var(--text-muted);">
                <i class="fa-solid fa-envelope"></i> ${escapeHtml(claim.studentEmail)} &bull;
                <i class="fa-solid fa-phone"></i> ${escapeHtml(claim.studentPhone || '—')}
              </p>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="claim-id-badge">${claim.claimId}</span>
            <span class="tag-pill">${claim.status}</span>
          </div>
        </div>
        <div style="font-size:0.9rem;font-weight:700;color:var(--brand-primary);">
          <i class="fa-solid fa-box"></i> Item: ${escapeHtml(claim.itemTitle)} (${claim.itemId})
        </div>
        <div class="claim-comparison-box">
          <div class="comparison-col">
            <h5><i class="fa-solid fa-user-pen"></i> Student's Submitted Proof:</h5>
            <p>${escapeHtml(claim.studentProof)}</p>
            ${claim.proofImageUrl ? `
              <a class="claim-proof-image-link" href="${escapeHtml(claim.proofImageUrl)}" target="_blank" rel="noopener noreferrer">
                <img class="claim-proof-image" src="${escapeHtml(claim.proofImageUrl)}" alt="Student ownership proof image">
                <span><i class="fa-solid fa-arrow-up-right-from-square"></i> Open full-size proof image</span>
              </a>` : `
              <span class="helper-text"><i class="fa-solid fa-image"></i> No supporting image uploaded.</span>`}
          </div>
          <div class="comparison-col" style="background:rgba(245,158,11,0.08);padding:10px;border-radius:6px;">
            <h5 style="color:#b45309;"><i class="fa-solid fa-key"></i> Secret Faculty Custody Record:</h5>
            <p style="color:var(--text-main);font-weight:500;">${escapeHtml(secretRecord)}</p>
          </div>
        </div>
        <div class="admin-claim-actions">
          ${claim.status !== 'Approved for Pickup' && !claim.status.includes('Returned') && claim.status !== 'Rejected' ? `
            <button class="btn btn-outline btn-sm approve-claim-btn" data-claim-id="${claim.claimId}">
              <i class="fa-solid fa-check"></i> Approve for Pickup
            </button>
            <button class="btn btn-danger-soft btn-sm reject-claim-btn" data-claim-id="${claim.claimId}">
              <i class="fa-solid fa-xmark"></i> Reject Claim
            </button>` :
            claim.status === 'Approved for Pickup' ? `<span style="font-size:0.82rem;color:var(--color-success);font-weight:600;"><i class="fa-solid fa-circle-check"></i> Approved for Student Pickup</span>` :
            claim.status === 'Rejected' ? `<span style="font-size:0.82rem;color:#ef4444;font-weight:600;"><i class="fa-solid fa-ban"></i> Rejected</span>` :
            `<span style="font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-handshake"></i> ${claim.status}</span>`
          }
          ${!claim.status.includes('Returned') && claim.status !== 'Rejected' ? `
            <button class="btn btn-success btn-sm finalize-return-btn" data-claim-id="${claim.claimId}" data-item-id="${claim.itemId}">
              <i class="fa-solid fa-handshake"></i> Handover &amp; Archive
            </button>` : ''}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.approve-claim-btn').forEach(b => b.addEventListener('click', () => approveStudentClaim(b.getAttribute('data-claim-id'))));
  container.querySelectorAll('.reject-claim-btn').forEach(b  => b.addEventListener('click', () => rejectStudentClaim(b.getAttribute('data-claim-id'))));
  container.querySelectorAll('.finalize-return-btn').forEach(b => {
    b.addEventListener('click', () => {
      closeModal('adminClaimsManagerModal');
      openRecordReturnModal(b.getAttribute('data-item-id'), b.getAttribute('data-claim-id'));
    });
  });
}

async function approveStudentClaim(claimId) {
  try {
    const data = await api.put(`/claims/${claimId}/approve`, {});
    showToast(`Claim ${claimId} approved! Student notified for physical collection.`, 'success');
    await openAdminClaimsManagerModal();
    await renderItemsGrid();
    await loadStats();
  } catch (err) {
    showToast(err.message || 'Failed to approve claim.', 'error');
  }
}

async function rejectStudentClaim(claimId) {
  const reason = prompt('Enter reason for rejection (optional):') || '';
  try {
    await api.put(`/claims/${claimId}/reject`, { reason });
    showToast(`Claim ${claimId} rejected.`, 'info');
    await openAdminClaimsManagerModal();
    await renderItemsGrid();
    await loadStats();
  } catch (err) {
    showToast(err.message || 'Failed to reject claim.', 'error');
  }
}

// Record Return / Handover Modal
async function openRecordReturnModal(itemId, claimId) {
  if (State.currentRole !== 'teacher') {
    showToast('Faculty sign-in required to mark items as returned.', 'error');
    openModal('loginModal');
    return;
  }

  // Find item in current state or fetch fresh
  let item = State.items.find(i => i.id === itemId);
  if (!item) {
    try { const d = await api.get(`/items/${itemId}`); item = d.item; } catch (_) {}
  }
  if (!item) { showToast('Item not found.', 'error'); return; }

  // Try to find linked claim
  let claim = null;
  if (claimId) {
    try {
      const d = await api.get(`/claims?q=${encodeURIComponent(claimId)}`);
      claim = (d.claims || []).find(c => c.claimId === claimId) || null;
    } catch (_) {}
  }

  document.getElementById('returnItemId').value   = itemId;
  document.getElementById('returnClaimId').value  = claimId || '';

  document.getElementById('returnItemPreview').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:14px;">
      <img src="${escapeHtml(item.imageUrl)}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;">
      <div>
        <h4 style="margin:0;font-size:0.95rem;">${escapeHtml(item.title)}</h4>
        <p style="margin:0;font-size:0.78rem;color:var(--text-muted);">${escapeHtml(item.category)} &bull; ${escapeHtml(item.locationZone)}</p>
      </div>
    </div>`;

  if (claim) {
    document.getElementById('returnStudentNameInput').value = claim.studentName;
    document.getElementById('returnStudentIdInput').value   = claim.studentRoll;
    document.getElementById('returnNotesInput').value       = `Student presented RFID ID card and matched verification details.`;
  } else {
    document.getElementById('returnStudentNameInput').value = '';
    document.getElementById('returnStudentIdInput').value   = '';
    document.getElementById('returnNotesInput').value       = 'Student verified ownership in person with faculty custodian.';
  }

  openModal('returnItemModal');
}

async function handleRecordReturnSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('confirmReturnSubmitBtn');
  if (!btn) {
    showToast('Return form is unavailable. Please refresh and try again.', 'error');
    return;
  }
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recording...';

  try {
    const body = {
      itemId:       document.getElementById('returnItemId').value,
      claimId:      document.getElementById('returnClaimId').value || undefined,
      studentName:  document.getElementById('returnStudentNameInput').value.trim(),
      studentRoll:  document.getElementById('returnStudentIdInput').value.trim(),
      handoffNotes: document.getElementById('returnNotesInput').value.trim()
    };

    const data = await api.post('/history/return', body);
    closeModal('returnItemModal');
    showToast(data.message || 'Return recorded and archived in history.', 'success');
    await renderItemsGrid();
    await renderHistoryGrid();
    await loadStats();
  } catch (err) {
    showToast(err.message || 'Failed to record return.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-handshake"></i> Confirm Handover &amp; Archive';
  }
}

// Claim Tracking
async function trackClaimSearch(query) {
  const container = document.getElementById('claimsResultsContainer');
  if (!container) return;
  const q = (query || '').trim();

  if (!q) {
    container.innerHTML = `<div class="empty-state"><p>Please enter a Claim ID (e.g. <strong>CLM-8241</strong>) or your Roll / PRN Number above.</p></div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem"></i></div>`;

  try {
    const data = await api.get(`/claims?q=${encodeURIComponent(q)}`);
    const results = data.claims || [];

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-file-circle-question"></i></div>
          <h3>No Claims Found for "${escapeHtml(q)}"</h3>
          <p>Check that your Claim ID or Student Roll number was entered correctly, or submit a new claim from the browse catalog.</p>
        </div>`;
      return;
    }

    container.innerHTML = results.map(claim => {
      let statusBadge = 'status-review', icon = 'fa-hourglass-half';
      let adviceText  = 'Your claim is currently under review by the faculty custodian.';
      if (claim.status === 'Approved for Pickup')    { statusBadge = 'status-available'; icon = 'fa-circle-check'; adviceText = claim.statusNote || 'Your claim has been APPROVED! Please bring your College ID to collect the item.'; }
      if (claim.status.includes('Returned'))         { statusBadge = 'status-pickup';    icon = 'fa-handshake';    adviceText = 'Item has been successfully handed over and completed.'; }
      if (claim.status === 'Rejected')               { statusBadge = 'status-review';    icon = 'fa-ban';          adviceText = claim.statusNote || 'Claim rejected. Proof did not match custody records.'; }

      return `
        <div class="claim-record-card">
          <div class="claim-record-top">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="claim-id-badge">${claim.claimId}</span>
              <span class="item-status-pill ${statusBadge}"><i class="fa-solid ${icon}"></i> ${claim.status}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-muted);"><i class="fa-regular fa-clock"></i> Filed: ${formatHumanDate(claim.timestamp)}</span>
          </div>
          <h3 style="font-size:1.15rem;margin:4px 0;">${escapeHtml(claim.itemTitle)}</h3>
          <div style="background:var(--bg-secondary);padding:14px;border-radius:8px;font-size:0.86rem;display:flex;flex-direction:column;gap:6px;">
            <div><strong>Student:</strong> ${escapeHtml(claim.studentName)} (${escapeHtml(claim.studentRoll)})</div>
            <div><strong>Submitted Proof:</strong> "${escapeHtml(claim.studentProof)}"</div>
          </div>
          <div style="background:var(--brand-primary-light);padding:12px 16px;border-radius:8px;border-left:4px solid var(--brand-primary);font-size:0.88rem;color:var(--text-main);">
            <strong><i class="fa-solid fa-circle-info"></i> Custodian Update:</strong> ${escapeHtml(adviceText)}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
  }
}

// ==========================================================================
// 8. VIEW NAVIGATION
// ==========================================================================

function switchView(viewName) {
  State.currentView = viewName;
  document.querySelectorAll('.nav-item').forEach(b       => b.classList.toggle('active', b.getAttribute('data-view') === viewName));
  document.querySelectorAll('.mobile-nav-link').forEach(b=> b.classList.toggle('active', b.getAttribute('data-view') === viewName));
  document.querySelectorAll('.view-panel').forEach(p     => p.classList.remove('active'));
  const target = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
  if (target) target.classList.add('active');
  closeMobileDrawer();
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (viewName === 'history') renderHistoryGrid();
  if (viewName === 'zones')   { loadItems().then(() => renderCampusZones()); }
  if (viewName === 'claims')  { const inp = document.getElementById('trackClaimInput'); if (inp && inp.value) trackClaimSearch(inp.value); }
  if (viewName === 'browse')  renderItemsGrid();
}

function selectCategory(category) {
  State.activeCategory = category;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-category') === category));
  renderItemsGrid();
}

async function resetAllFilters() {
  State.activeCategory = 'all';
  State.searchQuery    = '';
  State.locationFilter = '';
  State.statusFilter   = 'all';
  State.dateFilter     = 'all';
  State.sortFilter     = 'newest';
  document.getElementById('mainSearchInput').value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  document.getElementById('heroLocationFilter').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('dateFilter').value   = 'all';
  document.getElementById('sortFilter').value   = 'newest';
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-category') === 'all'));
  await renderItemsGrid();
  showToast('All filters have been reset.', 'info');
}

// ==========================================================================
// 9. UTILITIES
// ==========================================================================

function applyTheme(theme) {
  if (theme === 'dark') { document.body.classList.add('theme-dark'); document.body.classList.remove('theme-light'); document.getElementById('themeToggleBtn').innerHTML = '<i class="fa-solid fa-sun"></i>'; }
  else                  { document.body.classList.add('theme-light'); document.body.classList.remove('theme-dark'); document.getElementById('themeToggleBtn').innerHTML = '<i class="fa-solid fa-moon"></i>'; }
  localStorage.setItem('lostfound_theme', theme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error')   icon = 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; toast.style.transition = 'all 0.25s ease'; setTimeout(() => toast.remove(), 250); }, 4000);
}

function formatHumanDate(dateString) {
  if (!dateString) return 'Recently';
  try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch (_) { return dateString; }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function openMobileDrawer()  { document.getElementById('mobileDrawer').classList.add('open'); }
function closeMobileDrawer() { document.getElementById('mobileDrawer').classList.remove('open'); }

// ==========================================================================
// 10. EVENT LISTENERS
// ==========================================================================

function initEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(b        => b.addEventListener('click', () => switchView(b.getAttribute('data-view'))));
  document.querySelectorAll('.mobile-nav-link').forEach(b => b.addEventListener('click', () => switchView(b.getAttribute('data-view'))));
  document.querySelectorAll('.footer-nav').forEach(l      => l.addEventListener('click', e => { e.preventDefault(); switchView(l.getAttribute('data-view')); }));

  // Mobile drawer
  document.getElementById('mobileMenuToggle').addEventListener('click',      openMobileDrawer);
  document.getElementById('closeMobileDrawerBtn').addEventListener('click',  closeMobileDrawer);
  document.getElementById('mobileDrawerPostBtn').addEventListener('click',  () => { closeMobileDrawer(); openPostItemModal(); });

  // Theme
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Post item buttons
  document.getElementById('headerPostBtn').addEventListener('click',      openPostItemModal);

  // Search inputs
  const mainSearch = document.getElementById('mainSearchInput');
  const clearSearch= document.getElementById('clearSearchBtn');
  mainSearch.addEventListener('input', e => {
    State.searchQuery = e.target.value;
    clearSearch.classList.toggle('hidden', !e.target.value);
    renderItemsGrid();
  });
  clearSearch.addEventListener('click', () => {
    mainSearch.value = ''; State.searchQuery = ''; clearSearch.classList.add('hidden'); renderItemsGrid();
  });
  document.getElementById('heroSearchSubmitBtn').addEventListener('click', () => { switchView('browse'); renderItemsGrid(); });
  document.getElementById('heroLocationFilter').addEventListener('change', e => { State.locationFilter = e.target.value; renderItemsGrid(); });

  // Quick tag searches
  document.querySelectorAll('.quick-tags .tag-pill').forEach(tag => {
    tag.addEventListener('click', () => {
      const q = tag.getAttribute('data-query');
      mainSearch.value = q; State.searchQuery = q; clearSearch.classList.remove('hidden');
      switchView('browse'); renderItemsGrid();
    });
  });

  // Category pills
  document.querySelectorAll('.cat-pill').forEach(p => p.addEventListener('click', () => selectCategory(p.getAttribute('data-category'))));

  // Filter dropdowns
  document.getElementById('statusFilter').addEventListener('change', e => { State.statusFilter = e.target.value; renderItemsGrid(); });
  document.getElementById('dateFilter').addEventListener('change',   e => { State.dateFilter   = e.target.value; renderItemsGrid(); });
  document.getElementById('sortFilter').addEventListener('change',   e => { State.sortFilter   = e.target.value; renderItemsGrid(); });

  // Reset & empty state
  document.getElementById('resetFiltersBtn').addEventListener('click', resetAllFilters);
  document.getElementById('emptyResetBtn').addEventListener('click',   resetAllFilters);
  document.getElementById('emptyHelpdeskBtn').addEventListener('click',() => switchView('facilities'));

  // History filters
  const histSearch = document.getElementById('historySearchInput');
  if (histSearch) histSearch.addEventListener('input',  renderHistoryGrid);
  const histCat = document.getElementById('historyCategoryFilter');
  if (histCat)    histCat.addEventListener('change',   renderHistoryGrid);

  // Claim tracker
  document.getElementById('trackClaimSubmitBtn').addEventListener('click', () => trackClaimSearch(document.getElementById('trackClaimInput').value));
  document.getElementById('trackClaimInput').addEventListener('keypress',   e => { if (e.key === 'Enter') trackClaimSearch(e.target.value); });

  // Auth
  document.getElementById('teacherLoginForm').addEventListener('submit', handleTeacherLogin);
  document.getElementById('closeLoginModalBtn').addEventListener('click', () => closeModal('loginModal'));
  document.getElementById('cancelLoginBtn').addEventListener('click',     () => closeModal('loginModal'));
  document.getElementById('footerLoginBtn').addEventListener('click',     () => openModal('loginModal'));

  // Post item form
  document.getElementById('postItemForm').addEventListener('submit',         handlePostItemSubmit);
  document.getElementById('closePostItemModalBtn').addEventListener('click', () => closeModal('postItemModal'));
  document.getElementById('cancelPostItemBtn').addEventListener('click',     () => closeModal('postItemModal'));

  // Image upload / drag-drop
  const fileInput    = document.getElementById('itemImageFileInput');
  const dropzone     = document.getElementById('imageUploadDropzone');
  const previewCont  = document.getElementById('imagePreviewContainer');
  const previewImg   = document.getElementById('imagePreviewImg');
  const removeBtn    = document.getElementById('removePreviewBtn');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e  => { e.preventDefault(); dropzone.style.borderColor = 'var(--brand-primary)'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border-card)'; });
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.style.borderColor = 'var(--border-card)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileChosen(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => { if (e.target.files && e.target.files[0]) handleFileChosen(e.target.files[0]); });

  function handleFileChosen(file) {
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      State.selectedImageForPost = ev.target.result;
      previewImg.src = ev.target.result;
      previewCont.classList.remove('hidden');
      dropzone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
  removeBtn.addEventListener('click', () => {
    State.selectedImageForPost = PRESET_IMAGES[0].url;
    previewCont.classList.add('hidden'); dropzone.classList.remove('hidden'); fileInput.value = '';
  });

  // Claim form
  document.getElementById('studentClaimForm').addEventListener('submit', handleClaimSubmit);
  document.getElementById('closeClaimModalBtn').addEventListener('click', () => closeModal('claimModal'));
  document.getElementById('cancelClaimBtn').addEventListener('click',    () => closeModal('claimModal'));

  // Admin claims manager
  document.getElementById('closeAdminClaimsModalBtn').addEventListener('click',  () => closeModal('adminClaimsManagerModal'));

  // Return / handover form
  document.getElementById('recordReturnForm').addEventListener('submit',   handleRecordReturnSubmit);
  document.getElementById('closeReturnModalBtn').addEventListener('click', () => closeModal('returnItemModal'));
  document.getElementById('cancelReturnBtn').addEventListener('click',     () => closeModal('returnItemModal'));

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => btn.addEventListener('click', () => btn.parentElement.classList.toggle('active')));

  // Reset demo data (server-side no-op; shown for UX)
  document.getElementById('footerResetDemoDataBtn').addEventListener('click', () => {
    showToast('Data is persisted on the server. Contact your admin to reset.', 'info');
  });

  // Modal backdrop close
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) { o.classList.add('hidden'); document.body.style.overflow = 'auto'; } });
  });
}

// ==========================================================================
// 11. BOOTSTRAP
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  loadSession();
  initEventListeners();
  renderAuthBox();

  // Load initial data in parallel
  await Promise.all([renderItemsGrid(), renderHistoryGrid(), loadStats()]);
  renderCampusZones();
});
