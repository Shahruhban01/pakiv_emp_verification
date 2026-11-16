/**
 * ============================================================================
 * PAKIV EMPLOYEE VERIFICATION PORTAL - PUBLIC HOMEPAGE JAVASCRIPT
 * Live debounced search, responsive result rendering, interactive cards
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('btn-search-submit');
  const clearBtn = document.getElementById('btn-search-clear');
  const resultsContainer = document.getElementById('results-container');
  const resultsHeader = document.getElementById('results-header');
  const resultsCount = document.getElementById('results-count');
  const hintPills = document.querySelectorAll('.search-hint-pill');

  let currentQuery = '';

  // Initialize search from URL query parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const initialQ = urlParams.get('q');
  if (initialQ && initialQ.trim()) {
    searchInput.value = initialQ.trim();
    clearBtn.style.display = 'block';
    performSearch(initialQ.trim());
  } else {
    // Show initial sample records or prompt
    performSearch('');
  }

  // Debounced search input handler
  const debouncedSearch = PakivUI.debounce((query) => {
    performSearch(query);
  }, 320);

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearBtn.style.display = val.length > 0 ? 'block' : 'none';
    debouncedSearch(val);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchInput.value.trim());
    }
  });

  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    performSearch(searchInput.value.trim());
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
    performSearch('');
    updateUrlQuery('');
  });

  // Clicking search hint pills
  hintPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const term = pill.getAttribute('data-term') || pill.textContent.trim();
      searchInput.value = term;
      clearBtn.style.display = 'block';
      searchInput.focus();
      performSearch(term);
    });
  });

  function updateUrlQuery(q) {
    const newUrl = new URL(window.location);
    if (q) {
      newUrl.searchParams.set('q', q);
    } else {
      newUrl.searchParams.delete('q');
    }
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Performs search against public backend API
   */
  async function performSearch(query) {
    currentQuery = query;
    updateUrlQuery(query);

    renderLoading();

    try {
      const res = await window.api.searchEmployees(query, 1, 15);
      const employees = res.data || [];
      const total = res.meta?.total || employees.length;

      renderResults(employees, total, query);
    } catch (err) {
      renderError(err.message || 'Unable to connect to verification server. Please try again.');
    }
  }

  function renderLoading() {
    resultsHeader.style.display = 'none';
    resultsContainer.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <h4 class="state-title">Searching Pakiv Registry...</h4>
        <p class="state-text">Checking official employee verification database records.</p>
      </div>
    `;
  }

  function renderError(message) {
    resultsHeader.style.display = 'none';
    resultsContainer.innerHTML = `
      <div class="state-box">
        <div class="state-icon" style="color: var(--color-danger);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h4 class="state-title">Verification Service Unavailable</h4>
        <p class="state-text">${PakivUI.escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderResults(employees, total, query) {
    if (employees.length === 0) {
      resultsHeader.style.display = 'none';
      resultsContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h4 class="state-title">No Matching Records Found</h4>
          <p class="state-text">
            No verified employee record matched <strong>"${PakivUI.escapeHtml(query)}"</strong>.
            Please double-check the employee verification ID or full name.
          </p>
        </div>
      `;
      return;
    }

    resultsHeader.style.display = 'flex';
    resultsCount.textContent = query
      ? `Found ${total} record${total === 1 ? '' : 's'} matching "${query}"`
      : `Official Pakiv Employee Registry (${total} verified)`;

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    employees.forEach((emp) => {
      const card = createEmployeeCard(emp);
      grid.appendChild(card);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(grid);
  }

  function createEmployeeCard(emp) {
    const card = document.createElement('div');
    card.className = 'employee-card';

    const statusClass = PakivUI.getStatusBadgeClass(emp.employmentStatus);
    const initials = emp.fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const photoHtml = emp.profileImageUrl
      ? `<img src="${PakivUI.escapeHtml(emp.profileImageUrl)}" alt="${PakivUI.escapeHtml(emp.fullName)}" class="employee-avatar-img" onerror="this.outerHTML='<span class=\\'employee-avatar-placeholder\\'>${initials}</span>'" />`
      : `<span class="employee-avatar-placeholder">${initials}</span>`;

    card.innerHTML = `
      <div class="employee-card-header">
        <div class="employee-avatar-wrap">
          ${photoHtml}
        </div>
        <div class="employee-card-info">
          <h4 class="employee-card-name" title="${PakivUI.escapeHtml(emp.fullName)}">${PakivUI.escapeHtml(emp.fullName)}</h4>
          <div class="employee-card-designation" title="${PakivUI.escapeHtml(emp.designation)}">${PakivUI.escapeHtml(emp.designation)}</div>
          <div class="employee-card-meta">
            <span class="employee-card-id-tag">${PakivUI.escapeHtml(emp.employeeId)}</span>
            <span>•</span>
            <span class="dept-tag">${PakivUI.escapeHtml(emp.department)}</span>
          </div>
        </div>
      </div>

      <div class="employee-card-status-bar">
        <span class="status-badge ${statusClass}">
          <span class="status-dot"></span>
          ${PakivUI.escapeHtml(emp.employmentStatus)}
        </span>
        <span style="font-size: 0.75rem; color: var(--color-text-muted);">
          Since ${PakivUI.formatDate(emp.joiningDate)}
        </span>
      </div>

      <a href="/verifyemp?id=${encodeURIComponent(emp.employeeId)}" class="btn-view-verification">
        <span>View Official Verification</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>
    `;

    return card;
  }
});

