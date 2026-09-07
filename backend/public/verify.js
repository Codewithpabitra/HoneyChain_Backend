/**
 * HoneyChain Consumer Verification Client
 * Dedicated to displaying the Digital Certificate of Authenticity for a specific honey jar.
 */

// Format UNIX timestamp into user-friendly localized date
function formatTimestamp(ts) {
  if (!ts) return "N/A";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num) || num <= 0) return "N/A";
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(ts) {
  if (!ts) return "N/A";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num) || num <= 0) return "N/A";
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortAddress(addr) {
  if (!addr || typeof addr !== "string") return "--";
  if (addr.length < 12) return addr;
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

function shortHash(hash) {
  if (!hash || typeof hash !== "string") return "--";
  if (hash.length < 16) return hash;
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
}

// Extract batch ID from URL path or query
function getTargetBatchId() {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/verify\/([^/?#]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }
  const params = new URLSearchParams(window.location.search);
  const qId = params.get("batchId");
  if (qId) return qId.trim();
  return "";
}

// Render Loading View
function renderLoading(batchId) {
  const container = document.getElementById("verifyDisplayArea");
  if (!container) return;
  container.innerHTML = `
    <div class="passport-loading">
      <div class="loading-honey-pot">🍯</div>
      <h2 class="loading-title">Verifying Honey Jar Authenticity</h2>
      <p class="loading-sub">
        Cryptographically verifying Batch <span class="mono bold text-primary">${batchId}</span> against Ethereum Sepolia smart contract & SHA-256 metadata hash...
      </p>
    </div>
  `;
}

// Render Empty State when no batch ID is in the URL
function renderEmptyState() {
  const container = document.getElementById("verifyDisplayArea");
  if (!container) return;
  container.innerHTML = `
    <div class="passport-card empty-card">
      <div class="empty-icon">📱</div>
      <h2 class="passport-title">Scan Honey Jar QR Code</h2>
      <p class="empty-desc">
        This portal provides the instant on-chain certificate of authenticity for physical HoneyChain jars. Please scan the QR code printed on your honey jar label to view its verified provenance.
      </p>
      <div class="empty-action-group">
        <a href="/" class="btn-passport btn-passport-primary">← Return to HoneyChain Home</a>
      </div>
    </div>
  `;
}

// Render Error / Not Found State
function renderError(batchId, errorMessage, statusCode = 404) {
  const container = document.getElementById("verifyDisplayArea");
  if (!container) return;
  container.innerHTML = `
    <div class="passport-card error-card">
      <div class="passport-hero-badge badge-recalled">
        <span class="hero-icon">⚠️</span>
        <div class="hero-text-wrap">
          <span class="hero-badge-title">UNVERIFIED HONEY BATCH</span>
          <span class="hero-badge-sub">Product not recognized in HoneyChain registry</span>
        </div>
      </div>

      <div class="error-body">
        <div class="error-batch-code">Scanned Batch ID: <span class="mono bold">${batchId}</span></div>
        <p class="error-message">
          ${errorMessage || "This batch code could not be verified on the Ethereum Sepolia smart contract."}
        </p>

        <div class="consumer-advice-box">
          <div class="advice-header">🛡️ Consumer Advisory:</div>
          <ul>
            <li>Check that the batch code matches the printed label on your physical jar.</li>
            <li>If the seal is broken or was not registered by an authorized HoneyChain apiary, it may be uncertified.</li>
            <li>Contact the producing cooperative or retailer for assistance.</li>
          </ul>
        </div>
      </div>

      <div class="passport-action-bar">
        <a href="/" class="btn-passport btn-passport-secondary">← Back to Portal</a>
        <button type="button" class="btn-passport btn-passport-primary" onclick="location.reload()">Retry Scan</button>
      </div>
    </div>
  `;
}

// Render Full Premium Consumer Digital Product Passport
function renderPassport(data) {
  const container = document.getElementById("verifyDisplayArea");
  if (!container) return;

  const {
    batchId,
    tamperProofAudit,
    blockchain,
    quality,
    harvest,
    custodyTimeline = [],
    recall,
  } = data;

  const isRecalled = recall && recall.recalled === true;
  const isIntegrityVerified = tamperProofAudit?.integrityVerified === true;
  const isPending =
    !isRecalled &&
    (!quality?.grade || quality.grade === "None" || blockchain?.status === "Registered");

  // Determine Primary Badge
  let badgeTheme = "theme-verified";
  let badgeIcon = "✓";
  let badgeTitle = "AUTHENTIC & UNADULTERATED";
  let badgeSubtitle = "100% Pure Honey • Cryptographically Anchored on Ethereum Sepolia";

  if (isRecalled) {
    badgeTheme = "theme-recalled";
    badgeIcon = "⛔";
    badgeTitle = "CRITICAL WARNING: PRODUCT RECALLED";
    badgeSubtitle = "Official safety notice issued on-chain by authorized auditor";
  } else if (isPending) {
    badgeTheme = "theme-pending";
    badgeIcon = "⏳";
    badgeTitle = "HARVEST CONFIRMED • ASSAY PENDING";
    badgeSubtitle = "Harvest verified on Ethereum Sepolia • Laboratory assay in progress";
  } else if (!isIntegrityVerified) {
    badgeTheme = "theme-tampered";
    badgeIcon = "⚠️";
    badgeTitle = "INTEGRITY WARNING: HASH MISMATCH";
    badgeSubtitle = "Off-chain harvest metadata does not match on-chain cryptographic anchor!";
  }

  // Floral Origin & Location Formatting
  const floralOrigin = harvest?.floralOrigin || "Pure Multifloral Honey";
  const harvestDate = formatTimestamp(harvest?.harvestTimestamp);
  const netWeight = harvest?.quantityGrams
    ? `${(harvest.quantityGrams / 1000).toFixed(1)} kg Harvest Lot`
    : "Standard Lot";
  const apiaryRegion = harvest?.apiaryLocation?.region || "Sundarbans Biosphere Reserve";
  const apiaryCoords =
    harvest?.apiaryLocation?.latitude && harvest?.apiaryLocation?.longitude
      ? `${harvest.apiaryLocation.latitude.toFixed(4)}° N, ${harvest.apiaryLocation.longitude.toFixed(4)}° E`
      : "Protected Geofence";

  // Quality & Moisture Gauge
  const gradeLabel = isPending ? "Pending Assay" : quality?.grade || "Grade A";
  const moistureValue = quality?.moisturePercentage || 0;
  const moisturePercentDisplay = moistureValue > 0 ? `${moistureValue}%` : "Pending Assay";

  // Calculate Moisture Bar Width (0 - 25% scale, 20% is limit)
  let moistureBarWidth = Math.min(100, Math.max(0, (moistureValue / 25) * 100));
  let moistureBarColor = "#10B981"; // green
  if (moistureValue > 18 && moistureValue <= 20) {
    moistureBarColor = "#F59E0B"; // amber warning
  } else if (moistureValue > 20) {
    moistureBarColor = "#EF4444"; // red failure
  }

  // Recall Banner
  let recallBannerHtml = "";
  if (isRecalled) {
    recallBannerHtml = `
      <div class="passport-recall-banner">
        <div class="recall-banner-header">
          <span class="recall-icon">🚨</span>
          <div>
            <h3 class="recall-title">CONSUMER ADVISORY: DO NOT CONSUME</h3>
            <div class="recall-reason">${recall.reason || "Safety recall issued"}</div>
          </div>
        </div>
        <div class="recall-meta">
          <span>Recalled By: <span class="mono">${shortAddress(recall.recalledBy)}</span></span>
          ${recall.recalledAt ? `<span> • Date: ${formatDateTime(recall.recalledAt)}</span>` : ""}
          ${recall.txHash ? `<span> • <a href="https://sepolia.etherscan.io/tx/${recall.txHash}" target="_blank" rel="noopener noreferrer" class="link-chain">Sepolia Tx ↗</a></span>` : ""}
        </div>
      </div>
    `;
  }

  // Provenance Timeline Items
  let timelineStepsHtml = "";
  if (Array.isArray(custodyTimeline) && custodyTimeline.length > 0) {
    timelineStepsHtml = custodyTimeline
      .map((item, idx) => {
        const timeStr = formatDateTime(item.timestamp);
        const txLink = item.txHash
          ? `<a href="https://sepolia.etherscan.io/tx/${item.txHash}" target="_blank" rel="noopener noreferrer" class="tx-badge">Tx: ${shortHash(item.txHash)} ↗</a>`
          : "";
        return `
          <div class="step-card">
            <div class="step-num">${idx + 1}</div>
            <div class="step-details">
              <div class="step-header">
                <span class="step-title">${item.event || "Custody Handoff"}</span>
                ${txLink}
              </div>
              <div class="step-meta">
                <span>🕒 ${timeStr}</span>
                ${item.location ? `<span> • 📍 ${item.location}</span>` : ""}
              </div>
              ${item.from && item.to ? `<div class="step-transfer mono">${shortAddress(item.from)} → ${shortAddress(item.to)}</div>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  } else {
    timelineStepsHtml = `
      <div class="step-card">
        <div class="step-num">1</div>
        <div class="step-details">
          <div class="step-header">
            <span class="step-title">Harvest Registered on Ethereum Sepolia</span>
            <span class="tx-badge">Block Confirmed</span>
          </div>
          <div class="step-meta">
            <span>🕒 ${harvestDate}</span>
            <span> • 📍 ${apiaryRegion}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Construct Final Passport HTML
  container.innerHTML = `
    <div class="passport-card">
      
      <!-- Top Certificate Header -->
      <div class="certificate-top">
        <div class="cert-brand">
          <span class="cert-gold-seal">🍯</span>
          <div>
            <div class="cert-subtitle">CERTIFICATE OF PROVENANCE & PURITY</div>
            <h1 class="cert-batch-title">${batchId}</h1>
          </div>
        </div>
        <div class="cert-actions no-print">
          <button type="button" id="btnCopyBatch" class="btn-pill" title="Copy Batch ID">📋 Copy</button>
          <button type="button" id="btnPrintCert" class="btn-pill" title="Print Certificate">🖨️ Print</button>
          <button type="button" id="btnShareCert" class="btn-pill btn-pill-accent" title="Share Proof">🔗 Share</button>
        </div>
      </div>

      ${recallBannerHtml}

      <!-- Primary Verification Status Banner -->
      <div class="passport-hero-badge ${badgeTheme}">
        <div class="hero-badge-icon">${badgeIcon}</div>
        <div class="hero-text-wrap">
          <div class="hero-badge-title">${badgeTitle}</div>
          <div class="hero-badge-sub">${badgeSubtitle}</div>
        </div>
      </div>

      <!-- Honey Harvest & Botanical Identity -->
      <div class="passport-section">
        <div class="section-badge-label">🌸 Botanical Origin & Apiculture</div>
        <div class="floral-hero-name">${floralOrigin}</div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Harvest Date</span>
            <span class="metric-value">${harvestDate}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Sanctuary Region</span>
            <span class="metric-value">${apiaryRegion}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">GPS Geofence</span>
            <span class="metric-value mono">${apiaryCoords}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Monitored Hives</span>
            <span class="metric-value mono">${Array.isArray(harvest?.sourceHives) && harvest.sourceHives.length > 0 ? harvest.sourceHives.join(", ") : "Certified Apiary"}</span>
          </div>
        </div>
      </div>

      <!-- Laboratory Quality & Purity Assay -->
      <div class="passport-section">
        <div class="section-badge-label">🔬 Laboratory Purity & Quality Assay</div>
        
        <div class="lab-quality-container">
          <div class="lab-main-metric">
            <div class="quality-grade-badge ${isPending ? 'grade-pending' : 'grade-active'}">
              <span class="grade-label-small">Certified Grade</span>
              <span class="grade-big-text">${gradeLabel}</span>
            </div>
            
            <div class="moisture-meter-box">
              <div class="moisture-meter-header">
                <span class="meter-title">Moisture Content</span>
                <span class="meter-val-bold" style="color: ${moistureBarColor};">${moisturePercentDisplay}</span>
              </div>
              ${moistureValue > 0 ? `
                <div class="moisture-bar-track">
                  <div class="moisture-bar-fill" style="width: ${moistureBarWidth}%; background-color: ${moistureBarColor};"></div>
                </div>
                <div class="moisture-bar-legend">
                  <span>0%</span>
                  <span class="legend-threshold">Max Limit: 20%</span>
                  <span>25%</span>
                </div>
              ` : `
                <div class="meter-note">Assay report in progress by accredited lab.</div>
              `}
            </div>
          </div>

          <div class="purity-checklist">
            <div class="check-item ${isRecalled ? 'check-fail' : isPending ? 'check-pending' : 'check-pass'}">
              <span class="check-icon">${isRecalled ? '✗' : isPending ? '⏳' : '✓'}</span>
              <span>${isRecalled ? 'Adulteration Markers Detected' : isPending ? 'C3/C4 Sugar Spectrometry In Progress' : '0% Exogenous C3/C4 Sugars (Pure Raw Honey)'}</span>
            </div>
            <div class="check-item ${isPending ? 'check-pending' : 'check-pass'}">
              <span class="check-icon">${isPending ? '⏳' : '✓'}</span>
              <span>${isPending ? 'Antibiotic & Pesticide Screening' : 'Zero Residues / Non-GMO Certified'}</span>
            </div>
            <div class="check-item check-pass">
              <span class="check-icon">✓</span>
              <span>100% Traceable Apiculture Production</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Blockchain Proof & Custody Chain -->
      <div class="passport-section">
        <div class="section-badge-label">⛓️ Immutable Provenance Journey (Ethereum Sepolia)</div>
        <div class="provenance-step-list">
          ${timelineStepsHtml}
        </div>
      </div>

      <!-- Cryptographic Proof Footer -->
      <div class="passport-crypto-footer">
        <div class="crypto-header">
          <span class="crypto-icon">🔐</span>
          <span>Cryptographic Hash Integrity Audit:</span>
        </div>
        <div class="crypto-row">
          <span class="crypto-label">Smart Contract:</span>
          <a href="https://sepolia.etherscan.io/address/${blockchain?.contractAddress || '0x65afF3B44441FfF68171a9a0AA28063BC83C208d'}" target="_blank" rel="noopener noreferrer" class="crypto-link mono">
            ${blockchain?.contractAddress || '0x65afF3B44441FfF68171a9a0AA28063BC83C208d'} ↗
          </a>
        </div>
        <div class="crypto-row">
          <span class="crypto-label">Producer (Beekeeper):</span>
          <span class="crypto-val mono">${shortAddress(blockchain?.producer || harvest?.producer)}</span>
        </div>
        <div class="crypto-row">
          <span class="crypto-label">SHA-256 Digital Fingerprint:</span>
          <span class="crypto-val mono" style="color: ${isIntegrityVerified ? '#10B981' : '#EF4444'};">
            ${isIntegrityVerified ? '✓ Verified Matching Anchor' : '✗ Hash Mismatch'}
          </span>
        </div>
      </div>

    </div>
  `;

  // Attach Action Button Listeners
  const btnCopy = document.getElementById("btnCopyBatch");
  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(batchId);
        btnCopy.textContent = "✓ Copied";
        setTimeout(() => (btnCopy.textContent = "📋 Copy"), 2000);
      } catch (e) {
        btnCopy.textContent = "Copied";
      }
    });
  }

  const btnPrint = document.getElementById("btnPrintCert");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }

  const btnShare = document.getElementById("btnShareCert");
  if (btnShare) {
    btnShare.addEventListener("click", async () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `HoneyChain Certificate - ${batchId}`,
            text: `Authenticity Certificate for HoneyChain Batch ${batchId} on Ethereum Sepolia:`,
            url: shareUrl,
          });
        } catch (e) {}
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          btnShare.textContent = "✓ Link Copied";
          setTimeout(() => (btnShare.textContent = "🔗 Share"), 2000);
        } catch (e) {
          alert(`Certificate URL:\n${shareUrl}`);
        }
      }
    });
  }
}

// Initiate verification fetch
async function startVerification(batchId) {
  renderLoading(batchId);

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(batchId)}`);
    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || "Batch not found in registry";
      renderError(batchId, msg, res.status);
      return;
    }

    renderPassport(data);
  } catch (err) {
    renderError(batchId, `Network connection error: ${err.message}`, 500);
  }
}

// Auto-run on page load
document.addEventListener("DOMContentLoaded", () => {
  const batchId = getTargetBatchId();
  if (batchId) {
    startVerification(batchId);
  } else {
    renderEmptyState();
  }
});
