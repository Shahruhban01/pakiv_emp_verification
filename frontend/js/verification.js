/**
 * ============================================================================
 * PAKIV EMPLOYEE VERIFICATION PORTAL - VERIFICATION CERTIFICATE JAVASCRIPT
 * Official verification validation, QR code generator, print management
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('verification-card-container');
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('id');

  if (!employeeId || !employeeId.trim()) {
    renderNotFound('No verification ID provided. Please enter a valid Pakiv employee verification ID.');
    return;
  }

  renderLoading();

  try {
    const res = await window.api.verifyEmployee(employeeId.trim());
    const employee = res.data;
    renderVerification(employee, res.meta?.canonicalUrl);
  } catch (err) {
    if (err.status === 404 || err.data?.code === 'RECORD_NOT_FOUND') {
      renderNotFound(
        `The employee verification ID "${PakivUI.escapeHtml(employeeId)}" does not exist in the official Pakiv registry. Records are issued exclusively by Pakiv HR & Corporate Administration.`
      );
    } else {
      renderError(err.message || 'An error occurred while verifying credentials.');
    }
  }

  function renderLoading() {
    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <h4 class="state-title">Verifying Official Credentials...</h4>
        <p class="state-text">Authenticating employee record against Pakiv official database.</p>
      </div>
    `;
  }

  function renderError(msg) {
    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon" style="color: var(--color-danger);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h4 class="state-title">Verification Service Error</h4>
        <p class="state-text">${PakivUI.escapeHtml(msg)}</p>
        <div style="margin-top: 1.5rem;">
          <a href="/" class="btn-primary">Return to Registry Search</a>
        </div>
      </div>
    `;
  }

  function renderNotFound(customMsg) {
    container.innerHTML = `
      <div class="verification-card">
        <div class="verification-ribbon" style="background: var(--color-warning);"></div>
        <div class="verification-header">
          <div class="brand-wrapper">
            <a href="/" class="brand-logo-link">
              <img src="/assets/pakiv-logo.svg" alt="Pakiv" class="brand-logo-img" />
            </a>
          </div>
          <span class="location-badge">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            Baramulla, J&K
          </span>
        </div>

        <div class="verification-status-banner status-banner-notfound">
          <div class="status-banner-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <div class="status-banner-title">Employee Record Not Found</div>
            <div class="status-banner-desc">This ID does not match any authenticated record in the Pakiv database.</div>
          </div>
        </div>

        <div style="padding: 3rem 2.5rem; text-align: center;">
          <p style="max-width: 540px; margin: 0 auto 2rem; color: var(--color-text-secondary); line-height: 1.6;">
            ${customMsg}
          </p>
          <div style="display: inline-flex; gap: 1rem;">
            <a href="/" class="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search Registry
            </a>
          </div>
        </div>
      </div>
    `;
  }

  function renderVerification(emp, canonicalUrl) {
    const isRevoked = emp.isRevoked || emp.employmentStatus === 'Record Revoked';
    const isEmployed = emp.employmentStatus === 'Currently Employed';
    const statusClass = PakivUI.getStatusBadgeClass(emp.employmentStatus);

    let bannerClass = 'status-banner-verified';
    let bannerTitle = 'AUTHENTICATED & VERIFIED RECORD';
    let bannerSubtitle = 'This credential is officially issued and verified by Pakiv Corporate Administration.';
    let bannerIconSvg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';

    if (isRevoked) {
      bannerClass = 'status-banner-revoked';
      bannerTitle = 'CREDENTIAL REVOKED - INVALID';
      bannerSubtitle = emp.revocationReason || 'This employee verification record was revoked by Pakiv and is no longer valid.';
      bannerIconSvg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else if (!isEmployed) {
      bannerClass = 'status-banner-neutral';
      bannerTitle = `FORMER EMPLOYEE (${emp.employmentStatus.toUpperCase()})`;
      bannerSubtitle = 'Past employment tenure and separation credentials confirmed by Pakiv.';
      bannerIconSvg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    }

    const initials = emp.fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const photoHtml = emp.profileImageUrl
      ? `<img src="${PakivUI.escapeHtml(emp.profileImageUrl)}" alt="${PakivUI.escapeHtml(emp.fullName)}" class="verification-photo-img" onerror="this.outerHTML='<span style=\\'font-size:3rem;font-weight:700;color:var(--color-primary);\\'>${initials}</span>'" />`
      : `<span style="font-size: 3rem; font-weight: 700; color: var(--color-primary);">${initials}</span>`;

    const destUrl = canonicalUrl || `https://employees.pakiv.com/verifyemp?id=${encodeURIComponent(emp.employeeId)}`;

    container.innerHTML = `
      <div class="verification-card" id="official-certificate-card">
        <div class="verification-ribbon"></div>

        <!-- Header -->
        <div class="verification-header">
          <div class="brand-wrapper">
            <a href="/" class="brand-logo-link">
              <img src="/assets/pakiv-logo.svg" alt="Pakiv" class="brand-logo-img" />
            </a>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="location-badge">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
              Baramulla, J&K
            </span>
            <button class="btn-print" id="btn-print-action" title="Print or save as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>Print Official Certificate</span>
            </button>
          </div>
        </div>

        <!-- Verification Banner -->
        <div class="verification-status-banner ${bannerClass}">
          <div class="status-banner-icon">
            ${bannerIconSvg}
          </div>
          <div>
            <div class="status-banner-title">${bannerTitle}</div>
            <div class="status-banner-desc">${PakivUI.escapeHtml(bannerSubtitle)}</div>
          </div>
        </div>

        <!-- Verification Body -->
        <div class="verification-body">
          <!-- Photo Column -->
          <div class="verification-photo-column">
            <div class="verification-photo-wrap">
              ${photoHtml}
            </div>
            <div>
              <span class="verification-id-badge" id="badge-emp-id" title="Click to copy verification ID" style="cursor: pointer;">
                ID: ${PakivUI.escapeHtml(emp.employeeId)}
              </span>
            </div>
          </div>

          <!-- Details Column -->
          <div class="verification-details-column">
            <h1 class="emp-name-title">${PakivUI.escapeHtml(emp.fullName)}</h1>
            <div class="emp-designation-sub">${PakivUI.escapeHtml(emp.designation)}</div>

            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Department</span>
                <span class="detail-value">${PakivUI.escapeHtml(emp.department)}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Employment Type</span>
                <span class="detail-value">${PakivUI.escapeHtml(emp.employmentType)}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Joining Date</span>
                <span class="detail-value">${PakivUI.formatDate(emp.joiningDate)}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Employment Status</span>
                <span class="detail-value">
                  <span class="status-badge ${statusClass}">
                    <span class="status-dot"></span>
                    ${PakivUI.escapeHtml(emp.employmentStatus)}
                  </span>
                </span>
              </div>

              ${emp.contractEndDate ? `
                <div class="detail-item">
                  <span class="detail-label">Contract End Date</span>
                  <span class="detail-value">${PakivUI.formatDate(emp.contractEndDate)}</span>
                </div>
              ` : ''}

              ${emp.lastWorkingDate ? `
                <div class="detail-item">
                  <span class="detail-label">Last Working Date</span>
                  <span class="detail-value">${PakivUI.formatDate(emp.lastWorkingDate)}</span>
                </div>
              ` : ''}
            </div>

            <!-- Verification Notes -->
            <div class="verification-note-box">
              <span class="detail-label" style="display: block; margin-bottom: 4px;">Registry Authentication Note</span>
              <p>${PakivUI.escapeHtml(emp.verificationNote || 'Official verified record on file.')}</p>
            </div>
          </div>

          <!-- Automatic QR Code Column -->
          <div class="verification-qr-column">
            <div class="qr-box-wrap" id="qrcode-container" title="Scan to verify this employee record"></div>
            <div class="qr-caption">Scan to Verify Record</div>
            <button class="btn-qr-download" id="btn-download-qr">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download QR</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="verification-footer">
          <div class="verification-stamp-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18794E" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>
              <strong>Digitally Signed & Validated</strong> • Pakiv Verification Registry • Baramulla, J&K
            </span>
          </div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted);">
            Record ID: <code>${PakivUI.escapeHtml(emp.employeeId)}</code> • Timestamp: ${new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
    `;

    // Initialize QR Code using QRCode.js
    const qrContainer = document.getElementById('qrcode-container');
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: destUrl,
        width: 140,
        height: 140,
        colorDark: '#174E63',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }

    // Download QR Code as PNG
    document.getElementById('btn-download-qr')?.addEventListener('click', () => {
      const qrCanvas = qrContainer.querySelector('canvas');
      const qrImg = qrContainer.querySelector('img');

      let downloadUrl = null;
      if (qrCanvas) {
        downloadUrl = qrCanvas.toDataURL('image/png');
      } else if (qrImg) {
        downloadUrl = qrImg.src;
      }

      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Pakiv-QR-${emp.employeeId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        PakivUI.showToast('QR Code downloaded successfully', 'success');
      }
    });

    // Copy Employee ID on badge click
    document.getElementById('badge-emp-id')?.addEventListener('click', () => {
      navigator.clipboard.writeText(emp.employeeId).then(() => {
        PakivUI.showToast(`Employee ID ${emp.employeeId} copied to clipboard!`, 'info');
      });
    });

    // Print certificate
    document.getElementById('btn-print-action')?.addEventListener('click', () => {
      window.print();
    });
  }
});

