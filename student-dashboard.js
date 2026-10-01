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
let studentInterests = [];
let mentorData = [];
let domainData = [];
let ideaData = [];
let currentProject = null;


/* ======================================================
   STUDENT PROFILE
====================================================== */

async function loadStudentProfile() {
    if (!window.supabaseClient || !userId) return;

    const { data: user, error: userError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .eq("email", userId)
            .maybeSingle();

    if (userError) {
        console.error("Could not load student user:", userError);
    }

    if (user) {
        studentName = user.name || "Student";
    }

    const { data: profile, error: profileError } =
        await window.supabaseClient
            .from("student_profiles")
            .select(`
                email,
                roll_number,
                program,
                department,
                semester,
                admission_year,
                graduation_year,
                bio,
                skills,
                interests,
                github_url,
                linkedin_url,
                portfolio_url
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

    if (profile) {
        studentSemester = profile.semester || "";
        studentProgram = profile.program || "";
        studentDepartment = profile.department || "";
        studentRollNumber = profile.roll_number || "";
    }

    updateStudentProfileUI();
}


/* ======================================================
   UPDATE STUDENT PROFILE UI
====================================================== */

function updateStudentProfileUI() {
    const nameElements = document.querySelectorAll(
        "[data-student-name]"
    );

    nameElements.forEach((element) => {
        element.textContent = studentName;
    });

    const semesterElements = document.querySelectorAll(
        "[data-student-semester]"
    );

    semesterElements.forEach((element) => {
        element.textContent = studentSemester;
    });

    const programElements = document.querySelectorAll(
        "[data-student-program]"
    );

    programElements.forEach((element) => {
        element.textContent = studentProgram;
    });

    const departmentElements = document.querySelectorAll(
        "[data-student-department]"
    );

    departmentElements.forEach((element) => {
        element.textContent = studentDepartment;
    });

    const rollElements = document.querySelectorAll(
        "[data-student-roll]"
    );

    rollElements.forEach((element) => {
        element.textContent = studentRollNumber;
    });
}


/* ======================================================
   EXPRESSIONS OF INTEREST
====================================================== */

async function loadStudentInterests() {
    studentInterests = [];

    if (!window.supabaseClient || !userId) {
        return;
    }

    const { data, error } =
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
            .eq("student_email", userId);

    if (error) {
        console.error(
            "Could not load student expressions of interest:",
            error
        );
        return;
    }

    studentInterests = data || [];
}


/* ======================================================
   LOAD STUDENT PROJECTS
====================================================== */

async function loadStudentProjects() {
    if (!window.supabaseClient || !userId) {
        return [];
    }

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

    const projectCodes = (memberships || [])
        .map((item) => item.project_code)
        .filter(Boolean);

    if (projectCodes.length === 0) {
        return [];
    }

    const { data: projects, error: projectsError } =
        await window.supabaseClient
            .from("projects")
            .select(`
                project_code,
                title,
                description,
                summary,
                expected_outcome,
                domain_id,
                status,
                progress,
                academic_year,
                image_url,
                created_by,
                created_at,
                updated_at,
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

    return (projects || []).map((project) => {
        const membership = memberships.find(
            (item) =>
                item.project_code === project.project_code
        );

        return {
            ...project,
            projectCode: project.project_code,
            projectId: project.project_code,
            memberRole: membership?.member_role || "student",
            joinedAt: membership?.joined_at || null
        };
    });
}


/* ======================================================
   DISCOVER PROJECTS
====================================================== */

async function loadDiscoverProjects() {
    if (!window.supabaseClient) {
        return [];
    }

    const { data, error } =
        await window.supabaseClient
            .from("projects")
            .select(`
                project_code,
                title,
                description,
                summary,
                expected_outcome,
                domain_id,
                status,
                progress,
                academic_year,
                image_url,
                created_by,
                created_at,
                updated_at,
                semester
            `)
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(
            "Could not load discover projects:",
            error
        );
        return [];
    }

    return data || [];
}


/* ======================================================
   SHAREPOINT WORKSPACES
   Stored in Supabase:
   project_workspaces
   workspace_files
====================================================== */

let projectWorkspaceData = {};

async function loadProjectWorkspaces(projectCodes) {
    projectWorkspaceData = {};

    if (!projectCodes || projectCodes.length === 0) {
        return;
    }

    const { data: workspaces, error: workspaceError } =
        await window.supabaseClient
            .from("project_workspaces")
            .select(`
                workspace_id,
                project_code,
                workspace_name,
                workspace_url,
                provider,
                created_by,
                created_at,
                updated_at
            `)
            .in("project_code", projectCodes);

    if (workspaceError) {
        console.error(
            "Could not load project workspaces:",
            workspaceError
        );
        return;
    }

    const workspaceIds = (workspaces || [])
        .map((workspace) => workspace.workspace_id)
        .filter(Boolean);

    let files = [];

    if (workspaceIds.length > 0) {
        const { data: fileRows, error: filesError } =
            await window.supabaseClient
                .from("workspace_files")
                .select(`
                    file_id,
                    workspace_id,
                    title,
                    note,
                    file_url,
                    file_name,
                    file_type,
                    file_size,
                    added_by,
                    added_at
                `)
                .in("workspace_id", workspaceIds)
                .order("added_at", {
                    ascending: false
                });

        if (filesError) {
            console.error(
                "Could not load workspace files:",
                filesError
            );
        } else {
            files = fileRows || [];
        }
    }

    (workspaces || []).forEach((workspace) => {
        projectWorkspaceData[workspace.project_code] = {
            workspace,
            files: files.filter(
                (file) =>
                    file.workspace_id === workspace.workspace_id
            )
        };
    });
}

/* ======================================================
   SHAREPOINT HTML
====================================================== */

function sharePointHtml(project) {
    const projectCode =
        project.projectCode || project.project_code;

    const workspaceData =
        projectWorkspaceData[projectCode];

    if (!workspaceData || !workspaceData.workspace) {
        return `
            <div class="sharepoint-section">
                <div class="sharepoint-header">
                    <div>
                        <h4>Project Workspace</h4>
                        <p>Create a SharePoint workspace for this project.</p>
                    </div>

                    <button
                        type="button"
                        class="btn-primary"
                        data-sp-create="${projectCode}"
                    >
                        Create SharePoint
                    </button>
                </div>
            </div>
        `;
    }

    const workspace = workspaceData.workspace;
    const files = workspaceData.files || [];

    const filesHtml = files.length
        ? files.map((file) => `
            <div class="sharepoint-file">
                <div class="sharepoint-file-info">
                    <a
                        href="${escapeHtml(file.file_url || "#")}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHtml(file.title || file.file_name || "File")}
                    </a>

                    ${
                        file.note
                            ? `<p>${escapeHtml(file.note)}</p>`
                            : ""
                    }

                    <small>
                        Added by ${escapeHtml(file.added_by || "Student")}
                        ${
                            file.added_at
                                ? ` · ${formatDate(file.added_at)}`
                                : ""
                        }
                    </small>
                </div>

                <button
                    type="button"
                    class="btn-secondary"
                    data-sp-remove="${projectCode}|${file.file_id}"
                >
                    Remove
                </button>
            </div>
        `).join("")
        : `
            <div class="sharepoint-empty">
                No files added yet.
            </div>
        `;

    return `
        <div class="sharepoint-section">

            <div class="sharepoint-header">
                <div>
                    <h4>
                        ${escapeHtml(
                            workspace.workspace_name ||
                            "Project Workspace"
                        )}
                    </h4>

                    <p>
                        SharePoint workspace
                    </p>
                </div>

                ${
                    workspace.workspace_url
                        ? `
                            <a
                                href="${escapeHtml(workspace.workspace_url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn-primary"
                            >
                                Open SharePoint
                            </a>
                        `
                        : ""
                }
            </div>

            <div class="sharepoint-files">
                ${filesHtml}
            </div>

            <form
                class="sharepoint-add-form"
                data-sp-form="${projectCode}"
            >
                <input
                    type="text"
                    name="title"
                    placeholder="File title"
                    required
                />

                <input
                    type="url"
                    name="link"
                    placeholder="SharePoint file URL"
                    required
                />

                <input
                    type="text"
                    name="note"
                    placeholder="Short note (optional)"
                />

                <button
                    type="submit"
                    class="btn-primary"
                >
                    Add File
                </button>
            </form>

        </div>
    `;
}


/* ======================================================
   CREATE SUPABASE SHAREPOINT WORKSPACE
====================================================== */

async function createSupabaseWorkspace(projectCode) {
    if (!projectCode) return;

    const existing =
        projectWorkspaceData[projectCode]?.workspace;

    if (existing) {
        showToast("Workspace already exists.");
        return;
    }

    const project = studentProjects.find(
        (item) => item.projectCode === projectCode
    );

    if (!project) {
        showToast("Project not found.");
        return;
    }

    const { error } =
        await window.supabaseClient
            .from("project_workspaces")
            .insert({
                project_code: projectCode,
                workspace_name: `${project.title} workspace`,
                provider: "sharepoint",
                created_by: userId
            });

    if (error) {
        console.error(
            "Could not create SharePoint workspace:",
            error
        );

        showToast(
            "Could not create SharePoint workspace."
        );

        return;
    }

    await loadProjectWorkspaces(
        studentProjects.map(
            (item) => item.projectCode
        )
    );

    showToast(
        "SharePoint workspace created ✓"
    );

    renderMyProjectsFull();
}


/* ======================================================
   ADD FILE TO SUPABASE SHAREPOINT WORKSPACE
====================================================== */

async function addSupabaseWorkspaceFile(
    projectCode,
    { title, note, link }
) {
    const workspace =
        projectWorkspaceData[projectCode]?.workspace;

    if (!workspace) {
        showToast(
            "Create the SharePoint workspace first."
        );
        return;
    }

    const { error } =
        await window.supabaseClient
            .from("workspace_files")
            .insert({
                workspace_id: workspace.workspace_id,
                title: title,
                note: note || null,
                file_url: link,
                added_by: userId
            });

    if (error) {
        console.error(
            "Could not add workspace file:",
            error
        );

        showToast(
            "Could not add the file."
        );

        return;
    }

    await loadProjectWorkspaces(
        studentProjects.map(
            (item) => item.projectCode
        )
    );

    showToast(
        "File added ✓"
    );

    renderMyProjectsFull();
}


/* ======================================================
   REMOVE FILE FROM SUPABASE SHAREPOINT WORKSPACE
====================================================== */

async function removeSupabaseWorkspaceFile(
    projectCode,
    fileId
) {
    if (!fileId) return;

    const { error } =
        await window.supabaseClient
            .from("workspace_files")
            .delete()
            .eq("file_id", fileId);

    if (error) {
        console.error(
            "Could not remove workspace file:",
            error
        );

        showToast(
            "Could not remove the file."
        );

        return;
    }

    await loadProjectWorkspaces(
        studentProjects.map(
            (item) => item.projectCode
        )
    );

    showToast(
        "File removed."
    );

    renderMyProjectsFull();
}


/* ======================================================
   HELPERS
====================================================== */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


/* ======================================================
   EXPRESS INTEREST
====================================================== */

async function submitInterest(projectId) {
    if (!projectId || !userId) {
        return;
    }

    const existing = studentInterests.find(
        (interest) =>
            interest.project_code === projectId
    );

    if (existing) {
        showToast(
            `Interest already ${existing.status}.`
        );
        return;
    }

    const { error } =
        await window.supabaseClient
            .from("expressions_of_interest")
            .insert({
                student_email: userId,
                project_code: projectId,
                status: "pending"
            });

    if (error) {
        console.error(
            "Could not submit expression of interest:",
            error
        );

        showToast(
            "Could not submit your interest."
        );

        return;
    }

    await loadStudentInterests();

    showToast(
        "Expression of interest submitted ✓"
    );

    renderDiscoverProjects();
}


/* ======================================================
   PROJECT ACTION BUTTON
====================================================== */

function actionButtonHtml(project) {
    const projectCode =
        project.projectCode ||
        project.project_code;

    const interest =
        studentInterests.find(
            (item) =>
                item.project_code === projectCode
        );

    if (!interest) {
        return `
            <button
                type="button"
                class="btn-primary"
                data-express-interest="${projectCode}"
            >
                Express Interest
            </button>
        `;
    }

    if (interest.status === "pending") {
        return `
            <button
                type="button"
                class="btn-secondary"
                disabled
            >
                Pending
            </button>
        `;
    }

    if (interest.status === "accepted") {
        return `
            <button
                type="button"
                class="btn-secondary"
                disabled
            >
                Accepted
            </button>
        `;
    }

    if (interest.status === "rejected") {
        return `
            <button
                type="button"
                class="btn-secondary"
                disabled
            >
                Rejected
            </button>
        `;
    }

    return "";
}


/* ======================================================
   PROJECT CARD
====================================================== */

function projectCardHtml(project) {
    const projectCode =
        project.projectCode ||
        project.project_code;

    return `
        <article
            class="project-card"
            data-project-code="${escapeHtml(projectCode)}"
        >

            ${
                project.image_url
                    ? `
                        <img
                            src="${escapeHtml(project.image_url)}"
                            alt="${escapeHtml(project.title || "Project")}"
                            class="project-card-image"
                        />
                    `
                    : ""
            }

            <div class="project-card-content">

                <h3>
                    ${escapeHtml(
                        project.title ||
                        "Untitled Project"
                    )}
                </h3>

                ${
                    project.summary ||
                    project.description
                        ? `
                            <p>
                                ${escapeHtml(
                                    project.summary ||
                                    project.description
                                )}
                            </p>
                        `
                        : ""
                }

                <div class="project-card-meta">

                    ${
                        project.status
                            ? `
                                <span>
                                    ${escapeHtml(
                                        project.status
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        project.semester
                            ? `
                                <span>
                                    Semester ${escapeHtml(
                                        project.semester
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>

                <div class="project-card-actions">
                    ${actionButtonHtml(project)}
                </div>

            </div>

        </article>
    `;
}

/* ======================================================
   RENDER: MY PROJECTS
====================================================== */

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

        if (link) {
            link.addEventListener(
                "click",
                (e) => goToTab(e.target.dataset.goto)
            );
        }

        return;
    }

    container.innerHTML = projects
        .map(myProjectFullCardHtml)
        .join("");
}


/* ======================================================
   MODAL
====================================================== */

const modalOverlay =
    document.getElementById("modalOverlay");

const modalBody =
    document.getElementById("modalBody");


function openModal(projectId) {
    const project =
        getAllProjects().find(
            (p) => p.id === projectId
        );

    if (!project) return;

    const teamHtml = project.team.length
        ? `
            <div class="modal-team">
                ${
                    project.team
                        .map(
                            (m) =>
                                `<span class="team-chip">${m.name} · Sem ${m.semester} · ${yearFromSemester(m.semester)}</span>`
                        )
                        .join("")
                }
            </div>
        `
        : `
            <p class="modal-text">
                No students assigned to this project yet.
            </p>
        `;

    const profEmail =
        facultyEmail(project.mentor);

    modalBody.innerHTML = `
        <p class="modal-eyebrow">
            ${project.domain} · ${project.status}
        </p>

        <h2 class="modal-title">
            ${project.title}
        </h2>

        <div style="margin-bottom:16px;">
            <span class="origin-badge origin-${project.origin || "faculty"}">
                ${projectOriginLabel(project)}
            </span>
        </div>

        <div class="modal-meta-row">

            <div class="modal-meta-item">
                <span class="meta-label">
                    Mentor
                </span>

                <span class="meta-value">
                    ${project.mentor}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Cohort
                </span>

                <span class="meta-value">
                    ${project.cohort}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Progress
                </span>

                <span class="meta-value">
                    ${project.progress}%
                </span>
            </div>

        </div>

        <p class="modal-section-label">
            Overview
        </p>

        <p class="modal-text">
            ${project.summary}
        </p>

        <p class="modal-section-label">
            Expected outcome
        </p>

        <p class="modal-text">
            ${project.expectedOutcome}
        </p>

        <p class="modal-section-label">
            Current team
        </p>

        ${teamHtml}

        <p class="modal-section-label">
            Contact the professor
        </p>

        <div class="contact-prof">

            <span class="contact-prof-email">
                ${profEmail}
            </span>

            <button
                class="btn btn-secondary btn-small"
                data-email-prof="${project.id}"
            >
                ✉ Email ${project.mentor}
            </button>

        </div>

        <div class="modal-actions">
            ${actionButtonHtml(project)}
        </div>
    `;

    modalOverlay.classList.remove("hidden");
}


/* ======================================================
   EMAIL PROFESSOR
====================================================== */

function emailProfessor(projectId) {
    const project =
        getAllProjects().find(
            (p) => p.id === projectId
        );

    if (!project) return;

    const to =
        facultyEmail(project.mentor);

    const subject =
        `ILGC — question about "${project.title}"`;

    const body =
        `Dear ${project.mentor},\n\n` +
        `I'm interested in your ILGC project "${project.title}" and would like to know more. ` +
        `Would you have some time to discuss it?\n\n` +
        `Thank you,\n${studentName}`;

    const outlookUrl =
        `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}` +
        `&subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;

    const win =
        window.open(
            outlookUrl,
            "_blank",
            "noopener"
        );

    if (!win) {
        window.location.href =
            `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    showToast(
        `Opening email to ${project.mentor} ✉`
    );
}


function closeModal() {
    modalOverlay.classList.add("hidden");
}


document
    .getElementById("modalClose")
    .addEventListener(
        "click",
        closeModal
    );


modalOverlay.addEventListener(
    "click",
    (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    }
);


document.addEventListener(
    "keydown",
    (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    }
);


/* ======================================================
   EVENT DELEGATION
====================================================== */

document
    .getElementById("statusChips")
    .addEventListener("click", (e) => {

        const btn =
            e.target.closest("[data-status]");

        if (!btn) return;

        activeStatus =
            btn.dataset.status;

        renderDiscoverChips();
        renderDiscover();
    });


document
    .getElementById("domainChips")
    .addEventListener("click", (e) => {

        const btn =
            e.target.closest(
                "[data-domain-filter]"
            );

        if (!btn) return;

        activeDomain =
            btn.dataset.domainFilter;

        renderDiscoverChips();
        renderDiscover();
    });


document
    .getElementById("discoverSearch")
    .addEventListener(
        "input",
        (e) => {
            searchTerm =
                e.target.value.trim();

            renderDiscover();
        }
    );


document
    .getElementById("discoverMentorSelect")
    .addEventListener(
        "change",
        (e) => {
            activeMentor =
                e.target.value;

            renderDiscover();
        }
    );


/* ======================================================
   DOCUMENT CLICK HANDLER
====================================================== */

document.addEventListener(
    "click",
    async (e) => {

        const expressBtn =
            e.target.closest("[data-express]");

        if (expressBtn) {
            submitInterest(
                expressBtn.dataset.express
            );

            return;
        }


        const emailProf =
            e.target.closest(
                "[data-email-prof]"
            );

        if (emailProf) {
            emailProfessor(
                emailProf.dataset.emailProf
            );

            return;
        }


        const openBtn =
            e.target.closest("[data-open]");

        if (openBtn) {
            openModal(
                openBtn.dataset.open
            );

            return;
        }


        /* ----------------------------------------------
           SHAREPOINT: CREATE WORKSPACE
        ---------------------------------------------- */

        const spCreate =
            e.target.closest(
                "[data-sp-create]"
            );

        if (spCreate) {

            await createSupabaseWorkspace(
                spCreate.dataset.spCreate
            );

            return;
        }


        /* ----------------------------------------------
           SHAREPOINT: REMOVE FILE
        ---------------------------------------------- */

        const spRemove =
            e.target.closest(
                "[data-sp-remove]"
            );

        if (spRemove) {

            const [
                projectCode,
                fileId
            ] =
                spRemove.dataset.spRemove
                    .split("|");

            await removeSupabaseWorkspaceFile(
                projectCode,
                fileId
            );

            return;
        }
    }
);


/* ======================================================
   SHAREPOINT FILE FORM SUBMISSION
====================================================== */

document.addEventListener(
    "submit",
    async (e) => {

        const form =
            e.target.closest(
                "[data-sp-form]"
            );

        if (!form) return;

        e.preventDefault();

        const projectCode =
            form.dataset.spForm;

        const title =
            form
                .querySelector("[data-sp-title]")
                .value
                .trim();

        const note =
            form
                .querySelector("[data-sp-note]")
                .value
                .trim();

        const link =
            form
                .querySelector("[data-sp-link]")
                .value
                .trim();

        if (!title) {
            showToast(
                "Please enter a report title."
            );

            return;
        }

        await addSupabaseWorkspaceFile(
            projectCode,
            {
                title,
                note,
                link
            }
        );
    }
);

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

/* ------------------------------------------------------
   Mentors, domains and ideas now come from Supabase.
   No placeholder data.
------------------------------------------------------ */
let floatMentors = [];   // [{ email, name }]
let floatDomains = [];   // ["AI / ML", ...]
let supabaseIdeas = [];  // ideas loaded from project_proposals

// If your project_proposals column names differ, change them here.
function buildProposalRow(f) {
    return {
        title: f.title,
        description: `Problem: ${f.problem}\n\nScope: ${f.scope}`,
        domain: f.domain,
        tags: f.tags,
        student_email: userId,
        mentor_email: f.mentorEmail,
        status: "pending"
    };
}

async function loadFloatMentors() {
    const { data: profiles, error } =
        await window.supabaseClient
            .from("mentor_profiles")
            .select("*");

    if (error) {
        console.error(
            "Could not load mentors:",
            error
        );

        floatMentors = [];
        return;
    }

    const rows = (profiles || [])
        .map((r) => ({
            email:
                r.email ||
                r.mentor_email ||
                r.user_email ||
                "",

            fallbackName:
                r.name ||
                r.full_name ||
                ""
        }))
        .filter((r) => r.email);

    let userRows = [];

    if (rows.length > 0) {
        const { data } =
            await window.supabaseClient
                .from("users")
                .select("email, name")
                .in(
                    "email",
                    rows.map((r) => r.email)
                );

        userRows = data || [];
    }

    const nameByEmail =
        new Map(
            userRows.map(
                (u) => [u.email, u.name]
            )
        );

    floatMentors = rows
        .map((r) => ({
            email: r.email,

            name:
                nameByEmail.get(r.email) ||
                r.fallbackName ||
                r.email
        }))
        .sort(
            (a, b) =>
                a.name.localeCompare(b.name)
        );

    console.log(
        "Mentors for Float an Idea:",
        floatMentors
    );
}


async function loadFloatDomains() {
    const { data, error } =
        await window.supabaseClient
            .from("project_domains")
            .select("name")
            .order("name");

    if (error) {
        console.error(
            "Could not load domains:",
            error
        );

        floatDomains = [];
        return;
    }

    floatDomains = [
        ...new Set(
            (data || [])
                .map((d) => d.name)
                .filter(Boolean)
        )
    ];
}


function mapProposalRow(
    r,
    nameByEmail
) {
    const mentorEmail =
        r.mentor_email ||
        r.target_mentor_email ||
        "";

    const studentEmail =
        r.student_email ||
        r.proposed_by ||
        r.created_by ||
        "";

    const status =
        String(
            r.status || "pending"
        );

    return {
        id:
            r.proposal_id ??
            r.id ??
            `${studentEmail}-${r.created_at}`,

        title:
            r.title ||
            "Untitled idea",

        studentUserId:
            studentEmail,

        studentName:
            nameByEmail.get(studentEmail) ||
            studentEmail ||
            "A student",

        domain:
            r.domain ||
            r.domain_name ||
            "General",

        targetMentor:
            nameByEmail.get(mentorEmail) ||
            mentorEmail ||
            "a mentor",

        proposedDate:
            String(
                r.created_at ||
                r.proposed_at ||
                r.submitted_at ||
                ""
            ).slice(0, 10),

        status:
            status
                .split(/[_\s]+/)
                .map(
                    (w) =>
                        w.charAt(0).toUpperCase() +
                        w.slice(1).toLowerCase()
                )
                .join(" "),

        mentorFeedback:
            r.mentor_feedback ||
            r.feedback ||
            ""
    };
}


async function loadStudentIdeas() {
    const { data, error } =
        await window.supabaseClient
            .from("project_proposals")
            .select("*");

    if (error) {
        console.error(
            "Could not load ideas:",
            error
        );

        supabaseIdeas = [];
        return;
    }

    const emails = [
        ...new Set(
            (data || [])
                .flatMap((r) => [
                    r.student_email,
                    r.proposed_by,
                    r.created_by,
                    r.mentor_email,
                    r.target_mentor_email
                ])
                .filter(Boolean)
        )
    ];

    let userRows = [];

    if (emails.length > 0) {
        const { data: u } =
            await window.supabaseClient
                .from("users")
                .select("email, name")
                .in(
                    "email",
                    emails
                );

        userRows = u || [];
    }

    const nameByEmail =
        new Map(
            userRows.map(
                (u) => [u.email, u.name]
            )
        );

    supabaseIdeas =
        (data || []).map(
            (r) =>
                mapProposalRow(
                    r,
                    nameByEmail
                )
        );

    console.log(
        "Ideas from Supabase:",
        supabaseIdeas
    );
}


// Ideas shown in this dashboard: Supabase + any that
// couldn't be saved yet (local fallback).
function getStudentIdeas() {
    const localOnly =
        (loadIdeaOverlay().added || [])
            .filter(
                (i) =>
                    i.studentUserId === userId
            );

    return [
        ...supabaseIdeas,
        ...localOnly
    ];
}


function openFloatIdeaModal() {
    modalBody.innerHTML = `
        <p class="modal-eyebrow">
            YOUR IDEA
        </p>

        <h2 class="modal-title">
            Float a Project Idea
        </h2>

        <p
            class="modal-text"
            style="margin-bottom:18px;"
        >
            Propose your own project. It'll be sent to a
            mentor for review and will be visible to the
            ILGC faculty and mentors, marked as floated by you.
        </p>

        <form
            id="floatIdeaForm"
            class="float-form"
        >

            <label class="float-label">
                Project title

                <input
                    type="text"
                    id="fiTitle"
                    required
                    placeholder="e.g. SmartBin: AI Waste Sorting"
                >
            </label>

            <label class="float-label">
                Domain

                <select id="fiDomain">
                    ${
                        floatDomains.length
                            ? floatDomains
                                .map(
                                    (d) =>
                                        `<option value="${d}">${d}</option>`
                                )
                                .join("")
                            : `
                                <option value="General">
                                    General
                                </option>
                            `
                    }
                </select>
            </label>

            <label class="float-label">
                Send to mentor

                <select
                    id="fiMentor"
                    required
                >
                    ${
                        floatMentors.length
                            ? floatMentors
                                .map(
                                    (m) =>
                                        `<option value="${m.email}">${m.name}</option>`
                                )
                                .join("")
                            : `
                                <option
                                    value=""
                                    disabled
                                    selected
                                >
                                    No mentors available
                                </option>
                            `
                    }
                </select>
            </label>

            <label class="float-label">
                Problem statement

                <textarea
                    id="fiProblem"
                    required
                    placeholder="What problem does this solve?"
                ></textarea>
            </label>

            <label class="float-label">
                Scope

                <textarea
                    id="fiScope"
                    required
                    placeholder="What would you actually build?"
                ></textarea>
            </label>

            <label class="float-label">
                Tags (comma-separated)

                <input
                    type="text"
                    id="fiTags"
                    placeholder="e.g. AI, Sustainability"
                >
            </label>

            <div class="modal-actions">
                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Float this idea
                </button>
            </div>

        </form>
    `;

    modalOverlay.classList.remove(
        "hidden"
    );

    document
        .getElementById("floatIdeaForm")
        .addEventListener(
            "submit",
            async (e) => {

                e.preventDefault();

                const title =
                    document
                        .getElementById(
                            "fiTitle"
                        )
                        .value
                        .trim();

                if (!title) return;

                const mentorEmail =
                    document
                        .getElementById(
                            "fiMentor"
                        )
                        .value;

                if (!mentorEmail) {
                    showToast(
                        "Please choose a mentor"
                    );

                    return;
                }

                const mentor =
                    floatMentors.find(
                        (m) =>
                            m.email ===
                            mentorEmail
                    );

                const fields = {
                    title,

                    domain:
                        document
                            .getElementById(
                                "fiDomain"
                            )
                            .value,

                    mentorEmail,

                    problem:
                        document
                            .getElementById(
                                "fiProblem"
                            )
                            .value
                            .trim(),

                    scope:
                        document
                            .getElementById(
                                "fiScope"
                            )
                            .value
                            .trim(),

                    tags:
                        document
                            .getElementById(
                                "fiTags"
                            )
                            .value
                            .split(",")
                            .map(
                                (t) =>
                                    t.trim()
                            )
                            .filter(Boolean)
                };

                const { error } =
                    await window.supabaseClient
                        .from(
                            "project_proposals"
                        )
                        .insert(
                            buildProposalRow(
                                fields
                            )
                        );

                if (error) {
                    console.error(
                        "Could not save idea to Supabase:",
                        error
                    );

                    // fallback so the idea isn't lost
                    addIdea({
                        id:
                            `idea-${Date.now().toString(36)}`,

                        title,

                        studentName,

                        studentSemester,

                        studentUserId:
                            userId,

                        domain:
                            fields.domain,

                        problemStatement:
                            fields.problem,

                        scope:
                            fields.scope,

                        proposedDate:
                            new Date()
                                .toISOString()
                                .slice(0, 10),

                        status:
                            "Pending",

                        tags:
                            fields.tags,

                        targetMentor:
                            mentor
                                ? mentor.name
                                : mentorEmail,

                        origin:
                            "student"
                    });

                    showToast(
                        "Saved locally only — check console (Supabase error)"
                    );

                } else {

                    await loadStudentIdeas();

                    showToast(
                        "Idea floated ✓ — your mentor will review it"
                    );
                }

                closeModal();

                renderMyIdeas();

                renderNotifBadge();

                goToTab(
                    "myideas"
                );
            }
        );
}


/* ======================================================
   RENDER: IDEAS (all student-floated ideas across ILGC)
====================================================== */

let ideasScope = "All";


function ideaStatusBadgeClass(status) {

    if (
        status === "Accepted" ||
        status === "Approved"
    ) {
        return "badge-accepted";
    }

    if (
        status === "Rejected" ||
        status === "Declined"
    ) {
        return "badge-rejected";
    }

    if (
        status === "Needs Revision"
    ) {
        return "badge-pending";
    }

    return "badge-pending";
}


function isMyIdea(idea) {
    return (
        idea.studentUserId === userId ||
        idea.studentName === studentName
    );
}


function renderIdeasScopeChips() {
    const el =
        document.getElementById(
            "ideasScopeChips"
        );

    if (!el) return;

    el.innerHTML =
        ["All", "Mine"]
            .map(
                (s) => `
                    <button
                        class="chip"
                        data-ideas-scope="${s}"
                        data-active="${s === ideasScope}"
                    >
                        ${
                            s === "All"
                                ? "All ideas"
                                : "My ideas"
                        }
                    </button>
                `
            )
            .join("");
}


function renderMyIdeas() {

    let ideas =
        getStudentIdeas();

    if (
        ideasScope === "Mine"
    ) {
        ideas =
            ideas.filter(
                isMyIdea
            );
    }

    // newest first
    ideas =
        ideas
            .slice()
            .sort(
                (a, b) =>
                    new Date(
                        b.proposedDate
                    ) -
                    new Date(
                        a.proposedDate
                    )
            );

    const list =
        document.getElementById(
            "myIdeasList"
        );

    const empty =
        document.getElementById(
            "myIdeasEmpty"
        );

    if (!list) return;

    if (ideas.length === 0) {

        list.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;
    }

    empty.classList.add(
        "hidden"
    );

    list.innerHTML =
        ideas
            .map((idea) => {

                const mine =
                    isMyIdea(idea);

                const who =
                    mine
                        ? "you"
                        : idea.studentName;

                const feedback =
                    idea.mentorFeedback
                        ? `
                            <p
                                class="idea-text"
                                style="margin-top:8px;"
                            >
                                <strong>
                                    Mentor feedback:
                                </strong>

                                ${idea.mentorFeedback}
                            </p>
                        `
                        : "";

                return `
                    <div class="interest-row">

                        <div
                            class="interest-row-main"
                        >

                            <p
                                class="interest-row-title"
                            >
                                ${idea.title}

                                ${
                                    mine
                                        ? `
                                            <span class="mine-tag">
                                                Yours
                                            </span>
                                        `
                                        : ""
                                }
                            </p>

                            <p
                                class="interest-row-meta"
                            >
                                ${idea.domain}
                                · to ${idea.targetMentor}
                                · floated ${idea.proposedDate}
                            </p>

                            <div
                                style="margin-top:6px;"
                            >
                                <span
                                    class="origin-badge origin-student"
                                >
                                    Student-floated · ${who}
                                </span>
                            </div>

                            ${feedback}

                        </div>

                        <span
                            class="badge ${ideaStatusBadgeClass(
                                idea.status
                            )}"
                        >
                            ${idea.status}
                        </span>

                    </div>
                `;
            })
            .join("");
}

/* ======================================================
   RENDER: NOTIFICATIONS (student)
====================================================== */

function buildNotifications() {
    const notifications = [];

    // Updates on my interests (accepted / rejected).
    interests
        .filter((i) => i.status !== "Pending")
        .forEach((i) => {
            const project =
                getAllProjects().find(
                    (p) => p.id === i.projectId
                );

            notifications.push({
                icon:
                    i.status === "Accepted"
                        ? "🎉"
                        : "📩",

                date:
                    (
                        i.respondedAt ||
                        i.submittedAt ||
                        ""
                    ).slice(0, 10),

                text:
                    i.status === "Accepted"
                        ? `You were <strong>accepted</strong> onto ${
                              project
                                  ? project.title
                                  : "a project"
                          }.`
                        : `Your interest in ${
                              project
                                  ? project.title
                                  : "a project"
                          } wasn't accepted this time.`
            });
        });


    // Updates on my floated ideas.
    getStudentIdeas()
        .filter(isMyIdea)
        .filter((i) => i.status !== "Pending")
        .forEach((i) => {
            notifications.push({
                icon: "💡",

                date:
                    i.reviewedDate ||
                    i.proposedDate,

                text:
                    `Your idea "<strong>${i.title}</strong>" ` +
                    `is now <strong>${i.status}</strong>.`
            });
        });


    // New projects floated across ILGC (last few).
    getAllProjects()
        .filter((p) => p.floatedByName)
        .slice(-4)
        .forEach((p) => {
            notifications.push({
                icon: "✨",

                date:
                    p.proposedDate ||
                    "2026-09-01",

                text:
                    `New ${
                        projectOriginLabel(p)
                            .split(" · ")[0]
                            .toLowerCase()
                    } project: <strong>${p.title}</strong>.`
            });
        });


    return notifications
        .filter((n) => n.date)
        .sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );
}


/* ======================================================
   RENDER NOTIFICATIONS
====================================================== */

function renderNotifications() {

    const notifications =
        buildNotifications();

    const list =
        document.getElementById(
            "notificationsList"
        );

    if (!list) return;

    list.innerHTML =
        notifications.length
            ? notifications
                  .map(
                      (n) => `
                        <div class="notification-item">

                            <span
                                class="notification-icon"
                            >
                                ${n.icon}
                            </span>

                            <span
                                class="notification-text"
                            >
                                ${n.text}

                                <span
                                    class="notification-date"
                                >
                                    ${n.date}
                                </span>
                            </span>

                        </div>
                    `
                  )
                  .join("")
            : `
                <p class="empty-state">
                    You're all caught up —
                    no new notifications.
                </p>
            `;
}


/* ======================================================
   NOTIFICATION BADGE
====================================================== */

function renderNotifBadge() {

    const count =
        buildNotifications().length;

    const badge =
        document.getElementById(
            "notifBadge"
        );

    if (!badge) return;

    if (count > 0) {

        badge.textContent =
            count > 9
                ? "9+"
                : String(count);

        badge.classList.remove(
            "hidden"
        );

    } else {

        badge.classList.add(
            "hidden"
        );
    }
}


/* ======================================================
   FLOAT AN IDEA BUTTONS
====================================================== */

[
    "floatIdeaBtn",
    "floatIdeaBtn2"
].forEach((id) => {

    const btn =
        document.getElementById(id);

    if (btn) {
        btn.addEventListener(
            "click",
            openFloatIdeaModal
        );
    }
});


/* ======================================================
   IDEAS SCOPE FILTER
====================================================== */

const ideasScopeChipsEl =
    document.getElementById(
        "ideasScopeChips"
    );

if (ideasScopeChipsEl) {

    ideasScopeChipsEl.addEventListener(
        "click",
        (e) => {

            const btn =
                e.target.closest(
                    "[data-ideas-scope]"
                );

            if (!btn) return;

            ideasScope =
                btn.dataset.ideasScope;

            renderIdeasScopeChips();
            renderMyIdeas();
        }
    );
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


/* ======================================================
   INITIAL RENDER
====================================================== */

renderDiscoverChips();

renderIdeasScopeChips();

renderProfile();


/* ======================================================
   INITIALIZE STUDENT DASHBOARD
====================================================== */

async function initStudentDashboard() {

    await loadStudentProfile();

    await loadStudentInterests();

    studentProjects =
        await loadStudentProjects();


    /* ----------------------------------------------
       SHAREPOINT / PROJECT WORKSPACES
    ---------------------------------------------- */

    await loadProjectWorkspaces(
        studentProjects.map(
            (project) =>
                project.projectCode
        )
    );


    await loadDiscoverProjects();


    /* ----------------------------------------------
       FLOAT AN IDEA DATA
    ---------------------------------------------- */

    await Promise.all([
        loadFloatMentors(),
        loadFloatDomains(),
        loadStudentIdeas()
    ]);


    renderDiscoverChips();

    renderAll();
}


initStudentDashboard();


/* ======================================================
   SIDEBAR TOGGLE
====================================================== */

const SIDEBAR_STATE_KEY =
    "ilgc_sidebar_collapsed";


if (
    localStorage.getItem(
        SIDEBAR_STATE_KEY
    ) === "true"
) {

    document.body.classList.add(
        "sidebar-collapsed"
    );
}


const sidebarToggleBtn =
    document.getElementById(
        "sidebarToggle"
    );


if (sidebarToggleBtn) {

    sidebarToggleBtn.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "sidebar-collapsed"
            );

            localStorage.setItem(
                SIDEBAR_STATE_KEY,
                document.body.classList.contains(
                    "sidebar-collapsed"
                )
            );
        }
    );
}

