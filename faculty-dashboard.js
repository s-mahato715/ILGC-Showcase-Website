/* ======================================================
   AUTH GUARD
====================================================== */

/* ======================================================
   SUPABASE + AUTH
====================================================== */

const role = localStorage.getItem("selectedRole");
const loggedIn = localStorage.getItem("loggedIn");
const userId = localStorage.getItem("userId");

if (!loggedIn || role !== "faculty" || !userId) {
    window.location.href = "login.html";
}

let facultyProfile = null;
let facultyName = "";
let facultyEmail = userId;


/* ======================================================
   LOAD FACULTY PROFILE FROM SUPABASE
====================================================== */

async function loadFacultyProfile() {
    if (!window.supabaseClient) {
        console.error("Supabase client is not available.");
        return false;
    }

    console.log("Faculty email:", facultyEmail);

    const { data: user, error: userError } =
        await window.supabaseClient
            .from("users")
            .select("email, name, role")
            .eq("email", facultyEmail)
            .maybeSingle();

    if (userError) {
        console.error("Could not load faculty user:", userError);
        return false;
    }

    if (!user) {
        console.error("Faculty user not found:", facultyEmail);
        return false;
    }

    const { data: mentor, error: mentorError } =
        await window.supabaseClient
            .from("mentor_profiles")
            .select("*")
            .eq("email", facultyEmail)
            .maybeSingle();

    if (mentorError) {
        console.error(
            "Could not load mentor profile:",
            mentorError
        );
    }

    facultyProfile = {
        ...user,
        ...(mentor || {})
    };

    facultyName =
        facultyProfile.name ||
        user.name ||
        facultyEmail;

    console.log(
        "Faculty profile from Supabase:",
        facultyProfile
    );

    console.log(
        "Faculty name:",
        facultyName
    );

    return true;
}


/* ======================================================
   DATA HELPERS
====================================================== */

function myProjects() {
    return getAllProjects().filter((p) => p.mentor === facultyName);
}

function interestsForMyProjects() {
    const myIds = new Set(myProjects().map((p) => p.id));
    return getAllInterestsAcrossStudents().filter((i) => myIds.has(i.projectId));
}

function pendingCountFor(projectId) {
    return getAllInterestsAcrossStudents().filter(
        (i) => i.projectId === projectId && i.status === "Pending"
    ).length;
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

const FORM_DOMAINS = [
    "AI / Machine Learning",
    "Robotics & Embedded Systems",
    "Sustainability",
    "Healthcare Tech"
];

const FORM_STATUSES = ["Ongoing", "Proposed", "Completed"];
const IDEA_STATUSES = ["Pending", "Accepted", "Rejected", "Needs Revision"];
const REPORT_STATUSES = ["Submitted", "Under Review", "Changes Requested", "Resubmitted", "Approved"];
const REPORT_TIMELINE = ["Submitted", "Under Review", "Changes Requested", "Resubmitted", "Approved"];

function ideaBadgeClass(status) {
    if (status === "Pending") return "badge-pending";
    if (status === "Accepted") return "badge-accepted";
    if (status === "Rejected") return "badge-rejected";
    if (status === "Needs Revision") return "badge-proposed";
    return "";
}

function reportBadgeClass(status) {
    const map = {
        "Submitted": "badge-submitted",
        "Under Review": "badge-underreview",
        "Changes Requested": "badge-changesrequested",
        "Resubmitted": "badge-resubmitted",
        "Approved": "badge-approved"
    };
    return map[status] || "";
}

function myIdeas() {
    return getAllIdeas().filter((i) => i.targetMentor === facultyName);
}

function myReports() {
    const myIds = new Set(myProjects().map((p) => p.id));
    return getAllReports().filter((r) => myIds.has(r.projectId));
}

/* Read-only view of a project's student-created SharePoint workspace,
   used inside the faculty/mentor project detail modal. */
function sharePointViewHtml(projectId) {
    const sp = getSharePoint(projectId);

    if (!sp) {
        return `<p class="modal-text">The team hasn't created a SharePoint workspace for this project yet.</p>`;
    }

    if (!sp.files.length) {
        return `<p class="modal-text">SharePoint created, but no reports have been posted yet.</p>`;
    }

    return `<div class="sp-view-list">${sp.files.map((f) => {
        const date = new Date(f.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const linkHtml = f.link
            ? `<a class="sp-view-link" href="${f.link}" target="_blank" rel="noopener">Open report ↗</a>`
            : `<span class="sp-view-nolink">No file link</span>`;
        return `
            <div class="sp-view-item">
                <div>
                    <p class="sp-view-title">${f.title}</p>
                    ${f.note ? `<p class="sp-view-note">${f.note}</p>` : ""}
                    <p class="sp-view-meta">Added by ${f.addedBy} · ${date}</p>
                </div>
                ${linkHtml}
            </div>
        `;
    }).join("")}</div>`;
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
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
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

tabButtons.forEach((btn) => btn.addEventListener("click", () => goToTab(btn.dataset.tab)));
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
   PROJECT CARD (shared markup for Home + My Projects)
====================================================== */

function projectCardHtml(project) {
    const teamCount = (project.team || []).length;
    const pending = pendingCountFor(project.id);

    return `
        <article class="project-card">
            <div class="project-card-top">
                <span class="project-domain">${project.domain}</span>
                <span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>
            </div>
            <div class="project-card-body">
                <h3 class="project-title" data-open="${project.id}">${project.title}</h3>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${project.progress}%"></div>
                </div>
                <p class="progress-label" style="margin-bottom:14px;">${project.progress}% complete</p>
                <div class="project-card-stats">
                    <span class="project-card-stat"><strong>${teamCount}</strong> team member${teamCount !== 1 ? "s" : ""}</span>
                    <span class="project-card-stat"><strong>${pending}</strong> interested</span>
                </div>
                <div class="project-card-actions">
                    <button class="btn btn-secondary" data-edit="${project.id}">Edit</button>
                    <button class="btn btn-primary" data-open="${project.id}">Details</button>
                    <button class="btn btn-danger btn-icon" data-delete="${project.id}" title="Delete project" aria-label="Delete project">🗑</button>
                </div>
            </div>
        </article>
    `;
}


/* ======================================================
   RENDER: HOME
====================================================== */

function renderHome() {
    document.getElementById("greetingText").textContent = `Good morning, ${facultyName} 👋`;
    document.getElementById("greetingSub").textContent = `Here's what's happening with your projects.`;

    const projects = myProjects();
    const ongoing = projects.filter((p) => p.status === "Ongoing").length;

    const pendingIdeas = myIdeas().filter((i) => i.status === "Pending" || i.status === "Needs Revision");
    const reportsAwaiting = myReports().filter((r) => r.status === "Submitted" || r.status === "Under Review" || r.status === "Resubmitted");
    const unmanaged = getUnmanagedStudents();
    const proposedToMe = myIdeas();

    document.getElementById("statRow").innerHTML = `
        <div class="stat-card">
            <p class="stat-value">${ongoing}</p>
            <p class="stat-label">Active Projects</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${pendingIdeas.length}</p>
            <p class="stat-label">Pending Student Ideas</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${reportsAwaiting.length}</p>
            <p class="stat-label">Reports Awaiting Review</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${unmanaged.length}</p>
            <p class="stat-label">Unmanaged Students</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${proposedToMe.length}</p>
            <p class="stat-label">Projects Proposed to Me</p>
        </div>
    `;

    const pendingInterests = interestsForMyProjects().filter((i) => i.status === "Pending");

    const pendingActions = [
        { count: pendingIdeas.length, label: "student idea" + (pendingIdeas.length === 1 ? "" : "s") + " awaiting review", tab: "ideas" },
        { count: reportsAwaiting.length, label: "report" + (reportsAwaiting.length === 1 ? "" : "s") + " requiring review", tab: "reports" },
        { count: unmanaged.length, label: "student" + (unmanaged.length === 1 ? "" : "s") + " without a project/group", tab: "unmanaged" },
        { count: pendingInterests.length, label: "student" + (pendingInterests.length === 1 ? "" : "s") + " awaiting a response", tab: "students" }
    ];

    const activeActions = pendingActions.filter((a) => a.count > 0);

    document.getElementById("pendingActionsList").innerHTML = activeActions.length
        ? activeActions.map((a) => `
            <div class="pending-action-item" data-goto="${a.tab}" style="cursor:pointer;">
                <span class="pending-action-count">${a.count}</span>
                <span>${a.label}</span>
            </div>
        `).join("")
        : `<p class="empty-panel">You're all caught up — nothing needs your attention right now.</p>`;

    const activity = buildActivityFeed(6);
    document.getElementById("activityFeed").innerHTML = activity.length
        ? activity.map((e) => `
            <div class="activity-item">
                <span class="activity-dot"></span>
                <span>${e.text}<span class="activity-date">${e.date}</span></span>
            </div>
        `).join("")
        : `<p class="empty-panel">No recent activity yet.</p>`;

    document.getElementById("homeProjectGrid").innerHTML =
        projects.map(projectCardHtml).join("") ||
        `<p class="empty-state">You don't have any projects yet. Float one from My Projects.</p>`;
}


/* ======================================================
   RENDER: MY PROJECTS
====================================================== */

let projectsActiveStatus = "All";
let projectsActiveYear = "All";

function renderProjectsChips() {
    const statuses = ["All", ...FORM_STATUSES];
    document.getElementById("projectsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-project-status="${status}" data-active="${status === projectsActiveStatus}">${status}</button>
    `).join("");
}

function renderProjectsYearFilter() {
    const years = ["All", ...YEAR_FILTER_OPTIONS];
    const select = document.getElementById("projectsYearSelect");
    if (!select) return;
    select.innerHTML = years.map((y) =>
        `<option value="${y}" ${y === projectsActiveYear ? "selected" : ""}>${y === "All" ? "All Years" : y}</option>`
    ).join("");
}

function renderMyProjects() {
    const projects = myProjects().filter(
        (p) => (projectsActiveStatus === "All" || p.status === projectsActiveStatus) &&
               projectHasYear(p, projectsActiveYear)
    );

    const grid = document.getElementById("myProjectsGrid");
    const empty = document.getElementById("myProjectsEmpty");

    if (projects.length === 0) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    grid.innerHTML = projects.map(projectCardHtml).join("");
}


/* ======================================================
   RENDER: STUDENT IDEAS
====================================================== */

let ideasActiveStatus = "All";

function renderIdeasChips() {
    const statuses = ["All", ...IDEA_STATUSES];
    document.getElementById("ideasStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-idea-status="${status}" data-active="${status === ideasActiveStatus}">${status}</button>
    `).join("");
}

function ideaCardHtml(idea) {
    const actions = (idea.status === "Pending" || idea.status === "Needs Revision")
        ? `
            <button class="btn btn-primary" data-idea-accept="${idea.id}">Accept</button>
            <button class="btn btn-danger" data-idea-reject="${idea.id}">Reject</button>
            <button class="btn btn-secondary" data-idea-revise="${idea.id}">Suggest Revision</button>
        `
        : "";

    const feedbackHtml = idea.feedback
        ? `<div class="idea-feedback-box"><strong>Your feedback</strong>${idea.feedback}</div>`
        : "";

    return `
        <article class="idea-card">
            <div class="idea-card-top">
                <div>
                    <p class="idea-title">${idea.title}</p>
                    <p class="idea-meta"><strong>${idea.studentName}</strong> · Sem ${idea.studentSemester} · ${idea.domain} · Proposed ${idea.proposedDate}</p>
                    <div style="margin-top:8px;"><span class="origin-badge origin-student">Student-floated · ${idea.studentName}</span></div>
                </div>
                <span class="badge ${ideaBadgeClass(idea.status)}">${idea.status}</span>
            </div>

            <p class="idea-section-label">Problem statement</p>
            <p class="idea-text">${idea.problemStatement}</p>

            <p class="idea-section-label">Scope</p>
            <p class="idea-text">${idea.scope}</p>

            <div class="idea-tag-row">${(idea.tags || []).map((t) => `<span class="idea-tag">${t}</span>`).join("")}</div>

            ${feedbackHtml}

            <div class="idea-card-actions">${actions}</div>
        </article>
    `;
}

function renderIdeas() {
    const ideas = myIdeas()
        .filter((i) => ideasActiveStatus === "All" || i.status === ideasActiveStatus)
        .sort((a, b) => new Date(b.proposedDate) - new Date(a.proposedDate));

    const list = document.getElementById("ideasList");
    const empty = document.getElementById("ideasEmpty");

    if (ideas.length === 0) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    list.innerHTML = ideas.map(ideaCardHtml).join("");
}

function openIdeaDecisionModal(ideaId, decision) {
    const idea = getAllIdeas().find((i) => i.id === ideaId);
    if (!idea) return;

    const titleMap = { Accepted: "Accept idea", Rejected: "Reject idea", "Needs Revision": "Request a revision" };
    const btnMap = { Accepted: "Accept idea", Rejected: "Reject idea", "Needs Revision": "Send feedback" };

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${titleMap[decision]}</p>
        <h2 class="modal-title">${idea.title}</h2>
        <p class="modal-text" style="margin-bottom:16px;">Proposed by ${idea.studentName} · Sem ${idea.studentSemester}</p>

        <form id="ideaDecisionForm">
            <div class="modal-field">
                <label for="ideaComment">${decision === "Needs Revision" ? "Specific revision suggestions" : "Comments (optional)"}</label>
                <textarea id="ideaComment" ${decision === "Needs Revision" ? "required" : ""} placeholder="${decision === "Needs Revision" ? "Let the student know what to change before resubmitting…" : "Add an optional note for the student…"}"></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">${btnMap[decision]}</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("ideaDecisionForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const comment = document.getElementById("ideaComment").value.trim();
        updateIdea(ideaId, { status: decision, feedback: comment || idea.feedback || "" });

        const toastMap = {
            Accepted: `"${idea.title}" accepted ✓`,
            Rejected: `"${idea.title}" rejected.`,
            "Needs Revision": `Feedback sent to ${idea.studentName} ✓`
        };
        showToast(toastMap[decision]);
        closeModal();
        renderIdeas();
        renderHome();
    });
}


/* ======================================================
   RENDER: INTERESTED STUDENTS
====================================================== */

function renderStudents() {
    const rows = interestsForMyProjects().sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    const container = document.getElementById("studentsTable");
    const empty = document.getElementById("studentsEmpty");

    if (rows.length === 0) {
        container.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const allProjects = getAllProjects();

    const bodyRows = rows.map((interest) => {
        const project = allProjects.find((p) => p.id === interest.projectId);
        const student = deriveStudentProfile(interest.studentUserId);

        const otherInterests = loadInterestsFor(interest.studentUserId);
        const acceptedElsewhere = otherInterests.find((i) => i.status === "Accepted");
        const currentProject = acceptedElsewhere
            ? (allProjects.find((p) => p.id === acceptedElsewhere.projectId) || {}).title
            : "None";

        const actions = interest.status === "Pending"
            ? `
                <button class="btn btn-primary" data-accept="${interest.studentUserId}|${interest.projectId}">Accept</button>
                <button class="btn btn-danger" data-reject="${interest.studentUserId}|${interest.projectId}">Reject</button>
            `
            : `<span class="badge ${interestBadgeClass(interest.status)}">${interest.status}</span>`;

        return `
            <div class="student-row">
                <span class="student-name">${student.name}</span>
                <span class="student-cell">Sem ${student.semester} · ${cohortCodeFromSemester(student.semester)}</span>
                <span class="student-cell">${currentProject || "None"}</span>
                <span class="student-project-of-interest">${project ? project.title : "—"}</span>
                <span class="student-cell">${interest.status}</span>
                <div class="student-actions">${actions}</div>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="student-row head">
            <span>Student</span>
            <span>Semester</span>
            <span>Current Project</span>
            <span>Interested In</span>
            <span>Status</span>
            <span>Action</span>
        </div>
        ${bodyRows}
    `;
}

function acceptInterest(studentUserId, projectId) {
    updateInterestStatus(studentUserId, projectId, "Accepted");

    const student = deriveStudentProfile(studentUserId);
    const project = getAllProjects().find((p) => p.id === projectId);
    if (project) {
        const team = [...(project.team || [])];
        if (!team.some((m) => m.name === student.name)) {
            team.push({ name: student.name, semester: student.semester });
        }
        editProject(projectId, { team });
    }

    showToast(`${student.name} accepted onto the team ✓`);
    renderAll();
}

function rejectInterest(studentUserId, projectId) {
    updateInterestStatus(studentUserId, projectId, "Rejected");
    const student = deriveStudentProfile(studentUserId);
    showToast(`${student.name}'s interest was declined.`);
    renderAll();
}


/* ======================================================
   RENDER: PROJECT REPORTS
====================================================== */

let reportsActiveStatus = "All";

function renderReportsChips() {
    const statuses = ["All", ...REPORT_STATUSES];
    document.getElementById("reportsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-report-status="${status}" data-active="${status === reportsActiveStatus}">${status}</button>
    `).join("");
}

function renderReports() {
    const reports = myReports()
        .filter((r) => reportsActiveStatus === "All" || r.status === reportsActiveStatus)
        .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

    const container = document.getElementById("reportsTable");
    const empty = document.getElementById("reportsEmpty");

    if (reports.length === 0) {
        container.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const allProjects = getAllProjects();

    const rows = reports.map((report) => {
        const project = allProjects.find((p) => p.id === report.projectId);
        return `
            <div class="report-row" data-report-open="${report.id}">
                <span class="report-project">${project ? project.title : "—"}</span>
                <span class="report-cell">${report.reportType}</span>
                <span class="report-cell">${report.submittedBy}</span>
                <span class="report-cell">${report.submittedDate}</span>
                <span><span class="badge ${reportBadgeClass(report.status)}">${report.status}</span></span>
                <button class="btn btn-secondary" data-report-open="${report.id}">View</button>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="report-row head">
            <span>Project</span>
            <span>Report Type</span>
            <span>Submitted By</span>
            <span>Date</span>
            <span>Status</span>
            <span></span>
        </div>
        ${rows}
    `;
}

function openReportDetailModal(reportId) {
    const report = getAllReports().find((r) => r.id === reportId);
    if (!report) return;

    const project = getAllProjects().find((p) => p.id === report.projectId) || {};
    const team = project.team || [];

    const timelineHtml = REPORT_TIMELINE.map((step) => {
        const reached = report.history.some((h) => h.status === step) ||
            (step === "Resubmitted" && report.status === "Approved" && report.history.some((h) => h.status === "Resubmitted"));
        return `<span class="report-timeline-step ${reached ? "done" : ""}">${step}</span>`;
    }).join("");

    const teamHtml = team.length
        ? `<div class="modal-team">${team.map((m) => `<span class="team-chip">${m.name} · Sem ${m.semester} · ${cohortCodeFromSemester(m.semester)}</span>`).join("")}</div>`
        : `<p class="modal-text">No students on this project yet.</p>`;

    const commentsHtml = report.comments.length
        ? report.comments.map((c) => `
            <div class="report-comment">
                <span class="report-comment-author">${c.author}<span class="report-comment-date">${c.date}</span></span>
                <p class="report-comment-text">${c.text}</p>
            </div>
        `).join("")
        : `<p class="modal-text">No comments yet.</p>`;

    const actionsHtml = (report.status === "Submitted" || report.status === "Under Review" || report.status === "Resubmitted")
        ? `
            <button class="btn btn-primary" data-report-approve="${report.id}">Approve</button>
            <button class="btn btn-secondary" data-report-request-changes="${report.id}">Request Changes</button>
        `
        : "";

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${project.domain || ""} · ${report.reportType}</p>
        <h2 class="modal-title">${project.title || "Untitled project"}</h2>

        <div class="report-timeline">${timelineHtml}</div>

        <p class="modal-section-label">Report info</p>
        <div class="modal-meta-row">
            <div class="modal-meta-item">
                <span class="meta-label">Submitted by</span>
                <span class="meta-value">${report.submittedBy}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Date</span>
                <span class="meta-value">${report.submittedDate}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Mentor</span>
                <span class="meta-value">${project.mentor || "—"}</span>
            </div>
        </div>

        <p class="modal-section-label">Report preview</p>
        <p class="modal-text">${report.preview}</p>

        <p class="modal-section-label">Group members</p>
        ${teamHtml}

        <p class="modal-section-label">Comments &amp; feedback</p>
        <div id="reportCommentsList">${commentsHtml}</div>

        <div class="modal-field" style="margin-top:12px;">
            <label for="newReportComment">Add a comment</label>
            <textarea id="newReportComment" placeholder="Leave feedback for the group…"></textarea>
        </div>
        <button class="btn btn-secondary" id="addReportCommentBtn" style="margin-bottom:8px;">Add Comment</button>

        <div class="modal-actions">${actionsHtml}</div>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("addReportCommentBtn").addEventListener("click", () => {
        const text = document.getElementById("newReportComment").value.trim();
        if (!text) return;
        addReportComment(reportId, text, facultyName);
        showToast("Comment added ✓");
        openReportDetailModal(reportId);
        renderReports();
    });
}

function approveReport(reportId) {
    updateReportStatus(reportId, "Approved", facultyName);
    showToast("Report approved ✓");
    closeModal();
    renderReports();
    renderHome();
}

function requestReportChanges(reportId) {
    modalBody.innerHTML = `
        <p class="modal-eyebrow">Request changes</p>
        <h2 class="modal-title">What needs to change?</h2>
        <form id="requestChangesForm">
            <div class="modal-field">
                <label for="changesNote">Feedback for the group</label>
                <textarea id="changesNote" required placeholder="Explain what needs revising before resubmission…"></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Send &amp; Request Changes</button>
            </div>
        </form>
    `;
    modalOverlay.classList.remove("hidden");

    document.getElementById("requestChangesForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const note = document.getElementById("changesNote").value.trim();
        updateReportStatus(reportId, "Changes Requested", facultyName, note);
        showToast("Changes requested ✓");
        closeModal();
        renderReports();
        renderHome();
    });
}


/* ======================================================
   RENDER: UNMANAGED STUDENTS
====================================================== */

let unmanagedDomainFilter = "All";
let unmanagedYearFilter = "All";

function renderUnmanagedFilters() {
    const domains = ["All", ...new Set(UNMANAGED_STUDENTS.flatMap((s) => s.preferredDomains))];
    // Year filter mirrors the project year filter: only 2nd and 3rd year.
    const years = ["All", ...YEAR_FILTER_OPTIONS];

    document.getElementById("unmanagedFilters").innerHTML = `
        <select id="unmanagedDomainSelect">
            ${domains.map((d) => `<option value="${d}" ${d === unmanagedDomainFilter ? "selected" : ""}>${d === "All" ? "All Domains" : d}</option>`).join("")}
        </select>
        <select id="unmanagedYearSelect">
            ${years.map((y) => `<option value="${y}" ${y === unmanagedYearFilter ? "selected" : ""}>${y === "All" ? "All Years" : y}</option>`).join("")}
        </select>
    `;

    document.getElementById("unmanagedDomainSelect").addEventListener("change", (e) => {
        unmanagedDomainFilter = e.target.value;
        renderUnmanaged();
    });
    document.getElementById("unmanagedYearSelect").addEventListener("change", (e) => {
        unmanagedYearFilter = e.target.value;
        renderUnmanaged();
    });
}

function unmanagedCardHtml(student) {
    return `
        <article class="unmanaged-card">
            <div class="unmanaged-card-head">
                <div>
                    <p class="unmanaged-name">${student.name}</p>
                    <p class="unmanaged-dept">${student.department} · ${student.year}</p>
                </div>
            </div>

            <p class="unmanaged-field-label">Skills</p>
            <div class="unmanaged-chip-row">${student.skills.map((s) => `<span class="unmanaged-chip">${s}</span>`).join("")}</div>

            <p class="unmanaged-field-label">Preferred domains</p>
            <div class="unmanaged-chip-row">${student.preferredDomains.map((d) => `<span class="unmanaged-chip">${d}</span>`).join("")}</div>

            <p class="unmanaged-field-label">Availability</p>
            <p class="idea-text">${student.availability}</p>

            <div class="unmanaged-card-actions">
                <button class="btn btn-secondary" data-unmanaged-profile="${student.id}">View Profile</button>
                <button class="btn btn-secondary" data-unmanaged-email="${student.id}">✉ Email Student</button>
                <button class="btn btn-primary" data-unmanaged-assign="${student.id}">Assign to Group</button>
            </div>
        </article>
    `;
}

function renderUnmanaged() {
    const students = getUnmanagedStudents().filter((s) =>
        (unmanagedDomainFilter === "All" || s.preferredDomains.includes(unmanagedDomainFilter)) &&
        (unmanagedYearFilter === "All" || yearFromSemester(s.semester) === unmanagedYearFilter)
    );

    const grid = document.getElementById("unmanagedGrid");
    const empty = document.getElementById("unmanagedEmpty");

    if (students.length === 0) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    grid.innerHTML = students.map(unmanagedCardHtml).join("");
}

function openUnmanagedProfileModal(studentId) {
    const student = UNMANAGED_STUDENTS.find((s) => s.id === studentId);
    if (!student) return;

    const prevHtml = student.previousProjects.length
        ? `<div class="modal-team">${student.previousProjects.map((p) => `<span class="team-chip">${p}</span>`).join("")}</div>`
        : `<p class="modal-text">No previous project experience on record.</p>`;

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${student.department} · ${student.year}</p>
        <h2 class="modal-title">${student.name}</h2>

        <div class="modal-meta-row">
            <div class="modal-meta-item">
                <span class="meta-label">Semester</span>
                <span class="meta-value">${student.semester} · ${student.year}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Availability</span>
                <span class="meta-value">${student.availability}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Email</span>
                <span class="meta-value">${studentEmail(student.name)}</span>
            </div>
        </div>

        <p class="modal-section-label">Skills</p>
        <div class="modal-team">${student.skills.map((s) => `<span class="team-chip">${s}</span>`).join("")}</div>

        <p class="modal-section-label">Areas of interest</p>
        <div class="modal-team">${student.interests.map((s) => `<span class="team-chip">${s}</span>`).join("")}</div>

        <p class="modal-section-label">Preferred domains</p>
        <div class="modal-team">${student.preferredDomains.map((s) => `<span class="team-chip">${s}</span>`).join("")}</div>

        <p class="modal-section-label">Previous projects</p>
        ${prevHtml}

        <div class="modal-actions">
            <button class="btn btn-secondary" data-unmanaged-email="${student.id}">✉ Email Student</button>
            <button class="btn btn-primary" data-unmanaged-assign="${student.id}">Assign to Group</button>
        </div>
    `;

    modalOverlay.classList.remove("hidden");
}

function openAssignModal(studentId) {
    const student = UNMANAGED_STUDENTS.find((s) => s.id === studentId);
    if (!student) return;

    const options = myProjects().map((p) => `<option value="${p.id}">${p.title}</option>`).join("");

    modalBody.innerHTML = `
        <p class="modal-eyebrow">Assign to group</p>
        <h2 class="modal-title">${student.name}</h2>
        ${options
            ? `
                <form id="assignForm">
                    <div class="modal-field">
                        <label for="assignProjectSelect">Choose one of your projects</label>
                        <select id="assignProjectSelect">${options}</select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Assign Student</button>
                    </div>
                </form>
            `
            : `<p class="modal-text">You don't have any projects to assign students to yet. Float a project first.</p>`
        }
    `;

    modalOverlay.classList.remove("hidden");

    const form = document.getElementById("assignForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const projectId = document.getElementById("assignProjectSelect").value;
            assignStudentToProject(studentId, projectId);
            showToast(`${student.name} assigned ✓`);
            closeModal();
            renderUnmanaged();
            renderDiscover();
            renderHome();
        });
    }
}

function emailStudent(studentId) {
    const student = UNMANAGED_STUDENTS.find((s) => s.id === studentId);
    if (!student) return;

    const to = studentEmail(student.name);
    const subject = `ILGC — opportunity to join a project`;
    const body =
        `Hi ${student.name.split(" ")[0]},\n\n` +
        `I came across your profile on the ILGC portal and I'd like to talk to you about ` +
        `joining one of my projects. Could we find a time to connect this week?\n\n` +
        `Best regards,\n${facultyName}`;

    // Open Outlook on the web compose window, pre-addressed to the student.
    const outlookUrl =
        `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}` +
        `&subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;

    const win = window.open(outlookUrl, "_blank", "noopener");

    // Fallback to the default mail client (Outlook desktop, etc.) if the
    // popup was blocked.
    if (!win) {
        window.location.href =
            `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    showToast(`Opening email to ${student.name} ✉`);
}


/* ======================================================
   RENDER: PROJECT TAGS
====================================================== */

function tagUsageCount(tag) {
    return myProjects().filter((p) => (p.tags || []).includes(tag)).length;
}

function renderTags() {
    const tags = loadTags();

    document.getElementById("tagManageList").innerHTML = tags.length
        ? tags.map((tag) => `
            <div class="tag-manage-row" data-tag-row="${tag}">
                <span>
                    <span class="tag-manage-name">${tag}</span>
                    <span class="tag-manage-count">${tagUsageCount(tag)} of your projects</span>
                </span>
                <div class="tag-manage-actions">
                    <button class="btn btn-secondary" data-tag-edit="${tag}">Edit</button>
                    <button class="btn btn-danger" data-tag-remove="${tag}">Remove</button>
                </div>
            </div>
        `).join("")
        : `<p class="empty-state">No tags yet. Add one above.</p>`;
}

function startEditTag(tag) {
    const row = document.querySelector(`[data-tag-row="${CSS.escape(tag)}"]`);
    if (!row) return;

    row.innerHTML = `
        <input type="text" class="tag-edit-input" value="${tag}" id="tagEditInput">
        <div class="tag-manage-actions">
            <button class="btn btn-primary" id="tagEditSave">Save</button>
            <button class="btn btn-secondary" id="tagEditCancel">Cancel</button>
        </div>
    `;

    document.getElementById("tagEditSave").addEventListener("click", () => {
        const newName = document.getElementById("tagEditInput").value.trim();
        if (newName && newName !== tag) {
            editTagName(tag, newName);
            showToast("Tag updated ✓");
        }
        renderTags();
        renderMyProjects();
        renderIdeas();
    });

    document.getElementById("tagEditCancel").addEventListener("click", renderTags);
}


/* ======================================================
   RENDER: DISCOVER PROJECTS (institute-wide, read-only)
   Shows every project across ILGC — floated by students,
   faculty, or mentors — so faculty can see the full picture,
   not just their own. Reads getAllProjects(), so anything
   floated in any portal shows up here.
====================================================== */

const DISCOVER_STATUSES = ["All", "Ongoing", "Proposed", "Completed"];
let discoverStatus = "All";
let discoverDomain = "All";
let discoverMentor = "All";
let discoverSearch = "";

function discoverDomains() {
    return ["All", ...new Set(getAllProjects().map((p) => p.domain))];
}

function discoverMentors() {
    return ["All", ...[...new Set(getAllProjects().map((p) => p.mentor).filter(Boolean))].sort()];
}

function renderDiscoverChips() {
    document.getElementById("discoverStatusChips").innerHTML = DISCOVER_STATUSES.map((s) => `
        <button class="chip" data-discover-status="${s}" data-active="${s === discoverStatus}">${s}</button>
    `).join("");

    document.getElementById("discoverDomainChips").innerHTML = discoverDomains().map((d) => `
        <button class="chip" data-discover-domain="${d}" data-active="${d === discoverDomain}">${d}</button>
    `).join("");

    const mentorSelect = document.getElementById("discoverMentorSelect");
    if (mentorSelect) {
        mentorSelect.innerHTML = discoverMentors().map((m) =>
            `<option value="${m}" ${m === discoverMentor ? "selected" : ""}>${m === "All" ? "All professors" : m}</option>`
        ).join("");
    }
}

function discoverCardHtml(project) {
    const teamCount = (project.team || []).length;
    return `
        <article class="project-card">
            <div class="project-card-top">
                <span class="project-domain">${project.domain}</span>
                <span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>
            </div>
            <div class="project-card-body">
                <h3 class="project-title" data-open="${project.id}">${project.title}</h3>
                <div style="margin-bottom:10px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>
                <p class="project-description">${project.summary}</p>
                <p class="project-mentor-row">${project.mentor}</p>
                <div class="project-card-stats" style="margin-bottom:12px;">
                    <span class="project-card-stat"><strong>${teamCount}</strong> student${teamCount !== 1 ? "s" : ""}</span>
                    <span class="project-card-stat"><strong>${project.progress}%</strong> complete</span>
                </div>
                <div class="project-card-actions">
                    <button class="btn btn-primary" data-open="${project.id}">Details</button>
                </div>
            </div>
        </article>
    `;
}

function renderDiscover() {
    const term = discoverSearch.toLowerCase();
    const filtered = getAllProjects().filter((p) => {
        const statusMatch = discoverStatus === "All" || p.status === discoverStatus;
        const domainMatch = discoverDomain === "All" || p.domain === discoverDomain;
        const mentorMatch = discoverMentor === "All" || p.mentor === discoverMentor;
        const searchMatch = !term ||
            p.title.toLowerCase().includes(term) ||
            (p.summary || "").toLowerCase().includes(term) ||
            (p.domain || "").toLowerCase().includes(term) ||
            (p.mentor || "").toLowerCase().includes(term);
        return statusMatch && domainMatch && mentorMatch && searchMatch;
    });

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
    grid.innerHTML = filtered.map(discoverCardHtml).join("");
}


/* ======================================================
   RENDER: NOTIFICATIONS (faculty)
====================================================== */

function buildNotifications() {
    const notifications = [];
    const myIds = new Set(myProjects().map((p) => p.id));

    interestsForMyProjects().filter((i) => i.status === "Pending").forEach((i) => {
        const student = deriveStudentProfile(i.studentUserId);
        const project = getAllProjects().find((p) => p.id === i.projectId);
        notifications.push({
            icon: "👤",
            date: (i.submittedAt || "").slice(0, 10),
            text: `<strong>${student.name}</strong> expressed interest in ${project ? project.title : "a project"}.`
        });
    });

    myIdeas().filter((i) => i.status === "Pending" || i.status === "Needs Revision").forEach((i) => {
        notifications.push({
            icon: "💡",
            date: i.proposedDate,
            text: `<strong>${i.studentName}</strong> floated a new idea — "${i.title}".`
        });
    });

    myReports().filter((r) => r.status === "Submitted" || r.status === "Under Review" || r.status === "Resubmitted").forEach((r) => {
        const project = getAllProjects().find((p) => p.id === r.projectId);
        notifications.push({
            icon: "📄",
            date: r.submittedDate,
            text: `${r.submittedBy} submitted a ${r.reportType.toLowerCase()} for <strong>${project ? project.title : "a project"}</strong> — review required.`
        });
    });

    return notifications
        .filter((n) => n.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderNotifications() {
    const notifications = buildNotifications();
    document.getElementById("notificationsList").innerHTML = notifications.length
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


/* ======================================================
   RENDER: PROFILE
====================================================== */

function renderProfile() {
    document.getElementById("profileAvatar").textContent = facultyName.replace("Dr. ", "").charAt(0);
    document.getElementById("profileName").textContent = facultyName;
    document.getElementById("profileMeta").textContent = "ILGC Faculty";
    document.getElementById("profileUserId").textContent = userId;
}


/* ======================================================
   DETAIL MODAL (read-only view)
====================================================== */

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");

function openDetailModal(projectId) {
    const project = getAllProjects().find((p) => p.id === projectId);
    if (!project) return;

    const teamHtml = (project.team || []).length
        ? `<div class="modal-team">${project.team.map((m) => `<span class="team-chip">${m.name} · Sem ${m.semester} · ${yearFromSemester(m.semester)}</span>`).join("")}</div>`
        : `<p class="modal-text">No students on this project yet.</p>`;

    const isMine = project.mentor === facultyName;
    const editHtml = isMine
        ? `<button class="btn btn-primary" data-edit="${project.id}">Edit this project</button>`
        : "";

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${project.domain} · ${project.status}</p>
        <h2 class="modal-title">${project.title}</h2>
        <div style="margin-bottom:16px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>

        <div class="modal-meta-row">
            <div class="modal-meta-item">
                <span class="meta-label">Faculty mentor</span>
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

        <p class="modal-section-label">SharePoint — shared reports</p>
        ${sharePointViewHtml(project.id)}

        <div class="modal-actions">
            ${editHtml}
        </div>
    `;

    modalOverlay.classList.remove("hidden");
}

function closeModal() {
    modalOverlay.classList.add("hidden");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });


/* ======================================================
   FORM MODAL (float new / edit)
====================================================== */

function slugify(title) {
    const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${base || "project"}-${Date.now().toString(36).slice(-4)}`;
}

function openFormModal(projectId) {
    const editing = Boolean(projectId);
    const project = editing ? getAllProjects().find((p) => p.id === projectId) : null;

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${editing ? "Edit project" : "Float new project"}</p>
        <h2 class="modal-title">${editing ? project.title : "New Project"}</h2>

        <form id="projectForm">
            <div class="modal-field">
                <label for="fTitle">Project name</label>
                <input type="text" id="fTitle" required value="${editing ? project.title : ""}">
            </div>

            <div class="modal-field">
                <label for="fDomain">Domain</label>
                <select id="fDomain">
                    ${FORM_DOMAINS.map((d) => `<option value="${d}" ${editing && project.domain === d ? "selected" : ""}>${d}</option>`).join("")}
                </select>
            </div>

            <div class="modal-field">
                <label for="fStatus">Status</label>
                <select id="fStatus">
                    ${FORM_STATUSES.map((s) => `<option value="${s}" ${editing && project.status === s ? "selected" : ""}>${s}</option>`).join("")}
                </select>
            </div>

            <div class="modal-field">
                <label for="fSummary">Summary</label>
                <textarea id="fSummary" required>${editing ? project.summary : ""}</textarea>
            </div>

            <div class="modal-field">
                <label for="fOutcome">Expected outcome</label>
                <textarea id="fOutcome" required>${editing ? project.expectedOutcome : ""}</textarea>
            </div>

            <div class="modal-field">
                <label>Tags</label>
                <div class="tag-picker" id="fTagPicker">
                    ${loadTags().map((t) => `<span class="tag-picker-option" data-tag-toggle="${t}" data-active="${editing && (project.tags || []).includes(t)}">${t}</span>`).join("")}
                </div>
            </div>

            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">${editing ? "Save changes" : "Float project"}</button>
                ${editing ? `<button type="button" class="btn btn-danger" data-delete="${projectId}">Delete project</button>` : ""}
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("fTagPicker").addEventListener("click", (e) => {
        const opt = e.target.closest("[data-tag-toggle]");
        if (!opt) return;
        opt.dataset.active = String(opt.dataset.active !== "true");
    });

    document.getElementById("projectForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const selectedTags = Array.from(document.querySelectorAll("#fTagPicker [data-active='true']")).map((el) => el.dataset.tagToggle);

        const fields = {
            title: document.getElementById("fTitle").value.trim(),
            domain: document.getElementById("fDomain").value,
            status: document.getElementById("fStatus").value,
            summary: document.getElementById("fSummary").value.trim(),
            expectedOutcome: document.getElementById("fOutcome").value.trim(),
            tags: selectedTags
        };

        if (editing) {
            editProject(projectId, fields);
            showToast("Project updated ✓");
        } else {
            addProject({
                id: slugify(fields.title),
                mentor: facultyName,
                cohort: "Batch of 2029",
                image: "images/placeholder.jpg",
                progress: fields.status === "Completed" ? 100 : fields.status === "Ongoing" ? 15 : 0,
                team: [],
                origin: "faculty",
                floatedByName: facultyName,
                ...fields
            });
            showToast("Project floated ✓");
        }

        closeModal();
        renderAll();
    });
}


/* ======================================================
   EVENT DELEGATION
====================================================== */

document.getElementById("floatProjectBtn").addEventListener("click", () => openFormModal(null));

document.getElementById("projectsStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-project-status]");
    if (!btn) return;
    projectsActiveStatus = btn.dataset.projectStatus;
    renderProjectsChips();
    renderMyProjects();
});

document.getElementById("projectsYearSelect").addEventListener("change", (e) => {
    projectsActiveYear = e.target.value;
    renderMyProjects();
});

document.getElementById("discoverStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-discover-status]");
    if (!btn) return;
    discoverStatus = btn.dataset.discoverStatus;
    renderDiscoverChips();
    renderDiscover();
});

document.getElementById("discoverDomainChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-discover-domain]");
    if (!btn) return;
    discoverDomain = btn.dataset.discoverDomain;
    renderDiscoverChips();
    renderDiscover();
});

document.getElementById("discoverSearch").addEventListener("input", (e) => {
    discoverSearch = e.target.value.trim();
    renderDiscover();
});

document.getElementById("discoverMentorSelect").addEventListener("change", (e) => {
    discoverMentor = e.target.value;
    renderDiscover();
});

document.getElementById("ideasStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-idea-status]");
    if (!btn) return;
    ideasActiveStatus = btn.dataset.ideaStatus;
    renderIdeasChips();
    renderIdeas();
});

document.getElementById("reportsStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-report-status]");
    if (!btn) return;
    reportsActiveStatus = btn.dataset.reportStatus;
    renderReportsChips();
    renderReports();
});

document.getElementById("newTagForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("newTagInput");
    const value = input.value.trim();
    if (!value) return;
    addTag(value);
    input.value = "";
    showToast("Tag added ✓");
    renderTags();
});

document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) { openDetailModal(openBtn.dataset.open); return; }

    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) { openFormModal(editBtn.dataset.edit); return; }

    const deleteBtn = e.target.closest("[data-delete]");
    if (deleteBtn) {
        const project = getAllProjects().find((p) => p.id === deleteBtn.dataset.delete);
        const title = project ? project.title : "this project";
        if (confirm(`Delete "${title}"? This removes it from all portals and can't be undone.`)) {
            deleteProject(deleteBtn.dataset.delete);
            closeModal();
            showToast("Project deleted");
            renderAll();
        }
        return;
    }

    const acceptBtn = e.target.closest("[data-accept]");
    if (acceptBtn) {
        const [studentUserId, projectId] = acceptBtn.dataset.accept.split("|");
        acceptInterest(studentUserId, projectId);
        return;
    }

    const rejectBtn = e.target.closest("[data-reject]");
    if (rejectBtn) {
        const [studentUserId, projectId] = rejectBtn.dataset.reject.split("|");
        rejectInterest(studentUserId, projectId);
        return;
    }

    const gotoBtn = e.target.closest("[data-goto]");
    if (gotoBtn) { goToTab(gotoBtn.dataset.goto); return; }

    const ideaAccept = e.target.closest("[data-idea-accept]");
    if (ideaAccept) { openIdeaDecisionModal(ideaAccept.dataset.ideaAccept, "Accepted"); return; }

    const ideaReject = e.target.closest("[data-idea-reject]");
    if (ideaReject) { openIdeaDecisionModal(ideaReject.dataset.ideaReject, "Rejected"); return; }

    const ideaRevise = e.target.closest("[data-idea-revise]");
    if (ideaRevise) { openIdeaDecisionModal(ideaRevise.dataset.ideaRevise, "Needs Revision"); return; }

    const reportOpen = e.target.closest("[data-report-open]");
    if (reportOpen) { openReportDetailModal(reportOpen.dataset.reportOpen); return; }

    const reportApprove = e.target.closest("[data-report-approve]");
    if (reportApprove) { approveReport(reportApprove.dataset.reportApprove); return; }

    const reportRequestChanges = e.target.closest("[data-report-request-changes]");
    if (reportRequestChanges) { requestReportChanges(reportRequestChanges.dataset.reportRequestChanges); return; }

    const unmanagedProfile = e.target.closest("[data-unmanaged-profile]");
    if (unmanagedProfile) { openUnmanagedProfileModal(unmanagedProfile.dataset.unmanagedProfile); return; }

    const unmanagedAssign = e.target.closest("[data-unmanaged-assign]");
    if (unmanagedAssign) { openAssignModal(unmanagedAssign.dataset.unmanagedAssign); return; }

    const unmanagedEmail = e.target.closest("[data-unmanaged-email]");
    if (unmanagedEmail) { emailStudent(unmanagedEmail.dataset.unmanagedEmail); return; }

    const tagEdit = e.target.closest("[data-tag-edit]");
    if (tagEdit) { startEditTag(tagEdit.dataset.tagEdit); return; }

    const tagRemove = e.target.closest("[data-tag-remove]");
    if (tagRemove) {
        if (confirm(`Remove the "${tagRemove.dataset.tagRemove}" tag? It will be unassigned from any projects using it.`)) {
            removeTag(tagRemove.dataset.tagRemove);
            showToast("Tag removed");
            renderTags();
            renderMyProjects();
        }
        return;
    }
});


/* ======================================================
   RENDER ALL / INIT
====================================================== */

function renderAll() {
    renderHome();
    renderMyProjects();
    renderDiscover();
    renderIdeas();
    renderStudents();
    renderReports();
    renderUnmanaged();
    renderTags();
    renderNotifications();
    renderNotifBadge();
}

async function initializeFacultyDashboard() {
    const profileLoaded = await loadFacultyProfile();

    if (!profileLoaded) {
        console.error(
            "Faculty dashboard could not load the faculty profile."
        );
        return;
    }

    renderProjectsChips();
    renderProjectsYearFilter();
    renderDiscoverChips();
    renderIdeasChips();
    renderReportsChips();
    renderUnmanagedFilters();
    renderProfile();
    renderAll();
}

initializeFacultyDashboard();


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
