/* ======================================================
   ILGC FACULTY DASHBOARD
   Supabase-backed version
====================================================== */


/* ======================================================
   AUTH
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
   SUPABASE
====================================================== */

if (!window.supabaseClient) {
    console.error("Supabase client is not available.");
} else {
    console.log("Faculty dashboard: Supabase connected.");
}


/* ======================================================
   STATE
====================================================== */

let myProjectsData = [];
let allProjectsData = [];
let interestedStudentsData = [];
let myProjectMembersData = [];
let studentProfilesData = [];

let projectsActiveStatus = "All";
let projectsActiveSemester = "All";

let discoverStatus = "All";
let discoverDomain = "All";
let discoverMentor = "All";
let discoverSearch = "";

let studentsActiveStatus = "All";

let toastTimer = null;


/* ======================================================
   FACULTY PROFILE
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
        mentor?.name ||
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
   LOAD PROJECTS
====================================================== */

async function loadAllProjects() {

    const { data, error } =
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

    if (error) {
        console.error(
            "Could not load projects:",
            error
        );

        return [];
    }

    return data || [];
}


/* ======================================================
   LOAD MY PROJECTS
====================================================== */

async function loadMyProjects() {

    const { data: assignments, error: assignmentError } =
        await window.supabaseClient
            .from("project_mentors")
            .select(`
                project_code,
                mentor_email,
                mentor_role
            `)
            .eq("mentor_email", facultyEmail);

    if (assignmentError) {
        console.error(
            "Could not load faculty project assignments:",
            assignmentError
        );

        return [];
    }

    if (!assignments || assignments.length === 0) {
        console.log("No projects assigned to faculty.");
        return [];
    }

    const projectCodes = [
        ...new Set(
            assignments
                .map((row) => row.project_code)
                .filter(Boolean)
        )
    ];

    const { data: projects, error: projectError } =
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
            .in("project_code", projectCodes)
            .order("project_code");

    if (projectError) {
        console.error(
            "Could not load faculty projects:",
            projectError
        );

        return [];
    }

    return projects || [];
}


/* ======================================================
   LOAD PROJECT MEMBERS
====================================================== */

async function loadProjectTeamMembers() {

    if (!myProjectsData.length) {
        return [];
    }

    const projectCodes =
        myProjectsData.map(
            (project) => project.project_code
        );

    const { data: members, error } =
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
            .is("left_at", null);

    if (error) {
        console.error(
            "Could not load project members:",
            error
        );

        return [];
    }

    if (!members || members.length === 0) {
        return [];
    }

    const studentEmails = [
        ...new Set(
            members
                .map((member) => member.student_email)
                .filter(Boolean)
        )
    ];

    const { data: students, error: studentError } =
        await window.supabaseClient
            .from("student_profiles")
            .select("*")
            .in("email", studentEmails);

    if (studentError) {
        console.error(
            "Could not load student profiles:",
            studentError
        );

        return [];
    }

    return members.map((member) => {

        const student =
            (students || []).find(
                (profile) =>
                    profile.email === member.student_email
            );

        const project =
            myProjectsData.find(
                (p) =>
                    p.project_code === member.project_code
            );

        return {
            ...member,
            student,
            project
        };

    });
}

async function loadProjectTeamMembers() {

    if (!myProjectsData.length) {
        console.log("No projects assigned to faculty.");
        return [];
    }

    const projectCodes =
        myProjectsData.map(
            (project) => project.project_code
        );

    console.log(
        "Loading students for faculty projects:",
        projectCodes
    );

    /* ----------------------------------------------
       Load current team members
    ---------------------------------------------- */

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
            .is("left_at", null);

    if (membersError) {

        console.error(
            "Could not load project members:",
            membersError
        );

        return [];
    }

    console.log(
        "Faculty project members:",
        members
    );

    if (!members || members.length === 0) {
        console.log(
            "No students found in faculty projects."
        );

        return [];
    }

    /* ----------------------------------------------
       Get student emails
    ---------------------------------------------- */

    const studentEmails = [
        ...new Set(
            members
                .map(
                    (member) =>
                        member.student_email
                )
                .filter(Boolean)
        )
    ];

    /* ----------------------------------------------
       Load student profiles
    ---------------------------------------------- */

    const { data: students, error: studentError } =
        await window.supabaseClient
            .from("student_profiles")
            .select("*")
            .in("email", studentEmails);

    if (studentError) {

        console.error(
            "Could not load student profiles:",
            studentError
        );

        return [];
    }

    /* ----------------------------------------------
       Load student names from users
    ---------------------------------------------- */

    const { data: users, error: usersError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", studentEmails);

    if (usersError) {

        console.error(
            "Could not load student names:",
            usersError
        );

        return [];
    }

    console.log(
        "Faculty student users:",
        users
    );

    /* ----------------------------------------------
       Create lookup maps
    ---------------------------------------------- */

    const studentMap =
        new Map(
            (students || []).map(
                (student) => [
                    student.email,
                    student
                ]
            )
        );

    const userMap =
        new Map(
            (users || []).map(
                (user) => [
                    user.email,
                    user
                ]
            )
        );

    /* ----------------------------------------------
       Combine project member + profile + name
    ---------------------------------------------- */

    return members.map((member) => {

        const profile =
            studentMap.get(
                member.student_email
            ) || {};

        const user =
            userMap.get(
                member.student_email
            ) || {};

        const project =
            myProjectsData.find(
                (project) =>
                    project.project_code ===
                    member.project_code
            );

        return {

            ...member,

            student: {

                ...profile,

                email:
                    member.student_email,

                name:
                    user.name ||
                    member.student_email
            },

            project

        };

    });
}


/* ======================================================
   HELPERS
====================================================== */

function getStudentName(student) {

    if (!student) {
        return "Unknown student";
    }

    return (
        student.name ||
        student.full_name ||
        student.email ||
        "Unknown student"
    );
}


function getSemester(student) {

    if (!student) {
        return "—";
    }

    return student.semester ??
        student.sem ??
        "—";
}


function getProjectStatus(project) {

    const status =
        String(project.status || "")
            .trim();

    if (!status) {
        return "Proposed";
    }

    return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
    );
}


function projectDomain(project) {

    if (
        project.domains &&
        Array.isArray(project.domains) &&
        project.domains.length
    ) {
        return project.domains.join(" · ");
    }

    return "Other";
}


function statusBadgeClass(status) {

    if (status === "Ongoing") {
        return "badge-ongoing";
    }

    if (status === "Proposed") {
        return "badge-proposed";
    }

    if (status === "Completed") {
        return "badge-completed";
    }

    return "";
}


/* ======================================================
   DOMAIN LOADING
====================================================== */

async function loadProjectDomains(projects) {

    if (!projects.length) {
        return projects;
    }

    const projectCodes =
        projects.map(
            (project) => project.project_code
        );

    const { data: mappings, error: mappingError } =
        await window.supabaseClient
            .from("project_domain_map")
            .select("project_code, domain_id")
            .in("project_code", projectCodes);

    if (mappingError) {
        console.error(
            "Could not load project-domain mappings:",
            mappingError
        );

        return projects;
    }

    if (!mappings || !mappings.length) {
        return projects.map((project) => ({
            ...project,
            domains: []
        }));
    }

    const domainIds = [
        ...new Set(
            mappings
                .map((mapping) => mapping.domain_id)
                .filter(Boolean)
        )
    ];

    const { data: domains, error: domainError } =
        await window.supabaseClient
            .from("project_domains")
            .select("domain_id, name")
            .in("domain_id", domainIds);

    if (domainError) {
        console.error(
            "Could not load project domains:",
            domainError
        );

        return projects;
    }

    const domainMap = new Map(
        (domains || []).map(
            (domain) => [
                domain.domain_id,
                domain.name
            ]
        )
    );

    const projectDomainMap = new Map();

    mappings.forEach((mapping) => {

        const name =
            domainMap.get(mapping.domain_id);

        if (!name) {
            return;
        }

        if (
            !projectDomainMap.has(
                mapping.project_code
            )
        ) {
            projectDomainMap.set(
                mapping.project_code,
                []
            );
        }

        projectDomainMap
            .get(mapping.project_code)
            .push(name);
    });

    return projects.map((project) => ({
        ...project,
        domains:
            projectDomainMap.get(
                project.project_code
            ) || []
    }));
}


/* ======================================================
   PROJECT MENTORS
====================================================== */

async function loadProjectMentors(projects) {

    if (!projects.length) {
        return projects;
    }

    const projectCodes =
        projects.map(
            (project) => project.project_code
        );

    const { data: assignments, error } =
        await window.supabaseClient
            .from("project_mentors")
            .select(`
                project_code,
                mentor_email,
                mentor_role
            `)
            .in("project_code", projectCodes);

    if (error) {
        console.error(
            "Could not load project mentors:",
            error
        );

        return projects;
    }

    if (!assignments || !assignments.length) {
        return projects.map((project) => ({
            ...project,
            mentors: []
        }));
    }

    const mentorEmails = [
        ...new Set(
            assignments
                .map(
                    (row) =>
                        row.mentor_email
                )
                .filter(Boolean)
        )
    ];

    const { data: users, error: userError } =
        await window.supabaseClient
            .from("users")
            .select("email, name")
            .in("email", mentorEmails);

    if (userError) {
        console.error(
            "Could not load mentor names:",
            userError
        );

        return projects;
    }

    const mentorMap = new Map(
        (users || []).map(
            (user) => [
                user.email,
                user.name || user.email
            ]
        )
    );

    const mentorProjectMap = new Map();

    assignments.forEach((assignment) => {

        const mentorName =
            mentorMap.get(
                assignment.mentor_email
            ) ||
            assignment.mentor_email;

        if (
            !mentorProjectMap.has(
                assignment.project_code
            )
        ) {
            mentorProjectMap.set(
                assignment.project_code,
                []
            );
        }

        mentorProjectMap
            .get(assignment.project_code)
            .push(mentorName);
    });

    return projects.map((project) => ({
        ...project,
        mentors:
            mentorProjectMap.get(
                project.project_code
            ) || []
    }));
}


/* ======================================================
   NORMALIZE PROJECT
====================================================== */

function normalizeProject(project) {

    return {
        id: project.project_code,
        projectCode: project.project_code,
        title:
            project.title ||
            "Untitled Project",

        summary:
            project.description ||
            project.summary ||
            "",

        expectedOutcome:
            project.expected_outcome ||
            "",

        status:
            getProjectStatus(project),

        progress:
            Number(project.progress || 0),

        cohort:
            project.academic_year ||
            "",

        semester:
            project.semester ||
            "",

        domains:
            project.domains || [],

        domain:
            projectDomain(project),

        mentors:
            project.mentors || [],

        mentor:
            project.mentors &&
            project.mentors.length
                ? project.mentors.join(", ")
                : "Faculty mentor"
    };
}


/* ======================================================
   TOAST
====================================================== */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () =>
                toast.classList.add(
                    "hidden"
                ),
            2600
        );
}


/* ======================================================
   TABS
====================================================== */

const tabButtons =
    document.querySelectorAll(".tab");

const views =
    document.querySelectorAll(".view");

const notifBtn =
    document.getElementById("notifBtn");


function goToTab(tabName) {

    tabButtons.forEach((button) => {

        button.dataset.active =
            String(
                button.dataset.tab ===
                tabName
            );
    });

    views.forEach((view) => {

        view.dataset.active =
            String(
                view.id ===
                `view-${tabName}`
            );
    });

    if (notifBtn) {

        notifBtn.dataset.active =
            String(
                tabName ===
                "notifications"
            );
    }
}


tabButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () =>
            goToTab(
                button.dataset.tab
            )
    );
});


document
    .querySelectorAll("[data-goto]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () =>
                goToTab(
                    button.dataset.goto
                )
        );
    });


if (notifBtn) {

    notifBtn.addEventListener(
        "click",
        () =>
            goToTab(
                notifBtn.dataset.tab
            )
    );
}


/* ======================================================
   LOGOUT
====================================================== */

function logout() {

    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedRole");

    window.location.href =
        "index.html";
}


document
    .getElementById("logoutBtn")
    ?.addEventListener(
        "click",
        logout
    );

document
    .getElementById("logoutBtnProfile")
    ?.addEventListener(
        "click",
        logout
    );


/* ======================================================
   PROJECT CARD
====================================================== */

function projectCardHtml(project) {

    const members =
        myProjectMembersData.filter(
            (member) =>
                String(member.project_code) ===
                String(project.id)
        );


    /* ----------------------------------------------
       Build student list
    ---------------------------------------------- */

    const studentsHtml =
        members.length > 0

            ? members.map((member) => {

                const student =
                    member.student || {};

                const name =
                    getStudentName(student);

                const email =
                    student.email ||
                    member.student_email ||
                    "";

                const semester =
                    getSemester(student);

                return `

                    <div class="faculty-student-row">

                        <div class="faculty-student-avatar">
                            ${name
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div class="faculty-student-info">

                            <strong>
                                ${name}
                            </strong>

                            <span>
                                ${email}
                            </span>

                            ${
                                semester !== "—"
                                    ? `
                                        <small>
                                            Semester ${semester}
                                        </small>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                `;

            }).join("")

            : `

                <p class="faculty-no-students">
                    No students assigned to this project yet.
                </p>

            `;


    return `

        <article class="project-card">

            <div class="project-card-top">

                <span class="project-domain">
                    ${project.domain}
                </span>

                <span class="badge ${statusBadgeClass(project.status)}">
                    ${project.status}
                </span>

            </div>


            <div class="project-card-body">

                <h3
                    class="project-title"
                    data-open="${project.id}"
                >
                    ${project.title}
                </h3>


                <div class="progress-track">

                    <div
                        class="progress-fill"
                        style="width:${project.progress}%"
                    ></div>

                </div>


                <p
                    class="progress-label"
                    style="margin-bottom:14px;"
                >
                    ${project.progress}% complete
                </p>


                <div class="project-card-stats">

                    <span class="project-card-stat">

                        <strong>
                            ${members.length}
                        </strong>

                        student${members.length !== 1 ? "s" : ""}

                    </span>


                    <span class="project-card-stat">

                        <strong>
                            ${project.semester || "—"}
                        </strong>

                        semester

                    </span>

                </div>


                <!-- ==================================
                     PROJECT STUDENTS
                =================================== -->

                <div class="faculty-students-section">

                    <div class="faculty-students-heading">

                        STUDENTS (${members.length})

                    </div>


                    <div class="faculty-student-list">

                        ${studentsHtml}

                    </div>

                </div>


                <div class="project-card-actions">

                    <button
                        class="btn btn-primary"
                        data-open="${project.id}"
                    >
                        Details
                    </button>

                </div>

            </div>

        </article>

    `;
}


/* ======================================================
   HOME
====================================================== */

function renderHome() {

    document.getElementById(
        "greetingText"
    ).textContent =
        `Welcome, ${facultyName} 👋`;

    document.getElementById(
        "greetingSub"
    ).textContent =
        "Here's what's happening with your projects.";

    const ongoing =
        myProjectsData.filter(
            (project) =>
                getProjectStatus(project) ===
                "Ongoing"
        ).length;

    const studentCount =
        myProjectMembersData.length;

    document.getElementById(
        "statRow"
    ).innerHTML = `

        <div class="stat-card">
            <p class="stat-value">
                ${ongoing}
            </p>
            <p class="stat-label">
                Active Projects
            </p>
        </div>

        <div class="stat-card">
            <p class="stat-value">
                ${myProjectsData.length}
            </p>
            <p class="stat-label">
                My Projects
            </p>
        </div>

        <div class="stat-card">
            <p class="stat-value">
                ${studentCount}
            </p>
            <p class="stat-label">
                Students
            </p>
        </div>

        <div class="stat-card">
            <p class="stat-value">
                ${allProjectsData.length}
            </p>
            <p class="stat-label">
                ILGC Projects
            </p>
        </div>

        <div class="stat-card">
            <p class="stat-value">
                ${new Set(
                    myProjectMembersData.map(
                        (student) =>
                            student.student_email
                    )
                ).size}
            </p>
            <p class="stat-label">
                Unique Students
            </p>
        </div>

    `;

    document.getElementById(
        "pendingActionsList"
    ).innerHTML = `

        <div
            class="pending-action-item"
            data-goto="students"
            style="cursor:pointer;"
        >
            <span class="pending-action-count">
                ${studentCount}
            </span>

            <span>
                student${studentCount !== 1 ? "s" : ""}
                currently in your project groups
            </span>
        </div>

        <div
            class="pending-action-item"
            data-goto="projects"
            style="cursor:pointer;"
        >
            <span class="pending-action-count">
                ${myProjectsData.length}
            </span>

            <span>
                project${myProjectsData.length !== 1 ? "s" : ""}
                assigned to you
            </span>
        </div>
    `;

    document.getElementById(
        "activityFeed"
    ).innerHTML = `

        <div class="activity-item">

            <span class="activity-dot"></span>

            <span>
                Faculty profile loaded from Supabase.
                <span class="activity-date">
                    ${facultyEmail}
                </span>
            </span>

        </div>

        <div class="activity-item">

            <span class="activity-dot"></span>

            <span>
                ${myProjectsData.length}
                project${myProjectsData.length !== 1 ? "s" : ""}
                assigned to you.
            </span>

        </div>
    `;

    const normalized =
        myProjectsData.map(
            normalizeProject
        );

    document.getElementById(
        "homeProjectGrid"
    ).innerHTML =
        normalized
            .slice(0, 6)
            .map(projectCardHtml)
            .join("") ||
        `<p class="empty-state">
            You don't have any projects assigned yet.
        </p>`;
}


/* ======================================================
   MY PROJECTS
====================================================== */

function renderProjectsChips() {

    const statuses =
        [
            "All",
            "Ongoing",
            "Proposed",
            "Completed"
        ];

    document.getElementById(
        "projectsStatusChips"
    ).innerHTML =
        statuses.map(
            (status) => `
                <button
                    class="chip"
                    data-project-status="${status}"
                    data-active="${status === projectsActiveStatus}"
                >
                    ${status}
                </button>
            `
        ).join("");
}


function renderProjectsSemesterFilter() {

    const semesters = [
        "All",
        ...new Set(
            myProjectsData
                .map(
                    (project) =>
                        project.semester
                )
                .filter(Boolean)
        )
    ];

    const select =
        document.getElementById(
            "projectsYearSelect"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        semesters.map(
            (semester) => `
                <option
                    value="${semester}"
                    ${semester === projectsActiveSemester ? "selected" : ""}
                >
                    ${
                        semester === "All"
                            ? "All Semesters"
                            : `Semester ${semester}`
                    }
                </option>
            `
        ).join("");
}


function renderMyProjects() {

    const projects =
        myProjectsData
            .map(normalizeProject)
            .filter(
                (project) =>

                    (
                        projectsActiveStatus ===
                        "All" ||

                        project.status ===
                        projectsActiveStatus
                    )

                    &&

                    (
                        projectsActiveSemester ===
                        "All" ||

                        String(
                            project.semester
                        ) ===
                        String(
                            projectsActiveSemester
                        )
                    )
            );

    const grid =
        document.getElementById(
            "myProjectsGrid"
        );

    const empty =
        document.getElementById(
            "myProjectsEmpty"
        );

    if (!projects.length) {

        grid.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;
    }

    empty.classList.add("hidden");

    grid.innerHTML =
        projects
            .map(projectCardHtml)
            .join("");
}


/* ======================================================
   INTERESTED STUDENTS
====================================================== */

function renderStudents() {

    const container =
        document.getElementById(
            "studentsTable"
        );

    const empty =
        document.getElementById(
            "studentsEmpty"
        );

    // Interested Students tab is disabled for now - these elements
    // no longer exist in the HTML, so bail out safely.
    if (!container || !empty) {
        return;
    }

    if (!interestedStudentsData.length) {

        container.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;
    }

    empty.classList.add(
        "hidden"
    );

    const rows =
        interestedStudentsData
            .map((interest) => {

                const student =
                    interest.student;

                const project =
                    interest.project;

                return `
                    <div class="student-row">

                        <span class="student-name">
                            ${getStudentName(student)}
                        </span>

                        <span class="student-cell">
                            Sem ${getSemester(student)}
                        </span>

                        <span class="student-cell">
                            ${project?.title || "—"}
                        </span>

                        <div class="student-actions">
                            <button
                                class="btn btn-secondary"
                                data-student-email="${interest.student_email}"
                            >
                                View
                            </button>
                            <button
                                class="btn btn-primary"
                                data-accept-interest="${interest.id}"
                            >
                                Accept
                            </button>
                            <button
                                class="btn btn-danger"
                                data-reject-interest="${interest.id}"
                            >
                                Reject
                            </button>
                        </div>

                    </div>
                `;
            })
            .join("");

    container.innerHTML = `

        <div class="student-row head">

            <span>Student</span>
            <span>Semester</span>
            <span>Project</span>
            <span>Action</span>

        </div>

        ${rows}
    `;
}

/* Accept: add the student to project_members, mark the interest
   Accepted (so it drops off this "Pending" list for good). */
async function acceptInterest(interestId) {

    const interest = interestedStudentsData.find((i) => i.id === interestId);
    if (!interest) return;

    const { error: memberError } =
        await window.supabaseClient
            .from("project_members")
            .insert({
                project_code: interest.project_code,
                student_email: interest.student_email
            });

    if (memberError) {
        console.error("Could not add student to project_members:", memberError);
        alert("Couldn't add this student to the project. See console for details.");
        return;
    }

    const { error: statusError } =
        await window.supabaseClient
            .from("expressions_of_interest")
            .update({ status: "Accepted" })
            .eq("id", interestId);

    if (statusError) {
        console.error("Could not update interest status:", statusError);
    }

    interestedStudentsData = await loadInterestedStudents();
    renderStudents();
}

/* Reject: just mark the interest Rejected — it drops off this list,
   student stays free to express interest elsewhere. */
async function rejectInterest(interestId) {

    const { error } =
        await window.supabaseClient
            .from("expressions_of_interest")
            .update({ status: "Rejected" })
            .eq("id", interestId);

    if (error) {
        console.error("Could not reject interest:", error);
        alert("Couldn't reject this request. See console for details.");
        return;
    }

    interestedStudentsData = interestedStudentsData.filter((i) => i.id !== interestId);
    renderStudents();
}


/* ======================================================
   STUDENT PROFILE MODAL
====================================================== */

function openStudentModal(email) {

    const member =
        interestedStudentsData.find(
            (item) =>
                item.student_email ===
                email
        );

    if (!member) {
        return;
    }

    const student =
        member.student || {};

    const project =
        member.project || {};

    modalBody.innerHTML = `

        <p class="modal-eyebrow">
            STUDENT PROFILE
        </p>

        <h2 class="modal-title">
            ${getStudentName(student)}
        </h2>

        <div class="modal-meta-row">

            <div class="modal-meta-item">
                <span class="meta-label">
                    Email
                </span>

                <span class="meta-value">
                    ${student.email || email}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Semester
                </span>

                <span class="meta-value">
                    ${getSemester(student)}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Project
                </span>

                <span class="meta-value">
                    ${project.title || "—"}
                </span>
            </div>

        </div>

        ${
            student.department
                ? `
                    <p class="modal-section-label">
                        Department
                    </p>

                    <p class="modal-text">
                        ${student.department}
                    </p>
                `
                : ""
        }

        ${
            student.bio
                ? `
                    <p class="modal-section-label">
                        Bio
                    </p>

                    <p class="modal-text">
                        ${student.bio}
                    </p>
                `
                : ""
        }

        <div class="modal-actions">

            <button
                class="btn btn-secondary"
                onclick="window.location.href='mailto:${student.email || email}'"
            >
                ✉ Email Student
            </button>

        </div>
    `;

    modalOverlay.classList.remove(
        "hidden"
    );
}


/* ======================================================
   DISCOVER PROJECTS
====================================================== */

function discoverDomains() {

    return [
        "All",
        ...new Set(
            allProjectsData.flatMap(
                (project) =>
                    project.domains || []
            )
        )
    ];
}


function discoverMentors() {

    return [
        "All",
        ...[
            ...new Set(
                allProjectsData.flatMap(
                    (project) =>
                        project.mentors || []
                )
            )
        ].sort()
    ];
}


function renderDiscoverChips() {

    document.getElementById(
        "discoverStatusChips"
    ).innerHTML =
        [
            "All",
            "Ongoing",
            "Proposed",
            "Completed"
        ].map(
            (status) => `
                <button
                    class="chip"
                    data-discover-status="${status}"
                    data-active="${status === discoverStatus}"
                >
                    ${status}
                </button>
            `
        ).join("");

    document.getElementById(
        "discoverDomainChips"
    ).innerHTML =
        discoverDomains()
            .map(
                (domain) => `
                    <button
                        class="chip"
                        data-discover-domain="${domain}"
                        data-active="${domain === discoverDomain}"
                    >
                        ${domain}
                    </button>
                `
            ).join("");

    const mentorSelect =
        document.getElementById(
            "discoverMentorSelect"
        );

    if (mentorSelect) {

        mentorSelect.innerHTML =
            discoverMentors()
                .map(
                    (mentor) => `
                        <option
                            value="${mentor}"
                            ${
                                mentor ===
                                discoverMentor
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${
                                mentor === "All"
                                    ? "All professors"
                                    : mentor
                            }
                        </option>
                    `
                ).join("");
    }
}


function discoverCardHtml(project) {

    const members =
        myProjectMembersData.filter(
            (member) =>
                member.project_code ===
                project.id
        );

    return `
        <article class="project-card">

            <div class="project-card-top">

                <span class="project-domain">
                    ${project.domain}
                </span>

                <span class="badge ${statusBadgeClass(project.status)}">
                    ${project.status}
                </span>

            </div>

            <div class="project-card-body">

                <h3
                    class="project-title"
                    data-open="${project.id}"
                >
                    ${project.title}
                </h3>

                <p class="project-description">
                    ${project.summary}
                </p>

                <p class="project-mentor-row">
                    ${project.mentor}
                </p>

                <div
                    class="project-card-stats"
                    style="margin-bottom:12px;"
                >

                    <span class="project-card-stat">
                        <strong>
                            ${members.length}
                        </strong>
                        student${members.length !== 1 ? "s" : ""}
                    </span>

                    <span class="project-card-stat">
                        <strong>
                            ${project.progress}%
                        </strong>
                        complete
                    </span>

                </div>

                <div class="project-card-actions">

                    <button
                        class="btn btn-primary"
                        data-open="${project.id}"
                    >
                        Details
                    </button>

                </div>

            </div>

        </article>
    `;
}


function renderDiscover() {

    const term =
        discoverSearch
            .toLowerCase();

    const filtered =
        allProjectsData
            .map(normalizeProject)
            .filter((project) => {

                const statusMatch =
                    discoverStatus ===
                    "All" ||
                    project.status ===
                    discoverStatus;

                const domainMatch =
                    discoverDomain ===
                    "All" ||
                    project.domains
                        .map(
                            (domain) =>
                                domain
                                    .toLowerCase()
                        )
                        .includes(
                            discoverDomain
                                .toLowerCase()
                        );

                const mentorMatch =
                    discoverMentor ===
                    "All" ||
                    project.mentors.includes(
                        discoverMentor
                    );

                const searchMatch =
                    !term ||

                    project.title
                        .toLowerCase()
                        .includes(term) ||

                    project.summary
                        .toLowerCase()
                        .includes(term) ||

                    project.domain
                        .toLowerCase()
                        .includes(term) ||

                    project.mentor
                        .toLowerCase()
                        .includes(term);

                return (
                    statusMatch &&
                    domainMatch &&
                    mentorMatch &&
                    searchMatch
                );
            });

    document.getElementById(
        "discoverCount"
    ).textContent =
        `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;

    const grid =
        document.getElementById(
            "discoverGrid"
        );

    const empty =
        document.getElementById(
            "discoverEmpty"
        );

    if (!filtered.length) {

        grid.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;
    }

    empty.classList.add(
        "hidden"
    );

    grid.innerHTML =
        filtered
            .map(discoverCardHtml)
            .join("");
}


/* ======================================================
   PROJECT DETAIL MODAL
====================================================== */

const modalOverlay =
    document.getElementById(
        "modalOverlay"
    );

const modalBody =
    document.getElementById(
        "modalBody"
    );


function openDetailModal(projectId) {

    const project =
        allProjectsData
            .map(normalizeProject)
            .find(
                (item) =>
                    item.id ===
                    projectId
            );

    if (!project) {
        return;
    }

    const members =
        myProjectMembersData.filter(
            (member) =>
                member.project_code ===
                projectId
        );

    const teamHtml =
        members.length

            ? `
                <div class="modal-team">
                    ${members.map(
                        (member) => `
                            <span class="team-chip">
                                ${getStudentName(member.student)}
                                · Sem ${getSemester(member.student)}
                            </span>
                        `
                    ).join("")}
                </div>
            `

            : `
                <p class="modal-text">
                    No students on this project yet.
                </p>
            `;

    modalBody.innerHTML = `

        <p class="modal-eyebrow">
            ${project.domain} · ${project.status}
        </p>

        <h2 class="modal-title">
            ${project.title}
        </h2>

        <div class="modal-meta-row">

            <div class="modal-meta-item">
                <span class="meta-label">
                    Faculty mentor
                </span>

                <span class="meta-value">
                    ${project.mentor}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Academic year
                </span>

                <span class="meta-value">
                    ${project.cohort || "—"}
                </span>
            </div>

            <div class="modal-meta-item">
                <span class="meta-label">
                    Semester
                </span>

                <span class="meta-value">
                    ${project.semester || "—"}
                </span>
            </div>

        </div>

        <p class="modal-section-label">
            Progress
        </p>

        <p class="modal-text">
            ${project.progress}% complete
        </p>

        <p class="modal-section-label">
            Overview
        </p>

        <p class="modal-text">
            ${project.summary || "No description available."}
        </p>

        <p class="modal-section-label">
            Expected outcome
        </p>

        <p class="modal-text">
            ${project.expectedOutcome || "—"}
        </p>

        <p class="modal-section-label">
            Current team
        </p>

        ${teamHtml}
    `;

    modalOverlay.classList.remove(
        "hidden"
    );
}


function closeModal() {

    modalOverlay.classList.add(
        "hidden"
    );
}


document
    .getElementById("modalClose")
    ?.addEventListener(
        "click",
        closeModal
    );


modalOverlay?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            modalOverlay
        ) {
            closeModal();
        }
    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {
            closeModal();
        }
    }
);


/* ======================================================
   PROFILE
====================================================== */

function renderProfile() {

    const avatar =
        document.getElementById(
            "profileAvatar"
        );

    const name =
        document.getElementById(
            "profileName"
        );

    const meta =
        document.getElementById(
            "profileMeta"
        );

    const profileId =
        document.getElementById(
            "profileUserId"
        );

    if (avatar) {

        avatar.textContent =
            facultyName
                .replace("Dr. ", "")
                .charAt(0)
                .toUpperCase();
    }

    if (name) {
        name.textContent =
            facultyName;
    }

    if (meta) {

        meta.textContent =
            facultyProfile?.designation
                ? `${facultyProfile.designation} · ILGC Faculty`
                : "ILGC Faculty";
    }

    if (profileId) {

        profileId.textContent =
            facultyEmail;
    }
}


/* ======================================================
   SIMPLE PLACEHOLDER SECTIONS
====================================================== */

function renderIdeas() {

    const list =
        document.getElementById(
            "ideasList"
        );

    const empty =
        document.getElementById(
            "ideasEmpty"
        );

    if (!list || !empty) {
        return;
    }

    list.innerHTML = "";

    empty.classList.remove(
        "hidden"
    );

    empty.textContent =
        "Student idea management will be connected to Supabase next.";
}


function renderReports() {

    const table =
        document.getElementById(
            "reportsTable"
        );

    const empty =
        document.getElementById(
            "reportsEmpty"
        );

    if (!table || !empty) {
        return;
    }

    table.innerHTML = "";

    empty.classList.remove(
        "hidden"
    );

    empty.textContent =
        "Project report management will be connected to Supabase next.";
}


function renderUnmanaged() {

    const grid =
        document.getElementById(
            "unmanagedGrid"
        );

    const empty =
        document.getElementById(
            "unmanagedEmpty"
        );

    if (!grid || !empty) {
        return;
    }

    grid.innerHTML = "";

    empty.classList.remove(
        "hidden"
    );

    empty.textContent =
        "Unmanaged students will be connected to Supabase next.";
}


function renderTags() {

    const list =
        document.getElementById(
            "tagManageList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <p class="empty-state">
            Project tags will be connected to Supabase next.
        </p>
    `;
}


/* ======================================================
   NOTIFICATIONS
====================================================== */

function renderNotifications() {

    const list =
        document.getElementById(
            "notificationsList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `

        <div class="notification-item">

            <span class="notification-icon">
                👤
            </span>

            <span class="notification-text">

                Faculty account loaded successfully.

                <span class="notification-date">
                    ${facultyEmail}
                </span>

            </span>

        </div>

        <div class="notification-item">

            <span class="notification-icon">
                📁
            </span>

            <span class="notification-text">

                ${myProjectsData.length}
                project${myProjectsData.length !== 1 ? "s" : ""}
                assigned to you.

            </span>

        </div>
    `;
}


function renderNotifBadge() {

    const badge =
        document.getElementById(
            "notifBadge"
        );

    if (!badge) {
        return;
    }

    badge.classList.add(
        "hidden"
    );
}


/* ======================================================
   EVENT DELEGATION
====================================================== */

document.addEventListener(
    "click",
    (event) => {

        const openButton =
            event.target.closest(
                "[data-open]"
            );

        if (openButton) {

            openDetailModal(
                openButton.dataset.open
            );

            return;
        }


        const gotoButton =
            event.target.closest(
                "[data-goto]"
            );

        if (gotoButton) {

            goToTab(
                gotoButton.dataset.goto
            );

            return;
        }


        const studentButton =
            event.target.closest(
                "[data-student-email]"
            );

        if (studentButton) {

            openStudentModal(
                studentButton.dataset.studentEmail
            );

            return;
        }

        const acceptButton =
            event.target.closest(
                "[data-accept-interest]"
            );

        if (acceptButton) {

            acceptInterest(
                acceptButton.dataset.acceptInterest
            );

            return;
        }

        const rejectButton =
            event.target.closest(
                "[data-reject-interest]"
            );

        if (rejectButton) {

            rejectInterest(
                rejectButton.dataset.rejectInterest
            );

            return;
        }
    }
);


/* ======================================================
   FILTER EVENTS
====================================================== */

document
    .getElementById(
        "projectsStatusChips"
    )
    ?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-project-status]"
                );

            if (!button) {
                return;
            }

            projectsActiveStatus =
                button.dataset.projectStatus;

            renderProjectsChips();
            renderMyProjects();
        }
    );


document
    .getElementById(
        "projectsYearSelect"
    )
    ?.addEventListener(
        "change",
        (event) => {

            projectsActiveSemester =
                event.target.value;

            renderMyProjects();
        }
    );


document
    .getElementById(
        "discoverStatusChips"
    )
    ?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-discover-status]"
                );

            if (!button) {
                return;
            }

            discoverStatus =
                button.dataset.discoverStatus;

            renderDiscoverChips();
            renderDiscover();
        }
    );


document
    .getElementById(
        "discoverDomainChips"
    )
    ?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-discover-domain]"
                );

            if (!button) {
                return;
            }

            discoverDomain =
                button.dataset.discoverDomain;

            renderDiscoverChips();
            renderDiscover();
        }
    );


document
    .getElementById(
        "discoverSearch"
    )
    ?.addEventListener(
        "input",
        (event) => {

            discoverSearch =
                event.target.value
                    .trim();

            renderDiscover();
        }
    );


document
    .getElementById(
        "discoverMentorSelect"
    )
    ?.addEventListener(
        "change",
        (event) => {

            discoverMentor =
                event.target.value;

            renderDiscover();
        }
    );


/* ======================================================
   SIDEBAR
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


/* ======================================================
   INITIALIZE
====================================================== */

async function initializeFacultyDashboard() {

    console.log(
        "Initializing ILGC Faculty Dashboard..."
    );

    const profileLoaded =
        await loadFacultyProfile();

    if (!profileLoaded) {

        console.error(
            "Faculty profile could not be loaded."
        );

        return;
    }


    /* ----------------------------------------------
       Load all projects
    ---------------------------------------------- */

    let allProjects =
        await loadAllProjects();

    allProjects =
        await loadProjectDomains(
            allProjects
        );

    allProjects =
        await loadProjectMentors(
            allProjects
        );


    /* ----------------------------------------------
       Load faculty projects
    ---------------------------------------------- */

    let myProjects =
        await loadMyProjects();

    myProjects =
        await loadProjectDomains(
            myProjects
        );

    myProjects =
        await loadProjectMentors(
            myProjects
        );


    allProjectsData =
        allProjects;

    myProjectsData =
        myProjects;


    console.log(
        "All projects from Supabase:",
        allProjectsData
    );

    console.log(
        "My projects from Supabase:",
        myProjectsData
    );


    /* ----------------------------------------------
       Load students (team roster - used for project card
       and Home page student counts). Interested Students tab
       is disabled for now, so we don't load pending interests.
    ---------------------------------------------- */

    myProjectMembersData =
        await loadProjectTeamMembers();


    console.log(
        "Students in my projects:",
        myProjectMembersData
    );


    /* ----------------------------------------------
       Render
    ---------------------------------------------- */

    renderProjectsChips();
    renderProjectsSemesterFilter();

    renderDiscoverChips();

    renderHome();
    renderMyProjects();
    renderDiscover();

    renderIdeas();
    renderReports();
    renderUnmanaged();
    renderTags();

    renderNotifications();
    renderNotifBadge();

    renderProfile();


    console.log(
        "ILGC Faculty Dashboard loaded successfully."
    );
}


initializeFacultyDashboard();
