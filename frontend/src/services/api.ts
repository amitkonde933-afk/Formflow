import { Profile, FormField } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiService = {
  getApiBaseUrl(): string {
    return API_BASE;
  },

  async getProfile(): Promise<Partial<Profile>> {
    const res = await fetch(`${API_BASE}/api/profile`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async saveProfile(profile: Profile): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to save profile");
    return res.json();
  },

  async deleteProfile(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete profile");
    return res.json();
  },

  async uploadPDF(file: File): Promise<{ file_name: string; fields: FormField[] }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Unknown upload error" }));
      throw new Error(errData.detail || "Failed to process PDF upload");
    }
    return res.json();
  },

  async explainField(label: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error("Failed to get field explanation");
    const data = await res.json();
    return data.explanation;
  },

  async fillPDF(fileName: string, fieldValues: Record<string, string>): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/fill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_name: fileName,
        field_values: fieldValues,
      }),
    });
    if (!res.ok) throw new Error("Failed to compile and fill PDF form");
    return res.blob();
  },

  getDemoPdfUrl(): string {
    return `${API_BASE}/api/demo-pdf`;
  }
};
