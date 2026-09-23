/* ======================================================
   AUTH GUARD
====================================================== */

const role = localStorage.getItem("selectedRole");
const loggedIn = localStorage.getItem("loggedIn");
const userId = localStorage.getItem("userId");
/* ======================================================
   SUPABASE
====================================================== */

if (!window.supabaseClient) {
    console.error("Supabase client is not loaded.");
} else {
    console.log("Student dashboard: Supabase connected.");
}

if (!loggedIn || role !== "student" || !userId) {
    window.location.href = "login.html";
}


/* ======================================================
   STUDENT PROFILE (derived — see data.js)
====================================================== */

let studentName = "Student";
let studentSemester = "";
let studentProgram = "";
let studentDepartment = "";
let studentRollNumber = "";
let studentProjects = [];
async function loadStudentProfile() {
    console.log("Loading student profile for:", userId);

    const { data: user, error: userError } =
        await window.supabaseClient
            .from("users")
            .select("email, name, role")
            .eq("email", userId)
            .maybeSingle();

    if (userError) {
        console.error("Could not load student user:", userError);
        return;
    }

    console.log("Student user from Supabase:", user);

    if (user?.name) {
        studentName = user.name;
    }

    const { data: profile, error: profileError } =
        await window.supabaseClient
            .from("student_profiles")
            .select(`
                roll_number,
                program,
                department,
                semester
            `)
            .eq("email", userId)
            .maybeSingle();

    if (profileError) {
        console.error(
            "Could not load student profile:",
            profileError
        );
        return;
    }

    console.log("Student profile from Supabase:", profile);

    if (profile) {
        studentRollNumber = profile.roll_number || "";
        studentProgram = profile.program || "";
        studentDepartment = profile.department || "";
        studentSemester = profile.semester || "";
    }
}

async function loadStudentProjects() {
    console.log("Loading projects for student:", userId);

    const { data: memberships, error: membershipError } =
        await window.supabaseClient
            .from("project_members")
            .select(`
                project_code,
                student_email,
                member_role,
                joined_at,
                left_at
            `)
            .eq("student_email", userId)
            .is("left_at", null);

    if (membershipError) {
        console.error("Could not load student project memberships:", membershipError);
        return [];
    }

    console.log("Student project memberships:", memberships);

    if (!memberships || memberships.length === 0) {
        return [];
    }

    const projectCodes = [
        ...new Set(memberships.map((m) => m.project_code))
    ];

    const { data: projects, error: projectsError } =
        await window.supabaseClient
            .from("projects")
            .select(`
                project_code,
                title,
                description,
                summary,
                expected_outcome,
                status,
                progress,
                academic_year,
                semester
            `)
            .in("project_code", projectCodes);

    if (projectsError) {
        console.error("Could not load student projects:", projectsError);
        return [];
    }

    console.log("Student projects from Supabase:", projects);

    return projects || [];
}

/* ======================================================
   INTERESTS STORAGE
   Stored per-user in localStorage (see data.js) as a
   stand-in for the backend: [{ projectId, status, submittedAt }]
====================================================== */

let interests = [];

function getInterest(projectId) {
    return interests.find((i) => i.projectId === projectId) || null;
}

function submitInterest(projectId) {
    if (getInterest(projectId)) return;

    interests.push({
        projectId,
        status: "Pending",
        submittedAt: new Date().toISOString()
    });

    saveInterestsFor(userId, interests);
    showToast("Interest submitted ✓");
    renderAll();
}

/* Demo affordance: since there's no faculty portal wired up
   yet to accept/reject, clicking an already-pending interest
   simulates the faculty response so the flow is visible. */
function simulateFacultyResponse(projectId) {
    const interest = getInterest(projectId);
    if (!interest || interest.status !== "Pending") return;

    const project = getAllProjects().find((p) => p.id === projectId);
    const mentor = project ? project.mentor : "The faculty mentor";

    interest.status = Math.random() < 0.6 ? "Accepted" : "Rejected";
    interest.respondedAt = new Date().toISOString();
    saveInterestsFor(userId, interests);
    showToast(
        interest.status === "Accepted"
            ? `🎉 ${mentor} accepted you onto ${project ? project.title : "the project"}!`
            : `${mentor} couldn't take you onto ${project ? project.title : "this project"} this time.`
    );
    renderAll();
}


/* ======================================================
   MY PROJECT (derived from an accepted interest)
====================================================== */

function getMyProject() {
    const accepted = interests.find((i) => i.status === "Accepted");
    if (!accepted) return null;
    return getAllProjects().find((p) => p.id === accepted.projectId) || null;
}

function getMyProjects() {
    const acceptedIds = interests.filter((i) => i.status === "Accepted").map((i) => i.projectId);
    return getAllProjects().filter((p) => acceptedIds.includes(p.id));
}


/* ======================================================
   TOAST
====================================================== */

let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2600);
}


/* ======================================================
   TABS
====================================================== */

const tabButtons = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");
const notifBtn = document.getElementById("notifBtn");

function goToTab(tabName) {
    tabButtons.forEach((btn) => {
        btn.dataset.active = String(btn.dataset.tab === tabName);
    });

    views.forEach((view) => {
        view.dataset.active = String(view.id === `view-${tabName}`);
    });

    if (notifBtn) {
        notifBtn.dataset.active = String(tabName === "notifications");
    }
}

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToTab(btn.dataset.tab));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => goToTab(btn.dataset.goto));
});

if (notifBtn) {
    notifBtn.addEventListener("click", () => goToTab(notifBtn.dataset.tab));
}


/* ======================================================
   LOGOUT
====================================================== */

function logout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedRole");
    window.location.href = "index.html";
}

document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("logoutBtnProfile").addEventListener("click", logout);


/* ======================================================
   DISCOVER: FILTER STATE
====================================================== */

const STATUSES = ["All", "Ongoing", "Proposed", "Completed"];
const DOMAINS = [
    "All",
    "AI / Machine Learning",
    "Robotics & Embedded Systems",
    "Sustainability",
    "Healthcare Tech"
];

let activeStatus = "All";
let activeDomain = "All";
let activeMentor = "All";
let searchTerm = "";

function matchesFilters(project) {
    const statusMatch = activeStatus === "All" || project.status === activeStatus;
    const domainMatch = activeDomain === "All" || project.domain === activeDomain;
    const mentorMatch = activeMentor === "All" || project.mentor === activeMentor;

    const term = searchTerm.toLowerCase();
    const searchMatch =
        !term ||
        project.title.toLowerCase().includes(term) ||
        project.summary.toLowerCase().includes(term) ||
        project.domain.toLowerCase().includes(term) ||
        project.mentor.toLowerCase().includes(term);

    return statusMatch && domainMatch && mentorMatch && searchMatch;
}

function statusBadgeClass(status) {
    if (status === "Ongoing") return "badge-ongoing";
    if (status === "Proposed") return "badge-proposed";
    if (status === "Completed") return "badge-completed";
    return "";
}

function interestBadgeClass(status) {
    if (status === "Pending") return "badge-pending";
    if (status === "Accepted") return "badge-accepted";
    if (status === "Rejected") return "badge-rejected";
    return "";
}


/* ======================================================
   RENDER: HOME
====================================================== */

function renderHome() {
    document.getElementById("greetingText").textContent = `Hi, ${studentName} 👋`;
    document.getElementById("greetingSub").textContent = `Semester ${studentSemester} · ${cohortCodeFromSemester(studentSemester)} · ${userId}`;

    const myProject = getMyProject();
    const pendingCount = interests.filter((i) => i.status === "Pending").length;
    const acceptedCount = interests.filter((i) => i.status === "Accepted").length;

    document.getElementById("statRow").innerHTML = `
        <div class="stat-card">
            <p class="stat-value">${myProject ? "1" : "0"}</p>
            <p class="stat-label">Active project</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${pendingCount}</p>
            <p class="stat-label">Pending interests</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${acceptedCount}</p>
            <p class="stat-label">Accepted interests</p>
        </div>
    `;

    const myProjectPanel = document.getElementById("myProjectPanel");

    if (myProject) {
        myProjectPanel.innerHTML = `
            <div class="my-project-card">
                <p class="my-project-title">${myProject.title}</p>
                <p class="my-project-meta">${myProject.domain} · Mentor: ${myProject.mentor}</p>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${myProject.progress}%"></div>
                </div>
                <p class="progress-label">${myProject.progress}% complete</p>
            </div>
        `;
    } else {
        myProjectPanel.innerHTML = `
            <p class="empty-panel">
                You're not on a project team yet. Browse
                <a data-goto="discover">Discover Projects</a>
                and express interest to get started.
            </p>
        `;
        myProjectPanel.querySelector("[data-goto]").addEventListener("click", (e) => {
            goToTab(e.target.dataset.goto);
        });
    }

    const previewEl = document.getElementById("myInterestsPreview");
    const recent = [...interests].reverse().slice(0, 3);

    if (recent.length === 0) {
        previewEl.innerHTML = `<p class="empty-panel">No interests submitted yet.</p>`;
        return;
    }

    previewEl.innerHTML = recent.map((interest) => {
        const project = getAllProjects().find((p) => p.id === interest.projectId);
        if (!project) return "";
        return `
            <div class="mini-interest-row">
                <div>
                    <p class="mini-interest-title">${project.title}</p>
                    <p class="mini-interest-domain">${project.domain}</p>
                </div>
                <span class="badge ${interestBadgeClass(interest.status)}">${interest.status}</span>
            </div>
        `;
    }).join("");
}


/* ======================================================
   RENDER: DISCOVER
====================================================== */

function actionButtonHtml(project) {
    const interest = getInterest(project.id);

    if (!interest) {
        return `<button class="btn btn-primary" data-express="${project.id}">Express Interest</button>`;
    }

    if (interest.status === "Pending") {
        return `<button class="btn btn-pending" data-simulate="${project.id}" title="Demo: click to simulate faculty response">Pending ✓</button>`;
    }

    if (interest.status === "Accepted") {
        return `<button class="btn btn-accepted" disabled>Accepted ✓</button>`;
    }

    return `<button class="btn btn-rejected" disabled>Not selected</button>`;
}

function studentDiscoverMentors() {
    return ["All", ...[...new Set(getAllProjects().map((p) => p.mentor).filter(Boolean))].sort()];
}

function renderDiscoverChips() {
    document.getElementById("statusChips").innerHTML = STATUSES.map((status) => `
        <button class="chip" data-status="${status}" data-active="${status === activeStatus}">${status}</button>
    `).join("");

    document.getElementById("domainChips").innerHTML = DOMAINS.map((domain) => `
        <button class="chip" data-domain-filter="${domain}" data-active="${domain === activeDomain}">${domain}</button>
    `).join("");

    const mentorSelect = document.getElementById("discoverMentorSelect");
    if (mentorSelect) {
        mentorSelect.innerHTML = studentDiscoverMentors().map((m) =>
            `<option value="${m}" ${m === activeMentor ? "selected" : ""}>${m === "All" ? "All professors" : m}</option>`
        ).join("");
    }
}

function renderDiscover() {
    const filtered = getAllProjects().filter(matchesFilters);
    const grid = document.getElementById("discoverGrid");
    const empty = document.getElementById("discoverEmpty");

    document.getElementById("discoverCount").textContent =
        `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;

    if (filtered.length === 0) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    grid.innerHTML = filtered.map((project) => `
        <article class="project-card">
            <div class="project-card-top">
                <span class="project-domain">${project.domain}</span>
                <span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>
            </div>
            <div class="project-card-body">
                <h3 class="project-title" data-open="${project.id}">${project.title}</h3>
                <div style="margin-bottom:8px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>
                <p class="project-description">${project.summary}</p>
                <p class="project-mentor-row">${project.mentor}</p>
                <div class="project-card-actions">
                    ${actionButtonHtml(project)}
                    <button class="btn btn-secondary" data-open="${project.id}">Details</button>
                </div>
            </div>
        </article>
    `).join("");
}


/* ======================================================
   RENDER: MY INTERESTS
====================================================== */

function renderInterests() {
    const list = document.getElementById("interestsList");
    const empty = document.getElementById("interestsEmpty");

    if (interests.length === 0) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const sorted = [...interests].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    list.innerHTML = sorted.map((interest) => {
        const project = getAllProjects().find((p) => p.id === interest.projectId);
        if (!project) return "";

        const date = new Date(interest.submittedAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });

        return `
            <div class="interest-row">
                <div class="interest-row-main">
                    <p class="interest-row-title" data-open="${project.id}">${project.title}</p>
                    <p class="interest-row-meta">${project.domain} · ${project.mentor}</p>
                </div>
                <div class="interest-row-right">
                    <span class="interest-date">${date}</span>
                    <span class="badge ${interestBadgeClass(interest.status)}">${interest.status}</span>
                </div>
            </div>
        `;
    }).join("");
}


/* ======================================================
   RENDER: PROFILE
====================================================== */

function renderProfile() {
    document.getElementById("profileAvatar").textContent = studentName.charAt(0);
    document.getElementById("profileName").textContent = studentName;
    document.getElementById("profileMeta").textContent = `Student · Semester ${studentSemester}`;
    document.getElementById("profileUserId").textContent = userId;
}


/* ======================================================
   RENDER: MY PROJECTS (full tab)
   Shows each project the student has been accepted onto:
   mentor, teammates, status/progress, milestones, and a
   SharePoint workspace where the team posts reports that
   the faculty mentor and ILGC faculty can view.
====================================================== */

function milestoneListHtml(projectId) {
    const milestones = (typeof PROJECT_MILESTONES !== "undefined" && PROJECT_MILESTONES[projectId]) || [];
    if (!milestones.length) {
        return `<p class="empty-panel">No milestones recorded yet.</p>`;
    }
    return `<div class="mp-milestones">${milestones.map((m) => `
        <div class="mp-milestone ${m.done ? "done" : ""}">
            <span class="mp-milestone-dot ${m.done ? "done" : ""}"></span>
            <span class="mp-milestone-title">${m.title}</span>
            <span class="mp-milestone-date">${m.date}</span>
        </div>
    `).join("")}</div>`;
}

function sharePointHtml(project) {
    const sp = getSharePoint(project.id);

    if (!sp) {
        return `
            <div class="mp-sharepoint">
                <div class="mp-sharepoint-head">
                    <div>
                        <p class="mp-block-title">SharePoint workspace</p>
                        <p class="mp-block-sub">Create a shared space to post reports. Your faculty mentor and the ILGC faculty will be able to view whatever you add here.</p>
                    </div>
                </div>
                <button class="btn btn-primary" data-sp-create="${project.id}">+ Create SharePoint</button>
            </div>
        `;
    }

    const filesHtml = sp.files.length
        ? sp.files.map((f) => {
            const date = new Date(f.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const linkHtml = f.link
                ? `<a class="mp-file-link" href="${f.link}" target="_blank" rel="noopener">Open report ↗</a>`
                : "";
            return `
                <div class="mp-file">
                    <div class="mp-file-main">
                        <p class="mp-file-title">${f.title}</p>
                        ${f.note ? `<p class="mp-file-note">${f.note}</p>` : ""}
                        <p class="mp-file-meta">Added by ${f.addedBy} · ${date}</p>
                    </div>
                    <div class="mp-file-actions">
                        ${linkHtml}
                        <button class="btn btn-danger btn-small" data-sp-remove="${project.id}|${f.id}">Remove</button>
                    </div>
                </div>
            `;
        }).join("")
        : `<p class="empty-panel">No reports posted yet. Add your first one below.</p>`;

    return `
        <div class="mp-sharepoint">
            <div class="mp-sharepoint-head">
                <div>
                    <p class="mp-block-title">SharePoint workspace</p>
                    <p class="mp-block-sub">Visible to you, your teammates, ${project.mentor}, and the ILGC faculty.</p>
                </div>
                <span class="badge badge-accepted">Active</span>
            </div>

            <div class="mp-file-list">${filesHtml}</div>

            <form class="mp-report-form" data-sp-form="${project.id}">
                <input type="text" data-sp-title placeholder="Report title (e.g. Progress Report — Sprint 3)" required>
                <textarea data-sp-note placeholder="Short note on what's in this report (optional)"></textarea>
                <input type="url" data-sp-link placeholder="Link to the report file (Google Doc, Drive, etc.) — optional">
                <button type="submit" class="btn btn-primary">+ Add Report</button>
            </form>
        </div>
    `;
}

function myProjectFullCardHtml(project) {
    const teammates = (project.team || []).filter((m) => m.name !== studentName);
    const teamHtml = teammates.length
        ? `<div class="modal-team">${teammates.map((m) => `<span class="team-chip">${m.name} · Sem ${m.semester} · ${yearFromSemester(m.semester)}</span>`).join("")}</div>`
        : `<p class="empty-panel">You're the only student on this project so far.</p>`;

    return `
        <article class="mp-card">
            <div class="mp-card-top">
                <span class="project-domain">${project.domain}</span>
                <span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>
            </div>

            <h2 class="mp-title">${project.title}</h2>
            <p class="mp-summary">${project.summary}</p>

            <div class="mp-meta-grid">
                <div class="mp-meta-item">
                    <span class="meta-label">Faculty mentor</span>
                    <span class="meta-value">${project.mentor}</span>
                </div>
                <div class="mp-meta-item">
                    <span class="meta-label">Cohort</span>
                    <span class="meta-value">${project.cohort}</span>
                </div>
                <div class="mp-meta-item">
                    <span class="meta-label">Progress</span>
                    <span class="meta-value">${project.progress}%</span>
                </div>
            </div>

            <div class="progress-track" style="margin-bottom:20px;">
                <div class="progress-fill" style="width:${project.progress}%"></div>
            </div>

            <p class="mp-block-title">Teammates</p>
            ${teamHtml}

            <p class="mp-block-title" style="margin-top:22px;">Milestones</p>
            ${milestoneListHtml(project.id)}

            ${sharePointHtml(project)}
        </article>
    `;
}

function renderMyProjectsFull() {
    const container = document.getElementById("myProjectsFull");
    if (!container) return;

    const projects = studentProjects;

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="mp-empty">
                <p class="empty-panel">
                    You haven't been accepted onto a project yet. Browse
                    <a data-goto="discover">Discover Projects</a>
                    and express interest — once a faculty mentor accepts you, your project shows up here.
                </p>
            </div>
        `;
        const link = container.querySelector("[data-goto]");
        if (link) link.addEventListener("click", (e) => goToTab(e.target.dataset.goto));
        return;
    }

    container.innerHTML = projects.map(myProjectFullCardHtml).join("");
}


/* ======================================================
   MODAL
====================================================== */

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");

function openModal(projectId) {
    const project = getAllProjects().find((p) => p.id === projectId);
    if (!project) return;

    const teamHtml = project.team.length
        ? `<div class="modal-team">${project.team.map((m) => `<span class="team-chip">${m.name} · Sem ${m.semester} · ${yearFromSemester(m.semester)}</span>`).join("")}</div>`
        : `<p class="modal-text">No students assigned to this project yet.</p>`;

    const profEmail = facultyEmail(project.mentor);

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${project.domain} · ${project.status}</p>
        <h2 class="modal-title">${project.title}</h2>
        <div style="margin-bottom:16px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>

        <div class="modal-meta-row">
            <div class="modal-meta-item">
                <span class="meta-label">Mentor</span>
                <span class="meta-value">${project.mentor}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Cohort</span>
                <span class="meta-value">${project.cohort}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Progress</span>
                <span class="meta-value">${project.progress}%</span>
            </div>
        </div>

        <p class="modal-section-label">Overview</p>
        <p class="modal-text">${project.summary}</p>

        <p class="modal-section-label">Expected outcome</p>
        <p class="modal-text">${project.expectedOutcome}</p>

        <p class="modal-section-label">Current team</p>
        ${teamHtml}

        <p class="modal-section-label">Contact the professor</p>
        <div class="contact-prof">
            <span class="contact-prof-email">${profEmail}</span>
            <button class="btn btn-secondary btn-small" data-email-prof="${project.id}">✉ Email ${project.mentor}</button>
        </div>

        <div class="modal-actions">
            ${actionButtonHtml(project)}
        </div>
    `;

    modalOverlay.classList.remove("hidden");
}

/* Open the student's mail client (Outlook web, with mailto fallback)
   pre-addressed to the project's professor. */
function emailProfessor(projectId) {
    const project = getAllProjects().find((p) => p.id === projectId);
    if (!project) return;

    const to = facultyEmail(project.mentor);
    const subject = `ILGC — question about "${project.title}"`;
    const body =
        `Dear ${project.mentor},\n\n` +
        `I'm interested in your ILGC project "${project.title}" and would like to know more. ` +
        `Would you have some time to discuss it?\n\n` +
        `Thank you,\n${studentName}`;

    const outlookUrl =
        `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}` +
        `&subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;

    const win = window.open(outlookUrl, "_blank", "noopener");
    if (!win) {
        window.location.href =
            `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    showToast(`Opening email to ${project.mentor} ✉`);
}

function closeModal() {
    modalOverlay.classList.add("hidden");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});


/* ======================================================
   EVENT DELEGATION
====================================================== */

document.getElementById("statusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;
    activeStatus = btn.dataset.status;
    renderDiscoverChips();
    renderDiscover();
});

document.getElementById("domainChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-domain-filter]");
    if (!btn) return;
    activeDomain = btn.dataset.domainFilter;
    renderDiscoverChips();
    renderDiscover();
});

document.getElementById("discoverSearch").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim();
    renderDiscover();
});

document.getElementById("discoverMentorSelect").addEventListener("change", (e) => {
    activeMentor = e.target.value;
    renderDiscover();
});

document.addEventListener("click", (e) => {
    const expressBtn = e.target.closest("[data-express]");
    if (expressBtn) {
        submitInterest(expressBtn.dataset.express);
        return;
    }

    const simulateBtn = e.target.closest("[data-simulate]");
    if (simulateBtn) {
        simulateFacultyResponse(simulateBtn.dataset.simulate);
        return;
    }

    const emailProf = e.target.closest("[data-email-prof]");
    if (emailProf) {
        emailProfessor(emailProf.dataset.emailProf);
        return;
    }

    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
        openModal(openBtn.dataset.open);
        return;
    }

    const spCreate = e.target.closest("[data-sp-create]");
    if (spCreate) {
        createSharePoint(spCreate.dataset.spCreate, studentName);
        showToast("SharePoint workspace created ✓");
        renderMyProjectsFull();
        return;
    }

    const spRemove = e.target.closest("[data-sp-remove]");
    if (spRemove) {
        const [projectId, fileId] = spRemove.dataset.spRemove.split("|");
        removeSharePointFile(projectId, fileId);
        showToast("Report removed");
        renderMyProjectsFull();
        return;
    }
});

/* SharePoint "add report" form submissions */
document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-sp-form]");
    if (!form) return;
    e.preventDefault();

    const projectId = form.dataset.spForm;
    const title = form.querySelector("[data-sp-title]").value;
    const note = form.querySelector("[data-sp-note]").value;
    const link = form.querySelector("[data-sp-link]").value;

    if (!title.trim()) return;

    addSharePointFile(projectId, { title, note, link, addedBy: studentName });
    showToast("Report added to SharePoint ✓");
    renderMyProjectsFull();
});


/* ======================================================
   FLOAT AN IDEA (student proposes a project)
   The idea lands in the shared idea store (addIdea), so it
   immediately appears in the Faculty "Student Ideas" tab and
   the Mentor "Project Proposals" tab, attributed to this
   student. It's also tracked here under "My Ideas".
====================================================== */

function slugify(text) {
    return String(text || "idea")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "idea";
}

const FLOAT_MENTORS = ["Dr. Ananya Rao", "Dr. Farhan Qureshi", "Dr. Priya Menon"];
const FLOAT_DOMAINS = ["AI / Machine Learning", "Robotics & Embedded Systems", "Sustainability", "Healthcare Tech", "IoT", "Education"];

function openFloatIdeaModal() {
    modalBody.innerHTML = `
        <p class="modal-eyebrow">YOUR IDEA</p>
        <h2 class="modal-title">Float a Project Idea</h2>
        <p class="modal-text" style="margin-bottom:18px;">Propose your own project. It'll be sent to a mentor for review and will be visible to the ILGC faculty and mentors, marked as floated by you.</p>

        <form id="floatIdeaForm" class="float-form">
            <label class="float-label">Project title
                <input type="text" id="fiTitle" required placeholder="e.g. SmartBin: AI Waste Sorting">
            </label>

            <label class="float-label">Domain
                <select id="fiDomain">
                    ${FLOAT_DOMAINS.map((d) => `<option value="${d}">${d}</option>`).join("")}
                </select>
            </label>

            <label class="float-label">Send to mentor
                <select id="fiMentor">
                    ${FLOAT_MENTORS.map((m) => `<option value="${m}">${m}</option>`).join("")}
                </select>
            </label>

            <label class="float-label">Problem statement
                <textarea id="fiProblem" required placeholder="What problem does this solve?"></textarea>
            </label>

            <label class="float-label">Scope
                <textarea id="fiScope" required placeholder="What would you actually build?"></textarea>
            </label>

            <label class="float-label">Tags (comma-separated)
                <input type="text" id="fiTags" placeholder="e.g. AI, Sustainability">
            </label>

            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Float this idea</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("floatIdeaForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("fiTitle").value.trim();
        if (!title) return;

        const tags = document.getElementById("fiTags").value
            .split(",").map((t) => t.trim()).filter(Boolean);

        addIdea({
            id: `idea-${Date.now().toString(36)}`,
            title,
            studentName,
            studentSemester,
            studentUserId: userId,
            domain: document.getElementById("fiDomain").value,
            problemStatement: document.getElementById("fiProblem").value.trim(),
            scope: document.getElementById("fiScope").value.trim(),
            proposedDate: new Date().toISOString().slice(0, 10),
            status: "Pending",
            tags,
            targetMentor: document.getElementById("fiMentor").value,
            origin: "student"
        });

        closeModal();
        showToast("Idea floated ✓ — your mentor will review it");
        renderMyIdeas();
        renderNotifBadge();
        goToTab("myideas");
    });
}


/* ======================================================
   RENDER: IDEAS (all student-floated ideas across ILGC)
   Shows every idea floated by any student — the same pool
   the faculty and mentors see — with the student's own
   ideas marked. Filterable to just "Mine".
====================================================== */

let ideasScope = "All";

function ideaStatusBadgeClass(status) {
    if (status === "Accepted" || status === "Approved") return "badge-accepted";
    if (status === "Rejected" || status === "Declined") return "badge-rejected";
    if (status === "Needs Revision") return "badge-pending";
    return "badge-pending";
}

function isMyIdea(idea) {
    return idea.studentUserId === userId || idea.studentName === studentName;
}

function renderIdeasScopeChips() {
    const el = document.getElementById("ideasScopeChips");
    if (!el) return;
    el.innerHTML = ["All", "Mine"].map((s) => `
        <button class="chip" data-ideas-scope="${s}" data-active="${s === ideasScope}">${s === "All" ? "All ideas" : "My ideas"}</button>
    `).join("");
}

function renderMyIdeas() {
    let ideas = getAllIdeas();
    if (ideasScope === "Mine") {
        ideas = ideas.filter(isMyIdea);
    }
    // newest first
    ideas = ideas.slice().sort((a, b) => new Date(b.proposedDate) - new Date(a.proposedDate));

    const list = document.getElementById("myIdeasList");
    const empty = document.getElementById("myIdeasEmpty");
    if (!list) return;

    if (ideas.length === 0) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    list.innerHTML = ideas.map((idea) => {
        const mine = isMyIdea(idea);
        const who = mine ? "you" : idea.studentName;
        const feedback = idea.mentorFeedback
            ? `<p class="idea-text" style="margin-top:8px;"><strong>Mentor feedback:</strong> ${idea.mentorFeedback}</p>`
            : "";
        return `
            <div class="interest-row">
                <div class="interest-row-main">
                    <p class="interest-row-title">${idea.title}${mine ? ` <span class="mine-tag">Yours</span>` : ""}</p>
                    <p class="interest-row-meta">${idea.domain} · to ${idea.targetMentor} · floated ${idea.proposedDate}</p>
                    <div style="margin-top:6px;"><span class="origin-badge origin-student">Student-floated · ${who}</span></div>
                    ${feedback}
                </div>
                <span class="badge ${ideaStatusBadgeClass(idea.status)}">${idea.status}</span>
            </div>
        `;
    }).join("");
}


/* ======================================================
   RENDER: NOTIFICATIONS (student)
====================================================== */

function buildNotifications() {
    const notifications = [];

    // Updates on my interests (accepted / rejected).
    interests.filter((i) => i.status !== "Pending").forEach((i) => {
        const project = getAllProjects().find((p) => p.id === i.projectId);
        notifications.push({
            icon: i.status === "Accepted" ? "🎉" : "📩",
            date: (i.respondedAt || i.submittedAt || "").slice(0, 10),
            text: i.status === "Accepted"
                ? `You were <strong>accepted</strong> onto ${project ? project.title : "a project"}.`
                : `Your interest in ${project ? project.title : "a project"} wasn't accepted this time.`
        });
    });

    // Updates on my floated ideas.
    getAllIdeas().filter(isMyIdea).filter((i) => i.status !== "Pending").forEach((i) => {
        notifications.push({
            icon: "💡",
            date: i.reviewedDate || i.proposedDate,
            text: `Your idea "<strong>${i.title}</strong>" is now <strong>${i.status}</strong>.`
        });
    });

    // New projects floated across ILGC (last few).
    getAllProjects().filter((p) => p.floatedByName).slice(-4).forEach((p) => {
        notifications.push({
            icon: "✨",
            date: p.proposedDate || "2026-09-01",
            text: `New ${projectOriginLabel(p).split(" · ")[0].toLowerCase()} project: <strong>${p.title}</strong>.`
        });
    });

    return notifications
        .filter((n) => n.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderNotifications() {
    const notifications = buildNotifications();
    const list = document.getElementById("notificationsList");
    if (!list) return;
    list.innerHTML = notifications.length
        ? notifications.map((n) => `
            <div class="notification-item">
                <span class="notification-icon">${n.icon}</span>
                <span class="notification-text">${n.text}<span class="notification-date">${n.date}</span></span>
            </div>
        `).join("")
        : `<p class="empty-state">You're all caught up — no new notifications.</p>`;
}

function renderNotifBadge() {
    const count = buildNotifications().length;
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 9 ? "9+" : String(count);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

// Wire the two "Float an Idea" buttons.
["floatIdeaBtn", "floatIdeaBtn2"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", openFloatIdeaModal);
});

const ideasScopeChipsEl = document.getElementById("ideasScopeChips");
if (ideasScopeChipsEl) {
    ideasScopeChipsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-ideas-scope]");
        if (!btn) return;
        ideasScope = btn.dataset.ideasScope;
        renderIdeasScopeChips();
        renderMyIdeas();
    });
}


/* ======================================================
   RENDER ALL / INIT
====================================================== */

function renderAll() {
    renderHome();
    renderMyProjectsFull();
    renderDiscover();
    renderInterests();
    renderMyIdeas();
    renderNotifications();
    renderNotifBadge();
}

renderDiscoverChips();
renderIdeasScopeChips();
renderProfile();
async function initStudentDashboard() {
    await loadStudentProfile();

    studentProjects = await loadStudentProjects();

    renderAll();
}

initStudentDashboard();

/* ======================================================
   SIDEBAR TOGGLE
   Sections used to be a horizontally-scrolling row of tabs
   up top; they now live in a left sidebar that can be
   hidden/shown with the header toggle. State is remembered
   per browser so it stays out of the way once dismissed.
====================================================== */

const SIDEBAR_STATE_KEY = "ilgc_sidebar_collapsed";

if (localStorage.getItem(SIDEBAR_STATE_KEY) === "true") {
    document.body.classList.add("sidebar-collapsed");
}

const sidebarToggleBtn = document.getElementById("sidebarToggle");
if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
        localStorage.setItem(SIDEBAR_STATE_KEY, document.body.classList.contains("sidebar-collapsed"));
    });
}
