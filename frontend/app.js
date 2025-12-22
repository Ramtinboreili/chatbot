const API_BASE = window.API_BASE || "http://localhost:8000";

const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatStatus = document.getElementById("chat-status");
const responseDiv = document.getElementById("response");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Choose a file first.";
    return;
  }

  uploadStatus.textContent = "Uploading...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/api/ingest`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Upload failed");
    }

    const data = await res.json();
    uploadStatus.textContent = `Ingested ${data.filename} with ${data.chunks} chunks.`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = chatInput.value.trim();
  if (!query) {
    chatStatus.textContent = "Type a question first.";
    return;
  }

  chatStatus.textContent = "Thinking...";
  responseDiv.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Chat failed");
    }

    const data = await res.json();
    responseDiv.textContent = data.answer || "No response";
    chatStatus.textContent = "";
  } catch (error) {
    chatStatus.textContent = error.message;
  }
});
