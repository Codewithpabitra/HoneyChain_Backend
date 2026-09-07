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

    const { batch, verification, history } = data.data || {};
    const isRecalled = batch?.status === "Recalled" || verification?.tamperStatus === "RECALLED";
    const isVerified = verification?.tamperProof === true && !isRecalled;

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
          <h3 style="font-family: var(--font-mono); font-size: 1.25rem;">${batch?.batchId || cleanId}</h3>
        </div>
        <span class="result-badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="result-grid">
        <div class="meta-item">
          <span class="meta-label">Floral Origin</span>
          <span class="meta-val">${batch?.floralOrigin || "Unspecified"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Certified Grade</span>
          <span class="meta-val">${batch?.quality?.grade || "Pending Lab Assay"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Moisture Content</span>
          <span class="meta-val">${batch?.quality?.moisturePercentage ? batch.quality.moisturePercentage + "%" : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Producer (Beekeeper)</span>
          <span class="meta-val mono">${batch?.producer ? batch.producer.substring(0, 8) + "..." + batch.producer.substring(36) : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Current Custodian</span>
          <span class="meta-val mono">${batch?.currentCustodian ? batch.currentCustodian.substring(0, 8) + "..." + batch.currentCustodian.substring(36) : "--"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Cryptographic Proof</span>
          <span class="meta-val" style="color: ${isVerified ? '#10B981' : '#EF4444'};">
            ${verification?.hashMatch ? "Hash Match (SHA-256 Valid)" : "Hash Mismatch"}
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

