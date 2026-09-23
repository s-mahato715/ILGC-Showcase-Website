/* =========================================================
   ILGC FACULTY DASHBOARD DATA
   ========================================================= */

/*
   NOTE:
   The project/student data in this file is currently
   placeholder data.

   The Faculty Dashboard will eventually fetch the real
   data from Supabase.

   For now, we are ONLY removing the fake faculty-name
   assignment that was causing Sandilya to appear as
   "Dr. Ananya Rao".
*/


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

function hashString(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash);
}


/* =========================================================
   FACULTY PROFILE
   ========================================================= */

/*
   IMPORTANT:
   Previously this function used placeholder names:

   - Dr. Ananya Rao
   - Dr. Farhan Qureshi
   - Dr. Priya Menon

   based on a hash of the faculty email.

   That was the reason the wrong faculty name appeared.

   We are NOT doing that anymore.

   Until Supabase is connected to the Faculty Dashboard,
   we simply return the logged-in user ID.
*/

function deriveFacultyProfile(facultyUserId) {
    return {
        name: facultyUserId
    };
}


/* =========================================================
   PLACEHOLDER PROJECT DATA
   ========================================================= */

/*
   These projects are still placeholder data.

   DO NOT treat these as real database records.
   We will remove this data from the Faculty Dashboard
   once the dashboard is fully connected to Supabase.
*/

const PROJECTS = [
    {
        code: "aerosense",
        title: "AeroSense",
        mentor: "Dr. Ananya Rao",
        description: "Placeholder project"
    },
    {
        code: "gaitassist",
        title: "GaitAssist",
        mentor: "Dr. Farhan Qureshi",
        description: "Placeholder project"
    },
    {
        code: "fieldbot",
        title: "FieldBot",
        mentor: "Dr. Priya Menon",
        description: "Placeholder project"
    },
    {
        code: "creditlens",
        title: "CreditLens",
        mentor: "Dr. Ananya Rao",
        description: "Placeholder project"
    },
    {
        code: "handspeak",
        title: "HandSpeak",
        mentor: "Dr. Farhan Qureshi",
        description: "Placeholder project"
    },
    {
        code: "microgrid",
        title: "MicroGrid",
        mentor: "Dr. Priya Menon",
        description: "Placeholder project"
    }
];


/* =========================================================
   GET ALL PROJECTS
   ========================================================= */

function getAllProjects() {
    return PROJECTS;
}


/* =========================================================
   EXPORT / GLOBAL ACCESS
   ========================================================= */

/*
   These are exposed globally because faculty-dashboard.js
   currently uses these functions directly.
*/

window.deriveFacultyProfile = deriveFacultyProfile;
window.getAllProjects = getAllProjects;
