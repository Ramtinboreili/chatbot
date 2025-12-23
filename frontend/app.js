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
    };
  },
  mounted() {
    this.loadConfig();
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

      html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
      });
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
      html = html.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
      html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
      html = html.replace(/\n{2,}/g, "</p><p>");
      html = `<p>${html}</p>`;
      html = html.replace(/<p>\s*<\/p>/g, "");
      return html;
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
    async handleUpload() {
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

      this.chatStatus = "";
      this.messages.push({
        id: `user-${this.messageCounter++}`,
        role: "user",
        text: trimmed,
      });
      this.query = "";
      this.scrollToBottom();

      try {
        const assistantMessage = {
          id: `assistant-${this.messageCounter++}`,
          role: "assistant",
          text: "Thinking...",
        };
        this.messages.push(assistantMessage);
        this.scrollToBottom();

        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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

        if (!res.body) {
          const data = await res.json();
          assistantMessage.text = data.answer || "No response.";
          this.scrollToBottom();
          return;
        }

        assistantMessage.text = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventType = "message";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.replace("event:", "").trim();
              }
              if (line.startsWith("data:")) {
                const chunk = line.slice(5);
                data += chunk.startsWith(" ") ? chunk.slice(1) : chunk;
              }
            }
            if (!data) {
              continue;
            }
            if (eventType === "error") {
              assistantMessage.text = `Error: ${data}`;
              this.scrollToBottom();
              return;
            }
            assistantMessage.text += data;
            this.scrollToBottom();
          }
        }
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
