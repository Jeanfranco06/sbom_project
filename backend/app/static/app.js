/* Dashboard SecSBOM */
const state = { projects: [], current: null, settings: null };

const $ = (sel) => document.querySelector(sel);
const hide = (el) => el.classList.add("hidden");
const show = (el) => el.classList.remove("hidden");

async function api(path, options = {}) {
  const resp = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try { detail = (await resp.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------- Navegacion ---------- */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));

/* ---------- Init ---------- */
(async function init() {
  try {
    st = await api("/api/snapshots/status");
    $("#mode-badge").textContent = "modo: " + st.mode;
  } catch {}
  loadProjects();
})();
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(hide);
    show($("#view-" + btn.dataset.view));
    if (btn.dataset.view === "projects") loadProjects();
    if (btn.dataset.view === "settings") loadSettings();
    if (btn.dataset.view === "snapshots") loadSnapshots();
    if (btn.dataset.view === "experiments") loadExperiments();
  });
});

/* ---------- Proyectos ---------- */
async function loadProjects() {
  const list = $("#projects-list");
  list.innerHTML = '<div class="empty">Cargando...</div>';
  try {
    state.projects = await api("/api/projects");
  } catch (e) {
    list.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    return;
  }
  if (!state.projects.length) {
    list.innerHTML = '<div class="empty">No hay proyectos. Crea uno para comenzar.</div>';
    return;
  }
  list.innerHTML = "";
  for (const p of state.projects) {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <h3>${esc(p.name)}</h3>
      <div class="path">${esc(p.path)}</div>
      <div class="tags">
        <span class="tag">${esc(p.environment)}</span>
        <span class="tag">expuesto: ${p.internet_exposed ? "si" : "no"}</span>
        <span class="tag">datos: ${esc(p.data_criticality)}</span>
      </div>`;
    card.addEventListener("click", () => openProject(p));
    list.appendChild(card);
  }
}

$("#btn-new-project").addEventListener("click", () => show($("#modal-projects")));
document.querySelectorAll(".modal-close").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".modal").forEach(hide);
  })
);

$("#form-project").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.internet_exposed = e.target.internet_exposed.checked;
  try {
    await api("/api/projects", { method: "POST", body: JSON.stringify(data) });
    hide($("#modal-projects"));
    e.target.reset();
    loadProjects();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

/* ---------- Proyecto: detalle ---------- */
async function openProject(project) {
  state.current = project;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(hide);
  show($("#view-project"));
  $("#project-name").textContent = project.name;
  $("#project-meta").textContent =
    `Ruta: ${project.path} | Entorno: ${project.environment} | Datos: ${project.data_criticality}`;
  loadSummary();
  loadFindings();
}

$("#btn-back").addEventListener("click", () => {
  state.current = null;
  document.querySelectorAll(".view").forEach(hide);
  show($("#view-projects"));
  loadProjects();
});

$("#btn-analyze").addEventListener("click", async () => {
  if (!state.current) return;
  const btn = $("#btn-analyze");
  btn.disabled = true;
  btn.textContent = "Analizando...";
  try {
    await api(`/api/projects/${state.current.id}/analyze`, { method: "POST" });
    loadSummary();
    loadFindings();
  } catch (err) {
    alert("Error en el analisis: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Analizar ahora";
  }
});

async function loadSummary() {
  const wrap = $("#analysis-summary");
  wrap.innerHTML = '<div class="empty">Cargando resumen...</div>';
  let data;
  try {
    data = await api(`/api/projects/${state.current.id}/analysis`);
  } catch (e) {
    wrap.innerHTML = "";
    return;
  }
  const counts = data.by_priority || {};
  const cards = [
    { label: "Dependencias", sub: `${data.direct_count} directas / ${data.transitive_count} transitivas`, num: data.dependency_count },
    { label: "Hallazgos", sub: "vulnerabilidades correlacionadas", num: data.finding_count },
    { label: "Criticas", sub: "maxima prioridad", num: counts.critical || 0 },
    { label: "Altas", sub: "requieren atencion", num: counts.high || 0 },
    { label: "En KEV", sub: "explotacion activa (CISA)", num: data.kev_finding_count || 0 },
    { label: "Con parche", sub: "actualizacion disponible", num: data.patch_available_count || 0 },
  ];
  wrap.innerHTML = cards
    .map((c) => `<div class="card"><div class="num">${esc(c.num)}</div><div class="lbl">${esc(c.label)}</div><div class="sub">${esc(c.sub)}</div></div>`)
    .join("");
  if (data.analysis.status === "error") {
    wrap.insertAdjacentHTML("beforeend", `<div class="rule">Error: ${esc(data.analysis.error)}</div>`);
  }
}

async function loadFindings() {
  const el = $("#findings-list");
  el.innerHTML = '<div class="empty">Cargando hallazgos...</div>';
  const q = new URLSearchParams();
  const prio = $("#filter-priority").value;
  if (prio) q.set("priority", prio);
  if ($("#filter-kev").checked) q.set("kev", "true");
  if ($("#filter-direct").checked) q.set("direct", "true");
  const qtext = $("#filter-q").value;
  if (qtext) q.set("q", qtext);

  let findings;
  try {
    findings = await api(`/api/projects/${state.current.id}/findings?${q.toString()}`);
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    return;
  }
  if (!findings.length) {
    el.innerHTML = '<div class="empty">Sin hallazgos para los filtros seleccionados.</div>';
    return;
  }
  el.innerHTML = "";
  for (const f of findings) {
    el.appendChild(renderFinding(f));
  }
}

function renderFinding(f) {
  const row = document.createElement("div");
  row.className = `finding ${f.priority_label}`;
  const epss = f.epss_score != null ? f.epss_score.toFixed(4) : "-";
  const cvss = f.cvss_score != null ? f.cvss_score : "-";
  row.innerHTML = `
    <div class="finding-head">
      <div class="finding-main">
        <span class="tid">${esc(f.vuln_id)} <span class="pill ${f.priority_label}">${esc(f.priority_label)}</span></span>
        <span class="pkg">${esc(f.dependency_name)} ${esc(f.dependency_version)} &middot; ${f.is_direct ? "directa" : "transitiva"}${f.is_dev ? "/dev" : ""}</span>
      </div>
      <div class="finding-metrics">
        <div class="metric"><div class="num" style="font-size:16px">${f.priority_score}</div><div class="lv">score</div></div>
        <div class="metric"><div class="val">${esc(cvss)}</div><div class="lv">CVSS</div></div>
        <div class="metric"><div class="val">${epss}</div><div class="lv">EPSS</div></div>
        <div class="metric"><div class="val">${f.is_kev ? "SI" : "no"}</div><div class="lv">KEV</div></div>
        <div class="metric"><div class="val">${f.patch_available ? "si" : "no"}</div><div class="lv">parche</div></div>
        <span class="chev">&#9660;</span>
      </div>
    </div>
    <div class="finding-body"></div>`;

  const body = row.querySelector(".finding-body");
  const expl = f.explanation || {};
  const factors = (expl.factors || []).map((ft) => `
      <tr>
        <td>${esc(ft.label)}</td>
        <td>${esc(ft.source)}</td>
        <td>${esc(JSON.stringify(ft.internal_value))}</td>
        <td>${ft.contribution_pct}%</td>
      </tr>`).join("");
  const rules = (f.rules_applied || []).map((r) => `<div class="rule">${esc(r)}</div>`).join("");
  body.innerHTML = `
    <div class="explanation">
      <strong>Resumen:</strong> ${esc(f.summary || "(sin descripcion)")}<br/><br/>
      <strong>Puntaje de prioridad:</strong> ${f.priority_score} (${f.priority_label}) <br/>
      <strong>Perfil:</strong> ${esc(expl.profile ? expl.profile.environment : "-")},
        expuesto=${esc(expl.profile ? expl.profile.internet_exposed : "")},
        datos=${esc(expl.profile ? expl.profile.data_criticality : "")}
    </div>
    <h4>Factores y contribucion</h4>
    <table class="factor-table">
      <tr><th>Factor</th><th>Fuente</th><th>Valor interno</th><th>Contribucion</th></tr>
      ${factors}
    </table>
    ${rules ? "<h4>Reglas de excepcion</h4>" + rules : ""}
    <h4>Recomendacion de remediacion</h4>
    <div class="reco">${esc(expl.remediation || "-")}</div>
    ${expl.fixed_versions && expl.fixed_versions.length ? "" : ""}`;

  row.querySelector(".finding-head").addEventListener("click", () => row.classList.toggle("open"));
  return row;
}

$("#findings-list").addEventListener("change", () => { if (state.current) loadFindings(); });
$("#findings-list").addEventListener("input", () => { if (state.current) loadFindings(); });

/* ---------- SBOM ---------- */
$("#btn-sbom").addEventListener("click", async () => {
  const resp = await fetch(`/api/projects/${state.current.id}/sbom`);
  const content = await resp.text();
  $("#sbom-content").textContent = content;
  show($("#modal-sbom"));
});

/* ---------- Export ---------- */
document.querySelectorAll("[data-export]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const fmt = a.dataset.export;
    const url = `/api/projects/${state.current.id}/export?format=${fmt}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.click();
  });
});

const dropdownBtn = document.querySelector(".dropdown").querySelector("button");
dropdownBtn.addEventListener("click", () => document.querySelector(".dropdown").classList.toggle("open"));
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) document.querySelector(".dropdown").classList.remove("open");
});

/* ---------- Configuracion ---------- */
const WEIGHT_KEYS = [
  ["cvss", "Severidad tecnica (CVSS)", "NVD/OSV"],
  ["kev", "Explotacion activa (KEV)", "CISA KEV"],
  ["epss", "Probabilidad de explotacion (EPSS)", "FIRST EPSS"],
  ["exposure", "Exposicion del componente", "Perfil del proyecto"],
  ["environment", "Entorno de despliegue", "Perfil del proyecto"],
  ["dependency", "Alcance de la dependencia", "Grafo SBOM"],
  ["data_criticality", "Criticidad de los datos", "Perfil del proyecto"],
  ["remediation", "Disponibilidad de remediacion", "Metadata de version"],
];

async function loadSettings() {
  try {
    state.settings = await api("/api/settings");
  } catch (e) {
    $("#weights-form").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    return;
  }
  const rows = WEIGHT_KEYS.map(([key, label, source]) => `
    <div class="weight-row">
      <label>${esc(label)}</label>
      <input type="number" step="0.5" min="0" max="100" id="w-${key}" value="${state.settings.weights[key]}" />
      <span class="hint">${esc(source)}</span>
    </div>`).join("");
  $("#weights-form").innerHTML = `
    <div class="weight-row" style="border-bottom:0;padding-bottom:4px">
      <label><b>Modo de operacion</b></label>
      <span class="chip">${esc(state.settings.mode)}</span>
    </div>
    ${rows}
    <p style="margin-top:12px;color:var(--muted);font-size:12px">La suma de los pesos debe ser 100.</p>`;
}

$("#btn-save-weights").addEventListener("click", async () => {
  const weights = {};
  for (const [key] of WEIGHT_KEYS) weights[key] = parseFloat($("#w-" + key).value) || 0;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.001) {
    alert(`Los pesos deben sumar 100 (actualmente suman ${total}).`);
    return;
  }
  try {
    await api("/api/settings/weights", { method: "PUT", body: JSON.stringify(weights) });
    alert("Pesos guardados. Re-analiza los proyectos para aplicar el cambio.");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

/* ---------- Snapshots ---------- */
async function loadSnapshots() {
  try {
    const st = await api("/api/snapshots/status");
    $("#snapshots-status").innerHTML = `
      <div class="weight-row"><label><b>Modo de operacion</b></label><span class="chip">${esc(st.mode)}</span></div>
      <div class="weight-row"><label><b>Snapshot CISA KEV</b></label><span class="hint">${esc(st.kev_last_snapshot || "no descargado")}</span></div>
      <div class="weight-row"><label><b>Snapshot FIRST EPSS</b></label><span class="hint">${esc(st.epss_last_snapshot || "no descargado")}</span></div>
      <p style="margin-top:10px;color:var(--muted);font-size:12px">
        Los snapshots permiten operar en modo offline/hibrido y garantizan reproducibilidad.
      </p>`;
  } catch (e) {
    $("#snapshots-status").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

$("#btn-download-snapshots").addEventListener("click", async () => {
  const btn = $("#btn-download-snapshots");
  btn.disabled = true;
  btn.textContent = "Descargando...";
  try {
    const r = await api("/api/snapshots/download", { method: "POST", body: JSON.stringify({ kev: true, epss: true }) });
    alert("KEV: " + r.kev + "\nEPSS: " + r.epss);
    loadSnapshots();
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Descargar ahora";
  }
});

/* ---------- Metricas de ranking ---------- */
$("#btn-metrics").addEventListener("click", async () => {
  show($("#modal-metrics"));
  $("#metrics-results").innerHTML = "";
  // Precargar verdad de terreno existente
  try {
    const gt = await api(`/api/projects/${state.current.id}/ground-truth`);
    const simple = {};
    for (const row of gt) simple[row.vuln_id] = row.expected_priority;
    $("#gt-input").value = JSON.stringify(simple, null, 2);
  } catch {
    $("#gt-input").value = "";
  }
});

$("#btn-gt-fill").addEventListener("click", async () => {
  const findings = await api(`/api/projects/${state.current.id}/findings?limit=200`);
  const simple = {};
  for (const f of findings) simple[f.vuln_id] = f.priority_label;
  $("#gt-input").value = JSON.stringify(simple, null, 2);
});

function parseGroundTruth(text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data)
    ? data
    : Object.entries(data).map(([vuln_id, expected_priority]) => ({ vuln_id, expected_priority }));
  return items.map((it) => ({
    vuln_id: it.vuln_id,
    expected_priority: it.expected_priority,
    component: it.component || "",
    installed_version: it.installed_version || "",
    is_direct_dependency: it.is_direct || it.is_direct_dependency || false,
    environment: it.environment || "production",
    internet_exposed: it.internet_exposed ?? true,
    data_criticality: it.data_criticality || "medium",
    patch_available: it.patch_available ?? true,
    justification: it.justification || null,
  }));
}

$("#btn-gt-save").addEventListener("click", async () => {
  let items;
  try {
    items = parseGroundTruth($("#gt-input").value);
  } catch (e) {
    alert("JSON invalido: " + e.message);
    return;
  }
  if (!items.length) {
    alert("No hay casos.");
    return;
  }
  const btn = $("#btn-gt-save");
  btn.disabled = true;
  btn.textContent = "Evaluando...";
  const out = $("#metrics-results");
  out.innerHTML = '<div class="empty">Cargando...</div>';
  try {
    await api(`/api/projects/${state.current.id}/ground-truth`, { method: "PUT", body: JSON.stringify(items) });
    const m = await api(`/api/projects/${state.current.id}/metrics?k=10`);
    out.innerHTML = renderMetrics(m);
  } catch (e) {
    out.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar y evaluar";
  }
});

function renderMetrics(m) {
  const fmt = (v) => (typeof v === "number" ? v.toFixed(4) : esc(v));
  const pct = (v) => (v * 100).toFixed(1) + "%";
  const base = m.baseline_cvss, ctx = m.contextual, conc = m.concordance;
  const compare = (bv, cv, betterHigher = true) =>
    betterHigher ? (cv >= bv ? 'class="chip" style="color:var(--ok);border-color:var(--ok)"' : "") : "";
  return `
    <h4 style="margin:16px 0 8px">Metricas de ranking (k=${m.k}) &mdash; condiciones A vs C</h4>
    <table class="factor-table">
      <tr><th>Metrica</th><th>Baseline (solo CVSS)</th><th>Propuesta contextual</th><th>Nota</th></tr>
      <tr>
        <td>Precision@k</td><td>${pct(base.precision_at_k)}</td>
        <td${compare(base.precision_at_k, ctx.precision_at_k)}>${pct(ctx.precision_at_k)}</td><td>calidad del top-k</td>
      </tr>
      <tr>
        <td>Recall@k</td><td>${pct(base.recall_at_k)}</td>
        <td${compare(base.recall_at_k, ctx.recall_at_k)}>${pct(ctx.recall_at_k)}</td><td>urgencias reales en top-k</td>
      </tr>
      <tr>
        <td>NDCG@k</td><td>${fmt(base.ndcg_at_k)}</td>
        <td${compare(base.ndcg_at_k, ctx.ndcg_at_k)}>${fmt(ctx.ndcg_at_k)}</td><td>calidad de orden</td>
      </tr>
    </table>
    <h4 style="margin:16px 0 8px">Concordancia</h4>
    <table class="factor-table">
      <tr><th>Indicador</th><th>Valor</th></tr>
      <tr><td>Kendall&apos;s tau (contextual vs CVSS)</td><td>${fmt(conc.kendall_tau)}</td></tr>
      <tr><td>Spearman (contextual vs CVSS)</td><td>${fmt(conc.spearman_rho)}</td></tr>
      <tr><td>Kendall&apos;s tau (contextual vs expertos)</td><td>${fmt(conc.contextual_vs_expert_tau)}</td></tr>
      <tr><td>Kendall&apos;s tau (baseline vs expertos)</td><td>${fmt(conc.baseline_vs_expert_tau)}</td></tr>
    </table>
    <p style="margin-top:10px;color:var(--muted);font-size:12px">
      Hallazgos: ${m.n_findings} · Casos etiquetados: ${m.n_ground_truth} · Relevantes (critica/alta): ${m.n_relevant} ·
      H1 (NDCG contextual >= baseline): ${m.hypothesis_h1.ndcg_contextual_gt_baseline}
    </p>`;
}

document.querySelectorAll(".modal-close").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".modal").forEach(hide);
  })
);

/* ---------- Experimentos y usabilidad ---------- */
let currentTrialCondition = "A";

async function loadExperiments() {
  loadRuns();
  loadUsabilitySummary();
}

async function loadUsabilitySummary() {
  const el = $("#usability-summary");
  el.innerHTML = '<div class="empty">Cargando...</div>';
  try {
    const s = await api("/api/usability/trials/summary");
    const conds = s.conditions || {};
    if (!Object.keys(conds).length) {
      el.innerHTML = '<p class="hint-block">Aun no hay pruebas de usabilidad registradas.</p>';
      return;
    }
    let rows = "";
    for (const cond of Object.keys(conds)) {
      const c = conds[cond];
      rows += `<tr>
        <td><b>Condicion ${esc(cond)}</b></td>
        <td>${c.n_trials}</td>
        <td>${esc(c.triage_seconds.mean.toFixed(1))} s</td>
        <td>${(c.decision_correct_rate * 100).toFixed(1)}%</td>
        <td>${esc(c.sus_score_mean ? c.sus_score_mean.toFixed(1) : "-")}</td>
        <td>${esc(c.usefulness_mean ? c.usefulness_mean.toFixed(1) : "-")}</td>
      </tr>`;
    }
    el.innerHTML = `
      <table class="stat-table">
        <tr><th>Condicion</th><th>Casos</th><th>Triage (media)</th><th>Exactitud</th><th>SUS</th><th>Utilidad</th></tr>
        ${rows}
      </table>
      <p class="hint-block">H2 (la condicion D reduce el tiempo de triage):
        ${s.conclusion_h2 === null ? "pendiente" : s.conclusion_h2}</p>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

async function loadRuns() {
  if (!state.current) return;
  const el = $("#experiment-runs");
  el.innerHTML = '<div class="empty">Cargando...</div>';
  try {
    const runs = await api(`/api/projects/${state.current.id}/runs`);
    if (!runs.length) {
      el.innerHTML = '<p class="hint-block">Sin ejecuciones registradas para este proyecto.</p>';
      return;
    }
    el.innerHTML = `
      <table class="stat-table">
        <tr><th>Condicion</th><th>Modo</th><th>NDCG@10</th><th>Fecha</th></tr>
        ${runs.map((r) => `<tr>
          <td><b>${esc(r.condition)}</b></td>
          <td>${esc(r.mode)}</td>
          <td>${esc((r.metrics_snapshot.baseline_cvss || r.metrics_snapshot.contextual || {}).ndcg_at_k || "-")}</td>
          <td>${esc((r.created_at || "").slice(0, 19))}</td>
        </tr>`).join("")}
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

$("#btn-triage-a").addEventListener("click", () => loadTriage("A"));
$("#btn-triage-d").addEventListener("click", () => loadTriage("D"));

async function loadTriage(condition) {
  if (!state.current) return;
  currentTrialCondition = condition;
  $("#triage-meta").classList.remove("hidden");
  $("#triage-meta").innerHTML = `<span class="chip">Condicion ${esc(condition)}</span>`;
  $(".filters input").forEach((i) => (i.value = ""));
  const el = $("#triage-cards");
  el.innerHTML = '<div class="empty">Cargando escenario...</div>';
  try {
    const data = await api(`/api/projects/${state.current.id}/triage/${condition}`);
    el.innerHTML = "";
    for (const card of data.cards) {
      el.appendChild(renderTriageCard(card, condition));
    }
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

function renderTriageCard(card, condition) {
  const row = document.createElement("div");
  row.className = `finding ${card.priority_label}`;
  const met = card.cvss_score != null ? card.cvss_score : "-";
  let extra = "";
  if (condition === "D" && card.elements) {
    const factors = (card.elements.factors || [])
      .map((f) => `<li>${esc(f.label)}: contribuye ${f.contribution_pct}%</li>`).join("");
    const rules = (card.elements.rules_applied || [])
      .map((r) => `<div class="rule">${esc(r)}</div>`).join("");
    extra = `
      <h4>Justificacion y evidencia</h4>
      <div class="explanation">
        ${rules || ""}
        ${factors ? "<ul>" + factors + "</ul>" : ""}
        <strong>Recomendacion:</strong> ${esc(card.elements.remediation || "-")}
      </div>`;
  } else {
    extra = `
      <h4>Datos disponibles (baseline)</h4>
      <div class="explanation">
        Solo severidad tecnica: CVE, paquete, version y CVSS base score.
      </div>`;
  }
  row.innerHTML = `
    <div class="finding-head">
      <div>
        <span class="tid">${esc(card.cve_id)} <span class="pill ${card.priority_label}">${esc(card.priority_label)}</span></span>
        <span class="pkg">${esc(card.package)} ${esc(card.version)} &middot; ${card.is_direct ? "directa" : "transitiva"}</span>
      </div>
      <div class="finding-metrics">
        <div class="metric"><div class="val">${met}</div><div class="lv">CVSS</div></div>
        ${condition === "D" ? `<div class="metric"><div class="val">${card.priority_score}</div><div class="lv">score</div></div>` : ""}
      </div>
    </div>
    <div class="finding-body">${extra}</div>`;
  row.querySelector(".finding-head").addEventListener("click", () => row.classList.toggle("open"));
  return row;
}

$("#btn-run-experiment").addEventListener("click", async () => {
  const btn = $("#btn-run-experiment");
  btn.disabled = true;
  btn.textContent = "Ejecutando...";
  try {
    await api(`/api/projects/${state.current.id}/analyze`, { method: "POST" });
    loadSummary();
    if (confirm("Registrar esta corrida como condicion C (fija el contexto actual)?")) {
      await captureRun("C");
    } else {
      await captureRun("A");
    }
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Ejecutar experimento";
  }
});

$("#btn-capture-run").addEventListener("click", async () => {
  await captureRun("C");
});

async function captureRun(condition) {
  if (!state.current) return;
  try {
    const metrics = await api(`/api/projects/${state.current.id}/metrics?k=10`);
    await api(`/api/projects/${state.current.id}/runs`, {
      method: "POST",
      body: JSON.stringify({ condition, mode: "offline", metrics_snapshot: metrics }),
    });
    loadRuns();
  } catch (e) {
    alert("Error al capturar: " + e.message);
  }
}

$("#btn-compute-stats").addEventListener("click", async () => {
  const el = $("#statistics-result");
  el.innerHTML = '<div class="empty">Calculando...</div>';
  try {
    const s = await api("/api/experiment/statistics?metric=ndcg_at_k");
    el.innerHTML = renderWilcoxon(s);
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
});

function renderWilcoxon(s) {
  if (!s.comparison) {
    return `<p class="hint-block">Se requieren ejecuciones en condiciones A y C del mismo corpus para Wilcoxon.</p>`;
  }
  const c = s.comparison, w = c.wilcoxon;
  return `
    <table class="stat-table">
      <tr><th>Metrica</th><th>Baseline (A)</th><th>Contextual (C)</th><th>Mejora</th><th>d de Cohen</th></tr>
      <tr>
        <td>${esc(c.metric_name)}</td>
        <td>${esc(c.baseline_mean.toFixed(4))}</td>
        <td>${esc(c.contextual_mean.toFixed(4))}</td>
        <td>${esc(c.improvement.toFixed(4))}</td>
        <td>${esc(c.cohen_d.toFixed(3))}</td>
      </tr>
    </table>
    <h4 style="margin:14px 0 6px">Prueba de Wilcoxon</h4>
    <table class="stat-table">
      <tr><th>Estadistico W</th><th>Pares</th><th>p-value</th></tr>
      <tr><td>${esc(w.statistic.toFixed(2))}</td><td>${w.n_pairs}</td><td>${esc(w.p_value.toFixed(4))}</td></tr>
    </table>
    <p class="hint-block">${esc(w.notes.join(" · "))}</p>`;
}

document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
(async function init() {
  try {
    st = await api("/api/snapshots/status");
    $("#mode-badge").textContent = "modo: " + st.mode;
  } catch {}
  loadProjects();
})();