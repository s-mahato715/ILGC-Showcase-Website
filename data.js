/* ======================================================
   SHARED PROJECT DATA
   Used by index.html (visitor) and student-dashboard.html
   Stands in for the real project database until the
   backend/API layer exists.
====================================================== */

const PROJECTS = [
    {
        id: "aerosense",
        title: "AeroSense: Low-Cost Air Quality Sensing",
        domain: "Sustainability",
        status: "Ongoing",
        summary:
            "A distributed low-cost sensor mesh estimating street-level PM2.5 across dense urban wards. Closes the gap between satellite estimates and what residents actually breathe.",
        expectedOutcome:
            "A field-tested sensor mesh design and open dataset that ward-level health officials can use to target interventions.",
        mentor: "Dr. Ananya Rao",
        cohort: "Batch of 2026",
        image: "images/aerosense.jpg",
        progress: 65,
        tags: ["Sustainability", "IoT"],
        team: [
            { name: "Ishaan Bhatt", semester: 7 },
            { name: "Riya Kapoor", semester: 5 },
            { name: "Devansh Rao", semester: 3 }
        ]
    },

    {
        id: "gaitassist",
        title: "GaitAssist: Wearable Rehab Feedback",
        domain: "Healthcare Tech",
        status: "Ongoing",
        summary:
            "A wearable IMU insole that gives real-time gait correction cues to post-stroke patients during physiotherapy. Built with clinicians at a partner hospital.",
        expectedOutcome:
            "A clinically validated insole prototype ready for a small-cohort hospital trial.",
        mentor: "Dr. Farhan Qureshi",
        cohort: "Batch of 2027",
        image: "images/gaitassist.jpg",
        progress: 45,
        tags: ["Healthcare", "IoT"],
        team: [
            { name: "Meher Chandok", semester: 5 },
            { name: "Aarav Sethi", semester: 5 }
        ]
    },

    {
        id: "fieldbot",
        title: "FieldBot: Autonomous Crop Scout",
        domain: "Robotics & Embedded Systems",
        status: "Completed",
        summary:
            "A four-wheeled field robot that scouts crop rows for early pest and nutrient-deficiency signs using onboard vision, cutting manual scouting time for smallholder farms.",
        expectedOutcome:
            "Deployed at a partner farm; scouting time cut by an estimated 70%.",
        mentor: "Dr. Priya Menon",
        cohort: "Batch of 2025",
        image: "images/fieldbot.jpg",
        progress: 100,
        tags: ["Robotics", "Sustainability"],
        team: [
            { name: "Kabir Malhotra", semester: 7 },
            { name: "Ananya Iyer", semester: 7 }
        ]
    },

    {
        id: "creditlens",
        title: "CreditLens: Explainable Microloan Scoring",
        domain: "AI / Machine Learning",
        status: "Proposed",
        summary:
            "An interpretable credit-scoring model for first-time microloan applicants without formal credit history, built to reduce opaque rejections.",
        expectedOutcome:
            "A prototype scoring model with a plain-language explanation for every decision, tested against anonymized loan data.",
        mentor: "Dr. Ananya Rao",
        cohort: "Batch of 2026",
        image: "images/creditlens.jpg",
        progress: 5,
        tags: ["AI"],
        team: []
    },

    {
        id: "handspeak",
        title: "HandSpeak: Real-Time ISL Translator",
        domain: "AI / Machine Learning",
        status: "Ongoing",
        summary:
            "An on-device model that translates Indian Sign Language gestures to text and speech in real time, aimed at making campus front-desks and clinics more accessible.",
        expectedOutcome:
            "A working demo installed at one campus front-desk, with translation accuracy benchmarked against a signed test set.",
        mentor: "Dr. Farhan Qureshi",
        cohort: "Batch of 2027",
        image: "images/handspeak.jpg",
        progress: 30,
        tags: ["AI", "Education"],
        team: [
            { name: "Sana Verma", semester: 3 }
        ]
    },

    {
        id: "microgrid",
        title: "MicroGrid Balancer",
        domain: "Sustainability",
        status: "Completed",
        summary:
            "A reinforcement-learning controller that balances battery, solar, and diesel backup for a rural microgrid, cutting diesel runtime at a partner village site.",
        expectedOutcome:
            "Deployed controller cut diesel runtime by roughly a third at the pilot site over one season.",
        mentor: "Dr. Priya Menon",
        cohort: "Batch of 2025",
        image: "images/microgrid.jpg",
        progress: 100,
        tags: ["Sustainability", "IoT"],
        team: [
            { name: "Yash Trivedi", semester: 7 },
            { name: "Nikhat Ali", semester: 5 }
        ]
    }
];


/* ======================================================
   PUBLIC SHOWCASE PROJECTS
   Shown only on the visitor-facing index.html landing page.
   Pulled from the real ILGC-III (2026) Project Handbook so
   visitors see actual course projects rather than the
   internal portals' placeholder data above.
====================================================== */

const SHOWCASE_PROJECTS = [
    {
        id: "showcase-glucose",
        title: "Non-Invasive Glucose Monitoring",
        domain: "Healthcare Tech",
        status: "Ongoing",
        sdg: "SDG 3 – Good Health and Well-being",
        summary:
            "A wearable device that fuses multiple sensing modalities with a self-calibrating on-device algorithm, aiming to measure blood glucose accurately without a single needle prick.",
        mentor: "Dr. Deepan Muthirayan",
        cohort: "ILGC-III · 2026"
    },
    {
        id: "showcase-auv",
        title: "Autonomous Underwater Vehicle: Design & Intelligence",
        domain: "Robotics & Embedded Systems",
        status: "Ongoing",
        sdg: "SDG 14 – Life Below Water",
        summary:
            "A 5-degree-of-freedom underwater vehicle built from scratch, combining custom navigation and perception software with real-time sensing and manipulation hardware for underwater exploration.",
        mentor: "Dr. Sandeep Manjanna",
        cohort: "ILGC-III · 2026"
    },
    {
        id: "showcase-drone-acoustics",
        title: "Acoustic Detection System for Low-Flying Drones",
        domain: "Robotics & Embedded Systems",
        status: "Proposed",
        sdg: "SDG 9 – Industry, Innovation & Infrastructure",
        summary:
            "A 64-channel microphone array that listens for and locates low-flying drones using beamforming and AI-based sound classification — a low-cost alternative to radar-based surveillance, built in partnership with a drone startup.",
        mentor: "Dr. Shashank Tamaskar",
        cohort: "ILGC-III · 2026"
    },
    {
        id: "showcase-mxene",
        title: "Smart MXene–Silk Fibroin Wound Dressings",
        domain: "Healthcare Tech",
        status: "Ongoing",
        sdg: "SDG 3 – Good Health and Well-being",
        summary:
            "Biocompatible silk fibroin hydrogels laced with conductive MXene nanomaterials, exploring whether a wound dressing can sense its own hydration, deformation, and degradation as it heals.",
        mentor: "Dr. Rucha Joshi",
        cohort: "ILGC-III · 2026"
    },
    {
        id: "showcase-solar-lighting",
        title: "Solar-Powered Campus Lighting System",
        domain: "Sustainability",
        status: "Completed",
        sdg: "SDG 7 – Affordable and Clean Energy",
        summary:
            "Motion-sensor-driven, solar-powered pathway lighting that replaces grid-powered fixtures across campus, with an in-house controller that dims or switches lights based on movement to cut energy use.",
        mentor: "Dr. Anil Roy",
        cohort: "ILGC-III · 2026"
    },
    {
        id: "showcase-geofm",
        title: "Drone–Satellite Foundation Model for Earth Monitoring",
        domain: "AI / Machine Learning",
        status: "Proposed",
        sdg: "SDG 13 – Climate Action",
        summary:
            "A unified AI model that aligns drone and satellite imagery in a shared representation space, enabling scalable, precise Earth monitoring by transferring knowledge across very different spatial scales.",
        mentor: "Dr. Shashank Tamaskar",
        cohort: "ILGC-III · 2026"
    }
];


/* ======================================================
   PROJECT OVERLAY
   There's no backend yet, so faculty-side "float new
   project" / "edit project" / "change status" actions are
   stored as a localStorage overlay on top of the base
   PROJECTS array above. getAllProjects() is what every
   portal should read from — never PROJECTS directly —
   so newly floated or edited projects show up everywhere.
====================================================== */

const PROJECT_OVERLAY_KEY = "ilgc_project_overlay";

function loadProjectOverlay() {
    try {
        const raw = localStorage.getItem(PROJECT_OVERLAY_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            added: parsed.added || [],
            edited: parsed.edited || {},
            deleted: parsed.deleted || []
        };
    } catch (err) {
        return { added: [], edited: {}, deleted: [] };
    }
}

function saveProjectOverlay(overlay) {
    localStorage.setItem(PROJECT_OVERLAY_KEY, JSON.stringify(overlay));
}

function getAllProjects() {
    const overlay = loadProjectOverlay();
    const deleted = new Set(overlay.deleted || []);

    const base = PROJECTS.map((project) => ({
        origin: "faculty",          // base projects were floated by faculty
        ...project,
        ...(overlay.edited[project.id] || {})
    }));

    // Ensure every project (including overlay-added ones) carries an origin,
    // and drop anything that has been deleted.
    return [...base, ...overlay.added]
        .map((p) => ({ origin: "faculty", ...p }))
        .filter((p) => !deleted.has(p.id));
}

function addProject(project) {
    const overlay = loadProjectOverlay();
    overlay.added.push(project);
    saveProjectOverlay(overlay);
}

function deleteProject(projectId) {
    const overlay = loadProjectOverlay();
    // Remove from added if it was an overlay-added project...
    overlay.added = overlay.added.filter((p) => p.id !== projectId);
    // ...and mark it deleted so base projects are hidden too.
    if (!overlay.deleted.includes(projectId)) {
        overlay.deleted.push(projectId);
    }
    saveProjectOverlay(overlay);
}

function editProject(projectId, fields) {
    const overlay = loadProjectOverlay();
    overlay.edited[projectId] = { ...(overlay.edited[projectId] || {}), ...fields };
    saveProjectOverlay(overlay);
}

/* Human-readable label for who floated a project, shown across all
   three portals so everyone can see whether a student, ILGC faculty,
   or mentor originated it. */
function projectOriginLabel(project) {
    const map = {
        student: "Student-floated",
        faculty: "Faculty-floated",
        mentor: "Mentor-floated"
    };
    const base = map[(project && project.origin) || "faculty"] || "Faculty-floated";
    // If we know who specifically floated it, append their name.
    if (project && project.floatedByName) {
        return `${base} · ${project.floatedByName}`;
    }
    return base;
}


/* ======================================================
   STUDENT PROFILE DERIVATION
   No student directory exists yet, so a display name +
   semester is deterministically derived from the userId.
   Same userId always produces the same profile, and both
   the student and faculty portals use this same function
   so names line up across portals.
====================================================== */

const STUDENT_NAMES = [
    "Gayathri", "Aarav", "Meher", "Ishaan", "Riya",
    "Devansh", "Sana", "Kabir", "Ananya", "Nikhat"
];

function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function deriveStudentProfile(studentUserId) {
    const hash = hashString(studentUserId);
    return {
        name: STUDENT_NAMES[hash % STUDENT_NAMES.length],
        semester: [1, 3, 5, 7][hash % 4]
    };
}


/* ======================================================
   COHORT SEGREGATION
   Every student in the system only carries a "semester"
   (1/3/5/7 ≈ year 1-4). This derives the admitting-batch
   cohort code (UG24, UG25, ...) from that semester so
   students can be grouped/filtered by cohort across the
   Faculty and ILGC Mentor portals without adding a new
   field everywhere.
====================================================== */

const ILGC_CURRENT_YEAR = 2026;

function cohortCodeFromSemester(semester) {
    const yearsCompleted = Math.ceil(Number(semester || 1) / 2) - 1;
    const admissionYear = ILGC_CURRENT_YEAR - yearsCompleted;
    return "UG" + String(admissionYear).slice(-2);
}

function getAllCohortCodes() {
    const semesters = [1, 3, 5, 7];
    return semesters.map(cohortCodeFromSemester);
}


/* ======================================================
   ACADEMIC YEAR
   Semesters map to study years: 1->1st, 3->2nd, 5->3rd,
   7->4th. The Faculty and ILGC Mentor portals let a mentor
   filter their projects by the study year of the students
   on them (e.g. "2nd Year", "3rd Year"), so these helpers
   turn a semester into a year label and a project into the
   set of year labels present on its team.
====================================================== */

const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/* Only these years are offered in the Faculty / ILGC year dropdowns.
   ILGC projects are run by 2nd- and 3rd-year students, so the filter
   is limited to those two even though the mapping above still covers
   every semester correctly. */
const YEAR_FILTER_OPTIONS = ["2nd Year", "3rd Year"];

function yearFromSemester(semester) {
    const idx = Math.max(0, Math.ceil(Number(semester || 1) / 2) - 1);
    return YEAR_LABELS[Math.min(idx, YEAR_LABELS.length - 1)];
}

/* Which study years are represented on a project's team. */
function projectYears(project) {
    const team = (project && project.team) || [];
    return [...new Set(team.map((m) => yearFromSemester(m.semester)))];
}

function projectHasYear(project, yearLabel) {
    if (yearLabel === "All") return true;
    return projectYears(project).includes(yearLabel);
}


/* ======================================================
   STUDENT EMAIL (derived)
   No student directory with real addresses exists yet, so
   a Plaksha-style email is derived deterministically from
   the student's name (e.g. "Vihaan Kapoor" ->
   vihaan.kapoor@plaksha.edu.in). Used by the "Email Student"
   action, which opens the faculty member's mail client
   (Outlook / default) with a pre-addressed message.
====================================================== */

const STUDENT_EMAIL_DOMAIN = "plaksha.edu.in";

/* Derive a plaksha email handle from a person's name.
   Drops any "Dr." / title prefix, punctuation, and joins words with dots.
   "Vihaan Kapoor" -> vihaan.kapoor@plaksha.edu.in
   "Dr. Ananya Rao" -> ananya.rao@plaksha.edu.in */
function personEmail(name) {
    const handle = String(name || "")
        .replace(/\b(dr|prof|mr|mrs|ms)\.?\s+/gi, "")  // drop titles
        .trim()
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")   // drop punctuation
        .replace(/\s+/g, ".");       // spaces -> dots
    return `${handle || "user"}@${STUDENT_EMAIL_DOMAIN}`;
}

// Backwards-compatible aliases used across the portals.
function studentEmail(name) { return personEmail(name); }
function facultyEmail(name) { return personEmail(name); }


/* ======================================================
   FACULTY PROFILE DERIVATION
   Same idea as students: no faculty directory exists yet,
   so a logged-in faculty userId is deterministically
   mapped to one of the mentors already present in the
   project data, so "my projects" has real projects in it.
====================================================== */

function deriveFacultyProfile(facultyUserId) {
    return {
        name: facultyUserId
    };
}


/* ======================================================
   ILGC MENTOR PROFILE DERIVATION
   The "ILGC Mentor" role (login.html -> role "ilgc") is the
   institute-wide mentor/coordinator seat: unlike Faculty
   (who only see their own projects), an ILGC Mentor sees
   student interest, proposals, groups and reports across
   every domain and every faculty member's projects.
====================================================== */

const ILGC_MENTOR_NAMES = ["Dr. Kavita Subramaniam", "Dr. Rahul Bose", "Dr. Meera Iyengar"];

function deriveIlgcMentorProfile(mentorUserId) {
    const hash = hashString(mentorUserId);
    return {
        name: ILGC_MENTOR_NAMES[hash % ILGC_MENTOR_NAMES.length]
    };
}


/* ======================================================
   PROJECT MILESTONES
   Lightweight milestone timeline per project, used by the
   Mentor (ILGC) portal's group cards and group detail view.
====================================================== */

const PROJECT_MILESTONES = {
    aerosense: [
        { title: "Sensor mesh design finalized", date: "2026-05-10", done: true },
        { title: "12 of 20 nodes deployed", date: "2026-08-18", done: true },
        { title: "Full ward-4 rollout", date: "2026-09-30", done: false },
        { title: "Open dataset publication", date: "2026-11-15", done: false }
    ],
    gaitassist: [
        { title: "IMU insole prototype v1", date: "2026-04-02", done: true },
        { title: "Clinician co-design review", date: "2026-06-15", done: true },
        { title: "3-volunteer pilot test", date: "2026-08-05", done: true },
        { title: "Small-cohort hospital trial", date: "2026-10-20", done: false }
    ],
    fieldbot: [
        { title: "Chassis + vision pipeline", date: "2025-11-01", done: true },
        { title: "Partner farm deployment", date: "2026-05-15", done: true },
        { title: "Final report submitted", date: "2026-06-20", done: true }
    ],
    creditlens: [
        { title: "Problem scoping & data access", date: "2026-08-01", done: true },
        { title: "First interpretable model draft", date: "2026-09-15", done: false }
    ],
    handspeak: [
        { title: "40-sign vocabulary model", date: "2026-05-20", done: true },
        { title: "On-device optimization to 14fps", date: "2026-08-21", done: true },
        { title: "Campus front-desk pilot install", date: "2026-10-01", done: false }
    ],
    microgrid: [
        { title: "RL controller v1", date: "2025-09-01", done: true },
        { title: "Village pilot deployment", date: "2026-01-10", done: true },
        { title: "Final report submitted", date: "2026-05-12", done: true }
    ]
};

function nextMilestoneFor(projectId) {
    const milestones = PROJECT_MILESTONES[projectId] || [];
    return milestones.find((m) => !m.done) || null;
}


/* ======================================================
   INTERESTS (cross-portal)
   Each student's interests live in their own localStorage
   key (interests_<userId>) — see student-dashboard.js.
   Since this is one browser standing in for the whole
   system, the faculty portal aggregates across every
   interests_* key it can find so "who's interested in my
   projects" works without a real backend.
====================================================== */

function loadInterestsFor(studentUserId) {
    try {
        const raw = localStorage.getItem(`interests_${studentUserId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        return [];
    }
}

function saveInterestsFor(studentUserId, interests) {
    localStorage.setItem(`interests_${studentUserId}`, JSON.stringify(interests));
}

function getAllInterestsAcrossStudents() {
    const results = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("interests_")) continue;

        const studentUserId = key.slice("interests_".length);
        const interests = loadInterestsFor(studentUserId);

        interests.forEach((interest) => {
            results.push({ ...interest, studentUserId });
        });
    }

    return results;
}

function updateInterestStatus(studentUserId, projectId, newStatus) {
    const interests = loadInterestsFor(studentUserId);
    const interest = interests.find((i) => i.projectId === projectId);
    if (!interest) return;

    interest.status = newStatus;
    saveInterestsFor(studentUserId, interests);
}


/* ======================================================
   PROJECT TAGS
   A single shared tag vocabulary used across Faculty and
   Mentor (ILGC) portals. Stored as a localStorage overlay
   on top of a default starter list so both portals see the
   same tags without a real backend.
====================================================== */

const DEFAULT_TAGS = [
    "AI", "Healthcare", "IoT", "Computer Vision",
    "Education", "Sustainability", "Robotics"
];

const TAGS_KEY = "ilgc_tags";

function loadTags() {
    try {
        const raw = localStorage.getItem(TAGS_KEY);
        return raw ? JSON.parse(raw) : [...DEFAULT_TAGS];
    } catch (err) {
        return [...DEFAULT_TAGS];
    }
}

function saveTags(tags) {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const tags = loadTags();
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        tags.push(trimmed);
        saveTags(tags);
    }
}

function editTagName(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const tags = loadTags();
    const idx = tags.indexOf(oldName);
    if (idx === -1) return;
    tags[idx] = trimmed;
    saveTags(tags);

    // Cascade the rename onto any project/idea currently carrying the old tag
    getAllProjects().forEach((project) => {
        if ((project.tags || []).includes(oldName)) {
            const newTags = project.tags.map((t) => (t === oldName ? trimmed : t));
            editProject(project.id, { tags: newTags });
        }
    });

    getAllIdeas().forEach((idea) => {
        if ((idea.tags || []).includes(oldName)) {
            const newTags = idea.tags.map((t) => (t === oldName ? trimmed : t));
            updateIdea(idea.id, { tags: newTags });
        }
    });
}

function removeTag(name) {
    const tags = loadTags().filter((t) => t !== name);
    saveTags(tags);

    getAllProjects().forEach((project) => {
        if ((project.tags || []).includes(name)) {
            editProject(project.id, { tags: project.tags.filter((t) => t !== name) });
        }
    });

    getAllIdeas().forEach((idea) => {
        if ((idea.tags || []).includes(name)) {
            updateIdea(idea.id, { tags: idea.tags.filter((t) => t !== name) });
        }
    });
}


/* ======================================================
   STUDENT IDEAS
   Student-proposed project ideas awaiting faculty/mentor
   review — distinct from "interests" (which are students
   expressing interest in an *existing* project). Each idea
   targets one faculty mentor by name so it shows up as
   "Projects Proposed to Me" on that faculty member's
   dashboard, and carries a domain so the ILGC Mentor portal
   can surface it institute-wide.
====================================================== */

const STUDENT_IDEAS = [
    {
        id: "idea-01",
        title: "PulseCheck: Peer Mental Health Check-ins",
        studentName: "Gayathri Menon",
        studentSemester: 5,
        domain: "Healthcare Tech",
        problemStatement:
            "Most students only reach out for mental health support after a crisis point, because there's no low-friction way to signal 'I'm not okay' earlier.",
        scope:
            "A lightweight peer check-in app where students opt into a rotating buddy system, with escalation to counseling services built in.",
        proposedDate: "2026-08-14",
        status: "Pending",
        tags: ["Healthcare", "Education"],
        targetMentor: "Dr. Farhan Qureshi"
    },
    {
        id: "idea-02",
        title: "CampusFlow: Real-Time Shuttle Tracking",
        studentName: "Aarav Sethi",
        studentSemester: 3,
        domain: "IoT",
        problemStatement:
            "Campus shuttles run on a fixed schedule that's rarely accurate, so students end up waiting without knowing if a shuttle is 2 or 20 minutes away.",
        scope:
            "GPS-tagged shuttles feeding a live map and ETA predictions, starting with the two busiest routes as a pilot.",
        proposedDate: "2026-08-20",
        status: "Pending",
        tags: ["IoT"],
        targetMentor: "Dr. Ananya Rao"
    },
    {
        id: "idea-03",
        title: "SoilSense: Low-Cost Soil Health Kit",
        studentName: "Devansh Rao",
        studentSemester: 3,
        domain: "Sustainability",
        problemStatement:
            "Smallholder farmers near campus partner villages have no affordable way to test soil nutrient levels before planting each season.",
        scope:
            "A pH/NPK sensor kit paired with a phone app that gives plain-language planting recommendations, tested with two partner farms.",
        proposedDate: "2026-08-10",
        status: "Needs Revision",
        tags: ["Sustainability", "IoT"],
        targetMentor: "Dr. Priya Menon",
        feedback: "Promising, but please narrow the scope to one crop type for the first pilot and add a cost breakdown for the sensor kit."
    },
    {
        id: "idea-04",
        title: "LectureLens: Auto-Generated Lecture Summaries",
        studentName: "Sana Verma",
        studentSemester: 3,
        domain: "AI / Machine Learning",
        problemStatement:
            "Students who miss a lecture or need to revise before exams have no quick way to get a structured summary — only raw recordings.",
        scope:
            "A pipeline that transcribes recorded lectures and generates a structured summary with timestamped key points, piloted on two courses.",
        proposedDate: "2026-08-22",
        status: "Pending",
        tags: ["AI", "Education"],
        targetMentor: "Dr. Farhan Qureshi"
    },
    {
        id: "idea-05",
        title: "ScrapSort: Vision-Based Recycling Sorter",
        studentName: "Kabir Malhotra",
        studentSemester: 7,
        domain: "Robotics & Embedded Systems",
        problemStatement:
            "Campus recycling bins are frequently contaminated with non-recyclable waste because sorting is left entirely to guesswork at the point of disposal.",
        scope:
            "A camera-and-arm unit that identifies material type and sorts waste at one high-traffic bin as a proof of concept.",
        proposedDate: "2026-07-30",
        status: "Accepted",
        tags: ["Robotics", "Computer Vision"],
        targetMentor: "Dr. Priya Menon",
        feedback: "Solid scope for a first pilot — approved to move forward with the single-bin proof of concept."
    },
    {
        id: "idea-06",
        title: "BudgetBuddy: Student Micro-Finance Literacy",
        studentName: "Nikhat Ali",
        studentSemester: 5,
        domain: "AI / Machine Learning",
        problemStatement:
            "First-generation college students often arrive with no exposure to budgeting or credit, and existing finance apps assume that baseline knowledge.",
        scope:
            "A guided budgeting tool with plain-language explanations, targeted at first-year students as a semester-long pilot.",
        proposedDate: "2026-07-18",
        status: "Rejected",
        tags: ["AI", "Education"],
        targetMentor: "Dr. Ananya Rao",
        feedback: "Good intent, but this overlaps closely with an existing university financial-wellness initiative. Consider redirecting toward the CreditLens project instead."
    }
];

const IDEA_OVERLAY_KEY = "ilgc_idea_overlay";

function loadIdeaOverlay() {
    try {
        const raw = localStorage.getItem(IDEA_OVERLAY_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        // Backward-compatible: old format was a flat { ideaId: fields } map of
        // edits only. New format separates edits from student-added ideas.
        if (parsed && (parsed.edited || parsed.added)) {
            return { edited: parsed.edited || {}, added: parsed.added || [] };
        }
        return { edited: parsed || {}, added: [] };
    } catch (err) {
        return { edited: {}, added: [] };
    }
}

function saveIdeaOverlay(overlay) {
    localStorage.setItem(IDEA_OVERLAY_KEY, JSON.stringify(overlay));
}

function getAllIdeas() {
    const overlay = loadIdeaOverlay();
    const base = STUDENT_IDEAS.map((idea) => ({ ...idea, ...(overlay.edited[idea.id] || {}) }));
    // Added ideas can also carry their own later edits (accept/reject/revise).
    const added = (overlay.added || []).map((idea) => ({ ...idea, ...(overlay.edited[idea.id] || {}) }));
    return [...base, ...added];
}

function updateIdea(ideaId, fields) {
    const overlay = loadIdeaOverlay();
    overlay.edited[ideaId] = { ...(overlay.edited[ideaId] || {}), ...fields };
    saveIdeaOverlay(overlay);
}

/* A student floats a brand-new idea. It lands in the same store the
   Faculty "Student Ideas" and Mentor "Project Proposals" tabs read,
   so it shows up across all three portals immediately. */
function addIdea(idea) {
    const overlay = loadIdeaOverlay();
    overlay.added.push(idea);
    saveIdeaOverlay(overlay);
}


/* ======================================================
   PROJECT REPORTS
   Progress/final reports submitted per project. Each report
   links back to a project (for team/mentor context) and
   tracks an approval history timeline:
   Submitted → Under Review → Changes Requested → Resubmitted → Approved
====================================================== */

const REPORTS = [
    {
        id: "rpt-01",
        projectId: "aerosense",
        reportType: "Progress Report",
        submittedBy: "Ishaan Bhatt",
        submittedDate: "2026-08-18",
        status: "Submitted",
        preview:
            "Deployed 12 of 20 planned sensor nodes across Ward 4. Calibration against the reference monitor is within 8% mean error so far.",
        comments: [],
        history: [
            { status: "Submitted", date: "2026-08-18", by: "Ishaan Bhatt" }
        ]
    },
    {
        id: "rpt-02",
        projectId: "gaitassist",
        reportType: "Midterm Report",
        submittedBy: "Meher Chandok",
        submittedDate: "2026-08-05",
        status: "Changes Requested",
        preview:
            "Insole prototype v2 tested with 3 volunteers. Gait correction cues triggered correctly in 80% of recorded steps.",
        comments: [
            { author: "Dr. Farhan Qureshi", date: "2026-08-07", text: "Please add the IRB approval reference and clarify how the 80% figure was measured before resubmitting." }
        ],
        history: [
            { status: "Submitted", date: "2026-08-05", by: "Meher Chandok" },
            { status: "Under Review", date: "2026-08-06", by: "Dr. Farhan Qureshi" },
            { status: "Changes Requested", date: "2026-08-07", by: "Dr. Farhan Qureshi" }
        ]
    },
    {
        id: "rpt-03",
        projectId: "fieldbot",
        reportType: "Final Report",
        submittedBy: "Kabir Malhotra",
        submittedDate: "2026-06-20",
        status: "Approved",
        preview:
            "Final deployment at the partner farm complete. Scouting time reduced by an estimated 70% over a two-week trial window.",
        comments: [
            { author: "Dr. Priya Menon", date: "2026-06-24", text: "Great close-out report — approved. Nice work getting a real field trial done." }
        ],
        history: [
            { status: "Submitted", date: "2026-06-20", by: "Kabir Malhotra" },
            { status: "Under Review", date: "2026-06-22", by: "Dr. Priya Menon" },
            { status: "Approved", date: "2026-06-24", by: "Dr. Priya Menon" }
        ]
    },
    {
        id: "rpt-04",
        projectId: "handspeak",
        reportType: "Progress Report",
        submittedBy: "Sana Verma",
        submittedDate: "2026-08-21",
        status: "Under Review",
        preview:
            "On-device model now runs at 14fps on a mid-range phone. Gesture vocabulary expanded from 40 to 65 signs this cycle.",
        comments: [],
        history: [
            { status: "Submitted", date: "2026-08-21", by: "Sana Verma" },
            { status: "Under Review", date: "2026-08-22", by: "Dr. Farhan Qureshi" }
        ]
    },
    {
        id: "rpt-05",
        projectId: "microgrid",
        reportType: "Final Report",
        submittedBy: "Yash Trivedi",
        submittedDate: "2026-05-12",
        status: "Approved",
        preview:
            "Controller cut diesel runtime by roughly a third over one season at the pilot village site, matching the target outcome.",
        comments: [
            { author: "Dr. Priya Menon", date: "2026-05-15", text: "Approved — strong result and a clean writeup." }
        ],
        history: [
            { status: "Submitted", date: "2026-05-12", by: "Yash Trivedi" },
            { status: "Under Review", date: "2026-05-13", by: "Dr. Priya Menon" },
            { status: "Approved", date: "2026-05-15", by: "Dr. Priya Menon" }
        ]
    },
    {
        id: "rpt-06",
        projectId: "aerosense",
        reportType: "Resubmission",
        submittedBy: "Riya Kapoor",
        submittedDate: "2026-07-02",
        status: "Resubmitted",
        preview:
            "Addressed earlier feedback on calibration methodology. Updated error margin now reported per-node rather than as a single average.",
        comments: [
            { author: "Dr. Ananya Rao", date: "2026-06-28", text: "Please break the calibration error down per sensor node rather than one aggregate figure." }
        ],
        history: [
            { status: "Submitted", date: "2026-06-25", by: "Riya Kapoor" },
            { status: "Changes Requested", date: "2026-06-28", by: "Dr. Ananya Rao" },
            { status: "Resubmitted", date: "2026-07-02", by: "Riya Kapoor" }
        ]
    }
];

const REPORT_OVERLAY_KEY = "ilgc_report_overlay";

function loadReportOverlay() {
    try {
        const raw = localStorage.getItem(REPORT_OVERLAY_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return { edited: parsed.edited || {}, added: parsed.added || [] };
    } catch (err) {
        return { edited: {}, added: [] };
    }
}

function saveReportOverlay(overlay) {
    localStorage.setItem(REPORT_OVERLAY_KEY, JSON.stringify(overlay));
}

function getAllReports() {
    const overlay = loadReportOverlay();

    const base = REPORTS.map((report) => {
        const patch = overlay.edited[report.id] || {};
        return {
            ...report,
            ...patch,
            comments: patch.comments || report.comments,
            history: patch.history || report.history
        };
    });

    return [...base, ...overlay.added];
}

function updateReportStatus(reportId, newStatus, by, note) {
    const current = getAllReports().find((r) => r.id === reportId);
    if (!current) return;

    const history = [...current.history, { status: newStatus, date: new Date().toISOString().slice(0, 10), by }];
    const comments = note
        ? [...current.comments, { author: by, date: new Date().toISOString().slice(0, 10), text: note }]
        : current.comments;

    const overlay = loadReportOverlay();
    if (overlay.added.some((r) => r.id === reportId)) {
        overlay.added = overlay.added.map((r) => (r.id === reportId ? { ...r, status: newStatus, history, comments } : r));
    } else {
        overlay.edited[reportId] = { status: newStatus, history, comments };
    }
    saveReportOverlay(overlay);
}

function addReportComment(reportId, text, author) {
    const current = getAllReports().find((r) => r.id === reportId);
    if (!current) return;

    const comments = [...current.comments, { author, date: new Date().toISOString().slice(0, 10), text }];
    const overlay = loadReportOverlay();
    if (overlay.added.some((r) => r.id === reportId)) {
        overlay.added = overlay.added.map((r) => (r.id === reportId ? { ...r, comments } : r));
    } else {
        overlay.edited[reportId] = { ...(overlay.edited[reportId] || {}), comments, status: current.status, history: current.history };
    }
    saveReportOverlay(overlay);
}

function addReport(report) {
    const overlay = loadReportOverlay();
    overlay.added.push(report);
    saveReportOverlay(overlay);
}


/* ======================================================
   UNMANAGED STUDENTS
   Students not currently attached to any project/group.
   Static roster (no backend yet) with a localStorage
   overlay tracking who's since been assigned/dismissed so
   the list updates as faculty take action.
====================================================== */

const UNMANAGED_STUDENTS = [
    {
        id: "stu-101",
        name: "Vihaan Kapoor",
        department: "Computer Science",
        year: "3rd Year",
        semester: 5,
        skills: ["Python", "React", "Data Visualization"],
        interests: ["Healthcare", "AI"],
        preferredDomains: ["Healthcare Tech", "AI / Machine Learning"],
        previousProjects: ["Campus attendance dashboard (course project)"],
        availability: "Available now"
    },
    {
        id: "stu-102",
        name: "Ira Chatterjee",
        department: "Electronics & Communication",
        year: "2nd Year",
        semester: 3,
        skills: ["Embedded C", "PCB Design", "Sensors"],
        interests: ["IoT", "Sustainability"],
        preferredDomains: ["Sustainability", "Robotics & Embedded Systems"],
        previousProjects: [],
        availability: "Available now"
    },
    {
        id: "stu-103",
        name: "Arjun Desai",
        department: "Computer Science",
        year: "4th Year",
        semester: 7,
        skills: ["Computer Vision", "PyTorch", "Robotics"],
        interests: ["Robotics", "Computer Vision"],
        preferredDomains: ["Robotics & Embedded Systems"],
        previousProjects: ["FieldBot (contributor, Sem 5)"],
        availability: "Available from next month"
    },
    {
        id: "stu-104",
        name: "Zoya Ahmed",
        department: "Design",
        year: "2nd Year",
        semester: 3,
        skills: ["UX Research", "Figma", "Prototyping"],
        interests: ["Education", "Healthcare"],
        preferredDomains: ["Healthcare Tech", "Education"],
        previousProjects: [],
        availability: "Available now"
    },
    {
        id: "stu-105",
        name: "Rohan Pillai",
        department: "Computer Science",
        year: "3rd Year",
        semester: 5,
        skills: ["NLP", "Data Engineering", "SQL"],
        interests: ["AI", "Education"],
        preferredDomains: ["AI / Machine Learning"],
        previousProjects: ["CreditLens (contributor, Sem 3)"],
        availability: "Available now"
    },
    {
        id: "stu-106",
        name: "Diya Nair",
        department: "Environmental Science",
        year: "1st Year",
        semester: 1,
        skills: ["Field Data Collection", "GIS"],
        interests: ["Sustainability"],
        preferredDomains: ["Sustainability"],
        previousProjects: [],
        availability: "Available now"
    }
];

const UNMANAGED_OVERLAY_KEY = "ilgc_unmanaged_overlay";

function loadUnmanagedOverlay() {
    try {
        const raw = localStorage.getItem(UNMANAGED_OVERLAY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        return [];
    }
}

function saveUnmanagedOverlay(ids) {
    localStorage.setItem(UNMANAGED_OVERLAY_KEY, JSON.stringify(ids));
}

function getUnmanagedStudents() {
    const removed = new Set(loadUnmanagedOverlay());
    return UNMANAGED_STUDENTS.filter((s) => !removed.has(s.id));
}

function removeFromUnmanaged(studentId) {
    const removed = loadUnmanagedOverlay();
    if (!removed.includes(studentId)) {
        removed.push(studentId);
        saveUnmanagedOverlay(removed);
    }
}

function assignStudentToProject(studentId, projectId) {
    const student = UNMANAGED_STUDENTS.find((s) => s.id === studentId);
    if (!student) return;

    const project = getAllProjects().find((p) => p.id === projectId);
    if (project) {
        const team = [...(project.team || [])];
        if (!team.some((m) => m.name === student.name)) {
            team.push({ name: student.name, semester: student.semester });
        }
        editProject(projectId, { team });
    }

    removeFromUnmanaged(studentId);
}


/* ======================================================
   RECENT ACTIVITY (derived, cross-portal)
   Builds a unified, timestamp-sorted feed from ideas,
   reports and interests so both the Faculty and Mentor
   dashboards can show a live "Recent Activity" panel
   without a dedicated activity-log backend.
====================================================== */

function buildActivityFeed(limit) {
    const events = [];

    getAllIdeas().forEach((idea) => {
        events.push({
            date: idea.proposedDate,
            text: `${idea.studentName} submitted a new idea — "${idea.title}"`
        });
    });

    getAllReports().forEach((report) => {
        const project = getAllProjects().find((p) => p.id === report.projectId);
        events.push({
            date: report.submittedDate,
            text: `${report.submittedBy} submitted a ${report.reportType.toLowerCase()} for ${project ? project.title : "a project"}`
        });
        (report.history || []).forEach((h) => {
            if (h.status !== "Submitted") {
                events.push({ date: h.date, text: `${h.by} marked a report "${h.status}" on ${project ? project.title : "a project"}` });
            }
        });
    });

    getAllInterestsAcrossStudents().forEach((interest) => {
        const student = deriveStudentProfile(interest.studentUserId);
        const project = getAllProjects().find((p) => p.id === interest.projectId);
        events.push({
            date: (interest.submittedAt || "").slice(0, 10),
            text: `${student.name} expressed interest in ${project ? project.title : "a project"}`
        });
    });

    return events
        .filter((e) => e.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit || 6);
}


/* ======================================================
   PROJECT SHAREPOINT (workspace + shared report files)
   Each project can have a lightweight "SharePoint" workspace
   that a student on the team creates. Once created, the team
   can post report entries (a title, a note, and an optional
   link standing in for an uploaded file). These entries are
   visible to the whole team, the project's faculty mentor,
   and the institute-wide ILGC mentor — mirroring how a real
   SharePoint site is shared with the faculty reviewers.

   No backend yet, so the whole thing is a localStorage
   overlay keyed per project id.
====================================================== */

const SHAREPOINT_KEY = "ilgc_sharepoint";

function loadSharePointStore() {
    try {
        const raw = localStorage.getItem(SHAREPOINT_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        return {};
    }
}

function saveSharePointStore(store) {
    localStorage.setItem(SHAREPOINT_KEY, JSON.stringify(store));
}

/* Returns the workspace for a project, or null if none created yet.
   Shape: { createdBy, createdAt, files: [{ id, title, note, link, addedBy, addedAt }] } */
function getSharePoint(projectId) {
    const store = loadSharePointStore();
    return store[projectId] || null;
}

function hasSharePoint(projectId) {
    return Boolean(getSharePoint(projectId));
}

function createSharePoint(projectId, createdBy) {
    const store = loadSharePointStore();
    if (store[projectId]) return store[projectId];
    store[projectId] = {
        createdBy,
        createdAt: new Date().toISOString(),
        files: []
    };
    saveSharePointStore(store);
    return store[projectId];
}

function addSharePointFile(projectId, { title, note, link, addedBy }) {
    const store = loadSharePointStore();
    if (!store[projectId]) {
        store[projectId] = { createdBy: addedBy, createdAt: new Date().toISOString(), files: [] };
    }
    store[projectId].files.push({
        id: "spf-" + Date.now().toString(36),
        title: (title || "Untitled report").trim(),
        note: (note || "").trim(),
        link: (link || "").trim(),
        addedBy,
        addedAt: new Date().toISOString()
    });
    saveSharePointStore(store);
}

function removeSharePointFile(projectId, fileId) {
    const store = loadSharePointStore();
    if (!store[projectId]) return;
    store[projectId].files = store[projectId].files.filter((f) => f.id !== fileId);
    saveSharePointStore(store);
}
async function getMentorProfilesFromSupabase() {
    const { data, error } = await window.supabaseClient
        .from("mentor_profiles")
        .select("*");

    if (error) {
        console.error("Error loading mentor profiles:", error);
        return [];
    }

    return data || [];
}
