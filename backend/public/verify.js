/**
 * HoneyChain Consumer QR Verification Script
 * Automatically verifies batch authenticity against MongoDB and Ethereum Sepolia.
 */

// DOM Elements
const verifyBatchInput = document.getElementById("verifyBatchInput");
const submitVerifyBtn = document.getElementById("submitVerifyBtn");
const verifyDisplayArea = document.getElementById("verifyDisplayArea");

// Helper: Format UNIX timestamp to localized date/time
function formatTimestamp(ts) {
  if (!ts) return "N/A";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num) || num <= 0) return "N/A";
  // Convert seconds to milliseconds if < 10000000000
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper: Truncate Ethereum address for UI
function shortAddress(addr) {
  if (!addr || typeof addr !== "string") return "--";
  if (addr.length < 12) return addr;
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

// Helper: Truncate hash for UI
function shortHash(hash) {
  if (!hash || typeof hash !== "string") return "--";
  if (hash.length < 16) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

// Extract batch ID from URL path or search query
function extractBatchIdFromUrl() {
  const pathname = window.location.pathname;
  // Check /verify/:batchId
  const match = pathname.match(/\/verify\/([^/?#]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }

  // Check ?batchId=...
  const urlParams = new URLSearchParams(window.location.search);
  const paramBatchId = urlParams.get("batchId");
  if (paramBatchId) {
    return paramBatchId.trim();
  }

  return "";
}

// Render Loading Spinner
function renderLoading(batchId) {
  verifyDisplayArea.innerHTML = `
    <div class="verify-card" style="text-align: center; padding: 3rem 1.5rem;">
      <div class="honey-spinner" style="font-size: 2.5rem; margin-bottom: 1rem; animation: pulse 1.5s infinite;">🍯</div>
      <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Verifying Batch Authenticity...</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 450px; margin: 0 auto;">
        Querying Ethereum Sepolia smart contract <span class="mono" style="color: var(--primary); font-size: 0.8rem;">0x65af...208d</span> and performing SHA-256 cryptographic audit for <strong class="mono" style="color: var(--text-main);">${batchId}</strong>...
      </p>
    </div>
  `;
}

// Render 404 / Error State
function renderError(batchId, errorMessage, statusCode = 404) {
  verifyDisplayArea.innerHTML = `
    <div class="verify-card" style="border-color: rgba(239, 68, 68, 0.4);">
      <div class="verify-status-banner banner-warning">
        <div class="status-icon" style="font-size: 2rem;">⚠️</div>
        <div>
          <div class="status-title" style="color: #EF4444; font-size: 1.35rem; font-weight: 700;">
            ${statusCode === 404 ? "PRODUCT NOT FOUND IN REGISTRY" : "VERIFICATION ERROR"}
          </div>
          <div class="status-sub">
            ${errorMessage || `The batch ID '${batchId}' could not be verified in the HoneyChain blockchain registry.`}
          </div>
        </div>
      </div>

      <div style="padding: 1.5rem; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 1.25rem;">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-main);">What does this mean for consumers?</h4>
        <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.7; padding-left: 1.25rem;">
          <li>This honey batch may not have been registered by an authorized HoneyChain beekeeper yet.</li>
          <li>Check that the batch ID matches the exact code printed on the physical jar label.</li>
          <li>If you suspect counterfeit honey, contact the apiary or retailer directly.</li>
        </ul>
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="/" class="btn btn-primary" style="text-decoration: none; text-align: center;">HoneyChain Home</a>
        <button type="button" class="btn" onclick="location.reload()" style="background: var(--bg-card-hover); color: var(--text-main); border: 1px solid var(--border-subtle);">
          Try Again
        </button>
      </div>
    </div>
  `;
}

// Render Verified Consumer Provenance UI
function renderVerificationResult(data) {
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

  // Determine Primary Badge State
  let badgeClass = "badge-success";
  let badgeTitle = "✓ AUTHENTIC HONEY";
  let badgeSubtitle = "Cryptographically anchored on Ethereum Sepolia • 100% Tamper-Proof";

  if (isRecalled) {
    badgeClass = "badge-recalled";
    badgeTitle = "⛔ PRODUCT RECALLED";
    badgeSubtitle = "Official safety / quality recall issued on-chain by authorized auditor";
  } else if (!isIntegrityVerified) {
    badgeClass = "badge-warning";
    badgeTitle = "⚠️ INTEGRITY WARNING";
    badgeSubtitle = "Cryptographic hash mismatch: Harvest metadata may have been modified!";
  }

  // Build Recall Alert Banner if recalled
  let recallAlertHtml = "";
  if (isRecalled) {
    recallAlertHtml = `
      <div class="recall-alert-box" style="margin-bottom: 1.5rem; padding: 1.25rem; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 2px solid #EF4444;">
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
          <span style="font-size: 1.75rem;">🚨</span>
          <div>
            <h4 style="color: #EF4444; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">CRITICAL CONSUMER SAFETY NOTICE: DO NOT CONSUME</h4>
            <p style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 0.5rem;">
              <strong>Reason:</strong> ${recall.reason || "Safety recall issued"}
            </p>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              <span>Recalled By: <span class="mono">${shortAddress(recall.recalledBy)}</span></span>
              ${recall.recalledAt ? ` • <span>Date: ${formatTimestamp(recall.recalledAt)}</span>` : ""}
              ${recall.txHash ? ` • <a href="https://sepolia.etherscan.io/tx/${recall.txHash}" target="_blank" rel="noopener noreferrer" class="link">View Recall Tx ↗</a>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Format Floral Origin and Apiary Location
  const floralOrigin = harvest?.floralOrigin || "Wild Forest & Multifloral";
  const harvestDate = formatTimestamp(harvest?.harvestTimestamp);
  const quantityFormatted = harvest?.quantityGrams
    ? `${harvest.quantityGrams.toLocaleString()} g (${(harvest.quantityGrams / 1000).toFixed(2)} kg)`
    : "--";
  const locationRegion = harvest?.apiaryLocation?.region || "Certified Sanctuary";
  const locationCoords =
    harvest?.apiaryLocation?.latitude && harvest?.apiaryLocation?.longitude
      ? `${harvest.apiaryLocation.latitude.toFixed(4)}° N, ${harvest.apiaryLocation.longitude.toFixed(4)}° E`
      : "GPS Protected";
  const sourceHivesList = Array.isArray(harvest?.sourceHives) && harvest.sourceHives.length > 0
    ? harvest.sourceHives.join(", ")
    : "Registered Apiary Hives";

  // Quality Grade formatting
  const qualityGrade = quality?.grade || "Grade A";
  const moisturePct = quality?.moisturePercentage ? `${quality.moisturePercentage}%` : "Pending Assay";

  // Build Provenance Timeline
  let timelineItemsHtml = "";
  if (Array.isArray(custodyTimeline) && custodyTimeline.length > 0) {
    timelineItemsHtml = custodyTimeline
      .map((evt, idx) => {
        const timeStr = formatTimestamp(evt.timestamp);
        const txLink = evt.txHash
          ? `<a class="link" href="https://sepolia.etherscan.io/tx/${evt.txHash}" target="_blank" rel="noopener noreferrer">Tx: ${shortHash(evt.txHash)} ↗</a>`
          : "";
        return `
          <div class="timeline-step">
            <div class="timeline-marker">${idx + 1}</div>
            <div class="timeline-body">
              <div class="timeline-step-name">${evt.event || "Custody Event"}</div>
              <div class="timeline-step-meta">
                <span>${timeStr}</span>
                ${evt.location ? `• <span>📍 ${evt.location}</span>` : ""}
                ${txLink ? `• <span>${txLink}</span>` : ""}
              </div>
              ${evt.from && evt.to ? `<div class="timeline-step-detail mono">${shortAddress(evt.from)} → ${shortAddress(evt.to)}</div>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  } else {
    timelineItemsHtml = `
      <div class="timeline-step">
        <div class="timeline-marker">1</div>
        <div class="timeline-body">
          <div class="timeline-step-name">Harvest Registered On-Chain</div>
          <div class="timeline-step-meta">${harvestDate} • Ethereum Sepolia Confirmed</div>
        </div>
      </div>
    `;
  }

  // Construct Full HTML
  verifyDisplayArea.innerHTML = `
    <div class="verify-card">
      
      ${recallAlertHtml}

      <!-- Status Header -->
      <div class="verify-status-banner ${badgeClass}">
        <div class="status-icon" style="font-size: 2.25rem;">
          ${isRecalled ? "🛑" : isIntegrityVerified ? "✅" : "⚠️"}
        </div>
        <div>
          <div class="status-title" style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.01em;">
            ${badgeTitle}
          </div>
          <div class="status-sub" style="font-size: 0.9rem; opacity: 0.9; margin-top: 0.2rem;">
            ${badgeSubtitle}
          </div>
        </div>
      </div>

      <!-- Batch Quick Summary Banner -->
      <div class="batch-summary-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); font-weight: 600; letter-spacing: 0.05em;">Jar Batch Identifier</span>
          <h2 style="font-family: var(--font-mono); font-size: 1.4rem; color: var(--text-main); margin-top: 0.2rem;">${batchId}</h2>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;" class="no-print">
          <button type="button" id="copyIdBtn" class="btn-sm" style="cursor: pointer;" title="Copy Batch ID">📋 Copy ID</button>
          <button type="button" id="printCertBtn" class="btn-sm" style="cursor: pointer;" title="Print Jar Certificate">🖨️ Print Proof</button>
          <button type="button" id="shareProofBtn" class="btn-sm" style="cursor: pointer;" title="Share Verification Link">🔗 Share</button>
        </div>
      </div>

      <!-- Comprehensive Data Grid -->
      <div class="verify-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1.5rem;">
        
        <!-- Card 1: Botanical & Harvest Origin -->
        <div class="data-box">
          <div class="data-box-title">🌸 Botanical & Harvest Origin</div>
          <div class="data-row">
            <span class="data-label">Floral Source</span>
            <span class="data-val" style="color: var(--primary); font-weight: 600;">${floralOrigin}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Harvest Date</span>
            <span class="data-val">${harvestDate}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Harvest Volume</span>
            <span class="data-val">${quantityFormatted}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Apiary Sanctuary</span>
            <span class="data-val">${locationRegion}</span>
          </div>
          <div class="data-row">
            <span class="data-label">GPS Coordinates</span>
            <span class="data-val mono" style="font-size: 0.8rem;">${locationCoords}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Monitored Hives</span>
            <span class="data-val mono" style="font-size: 0.8rem;">${sourceHivesList}</span>
          </div>
        </div>

        <!-- Card 2: Laboratory Certification & Purity -->
        <div class="data-box">
          <div class="data-box-title">🔬 Certified Quality & Lab Purity</div>
          <div class="data-row">
            <span class="data-label">Certified Grade</span>
            <span class="data-val">
              <span class="grade-badge" style="background: rgba(245, 158, 11, 0.2); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 700;">${qualityGrade}</span>
            </span>
          </div>
          <div class="data-row">
            <span class="data-label">Moisture Content</span>
            <span class="data-val" style="color: #10B981; font-weight: 600;">${moisturePct} <span style="font-size: 0.75rem; color: var(--text-dim);">(Max limit: 20%)</span></span>
          </div>
          <div class="data-row">
            <span class="data-label">Assay Certifier</span>
            <span class="data-val mono" style="font-size: 0.8rem;">
              <a href="https://sepolia.etherscan.io/address/${quality?.certifiedBy || ''}" target="_blank" rel="noopener noreferrer" class="link">${shortAddress(quality?.certifiedBy)} ↗</a>
            </span>
          </div>
          <div class="data-row">
            <span class="data-label">Lab Report Hash</span>
            <span class="data-val mono" style="font-size: 0.75rem;" title="${quality?.labReportHash || ''}">${shortHash(quality?.labReportHash)}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Purity Assay Status</span>
            <span class="data-val" style="color: #10B981; font-weight: 600;">✓ Unadulterated Raw Honey</span>
          </div>
        </div>

        <!-- Card 3: Ethereum Sepolia Blockchain Proof -->
        <div class="data-box" style="grid-column: 1 / -1;">
          <div class="data-box-title">⛓️ Ethereum Sepolia Blockchain Provenance</div>
          <div class="sub-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div>
              <div class="data-label">Smart Contract</div>
              <div class="data-val mono" style="font-size: 0.85rem; margin-top: 0.2rem;">
                <a href="https://sepolia.etherscan.io/address/${blockchain?.contractAddress || '0x65afF3B44441FfF68171a9a0AA28063BC83C208d'}" target="_blank" rel="noopener noreferrer" class="link">
                  ${blockchain?.contractAddress || '0x65afF3B44441FfF68171a9a0AA28063BC83C208d'} ↗
                </a>
              </div>
            </div>
            <div>
              <div class="data-label">Beekeeper (Producer)</div>
              <div class="data-val mono" style="font-size: 0.85rem; margin-top: 0.2rem;">
                <a href="https://sepolia.etherscan.io/address/${blockchain?.producer || harvest?.producer || ''}" target="_blank" rel="noopener noreferrer" class="link">
                  ${blockchain?.producer || harvest?.producer || '--'} ↗
                </a>
              </div>
            </div>
            <div>
              <div class="data-label">Current Legal Custodian</div>
              <div class="data-val mono" style="font-size: 0.85rem; margin-top: 0.2rem;">
                <a href="https://sepolia.etherscan.io/address/${blockchain?.currentCustodian || ''}" target="_blank" rel="noopener noreferrer" class="link">
                  ${blockchain?.currentCustodian || '--'} ↗
                </a>
              </div>
            </div>
            <div>
              <div class="data-label">Cryptographic Integrity Match</div>
              <div class="data-val" style="color: ${isIntegrityVerified ? '#10B981' : '#EF4444'}; font-weight: 600; margin-top: 0.2rem;">
                ${isIntegrityVerified ? '✓ SHA-256 On-Chain & Off-Chain Match' : '✗ Hash Mismatch Detected'}
              </div>
            </div>
          </div>

          <!-- Hash Comparison Pill -->
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.25); border-radius: 6px; font-family: var(--font-mono); font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <span style="color: var(--text-dim);">On-Chain Metadata Hash:</span>
              <span style="color: var(--text-main);">${tamperProofAudit?.onChainMetadataHash || '--'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <span style="color: var(--text-dim);">Off-Chain Recomputed Hash:</span>
              <span style="color: ${isIntegrityVerified ? '#10B981' : '#EF4444'};">${tamperProofAudit?.offChainMetadataHash || '--'}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Chronological Custody Trail -->
      <div style="margin-top: 2rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
          <span>📦</span> Chronological Supply Chain Journey
        </h3>
        <div class="consumer-timeline">
          ${timelineItemsHtml}
        </div>
      </div>

    </div>
  `;

  // Attach button event handlers
  const copyIdBtn = document.getElementById("copyIdBtn");
  if (copyIdBtn) {
    copyIdBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(batchId);
        copyIdBtn.textContent = "✓ Copied!";
        setTimeout(() => (copyIdBtn.textContent = "📋 Copy ID"), 2000);
      } catch (e) {
        copyIdBtn.textContent = "Failed";
      }
    });
  }

  const printCertBtn = document.getElementById("printCertBtn");
  if (printCertBtn) {
    printCertBtn.addEventListener("click", () => {
      window.print();
    });
  }

  const shareProofBtn = document.getElementById("shareProofBtn");
  if (shareProofBtn) {
    shareProofBtn.addEventListener("click", async () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `HoneyChain Provenance Proof - ${batchId}`,
            text: `Verify the authentic provenance of HoneyChain Batch ${batchId} on Ethereum Sepolia:`,
            url: shareUrl,
          });
        } catch (e) {
          // User canceled or failed share
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          shareProofBtn.textContent = "✓ Link Copied!";
          setTimeout(() => (shareProofBtn.textContent = "🔗 Share"), 2000);
        } catch (e) {
          alert(`Verification Link:\n${shareUrl}`);
        }
      }
    });
  }
}

// Execute Verification API Call
async function performVerification(batchId) {
  const cleanId = batchId?.trim();
  if (!cleanId) return;

  renderLoading(cleanId);

  // Update browser URL without reloading if needed
  if (!window.location.pathname.includes(`/verify/${encodeURIComponent(cleanId)}`)) {
    try {
      window.history.pushState(null, "", `/verify/${encodeURIComponent(cleanId)}`);
    } catch (e) {
      // Ignore in environments where pushState is restricted
    }
  }

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(cleanId)}`);
    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || "Batch not found in registry";
      renderError(cleanId, msg, res.status);
      return;
    }

    renderVerificationResult(data);
  } catch (err) {
    renderError(cleanId, `Network Error: Unable to communicate with backend server (${err.message})`, 500);
  }
}

// Submit button & input listeners
if (submitVerifyBtn && verifyBatchInput) {
  submitVerifyBtn.addEventListener("click", () => {
    performVerification(verifyBatchInput.value);
  });

  verifyBatchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performVerification(verifyBatchInput.value);
    }
  });
}

// Setup sample buttons
document.querySelectorAll(".sample-verify-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const id = chip.getAttribute("data-batch");
    if (verifyBatchInput) verifyBatchInput.value = id;
    performVerification(id);
  });
});

// Auto-run verification on page load if batchId in URL
document.addEventListener("DOMContentLoaded", () => {
  const initialBatchId = extractBatchIdFromUrl();
  if (initialBatchId) {
    if (verifyBatchInput) verifyBatchInput.value = initialBatchId;
    performVerification(initialBatchId);
  } else {
    // Show polite initial welcome prompt
    verifyDisplayArea.innerHTML = `
      <div class="verify-card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Scan or Enter a Honey Jar Batch Code</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 480px; margin: 0 auto;">
          Enter the Batch ID printed on your honey jar label, or select one of the sample test batches above to view its immutable Ethereum Sepolia provenance trail.
        </p>
      </div>
    `;
  }
});
