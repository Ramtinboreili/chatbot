const API_BASE = window.API_BASE || "";

const { createApp } = Vue;

createApp({
  data() {
    return {
      selectedFiles: [],
      uploadStatus: "",
      query: "",
      chatStatus: "",
      messages: [],
      documents: [],
      messageCounter: 0,
      uploadsCollapsed: false,
      modelName: "",
      drawerOpen: false,
      authEmail: "",
      authPassword: "",
      authStatus: "",
      authToken: "",
      currentUser: null,
    };
  },
  mounted() {
    this.loadConfig();
    this.restoreSession();
  },
  methods: {
    getTextDirection(text) {
      return /[\u0600-\u06FF]/.test(text || "") ? "rtl" : "ltr";
    },
    renderMarkdown(text) {
      if (!text) {
        return "";
      }
      const escapeHtml = (value) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      let html = escapeHtml(text);

      const codeBlocks = [];
      html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
        codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
        return token;
      });

      html = this.convertTables(html);
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
      html = html.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
      html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
      html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (match, index) => {
        return codeBlocks[Number(index)] || "";
      });

      const blocks = html
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);
      html = blocks
        .map((block) => {
          if (/^<(h1|h2|h3|ul|pre|table)/.test(block)) {
            return block;
          }
          return `<p>${block}</p>`;
        })
        .join("");

      return html;
    },
    convertTables(text) {
      const lines = text.split(/\r?\n/);
      const output = [];
      const isSeparator = (line) =>
        /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line);
      const parseRow = (line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const next = lines[i + 1];
        const isHeader = line && line.includes("|") && next && isSeparator(next);
        if (!isHeader) {
          output.push(line);
          continue;
        }

        const headers = parseRow(line);
        const rows = [];
        i += 1;

        for (let j = i + 1; j < lines.length; j += 1) {
          const rowLine = lines[j];
          if (!rowLine || !rowLine.includes("|")) {
            i = j - 1;
            break;
          }
          rows.push(parseRow(rowLine));
          i = j;
        }

        const headHtml = `<thead><tr>${headers
          .map((cell) => `<th>${cell}</th>`)
          .join("")}</tr></thead>`;
        const bodyHtml = `<tbody>${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
          )
          .join("")}</tbody>`;
        output.push(`<table>${headHtml}${bodyHtml}</table>`);
      }

      return output.join("\n");
    },
    onFileChange(event) {
      this.selectedFiles = Array.from(event.target.files || []);
      if (this.selectedFiles.length) {
        this.uploadStatus = `${this.selectedFiles.length} file(s) selected.`;
      }
    },
    async loadConfig() {
      try {
        const res = await fetch(`${API_BASE}/api/config`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        this.modelName = data.llm_model || "";
      } catch {
        this.modelName = "";
      }
    },
    async restoreSession() {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        return;
      }
      this.authToken = token;
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: this.authHeaders(),
        });
        if (!res.ok) {
          this.clearSession();
          return;
        }
        const data = await res.json();
        this.currentUser = data.user || null;
      } catch {
        this.clearSession();
      }
    },
    authHeaders() {
      return this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
    },
    saveSession(token, user) {
      this.authToken = token;
      this.currentUser = user;
      localStorage.setItem("auth_token", token);
      this.authStatus = "";
      this.authPassword = "";
    },
    clearSession() {
      this.authToken = "";
      this.currentUser = null;
      localStorage.removeItem("auth_token");
    },
    async signIn() {
      if (!this.authEmail || !this.authPassword) {
        this.authStatus = "Enter email and password.";
        return;
      }
      this.authStatus = "Signing in...";
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: this.authEmail,
            password: this.authPassword,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          this.authStatus = data.detail || "Sign in failed.";
          return;
        }
        const data = await res.json();
        this.saveSession(data.token, data.user);
      } catch (error) {
        this.authStatus = error.message;
      }
    },
    async signUp() {
      if (!this.authEmail || !this.authPassword) {
        this.authStatus = "Enter email and password.";
        return;
      }
      this.authStatus = "Creating account...";
      try {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: this.authEmail,
            password: this.authPassword,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          this.authStatus = data.detail || "Sign up failed.";
          return;
        }
        const data = await res.json();
        this.saveSession(data.token, data.user);
      } catch (error) {
        this.authStatus = error.message;
      }
    },
    async signOut() {
      if (!this.authToken) {
        return;
      }
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: this.authHeaders(),
        });
      } catch {
        // Ignore logout errors.
      }
      this.clearSession();
    },
    clearFiles() {
      this.selectedFiles = [];
      const input = document.getElementById("file-input");
      if (input) {
        input.value = "";
      }
      this.uploadStatus = "";
    },
    toggleUploads() {
      this.uploadsCollapsed = !this.uploadsCollapsed;
    },
    toggleDrawer() {
      this.drawerOpen = !this.drawerOpen;
    },
    async handleUpload() {
      if (!this.authToken) {
        this.uploadStatus = "Sign in to upload files.";
        return;
      }
      if (!this.selectedFiles.length) {
        this.uploadStatus = "Choose at least one file.";
        return;
      }

      this.uploadStatus = "Uploading...";
      this.selectedFiles.forEach((file) => {
        if (!this.documents.find((doc) => doc.name === file.name)) {
          this.documents.push({ name: file.name, status: "queued" });
        }
      });

      for (const file of this.selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        this.updateDocStatus(file.name, "processing");
        try {
          const res = await fetch(`${API_BASE}/api/ingest`, {
            method: "POST",
            body: formData,
            headers: this.authHeaders(),
          });

          if (!res.ok) {
            const errorText = await res.text();
            let message = "Upload failed";
            try {
              const errorJson = JSON.parse(errorText);
              message = errorJson.detail || message;
            } catch {
              if (errorText) {
                message = errorText;
              }
            }
            throw new Error(message);
          }

          const data = await res.json();
          this.updateDocStatus(file.name, `done (${data.chunks})`);
        } catch (error) {
          this.updateDocStatus(file.name, "failed");
          this.uploadStatus = error.message;
          return;
        }
      }

      this.uploadStatus = `Uploaded ${this.selectedFiles.length} document(s).`;
      this.clearFiles();
    },
    async handleChat() {
      const trimmed = this.query.trim();
      if (!trimmed) {
        this.chatStatus = "Type a question first.";
        return;
      }
      if (!this.authToken) {
        this.chatStatus = "Sign in to chat.";
        return;
      }

      this.chatStatus = "Thinking...";
      this.messages.push({
        id: `user-${this.messageCounter++}`,
        role: "user",
        text: trimmed,
      });
      this.query = "";
      this.scrollToBottom();

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.authHeaders(),
          },
          body: JSON.stringify({ query: trimmed }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          let message = "Chat failed";
          try {
            const errorJson = JSON.parse(errorText);
            message = errorJson.detail || message;
          } catch {
            if (errorText) {
              message = errorText;
            }
          }
          throw new Error(message);
        }

        const data = await res.json();
        this.messages.push({
          id: `assistant-${this.messageCounter++}`,
          role: "assistant",
          text: data.answer || "No response.",
        });
        this.chatStatus = "";
        this.scrollToBottom();
      } catch (error) {
        this.chatStatus = error.message;
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const history = this.$refs.chatHistory;
        if (history) {
          history.scrollTop = history.scrollHeight;
        }
      });
    },
    updateDocStatus(name, status) {
      const doc = this.documents.find((item) => item.name === name);
      if (doc) {
        doc.status = status;
      }
    },
  },
}).mount("#app");
