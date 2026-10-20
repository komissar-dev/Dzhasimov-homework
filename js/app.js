// Уровень интерфейса: то, что видит ученик, — форма, список, итоги, напоминания.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  let filter = "tomorrow";
  const openSteps = new Set();

  // ---------- шапка ----------
  const now = new Date();
  $("#today-line").textContent = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // ---------- форма добавления ----------
  const dueInput = $("#due");
  dueInput.min = Logic.today();
  dueInput.value = Logic.quickDue("завтра");
  const markChip = () => $$("#quick-due button").forEach((b) => b.classList.toggle("on", Logic.quickDue(b.dataset.due) === dueInput.value));
  markChip();
  $("#quick-due").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    dueInput.value = Logic.quickDue(b.dataset.due);
    markChip();
  });
  dueInput.addEventListener("change", markChip);

  $("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = $("#subject").value.trim(), text = $("#text").value.trim();
    if (!subject || !text || !dueInput.value) return;
    Storage.addTask(subject, text, dueInput.value);
    $("#text").value = "";
    $("#subject").value = "";
    $("#subject").focus();
    render();
  });

  // ---------- вкладки ----------
  $(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    filter = b.dataset.filter;
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    render();
  });

  // ---------- список ----------
  function renderList() {
    const all = Storage.tasks();
    const items = filter === "tomorrow" ? Logic.forTomorrow(all) : filter === "done" ? Logic.done(all) : Logic.open(all);
    const list = $("#list");
    list.replaceChildren(...items.map(taskEl));
    const empty = $("#empty");
    empty.hidden = items.length > 0;
    empty.textContent = { tomorrow: "К завтра ничего не задано 😎", all: "Несделанных заданий нет 🎉", done: "Пока ничего не сделано" }[filter];
  }

  function taskEl(t) {
    const li = $("#task-tpl").content.firstElementChild.cloneNode(true);
    li.classList.toggle("is-done", !!t.doneAt);
    $(".subj", li).textContent = t.subject + ":";
    $(".txt", li).textContent = t.text;
    const due = $(".due", li);
    if (t.doneAt) {
      due.textContent = `сделано ${Logic.fmt(t.doneAt)}` + (t.doneAt > t.due ? " (с опозданием)" : " — вовремя");
    } else {
      const lbl = Logic.dueLabel(t.due);
      due.textContent = "до " + lbl.text;
      due.classList.toggle("soon", lbl.soon);
      due.classList.toggle("overdue", lbl.overdue);
    }
    if (t.steps.length) {
      const p = $(".progress", li);
      p.hidden = false;
      p.textContent = `Шаги: ${t.steps.filter((s) => s.done).length} из ${t.steps.length}`;
    }

    $(".check", li).addEventListener("click", () => {
      Storage.updateTask(t.id, { doneAt: t.doneAt ? null : Logic.today() });
      render();
    });
    const steps = $(".steps", li);
    steps.hidden = !openSteps.has(t.id);
    $(".more", li).addEventListener("click", () => {
      openSteps.has(t.id) ? openSteps.delete(t.id) : openSteps.add(t.id);
      steps.hidden = !openSteps.has(t.id);
    });

    const ul = $(".step-list", li);
    for (const s of t.steps) {
      const row = document.createElement("li");
      row.classList.toggle("done", s.done);
      row.innerHTML = `<input type="checkbox"><span></span><button class="ghost" aria-label="Удалить шаг">✕</button>`;
      row.querySelector("span").textContent = s.text;
      const cb = row.querySelector("input");
      cb.checked = s.done;
      cb.addEventListener("change", () => { Storage.toggleStep(t.id, s.id); render(); });
      row.querySelector("button").addEventListener("click", () => { Storage.deleteStep(t.id, s.id); render(); });
      ul.append(row);
    }
    $(".step-form", li).addEventListener("submit", (e) => {
      e.preventDefault();
      const input = e.target.querySelector("input");
      if (input.value.trim()) { Storage.addStep(t.id, input.value.trim()); render(); }
    });
    $(".split", li).addEventListener("click", () => {
      Logic.STEP_TEMPLATE.forEach((s) => Storage.addStep(t.id, s));
      render();
    });
    $(".delete", li).addEventListener("click", () => {
      if (confirm(`Удалить задание «${t.subject}: ${t.text}»?`)) { Storage.deleteTask(t.id); render(); }
    });
    return li;
  }

  // ---------- итоги ----------
  function renderStats() {
    const st = Logic.weekStats(Storage.tasks());
    $("#week-range").textContent = `Задания со сроком с ${Logic.fmt(st.start)} по ${Logic.fmt(st.end)}`;
    $("#st-total").textContent = st.total;
    $("#st-ontime").textContent = st.onTime;
    $("#st-late").textContent = st.late;
    $("#st-missed").textContent = st.missed;
  }

  // ---------- напоминания ----------
  const timeInput = $("#remind-time");
  timeInput.value = Storage.settings().remindTime;
  timeInput.addEventListener("change", () => {
    if (!timeInput.value) return;
    Storage.setSetting("remindTime", timeInput.value);
    // новое время сегодня ещё не наступило — разрешаем напомнить сегодня ещё раз
    const d = new Date(), hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (timeInput.value > hhmm && Storage.settings().lastReminded === Logic.today()) Storage.setSetting("lastReminded", null);
  });

  function notifyState() {
    const el = $("#notify-state"), btn = $("#notify-btn");
    if (!("Notification" in window)) { el.textContent = "Этот браузер не поддерживает уведомления — напоминание появится оранжевой плашкой вверху."; btn.hidden = true; return; }
    const map = { granted: "Уведомления включены ✓", denied: "Уведомления запрещены в настройках браузера — напоминание появится плашкой вверху.", default: "" };
    el.textContent = map[Notification.permission];
    btn.hidden = Notification.permission !== "default";
  }
  $("#notify-btn").addEventListener("click", async () => {
    await Notification.requestPermission();
    notifyState();
  });

  async function showNotification(body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "domashka-reminder" };
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) reg.showNotification("🔔 Домашка под контролем", opts);
    else new Notification("🔔 Домашка под контролем", opts);
  }

  function checkReminder() {
    const s = Storage.settings();
    if (!Logic.reminderDue(s)) return;
    Storage.setSetting("lastReminded", Logic.today());
    const tasks = Logic.forTomorrow(Storage.tasks());
    if (!tasks.length) return;
    const body = tasks.map((t) => `• ${t.subject}: ${t.text}`).join("\n");
    $("#reminder-text").textContent = "Не забудь сделать к завтра:\n" + body;
    $("#reminder").hidden = false;
    showNotification(body);
  }
  $("#reminder-close").addEventListener("click", () => ($("#reminder").hidden = true));

  // ---------- запуск ----------
  function render() {
    renderList();
    renderStats();
  }
  render();
  notifyState();
  checkReminder();
  setInterval(checkReminder, 20_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); checkReminder(); } });

  // офлайн-режим и установка на телефон (работает, когда сайт открыт по http/https)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
