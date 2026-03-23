const EMBED_URLS = {
  workbook_draft:
    "https://drive.google.com/file/d/1AJEqGCfFIxNmcrSWKRzgnZCsU3ULe9nX/preview",
  report_draft:
    "https://drive.google.com/file/d/1NgK4NH_auhq3LYe9RnROC3-944Xz9F7r/preview",
  validation_report:
    "https://drive.google.com/file/d/15c4rEG82GSUvJ6c-Y43i2I1dDWZzPsqI/preview",
  workbook_final:
    "https://drive.google.com/file/d/1XV-kNr8O52AUOuTa5yOoXVMGJXJAt0QM/preview",
  report_final:
    "https://docs.google.com/document/d/1PzIstBynZJ9rXS-E0oNRy5dAsjDeUjvM/preview"
};

// State machine
let currentBeat = 0;
let isAnimating = false;

// DOM refs
const fileTray = document.getElementById("fileTray");
const fileCards = document.getElementById("fileCards");
const skillPanel = document.getElementById("skillPanel");
const skillName = document.getElementById("skillName");
const skillPhase = document.getElementById("skillPhase");
const skillDesc = document.getElementById("skillDesc");
const inputZone = document.getElementById("inputZone");
const chatWindow = document.getElementById("chatWindow");
const chatPlaceholder = document.getElementById("chatPlaceholder");
const chatBtnArea = document.getElementById("chatBtnArea");
const outputCards = document.getElementById("outputCards");
const completionBanner = document.getElementById("completionBanner");

// ===== HELPERS =====

function disableAllButtons() {
  isAnimating = true;
  document.querySelectorAll(".btn, .file-send-btn").forEach(b => b.classList.add("disabled"));
}

function enableButtons() {
  isAnimating = false;
  document.querySelectorAll(".btn, .file-send-btn").forEach(b => b.classList.remove("disabled"));
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function streamText(container, text, speed) {
  speed = speed || 25;
  return new Promise(resolve => {
    let i = 0;
    const span = document.createElement("span");
    span.className = "blink-cursor";
    container.appendChild(span);
    scrollChat();

    const interval = setInterval(() => {
      if (i < text.length) {
        span.textContent += text[i];
        i++;
        scrollChat();
      } else {
        clearInterval(interval);
        span.classList.remove("blink-cursor");
        resolve();
      }
    }, speed);
  });
}

function scrollChat() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function clearChat() {
  chatWindow.innerHTML = "";
}

function appendChat(text) {
  const p = document.createElement("div");
  p.style.marginTop = "12px";
  p.textContent = text;
  chatWindow.appendChild(p);
  scrollChat();
}

function addActionButton(text, className, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn " + className;
  btn.textContent = text;
  btn.addEventListener("click", function () {
    if (isAnimating) return;
    onClick();
  });
  chatBtnArea.appendChild(btn);
}

function clearActionButtons() {
  chatBtnArea.innerHTML = "";
}

function addOutputCard(icon, filename, attribution, phase, previewUrl, extra) {
  const card = document.createElement("div");
  card.className = "output-card";

  let attrClass = "output-card-attr";
  if (extra && extra.green) attrClass += " green";
  if (extra && extra.amber) attrClass += " amber";

  let extraHtml = "";
  if (extra && extra.sublabel) {
    extraHtml = '<div class="output-card-attr amber">' + extra.sublabel + "</div>";
  }

  card.innerHTML =
    '<div class="output-card-icon">' + icon + "</div>" +
    '<div class="output-card-info">' +
      '<div class="output-card-filename">' + filename + "</div>" +
      '<div class="' + attrClass + '">' + attribution +
        (phase ? ' &middot; <span class="phase-pill small">' + phase + "</span>" : "") +
      "</div>" +
      extraHtml +
    "</div>" +
    '<div class="output-card-buttons">' +
      '<button class="btn-preview" data-url="' + previewUrl + '">Preview &#9660;</button>' +
    "</div>";

  outputCards.prepend(card);

  // Show deliverables panel
  var delPanel = document.getElementById("deliverablesPanel");
  if (delPanel) delPanel.classList.add("visible");

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add("visible");
    });
  });

  // Preview toggle
  card.querySelector(".btn-preview").addEventListener("click", function () {
    const existing = card.querySelector(".iframe-wrap");
    if (existing) {
      existing.remove();
      this.textContent = "Preview \u25BC";
      return;
    }
    this.textContent = "Preview \u25B2";
    const wrap = document.createElement("div");
    wrap.className = "iframe-wrap";
    wrap.innerHTML =
      '<div class="iframe-loading">Loading...</div>' +
      '<iframe src="' + this.dataset.url + '" loading="lazy"></iframe>';
    card.appendChild(wrap);

    const iframe = wrap.querySelector("iframe");
    const loadingDiv = wrap.querySelector(".iframe-loading");
    iframe.addEventListener("load", function () {
      loadingDiv.classList.add("loaded");
    });
  });

  return card;
}

function addFinalCards(cards) {
  const grid = document.createElement("div");
  grid.className = "output-cards-grid";

  cards.forEach(function (c) {
    const card = document.createElement("div");
    card.className = "output-card";
    card.innerHTML =
      '<div class="output-card-icon">' + c.icon + "</div>" +
      '<div class="output-card-info">' +
        '<div class="output-card-filename">' + c.filename + "</div>" +
        '<div class="output-card-attr green">' + c.attribution + "</div>" +
      "</div>" +
      '<div class="output-card-buttons">' +
        '<button class="btn-preview" data-url="' + c.previewUrl + '">Preview &#9660;</button>' +
      "</div>";

    grid.appendChild(card);

    card.querySelector(".btn-preview").addEventListener("click", function () {
      const existing = card.querySelector(".iframe-wrap");
      if (existing) {
        existing.remove();
        this.textContent = "Preview \u25BC";
        return;
      }
      this.textContent = "Preview \u25B2";
      const wrap = document.createElement("div");
      wrap.className = "iframe-wrap";
      wrap.innerHTML =
        '<div class="iframe-loading">Loading...</div>' +
        '<iframe src="' + this.dataset.url + '" loading="lazy"></iframe>';
      card.appendChild(wrap);

      const iframe = wrap.querySelector("iframe");
      const loadingDiv = wrap.querySelector(".iframe-loading");
      iframe.addEventListener("load", function () {
        loadingDiv.classList.add("loaded");
      });
    });
  });

  outputCards.prepend(grid);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      grid.querySelectorAll(".output-card").forEach(c => c.classList.add("visible"));
    });
  });
}

function setSkill(name, phase, desc, inputText) {
  skillName.textContent = name;
  skillPhase.innerHTML = phase;
  skillDesc.textContent = desc;
  inputZone.textContent = inputText;
  inputZone.classList.remove("glow");
}

function setFileCards(cards) {
  fileCards.innerHTML = "";
  cards.forEach(function (c) {
    const card = document.createElement("div");
    card.className = "file-card";
    card.id = c.id || "";
    card.innerHTML =
      '<div class="file-emoji">' + c.emoji + "</div>" +
      '<div class="file-name">' + c.name + "</div>" +
      '<button class="btn btn-teal file-send-btn" id="' + c.btnId + '">' + c.btnText + "</button>";
    fileCards.appendChild(card);
  });
}

function animateFileToSkill(cardEl) {
  return new Promise(resolve => {
    cardEl.classList.add("animating");
    setTimeout(resolve, 400);
  });
}

// ===== BEAT 1 =====
function triggerBeat1() {
  if (isAnimating || currentBeat !== 0) return;
  currentBeat = 1;
  runBeat1();
}

// Input zone acts as a clickable trigger — delegates to the current beat's pending action
var pendingInputAction = null;

document.getElementById("sendBtn1").addEventListener("click", triggerBeat1);
pendingInputAction = triggerBeat1;

inputZone.addEventListener("click", function () {
  if (isAnimating) return;
  if (pendingInputAction) {
    pendingInputAction();
    return;
  }
  // Beat 0 fallback (initial state)
  if (currentBeat === 0) triggerBeat1();
});

async function runBeat1() {
  pendingInputAction = null;
  disableAllButtons();

  // Animate file card
  const card = document.getElementById("fileCard1");
  await animateFileToSkill(card);

  // Glow input zone
  inputZone.classList.add("glow");
  await wait(300);

  // Clear placeholder, start streaming
  await wait(300);
  clearChat();

  const text =
    "I've examined the FutureCoach dataset. Here's what I'm working with: " +
    "34 unique respondents after removing 6 duplicates. The survey covers two measures " +
    "\u2014 Big Five personality (Mini-IPIP 20, Sten scores) and Wheel of Life satisfaction " +
    "(BMSLSS, 1\u20137 scale).\n\n" +
    "A few things stand out already: Agreeableness shows a ceiling effect (94% at maximum " +
    "Sten score), which is worth flagging. School satisfaction is the lowest-rated domain " +
    "(M=4.41), consistent with adolescent research. I'll organize findings around your " +
    "three hypotheses: quiz value, coach utility, and school partner insights.\n\nReady to proceed?";

  await streamText(chatWindow, text, 25);

  enableButtons();

  // Show approve button
  clearActionButtons();
  addActionButton("\u2714 Approve & Run Analysis", "btn-green", function () {
    if (currentBeat !== 1) return;
    currentBeat = 2;
    runBeat2();
  });
}

// ===== BEAT 2 =====
async function runBeat2() {
  disableAllButtons();
  clearActionButtons();

  appendChat("\nRunning analysis...");
  await wait(800);
  appendChat("\nAnalysis complete. Stats workbook ready.");

  addOutputCard(
    "\uD83D\uDCCA",
    "fc_prototype_stats_workbook_v3.xlsx",
    "Survey Analysis Skill",
    "\uD83D\uDD2C Analysis",
    EMBED_URLS.workbook_draft
  );

  await wait(400);
  enableButtons();

  clearActionButtons();
  addActionButton("\u2192 Generate Report", "btn-teal", function () {
    if (currentBeat !== 2) return;
    currentBeat = 3;
    runBeat3();
  });
}

// ===== BEAT 3 =====
async function runBeat3() {
  disableAllButtons();
  clearActionButtons();

  // Switch skill panel
  setSkill(
    "Report Writer",
    "\uD83D\uDCE3 Reporting",
    "Drafts evaluation reports from analysis outputs",
    "Send workbook to begin"
  );

  // Update file tray
  setFileCards([
    {
      id: "fileCard2",
      emoji: "\uD83D\uDCCA",
      name: "fc_prototype_stats_workbook_v3.xlsx",
      btnId: "sendBtn2",
      btnText: "\u2192 Send to Report Writer"
    }
  ]);

  enableButtons();

  async function beat3Send() {
    if (isAnimating) return;
    pendingInputAction = null;
    disableAllButtons();

    const card = document.getElementById("fileCard2");
    if (card) await animateFileToSkill(card);
    inputZone.classList.add("glow");
    await wait(300);

    clearChat();

    const text =
      "Based on the analysis, I'm drafting the evaluation report. Key findings to highlight: " +
      "NPS of -23.5, with a striking 59-point gender gap \u2014 female students rated the experience " +
      "positively (NPS +5.9) while male students were largely dissatisfied (NPS -52.9).\n\n" +
      "Report length was the top friction point \u2014 only 32% found the Big Five report the right " +
      "length, versus 68% for Wheel of Life. Partial support for all three assumptions, with clear " +
      "recommendations for next steps.\n\nGenerating report...";

    await streamText(chatWindow, text, 25);
    await wait(800);
    appendChat("\nReport ready.");

    addOutputCard(
      "\uD83D\uDCC4",
      "fc_prototype_report_v3.docx",
      "Report Writer Skill",
      "\uD83D\uDCE3 Reporting",
      EMBED_URLS.report_draft
    );

    await wait(400);
    enableButtons();

    clearActionButtons();
    addActionButton("\u2192 Validate", "btn-teal", function () {
      if (currentBeat !== 3) return;
      currentBeat = 4;
      runBeat4();
    });
  }

  // Auto-trigger send after skill panel transition
  document.getElementById("sendBtn2").addEventListener("click", beat3Send);
  pendingInputAction = beat3Send;
  await wait(600);
  beat3Send();
}

// ===== BEAT 4 =====
async function runBeat4() {
  disableAllButtons();
  clearActionButtons();

  // Switch skill panel
  setSkill(
    "Critical Reviewer",
    "\uD83D\uDCE3 Reporting",
    "Cross-checks outputs before they're finalized",
    "Send files to begin"
  );

  // Update file tray
  setFileCards([
    {
      id: "fileCard3a",
      emoji: "\uD83D\uDCCA",
      name: "fc_prototype_stats_workbook_v3.xlsx",
      btnId: "sendBtnBoth",
      btnText: "\u2192 Send both to Critical Reviewer"
    },
    {
      id: "fileCard3b",
      emoji: "\uD83D\uDCC4",
      name: "fc_prototype_report_v3.docx",
      btnId: "sendBtnBoth2",
      btnText: ""
    }
  ]);

  // Hide second button
  const secondBtn = document.getElementById("sendBtnBoth2");
  if (secondBtn) secondBtn.style.display = "none";

  enableButtons();

  async function beat4Send() {
    if (isAnimating) return;
    pendingInputAction = null;
    disableAllButtons();

    const card1 = document.getElementById("fileCard3a");
    const card2 = document.getElementById("fileCard3b");
    if (card1) await animateFileToSkill(card1);
    await wait(100);
    if (card2) await animateFileToSkill(card2);
    inputZone.classList.add("glow");
    await wait(300);

    clearChat();

    const text =
      "I've cross-checked all statistics in the workbook against the report narrative. " +
      "The analysis is largely sound \u2014 NPS calculations, gender splits, correlations, and " +
      "Wheel of Life domain means all verified correct.\n\n" +
      "Two items need attention:\n\n" +
      "Percentage formula: The Big Five percentage formula inflates scores by 6\u201310 percentage " +
      "points, affecting category classifications for 44 individual trait assignments. Recommend " +
      "documenting in the methodology or recalculating using the standard range-normalized formula.\n\n" +
      "Missing significance test: The gender gap in NPS (+5.9 vs. -52.9) is the report's headline " +
      "finding, but no formal significance test is presented. A Mann-Whitney U test is appropriate " +
      "with this sample size.\n\n" +
      "Four minor text-workbook discrepancies also flagged.\n\nValidation report ready.";

    await streamText(chatWindow, text, 25);

    addOutputCard(
      "\u2705",
      "fc_validation_report.pdf",
      "Critical Reviewer Skill",
      "\uD83D\uDCE3 Reporting",
      EMBED_URLS.validation_report,
      { sublabel: "2 issues \u00B7 4 minor flags" }
    );

    await wait(400);
    enableButtons();

    clearActionButtons();
    addActionButton("\u2192 Update & Finalize", "btn-navy", function () {
      if (currentBeat !== 4) return;
      currentBeat = 5;
      runBeat5();
    });
  }

  document.getElementById("sendBtnBoth").addEventListener("click", beat4Send);
  pendingInputAction = beat4Send;
  await wait(600);
  beat4Send();
}

// ===== BEAT 5 =====
async function runBeat5() {
  disableAllButtons();
  clearActionButtons();

  clearChat();

  const text =
    "Applying corrections: percentage formula documented in methodology section, " +
    "Mann-Whitney U significance test added for the gender gap finding (p < .05), " +
    "four text-workbook discrepancies resolved.\n\n" +
    "Final workbook and report ready. No outstanding issues.";

  await streamText(chatWindow, text, 25);

  addFinalCards([
    {
      icon: "\uD83D\uDCCA",
      filename: "Stats Workbook \u2014 Final",
      attribution: "\u2714 Corrections applied",
      previewUrl: EMBED_URLS.workbook_final
    },
    {
      icon: "\uD83D\uDCC4",
      filename: "Evaluation Report \u2014 Final",
      attribution: "\u2714 Corrections applied",
      previewUrl: EMBED_URLS.report_final
    }
  ]);

  await wait(600);
  completionBanner.classList.add("visible");
  enableButtons();
}
