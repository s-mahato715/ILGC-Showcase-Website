/* ======================================================
   PROJECT DATA
   SHOWCASE_PROJECTS (data.js) is the public set of real
   ILGC project handbook entries shown to visitors — kept
   separate from the internal portals' project data.
====================================================== */

const VISIBLE_PROJECTS = SHOWCASE_PROJECTS;


/* ======================================================
   DOMAIN ICONS
   A small icon/gradient stands in for a project photo
   since real project photography isn't available yet.
====================================================== */

const DOMAIN_ICON = {
    "AI / Machine Learning": "🤖",
    "Robotics & Embedded Systems": "⚙️",
    "Sustainability": "🌱",
    "Healthcare Tech": "🩺"
};

const DOMAIN_GRADIENT = {
    "AI / Machine Learning": "linear-gradient(135deg, #0E6E68, #17313A)",
    "Robotics & Embedded Systems": "linear-gradient(135deg, #00A9B8, #0E6E68)",
    "Sustainability": "linear-gradient(135deg, #4B9E5F, #0E6E68)",
    "Healthcare Tech": "linear-gradient(135deg, #C24E3A, #8C3A2C)"
};

function statusChipClass(status) {
    if (status === "Ongoing") return "badge-ongoing";
    if (status === "Completed") return "badge-completed";
    if (status === "Proposed") return "badge-proposed";
    return "";
}


/* ======================================================
   DOMAIN + STATUS FILTER DATA
====================================================== */

const DOMAINS = [
    "All",
    "AI / Machine Learning",
    "Robotics & Embedded Systems",
    "Sustainability",
    "Healthcare Tech"
];

const STATUSES = ["All", "Ongoing", "Completed", "Proposed"];

let activeDomain = "All";
let activeStatus = "All";
let searchTerm = "";


/* ======================================================
   ELEMENTS
====================================================== */

const domainChipsEl = document.getElementById("domainChips");
const statusChipsEl = document.getElementById("statusChips");
const cardGrid = document.getElementById("cardGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");
const navSearch = document.getElementById("navSearch");


/* ======================================================
   RENDER DOMAIN + STATUS CHIPS
====================================================== */

function renderChips() {

    domainChipsEl.innerHTML = DOMAINS.map(
        (domain) => `
            <button
                class="chip"
                data-domain="${domain}"
                data-active="${domain === activeDomain}"
            >
                ${domain}
            </button>
        `
    ).join("");

    if (statusChipsEl) {
        statusChipsEl.innerHTML = STATUSES.map(
            (status) => `
                <button
                    class="chip"
                    data-status="${status}"
                    data-active="${status === activeStatus}"
                >
                    ${status}
                </button>
            `
        ).join("");
    }
}


/* ======================================================
   DOMAIN + STATUS FILTER
====================================================== */

domainChipsEl.addEventListener("click", (event) => {

    const button = event.target.closest("button[data-domain]");

    if (!button) return;

    activeDomain = button.dataset.domain;

    renderChips();
    renderCards();
});

if (statusChipsEl) {
    statusChipsEl.addEventListener("click", (event) => {

        const button = event.target.closest("button[data-status]");

        if (!button) return;

        activeStatus = button.dataset.status;

        renderChips();
        renderCards();
    });
}


/* ======================================================
   SEARCH
====================================================== */

if (navSearch) {

    navSearch.addEventListener("input", (event) => {

        searchTerm = event.target.value
            .trim()
            .toLowerCase();

        renderCards();
    });

}


/* ======================================================
   FILTER PROJECTS
====================================================== */

function matchesFilters(project) {

    const domainMatch =
        activeDomain === "All" ||
        project.domain === activeDomain;

    const statusMatch =
        activeStatus === "All" ||
        project.status === activeStatus;

    const searchMatch =
        !searchTerm ||
        project.title.toLowerCase().includes(searchTerm) ||
        project.summary.toLowerCase().includes(searchTerm) ||
        project.domain.toLowerCase().includes(searchTerm) ||
        project.mentor.toLowerCase().includes(searchTerm);

    return domainMatch && statusMatch && searchMatch;
}


/* ======================================================
   RENDER PROJECT CARDS
====================================================== */

function renderCards() {

    const filteredProjects = VISIBLE_PROJECTS.filter(matchesFilters);

    /* Project count */

    resultCount.textContent =
        `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""}`;


    /* No projects */

    if (filteredProjects.length === 0) {

        cardGrid.innerHTML = "";

        emptyState.classList.remove("hidden");

        return;
    }


    emptyState.classList.add("hidden");


    /* Project cards */

    cardGrid.innerHTML = filteredProjects.map(
        (project) => `
            <article class="project-card fade-up" data-project-open="${project.id}" style="cursor:pointer;">

                <!-- PROJECT VISUAL -->

                <div class="project-image" style="background:${DOMAIN_GRADIENT[project.domain] || "#0E6E68"};display:flex;align-items:center;justify-content:center;position:relative;">
                    <span style="font-size:56px;line-height:1;">${DOMAIN_ICON[project.domain] || "💡"}</span>
                    <span class="status-pill ${statusChipClass(project.status)}" style="position:absolute;top:14px;right:14px;">${project.status}</span>
                </div>


                <!-- PROJECT INFORMATION -->

                <div class="project-content">

                    <!-- DOMAIN -->

                    <p class="project-domain">
                        ${project.domain}
                    </p>


                    <!-- TITLE -->

                    <h3 class="project-title">
                        ${project.title}
                    </h3>


                    <!-- DESCRIPTION -->

                    <p class="project-description">
                        ${project.summary}
                    </p>

                    ${project.sdg ? `<p class="project-sdg">${project.sdg}</p>` : ""}


                    <!-- MENTOR + BATCH -->

                    <div class="project-footer">

                        <p class="project-mentor">
                            ${project.mentor}
                        </p>

                        <p class="project-batch">
                            ${project.cohort}
                        </p>

                    </div>

                </div>

            </article>
        `
    ).join("");
}


/* ======================================================
   PROJECT DETAIL MODAL
====================================================== */

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

function openProjectModal(projectId) {
    const project = VISIBLE_PROJECTS.find((p) => p.id === projectId);
    if (!project || !modalOverlay || !modalBody) return;

    modalBody.innerHTML = `
        <p class="project-domain" style="margin-bottom:10px;">${project.domain}</p>

        <div class="flex items-start justify-between gap-4" style="margin-bottom:6px;">
            <h3 class="project-title" style="margin-bottom:0;">${project.title}</h3>
            <span class="status-pill ${statusChipClass(project.status)}" style="flex-shrink:0;">${project.status}</span>
        </div>

        ${project.sdg ? `<p class="project-sdg" style="margin-top:6px;">${project.sdg}</p>` : ""}

        <p class="project-description" style="margin-top:14px;">${project.summary}</p>

        <div class="project-footer" style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
            <div>
                <p style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#789096; margin-bottom:4px;">ILGC Faculty</p>
                <p class="project-mentor" style="margin:0;">${project.mentor}</p>
            </div>
            <div>
                <p style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#789096; margin-bottom:4px;">Cohort</p>
                <p class="project-batch" style="margin:0;">${project.cohort}</p>
            </div>
        </div>
    `;

    modalOverlay.classList.remove("hidden");
    modalOverlay.classList.add("flex");
    document.body.style.overflow = "hidden";
}

function closeProjectModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add("hidden");
    modalOverlay.classList.remove("flex");
    document.body.style.overflow = "";
}

cardGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-open]");
    if (!card) return;
    openProjectModal(card.dataset.projectOpen);
});

if (modalClose) {
    modalClose.addEventListener("click", closeProjectModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) closeProjectModal();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProjectModal();
});


/* ======================================================
   INITIALIZE
====================================================== */

renderChips();
renderCards();