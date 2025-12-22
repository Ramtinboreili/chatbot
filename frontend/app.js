const API_BASE = window.API_BASE || "";

const { createApp } = Vue;

createApp({
  data() {
    return {
      selectedFile: null,
      uploadStatus: "",
      query: "",
      chatStatus: "",
      responseText: "",
    };
  },
  methods: {
    onFileChange(event) {
      this.selectedFile = event.target.files[0] || null;
    },
    async handleUpload() {
      if (!this.selectedFile) {
        this.uploadStatus = "Choose a file first.";
        return;
      }

      this.uploadStatus = "Uploading...";

      const formData = new FormData();
      formData.append("file", this.selectedFile);

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
        this.uploadStatus = `Ingested ${data.filename} with ${data.chunks} chunks.`;
      } catch (error) {
        this.uploadStatus = error.message;
      }
    },
    async handleChat() {
      const trimmed = this.query.trim();
      if (!trimmed) {
        this.chatStatus = "Type a question first.";
        return;
      }

      this.chatStatus = "Thinking...";
      this.responseText = "";

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
        this.responseText = data.answer || "No response";
        this.chatStatus = "";
      } catch (error) {
        this.chatStatus = error.message;
      }
    },
  },
}).mount("#app");
