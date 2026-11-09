const STORAGE_KEY = 'restaurantInventoryAppState';
const DEV_ACCOUNTS = {
  admin: { username: 'admin', password: 'admin123', role: 'admin' },
  user: { username: 'user', password: 'user123', role: 'user' }
};

const appState = {
  app: {
    name: "Sam's Restaurant Inventory",
    version: '0.3',
    startedAt: new Date().toISOString(),
    userAgent: navigator.userAgent
  },
  user: {
    username: '',
    authenticated: false,
    role: ''
  },
  data: [],
  session: {
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  }
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  console.log(`
DEV TEST ACCOUNTS

ADMIN
username: admin
password: admin123

USER
username: user
password: user123
`);

  const savedState = readStoredState();
  if (savedState) {
    Object.assign(appState, savedState);
  }

  if (!appState.user || !appState.user.username) {
    appState.user = {
      username: '',
      authenticated: false,
      role: ''
    };
  }

  if (!appState.session || !appState.session.startedAt) {
    appState.session = {
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  if (!Array.isArray(appState.data) || appState.data.length === 0) {
    try {
      await loadStartingData();
    } catch (error) {
      showStatus(error.message || 'Could not load starting data.', 'danger');
      console.error('[DATA] failed to load initial records', error);
    }
  }

  appState.session.lastUpdated = new Date().toISOString();
  saveState();

  if (typeof console !== 'undefined') {
    console.log('[APP] state loaded');
    console.log(appState);
    console.log(JSON.stringify(appState, null, 2));
  }

  updateNavigation();
  bindGlobalActions();
  bindSignInForm();
  bindRestaurantForm();
  bindHomePageFilters();
  renderCurrentPage();
}

function bindGlobalActions() {
  document.querySelectorAll('[data-action="sign-out"]').forEach((button) => {
    button.addEventListener('click', handleSignOut);
  });

  document.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-action="edit-record"]');
    if (editButton) {
      handleEditRecord(editButton.dataset.id);
    }

    const deleteButton = event.target.closest('[data-action="delete-record"]');
    if (deleteButton) {
      handleDeleteRecord(deleteButton.dataset.id);
    }
  });
}

function bindSignInForm() {
  const form = document.getElementById('sign-in-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    try {
      const result = await authenticateUser(username, password);
      if (!result) {
        throw new Error('Sign-in failed. Check your username and password.');
      }

      appState.user = {
        username: result.username,
        authenticated: true,
        role: result.role
      };
      appState.session.lastUpdated = new Date().toISOString();
      saveState();
      showStatus(`${result.role === 'admin' ? 'Admin' : 'User'} signed in successfully.`, 'success');
      console.log('[AUTH] user authenticated:', result.username);
      console.log('[AUTHZ] role:', result.role);

      setTimeout(() => {
        window.location.href = result.role === 'admin' ? 'admin.html' : '../index.html';
      }, 350);
    } catch (error) {
      console.error('[AUTH] login failed', error);
      showStatus(error.message, 'danger');
    }
  });
}

function bindRestaurantForm() {
  const form = document.getElementById('restaurant-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!appState.user.authenticated) {
      showStatus('You must be signed in to create or update a restaurant.', 'warning');
      return;
    }

    const formData = new FormData(form);
    const recordId = formData.get('recordId');
    const payload = {
      name: String(formData.get('name') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      rating: Number(formData.get('rating') || 0),
      city: String(formData.get('city') || '').trim(),
      notes: String(formData.get('notes') || '').trim()
    };

    if (!payload.name || !payload.category || !payload.city) {
      showStatus('Name, category, and city are required.', 'warning');
      return;
    }

    if (recordId) {
      const target = appState.data.find((item) => String(item.id) === String(recordId));
      if (!target) {
        showStatus('Could not find the record you want to update.', 'danger');
        return;
      }

      if (!canModifyRecord(target)) {
        showStatus('You are not allowed to edit that restaurant.', 'danger');
        return;
      }

      Object.assign(target, payload, { updatedAt: new Date().toISOString() });
      console.log('[UPDATE] record updated', target.id);
      showStatus('Restaurant updated successfully.', 'success');
    } else {
      const newItem = {
        id: Date.now(),
        ...payload,
        createdBy: appState.user.username,
        createdAt: new Date().toISOString()
      };
      appState.data.unshift(newItem);
      console.log('[CREATE] record created', newItem.id);
      showStatus('Restaurant added successfully.', 'success');
    }

    appState.session.lastUpdated = new Date().toISOString();
    saveState();
    form.reset();
    document.getElementById('record-id').value = '';
    const submitButton = document.getElementById('submit-restaurant');
    if (submitButton) submitButton.textContent = 'Add Restaurant';
    renderRestaurantList();
    renderHomeCards();
  });
}

function bindHomePageFilters() {
  const searchInput = document.getElementById('restaurant-search');
  const categoryFilter = document.getElementById('restaurant-category');
  const sortSelect = document.getElementById('restaurant-sort');

  if (!searchInput && !categoryFilter && !sortSelect) return;

  const refresh = () => renderHomeCards();
  searchInput?.addEventListener('input', refresh);
  categoryFilter?.addEventListener('change', refresh);
  sortSelect?.addEventListener('change', refresh);
}

function renderCurrentPage() {
  const page = document.body.dataset.page;

  if (page === 'home') {
    renderHomeCards();
  }

  if (page === 'restaurant') {
    renderRestaurantList();
    renderUserSummary();
  }

  if (page === 'signin') {
    renderSignInView();
  }

  if (page === 'admin') {
    renderAdminPage();
  }
}

function renderSignInView() {
  const signInStatus = document.getElementById('sign-in-status');
  if (!signInStatus) return;

  if (appState.user.authenticated) {
    signInStatus.innerHTML = `<strong>Signed in as ${escapeHtml(appState.user.username)}</strong> with role ${escapeHtml(appState.user.role)}.`;
    signInStatus.className = 'alert alert-success';
  } else {
    signInStatus.className = 'alert alert-info';
    signInStatus.textContent = 'Use the test credentials below to sign in.';
  }
}

function renderHomeCards() {
  const cardsContainer = document.getElementById('featured-restaurants');
  if (!cardsContainer) return;

  const searchValue = document.getElementById('restaurant-search')?.value.toLowerCase() || '';
  const categoryValue = document.getElementById('restaurant-category')?.value || '';
  const sortValue = document.getElementById('restaurant-sort')?.value || '';

  let records = [...appState.data];

  if (searchValue) {
    records = records.filter((item) => {
      return [item.name, item.category, item.city, item.notes].some((value) =>
        String(value).toLowerCase().includes(searchValue)
      );
    });
  }

  if (categoryValue) {
    records = records.filter((item) => item.category === categoryValue);
  }

  if (sortValue === 'name') {
    records.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sortValue === 'rating') {
    records.sort((a, b) => b.rating - a.rating);
  }

  if (!records.length) {
    cardsContainer.innerHTML = '<div class="col-12"><p class="text-muted">No restaurants match the selected filters.</p></div>';
    return;
  }

  cardsContainer.innerHTML = records
    .map((item) => {
      return `
        <div class="col-md-6 col-xl-4">
          <article class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h3 class="h5 mb-0">${escapeHtml(item.name)}</h3>
                <span class="badge bg-secondary">${escapeHtml(item.category)}</span>
              </div>
              <p class="text-muted mb-2">${escapeHtml(item.city)}</p>
              <p class="mb-3">${escapeHtml(item.notes)}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-warning text-dark">⭐ ${Number(item.rating).toFixed(1)} / 5</span>
                <small class="text-muted">${item.createdBy ? `By ${escapeHtml(item.createdBy)}` : ''}</small>
              </div>
            </div>
          </article>
        </div>
      `;
    })
    .join('');
}

function renderRestaurantList() {
  const list = document.getElementById('restaurant-list');
  const countBadge = document.getElementById('current-record-count');
  if (countBadge) {
    countBadge.textContent = `${appState.data.length} Records`;
  }

  if (!list) return;

  if (!appState.data.length) {
    list.innerHTML = '<div class="text-muted">No records found.</div>';
    return;
  }

  list.innerHTML = appState.data
    .map((item) => {
      const canEdit = canModifyRecord(item);
      const canDelete = canModifyRecord(item);

      return `
        <div class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <h3 class="h6 mb-0">${escapeHtml(item.name)}</h3>
              <span class="badge bg-light text-dark">${escapeHtml(item.category)}</span>
            </div>
            <p class="mb-1 text-muted">${escapeHtml(item.city)} • ${Number(item.rating).toFixed(1)}/5</p>
            <p class="mb-0">${escapeHtml(item.notes)}</p>
          </div>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              data-action="edit-record"
              data-id="${item.id}"
              ${canEdit ? '' : 'disabled'}
            >
              Edit
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              data-action="delete-record"
              data-id="${item.id}"
              ${canDelete ? '' : 'disabled'}
            >
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderUserSummary() {
  const userBox = document.getElementById('user-summary');
  if (!userBox) return;

  if (appState.user.authenticated) {
    userBox.innerHTML = `
      <p class="mb-1"><strong>Username:</strong> ${escapeHtml(appState.user.username)}</p>
      <p class="mb-1"><strong>Role:</strong> ${escapeHtml(appState.user.role)}</p>
      <p class="mb-0"><strong>Authenticated:</strong> ${appState.user.authenticated ? 'Yes' : 'No'}</p>
    `;
  } else {
    userBox.innerHTML = '<p class="text-muted mb-0">No active session.</p>';
  }
}

function renderAdminPage() {
  const adminUser = document.getElementById('admin-user');
  const debugInfo = document.getElementById('debug-info');
  const adminRecordList = document.getElementById('admin-record-list');
  const storageOutput = document.getElementById('storage-output');
  const stateOutput = document.getElementById('app-state-output');

  if (!appState.user.authenticated || appState.user.role !== 'admin') {
    const message = 'You are not authorized to view the admin dashboard.';
    showStatus(message, 'danger');
    if (adminUser) {
      adminUser.innerHTML = `<p class="text-danger mb-0">${escapeHtml(message)}</p>`;
    }
    if (debugInfo) {
      debugInfo.innerHTML = '<li>Admin access required.</li>';
    }
    if (storageOutput) {
      storageOutput.textContent = JSON.stringify(sessionStorage, null, 2);
    }
    if (stateOutput) {
      stateOutput.textContent = JSON.stringify(appState, null, 2);
    }
    return;
  }

  if (adminUser) {
    adminUser.innerHTML = `
      <p class="mb-2"><strong>Username:</strong> ${escapeHtml(appState.user.username)}</p>
      <p class="mb-2"><strong>Role:</strong> ${escapeHtml(appState.user.role)}</p>
      <p class="mb-0"><strong>Authenticated:</strong> ${appState.user.authenticated ? 'Yes' : 'No'}</p>
    `;
  }

  if (debugInfo) {
    debugInfo.innerHTML = `
      <li>Page: ${escapeHtml(window.location.pathname)}</li>
      <li>Session started: ${escapeHtml(appState.session.startedAt)}</li>
      <li>Record count: ${appState.data.length}</li>
      <li>User agent: ${escapeHtml(navigator.userAgent)}</li>
      <li>Current date: ${new Date().toLocaleString()}</li>
    `;
  }

  if (adminRecordList) {
    if (!appState.data.length) {
      adminRecordList.innerHTML = '<p class="text-muted mb-0">No records available.</p>';
    } else {
      adminRecordList.innerHTML = appState.data.map((item) => {
        return `
          <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <span>${escapeHtml(item.name)} (${escapeHtml(item.category)})</span>
            <div>
              <button type="button" class="btn btn-sm btn-outline-primary me-2" data-action="edit-record" data-id="${item.id}">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-record" data-id="${item.id}">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (storageOutput) {
    const storageSummary = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      const rawValue = sessionStorage.getItem(key);
      try {
        storageSummary[key] = JSON.parse(rawValue);
      } catch (error) {
        storageSummary[key] = rawValue;
      }
    }
    storageOutput.textContent = JSON.stringify(storageSummary, null, 2);
  }

  if (stateOutput) {
    stateOutput.textContent = JSON.stringify(appState, null, 2);
  }
}

function handleEditRecord(recordId) {
  const record = appState.data.find((item) => String(item.id) === String(recordId));
  if (!record) {
    showStatus('Could not find the selected restaurant.', 'danger');
    return;
  }

  if (!canModifyRecord(record)) {
    showStatus('You are not allowed to edit that restaurant.', 'danger');
    return;
  }

  const form = document.getElementById('restaurant-form');
  if (!form) {
    window.location.href = 'restuarant.html';
    return;
  }

  document.getElementById('record-id').value = record.id;
  document.getElementById('restaurant-name').value = record.name;
  document.getElementById('restaurant-category').value = record.category;
  document.getElementById('restaurant-rating').value = record.rating;
  document.getElementById('restaurant-city').value = record.city;
  document.getElementById('restaurant-notes').value = record.notes;

  const submitButton = document.getElementById('submit-restaurant');
  if (submitButton) submitButton.textContent = 'Save Changes';

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showStatus(`Editing ${record.name}.`, 'info');
}

function handleDeleteRecord(recordId) {
  const record = appState.data.find((item) => String(item.id) === String(recordId));
  if (!record) {
    showStatus('Could not find that record.', 'danger');
    return;
  }

  if (!canModifyRecord(record)) {
    showStatus('You are not allowed to delete that restaurant.', 'danger');
    return;
  }

  appState.data = appState.data.filter((item) => String(item.id) !== String(recordId));
  appState.session.lastUpdated = new Date().toISOString();
  saveState();
  console.log('[DELETE] record removed', recordId);
  showStatus('Restaurant removed successfully.', 'success');
  renderRestaurantList();
  renderHomeCards();
  renderAdminPage();
}

async function authenticateUser(username, password) {
  const normalizedUsername = username.toLowerCase();
  const account = Object.values(DEV_ACCOUNTS).find((user) => user.username === normalizedUsername);

  if (!account) {
    return false;
  }

  if (account.password !== password) {
    return false;
  }

  return {
    username: account.username,
    role: account.role
  };
}

function handleSignOut() {
  appState.user = {
    username: '',
    authenticated: false,
    role: ''
  };
  appState.session.lastUpdated = new Date().toISOString();
  saveState();
  showStatus('You have been signed out.', 'info');
  console.log('[AUTH] user signed out');

  const homeUrl = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
  window.location.href = homeUrl;
}

function readStoredState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('[SESSION] could not read saved state', error);
    return null;
  }
}

function saveState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    console.log('[SESSION] appState saved');
  } catch (error) {
    console.error('[SESSION] save failed', error);
    showStatus('Unable to save changes.', 'danger');
  }
}

async function loadStartingData() {
  const response = await fetch(resolveDataPath());

  if (!response.ok) {
    throw new Error('Could not load the restaurant data.');
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error('No records found in the JSON dataset.');
  }

  appState.data = data;
  appState.session.lastUpdated = new Date().toISOString();
  saveState();
  console.log('[DATA] loaded', data.length, 'records');
}

function resolveDataPath() {
  const isInPagesFolder = window.location.pathname.includes('/pages/');
  return isInPagesFolder ? '../data/restaurants.json' : 'data/restaurants.json';
}

function showStatus(message, type = 'info') {
  const statusNode = document.getElementById('status-message') || document.getElementById('sign-in-status');
  if (!statusNode) {
    console.log('[UI]', message);
    return;
  }

  statusNode.className = `alert alert-${type}`;
  statusNode.textContent = message;
  statusNode.classList.remove('d-none');
}

function canModifyRecord(record) {
  if (!appState.user.authenticated) return false;
  if (appState.user.role === 'admin') return true;
  return record.createdBy === appState.user.username;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateNavigation() {
  const userStatus = document.getElementById('nav-user-status');
  if (userStatus) {
    userStatus.textContent = appState.user.authenticated
      ? `Signed in as ${appState.user.username}`
      : 'Not signed in';
  }

  document.querySelectorAll('.admin-link').forEach((link) => {
    if (appState.user.role === 'admin') {
      link.classList.remove('d-none');
    } else {
      link.classList.add('d-none');
    }
  });

  const signInLinks = document.querySelectorAll('[href="signin.html"]');
  signInLinks.forEach((link) => {
    if (appState.user.authenticated) {
      link.textContent = 'Account';
      link.href = 'restuarant.html';
    } else {
      link.textContent = 'Sign In';
      link.href = 'signin.html';
    }
  });
}
