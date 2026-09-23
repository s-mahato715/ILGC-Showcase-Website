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
let discoverProjects = [];
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

    // 1. Get this student's active project memberships
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
        console.error(
            "Could not load student project memberships:",
            membershipError
        );
        return [];
    }

    console.log("Student project memberships:", memberships);

    if (!memberships || memberships.length === 0) {
        return [];
    }

    const projectCodes = [
        ...new Set(memberships.map((m) => m.project_code))
    ];

    // 2. Get project details
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
            "Could not load student projects:",
            projectsError
        );
        return [];
    }

    console.log("Student projects from Supabase:", projects);

    // 3. Get all students in these projects
    const { data: allMembers, error: membersError } =
        await window.supabaseClient
            .from("project_members")
            .select(`
                project_code,
                student_email,
                member_role,
                joined_at
            `)
            .in("project_code", projectCodes)
            .is("left_at", null);

    if (membersError) {
        console.error(
            "Could not load project teammates:",
            membersError
        );
        return [];
    }

    // 4. Get teammate names
    const studentEmails = [
        ...new Set(
            (allMembers || []).map((member) => member.student_email)
        )
    ];

    const { data: students, error: studentsError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", studentEmails);

    if (studentsError) {
        console.error(
            "Could not load teammate names:",
            studentsError
        );
    }

    const studentMap = new Map(
        (students || []).map((student) => [
            student.email,
            student
        ])
    );

    // 5. Convert Supabase data into the format
    //    the existing My Projects card expects
    return (projects || []).map((project) => {
        const members = (allMembers || [])
            .filter(
                (member) =>
                    member.project_code === project.project_code
            );

        const team = members.map((member) => ({
            name:
                studentMap.get(member.student_email)?.name ||
                member.student_email,
            email: member.student_email,
            role: member.member_role
        }));

        return {
            id: project.project_code,
            projectCode: project.project_code,

            title: project.title,
            summary:
                project.description ||
                project.summary ||
                "",

            expectedOutcome:
                project.expected_outcome || "",

            status:
                project.status
                    ? project.status.charAt(0).toUpperCase() +
                      project.status.slice(1)
                    : "Proposed",

            progress: project.progress ?? 0,

            cohort: project.academic_year || "",
            semester: project.semester || "",

            domain: "",
            mentor: "Faculty mentor",

            team
        };
    });
}

async function loadDiscoverProjects() {
    console.log("Loading Discover Projects from Supabase...");

    // --------------------------------------------------
    // 1. LOAD PROJECTS
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
            .order("project_code");

    if (projectsError) {
        console.error(
            "Could not load Discover Projects:",
            projectsError
        );

        discoverProjects = [];
        return;
    }

    console.log("Projects from Supabase:", projects);

    if (!projects || projects.length === 0) {
        discoverProjects = [];
        return;
    }

    const projectCodes = projects.map(
        (project) => project.project_code
    );

    // --------------------------------------------------
// 2. LOAD DOMAINS
//    projects → project_domain_map → project_domains
// --------------------------------------------------

let domainMappings = [];
let domains = [];

// Get project ↔ domain relationships
const { data: mappingData, error: mappingError } =
    await window.supabaseClient
        .from("project_domain_map")
        .select("project_code, domain_id")
        .in("project_code", projectCodes);

if (mappingError) {
    console.error(
        "Could not load project-domain mappings:",
        mappingError
    );
} else {
    domainMappings = mappingData || [];
}

console.log(
    "Project-domain mappings from Supabase:",
    domainMappings
);

// Get the unique domain IDs
const domainIds = [
    ...new Set(
        domainMappings
            .map((mapping) => mapping.domain_id)
            .filter(Boolean)
    )
];

// Get domain names
if (domainIds.length > 0) {
    const { data: domainData, error: domainError } =
        await window.supabaseClient
            .from("project_domains")
            .select("domain_id, name")
            .in("domain_id", domainIds);

    if (domainError) {
        console.error(
            "Could not load project domains:",
            domainError
        );
    } else {
        domains = domainData || [];
    }
}

console.log(
    "Project domains from Supabase:",
    domains
);

// domain_id → domain name
const domainMap = new Map(
    domains.map((domain) => [
        domain.domain_id,
        domain.name
    ])
);

// project_code → array of domain names
const projectDomainMap = new Map();

domainMappings.forEach((mapping) => {
    const domainName = domainMap.get(mapping.domain_id);

    if (!domainName) return;

    if (!projectDomainMap.has(mapping.project_code)) {
        projectDomainMap.set(mapping.project_code, []);
    }

    projectDomainMap
        .get(mapping.project_code)
        .push(domainName);
});

// Add the domain array to each project
projects.forEach((project) => {
    project.domains =
        projectDomainMap.get(project.project_code) || [];
});

// Create Domain filter options
DOMAINS = [
    "All",
    ...new Set(
        projects.flatMap(
            (project) => project.domains
        )
    )
];

console.log(
    "Final Domain filters:",
    DOMAINS
);

    // --------------------------------------------------
    // 3. LOAD PROJECT MENTORS
    // --------------------------------------------------

    const { data: mentorAssignments, error: mentorError } =
        await window.supabaseClient
            .from("project_mentors")
            .select(`
                project_code,
                mentor_email,
                mentor_role
            `)
            .in("project_code", projectCodes);

    if (mentorError) {
        console.error(
            "Could not load project mentors:",
            mentorError
        );
    }

    console.log(
        "Project mentor assignments:",
        mentorAssignments
    );

    const mentorEmails = [
        ...new Set(
            (mentorAssignments || [])
                .map((mentor) => mentor.mentor_email)
                .filter(Boolean)
        )
    ];

    // --------------------------------------------------
    // 4. LOAD MENTOR NAMES
    // --------------------------------------------------

    let mentors = [];

    if (mentorEmails.length > 0) {
        const { data: mentorUsers, error: mentorUsersError } =
            await window.supabaseClient
                .from("users")
                .select("email, name")
                .in("email", mentorEmails);

        if (mentorUsersError) {
            console.error(
                "Could not load mentor names:",
                mentorUsersError
            );
        } else {
            mentors = mentorUsers || [];
        }
    }

    console.log(
        "Mentors from Supabase:",
        mentors
    );

    const mentorMap = new Map(
        mentors.map((mentor) => [
            mentor.email,
            mentor.name
        ])
    );

    // --------------------------------------------------
    // 5. COMBINE EVERYTHING
    // --------------------------------------------------

    discoverProjects = projects.map((project) => {

        const projectMentors =
            (mentorAssignments || [])
                .filter(
                    (assignment) =>
                        assignment.project_code ===
                        project.project_code
                )
                .map(
                    (assignment) =>
                        mentorMap.get(
                            assignment.mentor_email
                        ) || assignment.mentor_email
                );

        const mentorNames = [
            ...new Set(
                projectMentors.filter(Boolean)
            )
        ];

        return {
            id: project.project_code,

            projectCode: project.project_code,

            title: project.title,

            summary:
                project.description ||
                project.summary ||
                "",

            expectedOutcome:
                project.expected_outcome || "",

            status:
                project.status
                    ? project.status.charAt(0).toUpperCase() +
                      project.status.slice(1)
                    : "Proposed",

            progress: project.progress ?? 0,

            cohort: project.academic_year || "",

            semester: project.semester || "",

            domains:
               project.domains || [],

            domain:
               (project.domains && project.domains.length > 0)
               ? project.domains.join(" · ")
               : "Other",
                
                

            mentor:
                mentorNames.length > 0
                    ? mentorNames.join(", ")
                    : "Faculty mentor",

            origin: "faculty"
        };
    });

    console.log(
        "Final Discover Projects:",
        discoverProjects
    );
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
let DOMAINS = ["All"];

let activeStatus = "All";
let activeDomain = "All";
let activeMentor = "All";
let searchTerm = "";

function matchesFilters(project) {
    const projectStatus =
        String(project.status || "").trim().toLowerCase();

    const selectedStatus =
        String(activeStatus || "").trim().toLowerCase();

    const projectDomains = (project.domains || [])
    .map((domain) =>
        String(domain).trim().toLowerCase()
    );

    const selectedDomain =
       String(activeDomain || "").trim().toLowerCase();

    const projectMentor =
        String(project.mentor || "").trim().toLowerCase();

    const selectedMentor =
        String(activeMentor || "").trim().toLowerCase();

    const statusMatch =
        activeStatus === "All" ||
        projectStatus === selectedStatus;

   const domainMatch =
      activeDomain === "All" ||
      projectDomains.includes(selectedDomain);

    const mentorMatch =
        activeMentor === "All" ||
        projectMentor === selectedMentor;

    const term = searchTerm.toLowerCase();

    const searchMatch =
        !term ||
        String(project.title || "").toLowerCase().includes(term) ||
        String(project.summary || "").toLowerCase().includes(term) ||
        String(project.domain || "").toLowerCase().includes(term) ||
        String(project.mentor || "").toLowerCase().includes(term);

    return (
        statusMatch &&
        domainMatch &&
        mentorMatch &&
        searchMatch
    );
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
    return [
        "All",
        ...[
            ...new Set(
                discoverProjects
                    .map((p) => p.mentor)
                    .filter(Boolean)
            )
        ].sort()
    ];
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
    const filtered = discoverProjects.filter(matchesFilters);
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
    const teammates = (project.team || []).filter(
        (member) => member.email !== userId
    );

    const teamHtml = teammates.length
        ? `
            <div class="modal-team">
                ${teammates.map((member) => `
                    <span class="team-chip">
                        ${member.name}
                    </span>
                `).join("")}
            </div>
        `
        : `
            <p class="empty-panel">
                You're the only student on this project so far.
            </p>
        `;

    return `
        <article class="mp-card">

            <div class="mp-card-top">
                <span class="project-domain">
                    ${project.projectCode}
                </span>

                <span class="badge ${statusBadgeClass(project.status)}">
                    ${project.status}
                </span>
            </div>

            <h2 class="mp-title">
                ${project.title}
            </h2>

            <p class="mp-summary">
                ${project.summary}
            </p>

            <div class="mp-meta-grid">

                <div class="mp-meta-item">
                    <span class="meta-label">
                        Academic year
                    </span>

                    <span class="meta-value">
                        ${project.cohort || "—"}
                    </span>
                </div>

                <div class="mp-meta-item">
                    <span class="meta-label">
                        Semester
                    </span>

                    <span class="meta-value">
                        ${project.semester || "—"}
                    </span>
                </div>

                <div class="mp-meta-item">
                    <span class="meta-label">
                        Progress
                    </span>

                    <span class="meta-value">
                        ${project.progress}%
                    </span>
                </div>

            </div>

            <div class="progress-track" style="margin-bottom:20px;">
                <div
                    class="progress-fill"
                    style="width:${project.progress}%"
                ></div>
            </div>

            <p class="mp-block-title">
                Teammates
            </p>

            ${teamHtml}

            <p
                class="mp-block-title"
                style="margin-top:22px;"
            >
                Project outcome
            </p>

            <p class="mp-summary">
                ${project.expectedOutcome || "Not specified yet."}
            </p>

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

    await loadDiscoverProjects();

    renderDiscoverChips();
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
