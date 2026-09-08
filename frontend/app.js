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

// Initial health check and periodic polling
checkHealth();
setInterval(checkHealth, 15000);

// ==========================================
// Hive Health & AI Diagnostics Integration
// ==========================================
const aiHiveSelect = document.getElementById("aiHiveSelect");
const runAiPredictBtn = document.getElementById("runAiPredictBtn");
const aiLoadingIndicator = document.getElementById("aiLoadingIndicator");
const aiDiagnosticsContent = document.getElementById("aiDiagnosticsContent");

const aiStressRiskBadge = document.getElementById("aiStressRiskBadge");
const aiHealthScoreVal = document.getElementById("aiHealthScoreVal");
const aiTierVal = document.getElementById("aiTierVal");
const aiAbnormalityVal = document.getElementById("aiAbnormalityVal");

const driverActivity = document.getElementById("driverActivity");
const driverTemp = document.getElementById("driverTemp");
const driverFlow = document.getElementById("driverFlow");
const driverTrend = document.getElementById("driverTrend");
const driverDrop = document.getElementById("driverDrop");

const aiDetectionScopeChips = document.getElementById("aiDetectionScopeChips");
const aiRecommendationText = document.getElementById("aiRecommendationText");
const aiCaveatBox = document.getElementById("aiCaveatBox");

function renderAiPrediction(pred) {
  if (!pred) return;
  const res = pred.result || pred;

  // Stress Risk Badge
  const risk = res.stressRisk || (res.status === "critical" ? "HIGH" : res.status === "warning" ? "MEDIUM" : "LOW");
  let badgeClass = "risk-badge-low";
  let icon = "🟢";
  if (risk === "HIGH") {
    badgeClass = "risk-badge-high";
    icon = "🔴";
  } else if (risk === "MEDIUM") {
    badgeClass = "risk-badge-medium";
    icon = "🟠";
  }
  aiStressRiskBadge.innerHTML = `<span class="risk-badge ${badgeClass}">${icon} ${risk} RISK</span>`;

  // Health Score
  const score = typeof res.healthScore === "number" ? res.healthScore : "--";
  aiHealthScoreVal.textContent = typeof score === "number" ? `${score.toFixed(1)} / 100` : "-- / 100";
  if (typeof score === "number") {
    aiHealthScoreVal.style.color = score >= 75 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  }

  // Tier
  const tier = res.tier || "--";
  const hours = res.hoursObserved || res.hoursAvailable || "";
  aiTierVal.innerHTML = `<span class="tier-badge">${tier}${hours ? ` (${hours}h window)` : ""}</span>`;

  // Abnormality Risk
  const abn = typeof res.abnormalityRisk === "number" ? `${res.abnormalityRisk.toFixed(1)}%` : "-- %";
  aiAbnormalityVal.textContent = abn;

  // Drivers
  const d = res.drivers || {};
  driverActivity.textContent = typeof d.activityDeviation === "number" ? `${d.activityDeviation > 0 ? "+" : ""}${d.activityDeviation.toFixed(2)}σ` : "--";
  driverTemp.textContent = typeof d.temperatureDeviation === "number" ? `${d.temperatureDeviation > 0 ? "+" : ""}${d.temperatureDeviation.toFixed(2)}σ` : "--";
  driverFlow.textContent = typeof d.netFlow === "number" ? `${d.netFlow > 0 ? "+" : ""}${d.netFlow} bees/hr` : "--";
  driverTrend.textContent = typeof d.weightTrend === "number" ? `${d.weightTrend > 0 ? "+" : ""}${d.weightTrend.toFixed(2)} kg` : "--";
  driverDrop.textContent = typeof d.weightDrop === "number" ? `${d.weightDrop.toFixed(2)} kg` : "--";

  // Detection Scope
  const scopes = res.detectionScope || res.detectedAnomalies || [];
  if (scopes.length > 0) {
    aiDetectionScopeChips.innerHTML = scopes.map(s => `<span class="scope-chip">${s}</span>`).join("");
  } else {
    aiDetectionScopeChips.innerHTML = `<span class="scope-chip">Standard physical monitoring</span>`;
  }

  // Recommendation
  aiRecommendationText.textContent = res.recommendation || (res.recommendedActions && res.recommendedActions[0]) || "Colony within normal range. No action needed.";

  // Caveat for short-window tiers
  if (res.caveat) {
    aiCaveatBox.style.display = "block";
    aiCaveatBox.textContent = `ℹ️ Note: ${res.caveat}`;
  } else {
    aiCaveatBox.style.display = "none";
  }
}

async function loadLatestAiPrediction(hiveId) {
  try {
    const res = await fetch(`/api/ml/latest/${encodeURIComponent(hiveId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        renderAiPrediction(json.data);
      }
    }
  } catch (err) {
    console.debug("No previous prediction found:", err.message);
  }
}

async function triggerAiPrediction(hiveId) {
  if (!runAiPredictBtn) return;
  runAiPredictBtn.disabled = true;
  runAiPredictBtn.textContent = "Analyzing...";
  if (aiLoadingIndicator) aiLoadingIndicator.style.display = "block";

  try {
    const res = await fetch(`/api/ml/predict/${encodeURIComponent(hiveId)}`, { method: "POST" });
    const json = await res.json();

    if (res.ok && json.success && json.data) {
      renderAiPrediction(json.data.prediction || json.data.modelOutput);
    } else if (json.status === "INSUFFICIENT_DATA") {
      aiRecommendationText.textContent = `⚠️ Insufficient Data: ${json.message}`;
      aiStressRiskBadge.innerHTML = `<span class="risk-badge risk-badge-medium">⚪ PENDING DATA</span>`;
      aiHealthScoreVal.textContent = "-- / 100";
    } else {
      aiRecommendationText.textContent = `⚠️ Analysis Notice: ${json.message || "Model evaluation unavailable"}`;
    }
  } catch (err) {
    aiRecommendationText.textContent = `⚠️ Network Error: Unable to complete inference (${err.message})`;
  } finally {
    if (aiLoadingIndicator) aiLoadingIndicator.style.display = "none";
    runAiPredictBtn.disabled = false;
    runAiPredictBtn.textContent = "⚡ Run AI Analysis";
  }
}

if (aiHiveSelect) {
  aiHiveSelect.addEventListener("change", () => {
    loadLatestAiPrediction(aiHiveSelect.value);
  });
  loadLatestAiPrediction(aiHiveSelect.value);
}

if (runAiPredictBtn) {
  runAiPredictBtn.addEventListener("click", () => {
    triggerAiPrediction(aiHiveSelect.value);
  });
}

// -------------------------------------------------------------
// Stakeholder Authentication & Session Management
// -------------------------------------------------------------
const authModalBackdrop = document.getElementById("authModalBackdrop");
const openLoginBtn = document.getElementById("openLoginBtn");
const authModalClose = document.getElementById("authModalClose");
const authLoginForm = document.getElementById("authLoginForm");
const authEmailInput = document.getElementById("authEmailInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const authErrorMessage = document.getElementById("authErrorMessage");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const userProfilePill = document.getElementById("userProfilePill");
const navUserName = document.getElementById("navUserName");
const navUserRole = document.getElementById("navUserRole");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

function getAuthToken() {
  return localStorage.getItem("honeychain_token");
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem("honeychain_token", token);
  } else {
    localStorage.removeItem("honeychain_token");
  }
}

function updateAuthUI(user) {
  currentUser = user;
  if (user) {
    if (openLoginBtn) openLoginBtn.style.display = "none";
    if (userProfilePill) userProfilePill.style.display = "flex";
    if (navUserName) navUserName.textContent = user.name || user.email;
    if (navUserRole) navUserRole.textContent = `${user.role}${user.walletAddress ? " • " + user.walletAddress.slice(0, 6) + "..." : ""}`;
  } else {
    if (openLoginBtn) openLoginBtn.style.display = "inline-flex";
    if (userProfilePill) userProfilePill.style.display = "none";
    if (navUserName) navUserName.textContent = "";
    if (navUserRole) navUserRole.textContent = "";
  }
}

async function checkAuthSession() {
  const token = getAuthToken();
  if (!token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      updateAuthUI(data.user);
    } else {
      setAuthToken(null);
      updateAuthUI(null);
    }
  } catch (err) {
    console.warn("Auth check failed:", err);
  }
}

async function handleLogin(email, password) {
  if (authErrorMessage) authErrorMessage.style.display = "none";
  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Authenticating...";
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || data?.message || "Invalid email or password");
    }

    setAuthToken(data.token);
    updateAuthUI(data.user);
    if (authModalBackdrop) authModalBackdrop.style.display = "none";
    if (authLoginForm) authLoginForm.reset();
  } catch (err) {
    if (authErrorMessage) {
      authErrorMessage.textContent = `⚠️ ${err.message}`;
      authErrorMessage.style.display = "block";
    }
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = "Sign In";
    }
  }
}

if (openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    if (authErrorMessage) authErrorMessage.style.display = "none";
    if (authModalBackdrop) authModalBackdrop.style.display = "flex";
  });
}

if (authModalClose) {
  authModalClose.addEventListener("click", () => {
    if (authModalBackdrop) authModalBackdrop.style.display = "none";
  });
}

if (authModalBackdrop) {
  authModalBackdrop.addEventListener("click", (e) => {
    if (e.target === authModalBackdrop) {
      authModalBackdrop.style.display = "none";
    }
  });
}

if (authLoginForm) {
  authLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin(authEmailInput.value, authPasswordInput.value);
  });
}

document.querySelectorAll(".demo-login-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const email = btn.getAttribute("data-email");
    if (authEmailInput) authEmailInput.value = email;
    handleLogin(email, "Password123!");
  });
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setAuthToken(null);
    updateAuthUI(null);
  });
}

// Initial session probe
checkAuthSession();


