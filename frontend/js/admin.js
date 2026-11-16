/**
 * ============================================================================
 * PAKIV EMPLOYEE VERIFICATION PORTAL - ADMIN DASHBOARD JAVASCRIPT
 * Authentication guard, CRUD management, R2 photo uploader, QR modal
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  // If on login page, delegate to initLoginPage()
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
    return;
  }

  // Auth Guard for admin pages
  let currentAdmin = null;
  try {
    const res = await window.api.getMe();
    currentAdmin = res.data.admin;
    renderAdminInfo(currentAdmin);
  } catch (err) {
    window.location.href = '/admin/login.html';
    return;
  }

  // Setup Sidebar Mobile Toggle
  const sidebar = document.getElementById('admin-sidebar');
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 992 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  // Logout buttons
  document.querySelectorAll('.btn-admin-logout').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.api.logout();
    });
  });

  // Page-specific initializers
  if (document.getElementById('dashboard-view')) {
    initDashboard();
  }

  if (document.getElementById('employees-table-body')) {
    initEmployeesList();
  }

  if (document.getElementById('employee-form')) {
    initEmployeeForm();
  }

  if (document.getElementById('audit-logs-table-body')) {
    initAuditLogs();
  }

  setupQrModal();
  setupRevokeModal();
  setupSettingsModal(currentAdmin);
});

/**
 * ----------------- 1. Login Page -----------------
 */
function initLoginPage() {
  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('btn-login-submit');

  // Check if redirected due to expired session
  if (new URLSearchParams(window.location.search).get('expired')) {
    errorBox.textContent = 'Your session has expired. Please log in again.';
    errorBox.style.display = 'block';
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorBox.textContent = 'Please enter both email and password.';
      errorBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      await window.api.login(email, password);
      PakivUI.showToast('Login successful. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/admin/';
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message || 'Invalid administrator credentials.';
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Admin Portal';
    }
  });
}

/**
 * ----------------- 2. Render Admin Info in Sidebar -----------------
 */
function renderAdminInfo(admin) {
  const nameEl = document.getElementById('admin-user-name');
  const roleEl = document.getElementById('admin-user-role');
  const avatarEl = document.getElementById('admin-avatar');

  if (nameEl) nameEl.textContent = admin.name || 'Admin';
  if (roleEl) roleEl.textContent = admin.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator';
  if (avatarEl) avatarEl.textContent = (admin.name || 'A')[0].toUpperCase();
}

/**
 * ----------------- 3. Dashboard View -----------------
 */
async function initDashboard() {
  try {
    const statsRes = await window.api.getStats();
    const s = statsRes.data;

    document.getElementById('stat-total-employees').textContent = s.total ?? 0;
    document.getElementById('stat-employed').textContent = s.currentlyEmployed ?? 0;
    document.getElementById('stat-contract-completed').textContent = s.contractCompleted ?? 0;
    document.getElementById('stat-resigned').textContent = s.resigned ?? 0;
    document.getElementById('stat-revoked').textContent = s.revoked ?? 0;

    // Load recent employees
    const listRes = await window.api.getEmployees({ limit: 5 });
    renderRecentEmployeesTable(listRes.data || []);

    // Load recent activity
    const auditRes = await window.api.getAuditLogs({ limit: 6 });
    renderRecentActivity(auditRes.data || []);
  } catch (err) {
    PakivUI.showToast('Failed to load dashboard metrics: ' + err.message, 'error');
  }
}

function renderRecentEmployeesTable(employees) {
  const tbody = document.getElementById('recent-employees-tbody');
  if (!tbody) return;

  if (employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No employees added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = employees
    .map((emp) => {
      const statusClass = PakivUI.getStatusBadgeClass(emp.employmentStatus);
      const initials = (emp.fullName || 'E').substring(0, 2).toUpperCase();
      const photo = emp.profileImage?.url
        ? `<img src="${PakivUI.escapeHtml(emp.profileImage.url)}" class="table-emp-avatar" alt="" onerror="this.outerHTML='<div class=\\'table-emp-avatar\\'>${initials}</div>'" />`
        : `<div class="table-emp-avatar">${initials}</div>`;

      return `
      <tr>
        <td>
          <div class="table-emp-cell">
            ${photo}
            <div>
              <div class="table-emp-name">${PakivUI.escapeHtml(emp.fullName)}</div>
              <div class="table-emp-dept">${PakivUI.escapeHtml(emp.designation)} • ${PakivUI.escapeHtml(emp.department)}</div>
            </div>
          </div>
        </td>
        <td><code>${PakivUI.escapeHtml(emp.employeeId)}</code></td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${PakivUI.escapeHtml(emp.employmentStatus)}
          </span>
        </td>
        <td>${PakivUI.formatDate(emp.joiningDate)}</td>
        <td>
          <div class="table-actions">
            <a href="/verifyemp?id=${encodeURIComponent(emp.employeeId)}" target="_blank" class="btn-action-icon" title="View Public Verification">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button class="btn-action-icon" onclick="openQrModal('${PakivUI.escapeHtml(emp.employeeId)}', '${PakivUI.escapeHtml(emp.fullName)}')" title="View QR Code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <a href="/admin/employee-form.html?id=${encodeURIComponent(emp.employeeId)}" class="btn-action-icon" title="Edit Employee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </a>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

function renderRecentActivity(logs) {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<p style="padding: 1.5rem; color: var(--color-text-muted);">No activity recorded yet.</p>';
    return;
  }

  container.innerHTML = logs
    .map((log) => {
      const actionName = log.action.replace(/_/g, ' ');
      return `
      <div style="padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 0.8125rem; font-weight: 600; color: var(--color-primary-dark);">
            ${PakivUI.escapeHtml(log.adminName)} — <span style="color: var(--color-primary);">${actionName}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted);">
            Target: <code>${PakivUI.escapeHtml(log.targetId || 'N/A')}</code>
          </div>
        </div>
        <div style="font-size: 0.6875rem; color: var(--color-text-muted);">
          ${new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;
    })
    .join('');
}

/**
 * ----------------- 4. All Employees List -----------------
 */
let currentEmployeesPage = 1;
let currentFilters = { q: '', status: '', department: '' };

async function initEmployeesList() {
  const searchInput = document.getElementById('admin-emp-search');
  const statusSelect = document.getElementById('admin-filter-status');
  const deptSelect = document.getElementById('admin-filter-dept');

  const debouncedSearch = PakivUI.debounce((val) => {
    currentFilters.q = val;
    currentEmployeesPage = 1;
    loadEmployees();
  }, 300);

  searchInput?.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
  statusSelect?.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    currentEmployeesPage = 1;
    loadEmployees();
  });
  deptSelect?.addEventListener('change', (e) => {
    currentFilters.department = e.target.value;
    currentEmployeesPage = 1;
    loadEmployees();
  });

  await loadEmployees();
}

async function loadEmployees() {
  const tbody = document.getElementById('employees-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;"><div class="spinner"></div>Loading employees...</td></tr>`;

  try {
    const res = await window.api.getEmployees({
      ...currentFilters,
      page: currentEmployeesPage,
      limit: 15,
    });

    const employees = res.data || [];
    const meta = res.meta || { total: 0, totalPages: 1 };

    if (employees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--color-text-secondary);">No employee records found matching criteria.</td></tr>`;
      renderPagination(0, 1, 1);
      return;
    }

    tbody.innerHTML = employees
      .map((emp) => {
        const statusClass = PakivUI.getStatusBadgeClass(emp.employmentStatus);
        const initials = (emp.fullName || 'E').substring(0, 2).toUpperCase();
        const photo = emp.profileImage?.url
          ? `<img src="${PakivUI.escapeHtml(emp.profileImage.url)}" class="table-emp-avatar" alt="" onerror="this.outerHTML='<div class=\\'table-emp-avatar\\'>${initials}</div>'" />`
          : `<div class="table-emp-avatar">${initials}</div>`;

        return `
        <tr>
          <td>
            <div class="table-emp-cell">
              ${photo}
              <div>
                <div class="table-emp-name">${PakivUI.escapeHtml(emp.fullName)}</div>
                <div class="table-emp-dept">${PakivUI.escapeHtml(emp.designation)}</div>
              </div>
            </div>
          </td>
          <td><code>${PakivUI.escapeHtml(emp.employeeId)}</code></td>
          <td>${PakivUI.escapeHtml(emp.department)}</td>
          <td>${PakivUI.escapeHtml(emp.employmentType)}</td>
          <td>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${PakivUI.escapeHtml(emp.employmentStatus)}
            </span>
          </td>
          <td>${PakivUI.formatDate(emp.joiningDate)}</td>
          <td>
            <div class="table-actions">
              <a href="/verifyemp?id=${encodeURIComponent(emp.employeeId)}" target="_blank" class="btn-action-icon" title="View Public Verification">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <button class="btn-action-icon" onclick="openQrModal('${PakivUI.escapeHtml(emp.employeeId)}', '${PakivUI.escapeHtml(emp.fullName)}')" title="View QR Code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <a href="/admin/employee-form.html?id=${encodeURIComponent(emp.employeeId)}" class="btn-action-icon" title="Edit Employee">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </a>
              ${
                emp.isRevoked
                  ? `<button class="btn-action-icon" style="color: var(--color-success);" onclick="restoreEmployee('${PakivUI.escapeHtml(emp.employeeId)}')" title="Restore Active Status">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                    </button>`
                  : `<button class="btn-action-icon btn-action-danger" onclick="openRevokeModal('${PakivUI.escapeHtml(emp.employeeId)}', '${PakivUI.escapeHtml(emp.fullName)}')" title="Revoke Credential">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </button>`
              }
              <button class="btn-action-icon btn-action-danger" onclick="confirmDeleteEmployee('${PakivUI.escapeHtml(emp.employeeId)}', '${PakivUI.escapeHtml(emp.fullName)}')" title="Delete Record">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    renderPagination(meta.total, meta.page, meta.totalPages);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--color-danger);">Failed to load employee list: ${PakivUI.escapeHtml(err.message)}</td></tr>`;
  }
}

function renderPagination(total, page, totalPages) {
  const container = document.getElementById('table-pagination-container');
  if (!container) return;

  if (total === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  const info = document.getElementById('pagination-info-text');
  if (info) info.textContent = `Showing page ${page} of ${totalPages} (${total} total records)`;

  const controls = document.getElementById('pagination-buttons');
  if (!controls) return;

  controls.innerHTML = `
    <button class="btn-page" ${page <= 1 ? 'disabled' : ''} onclick="goToEmployeesPage(${page - 1})">Prev</button>
    <button class="btn-page active">${page}</button>
    <button class="btn-page" ${page >= totalPages ? 'disabled' : ''} onclick="goToEmployeesPage(${page + 1})">Next</button>
  `;
}

window.goToEmployeesPage = function (page) {
  currentEmployeesPage = page;
  loadEmployees();
};

/**
 * ----------------- 5. Employee Form (Create / Edit) -----------------
 */
async function initEmployeeForm() {
  const form = document.getElementById('employee-form');
  const idInput = document.getElementById('form-emp-id');
  const btnGenId = document.getElementById('btn-auto-gen-id');
  const photoInput = document.getElementById('photo-file-input');
  const photoDropZone = document.getElementById('photo-drop-zone');
  const photoPreviewImg = document.getElementById('photo-preview-img');
  const photoPlaceholder = document.getElementById('photo-placeholder');
  const formTitle = document.getElementById('form-page-title');
  const submitBtn = document.getElementById('btn-submit-employee');

  let uploadedPhotoData = null;

  // Check if Edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  if (btnGenId && !editId) {
    btnGenId.addEventListener('click', async () => {
      try {
        const res = await window.api.getNextEmployeeId();
        idInput.value = res.data.candidateId;
        PakivUI.showToast(`Generated ID: ${res.data.candidateId}`, 'info');
      } catch (err) {
        PakivUI.showToast('Could not auto-generate ID: ' + err.message, 'error');
      }
    });
  }

  // Handle Photo Drag & Drop / File Select
  photoDropZone?.addEventListener('click', () => photoInput.click());

  photoDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoDropZone.classList.add('drag-over');
  });

  photoDropZone?.addEventListener('dragleave', () => {
    photoDropZone.classList.remove('drag-over');
  });

  photoDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  });

  photoInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  });

  async function handlePhotoUpload(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      PakivUI.showToast('Invalid image type. Please select a JPEG, PNG, or WebP photo.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      PakivUI.showToast('Photo size exceeds 5MB limit.', 'error');
      return;
    }

    // Instant client preview
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreviewImg.src = e.target.result;
      photoPreviewImg.style.display = 'block';
      if (photoPlaceholder) photoPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload to server (Cloudflare R2 or local fallback)
    try {
      PakivUI.showToast('Uploading photo to secure storage...', 'info', 1500);
      const res = await window.api.uploadPhoto(file, idInput.value || 'temp');
      uploadedPhotoData = res.data;
      PakivUI.showToast('Photo uploaded successfully.', 'success');
    } catch (err) {
      PakivUI.showToast('Photo upload failed: ' + err.message, 'error');
    }
  }

  // Load Existing Data if Edit Mode
  if (editId) {
    formTitle.textContent = `Edit Employee: ${editId}`;
    idInput.readOnly = true;
    if (btnGenId) btnGenId.style.display = 'none';

    try {
      const res = await window.api.getEmployee(editId);
      const emp = res.data;

      idInput.value = emp.employeeId;
      document.getElementById('form-full-name').value = emp.fullName || '';
      document.getElementById('form-designation').value = emp.designation || '';
      document.getElementById('form-department').value = emp.department || '';
      document.getElementById('form-employment-type').value = emp.employmentType || 'Full-Time';
      document.getElementById('form-status').value = emp.employmentStatus || 'Currently Employed';

      if (emp.joiningDate) {
        document.getElementById('form-joining-date').value = emp.joiningDate.split('T')[0];
      }
      if (emp.contractEndDate) {
        document.getElementById('form-contract-end-date').value = emp.contractEndDate.split('T')[0];
      }
      if (emp.lastWorkingDate) {
        document.getElementById('form-last-working-date').value = emp.lastWorkingDate.split('T')[0];
      }

      document.getElementById('form-notes').value = emp.verificationNote || '';

      if (emp.profileImage?.url) {
        photoPreviewImg.src = emp.profileImage.url;
        photoPreviewImg.style.display = 'block';
        if (photoPlaceholder) photoPlaceholder.style.display = 'none';
        uploadedPhotoData = emp.profileImage;
      }
    } catch (err) {
      PakivUI.showToast('Error loading employee record: ' + err.message, 'error');
    }
  } else {
    // If Add mode, auto-generate candidate ID
    try {
      const res = await window.api.getNextEmployeeId();
      if (!idInput.value) {
        idInput.value = res.data.candidateId;
      }
    } catch (e) {}
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      employeeId: idInput.value.trim().toUpperCase(),
      fullName: document.getElementById('form-full-name').value.trim(),
      designation: document.getElementById('form-designation').value.trim(),
      department: document.getElementById('form-department').value.trim(),
      employmentType: document.getElementById('form-employment-type').value,
      employmentStatus: document.getElementById('form-status').value,
      joiningDate: document.getElementById('form-joining-date').value,
      contractEndDate: document.getElementById('form-contract-end-date').value || null,
      lastWorkingDate: document.getElementById('form-last-working-date').value || null,
      verificationNote: document.getElementById('form-notes').value.trim(),
      profileImage: uploadedPhotoData || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Record...';

    try {
      if (editId) {
        await window.api.updateEmployee(editId, payload);
        PakivUI.showToast('Employee record updated successfully.', 'success');
      } else {
        await window.api.createEmployee(payload);
        PakivUI.showToast('Employee created successfully.', 'success');
      }

      setTimeout(() => {
        window.location.href = '/admin/employees.html';
      }, 700);
    } catch (err) {
      PakivUI.showToast('Failed to save employee: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Save Changes' : 'Create Employee';
    }
  });
}

/**
 * ----------------- 6. Revoke / Restore / Delete Handlers -----------------
 */
let targetRevokeId = null;

function setupRevokeModal() {
  const modal = document.getElementById('revoke-modal');
  const btnConfirm = document.getElementById('btn-confirm-revoke');
  const btnCancel = document.getElementById('btn-cancel-revoke');
  const reasonInput = document.getElementById('revoke-reason-input');

  if (!modal) return;

  btnCancel?.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  btnConfirm?.addEventListener('click', async () => {
    const reason = reasonInput.value.trim();
    if (!reason) {
      PakivUI.showToast('Please provide a reason for revoking the verification.', 'error');
      return;
    }

    try {
      await window.api.revokeEmployee(targetRevokeId, reason);
      modal.classList.remove('active');
      PakivUI.showToast(`Credential for ID ${targetRevokeId} has been revoked.`, 'info');
      loadEmployees();
    } catch (err) {
      PakivUI.showToast('Revoke failed: ' + err.message, 'error');
    }
  });
}

window.openRevokeModal = function (employeeId, name) {
  targetRevokeId = employeeId;
  const modal = document.getElementById('revoke-modal');
  const nameEl = document.getElementById('revoke-modal-emp-name');
  const reasonInput = document.getElementById('revoke-reason-input');

  if (nameEl) nameEl.textContent = `${name} (${employeeId})`;
  if (reasonInput) reasonInput.value = '';
  if (modal) modal.classList.add('active');
};

window.restoreEmployee = async function (employeeId) {
  if (!confirm(`Are you sure you want to restore verification for employee ${employeeId}?`)) return;

  try {
    await window.api.restoreEmployee(employeeId);
    PakivUI.showToast(`Employee ${employeeId} restored to active status.`, 'success');
    loadEmployees();
  } catch (err) {
    PakivUI.showToast('Restore failed: ' + err.message, 'error');
  }
};

window.confirmDeleteEmployee = async function (employeeId, name) {
  if (!confirm(`Are you sure you want to archive/delete record for ${name} (${employeeId})? This action will be audited.`)) {
    return;
  }

  try {
    await window.api.deleteEmployee(employeeId, false);
    PakivUI.showToast(`Employee ${employeeId} archived.`, 'success');
    loadEmployees();
  } catch (err) {
    PakivUI.showToast('Delete failed: ' + err.message, 'error');
  }
};

/**
 * ----------------- 7. QR Code Modal -----------------
 */
function setupQrModal() {
  const modal = document.getElementById('qr-modal');
  const closeBtn = document.getElementById('btn-close-qr-modal');
  const downloadBtn = document.getElementById('btn-modal-qr-download');
  const printBtn = document.getElementById('btn-modal-qr-print');

  closeBtn?.addEventListener('click', () => modal?.classList.remove('active'));

  downloadBtn?.addEventListener('click', () => {
    const canvas = document.querySelector('#modal-qrcode-container canvas');
    const img = document.querySelector('#modal-qrcode-container img');
    let url = canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pakiv-QR-${window._currentModalEmpId || 'code'}.png`;
      a.click();
      PakivUI.showToast('QR Code image downloaded.', 'success');
    }
  });

  printBtn?.addEventListener('click', () => {
    window.print();
  });
}

window.openQrModal = function (employeeId, name) {
  window._currentModalEmpId = employeeId;
  const modal = document.getElementById('qr-modal');
  const nameEl = document.getElementById('qr-modal-emp-name');
  const urlEl = document.getElementById('qr-modal-emp-url');
  const qrBox = document.getElementById('modal-qrcode-container');

  if (nameEl) nameEl.textContent = `${name} (${employeeId})`;

  const verifyUrl = `https://employees.pakiv.com/verifyemp?id=${encodeURIComponent(employeeId)}`;
  if (urlEl) urlEl.textContent = verifyUrl;

  if (qrBox) {
    qrBox.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrBox, {
        text: verifyUrl,
        width: 180,
        height: 180,
        colorDark: '#174E63',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }
  }

  modal?.classList.add('active');
};

/**
 * ----------------- 8. Audit Logs View -----------------
 */
async function initAuditLogs() {
  const tbody = document.getElementById('audit-logs-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;"><div class="spinner"></div>Loading activity logs...</td></tr>`;

  try {
    const res = await window.api.getAuditLogs({ limit: 40 });
    const logs = res.data || [];

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No audit logs on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs
      .map((log) => `
      <tr>
        <td>${new Date(log.createdAt).toLocaleString('en-GB')}</td>
        <td><strong>${PakivUI.escapeHtml(log.adminName)}</strong></td>
        <td><code>${PakivUI.escapeHtml(log.action)}</code></td>
        <td>${PakivUI.escapeHtml(log.targetType)}: <code>${PakivUI.escapeHtml(log.targetId || 'N/A')}</code></td>
        <td><span style="font-size:0.75rem; color:var(--color-text-muted);">${PakivUI.escapeHtml(log.ipAddress || 'Internal')}</span></td>
      </tr>
    `)
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--color-danger); padding: 2rem;">Error loading logs: ${PakivUI.escapeHtml(err.message)}</td></tr>`;
  }
}

/**
 * ----------------- 9. Account Settings Modal -----------------
 */
function setupSettingsModal(admin) {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const form = document.getElementById('settings-form');

  openBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (admin) {
      document.getElementById('settings-name').value = admin.name || '';
      document.getElementById('settings-email').value = admin.email || '';
    }
    modal?.classList.add('active');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('active'));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('settings-name').value.trim();
    const currentPassword = document.getElementById('settings-current-pwd').value;
    const newPassword = document.getElementById('settings-new-pwd').value;

    const payload = { name };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      await window.api.updateProfile(payload);
      PakivUI.showToast('Profile updated successfully.', 'success');
      modal?.classList.remove('active');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      PakivUI.showToast('Update failed: ' + err.message, 'error');
    }
  });
}

