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
    };
  },
  methods: {
    onFileChange(event) {
      this.selectedFiles = Array.from(event.target.files || []);
      if (this.selectedFiles.length) {
        this.uploadStatus = `${this.selectedFiles.length} file(s) selected.`;
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

        this.updateDocStatus(file.name, "uploading");
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

      this.chatStatus = "Thinking...";
      this.messages.push({
        id: `user-${this.messageCounter++}`,
        role: "user",
        text: trimmed,
      });

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
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

        const data = await res.json();
        this.messages.push({
          id: `assistant-${this.messageCounter++}`,
          role: "assistant",
          text: data.answer || "No response",
        });
        this.chatStatus = "";
        this.query = "";
      } catch (error) {
        this.chatStatus = error.message;
      }
    },
    updateDocStatus(name, status) {
      const doc = this.documents.find((item) => item.name === name);
      if (doc) {
        doc.status = status;
      }
    },
  },
}).mount("#app");
