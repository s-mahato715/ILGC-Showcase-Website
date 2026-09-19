const role = localStorage.getItem("selectedRole");

const roleTitle = document.getElementById("roleTitle");
const roleDescription = document.getElementById("roleDescription");

if (role === "faculty") {
    roleTitle.textContent = "ILGC Faculty Login";
    roleDescription.textContent = "Login to access your ILGC faculty dashboard";
}
else if (role === "ilgc") {
    roleTitle.textContent = "Mentor Login";
    roleDescription.textContent = "Login to access the Mentor management portal";
}
else if (role === "student") {
    roleTitle.textContent = "Student Login";
    roleDescription.textContent = "Login to access your student dashboard";
}
else {
    window.location.href = "login.html";
}

function togglePassword() {
    const password = document.getElementById("password");
    const button = document.querySelector(".show-password");

    if (password.type === "password") {
        password.type = "text";
        button.textContent = "Hide";
    } else {
        password.type = "password";
        button.textContent = "Show";
    }
}

async function loginUser(event) {
    event.preventDefault();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = "";

    if (!userId || !password) {
        errorMessage.textContent = "Please enter your User ID and Password.";
        return;
    }

    // Log in through Supabase Authentication
    const { data: authData, error: authError } =
        await window.supabaseClient.auth.signInWithPassword({
            email: userId,
            password: password
        });

    if (authError) {
        console.error("Supabase login error:", authError);
        errorMessage.textContent = "Invalid email or password.";
        return;
    }

    // Check that this email exists in the mentor profile table
    if (role === "ilgc") {
        const { data: mentor, error: mentorError } =
            await window.supabaseClient
                .from("mentor_profiles")
                .select("email")
                .eq("email", userId)
                .maybeSingle();

        if (mentorError) {
            console.error("Mentor lookup error:", mentorError);
            errorMessage.textContent = "Could not verify mentor profile.";
            await window.supabaseClient.auth.signOut();
            return;
        }

        if (!mentor) {
            errorMessage.textContent = "This email is not registered as an ILGC mentor.";
            await window.supabaseClient.auth.signOut();
            return;
        }
    }

    // Save login state for the existing dashboard code
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userId", userId);

    // Go to the appropriate dashboard
    if (role === "faculty") {
        window.location.href = "faculty-dashboard.html";
    }
    else if (role === "ilgc") {
        window.location.href = "ilgc-dashboard.html";
    }
    else if (role === "student") {
        window.location.href = "student-dashboard.html";
    }
}
