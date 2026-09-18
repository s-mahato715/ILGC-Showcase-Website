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

function loginUser(event) {
    event.preventDefault();

    const userId = document.getElementById("userId").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    if (!userId || !password) {
        errorMessage.textContent = "Please enter your User ID and Password.";
        return;
    }

    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userId", userId);

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