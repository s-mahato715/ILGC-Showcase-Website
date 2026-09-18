function selectRole(role) {
    localStorage.setItem("selectedRole", role);
    window.location.href = "credentials.html";
}