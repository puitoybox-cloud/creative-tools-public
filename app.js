const STORAGE_KEY = "creative-tools-public-v1";

const tabDefinitions = {
  characters: {
    label: "キャラクター",
    formTitle: "キャラクター設定を登録",
    help: "公開してよい仮名・サンプル設定で試してください。",
    titleField: "name",
    fields: [
      { name: "name", label: "名前", type: "text", placeholder: "例：ミナト" },
      { name: "role", label: "役割", type: "text", placeholder: "例：旅する記録係" },
      { name: "traits", label: "性格・特徴", type: "textarea", placeholder: "例：慎重だけれど好奇心が強い" },
      { name: "notes", label: "メモ", type: "textarea", placeholder: "公開してよい設定だけを書きます" }
    ]
  },
  episodes: {
    label: "話数メモ",
    formTitle: "話数メモを登録",
    help: "あらすじ、登場人物、次回への宿題を短く残せます。",
    titleField: "title",
    fields: [
      { name: "episode", label: "話数", type: "text", placeholder: "例：第1話" },
      { name: "title", label: "タイトル", type: "text", placeholder: "例：古い地図の朝" },
      { name: "summary", label: "内容メモ", type: "textarea", placeholder: "例：主人公がサンプルの町で依頼を受ける" },
      { name: "todo", label: "次に確認すること", type: "textarea", placeholder: "例：地名の表記を統一する" }
    ]
  },
  prompts: {
    label: "画像プロンプト",
    formTitle: "画像生成プロンプトを登録",
    help: "雰囲気、構図、避けたい要素を分けて保存できます。",
    titleField: "title",
    fields: [
      { name: "title", label: "用途・タイトル", type: "text", placeholder: "例：サンプル表紙ラフ" },
      { name: "prompt", label: "プロンプト", type: "textarea", placeholder: "例：warm fantasy atelier, soft light, watercolor style" },
      { name: "negative", label: "避けたい要素", type: "textarea", placeholder: "例：文字、ロゴ、過度な暗さ" },
      { name: "memo", label: "メモ", type: "textarea", placeholder: "例：公開用の架空プロンプト" }
    ]
  }
};

const sampleData = {
  characters: [
    { id: crypto.randomUUID(), name: "ミナト", role: "旅する記録係", traits: "慎重で、見たものを細かくメモする。", notes: "公開用の架空サンプルです。" }
  ],
  episodes: [
    { id: crypto.randomUUID(), episode: "第1話", title: "古い地図の朝", summary: "サンプルの町で不思議な地図を見つける。", todo: "地図に載せる地名をあとで考える。" }
  ],
  prompts: [
    { id: crypto.randomUUID(), title: "サンプル背景", prompt: "cozy fantasy study room, warm sunlight, watercolor illustration", negative: "text, logo, blurry", memo: "公開してよい練習用プロンプト。" }
  ]
};

let currentTab = "characters";
let editingState = null;
let data = loadData();

const form = document.querySelector("#entry-form");
const fieldsRoot = document.querySelector("#fields");
const listRoot = document.querySelector("#entry-list");
const formTitle = document.querySelector("#form-title");
const formHelp = document.querySelector("#form-help");
const countLabel = document.querySelector("#count-label");
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleData);
  try {
    return { ...structuredClone(sampleData), ...JSON.parse(saved) };
  } catch {
    return structuredClone(sampleData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function render() {
  const definition = tabDefinitions[currentTab];
  const isEditingCurrentTab = editingState?.tab === currentTab;
  formTitle.textContent = isEditingCurrentTab ? `${definition.label}を編集中` : definition.formTitle;
  formHelp.textContent = definition.help;
  renderFields(definition);
  if (isEditingCurrentTab) fillFormFromEntry(editingState.id);
  updateFormMode();
  renderList(definition);
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === currentTab);
  });
}

function renderFields(definition) {
  fieldsRoot.replaceChildren();
  definition.fields.forEach((field) => {
    const templateId = field.type === "textarea" ? "#textarea-field-template" : "#text-field-template";
    const element = document.querySelector(templateId).content.firstElementChild.cloneNode(true);
    element.querySelector("span").textContent = field.label;
    const input = element.querySelector("input, textarea");
    input.name = field.name;
    input.placeholder = field.placeholder;
    input.required = field.name === definition.titleField;
    fieldsRoot.append(element);
  });
}

function renderList(definition) {
  const entries = data[currentTab] ?? [];
  countLabel.textContent = `${entries.length}件`;
  listRoot.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "まだ登録がありません。左のフォームから追加できます。";
    listRoot.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "entry-card";

    const title = document.createElement("h3");
    title.textContent = entry[definition.titleField] || "無題";
    card.append(title);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = definition.label;
    meta.append(tag);
    card.append(meta);

    const dl = document.createElement("dl");
    definition.fields.forEach((field) => {
      const dt = document.createElement("dt");
      dt.textContent = field.label;
      const dd = document.createElement("dd");
      dd.textContent = entry[field.name] || "未入力";
      dl.append(dt, dd);
    });
    card.append(dl);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const editButton = document.createElement("button");
    editButton.className = "secondary";
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => startEditing(entry.id));
    actions.append(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.className = "danger";
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteEntry(entry.id));
    actions.append(deleteButton);
    card.append(actions);

    listRoot.append(card);
  });
}

function findEntry(tab, id) {
  return (data[tab] ?? []).find((entry) => entry.id === id);
}

function fillFormFromEntry(id) {
  const entry = findEntry(currentTab, id);
  if (!entry) {
    stopEditing();
    return;
  }

  tabDefinitions[currentTab].fields.forEach((field) => {
    const input = form.elements[field.name];
    if (input) input.value = entry[field.name] || "";
  });
}

function updateFormMode() {
  const isEditingCurrentTab = editingState?.tab === currentTab;
  saveButton.textContent = isEditingCurrentTab ? "変更を保存" : "保存する";
  cancelEditButton.hidden = !isEditingCurrentTab;
}

function startEditing(id) {
  const entry = findEntry(currentTab, id);
  if (!entry) return;

  editingState = { tab: currentTab, id };
  formTitle.textContent = `${tabDefinitions[currentTab].label}を編集中`;
  fillFormFromEntry(id);
  updateFormMode();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  const firstInput = form.querySelector("input, textarea");
  firstInput?.focus({ preventScroll: true });
}

function stopEditing({ resetForm = false } = {}) {
  editingState = null;
  formTitle.textContent = tabDefinitions[currentTab].formTitle;
  if (resetForm) form.reset();
  updateFormMode();
}

function deleteEntry(id) {
  data[currentTab] = data[currentTab].filter((entry) => entry.id !== id);
  if (editingState?.tab === currentTab && editingState.id === id) {
    stopEditing({ resetForm: true });
  }
  saveData();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const isEditingCurrentTab = editingState?.tab === currentTab;
  const entry = { id: isEditingCurrentTab ? editingState.id : crypto.randomUUID() };
  tabDefinitions[currentTab].fields.forEach((field) => {
    entry[field.name] = String(formData.get(field.name) || "").trim();
  });
  if (isEditingCurrentTab) {
    data[currentTab] = (data[currentTab] ?? []).map((savedEntry) => (
      savedEntry.id === editingState.id ? entry : savedEntry
    ));
    stopEditing();
  } else {
    data[currentTab] = [entry, ...(data[currentTab] ?? [])];
  }
  saveData();
  form.reset();
  render();
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    currentTab = button.dataset.tab;
    stopEditing({ resetForm: true });
    render();
  });
});

cancelEditButton.addEventListener("click", () => {
  stopEditing({ resetForm: true });
});

document.querySelector("#clear-current").addEventListener("click", () => {
  if (!confirm("このタブの登録内容をすべて削除しますか？")) return;
  data[currentTab] = [];
  if (editingState?.tab === currentTab) stopEditing({ resetForm: true });
  saveData();
  render();
});

document.querySelector("#reset-samples").addEventListener("click", () => {
  if (!confirm("保存内容をサンプルデータに戻しますか？")) return;
  data = structuredClone(sampleData);
  saveData();
  stopEditing({ resetForm: true });
  render();
});

render();
