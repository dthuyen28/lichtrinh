/***********************
 * MODEL
 ***********************/
const Model = (() => {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    let projects = JSON.parse(localStorage.getItem("projects")) || ["Cá nhân", "Học tập"];

    function save() {
        localStorage.setItem("tasks", JSON.stringify(tasks));
        localStorage.setItem("projects", JSON.stringify(projects));
    }

    // migrate task cũ
    tasks.forEach((t, i) => {
        if (!t.id) t.id = Date.now() + i;
        if (!t.status) t.status = "todo";
    });
    save();

    return {
        getTasks: () => tasks,
        getProjects: () => projects,

        findIndexById(id) {
            return tasks.findIndex(t => t.id == id);
        },

        addTask(task) {
            tasks.push(task);
            save();
        },

        updateTask(index, task) {
            tasks[index] = task;
            save();
        },

        deleteTask(index) {
            tasks.splice(index, 1);
            save();
        },

        addProject(name) {
            projects.push(name);
            save();
        }
    };
})();


/***********************
 * VIEW
 ***********************/
const View = (() => {

    const cols = {
        text: document.getElementById("col-text"),
        category: document.getElementById("col-category"),
        deadline: document.getElementById("col-deadline"),
        status: document.getElementById("col-status")
    };

    function clearBoard() {
        Object.values(cols).forEach(c => c.innerHTML = "");
    }

    function formatDate(d) {
        if (!d) return "";
        return new Date(d).toLocaleString("vi-VN");
    }

    function renderTasks(tasks, selectedId) {
        clearBoard();

        tasks.forEach(task => {
            renderTaskText(cols.text, task, selectedId);
            renderItem(cols.category, task.category);
            renderItem(cols.deadline, formatDate(task.deadline));
            renderStatus(cols.status, task);
        });
    }

    function renderTaskText(col, task, selectedId) {
        const div = document.createElement("div");
        div.className = "task-item";
        div.dataset.id = task.id;
        div.textContent = task.title;

        const now = new Date();
        const todayStr = now.toDateString();

        if (task.deadline) {
            const d = new Date(task.deadline);

            if (d < now && task.status !== "done") {
                div.classList.add("overdue");
            }

            if (d.toDateString() === todayStr) {
                div.classList.add("today");
            }
        }

        if (task.status === "done") {
            div.style.textDecoration = "line-through";
            div.style.opacity = "0.6";
        }

        if (task.id == selectedId) {
            div.classList.add("selected");
        }

        col.appendChild(div);
    }

    function renderItem(col, text) {
        const div = document.createElement("div");
        div.className = "task-item";
        div.textContent = text || "";
        col.appendChild(div);
    }

    function renderStatus(col, task) {
        const div = document.createElement("div");
        div.className = "task-item status";
        div.dataset.id = task.id;
        div.textContent = task.status === "done"
            ? "✔ Đã xong"
            : "⏳ Đang làm";
        col.appendChild(div);
    }

    function renderProjects(projects) {
        const ul = document.getElementById("projectList");
        const select = document.getElementById("category-input");

        ul.innerHTML = "";
        select.innerHTML = "";

        projects.forEach(p => {
            const li = document.createElement("li");
            li.textContent = p;
            li.dataset.project = p;
            ul.appendChild(li);

            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            select.appendChild(opt);
        });
    }

    return { renderTasks, renderProjects };
})();


/***********************
 * CONTROLLER
 ***********************/
const Controller = (() => {

    let currentView = "all";
    let currentProject = null;
    let currentStatus = "all";
    let editingIndex = null;
    let selectedTaskId = null;

    const modal = document.getElementById("modal");
    const taskInput = document.getElementById("task-input");
    const categoryInput = document.getElementById("category-input");
    const deadlineInput = document.getElementById("deadline-input");
    const priorityInput = document.getElementById("priority-input");

    const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.getElementById('toggle-sidebar-btn');
const overlay = document.getElementById('overlay');
const main = document.querySelector('.main');

// Mở/ẩn sidebar bằng nút
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    main.classList.toggle('sidebar-open');
    overlay.classList.toggle('active');
});

// Ẩn sidebar khi click overlay
overlay.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    main.classList.remove('sidebar-open');
    overlay.classList.remove('active');
});

// Ẩn/hiện tự động theo kích thước màn hình
function checkWidth() {
    if (window.innerWidth < 768) {
        sidebar.classList.add('hidden');
        overlay.classList.remove('active');
        main.classList.remove('sidebar-open');
    } else {
        sidebar.classList.remove('hidden');
        main.classList.remove('sidebar-open');
        overlay.classList.remove('active');
    }
}

// Gọi khi load trang và resize
window.addEventListener('resize', checkWidth);
window.addEventListener('load', checkWidth);

    function init() {
        View.renderProjects(Model.getProjects());
        render();

        document.getElementById("add-btn").onclick = openModal;
        document.getElementById("cancel-btn").onclick = closeModal;
        document.getElementById("save-btn").onclick = saveTask;

        // CLICK → SỬA
        document.getElementById("col-text").onclick = openEdit;

        // CLICK → ĐỔI TRẠNG THÁI
        document.getElementById("col-status").onclick = toggleStatus;

        document.getElementById("filter-select").onchange = e => {
            currentStatus = e.target.value;
            render();
        };

        document.getElementById("projectList").onclick = selectProject;

        document.querySelectorAll(".nav").forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentView = btn.dataset.view;
                currentProject = null;
                render();
            };
        });

        document.getElementById("addProjectBtn").onclick = addProject;
        enableSwipeDelete();

        // ⌨️ PHÍM TẮT
        document.addEventListener("keydown", handleKey);
    }
    /******** Swipe to delete (mobile) ********/
function enableSwipeDelete() {
    let startX = 0;
    let currentItem = null;

    document.getElementById("col-text").addEventListener("touchstart", e => {
        const item = e.target.closest(".task-item");
        if (!item) return;

        startX = e.touches[0].clientX;
        currentItem = item;
        item.classList.add("swiping");
    });

    document.getElementById("col-text").addEventListener("touchmove", e => {
        if (!currentItem) return;

        const dx = e.touches[0].clientX - startX;
        if (dx < 0) {
            currentItem.style.transform = `translateX(${dx}px)`;
            if (dx < -80) {
                currentItem.classList.add("delete-bg");
            }
        }
    });

    document.getElementById("col-text").addEventListener("touchend", () => {
        if (!currentItem) return;

        const dx = currentItem.style.transform
            ? parseInt(currentItem.style.transform.replace("translateX(", ""))
            : 0;

        // ✅ đủ xa → xóa
        if (dx < -120) {
            const id = currentItem.dataset.id;
            const index = Model.findIndexById(id);
            if (index !== -1) {
                Model.deleteTask(index);
            }
            render();
        } else {
            // ❌ chưa đủ → trả về
            currentItem.style.transform = "";
            currentItem.classList.remove("delete-bg");
        }

        currentItem.classList.remove("swiping");
        currentItem = null;
    });
}


    function handleKey(e) {
        // ENTER → SAVE
        if (modal.classList.contains("show") && e.key === "Enter") {
            e.preventDefault();
            saveTask();
        }

        // ESC → CLOSE
        if (modal.classList.contains("show") && e.key === "Escape") {
            closeModal();
        }

        // DELETE → XÓA TASK
        if (!modal.classList.contains("show")
            && selectedTaskId
            && (e.key === "Delete" || e.key === "Backspace")) {

            const index = Model.findIndexById(selectedTaskId);
            if (index === -1) return;

            if (!confirm("Xóa công việc này?")) return;

            Model.deleteTask(index);
            selectedTaskId = null;
            render();
        }
    }

    function openModal() {
        modal.classList.add("show");
    }

    function closeModal() {
        modal.classList.remove("show");
        editingIndex = null;
        taskInput.value = "";
        deadlineInput.value = "";
    }

    function openEdit(e) {
        const item = e.target.closest(".task-item");
        if (!item || !item.dataset.id) return;

        const index = Model.findIndexById(item.dataset.id);
        if (index === -1) return;

        const task = Model.getTasks()[index];
        editingIndex = index;
        selectedTaskId = task.id;

        taskInput.value = task.title;
        categoryInput.value = task.category;
        deadlineInput.value = task.deadline || "";
        priorityInput.value = task.priority;

        openModal();
    }

    function toggleStatus(e) {
        const item = e.target.closest(".task-item.status");
        if (!item || !item.dataset.id) return;

        const index = Model.findIndexById(item.dataset.id);
        if (index === -1) return;

        const task = Model.getTasks()[index];
        task.status = task.status === "done" ? "todo" : "done";
        Model.updateTask(index, task);
        render();
    }

    function saveTask() {
        const title = taskInput.value.trim();
        if (!title) return;

        const data = {
            id: editingIndex !== null
                ? Model.getTasks()[editingIndex].id
                : Date.now(),
            title,
            category: categoryInput.value,
            deadline: deadlineInput.value,
            priority: priorityInput.value,
            status: editingIndex !== null
                ? Model.getTasks()[editingIndex].status
                : "todo",
            createdAt: new Date()
        };

        if (editingIndex !== null) {
            Model.updateTask(editingIndex, data);
        } else {
            Model.addTask(data);
        }

        closeModal();
        render();
    }

    function selectProject(e) {
        if (!e.target.dataset.project) return;
        currentProject = e.target.dataset.project;
        render();
    }

    function addProject() {
        const name = prompt("Tên danh mục mới:");
        if (!name) return;
        Model.addProject(name);
        View.renderProjects(Model.getProjects());
    }

    function render() {
        let tasks = [...Model.getTasks()];
        const now = new Date();
        const todayStr = now.toDateString();

        if (currentView === "today") {
            tasks = tasks.filter(t =>
                t.deadline &&
                new Date(t.deadline).toDateString() === todayStr
            );
        }
        else if (currentView === "upcoming") {
            tasks = tasks.filter(t =>
                t.deadline &&
                new Date(t.deadline) > now &&
                t.status !== "done"
            );
        }
        else if (currentView === "done") {
            tasks = tasks.filter(t => t.status === "done");
        }

        if (currentStatus === "todo") {
            tasks = tasks.filter(t => t.status === "todo");
        }
        else if (currentStatus === "done") {
            tasks = tasks.filter(t => t.status === "done");
        }

        if (currentProject) {
            tasks = tasks.filter(t => t.category === currentProject);
        }

        tasks.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        View.renderTasks(tasks, selectedTaskId);
    }

    return { init };
})();

document.addEventListener("DOMContentLoaded", Controller.init);
