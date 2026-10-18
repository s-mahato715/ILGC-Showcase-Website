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
   SHAREPOINT WORKSPACES — SUPABASE (read-only for ILGC)
   Students create workspaces and add report links from their dashboard.
====================================================== */
let mentorSharePointData = new Map();

async function loadMentorSharePointData() {
    mentorSharePointData = new Map();

    const { data: assignments, error: assignmentError } = await window.supabaseClient
        .from("project_mentors").select("project_code").eq("mentor_email", userId);
    if (assignmentError) {
        console.error("Could not load SharePoint project assignments:", assignmentError);
        return;
    }

    const projectCodes = [...new Set((assignments || []).map(row => row.project_code).filter(Boolean))];
    if (!projectCodes.length) return;

    const { data: workspaces, error: workspaceError } = await window.supabaseClient
        .from("project_workspaces")
        .select("workspace_id, project_code, workspace_name, workspace_url, provider, created_by, created_at")
        .in("project_code", projectCodes);
    if (workspaceError) {
        console.error("Could not load SharePoint workspaces:", workspaceError);
        return;
    }

    const workspaceIds = (workspaces || []).map(row => row.workspace_id).filter(Boolean);
    let files = [];
    if (workspaceIds.length) {
        const { data, error } = await window.supabaseClient
            .from("workspace_files")
            .select("file_id, workspace_id, title, note, file_url, added_by, added_at")
            .in("workspace_id", workspaceIds)
            .order("added_at", { ascending: false });
        if (error) console.error("Could not load SharePoint report links:", error);
        else files = data || [];
    }

    (workspaces || []).forEach(workspace => {
        mentorSharePointData.set(String(workspace.project_code), {
            workspace,
            files: files.filter(file => String(file.workspace_id) === String(workspace.workspace_id))
        });
    });
}

/* ======================================================
   LOAD MENTOR GROUPS FROM SUPABASE
====================================================== */

let mentorGroups = [];
let mentorInterestData = [];
let deletedProjectRows = [];
let archivedProjectRows = [];

async function loadMentorGroups() {
    console.log("Loading groups for mentor:", userId);

    // --------------------------------------------------
    // 1. Get projects assigned to this mentor
    // --------------------------------------------------
    const { data: mentorProjects, error: mentorProjectsError } =
        await window.supabaseClient
            .from("project_mentors")
            .select("project_code")
            .eq("mentor_email", userId);

    if (mentorProjectsError) {
        console.error(
            "Could not load mentor projects:",
            mentorProjectsError
        );
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

    // --------------------------------------------------
    // 2. Get project details from projects table
    // --------------------------------------------------
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
        console.error(
            "Could not load project details:",
            projectsError
        );
        mentorGroups = [];
        return;
    }

    console.log("Mentor project details:", projects);

    // --------------------------------------------------
    // 3. Get students belonging to those projects
    // --------------------------------------------------
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
        console.error(
            "Could not load project members:",
            membersError
        );
        mentorGroups = [];
        return;
    }

    console.log("Mentor project members:", members);

    // NOTE: a group with no students yet must still show up for its mentor,
    // so we no longer bail out when there are no members.
    const memberList = members || [];

    // --------------------------------------------------
    // 4. Get student names
    // --------------------------------------------------
    const studentEmails = [
        ...new Set(
            memberList.map((member) => member.student_email)
        )
    ];

    const { data: students, error: studentsError } = studentEmails.length
        ? await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", studentEmails)
        : { data: [], error: null };

    if (studentsError) {
        console.error(
            "Could not load student names:",
            studentsError
        );
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

    // --------------------------------------------------
    // 5. Create lookup for project details
    // --------------------------------------------------
    const projectMap = new Map(
        (projects || []).map((project) => [
            project.project_code,
            project
        ])
    );

    // --------------------------------------------------
    // 6. Build final mentor groups
    // --------------------------------------------------
    const groupsMap = new Map();

    // Optional population cap (column may not exist yet - never let it break loading)
    let capByCode = new Map();
    try {
        const { data: capRows, error: capError } = await window.supabaseClient
            .from("projects")
            .select("project_code, population_cap")
            .in("project_code", projectCodes);
        if (!capError && capRows) {
            capByCode = new Map(capRows.map((r) => [r.project_code, r.population_cap]));
        }
    } catch (e) { /* column not added yet */ }

    // One group per project this mentor is assigned to, members or not.
    projectCodes.forEach((code) => {
        if (!groupsMap.has(code)) {
            const project = projectMap.get(code);

            groupsMap.set(code, {
                projectCode: code,
                populationCap: capByCode.get(code) || null,

                title:
                    project?.title ||
                    `Project ${code}`,

                description:
                    project?.description ||
                    project?.summary ||
                    "",

                status: project?.status || "proposed",

                progress: project?.progress ?? 0,

                academicYear:
                    project?.academic_year || "",

                semester:
                    project?.semester || null,

                students: []
            });
        }
    });

    memberList.forEach((member) => {
        const student = studentMap.get(member.student_email);
        const group = groupsMap.get(member.project_code);
        if (!group) return;

        group.students.push({
            email: member.student_email,
            name: student?.name || member.student_email,
            role: member.member_role,
            joinedAt: member.joined_at
        });
    });

    mentorGroups = Array.from(groupsMap.values());

    // Projects recorded in deleted_projects are hidden from My Groups.
    const deleted = await loadDeletedProjectRows();
    const deletedCodes = new Set((deleted || []).map((row) => String(row.original_project_id)));
    const archived = await loadArchivedProjectRows();
    const archivedCodes = new Set((archived || []).map((row) => String(row.original_project_id)));
    mentorGroups = mentorGroups.filter((group) =>
        !deletedCodes.has(String(group.projectCode)) && !archivedCodes.has(String(group.projectCode))
    );

    console.log("Final mentor groups:", mentorGroups);
}

/* ======================================================
   LOAD STUDENT INTERESTS FROM SUPABASE
   Only interests for projects assigned to this mentor
====================================================== */

async function loadMentorInterests() {
    console.log("Loading student interests for mentor:", userId);

    /* --------------------------------------------------
       1. Get projects assigned to this mentor
    -------------------------------------------------- */

    const { data: assignments, error: assignmentError } =
        await window.supabaseClient
            .from("project_mentors")
            .select("project_code")
            .eq("mentor_email", userId);

    if (assignmentError) {
        console.error(
            "Could not load mentor project assignments:",
            assignmentError
        );

        mentorInterestData = [];
        return;
    }

    const projectCodes = [
        ...new Set(
            (assignments || [])
                .map((row) => row.project_code)
                .filter(Boolean)
        )
    ];

    console.log(
        "Projects assigned to mentor:",
        projectCodes
    );

    if (projectCodes.length === 0) {
        mentorInterestData = [];
        return;
    }

    /* --------------------------------------------------
       2. Get expressions of interest
    -------------------------------------------------- */

    const { data: interestRows, error: interestError } =
        await window.supabaseClient
            .from("expressions_of_interest")
            .select(`
                student_email,
                project_code,
                status,
                message,
                submitted_at,
                reviewed_by,
                reviewed_at,
                review_comment
            `)
            .in("project_code", projectCodes)
            .order("submitted_at", {
                ascending: false
            });

    if (interestError) {
        console.error(
            "Could not load expressions of interest:",
            interestError
        );

        mentorInterestData = [];
        return;
    }

    console.log(
        "Expressions of interest:",
        interestRows
    );

    if (!interestRows || interestRows.length === 0) {
        mentorInterestData = [];
        return;
    }

    /* --------------------------------------------------
       3. Get student emails
    -------------------------------------------------- */

    const studentEmails = [
        ...new Set(
            interestRows
                .map((row) => row.student_email)
                .filter(Boolean)
        )
    ];

    /* --------------------------------------------------
       4. Get student names from users
    -------------------------------------------------- */

    const { data: users, error: usersError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", studentEmails);

    if (usersError) {
        console.error(
            "Could not load interested student names:",
            usersError
        );
    }

    const userMap = new Map(
        (users || []).map((user) => [
            user.email,
            user
        ])
    );

    /* --------------------------------------------------
       5. Get student profile information
    -------------------------------------------------- */

    const { data: profiles, error: profilesError } =
        await window.supabaseClient
            .from("student_profiles")
            .select(`
                email,
                roll_number,
                program,
                department,
                semester,
                bio,
                skills,
                interests,
                github_url,
                linkedin_url,
                portfolio_url
            `)
            .in("email", studentEmails);

    if (profilesError) {
        console.error(
            "Could not load interested student profiles:",
            profilesError
        );
    }

    const profileMap = new Map(
        (profiles || []).map((profile) => [
            profile.email,
            profile
        ])
    );

    /* --------------------------------------------------
       6. Get project details
    -------------------------------------------------- */

    const { data: projects, error: projectsError } =
        await window.supabaseClient
            .from("projects")
            .select(`
                project_code,
                title,
                description,
                summary
            `)
            .in("project_code", projectCodes);

    if (projectsError) {
        console.error(
            "Could not load interested project details:",
            projectsError
        );
    }

    const projectMap = new Map(
        (projects || []).map((project) => [
            project.project_code,
            project
        ])
    );

    /* --------------------------------------------------
       7. Build final data
    -------------------------------------------------- */

    mentorInterestData = interestRows.map((row) => {
        const user = userMap.get(row.student_email) || {};
        const profile = profileMap.get(row.student_email) || {};
        const project = projectMap.get(row.project_code) || {};

        return {
            studentEmail: row.student_email,

            studentName:
                user.name ||
                row.student_email,

            rollNumber:
                profile.roll_number || "",

            program:
                profile.program || "",

            department:
                profile.department || "",

            semester:
                profile.semester || "",

            bio:
                profile.bio || "",

            skills:
                profile.skills || [],

            interests:
                profile.interests || [],

            githubUrl:
                profile.github_url || "",

            linkedinUrl:
                profile.linkedin_url || "",

            portfolioUrl:
                profile.portfolio_url || "",

            projectCode:
                row.project_code,

            projectTitle:
                project.title ||
                row.project_code,

            projectDescription:
                project.description ||
                project.summary ||
                "",

            status:
                String(row.status || "pending")
                    .charAt(0)
                    .toUpperCase() +
                String(row.status || "pending").slice(1).toLowerCase(),

            message:
                row.message || "",

            submittedAt:
                row.submitted_at,

            reviewedBy:
                row.reviewed_by || "",

            reviewedAt:
                row.reviewed_at,

            reviewComment:
                row.review_comment || ""
        };
    });

    console.log(
        "Final mentor interest data:",
        mentorInterestData
    );
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

tabButtons.forEach((btn) => btn.addEventListener("click", () => {
    goToTab(btn.dataset.tab);
    if (btn.dataset.tab === "deleted") renderDeletedProjects();
    if (btn.dataset.tab === "archived") renderArchivedProjects();
}));
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
                    <span class="group-card-stat"><strong>${project.populationCap ? `${teamCount} / ${project.populationCap}` : teamCount}</strong> student${(project.populationCap || teamCount) !== 1 ? "s" : ""}</span>
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
    const activeProjects = mentorGroups.length;
    const pendingInterests =
    mentorInterestData.filter(
        (i) => i.status === "Pending"
    );
    const pendingProposals = getProposals().filter((i) => i.status === "Pending" || i.status === "Needs Revision");
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

    renderNotifBadge();
}


/* ======================================================
   DELETE / RESTORE PROJECTS
====================================================== */

async function loadDeletedProjectRows() {
    const { data, error } = await window.supabaseClient
        .from("deleted_projects")
        .select("id, original_project_id, project_data, deleted_at")
        .order("deleted_at", { ascending: false });
    if (error) {
        console.error("Could not load deleted projects:", error);
        deletedProjectRows = [];
        return [];
    }
    deletedProjectRows = data || [];
    return deletedProjectRows;
}

async function deleteMentorProject(projectCode) {
    const code = String(projectCode);
    const project = mentorGroups.find((g) => String(g.projectCode) === code);
    if (!project) return;
    if (!window.confirm(`Move "${project.title}" to Deleted Projects?`)) return;

    // Store a snapshot before hiding it, so the project can be restored later.
    const { data: projectRow, error: projectError } = await window.supabaseClient
        .from("projects")
        .select("*")
        .eq("project_code", projectCode)
        .maybeSingle();
    if (projectError || !projectRow) {
        console.error("Could not read project before deletion:", projectError);
        showToast("Could not load project details. Nothing was deleted.");
        return;
    }

    const sessionResult = await window.supabaseClient.auth.getUser();
    const authUserId = sessionResult?.data?.user?.id || null;
    const { error: saveError } = await window.supabaseClient
        .from("deleted_projects")
        .insert({
            original_project_id: code,
            project_data: projectRow,
            deleted_by: authUserId
        });
    if (saveError) {
        console.error("Could not save deleted project snapshot:", saveError);
        showToast("Delete failed. Check deleted_projects RLS policies.");
        return;
    }

    mentorGroups = mentorGroups.filter((g) => String(g.projectCode) !== code);
    renderGroups();
    await renderDeletedProjects();
    showToast("Project moved to Deleted Projects.");
}

async function renderDeletedProjects() {
    const grid = document.getElementById("deletedProjectsGrid");
    const empty = document.getElementById("deletedProjectsEmpty");
    if (!grid || !empty) return;
    const rows = await loadDeletedProjectRows();
    if (!rows.length) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = rows.map((row) => {
        const p = row.project_data || {};
        const title = p.title || `Project ${row.original_project_id}`;
        const date = row.deleted_at ? new Date(row.deleted_at).toLocaleDateString() : "";
        return `<article class="group-card mentor-project-card">
          <div class="group-card-top"><span class="project-code">${String(row.original_project_id)}</span><span class="badge">Deleted</span></div>
          <div class="group-card-body"><h3 class="group-title">${escapeHtml(title)}</h3><p class="project-meta">Deleted ${date}</p>${p.description ? `<p class="project-description">${escapeHtml(p.description)}</p>` : ""}</div>
          <div class="group-card-actions"><button class="btn btn-secondary" type="button" data-project-restore="${row.id}">Restore to My Groups</button></div>
        </article>`;
    }).join("");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
}

async function restoreDeletedProject(rowId) {
    const row = deletedProjectRows.find((item) => item.id === rowId);
    if (!row) { await loadDeletedProjectRows(); }
    const selected = deletedProjectRows.find((item) => item.id === rowId);
    if (!selected?.project_data) { showToast("Could not find the saved project snapshot."); return; }
    const snapshot = { ...selected.project_data };
    const { project_code, ...updateFields } = snapshot;
    // Restore missing/changed project fields by updating the existing row when possible.
    const { data: existing, error: findError } = await window.supabaseClient
        .from("projects").select("project_code").eq("project_code", selected.original_project_id).maybeSingle();
    if (findError) { showToast("Could not check the original project."); return; }
    let restoreError = null;
    if (existing) {
        const result = await window.supabaseClient.from("projects").update(updateFields).eq("project_code", selected.original_project_id);
        restoreError = result.error;
    } else {
        const result = await window.supabaseClient.from("projects").insert(snapshot);
        restoreError = result.error;
    }
    if (restoreError) {
        console.error("Restore failed:", restoreError);
        showToast("Restore failed. Check projects table permissions.");
        return;
    }
    const { error: removeError } = await window.supabaseClient.from("deleted_projects").delete().eq("id", rowId);
    if (removeError) { console.error(removeError); showToast("Project restored, but its deleted record could not be cleared."); return; }
    await renderAll();
    await renderDeletedProjects();
    goToTab("groups");
    showToast("Project restored to My Groups.");
}

/* ======================================================
   ARCHIVE / RESTORE PROJECTS
====================================================== */

async function loadArchivedProjectRows() {
    const { data, error } = await window.supabaseClient
        .from("archived_projects")
        .select("id, original_project_id, project_data, archived_at")
        .order("archived_at", { ascending: false });
    if (error) {
        console.error("Could not load archived projects:", error);
        archivedProjectRows = [];
        return [];
    }
    archivedProjectRows = data || [];
    return archivedProjectRows;
}

async function archiveMentorProject(projectCode) {
    const code = String(projectCode);
    const project = mentorGroups.find((g) => String(g.projectCode) === code);
    if (!project) return;
    if (!window.confirm(`Archive "${project.title}"? It will move to Archived Projects and can be restored later.`)) return;

    const { data: projectRow, error: projectError } = await window.supabaseClient
        .from("projects").select("*").eq("project_code", projectCode).maybeSingle();
    if (projectError || !projectRow) {
        console.error("Could not read project before archiving:", projectError);
        showToast("Could not load project details. Nothing was archived.");
        return;
    }
    const sessionResult = await window.supabaseClient.auth.getUser();
    const authUserId = sessionResult?.data?.user?.id || null;
    const { error: saveError } = await window.supabaseClient.from("archived_projects").insert({
        original_project_id: code,
        project_data: projectRow,
        archived_by: authUserId
    });
    if (saveError) {
        console.error("Could not save archived project snapshot:", saveError);
        showToast("Archive failed. Check archived_projects RLS policies and table setup.");
        return;
    }
    mentorGroups = mentorGroups.filter((g) => String(g.projectCode) !== code);
    renderGroups();
    await renderArchivedProjects();
    showToast("Project moved to Archived Projects.");
}

async function renderArchivedProjects() {
    const grid = document.getElementById("archivedProjectsGrid");
    const empty = document.getElementById("archivedProjectsEmpty");
    if (!grid || !empty) return;
    const rows = await loadArchivedProjectRows();
    if (!rows.length) { grid.innerHTML = ""; empty.classList.remove("hidden"); return; }
    empty.classList.add("hidden");
    grid.innerHTML = rows.map((row) => {
        const p = row.project_data || {};
        const title = p.title || `Project ${row.original_project_id}`;
        const date = row.archived_at ? new Date(row.archived_at).toLocaleDateString() : "";
        return `<article class="group-card mentor-project-card">
          <div class="group-card-top"><span class="project-code">${escapeHtml(row.original_project_id)}</span><span class="badge">Archived</span></div>
          <div class="group-card-body"><h3 class="group-title">${escapeHtml(title)}</h3><p class="project-meta">Archived ${date}</p>${p.description ? `<p class="project-description">${escapeHtml(p.description)}</p>` : ""}</div>
          <div class="group-card-actions"><button class="btn btn-secondary" type="button" data-project-unarchive="${row.id}">Restore to My Groups</button></div>
        </article>`;
    }).join("");
}

async function restoreArchivedProject(rowId) {
    if (!archivedProjectRows.some((item) => item.id === rowId)) await loadArchivedProjectRows();
    const selected = archivedProjectRows.find((item) => item.id === rowId);
    if (!selected?.project_data) { showToast("Could not find the archived project snapshot."); return; }
    const snapshot = { ...selected.project_data };
    const { project_code, ...updateFields } = snapshot;
    const { data: existing, error: findError } = await window.supabaseClient.from("projects")
        .select("project_code").eq("project_code", selected.original_project_id).maybeSingle();
    if (findError) { showToast("Could not check the original project."); return; }
    let restoreError = null;
    if (existing) {
        const result = await window.supabaseClient.from("projects").update(updateFields).eq("project_code", selected.original_project_id);
        restoreError = result.error;
    } else {
        const result = await window.supabaseClient.from("projects").insert(snapshot);
        restoreError = result.error;
    }
    if (restoreError) { console.error("Archive restore failed:", restoreError); showToast("Restore failed. Check projects table permissions."); return; }
    const { error: removeError } = await window.supabaseClient.from("archived_projects").delete().eq("id", rowId);
    if (removeError) { console.error(removeError); showToast("Project restored, but its archive record could not be cleared."); return; }
    await renderAll();
    await renderArchivedProjects();
    goToTab("groups");
    showToast("Project restored to My Groups.");
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

        const studentsHtml = group.students.map((student) => {
            const initial =
                (student.name || "?").charAt(0).toUpperCase();

            return `
                <div class="student-row">

                    <div class="student-avatar">
                        ${initial}
                    </div>

                    <div class="student-info">
                        <strong>${student.name}</strong>
                        <span>${student.email}</span>
                    </div>

                </div>
            `;
        }).join("");

        const status =
            String(group.status || "proposed")
                .charAt(0)
                .toUpperCase() +
            String(group.status || "proposed").slice(1);

        return `
            <article class="group-card mentor-project-card">

                <div class="group-card-top">

                    <span class="project-code">
                        ${group.projectCode}
                    </span>

                    <span class="badge badge-ongoing">
                        ${status}
                    </span>

                </div>

                <div class="group-card-actions">
                    <button class="btn btn-secondary" type="button" data-project-archive="${String(group.projectCode).replace(/"/g, '&quot;')}">Archive project</button>
                    <button class="btn btn-danger" type="button" data-project-delete="${String(group.projectCode).replace(/"/g, '&quot;')}">Delete project</button>
                </div>

                <div class="group-card-body">

                    <h3 class="group-title">
                        ${group.title}
                    </h3>

                    ${
                        group.academicYear
                            ? `
                                <p class="project-meta">
                                    ${group.academicYear}
                                </p>
                              `
                            : ""
                    }

                    ${
                        group.description
                            ? `
                                <p class="project-description">
                                    ${group.description}
                                </p>
                              `
                            : ""
                    }

                    <div class="students-heading">
                        STUDENTS (${group.students.length}${group.populationCap ? ` / ${group.populationCap}` : ""})
                    </div>

                    <div class="student-list">
                        ${studentsHtml || `<p class="field-hint">No students have joined yet.</p>`}
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
        ${ilgcSharePointViewHtml(project.id, project.title)}
    `;

    modalOverlay.classList.remove("hidden");
}

/* Read-only view of the SharePoint workspace and report links saved in Supabase. */
function ilgcSharePointViewHtml(projectId, projectTitle = "") {
    let sharePoint = mentorSharePointData.get(String(projectId));
    if (!sharePoint && projectTitle) {
        const group = mentorGroups.find(item => item.title === projectTitle);
        if (group) sharePoint = mentorSharePointData.get(String(group.projectCode));
    }
    if (!sharePoint) return `<p class="modal-text">The team hasn't created a SharePoint workspace for this project yet.</p>`;

    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"}[ch]));
    const { workspace, files } = sharePoint;
    const workspaceLink = workspace.workspace_url
        ? `<p class="modal-text"><a class="sp-view-link" href="${esc(workspace.workspace_url)}" target="_blank" rel="noopener noreferrer">Open SharePoint workspace ↗</a></p>`
        : "";
    if (!files.length) return `${workspaceLink}<p class="modal-text">SharePoint created, but no reports have been posted yet.</p>`;

    return `${workspaceLink}<div class="sp-view-list">${files.map(file => {
        const date = file.added_at ? new Date(file.added_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
        const link = file.file_url
            ? `<a class="sp-view-link" href="${esc(file.file_url)}" target="_blank" rel="noopener noreferrer">Open report ↗</a>`
            : `<span class="sp-view-nolink">No file link</span>`;
        return `<div class="sp-view-item"><div><p class="sp-view-title">${esc(file.title || "Untitled report")}</p>${file.note ? `<p class="sp-view-note">${esc(file.note)}</p>` : ""}<p class="sp-view-meta">Added by ${esc(file.added_by || "Student")}${date ? ` · ${esc(date)}` : ""}</p></div>${link}</div>`;
    }).join("")}</div>`;
}


/* ======================================================
   RENDER: STUDENT INTEREST (institute-wide)
====================================================== */

/* ======================================================
   RENDER: STUDENT INTEREST
====================================================== */

function renderInterest() {
    const container =
        document.getElementById("interestTable");

    const empty =
        document.getElementById("interestEmpty");

    if (!container) return;

    const rows = mentorInterestData || [];

    if (rows.length === 0) {
        container.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    const esc = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const rowsHtml = rows.map((interest) => {

        const semester =
            interest.semester !== ""
                ? `Sem ${interest.semester}`
                : "—";

        return `
            <div class="itbl-row">

                <span class="itbl-student">
                    ${esc(interest.studentName)}
                </span>

                <span class="itbl-muted">
                    ${esc(semester)}
                </span>

                <span class="itbl-muted">
                    None
                </span>

                <span class="itbl-strong">
                    ${esc(interest.projectTitle)}
                </span>

                <span>
                    <span class="badge ${interestBadgeClass(interest.status)}">
                        ${esc(interest.status)}
                    </span>
                </span>

                <span class="itbl-action">
                    <button
                        class="itbl-view"
                        data-interest-view="${esc(interest.studentEmail)}|${esc(interest.projectCode)}">
                        View
                    </button>
                </span>

            </div>
        `;
    }).join("");

    container.classList.add("interest-tbl");

    container.innerHTML = `
        <div class="itbl-scroll">

            <div class="itbl-head">
                <span>Student</span>
                <span>Semester</span>
                <span>Current Project</span>
                <span>Interested In</span>
                <span>Status</span>
                <span class="itbl-action">Action</span>
            </div>

            ${rowsHtml}

        </div>
    `;

    injectInterestTableStyles();
}
function openInterestModal(studentEmail, projectCode) {

    const interest =
        mentorInterestData.find(
            (item) =>
                item.studentEmail === studentEmail &&
                item.projectCode === projectCode
        );

    if (!interest) return;

    const skills =
        Array.isArray(interest.skills) &&
        interest.skills.length
            ? interest.skills.join(", ")
            : "Not provided";

    const studentInterests =
        Array.isArray(interest.interests) &&
        interest.interests.length
            ? interest.interests.join(", ")
            : "Not provided";

    const submittedDate =
        interest.submittedAt
            ? new Date(
                interest.submittedAt
            ).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            })
            : "—";

    const esc = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const actions =
        interest.status === "Pending"
            ? `
                <button
                    class="btn btn-primary"
                    data-interest-accept="${esc(studentEmail)}|${esc(projectCode)}">
                    Accept
                </button>

                <button
                    class="btn btn-danger"
                    data-interest-reject="${esc(studentEmail)}|${esc(projectCode)}">
                    Reject
                </button>
            `
            : `
                <span class="badge ${interestBadgeClass(interest.status)}">
                    ${esc(interest.status)}
                </span>
            `;

    modalBody.innerHTML = `

        <p class="modal-eyebrow">
            Student interest
        </p>

        <h2 class="modal-title">
            ${esc(interest.studentName)}
        </h2>

        <div class="modal-meta-row">

            <div class="modal-meta-item">
                <span class="meta-label">
                    Semester
                </span>

                <span class="meta-value">
                    ${esc(interest.semester || "—")}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Program
                </span>

                <span class="meta-value">
                    ${esc(interest.program || "—")}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Roll number
                </span>

                <span class="meta-value">
                    ${esc(interest.rollNumber || "—")}
                </span>
            </div>

        </div>

        <p class="modal-section-label">
            Student email
        </p>

        <p class="modal-text">
            ${esc(interest.studentEmail)}
        </p>

        <p class="modal-section-label">
            Interested in
        </p>

        <p class="modal-text">
            <strong>${esc(interest.projectTitle)}</strong>
            <br>
            ${esc(interest.projectCode)}
        </p>

        <p class="modal-section-label">
            Skills
        </p>

        <p class="modal-text">
            ${esc(skills)}
        </p>

        <p class="modal-section-label">
            Interests
        </p>

        <p class="modal-text">
            ${esc(studentInterests)}
        </p>

        ${
            interest.message
                ? `
                    <p class="modal-section-label">
                        Student message
                    </p>

                    <p class="modal-text">
                        ${esc(interest.message)}
                    </p>
                `
                : ""
        }

        <p class="modal-section-label">
            Submitted
        </p>

        <p class="modal-text">
            ${esc(submittedDate)}
        </p>

        <div class="modal-actions">
            ${actions}
        </div>
    `;

    modalOverlay.classList.remove("hidden");
}

function injectInterestTableStyles() {
    if (document.getElementById("interestTableStyles")) return;
    const st = document.createElement("style");
    st.id = "interestTableStyles";
    st.textContent = `
        #interestTable.interest-tbl {
            margin-top: 28px;
            background: var(--surface, #fff);
            border: 1px solid var(--border, rgba(0,0,0,.08));
            border-radius: 14px;
            overflow: hidden;
            box-shadow: none;
            padding: 0;
            display: block;
        }
        .itbl-scroll { overflow-x: auto; }
        .itbl-head, .itbl-row {
            display: grid;
            grid-template-columns: 1.3fr .7fr 1.5fr 1.7fr .9fr .8fr;
            gap: 20px;
            align-items: center;
            padding: 0 28px;
            min-width: 900px;
        }
        .itbl-head {
            padding-top: 18px; padding-bottom: 18px;
            background: rgba(0,128,128,.04);
            border-bottom: 1px solid var(--border, rgba(0,0,0,.08));
            font-size: 11px; font-weight: 700; letter-spacing: .08em;
            text-transform: uppercase; color: #6b7f86;
        }
        .itbl-row {
            padding-top: 26px; padding-bottom: 26px;
            border-bottom: 1px solid var(--border, rgba(0,0,0,.08));
            font-size: 15px; line-height: 1.4;
        }
        .itbl-row:last-child { border-bottom: none; }
        .itbl-student { font-weight: 700; font-size: 16px; }
        .itbl-muted { color: #5b6b72; }
        .itbl-strong { font-weight: 700; }
        .itbl-action { text-align: right; }
        .itbl-view {
            border: none; cursor: pointer;
            padding: 9px 20px; border-radius: 999px;
            background: #eef1f2; color: inherit;
            font: inherit; font-size: 14px; font-weight: 600;
            transition: background .15s ease;
        }
        .itbl-view:hover { background: #dfe6e8; }
    `;
    document.head.appendChild(st);
}

async function acceptInterest(studentEmail, projectCode) {

    const { error } =
        await window.supabaseClient.rpc(
            "review_expression_of_interest",
            {
                p_student_email: studentEmail,
                p_project_code: projectCode,
                p_action: "accepted",
                p_comment: null
            }
        );

    if (error) {
        console.error(
            "Could not accept student interest:",
            error
        );

        showToast(
            "Could not accept this interest."
        );

        return;
    }

    const interest =
        mentorInterestData.find(
            (item) =>
                item.studentEmail === studentEmail &&
                item.projectCode === projectCode
        );

    showToast(
        `${interest?.studentName || "Student"} accepted onto the project ✓`
    );

    closeModal();

    await loadMentorGroups();
    await loadMentorSharePointData();
    await loadMentorInterests();

    renderAll();
}

async function rejectInterest(studentEmail, projectCode) {

    const { error } =
        await window.supabaseClient.rpc(
            "review_expression_of_interest",
            {
                p_student_email: studentEmail,
                p_project_code: projectCode,
                p_action: "rejected",
                p_comment: null
            }
        );

    if (error) {
        console.error(
            "Could not reject student interest:",
            error
        );

        showToast(
            "Could not reject this interest."
        );

        return;
    }

    const interest =
        mentorInterestData.find(
            (item) =>
                item.studentEmail === studentEmail &&
                item.projectCode === projectCode
        );

    showToast(
        `${interest?.studentName || "Student"}'s interest was declined.`
    );

    closeModal();

    await loadMentorInterests();

    renderAll();
}


/* ======================================================
   RENDER: PROJECT PROPOSALS (institute-wide ideas)
====================================================== */

/* ------------------------------------------------------
   PROPOSALS: loaded from Supabase (project_proposals).
   No placeholder ideas.
------------------------------------------------------ */
let supabaseProposals = [];

function statusLabel(raw) {
    return String(raw || "pending")
        .split(/[_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function parseProposalText(text) {
    const t = String(text || "");
    const m = t.match(/^Problem:\s*([\s\S]*?)\n\s*\nScope:\s*([\s\S]*)$/);
    return m ? { problem: m[1].trim(), scope: m[2].trim() } : { problem: t, scope: "" };
}

async function loadProposals() {
    const { data, error } = await window.supabaseClient
        .from("project_proposals")
        .select("*");

    if (error) {
        console.error("Could not load proposals:", error);
        supabaseProposals = [];
        return;
    }

    // Mentors only see ideas the ILGC faculty has already approved:
    //   approved / accepted / needs_revision, plus ideas the mentor rejected
    //   themselves (rejected AND mentor_reviewed_at is set).
    const rows = (data || []).filter((r) => {
        const st = String(r.status || "pending").toLowerCase();
        if (st === "approved" || st === "accepted" || st === "needs_revision") return true;
        if (st === "rejected" && r.mentor_reviewed_at) return true;
        return false;
    });
    const emails = [...new Set(rows.flatMap(( r) => [
        r.submitted_by, r.student_email, r.proposed_by, r.created_by, r.mentor_email, r.target_mentor_email
    ]).filter(Boolean))];

    let userRows = [];
    let semRows = [];
    if (emails.length > 0) {
        const { data: u } = await window.supabaseClient
            .from("users").select("email, name").in("email", emails);
        userRows = u || [];
        const { data: sp } = await window.supabaseClient
            .from("student_profiles").select("email, semester").in("email", emails);
        semRows = sp || [];
    }
    const nameByEmail = new Map(userRows.map((u) => [u.email, u.name]));
    const semByEmail = new Map(semRows.map((p) => [p.email, p.semester]));

    const { data: domainRows } = await window.supabaseClient
        .from("project_domains").select("domain_id, name");
    const domainNameById = new Map((domainRows || []).map((d) => [d.domain_id, d.name]));

    supabaseProposals = rows.map((r) => {
        const studentEmail = r.submitted_by || r.student_email || r.proposed_by || r.created_by || "";
        const mentorEmail = r.mentor_email || r.target_mentor_email || "";
        const idCol = ("proposal_id" in r) ? "proposal_id" : "id";
        const parsed = parseProposalText(r.description || r.problem_statement || "");
        return {
            id: String(r[idCol]),
            _idCol: idCol,
            _rawId: r[idCol],
            title: r.title || "Untitled idea",
            studentName: nameByEmail.get(studentEmail) || studentEmail || "A student",
            studentSemester: semByEmail.get(studentEmail) ?? "—",
            domain: domainNameById.get(r.domain_id) || r.domain || r.domain_name || "General",
            targetMentor: nameByEmail.get(mentorEmail) || mentorEmail || "a mentor",
            proposedDate: String(r.created_at || r.proposed_at || r.submitted_at || "").slice(0, 10),
            // 'approved' (by ILGC faculty) = waiting for the mentor's decision
            status: String(r.status || "").toLowerCase() === "approved" ? "Pending" : statusLabel(r.status),
            problemStatement: r.problem_statement || parsed.problem,
            scope: r.scope || parsed.scope,
            tags: Array.isArray(r.tags) ? r.tags : [],
            feedback: r.mentor_feedback || r.feedback || ""
        };
    });
    console.log("Proposals from Supabase:", supabaseProposals);
}

function getProposals() {
    return supabaseProposals;
}

/* ------------------------------------------------------
   REPORTS: there is no reports table in Supabase yet, so the
   hardcoded sample reports from data.js are NOT shown. Only
   reports added through "+ Add Report" (kept in this browser)
   appear here.
------------------------------------------------------ */
function getAllReports() {
    const overlay = loadReportOverlay();
    return (overlay.added || []).map((r) => ({
        ...r,
        comments: r.comments || [],
        history: r.history || []
    }));
}

let proposalsActiveStatus = "All";
let proposalsActiveDomain = "All";

function renderProposalsChips() {
    const statuses = ["All", ...IDEA_STATUSES];
    document.getElementById("proposalsStatusChips").innerHTML = statuses.map((status) => `
        <button class="chip" data-proposal-status="${status}" data-active="${status === proposalsActiveStatus}">${status}</button>
    `).join("");
}

function renderProposalsDomainFilter() {
    const domains = ["All", ...new Set(getProposals().map((i) => i.domain))];
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
    const ideas = getProposals()
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
    const idea = getProposals().find((i) => i.id === ideaId);
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

    document.getElementById("proposalDecisionForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const comment = document.getElementById("proposalComment").value.trim();

        const { error } = await window.supabaseClient
            .from("project_proposals")
            .update({
                status: decision.toLowerCase().replace(/\s+/g, "_"),
                mentor_feedback: comment || idea.feedback || "",
                mentor_reviewed_by: localStorage.getItem("userId") || null,
                mentor_reviewed_at: new Date().toISOString()
            })
            .eq(idea._idCol, idea._rawId);

        if (error) {
            console.error("Could not update proposal:", error);
            showToast("Could not save decision — check console");
            return;
        }

        await loadProposals();

        const toastMap = {
            Accepted: `"${idea.title}" accepted ✓`,
            Rejected: `"${idea.title}" rejected.`,
            "Needs Revision": `Feedback sent to ${idea.studentName} ✓`
        };
        showToast(toastMap[decision]);
        closeModal();
        renderProposalsDomainFilter();
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
    const container = document.getElementById("reportsTable");
    const empty = document.getElementById("reportsEmpty");

    if (!container || !empty) return;

    // Build reports from the SharePoint files saved in Supabase.
    const reports = [];

    if (typeof mentorSharePointData !== "undefined") {
        mentorSharePointData.forEach((data, projectCode) => {
            const project = mentorGroups.find(
                p => String(p.projectCode || p.id) === String(projectCode)
            );

            (data.files || []).forEach(file => {
                if (!file.link) return;

                reports.push({
                    id: file.id,
                    projectCode,
                    projectTitle: project?.title || data.workspace?.workspace_name || projectCode,
                    reportType: "SharePoint link",
                    title: file.title || "Untitled report",
                    submittedBy: file.addedBy || "Student",
                    submittedDate: file.addedAt || "",
                    status: "Submitted",
                    link: file.link
                });
            });
        });
    }

    const filteredReports = reports
        .filter(report =>
            reportsActiveStatus === "All" ||
            report.status === reportsActiveStatus
        )
        .sort((a, b) =>
            new Date(b.submittedDate || 0) -
            new Date(a.submittedDate || 0)
        );

    if (filteredReports.length === 0) {
        container.innerHTML = "";
        empty.textContent = reports.length === 0
            ? "No SharePoint reports have been submitted yet."
            : "No reports match this status.";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const rows = filteredReports.map(report => {
        const date = report.submittedDate
            ? new Date(report.submittedDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            })
            : "—";

        return `
            <div class="report-row">
                <span class="report-project">
                    ${report.projectTitle}
                </span>

                <span class="report-cell">
                    ${report.title}
                </span>

                <span class="report-cell">
                    ${report.submittedBy}
                </span>

                <span class="report-cell">
                    ${date}
                </span>

                <span>
                    <span class="badge ${reportBadgeClass(report.status)}">
                        ${report.status}
                    </span>
                </span>

                <span>
                    <a
                        class="btn btn-secondary"
                        href="${report.link}"
                        target="_blank"
                        rel="noopener noreferrer">
                        Open Report ↗
                    </a>
                </span>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="report-row head">
            <span>Project</span>
            <span>Report Title</span>
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

    const project = mentorGroups.find((p) => p.id === report.projectId) || {};
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

/* ======================================================
   CREATE PROJECT (with a population cap)
====================================================== */

function slugify(title) {
    const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${base || "project"}-${Date.now().toString(36).slice(-4)}`;
}

async function loadFormTags() {
    // The Project Tags list IS the project_domains table, so whatever the
    // faculty add/edit/delete there shows up here automatically - nothing hardcoded.
    const { data, error } = await window.supabaseClient
        .from("project_domains")
        .select("domain_id, name")
        .order("name");

    if (error) {
        console.error("Could not load project tags:", error);
        return [];
    }
    return (data || [])
        .filter((t) => t.domain_id && t.name)
        .map((t) => ({ id: t.domain_id, name: t.name }));
}

async function openCreateProjectModal() {
    const formTags = await loadFormTags();

    const tagPickerHtml = formTags.length
        ? `<div id="cpTags" style="display:flex;flex-wrap:wrap;gap:8px;">
               ${formTags.map((t) => `
                   <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #D7E5E3;border-radius:999px;font-size:13px;cursor:pointer;">
                       <input type="checkbox" name="cpTag" value="${t.id}"> ${t.name}
                   </label>`).join("")}
           </div>
           <p class="field-hint">Pick every tag that fits this project.</p>`
        : `<p class="field-hint">No project tags exist yet — the ILGC faculty can add them under Project Tags.</p>`;

    modalBody.innerHTML = `
        <p class="modal-eyebrow">Institute-wide project</p>
        <h2 class="modal-title">Create Project</h2>

        <form id="createProjectForm">
            <div class="modal-field">
                <label for="cpTitle">Project name</label>
                <input type="text" id="cpTitle" required placeholder="e.g. Smart Campus Water Metering">
            </div>

            <div class="modal-field">
                <label>Project tags</label>
                ${tagPickerHtml}
            </div>

            <div class="modal-field">
                <label for="cpStatus">Status</label>
                <select id="cpStatus">
                    ${GROUP_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>
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
                <label for="cpCap">Population cap</label>
                <input type="number" id="cpCap" required min="1" step="1" placeholder="e.g. 5">
                <p class="field-hint">The maximum number of students you can take on this project.</p>
            </div>

            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Create Project</button>
            </div>
        </form>
    `;

    modalOverlay.classList.remove("hidden");

    document.getElementById("createProjectForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating…";

        const title = document.getElementById("cpTitle").value.trim();
        const selectedTagIds = [...document.querySelectorAll('input[name="cpTag"]:checked')].map((c) => c.value);
        const selectedTags = formTags.filter((t) => selectedTagIds.includes(String(t.id)));
        const status = document.getElementById("cpStatus").value;
        const summary = document.getElementById("cpSummary").value.trim();
        const outcome = document.getElementById("cpOutcome").value.trim();
        const populationCap = Math.max(1, parseInt(document.getElementById("cpCap").value, 10) || 1);

        // Short unique code, e.g. MP4K9QZ
        const projectCode = "MP" + Date.now().toString(36).toUpperCase().slice(-5);

        // Main domain = first selected tag; ALL selected tags are linked below.
        const domainId = selectedTags.length ? selectedTags[0].id : null;

        const baseRow = {
            project_code: projectCode,
            title,
            description: summary,
            summary,
            expected_outcome: outcome,
            domain_id: domainId,
            status: status.toLowerCase(),
            progress: status === "Completed" ? 100 : status === "Ongoing" ? 10 : 0,
            academic_year: String(new Date().getFullYear()),
            created_by: userId
        };

        // Try with population_cap; if that column hasn't been added yet, retry without it.
        let { error } = await window.supabaseClient
            .from("projects")
            .insert({ ...baseRow, population_cap: populationCap });

        let capSaved = true;
        if (error && (error.code === "42703" || error.code === "PGRST204")) {
            capSaved = false;
            ({ error } = await window.supabaseClient.from("projects").insert(baseRow));
        }

        if (error) {
            console.error("Could not create project:", error);
            showToast("Could not create the project — check console");
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Project";
            return;
        }

        // Link every selected tag + this mentor (students' Discover tab reads these).
        if (selectedTags.length) {
            const { error: mapError } = await window.supabaseClient
                .from("project_domain_map")
                .insert(selectedTags.map((t) => ({ project_code: projectCode, domain_id: t.id })));
            if (mapError) console.error("Could not link project tags:", mapError);
        }

        const { error: mentorError } = await window.supabaseClient
            .from("project_mentors")
            .insert({ project_code: projectCode, mentor_email: userId });
        if (mentorError) console.error("Could not link project mentor:", mentorError);

        await loadProjectsFromSupabase();
        await loadMentorGroups();

        showToast(
            capSaved
                ? `Project created — now visible to all students (cap: ${populationCap}) ✓`
                : "Project created and visible to students — run the SQL migration to save the population cap"
        );
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

    mentorInterestData
        .filter((i) => i.status === "Pending")
        .forEach((i) => {
            notifications.push({
                icon: "👤",
                date: (i.submittedAt || "").slice(0, 10),
                text:
                    `<strong>${i.studentName}</strong> has expressed interest in ` +
                    `<strong>${i.projectTitle}</strong>.`
            });
        });

    getProposals()
        .filter((i) => i.status === "Pending")
        .forEach((i) => {
            notifications.push({
                icon: "💡",
                date: i.proposedDate,
                text: `A new project has been proposed in <strong>${i.domain}</strong> — "${i.title}".`
            });
        });

    getAllReports()
        .filter(
            (r) =>
                r.status === "Submitted" ||
                r.status === "Under Review" ||
                r.status === "Resubmitted"
        )
        .forEach((r) => {
            const project = mentorGroups.find((p) => p.id === r.projectId);

            notifications.push({
                icon: "📄",
                date: r.submittedDate,
                text: `${r.submittedBy} submitted a ${r.reportType.toLowerCase()} for <strong>${
                    project ? project.title : "a project"
                }</strong>`,
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

// "+ Add Report" removed from Group Reports
const addReportBtnEl = document.getElementById("addReportBtn");
if (addReportBtnEl) addReportBtnEl.remove();

document.addEventListener("click", (e) => {
    const archiveBtn = e.target.closest("[data-project-archive]");
    if (archiveBtn) { archiveMentorProject(archiveBtn.dataset.projectArchive); return; }
    const deleteBtn = e.target.closest("[data-project-delete]");
    if (deleteBtn) { deleteMentorProject(deleteBtn.dataset.projectDelete); return; }
    const unarchiveBtn = e.target.closest("[data-project-unarchive]");
    if (unarchiveBtn) { restoreArchivedProject(unarchiveBtn.dataset.projectUnarchive); return; }
    const restoreBtn = e.target.closest("[data-project-restore]");
    if (restoreBtn) { restoreDeletedProject(restoreBtn.dataset.projectRestore); return; }
    const gotoBtn = e.target.closest("[data-goto]");
    if (gotoBtn) { goToTab(gotoBtn.dataset.goto); return; }

    const groupOpen = e.target.closest("[data-group-open]");
    if (groupOpen) { openGroupDetailModal(groupOpen.dataset.groupOpen); return; }

    const interestView = e.target.closest("[data-interest-view]");
    if (interestView) {
        const [studentEmail, projectCode] =
    interestView.dataset.interestView.split("|");

openInterestModal(studentEmail, projectCode);
        return;
    }

    const interestAccept = e.target.closest("[data-interest-accept]");
    if (interestAccept) {
        const [studentEmail, projectCode] =
    interestAccept.dataset.interestAccept.split("|");

acceptInterest(studentEmail, projectCode);
        return;
    }

    const interestReject = e.target.closest("[data-interest-reject]");
    if (interestReject) {
        const [studentEmail, projectCode] =
    interestReject.dataset.interestReject.split("|");

rejectInterest(studentEmail, projectCode);
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

    // Load student SharePoint workspaces and report links
    await loadMentorSharePointData();

    await loadMentorInterests();
    await loadProposals();

    renderProposalsDomainFilter();
    renderHome();
    renderGroups();
    await renderDeletedProjects();
    await renderArchivedProjects();
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

