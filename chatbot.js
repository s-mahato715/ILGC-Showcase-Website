/* ======================================================
   ILGC CHAT ASSISTANT (frontend)

   Add to student-dashboard.html, faculty-dashboard.html and
   ilgc-dashboard.html, AFTER supabase-client.js:

     <link rel="stylesheet" href="chatbot.css">   (in <head>)
     <script src="chatbot.js"></script>           (after supabase-client.js)

   The widget never holds an LLM key. It sends the signed-in
   user's Supabase session token to the `ilgc-chat` Edge Function,
   which holds the Groq key and reads Supabase as that user.
====================================================== */

(function () {
    "use strict";

    // Fallback only; the real URL is read from the Supabase client below.
    var FALLBACK_SUPABASE_URL = "https://dkfbnxosrbwrfncoeqek.supabase.co";
    var FUNCTION_NAME = "ilgc-chat";
    var MAX_CHARS = 500;

    if (!window.supabaseClient) {
        console.warn("Chat assistant: Supabase client not found, widget not started.");
        return;
    }

    var supabaseUrl = window.supabaseClient.supabaseUrl || FALLBACK_SUPABASE_URL;
    var endpoint = supabaseUrl + "/functions/v1/" + FUNCTION_NAME;

    // Which dashboard are we on? Only used to pick starter questions and
    // tone. Permissions are enforced by Supabase, never by this value.
    var storedRole = localStorage.getItem("selectedRole");
    var portal = storedRole === "ilgc" ? "mentor" : (storedRole === "faculty" ? "faculty" : "student");

    var STARTERS = {
        student: [
            "Which projects are in healthcare?",
            "How do I express interest in a project?",
            "What happens after I float an idea?"
        ],
        faculty: [
            "How many projects are ongoing?",
            "How do project tags work?",
            "Where do student ideas show up?"
        ],
        mentor: [
            "What projects are in AI?",
            "How do I accept or reject a student?",
            "Where do I see student interest?"
        ]
    };

    var history = [];   // [{role: "user"|"assistant", content: "..."}]
    var busy = false;

    /* ---------- Build the UI ---------- */

    var launcher = el("button", {
        className: "ilgc-chat-launcher",
        type: "button",
        "aria-label": "Open ILGC assistant",
        "aria-expanded": "false"
    });
    launcher.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12z"/></svg>' +
        "<span>Ask ILGC</span>";

    var panel = el("section", {
        className: "ilgc-chat-panel",
        role: "dialog",
        "aria-label": "ILGC assistant"
    });
    panel.hidden = true;

    var header = el("div", { className: "ilgc-chat-header" });
    var title = el("div", { className: "ilgc-chat-title" });
    title.innerHTML = "<strong>ILGC Assistant</strong><span>Ask about projects and how the portal works</span>";
    var closeBtn = el("button", {
        className: "ilgc-chat-close",
        type: "button",
        "aria-label": "Close assistant"
    });
    closeBtn.innerHTML =
        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    header.appendChild(title);
    header.appendChild(closeBtn);

    var log = el("div", {
        className: "ilgc-chat-log",
        role: "log",
        "aria-live": "polite"
    });

    var form = el("form", { className: "ilgc-chat-form" });
    var input = el("textarea", {
        className: "ilgc-chat-input",
        rows: "1",
        maxLength: String(MAX_CHARS),
        placeholder: "Type your question",
        "aria-label": "Your question"
    });
    var sendBtn = el("button", {
        className: "ilgc-chat-send",
        type: "submit",
        "aria-label": "Send message"
    });
    sendBtn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    form.appendChild(input);
    form.appendChild(sendBtn);

    var note = el("div", { className: "ilgc-chat-note" });
    note.textContent = "AI assistant. Answers can be wrong, so check details with ILGC faculty.";

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(form);
    panel.appendChild(note);

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    /* ---------- Open / close ---------- */

    function openPanel() {
        panel.hidden = false;
        panel.classList.add("ilgc-chat-open");
        launcher.hidden = true;
        launcher.setAttribute("aria-expanded", "true");
        if (log.children.length === 0) {
            addBot("Hi! I can look up ILGC projects and explain how the portal works. What would you like to know?");
            addStarters();
        }
        input.focus();
    }

    function closePanel() {
        panel.hidden = true;
        panel.classList.remove("ilgc-chat-open");
        launcher.hidden = false;
        launcher.setAttribute("aria-expanded", "false");
        launcher.focus();
    }

    launcher.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !panel.hidden) closePanel();
    });

    /* ---------- Sending ---------- */

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        send(input.value);
    });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input.value);
        }
    });

    input.addEventListener("input", function () {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });

    async function send(raw) {
        var text = (raw || "").trim().slice(0, MAX_CHARS);
        if (!text || busy) return;

        removeStarters();
        addUser(text);
        history.push({ role: "user", content: text });
        input.value = "";
        input.style.height = "auto";
        setBusy(true);
        var typing = addTyping();

        try {
            var sessionResult = await window.supabaseClient.auth.getSession();
            var session = sessionResult && sessionResult.data && sessionResult.data.session;
            if (!session) {
                throw new UserFacingError("Your session has expired. Please log out and log in again.");
            }

            var res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + session.access_token
                },
                body: JSON.stringify({ messages: history, portal: portal })
            });

            var data = null;
            try { data = await res.json(); } catch (_) { /* non-JSON error body */ }

            if (res.status === 429) {
                throw new UserFacingError((data && data.error) || "Lots of people are asking right now. Please try again in a minute.");
            }
            if (res.status === 401) {
                throw new UserFacingError("Your session has expired. Please log out and log in again.");
            }
            if (!res.ok || !data || typeof data.reply !== "string") {
                throw new UserFacingError((data && data.error) || "Something went wrong on our side. Please try again.");
            }

            typing.remove();
            history.push({ role: "assistant", content: data.reply });
            addBot(data.reply);
        } catch (err) {
            typing.remove();
            // The question that failed should not stay in the history.
            history.pop();
            if (err instanceof UserFacingError) {
                addError(err.message);
            } else {
                console.error("Chat assistant error:", err);
                addError("Could not reach the assistant. Check your connection and try again.");
            }
        } finally {
            setBusy(false);
            input.focus();
        }
    }

    function setBusy(state) {
        busy = state;
        sendBtn.disabled = state;
    }

    /* ---------- Message rendering ---------- */

    function addUser(text) {
        var node = el("div", { className: "ilgc-chat-msg ilgc-chat-user" });
        node.textContent = text;
        log.appendChild(node);
        scrollDown();
    }

    function addBot(text) {
        var node = el("div", { className: "ilgc-chat-msg ilgc-chat-bot" });
        node.innerHTML = formatReply(text);
        log.appendChild(node);
        scrollDown();
    }

    function addError(text) {
        var node = el("div", { className: "ilgc-chat-msg ilgc-chat-error", role: "alert" });
        node.textContent = text;
        log.appendChild(node);
        scrollDown();
    }

    function addTyping() {
        var node = el("div", { className: "ilgc-chat-msg ilgc-chat-bot", "aria-label": "Assistant is typing" });
        node.innerHTML = '<span class="ilgc-chat-typing"><i></i><i></i><i></i></span>';
        log.appendChild(node);
        scrollDown();
        return node;
    }

    var startersNode = null;

    function addStarters() {
        startersNode = el("div", { className: "ilgc-chat-chips" });
        (STARTERS[portal] || STARTERS.student).forEach(function (q) {
            var chip = el("button", { className: "ilgc-chat-chip", type: "button" });
            chip.textContent = q;
            chip.addEventListener("click", function () { send(q); });
            startersNode.appendChild(chip);
        });
        log.appendChild(startersNode);
    }

    function removeStarters() {
        if (startersNode) {
            startersNode.remove();
            startersNode = null;
        }
    }

    function scrollDown() {
        log.scrollTop = log.scrollHeight;
    }

    // Safe formatting: escape everything first, then allow only **bold**,
    // "- " bullet lists and paragraph breaks.
    function formatReply(text) {
        var lines = String(text).split(/\r?\n/);
        var html = "";
        var inList = false;

        lines.forEach(function (line) {
            var bullet = line.match(/^\s*[-*•]\s+(.*)$/);
            if (bullet) {
                if (!inList) { html += "<ul>"; inList = true; }
                html += "<li>" + inline(bullet[1]) + "</li>";
            } else {
                if (inList) { html += "</ul>"; inList = false; }
                if (line.trim()) html += "<p>" + inline(line) + "</p>";
            }
        });
        if (inList) html += "</ul>";
        return html;
    }

    function inline(s) {
        return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    function escapeHtml(s) {
        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /* ---------- Helpers ---------- */

    function el(tag, props) {
        var node = document.createElement(tag);
        Object.keys(props || {}).forEach(function (key) {
            if (key === "className") node.className = props[key];
            else node.setAttribute(key, props[key]);
        });
        return node;
    }

    function UserFacingError(message) {
        this.message = message;
    }
    UserFacingError.prototype = Object.create(Error.prototype);
})();
