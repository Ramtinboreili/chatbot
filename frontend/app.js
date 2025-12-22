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
        this.uploadStatus = `${this.selectedFiles.length} فایل انتخاب شد.`;
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
        this.uploadStatus = "حداقل یک فایل انتخاب کنید.";
        return;
      }

      this.uploadStatus = "در حال بارگذاری...";
      this.selectedFiles.forEach((file) => {
        if (!this.documents.find((doc) => doc.name === file.name)) {
          this.documents.push({ name: file.name, status: "در صف" });
        }
      });

      for (const file of this.selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        this.updateDocStatus(file.name, "در حال پردازش");
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
          this.updateDocStatus(file.name, `انجام شد (${data.chunks})`);
        } catch (error) {
          this.updateDocStatus(file.name, "ناموفق");
          this.uploadStatus = error.message;
          return;
        }
      }

      this.uploadStatus = `${this.selectedFiles.length} فایل بارگذاری شد.`;
      this.clearFiles();
    },
    async handleChat() {
      const trimmed = this.query.trim();
      if (!trimmed) {
        this.chatStatus = "ابتدا یک سوال وارد کنید.";
        return;
      }

      this.chatStatus = "در حال پاسخ...";
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
          text: data.answer || "پاسخی دریافت نشد.",
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
