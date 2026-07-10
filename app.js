const STORAGE_KEY = "creative-settings-atelier-v2";
const LEGACY_KEY = "creative-tools-public-v1";

const emptyCollections = () => ({ characters: [], episodes: [], worlds: [], prompts: [] });

const tabDefinitions = {
  characters: {
    label: "キャラクター",
    formTitle: "キャラクターを登録",
    help: "名前・役割・外見・性格・口調・重要設定・メモをまとめて管理します。",
    titleField: "name",
    fields: [
      { name: "name", label: "名前", type: "text", placeholder: "例：ルシア", required: true },
      { name: "role", label: "役割", type: "text", placeholder: "例：主人公／敵対者／案内役" },
      { name: "appearance", label: "外見", type: "textarea", placeholder: "髪色、瞳、服装、シルエットなど" },
      { name: "personality", label: "性格", type: "textarea", placeholder: "価値観、長所、弱点、行動原理など" },
      { name: "speech", label: "口調", type: "textarea", placeholder: "一人称、語尾、よく使う言葉、会話例など" },
      { name: "keySettings", label: "重要設定", type: "textarea", placeholder: "ネタバレ、秘密、能力、関係性など" },
      { name: "notes", label: "メモ", type: "textarea", placeholder: "未整理の覚え書き" }
    ]
  },
  episodes: {
    label: "話数メモ",
    formTitle: "話数メモを登録",
    help: "話数ごとのあらすじ、確定設定、矛盾チェック用メモを残します。",
    titleField: "title",
    fields: [
      { name: "episode", label: "話数", type: "text", placeholder: "例：第1話／第2章-3", required: true },
      { name: "title", label: "タイトル", type: "text", placeholder: "例：涙晶の街", required: true },
      { name: "summary", label: "あらすじ", type: "textarea", placeholder: "この話で起きる出来事" },
      { name: "confirmed", label: "確定設定", type: "textarea", placeholder: "この話で確定した設定・伏線・事実" },
      { name: "consistency", label: "矛盾チェック用メモ", type: "textarea", placeholder: "前後の話と照合したい注意点" }
    ]
  },
  worlds: {
    label: "世界観・設定",
    formTitle: "世界観・設定を登録",
    help: "分類ごとに設定を保存し、確定／仮設定を切り替えられます。",
    titleField: "name",
    fields: [
      { name: "category", label: "分類", type: "text", placeholder: "例：地名／魔法／組織／歴史", required: true },
      { name: "name", label: "設定名", type: "text", placeholder: "例：涙晶", required: true },
      { name: "status", label: "状態", type: "select", options: ["確定", "仮設定"] },
      { name: "content", label: "内容", type: "textarea", placeholder: "設定の本文" }
    ]
  },
  prompts: {
    label: "画像プロンプト",
    formTitle: "画像生成プロンプトを登録",
    help: "用途・キャラクター・本文・ネガティブ指定・サイズを保存し、ワンタップでコピーできます。",
    titleField: "purpose",
    fields: [
      { name: "purpose", label: "用途", type: "text", placeholder: "例：立ち絵／表紙ラフ／背景", required: true },
      { name: "character", label: "キャラクター", type: "text", placeholder: "例：ルシア" },
      { name: "prompt", label: "プロンプト本文", type: "textarea", placeholder: "生成したい内容、画風、構図など" },
      { name: "negative", label: "ネガティブ指定", type: "textarea", placeholder: "避けたい要素" },
      { name: "size", label: "サイズ", type: "text", placeholder: "例：1024x1536／16:9" },
      { name: "memo", label: "メモ", type: "textarea", placeholder: "使用モデル、差分、結果メモなど" }
    ]
  }
};

const sampleAppData = {
  version: 2,
  activeProjectId: "lacrima-tail",
  projects: [
    {
      id: "lacrima-tail",
      name: "ラクリマテイル",
      collections: {
        ...emptyCollections(),
        characters: [{ id: crypto.randomUUID(), name: "サンプル主人公", role: "記録係", appearance: "銀色の髪と旅装。", personality: "慎重だが好奇心が強い。", speech: "丁寧語。驚くと短くなる。", keySettings: "涙晶に反応する。", notes: "実データに置き換えて使います。" }],
        worlds: [{ id: crypto.randomUUID(), category: "アイテム", name: "涙晶", status: "仮設定", content: "物語の鍵になる結晶。" }]
      }
    },
    { id: "tia-nova", name: "ティア・ノヴァ", collections: emptyCollections() }
  ]
};

let data = loadData();
let currentTab = "characters";
let editingState = null;
let searchQuery = "";

const form = document.querySelector("#entry-form");
const fieldsRoot = document.querySelector("#fields");
const listRoot = document.querySelector("#entry-list");
const projectSelect = document.querySelector("#project-select");
const searchInput = document.querySelector("#search-input");
const saveStatus = document.querySelector("#save-status");

function normalizeAppData(value) {
  if (!value || !Array.isArray(value.projects) || value.projects.length === 0) {
    throw new Error("Invalid app data");
  }
  value.projects.forEach((project) => {
    if (!project || typeof project.name !== "string") throw new Error("Invalid project data");
    project.id = project.id || crypto.randomUUID();
    project.collections = { ...emptyCollections(), ...(project.collections || {}) };
  });
  if (!value.activeProjectId || !value.projects.some((project) => project.id === value.activeProjectId)) value.activeProjectId = value.projects[0].id;
  return { version: 2, ...value };
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return normalizeAppData(JSON.parse(saved)); } catch { /* ignore broken data */ }
  }
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const legacyData = JSON.parse(legacy);
      return normalizeAppData({ version: 2, activeProjectId: "imported", projects: [{ id: "imported", name: "移行データ", collections: { ...emptyCollections(), ...legacyData } }] });
    } catch { /* ignore broken legacy data */ }
  }
  return normalizeAppData(structuredClone(sampleAppData));
}

function saveData(message = "自動保存しました") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  saveStatus.textContent = `${message}（${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}）`;
}

function activeProject() { return data.projects.find((project) => project.id === data.activeProjectId) || data.projects[0]; }
function activeEntries() { return activeProject().collections[currentTab] || []; }

function render() {
  const project = activeProject();
  const definition = tabDefinitions[currentTab];
  document.querySelector("#form-title").textContent = editingState?.tab === currentTab ? `${definition.label}を編集中` : definition.formTitle;
  document.querySelector("#form-help").textContent = definition.help;
  document.querySelector("#current-work-label").textContent = `作品：${project.name}`;
  document.querySelector("#list-work-label").textContent = `作品：${project.name}`;
  document.querySelector("#save-button").textContent = editingState?.tab === currentTab ? "変更を保存" : "保存する";
  document.querySelector("#cancel-edit").hidden = editingState?.tab !== currentTab;
  renderProjects();
  renderFields(definition);
  if (editingState?.tab === currentTab) fillFormFromEntry(editingState.id);
  renderList(definition);
  document.querySelectorAll(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.tab === currentTab));
}

function renderProjects() {
  projectSelect.replaceChildren(...data.projects.map((project) => new Option(project.name, project.id, false, project.id === data.activeProjectId)));
  document.querySelector("#delete-project").disabled = data.projects.length <= 1;
}

function renderFields(definition) {
  fieldsRoot.replaceChildren();
  definition.fields.forEach((field) => {
    const label = document.querySelector("#field-template").content.firstElementChild.cloneNode(true);
    label.querySelector("span").textContent = field.label;
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 5;
    } else if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((option) => input.add(new Option(option, option)));
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
    }
    input.name = field.name;
    input.placeholder = field.placeholder || "";
    input.required = Boolean(field.required);
    label.append(input);
    fieldsRoot.append(label);
  });
}

function renderList(definition) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const entries = activeEntries();
  const filtered = normalizedQuery ? entries.filter((entry) => Object.values(entry).join("\n").toLowerCase().includes(normalizedQuery)) : entries;
  document.querySelector("#count-label").textContent = `${filtered.length}件 / 全${entries.length}件`;
  listRoot.replaceChildren();
  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = normalizedQuery ? "検索に一致する登録がありません。" : "まだ登録がありません。フォームから追加できます。";
    listRoot.append(empty);
    return;
  }
  filtered.forEach((entry) => listRoot.append(createCard(entry, definition)));
}

function createCard(entry, definition) {
  const card = document.createElement("article");
  card.className = "entry-card";
  const title = document.createElement("h3");
  title.textContent = entry[definition.titleField] || "無題";
  card.append(title);
  const meta = document.createElement("div");
  meta.className = "entry-meta";
  [definition.label, entry.status, entry.category, entry.episode, entry.character].filter(Boolean).forEach((text) => {
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = text; meta.append(tag);
  });
  card.append(meta);
  const dl = document.createElement("dl");
  definition.fields.forEach((field) => {
    const dt = document.createElement("dt"); dt.textContent = field.label;
    const dd = document.createElement("dd"); dd.textContent = entry[field.name] || "未入力";
    dl.append(dt, dd);
  });
  card.append(dl);
  const actions = document.createElement("div"); actions.className = "card-actions";
  actions.append(actionButton("編集", "secondary", () => startEditing(entry.id)));
  if (currentTab === "prompts") actions.append(actionButton("コピー", "secondary", () => copyPrompt(entry)));
  actions.append(actionButton("削除", "danger", () => deleteEntry(entry.id)));
  card.append(actions);
  return card;
}

function actionButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button"; button.className = className; button.textContent = text; button.addEventListener("click", onClick);
  return button;
}

function getEntry(id) { return activeEntries().find((entry) => entry.id === id); }
function fillFormFromEntry(id) { const entry = getEntry(id); if (!entry) return stopEditing(true); tabDefinitions[currentTab].fields.forEach((field) => { if (form.elements[field.name]) form.elements[field.name].value = entry[field.name] || ""; }); }
function stopEditing(reset = false) { editingState = null; if (reset) form.reset(); render(); }
function startEditing(id) { editingState = { tab: currentTab, id }; render(); form.scrollIntoView({ behavior: "smooth", block: "start" }); }

function deleteEntry(id) {
  if (!confirm("この登録を削除しますか？")) return;
  activeProject().collections[currentTab] = activeEntries().filter((entry) => entry.id !== id);
  if (editingState?.id === id) editingState = null;
  saveData("削除して保存しました");
  render();
}

async function copyPrompt(entry) {
  const text = [`用途: ${entry.purpose || ""}`, `キャラクター: ${entry.character || ""}`, `Prompt: ${entry.prompt || ""}`, `Negative: ${entry.negative || ""}`, `Size: ${entry.size || ""}`, `Memo: ${entry.memo || ""}`].join("\n");
  await navigator.clipboard.writeText(text);
  saveStatus.textContent = "プロンプトをコピーしました";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const entry = { id: editingState?.tab === currentTab ? editingState.id : crypto.randomUUID(), updatedAt: new Date().toISOString() };
  tabDefinitions[currentTab].fields.forEach((field) => { entry[field.name] = String(formData.get(field.name) || "").trim(); });
  const collection = activeEntries();
  activeProject().collections[currentTab] = editingState?.tab === currentTab ? collection.map((item) => item.id === editingState.id ? entry : item) : [entry, ...collection];
  editingState = null;
  form.reset();
  saveData("入力内容を保存しました");
  render();
});

projectSelect.addEventListener("change", () => { data.activeProjectId = projectSelect.value; editingState = null; searchQuery = ""; searchInput.value = ""; saveData("作品を切り替えました"); render(); });
document.querySelector("#project-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#project-name").value.trim();
  if (!name) return;
  const project = { id: crypto.randomUUID(), name, collections: emptyCollections() };
  data.projects.push(project); data.activeProjectId = project.id; event.currentTarget.reset(); saveData("作品を追加しました"); render();
});
document.querySelector("#delete-project").addEventListener("click", () => {
  if (data.projects.length <= 1 || !confirm(`作品「${activeProject().name}」と中の全データを削除しますか？`)) return;
  data.projects = data.projects.filter((project) => project.id !== data.activeProjectId); data.activeProjectId = data.projects[0].id; editingState = null; saveData("作品を削除しました"); render();
});
document.querySelectorAll(".tab-button").forEach((button) => button.addEventListener("click", () => { currentTab = button.dataset.tab; editingState = null; form.reset(); render(); }));
document.querySelector("#cancel-edit").addEventListener("click", () => stopEditing(true));
searchInput.addEventListener("input", () => { searchQuery = searchInput.value; renderList(tabDefinitions[currentTab]); });
document.querySelector("#clear-current").addEventListener("click", () => { if (!confirm("このタブの登録内容をすべて削除しますか？")) return; activeProject().collections[currentTab] = []; editingState = null; saveData("タブを全削除しました"); render(); });
document.querySelector("#export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `creative-settings-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
});
document.querySelector("#import-json").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const imported = normalizeAppData(JSON.parse(await file.text()));
    if (!confirm("現在の保存内容を、読み込んだJSONで置き換えますか？")) return;
    data = imported; editingState = null; searchQuery = ""; searchInput.value = ""; saveData("JSONから復元しました"); render();
  } catch { alert("JSONを読み込めませんでした。ファイルが壊れているか、形式が違います。"); }
  event.target.value = "";
});

render();
saveData("起動しました");
