/**
 * HoneyChain Frontend Client
 * Communicates with the Express backend on the same server origin.
 */

// DOM Elements
const systemStatusDot = document.getElementById("system-status-dot");
const systemStatusText = document.getElementById("system-status-text");
const valBackendStatus = document.getElementById("val-backend-status");
const valUptime = document.getElementById("val-uptime");
const valDbStatus = document.getElementById("val-db-status");

const batchIdInput = document.getElementById("batchIdInput");
const verifyBtn = document.getElementById("verifyBtn");
const verifyResult = document.getElementById("verifyResult");
const viewQrBtn = document.getElementById("viewQrBtn");

// QR Modal Elements
const qrModalBackdrop = document.getElementById("qrModalBackdrop");
const qrModalClose = document.getElementById("qrModalClose");
const qrModalBatchTitle = document.getElementById("qrModalBatchTitle");
const qrModalImage = document.getElementById("qrModalImage");
const qrModalUrl = document.getElementById("qrModalUrl");
const qrModalOpenLink = document.getElementById("qrModalOpenLink");
const qrModalDownloadBtn = document.getElementById("qrModalDownloadBtn");
const qrModalPrintBtn = document.getElementById("qrModalPrintBtn");

// Format seconds into human readable duration
function formatUptime(seconds) {
  if (typeof seconds !== "number") return "--";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Check Backend Health
async function checkHealth() {
  try {
    const res = await fetch("/health");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    systemStatusDot.className = "pulse-dot online";
    systemStatusText.textContent = "Backend & Database Connected";

    valBackendStatus.textContent = data.status === "ok" ? "Online (200 OK)" : "Degraded";
    valBackendStatus.style.color = "#10B981";

    valUptime.textContent = `Uptime: ${formatUptime(data.uptimeSeconds)}`;

    const dbConnected = data.database?.status === "connected";
    valDbStatus.textContent = dbConnected ? "Connected" : "Disconnected";
    valDbStatus.style.color = dbConnected ? "#10B981" : "#EF4444";
  } catch (err) {
    systemStatusDot.className = "pulse-dot offline";
    systemStatusText.textContent = "Backend Offline / Reconnecting";
    valBackendStatus.textContent = "Offline";
    valBackendStatus.style.color = "#EF4444";
    valDbStatus.textContent = "Unavailable";
    valDbStatus.style.color = "#EF4444";
  }
}

// Open and load QR code modal
async function openQrModal(batchId) {
  const cleanId = batchId?.trim();
  if (!cleanId) return;

  qrModalBatchTitle.textContent = cleanId;
  qrModalUrl.textContent = "Generating QR code...";
  qrModalImage.src = "";
  qrModalImage.alt = `Generating QR code for ${cleanId}...`;
  qrModalBackdrop.style.display = "flex";

  try {
    const res = await fetch(`/api/batches/${encodeURIComponent(cleanId)}/qr`);
    const data = await res.json();

    if (!res.ok) {
      qrModalUrl.textContent = `Error: ${data?.error?.message || data?.message || "Batch not found"}`;
      return;
    }

    qrModalImage.src = data.dataUrl;
    qrModalUrl.textContent = data.verificationUrl;
    qrModalOpenLink.href = data.verificationUrl;

    qrModalDownloadBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = data.dataUrl;
      a.download = `HoneyChain-${cleanId}-QR.png`;
      a.click();
    };

    qrModalPrintBtn.onclick = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to print jar label.");
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>HoneyChain Jar Label - ${cleanId}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .label-card { border: 2px solid #000; border-radius: 8px; padding: 16px; max-width: 320px; margin: 0 auto; }
            img { width: 200px; height: 200px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .batch { font-family: monospace; font-size: 14px; margin-bottom: 8px; }
            .hint { font-size: 11px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            <div class="title">🍯 HoneyChain Authenticity</div>
            <div class="batch">Batch: ${cleanId}</div>
            <img src="${data.dataUrl}" alt="QR">
            <div class="hint">Scan to verify purity & Ethereum Sepolia provenance</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    };
  } catch (err) {
    qrModalUrl.textContent = `Network Error: ${err.message}`;
  }
}

function closeQrModal() {
  qrModalBackdrop.style.display = "none";
}

if (qrModalClose) {
  qrModalClose.addEventListener("click", closeQrModal);
}
if (qrModalBackdrop) {
  qrModalBackdrop.addEventListener("click", (e) => {
    if (e.target === qrModalBackdrop) closeQrModal();
  });
}
if (viewQrBtn) {
  viewQrBtn.addEventListener("click", () => openQrModal(batchIdInput.value));
}

// Verify Batch Provenance
async function verifyBatch(batchId) {
  const cleanId = batchId?.trim();
  if (!cleanId) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Verifying On-Chain...";
  verifyResult.className = "result-container";
  verifyResult.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Querying Ethereum Sepolia smart contract & MongoDB...</div>`;

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(cleanId)}`);
    const data = await res.json();

    if (!res.ok) {
      verifyResult.innerHTML = `
        <div style="color: var(--danger); font-weight: 600;">
          ⚠️ Verification Failed: ${data?.error?.message || data?.message || "Batch not found"}
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
          Make sure the batch was registered by an authorized Beekeeper wallet.
        </p>
      `;
      return;
    }

    const isRecalled = data.recall?.recalled === true || data.data?.batch?.status === "Recalled";
    const isVerified = (data.tamperProofAudit?.integrityVerified === true || data.data?.verification?.tamperProof === true) && !isRecalled;
    const floralOrigin = data.harvest?.floralOrigin || data.data?.batch?.floralOrigin || "Unspecified";
    const grade = data.quality?.grade || data.data?.batch?.quality?.grade || "Pending Lab Assay";
    const moisture = data.quality?.moisturePercentage || data.data?.batch?.quality?.moisturePercentage;
    const producer = data.blockchain?.producer || data.harvest?.producer || data.data?.batch?.producer;
    const custodian = data.blockchain?.currentCustodian || data.data?.batch?.currentCustodian;
    const history = data.custodyTimeline || data.data?.history || [];

    const badgeClass = isRecalled ? "badge-recalled" : isVerified ? "badge-success" : "badge-recalled";
    const badgeText = isRecalled ? "RECALLED" : isVerified ? "✓ 100% VERIFIED & TAMPER-PROOF" : "⚠️ TAMPER DETECTED";

    // Build timeline HTML
    let timelineHtml = "";
    if (Array.isArray(history) && history.length > 0) {
      timelineHtml = `
        <div class="timeline-wrap">
          <div class="timeline-title">Chronological On-Chain Custody Timeline</div>
          <div class="timeline">
            ${history
              .map((evt) => {
                const dateStr = evt.timestamp ? new Date(evt.timestamp * 1000).toLocaleString() : "Unknown Time";
                const txLink = evt.txHash
                  ? `<a class="link" href="https://sepolia.etherscan.io/tx/${evt.txHash}" target="_blank" rel="noopener noreferrer">Tx: ${evt.txHash.substring(0, 10)}...${evt.txHash.substring(evt.txHash.length - 8)} ↗</a>`
                  : "";
                return `
                <div class="timeline-step">
                  <div class="timeline-step-name">${evt.event}</div>
                  <div class="timeline-step-meta">
                    ${dateStr} ${txLink ? "• " + txLink : ""}
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    verifyResult.innerHTML = `
      <div class="result-header">
        <div>
          <span style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Batch Identifier</span>
          <h3 style="font-family: var(--font-mono); font-size: 1.25rem;">${cleanId}</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <button type="button" class="btn-sm" onclick="openQrModal('${cleanId}')" style="cursor: pointer;">📱 View QR</button>
          <a class="btn-sm" href="/verify/${encodeURIComponent(cleanId)}" target="_blank">Open Verification Page ↗</a>
          <span class="result-badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>

      <div class="result-grid">
        <div class="meta-item">
          <span class="meta-label">Floral Origin</span>
          <span class="meta-val">${floralOrigin}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Certified Grade</span>
          <span class="meta-val">${grade}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Moisture Content</span>
          <span class="meta-val">${moisture ? moisture + "%" : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Producer (Beekeeper)</span>
          <span class="meta-val mono">${producer ? producer.substring(0, 8) + "..." + producer.substring(producer.length - 4) : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Current Custodian</span>
          <span class="meta-val mono">${custodian ? custodian.substring(0, 8) + "..." + custodian.substring(custodian.length - 4) : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Cryptographic Proof</span>
          <span class="meta-val" style="color: ${isVerified ? '#10B981' : '#EF4444'};">
            ${isVerified ? "Hash Match (SHA-256 Valid)" : isRecalled ? "Recalled On-Chain" : "Hash Mismatch"}
          </span>
        </div>
      </div>

      ${timelineHtml}
    `;
  } catch (err) {
    verifyResult.innerHTML = `
      <div style="color: var(--danger); font-weight: 600;">
        ⚠️ Network Error: Unable to communicate with verification API (${err.message}).
      </div>
    `;
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify Batch";
  }
}

// Event Listeners
verifyBtn.addEventListener("click", () => verifyBatch(batchIdInput.value));
batchIdInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") verifyBatch(batchIdInput.value);
});

// Setup sample chips
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const id = chip.getAttribute("data-batch");
    batchIdInput.value = id;
    verifyBatch(id);
  });
});

// Trigger Live Telemetry Cycle
const triggerSimBtn = document.getElementById("triggerSimBtn");
const simStatusMessage = document.getElementById("simStatusMessage");

if (triggerSimBtn) {
  triggerSimBtn.addEventListener("click", async () => {
    triggerSimBtn.disabled = true;
    triggerSimBtn.textContent = "Transmitting Telemetry...";
    simStatusMessage.style.color = "var(--text-muted)";
    simStatusMessage.textContent = "Sending readings for 5 hives to /api/iot/telemetry...";

    try {
      const res = await fetch("/api/iot/simulate", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        simStatusMessage.style.color = "var(--success)";
        simStatusMessage.textContent = `✓ ${data.message}`;
      } else {
        simStatusMessage.style.color = "var(--danger)";
        simStatusMessage.textContent = `✗ Failed: ${data?.error?.message || data?.message || "Unknown error"}`;
      }
    } catch (err) {
      simStatusMessage.style.color = "var(--danger)";
      simStatusMessage.textContent = `✗ Network Error: ${err.message}`;
    } finally {
      triggerSimBtn.disabled = false;
      triggerSimBtn.textContent = "⚡ Trigger Live Telemetry Cycle Now";
    }
  });
}

// Initial health check and periodic polling
checkHealth();
setInterval(checkHealth, 15000);
