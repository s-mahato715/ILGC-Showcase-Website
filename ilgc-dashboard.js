/* ======================================================
   AUTH GUARD
====================================================== */
/* ======================================================
   AUTH GUARD
====================================================== */

const role = localStorage.getItem("selectedRole");
const loggedIn = localStorage.getItem("loggedIn");
const userId = localStorage.getItem("userId");

if (!loggedIn || role !== "ilgc" || !userId) {
    window.location.href = "login.html";
}

let mentorName = userId;

const MENTOR_PROFILE_KEY = `ilgc_mentor_profile_${userId}`;

const mentorProfileState = {
    name: userId,
    bio: ""
};

function saveMentorProfileOverlay() {
    localStorage.setItem(MENTOR_PROFILE_KEY, JSON.stringify({
        name: mentorProfileState.name,
        bio: mentorProfileState.bio
    }));
}

async function loadMentorName() {
    const { data: mentor, error } =
        await window.supabaseClient
            .from("mentor_profiles")
            .select("name")
            .eq("email", userId)
            .maybeSingle();

    console.log("ILGC logged-in email:", userId);
    console.log("ILGC mentor from Supabase:", mentor);
    console.log("ILGC mentor lookup error:", error);

    if (!error && mentor?.name) {
        mentorName = mentor.name;
        mentorProfileState.name = mentor.name;
    }
}
/* ======================================================
   LOAD MENTOR GROUPS FROM SUPABASE
====================================================== */

let mentorGroups = [];

async function loadMentorGroups() {
    console.log("Loading groups for mentor:", userId);

    // 1. Find projects assigned to the logged-in mentor
    const { data: mentorProjects, error: mentorProjectsError } =
        await window.supabaseClient
            .from("project_mentors")
            .select("project_code")
            .eq("mentor_email", userId);

    if (mentorProjectsError) {
        console.error("Could not load mentor projects:", mentorProjectsError);
        mentorGroups = [];
        return;
    }

    console.log("Mentor projects:", mentorProjects);

    const projectCodes = (mentorProjects || []).map(
        (project) => project.project_code
    );

    if (projectCodes.length === 0) {
        mentorGroups = [];
        return;
    }

    // 2. Find ACTIVE students in those projects
    const { data: members, error: membersError } =
        await window.supabaseClient
            .from("project_members")
            .select(`
                project_code,
                student_email,
                member_role,
                joined_at,
                left_at
            `)
            .in("project_code", projectCodes)
            .is("left_at", null)
            .order("project_code")
            .order("student_email");

    if (membersError) {
        console.error("Could not load project members:", membersError);
        mentorGroups = [];
        return;
    }

    console.log("Mentor project members:", members);

    if (!members || members.length === 0) {
        mentorGroups = [];
        return;
    }

    // 3. Get student names from users
    const studentEmails = [
        ...new Set(
            members.map((member) => member.student_email)
        )
    ];

    const { data: students, error: studentsError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", studentEmails);

    if (studentsError) {
        console.error("Could not load student names:", studentsError);
        mentorGroups = [];
        return;
    }

    console.log("Student users:", students);

    const studentMap = new Map(
        (students || []).map((student) => [
            student.email,
            student
        ])
    );

    // 4. Group students by project
    const groupsMap = new Map();

    members.forEach((member) => {
        if (!groupsMap.has(member.project_code)) {
            groupsMap.set(member.project_code, []);
        }

        const student = studentMap.get(member.student_email);

        groupsMap.get(member.project_code).push({
            email: member.student_email,
            name: student?.name || member.student_email,
            role: member.member_role,
            joinedAt: member.joined_at
        });
    });

    // 5. ONLY keep projects that actually have students
    mentorGroups = Array.from(groupsMap.entries()).map(
        ([projectCode, students]) => ({
            projectCode,
            students
        })
    );

    console.log("Final mentor groups:", mentorGroups);
}


/* ======================================================
   BADGE HELPERS
====================================================== */

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

const FORM_DOMAINS = [
    "AI / Machine Learning",
    "Robotics & Embedded Systems",
    "Sustainability",
    "Healthcare Tech"
];

const IDEA_STATUSES = ["Pending", "Accepted", "Rejected", "Needs Revision"];
const REPORT_STATUSES = ["Submitted", "Under Review", "Changes Requested", "Resubmitted", "Approved"];
const REPORT_TIMELINE = ["Submitted", "Under Review", "Changes Requested", "Resubmitted", "Approved"];
const GROUP_STATUSES = ["Ongoing", "Proposed", "Completed"];
const REPORT_TYPES = ["Progress Report", "Midterm Report", "Final Report", "Resubmission"];


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
    if (notifBtn) {
        notifBtn.dataset.active = String(tabName === "notifications");
    }
    views.forEach((view) => {
        view.dataset.active = String(view.id === `view-${tabName}`);
    });
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => goToTab(btn.dataset.tab)));
if (notifBtn) {
    notifBtn.addEventListener("click", () => goToTab(notifBtn.dataset.tab));
}


/* ======================================================
   SIDEBAR TOGGLE
====================================================== */

const SIDEBAR_STATE_KEY = "ilgc_sidebar_collapsed";
const sidebarToggleBtn = document.getElementById("sidebarToggle");

if (localStorage.getItem(SIDEBAR_STATE_KEY) === "true") {
    document.body.classList.add("sidebar-collapsed");
}

if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
        localStorage.setItem(SIDEBAR_STATE_KEY, document.body.classList.contains("sidebar-collapsed"));
    });
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
   MODAL PLUMBING
====================================================== */

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");

function closeModal() {
    modalOverlay.classList.add("hidden");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });


/* ======================================================
   GROUP CARD (project + team, institute-wide)
====================================================== */

function groupCardHtml(project) {
    const teamCount = (project.team || []).length;
    const next = nextMilestoneFor(project.id);

    return `
        <article class="group-card">
            <div class="group-card-top">
                <span class="project-domain">${project.domain}</span>
                <span class="badge ${statusBadgeClass(project.status)}">${project.status}</span>
            </div>
            <div class="group-card-body">
                <h3 class="group-title" data-group-open="${project.id}">${project.title}</h3>
                <p class="group-mentor">Mentor: ${project.mentor}</p>
                <div style="margin-bottom:10px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${project.progress}%"></div>
                </div>
                <p class="progress-label" style="margin-bottom:12px;">${project.progress}% complete</p>
                <div class="group-card-stats">
                    <span class="group-card-stat"><strong>${teamCount}</strong> student${teamCount !== 1 ? "s" : ""}</span>
                </div>
                ${next ? `<div class="group-next-milestone"><strong>Next milestone</strong>${next.title} · ${next.date}</div>` : ""}
                <button class="btn btn-primary" data-group-open="${project.id}" style="margin-top:auto;">View Group</button>
            </div>
        </article>
    `;
}


/* ======================================================
   RENDER: HOME
====================================================== */

function renderHome() {
    document.getElementById("greetingText").textContent =
        `Welcome back, ${mentorProfileState.name} 👋`;

    document.getElementById("greetingSub").textContent =
        `Mentor · ${userId}`;

    const groups = mentorGroups || [];
    const activeProjects = mentorGroups.reduce(
    (total, group) => total + group.students.length,
    0);
    const pendingInterests = getAllInterestsAcrossStudents().filter((i) => i.status === "Pending");
    const pendingProposals = getAllIdeas().filter((i) => i.status === "Pending" || i.status === "Needs Revision");
    const reportsToReview = getAllReports().filter((r) => r.status === "Submitted" || r.status === "Under Review" || r.status === "Resubmitted");

    document.getElementById("statRow").innerHTML = `
        <div class="stat-card">
            <p class="stat-value">${groups.length}</p>
            <p class="stat-label">My Groups</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${activeProjects}</p>
            <p class="stat-label">Active Projects</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${pendingInterests.length}</p>
            <p class="stat-label">Pending Student Requests</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${pendingProposals.length}</p>
            <p class="stat-label">Project Proposals</p>
        </div>
        <div class="stat-card">
            <p class="stat-value">${reportsToReview.length}</p>
            <p class="stat-label">Reports to Review</p>
        </div>
    `;

    const pendingActions = [
        { count: pendingProposals.length, label: "project proposal" + (pendingProposals.length === 1 ? "" : "s") + " awaiting review", tab: "proposals" },
        { count: reportsToReview.length, label: "report" + (reportsToReview.length === 1 ? "" : "s") + " to review", tab: "reports" },
        { count: pendingInterests.length, label: "student" + (pendingInterests.length === 1 ? "" : "s") + " awaiting a response", tab: "interest" }
    ];
    const activeActions = pendingActions.filter((a) => a.count > 0);

    document.getElementById("pendingActionsList").innerHTML = activeActions.length
        ? activeActions.map((a) => `
            <div class="pending-action-item" data-goto="${a.tab}" style="cursor:pointer;">
                <span class="pending-action-count">${a.count}</span>
                <span>${a.label}</span>
            </div>
        `).join("")
        : `<p class="empty-panel">Nothing needs your attention right now.</p>`;

    const activity = buildActivityFeed(6);
    document.getElementById("activityFeed").innerHTML = activity.length
        ? activity.map((e) => `
            <div class="activity-item">
                <span class="activity-dot"></span>
                <span>${e.text}<span class="activity-date">${e.date}</span></span>
            </div>
        `).join("")
        : `<p class="empty-panel">No recent activity yet.</p>`;

    document.getElementById("homeGroupGrid").innerHTML =
        groups.slice(0, 6).map(groupCardHtml).join("") ||
        `<p class="empty-state">No active groups yet.</p>`;

    renderNotifBadge();
}


/* ======================================================
   RENDER: MY GROUPS
====================================================== */

let groupsActiveStatus = "All";
let groupsActiveYear = "All";

function renderGroupsChips() {
    const statuses = ["All", ...GROUP_STATUSES];
    document.getElementById("groupsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-group-status="${status}" data-active="${status === groupsActiveStatus}">${status}</button>
    `).join("");
}

function renderGroupsYearFilter() {
    const years = ["All", ...YEAR_FILTER_OPTIONS];
    const select = document.getElementById("groupsYearSelect");
    if (!select) return;
    select.innerHTML = years.map((y) =>
        `<option value="${y}" ${y === groupsActiveYear ? "selected" : ""}>${y === "All" ? "All Years" : y}</option>`
    ).join("");
}

function renderGroups() {
    const grid = document.getElementById("groupsGrid");
    const empty = document.getElementById("groupsEmpty");

    if (!mentorGroups || mentorGroups.length === 0) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    grid.innerHTML = mentorGroups.map((group) => {
        const studentsHtml = group.students.map((student) => `
            <div class="team-chip">
                <strong>${student.name}</strong>
                <span style="opacity:0.7;">
                    · ${student.email}
                </span>
            </div>
        `).join("");

        return `
            <article class="group-card">

                <div class="group-card-top">
                    <span class="project-domain">
                        Students
                    </span>

                    <span class="badge badge-ongoing">
                        ${group.students.length}
                        student${group.students.length !== 1 ? "s" : ""}
                    </span>
                </div>

                <div class="group-card-body">

                    <h3 class="group-title">
                        My Students
                    </h3>

                    <p class="group-mentor">
                        Students working under this project
                    </p>

                    <div class="modal-team" style="margin-top:16px;">
                        ${studentsHtml}
                    </div>

                </div>

            </article>
        `;
    }).join("");
}
function openGroupDetailModal(projectId) {
    const project = getAllProjects().find((p) => p.id === projectId);
    if (!project) return;

    const teamHtml = (project.team || []).length
        ? `<div class="modal-team">${project.team.map((m) => `<span class="team-chip">${m.name} · Sem ${m.semester} · ${cohortCodeFromSemester(m.semester)}</span>`).join("")}</div>`
        : `<p class="modal-text">No students on this group yet.</p>`;

    const milestones = PROJECT_MILESTONES[project.id] || [];
    const milestonesHtml = milestones.length
        ? `<div class="milestone-list">${milestones.map((m) => `
            <div class="milestone-item ${m.done ? "done" : ""}">
                <span class="milestone-dot ${m.done ? "done" : ""}"></span>
                <span>${m.title}</span>
                <span class="milestone-date">${m.date}</span>
            </div>
        `).join("")}</div>`
        : `<p class="modal-text">No milestones recorded yet.</p>`;

    const reports = getAllReports().filter((r) => r.projectId === project.id).sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
    const reportsHtml = reports.length
        ? reports.map((r) => `<span class="team-chip" data-report-open="${r.id}" style="cursor:pointer;">${r.reportType} · ${r.status}</span>`).join("")
        : `<p class="modal-text">No reports submitted yet.</p>`;

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${project.domain} · ${project.status}</p>
        <h2 class="modal-title">${project.title}</h2>
        <div style="margin-bottom:16px;"><span class="origin-badge origin-${project.origin || "faculty"}">${projectOriginLabel(project)}</span></div>

        <div class="modal-meta-row">
            <div class="modal-meta-item">
                <span class="meta-label">Faculty</span>
                <span class="meta-value">${project.mentor}</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Progress</span>
                <span class="meta-value">${project.progress}%</span>
            </div>
            <div class="modal-meta-item">
                <span class="meta-label">Cohort</span>
                <span class="meta-value">${project.cohort}</span>
            </div>
        </div>

        <p class="modal-section-label">Overview</p>
        <p class="modal-text">${project.summary}</p>

        <p class="modal-section-label">Student members</p>
        ${teamHtml}

        <p class="modal-section-label">Milestones</p>
        ${milestonesHtml}

        <p class="modal-section-label">Reports</p>
        <div class="modal-team">${reportsHtml}</div>

        <p class="modal-section-label">SharePoint — shared reports</p>
        ${ilgcSharePointViewHtml(project.id)}
    `;

    modalOverlay.classList.remove("hidden");
}

/* Read-only view of a project's student-created SharePoint workspace. */
function ilgcSharePointViewHtml(projectId) {
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
   RENDER: STUDENT INTEREST (institute-wide)
====================================================== */

function renderInterest() {
    const rows = getAllInterestsAcrossStudents().sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    const container = document.getElementById("interestTable");
    const empty = document.getElementById("interestEmpty");

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
                <button class="btn btn-primary" data-interest-accept="${interest.studentUserId}|${interest.projectId}">Accept</button>
                <button class="btn btn-danger" data-interest-reject="${interest.studentUserId}|${interest.projectId}">Reject</button>
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
   RENDER: PROJECT PROPOSALS (institute-wide ideas)
====================================================== */

let proposalsActiveStatus = "All";
let proposalsActiveDomain = "All";

function renderProposalsChips() {
    const statuses = ["All", ...IDEA_STATUSES];
    document.getElementById("proposalsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-proposal-status="${status}" data-active="${status === proposalsActiveStatus}">${status}</button>
    `).join("");
}

function renderProposalsDomainFilter() {
    const domains = ["All", ...new Set(STUDENT_IDEAS.map((i) => i.domain))];
    document.getElementById("proposalsDomainFilter").innerHTML = `
        <select id="proposalsDomainSelect">
            ${domains.map((d) => `<option value="${d}" ${d === proposalsActiveDomain ? "selected" : ""}>${d === "All" ? "All Domains" : d}</option>`).join("")}
        </select>
    `;
    document.getElementById("proposalsDomainSelect").addEventListener("change", (e) => {
        proposalsActiveDomain = e.target.value;
        renderProposals();
    });
}

function proposalCardHtml(idea) {
    const actions = (idea.status === "Pending" || idea.status === "Needs Revision")
        ? `
            <button class="btn btn-primary" data-proposal-accept="${idea.id}">Accept</button>
            <button class="btn btn-danger" data-proposal-reject="${idea.id}">Reject</button>
            <button class="btn btn-secondary" data-proposal-revise="${idea.id}">Request Changes</button>
        `
        : "";

    const feedbackHtml = idea.feedback
        ? `<div class="idea-feedback-box"><strong>Mentor feedback</strong>${idea.feedback}</div>`
        : "";

    return `
        <article class="idea-card">
            <div class="idea-card-top">
                <div>
                    <p class="idea-title">${idea.title}</p>
                    <p class="idea-meta"><strong>${idea.studentName}</strong> · Sem ${idea.studentSemester} · ${idea.domain} · Proposed to ${idea.targetMentor} · ${idea.proposedDate}</p>
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

function renderProposals() {
    const ideas = getAllIdeas()
        .filter((i) => proposalsActiveStatus === "All" || i.status === proposalsActiveStatus)
        .filter((i) => proposalsActiveDomain === "All" || i.domain === proposalsActiveDomain)
        .sort((a, b) => new Date(b.proposedDate) - new Date(a.proposedDate));

    const list = document.getElementById("proposalsList");
    const empty = document.getElementById("proposalsEmpty");

    if (ideas.length === 0) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    list.innerHTML = ideas.map(proposalCardHtml).join("");
}

function openProposalDecisionModal(ideaId, decision) {
    const idea = getAllIdeas().find((i) => i.id === ideaId);
    if (!idea) return;

    const titleMap = { Accepted: "Accept proposal", Rejected: "Reject proposal", "Needs Revision": "Request changes" };
    const btnMap = { Accepted: "Accept proposal", Rejected: "Reject proposal", "Needs Revision": "Send feedback" };

    modalBody.innerHTML = `
        <p class="modal-eyebrow">${titleMap[decision]}</p>
        <h2 class="modal-title">${idea.title}</h2>
        <p class="modal-text" style="margin-bottom:16px;">Proposed by ${idea.studentName} · Sem ${idea.studentSemester} · originally routed to ${idea.targetMentor}</p>

        <form id="proposalDecisionForm">
            <div class="modal-field">
                <label for="proposalComment">${decision === "Needs Revision" ? "What needs to change" : "Comments (optional)"}</label>
                <textarea id="proposalComment" ${decision === "Needs Revision" ? "required" : ""} placeholder="${decision === "Needs Revision" ? "Explain what to revise before resubmitting…" : "Add an optional note…"}"></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">${btnMap[decision]}</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("proposalDecisionForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const comment = document.getElementById("proposalComment").value.trim();
        updateIdea(ideaId, { status: decision, feedback: comment || idea.feedback || "" });

        const toastMap = {
            Accepted: `"${idea.title}" accepted ✓`,
            Rejected: `"${idea.title}" rejected.`,
            "Needs Revision": `Feedback sent to ${idea.studentName} ✓`
        };
        showToast(toastMap[decision]);
        closeModal();
        renderProposals();
        renderHome();
    });
}


/* ======================================================
   RENDER: GROUP REPORTS (institute-wide)
====================================================== */

let reportsActiveStatus = "All";

function renderReportsChips() {
    const statuses = ["All", ...REPORT_STATUSES];
    document.getElementById("reportsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-report-status="${status}" data-active="${status === reportsActiveStatus}">${status}</button>
    `).join("");
}

function renderReports() {
    const reports = getAllReports()
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
        const reached = report.history.some((h) => h.status === step);
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
                <span class="meta-label">Faculty</span>
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
        addReportComment(reportId, text, mentorName);
        showToast("Comment added ✓");
        openReportDetailModal(reportId);
        renderReports();
    });
}

function approveReport(reportId) {
    updateReportStatus(reportId, "Approved", mentorName);
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
        updateReportStatus(reportId, "Changes Requested", mentorName, note);
        showToast("Changes requested ✓");
        closeModal();
        renderReports();
        renderHome();
    });
}

function openAddReportModal() {
    const projects = getAllProjects();

    modalBody.innerHTML = `
        <p class="modal-eyebrow">Add report</p>
        <h2 class="modal-title">Log a new report</h2>
        <form id="addReportForm">
            <div class="modal-field">
                <label for="rProject">Project / group</label>
                <select id="rProject">
                    ${projects.map((p) => `<option value="${p.id}">${p.title}</option>`).join("")}
                </select>
            </div>
            <div class="modal-field">
                <label for="rType">Report type</label>
                <select id="rType">
                    ${REPORT_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
                </select>
            </div>
            <div class="modal-field">
                <label for="rSubmittedBy">Submitted by</label>
                <input type="text" id="rSubmittedBy" required placeholder="Student or group name">
            </div>
            <div class="modal-field">
                <label for="rPreview">Report summary</label>
                <textarea id="rPreview" required placeholder="Short summary of what's in this report…"></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Add Report</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("addReportForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const today = new Date().toISOString().slice(0, 10);

        addReport({
            id: `rpt-${Date.now().toString(36).slice(-6)}`,
            projectId: document.getElementById("rProject").value,
            reportType: document.getElementById("rType").value,
            submittedBy: document.getElementById("rSubmittedBy").value.trim(),
            submittedDate: today,
            status: "Submitted",
            preview: document.getElementById("rPreview").value.trim(),
            comments: [],
            history: [{ status: "Submitted", date: today, by: mentorName }]
        });

        showToast("Report added ✓");
        closeModal();
        renderReports();
        renderHome();
    });
}


/* ======================================================
   CREATE PROJECT (and populate it across students)
====================================================== */

function slugify(title) {
    const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${base || "project"}-${Date.now().toString(36).slice(-4)}`;
}

function openCreateProjectModal() {
    modalBody.innerHTML = `
        <p class="modal-eyebrow">Institute-wide project</p>
        <h2 class="modal-title">Create Project</h2>

        <form id="createProjectForm">
            <div class="modal-field">
                <label for="cpTitle">Project name</label>
                <input type="text" id="cpTitle" required placeholder="e.g. Smart Campus Water Metering">
            </div>

            <div class="modal-field">
                <label for="cpDomain">Domain</label>
                <select id="cpDomain">
                    ${FORM_DOMAINS.map((d) => `<option value="${d}">${d}</option>`).join("")}
                </select>
            </div>

            <div class="modal-field">
                <label for="cpStatus">Status</label>
                <select id="cpStatus">
                    ${GROUP_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>
            </div>

            <div class="modal-field">
                <label for="cpMentor">Faculty mentor</label>
                <input type="text" id="cpMentor" required placeholder="e.g. Dr. Ananya Rao">
            </div>

            <div class="modal-field">
                <label for="cpSummary">Summary</label>
                <textarea id="cpSummary" required placeholder="What is this project about?"></textarea>
            </div>

            <div class="modal-field">
                <label for="cpOutcome">Expected outcome</label>
                <textarea id="cpOutcome" required placeholder="What does success look like?"></textarea>
            </div>

            <div class="modal-field">
                <label for="cpStudents">Populate across students</label>
                <textarea id="cpStudents" placeholder="One student per line, as Name, Semester&#10;e.g.&#10;Riya Kapoor, 5&#10;Devansh Rao, 3"></textarea>
                <p class="field-hint">Add every student you want assigned to this group's team — one per line. Leave blank to create it with no team yet.</p>
            </div>

            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Create &amp; Populate</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("createProjectForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const status = document.getElementById("cpStatus").value;
        const team = document.getElementById("cpStudents").value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [name, semester] = line.split(",").map((part) => part.trim());
                return { name: name || line, semester: Number(semester) || 1 };
            });

        addProject({
            id: slugify(document.getElementById("cpTitle").value),
            title: document.getElementById("cpTitle").value.trim(),
            domain: document.getElementById("cpDomain").value,
            status,
            mentor: document.getElementById("cpMentor").value.trim(),
            summary: document.getElementById("cpSummary").value.trim(),
            expectedOutcome: document.getElementById("cpOutcome").value.trim(),
            cohort: "Batch of 2029",
            image: "images/placeholder.jpg",
            progress: status === "Completed" ? 100 : status === "Ongoing" ? 10 : 0,
            tags: [],
            team,
            origin: "mentor",
            floatedByName: mentorProfileState.name
        });

        showToast(`Project created${team.length ? ` and populated with ${team.length} student${team.length === 1 ? "" : "s"} ✓` : " ✓"}`);
        closeModal();
        renderGroups();
        renderHome();
    });
}

document.getElementById("createProjectBtn").addEventListener("click", openCreateProjectModal);


/* ======================================================
   RENDER: NOTIFICATIONS
====================================================== */

function buildNotifications() {
    const notifications = [];

    getAllInterestsAcrossStudents().filter((i) => i.status === "Pending").forEach((i) => {
        const student = deriveStudentProfile(i.studentUserId);
        const project = getAllProjects().find((p) => p.id === i.projectId);
        notifications.push({
            icon: "👤",
            date: (i.submittedAt || "").slice(0, 10),
            text: `<strong>${student.name}</strong> has expressed interest in ${project ? project.title : "a project"}.`
        });
    });

    getAllIdeas().filter((i) => i.status === "Pending").forEach((i) => {
        notifications.push({
            icon: "💡",
            date: i.proposedDate,
            text: `A new project has been proposed in <strong>${i.domain}</strong> — "${i.title}".`
        });
    });

    getAllReports().filter((r) => r.status === "Submitted" || r.status === "Under Review" || r.status === "Resubmitted").forEach((r) => {
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
    document.getElementById("profileAvatar").textContent = mentorProfileState.name.replace("Dr. ", "").charAt(0);
    document.getElementById("profileName").textContent = mentorProfileState.name;
    document.getElementById("profileMeta").textContent = mentorProfileState.bio
        ? `Mentor · ${mentorProfileState.bio}`
        : "Mentor";
    document.getElementById("profileUserId").textContent = userId;
}

function openEditProfileModal() {
    modalBody.innerHTML = `
        <p class="modal-eyebrow">Your profile</p>
        <h2 class="modal-title">Edit Profile</h2>

        <form id="editProfileForm">
            <div class="modal-field">
                <label for="epName">Display name</label>
                <input type="text" id="epName" required value="${mentorProfileState.name}">
            </div>
            <div class="modal-field">
                <label for="epBio">Title / short bio</label>
                <textarea id="epBio" placeholder="e.g. Associate Professor, Robotics &amp; Embedded Systems">${mentorProfileState.bio}</textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Save changes</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("editProfileForm").addEventListener("submit", (e) => {
        e.preventDefault();
        mentorProfileState.name = document.getElementById("epName").value.trim() || mentorName;
        mentorProfileState.bio = document.getElementById("epBio").value.trim();
        saveMentorProfileOverlay();
        closeModal();
        renderProfile();
        renderHome();
        showToast("Profile updated ✓");
    });
}

document.getElementById("editProfileBtn").addEventListener("click", openEditProfileModal);


/* ======================================================
   EVENT DELEGATION
====================================================== */

document.getElementById("groupsStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-group-status]");
    if (!btn) return;
    groupsActiveStatus = btn.dataset.groupStatus;
    renderGroupsChips();
    renderGroups();
});

document.getElementById("groupsYearSelect").addEventListener("change", (e) => {
    groupsActiveYear = e.target.value;
    renderGroups();
});

document.getElementById("proposalsStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-proposal-status]");
    if (!btn) return;
    proposalsActiveStatus = btn.dataset.proposalStatus;
    renderProposalsChips();
    renderProposals();
});

document.getElementById("reportsStatusChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-report-status]");
    if (!btn) return;
    reportsActiveStatus = btn.dataset.reportStatus;
    renderReportsChips();
    renderReports();
});

document.getElementById("addReportBtn").addEventListener("click", openAddReportModal);

document.addEventListener("click", (e) => {
    const gotoBtn = e.target.closest("[data-goto]");
    if (gotoBtn) { goToTab(gotoBtn.dataset.goto); return; }

    const groupOpen = e.target.closest("[data-group-open]");
    if (groupOpen) { openGroupDetailModal(groupOpen.dataset.groupOpen); return; }

    const interestAccept = e.target.closest("[data-interest-accept]");
    if (interestAccept) {
        const [studentUserId, projectId] = interestAccept.dataset.interestAccept.split("|");
        acceptInterest(studentUserId, projectId);
        return;
    }

    const interestReject = e.target.closest("[data-interest-reject]");
    if (interestReject) {
        const [studentUserId, projectId] = interestReject.dataset.interestReject.split("|");
        rejectInterest(studentUserId, projectId);
        return;
    }

    const proposalAccept = e.target.closest("[data-proposal-accept]");
    if (proposalAccept) { openProposalDecisionModal(proposalAccept.dataset.proposalAccept, "Accepted"); return; }

    const proposalReject = e.target.closest("[data-proposal-reject]");
    if (proposalReject) { openProposalDecisionModal(proposalReject.dataset.proposalReject, "Rejected"); return; }

    const proposalRevise = e.target.closest("[data-proposal-revise]");
    if (proposalRevise) { openProposalDecisionModal(proposalRevise.dataset.proposalRevise, "Needs Revision"); return; }

    const reportOpen = e.target.closest("[data-report-open]");
    if (reportOpen) { openReportDetailModal(reportOpen.dataset.reportOpen); return; }

    const reportApprove = e.target.closest("[data-report-approve]");
    if (reportApprove) { approveReport(reportApprove.dataset.reportApprove); return; }

    const reportRequestChanges = e.target.closest("[data-report-request-changes]");
    if (reportRequestChanges) { requestReportChanges(reportRequestChanges.dataset.reportRequestChanges); return; }
});


/* ======================================================
   RENDER ALL / INIT
====================================================== */

async function renderAll() {
    await loadMentorName();
    await loadMentorGroups();

    renderHome();
    renderGroups();
    renderInterest();
    renderProposals();
    renderReports();
    renderNotifications();
    renderProfile();
}

renderGroupsChips();
renderGroupsYearFilter();
renderProposalsChips();
renderProposalsDomainFilter();
renderReportsChips();
renderAll();
