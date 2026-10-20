// Уровень данных: «память» приложения.
// Всё хранится в браузере (localStorage), на сервер ничего не отправляется.
const Storage = (() => {
  const KEY = "domashka.v1";
  const empty = () => ({ tasks: [], settings: { remindTime: "18:00", lastReminded: null } });

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.tasks)) return { ...empty(), ...data, settings: { ...empty().settings, ...data.settings } };
    } catch (e) { /* испорченные данные — начинаем заново */ }
    return empty();
  }

  let state = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  return {
    tasks: () => state.tasks,
    settings: () => state.settings,

    addTask(subject, text, due) {
      const task = { id: newId(), subject, text, due, doneAt: null, created: Logic.today(), steps: [] };
      state.tasks.push(task);
      save();
      return task;
    },
    updateTask(id, changes) {
      const t = state.tasks.find((t) => t.id === id);
      if (t) { Object.assign(t, changes); save(); }
      return t;
    },
    deleteTask(id) {
      state.tasks = state.tasks.filter((t) => t.id !== id);
      save();
    },
    addStep(taskId, text) {
      const t = state.tasks.find((t) => t.id === taskId);
      if (t) { t.steps.push({ id: newId(), text, done: false }); save(); }
    },
    toggleStep(taskId, stepId) {
      const s = state.tasks.find((t) => t.id === taskId)?.steps.find((s) => s.id === stepId);
      if (s) { s.done = !s.done; save(); }
    },
    deleteStep(taskId, stepId) {
      const t = state.tasks.find((t) => t.id === taskId);
      if (t) { t.steps = t.steps.filter((s) => s.id !== stepId); save(); }
    },
    setSetting(key, value) {
      state.settings[key] = value;
      save();
    },
    exportJson: () => JSON.stringify(state, null, 2),
  };
})();
