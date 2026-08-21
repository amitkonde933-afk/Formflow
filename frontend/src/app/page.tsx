"use client";

import React, { useState, useEffect, useRef } from "react";
import { Profile, FormField, SavedDocument } from "../types";
import { apiService } from "../services/api";

type Tab = "dashboard" | "profile" | "upload" | "help";
type WizardStep = "NONE" | "analyzing" | "review" | "validation" | "complete";

export default function Home() {
  // Main view state
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [wizardStep, setWizardStep] = useState<WizardStep>("NONE");
  
  // Profile state
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    college: "",
    course: "",
    roll_number: "",
    semester: "",
    cgpa: "",
    address: "",
    parent_name: "",
    parent_occupation: ""
  });
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  
  // Documents history
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  
  // Upload and preview states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  
  // Form values being edited in review/validation
  const [wizardFields, setWizardFields] = useState<FormField[]>([]);
  
  // Local validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    loadProfile();
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const saved = localStorage.getItem("formflow_documents");
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading doc history", err);
      }
    }
  };

  const saveDocuments = (docs: SavedDocument[]) => {
    setDocuments(docs);
    localStorage.setItem("formflow_documents", JSON.stringify(docs));
  };

  const loadProfile = async () => {
    try {
      const data = await apiService.getProfile();
      if (data && data.full_name) {
        setProfile(data as Profile);
        setIsProfileSaved(true);
      } else {
        setIsProfileSaved(false);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      setIsProfileSaved(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.saveProfile(profile);
      setIsProfileSaved(true);
      alert("Profile saved and encrypted successfully!");
      setActiveTab("dashboard");
    } catch (err) {
      alert("Error saving profile. Check if backend server is running.");
    }
  };

  const handleWipeProfile = async () => {
    if (!confirm("Are you sure you want to permanently delete your profile? This will clear all data from the database.")) return;
    try {
      await apiService.deleteProfile();
      setProfile({
        full_name: "",
        dob: "",
        gender: "",
        email: "",
        phone: "",
        college: "",
        course: "",
        roll_number: "",
        semester: "",
        cgpa: "",
        address: "",
        parent_name: "",
        parent_occupation: ""
      });
      setIsProfileSaved(false);
      alert("Profile permanently deleted.");
    } catch (err) {
      alert("Error deleting profile.");
    }
  };

  const populateDemoProfile = () => {
    setProfile({
      full_name: "Amit Konde",
      dob: "12/08/2004",
      gender: "Male",
      email: "amit.konde@example.com",
      phone: "9876543210",
      college: "State Technical University",
      course: "Computer Engineering",
      roll_number: "CS-2022-045",
      semester: "5th Semester",
      cgpa: "9.12",
      address: "402 Royal Residency, Park Street, Pune",
      parent_name: "Satish Konde",
      parent_occupation: "Software Architect"
    });
  };

  // Drag-and-drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid PDF form.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;

    setWizardStep("analyzing");
    setAnalysisLogs([]);

    const steps = [
      "Uploading PDF...",
      "Extracting document information...",
      "Detecting form fields...",
      "Matching fields with your profile...",
      "Preparing review..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisLogs(prev => [...prev, steps[i]]);
    }

    try {
      const result = await apiService.uploadPDF(selectedFile);
      
      const parsedFields = result.fields.map(f => ({
        ...f,
        confirmed: !f.review_required // pre-confirm if review not needed
      }));

      const newDoc: SavedDocument = {
        id: result.file_name,
        originalName: selectedFile.name,
        fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toLocaleString(),
        status: "In Progress",
        fields: parsedFields,
        currentStep: "review"
      };

      saveDocuments([newDoc, ...documents]);
      setActiveDocId(newDoc.id);
      setWizardFields(parsedFields);
      setWizardStep("review");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process form. Make sure the backend is active.");
      setWizardStep("NONE");
    }
  };

  const selectDocument = (doc: SavedDocument) => {
    setActiveDocId(doc.id);
    setWizardFields(doc.fields);
    setWizardStep(doc.currentStep);
    setActiveTab("upload"); // switch view to uploader/wizard
    setFileUrl(null); // Previous file uploads don't persist Blob URL across reloads
  };

  const deleteDocument = (id: string) => {
    if (!confirm("Delete this document from history?")) return;
    const filtered = documents.filter(d => d.id !== id);
    saveDocuments(filtered);
    if (activeDocId === id) {
      setActiveDocId(null);
      setWizardStep("NONE");
    }
  };

  const handleFieldChange = (idx: number, value: string) => {
    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, suggested_value: value } : f));
  };

  const handleToggleConfirm = (idx: number) => {
    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, confirmed: !f.confirmed } : f));
  };

  const handleExplain = async (idx: number) => {
    const field = wizardFields[idx];
    if (field.explanation) return;

    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation: "Retrieving explanation from LLM..." } : f));
    try {
      const explanation = await apiService.explainField(field.label);
      setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation } : f));
    } catch (err) {
      setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation: "Failed to load explanation." } : f));
    }
  };

  const updateDocState = (id: string, stepName: SavedDocument["currentStep"], currentFields: FormField[]) => {
    const updated = documents.map(d => {
      if (d.id === id) {
        return { ...d, currentStep: stepName, fields: currentFields };
      }
      return d;
    });
    saveDocuments(updated);
  };

  const handleReviewSubmit = () => {
    updateDocState(activeDocId!, "validation", wizardFields);
    runValidation(wizardFields);
  };

  const runValidation = (currentFields: FormField[]) => {
    setWizardStep("validation");

    const errors: string[] = [];
    const warnings: string[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    currentFields.forEach(f => {
      const val = f.suggested_value?.trim();

      // Required check
      if (f.required && !val) {
        errors.push(`Field "${f.label}" is required and cannot be empty.`);
      }

      if (val) {
        // Format check
        if (f.type === "email" || f.label.toLowerCase().includes("email")) {
          if (!emailRegex.test(val)) {
            errors.push(`"${f.label}" must contain a valid email format.`);
          }
        }
        if (f.label.toLowerCase().includes("phone") || f.label.toLowerCase().includes("mobile")) {
          const clean = val.replace(/[\s-()]/g, "");
          if (!phoneRegex.test(clean)) {
            errors.push(`"${f.label}" must be a 10-digit number.`);
          }
        }
        if (f.type === "number" || f.label.toLowerCase().includes("income") || f.label.toLowerCase().includes("gpa") || f.label.toLowerCase().includes("cgpa")) {
          // Check if number contains digit characters
          const cleanNum = val.replace(/[^0-9.]/g, "");
          if (!cleanNum) {
            errors.push(`"${f.label}" must be a valid numeric value.`);
          }
        }
      }

      // Review required warning
      if (f.review_required && !f.confirmed && val) {
        warnings.push(`"${f.label}" requires review and has not been confirmed.`);
      }
    });

    const passed = errors.length === 0;
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    setValidationPassed(passed);
  };

  const handleGeneratePDF = async () => {
    if (!activeDocId) return;

    setIsCompiling(true);

    const valuesMap: Record<string, string> = {};
    wizardFields.forEach(f => {
      valuesMap[f.label] = f.suggested_value || "";
    });

    try {
      const blob = await apiService.fillPDF(activeDocId, valuesMap);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `filled_${documents.find(d => d.id === activeDocId)?.originalName || "formflow_completed.pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const updated = documents.map(d => {
        if (d.id === activeDocId) {
          return { ...d, status: "Completed" as const, currentStep: "complete" as const };
        }
        return d;
      });
      saveDocuments(updated);
      setWizardStep("complete");
      setIsCompiling(false);
    } catch (err) {
      alert("Failed to compile PDF form. The session may have expired.");
      setIsCompiling(false);
    }
  };

  const handleExitWizard = () => {
    setWizardStep("NONE");
    setActiveDocId(null);
    setSelectedFile(null);
    setFileUrl(null);
    setWizardFields([]);
    setActiveTab("dashboard");
    loadDocuments();
  };

  // Helper to determine HTML input type
  const getInputType = (type: string, label: string) => {
    const lbl = label.toLowerCase();
    if (type === "email" || lbl.includes("email")) return "email";
    if (type === "date" || lbl.includes("dob") || lbl.includes("date")) return "date";
    if (lbl.includes("phone") || lbl.includes("mobile")) return "tel";
    if (type === "number") return "number";
    return "text";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background-hex)" }}>
      
      {/* SIDEBAR */}
      <aside style={{
        width: "250px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10, 8, 18, 0.5)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.5rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
            <span style={{
              fontSize: "1.6rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>FormFlow</span>
            <span style={{
              fontSize: "0.7rem",
              padding: "0.1rem 0.4rem",
              borderRadius: "4px",
              background: "rgba(139, 92, 246, 0.2)",
              color: "#c084fc",
              border: "1px solid rgba(139,92,246,0.3)"
            }}>SECURE</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button 
              onClick={() => { setActiveTab("dashboard"); setWizardStep("NONE"); }}
              className={activeTab === "dashboard" && wizardStep === "NONE" ? "glow-button" : "glow-button-secondary"}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textAlign: "left",
                fontSize: "0.95rem"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>
              Dashboard
            </button>

            <button 
              onClick={() => { setActiveTab("profile"); setWizardStep("NONE"); }}
              className={activeTab === "profile" && wizardStep === "NONE" ? "glow-button" : "glow-button-secondary"}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textAlign: "left",
                fontSize: "0.95rem"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Profile
            </button>

            <button 
              onClick={() => { setActiveTab("upload"); setWizardStep("NONE"); setSelectedFile(null); setFileUrl(null); }}
              className={activeTab === "upload" && wizardStep === "NONE" ? "glow-button" : "glow-button-secondary"}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textAlign: "left",
                fontSize: "0.95rem"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Upload Form
            </button>

            <button 
              onClick={() => { setActiveTab("help"); setWizardStep("NONE"); }}
              className={activeTab === "help" && wizardStep === "NONE" ? "glow-button" : "glow-button-secondary"}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textAlign: "left",
                fontSize: "0.95rem"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              Help & Privacy
            </button>
          </nav>
        </div>

        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isProfileSaved ? "var(--success)" : "var(--danger)"
            }}></span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {isProfileSaved ? "Profile Configured" : "No Saved Profile"}
            </span>
          </div>
        </div>
      </aside>

      {/* DYNAMIC WORKSPACE CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        
        {/* Header bar */}
        <header style={{
          padding: "1.25rem 2.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(8, 7, 13, 0.4)",
          backdropFilter: "blur(8px)"
        }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
              {wizardStep !== "NONE" ? `Active Form: ${documents.find(d => d.id === activeDocId)?.originalName}` : "FormFlow Dashboard"}
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {wizardStep !== "NONE" ? `Guided filling workflow step: ${wizardStep}` : "Fill Once. Use Everywhere."}
            </p>
          </div>
          
          {wizardStep !== "NONE" && (
            <button 
              onClick={handleExitWizard}
              className="glow-button-secondary"
              style={{ padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.85rem" }}
            >
              Exit to Dashboard
            </button>
          )}
        </header>

        {/* Dynamic Panels */}
        <div style={{ flex: 1, padding: "2.5rem", display: "flex", justifyContent: "center" }}>
          
          {wizardStep === "NONE" ? (
            <>
              {/* TAB 1: DASHBOARD VIEW */}
              {activeTab === "dashboard" && (
                <div style={{ width: "100%", maxWidth: "1000px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Total Forms Processed</div>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--secondary)" }}>
                        {documents.length} File(s)
                      </div>
                    </div>
                    
                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Forms Completed</div>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--success)" }}>
                        {documents.filter(d => d.status === "Completed").length} Done
                      </div>
                    </div>

                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Encrypted Profile Database</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "semibold", color: isProfileSaved ? "var(--success)" : "var(--warning)", marginTop: "0.5rem" }}>
                        {isProfileSaved ? "🔒 Encrypted Storage" : "⚠️ Profile Empty"}
                      </div>
                    </div>
                  </div>

                  <div className="glow-card" style={{ padding: "2.5rem", marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Welcome to FormFlow</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem", maxWidth: "600px" }}>
                      FormFlow reads and understands unfamiliar PDF forms, matching fields to your secure profile. Upload a PDF form to automatically fill the values.
                    </p>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button 
                        onClick={() => setActiveTab("upload")}
                        className="glow-button"
                        style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "semibold" }}
                      >
                        Upload New Form
                      </button>
                      <a 
                        href={apiService.getDemoPdfUrl()}
                        className="glow-button-secondary"
                        style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "semibold", textDecoration: "none" }}
                      >
                        Try Demo Form
                      </a>
                    </div>
                  </div>

                  {/* My Forms table */}
                  <div className="glow-card" style={{ padding: "2rem" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>My Forms</h3>
                    {documents.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        No history logs. Previously uploaded files will appear here.
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                            <th style={{ padding: "0.75rem 1rem" }}>Filename</th>
                            <th style={{ padding: "0.75rem 1rem" }}>Processed On</th>
                            <th style={{ padding: "0.75rem 1rem" }}>Size</th>
                            <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                            <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map(doc => (
                            <tr key={doc.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "0.75rem 1rem", fontWeight: "medium" }}>{doc.originalName}</td>
                              <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{doc.uploadedAt}</td>
                              <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{doc.fileSize}</td>
                              <td style={{ padding: "0.75rem 1rem" }}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "0.15rem 0.4rem",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                  background: doc.status === "Completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                                  color: doc.status === "Completed" ? "#34d399" : "#fbbf24"
                                }}>
                                  {doc.status}
                                </span>
                              </td>
                              <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                                  <button 
                                    onClick={() => selectDocument(doc)}
                                    className="glow-button-secondary"
                                    style={{ padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem" }}
                                  >
                                    {doc.status === "Completed" ? "View Details" : "Resume"}
                                  </button>
                                  <button 
                                    onClick={() => deleteDocument(doc.id)}
                                    className="glow-button-danger"
                                    style={{ padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PROFILE PAGE VIEW */}
              {activeTab === "profile" && (
                <div className="glow-card" style={{ width: "100%", maxWidth: "780px", padding: "2.5rem" }}>
                  <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                      Profile Information
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      Configure standard student details. Database values are encrypted at rest.
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
                      
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Full Legal Name</label>
                        <input type="text" name="full_name" value={profile.full_name} onChange={handleProfileChange} className="form-input" required placeholder="John Doe" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Date of Birth (DD/MM/YYYY) 🔒</label>
                        <input type="text" name="dob" value={profile.dob} onChange={handleProfileChange} className="form-input" required placeholder="12/08/2004" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Gender</label>
                        <select name="gender" value={profile.gender} onChange={handleProfileChange} className="form-input" required>
                          <option value="" disabled>Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Email Address</label>
                        <input type="email" name="email" value={profile.email} onChange={handleProfileChange} className="form-input" required placeholder="john.doe@example.com" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Mobile Number 🔒</label>
                        <input type="text" name="phone" value={profile.phone} onChange={handleProfileChange} className="form-input" required placeholder="9876543210" />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>College / Institution Name</label>
                        <input type="text" name="college" value={profile.college} onChange={handleProfileChange} className="form-input" required placeholder="State Technical University" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Course / Department</label>
                        <input type="text" name="course" value={profile.course} onChange={handleProfileChange} className="form-input" required placeholder="Computer Engineering" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Roll Number / Register ID</label>
                        <input type="text" name="roll_number" value={profile.roll_number} onChange={handleProfileChange} className="form-input" required placeholder="CS-2022-045" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Current Semester</label>
                        <input type="text" name="semester" value={profile.semester} onChange={handleProfileChange} className="form-input" required placeholder="5th Semester" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>CGPA / GPA</label>
                        <input type="text" name="cgpa" value={profile.cgpa} onChange={handleProfileChange} className="form-input" required placeholder="9.12" />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Permanent Residential Address 🔒</label>
                        <input type="text" name="address" value={profile.address} onChange={handleProfileChange} className="form-input" required placeholder="402 Royal Residency, Park Street, Pune" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Parent/Guardian Name 🔒</label>
                        <input type="text" name="parent_name" value={profile.parent_name} onChange={handleProfileChange} className="form-input" required placeholder="Satish Doe" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Parent Occupation 🔒</label>
                        <input type="text" name="parent_occupation" value={profile.parent_occupation} onChange={handleProfileChange} className="form-input" required placeholder="Business" />
                      </div>

                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
                      <button 
                        type="button" 
                        onClick={populateDemoProfile} 
                        className="glow-button-secondary"
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Populate Demo Data
                      </button>
                      <button 
                        type="submit" 
                        className="glow-button"
                        style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Save Profile
                      </button>
                      {isProfileSaved && (
                        <button 
                          type="button"
                          onClick={handleWipeProfile}
                          className="glow-button-danger"
                          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Delete Profile
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: UPLOAD SCREEN VIEW */}
              {activeTab === "upload" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "600px" }}>
                  {!isProfileSaved && (
                    <div style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      color: "#fbbf24",
                      fontSize: "0.85rem"
                    }}>
                      ⚠️ <strong>Note:</strong> No profile was found saved in SQLite. Autofill will map to blank fields, but you can manually correct them on the next step.
                    </div>
                  )}

                  {!selectedFile ? (
                    <div className="glow-card" style={{ padding: "3rem", textAlign: "center" }}>
                      <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                        Upload your PDF form
                      </h2>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
                        Only PDF documents are supported for layout analysis.
                      </p>

                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="pulse-upload"
                        style={{
                          border: `2px dashed ${dragActive ? "var(--secondary)" : "var(--card-border)"}`,
                          borderRadius: "16px",
                          padding: "4.5rem 2rem",
                          background: "rgba(124, 58, 237, 0.02)",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          marginBottom: "2rem"
                        }}
                      >
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept=".pdf" 
                          onChange={handleFileSelect} 
                          style={{ display: "none" }} 
                        />
                        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📄</div>
                        <p style={{ fontSize: "1.1rem", fontWeight: "semibold", marginBottom: "0.3rem" }}>
                          Drag & drop your PDF here
                        </p>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          or click to browse files
                        </p>
                      </div>

                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                          Download our pre-structured scholarship template to run the test:
                        </p>
                        <a 
                          href={apiService.getDemoPdfUrl()}
                          className="glow-button-secondary"
                          style={{
                            display: "inline-block",
                            padding: "0.5rem 1.2rem",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                            fontWeight: "semibold"
                          }}
                        >
                          Try Demo Form
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="glow-card" style={{ padding: "2.5rem", textAlign: "center" }}>
                      <div style={{ fontSize: "4.5rem", marginBottom: "1rem" }}>📄</div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.2rem" }}>
                        {selectedFile.name}
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>

                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button 
                          onClick={() => { setSelectedFile(null); setFileUrl(null); }} 
                          className="glow-button-secondary"
                          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Remove
                        </button>
                        <button 
                          onClick={runAnalysis} 
                          className="glow-button"
                          style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Analyze Form
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HELP & SECURITY STATEMENT */}
              {activeTab === "help" && (
                <div className="glow-card" style={{ width: "100%", maxWidth: "700px", padding: "2.5rem" }}>
                  <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1.2rem" }}>
                    Security & Information
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", lineHeight: "1.6", fontSize: "0.95rem" }}>
                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        Application-Layer Cryptography
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        FormFlow uses encrypted local storage. Profile columns carrying private details (such as dates of birth, parents' profiles, residential addresses, and phone contacts) are symmetrically encrypted before being written to SQLite using AES-256 (Fernet) keys.
                      </p>
                    </section>
                    
                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        Stateless File Processing
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        Uploaded templates are cached in server storage solely during the OCR layout structure parsing and LLM mapping phase. PDF files are permanently scrubbed from backend disks as soon as a compiled file download is requested.
                      </p>
                    </section>

                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        You Control Your Data
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        Your details are owned by you, not product logs. You can review, update, or permanently delete the encrypted database record at any time using the "Delete Profile" action on the Profile page.
                      </p>
                    </section>
                  </div>
                </div>
              )}
            </>
          ) : (
            
            /* WIZARD STEP PANEL (TWO-COLUMN INTERFACE FOR REVIEW & VALIDATION) */
            <div style={{
              display: "grid",
              gridTemplateColumns: fileUrl ? "1.1fr 1fr" : "1fr",
              gap: "2rem",
              width: "100%",
              maxWidth: fileUrl ? "1300px" : "800px",
              height: "calc(100vh - 165px)"
            }}>
              
              {/* LEFT VIEW COLUMN: PDF PREVIEW IFRAME */}
              {fileUrl && (
                <div className="glow-card" style={{ padding: "0.5rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  <div style={{
                    padding: "0.4rem 0.8rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem",
                    color: "var(--secondary)"
                  }}>
                    <span>📄 Document Preview</span>
                  </div>
                  <iframe 
                    src={`${fileUrl}#toolbar=0`} 
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px",
                      background: "white"
                    }}
                  />
                </div>
              )}

              {/* RIGHT VIEW COLUMN: ACTIVE WIZARD ACTIONS */}
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                
                {/* WIZARD STEP: REVIEW FIELDS */}
                {wizardStep === "review" && (
                  <div className="glow-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h2 style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Review Detected Fields</h2>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Check identified values. Fields with low confidence or sensitive data require confirmation.
                      </p>
                    </div>

                    {/* Scrollable list */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", paddingRight: "0.5rem", marginBottom: "1.5rem" }}>
                      {wizardFields.map((field, idx) => {
                        const val = field.suggested_value?.trim();
                        const showRequiredWarning = field.required && !val;
                        const showSensitiveWarning = field.is_sensitive;
                        const isHigh = field.confidence >= 0.85;
                        const isMed = field.confidence >= 0.60 && field.confidence < 0.85;

                        return (
                          <div 
                            key={idx} 
                            style={{
                              border: `1px solid ${showRequiredWarning ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.05)"}`,
                              borderRadius: "10px",
                              padding: "1.1rem",
                              background: showRequiredWarning ? "rgba(239, 68, 68, 0.02)" : "rgba(255, 255, 255, 0.01)"
                            }}
                          >
                            {/* Heading row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontWeight: "semibold", fontSize: "0.9rem", color: showRequiredWarning ? "#f87171" : "white" }}>
                                  {field.label}
                                </span>
                                {field.required && (
                                  <span style={{ color: "var(--danger)", fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "3px", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    Required
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                {/* Review required banner */}
                                {field.review_required && (
                                  <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                                    Review required
                                  </span>
                                )}

                                {/* Confidence score badge */}
                                {field.confidence > 0 ? (
                                  <span style={{
                                    fontSize: "0.65rem",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "3px",
                                    fontWeight: "bold",
                                    background: isHigh ? "rgba(16,185,129,0.12)" : isMed ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                                    color: isHigh ? "#34d399" : isMed ? "#fbbf24" : "#f87171",
                                    border: `1px solid ${isHigh ? "rgba(16,185,129,0.2)" : isMed ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`
                                  }}>
                                    {isHigh ? "High confidence" : isMed ? "Review recommended" : "Needs review"} ({Math.round(field.confidence * 100)}%)
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                                    No Match
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Warnings */}
                            {showRequiredWarning && (
                              <p style={{ fontSize: "0.8rem", color: "#f87171", marginBottom: "0.5rem" }}>
                                ⚠ Information required — This field is required before your form can be completed.
                              </p>
                            )}

                            {showSensitiveWarning && (
                              <p style={{ fontSize: "0.8rem", color: "#a78bfa", marginBottom: "0.5rem" }}>
                                🛡️ Sensitive field — Review carefully before continuing.
                              </p>
                            )}

                            {/* Explanation popover text */}
                            {field.explanation ? (
                              <div style={{ fontSize: "0.8rem", color: "var(--secondary)", background: "rgba(6,182,212,0.04)", padding: "0.4rem 0.6rem", borderRadius: "4px", marginBottom: "0.5rem" }}>
                                💡 {field.explanation}
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleExplain(idx)}
                                style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0, marginBottom: "0.5rem" }}
                              >
                                Explain
                              </button>
                            )}

                            {/* Edit field row */}
                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                              <input 
                                type={getInputType(field.type, field.label)}
                                value={field.suggested_value || ""} 
                                onChange={(e) => handleFieldChange(idx, e.target.value)}
                                className="form-input"
                                placeholder={field.required ? "Enter required value" : "Optional"}
                                style={{ flex: 1, padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                              />

                              {/* Manual Confirmation Checkbox */}
                              {field.review_required && (
                                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", cursor: "pointer", color: field.confirmed ? "var(--success)" : "var(--warning)", userSelect: "none" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!field.confirmed} 
                                    onChange={() => handleToggleConfirm(idx)}
                                    style={{ width: "15px", height: "15px", accentColor: "var(--success)" }}
                                  />
                                  Reviewed
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      onClick={handleReviewSubmit}
                      className="glow-button"
                      style={{ padding: "0.8rem", borderRadius: "8px", fontWeight: "bold", width: "100%" }}
                    >
                      Confirm & Continue
                    </button>
                  </div>
                )}

                {/* WIZARD STEP: VALIDATION SUMMARY */}
                {wizardStep === "validation" && (
                  <div className="glow-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                        {validationPassed ? "✓" : "⚠"}
                      </div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                        {validationPassed ? "Form Ready" : "Attention Required"}
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {validationPassed ? "Format checks passed. Review details before compiling." : "Verify red warnings before filling PDF."}
                      </p>
                    </div>

                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Completed</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--secondary)" }}>
                          {wizardFields.filter(f => f.suggested_value).length} / {wizardFields.length}
                        </div>
                      </div>
                      
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Required Filled</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--success)" }}>
                          {wizardFields.filter(f => f.required && f.suggested_value).length} / {wizardFields.filter(f => f.required).length}
                        </div>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Reviewed</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fbbf24" }}>
                          {wizardFields.filter(f => f.review_required && f.confirmed).length} / {wizardFields.filter(f => f.review_required).length}
                        </div>
                      </div>
                    </div>

                    {/* Validation Warnings/Errors List */}
                    {(validationErrors.length > 0 || validationWarnings.length > 0) && (
                      <div style={{ background: "rgba(239, 68, 68, 0.02)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem", maxHeight: "150px", overflowY: "auto" }}>
                        <p style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#f87171", marginBottom: "0.4rem" }}>
                          ⚠ {validationErrors.length + validationWarnings.length} item(s) need attention:
                        </p>
                        {validationErrors.map((err, i) => (
                          <div key={i} style={{ fontSize: "0.75rem", color: "#f87171", marginBottom: "0.2rem" }}>• {err}</div>
                        ))}
                        {validationWarnings.map((warn, i) => (
                          <div key={i} style={{ fontSize: "0.75rem", color: "#fbbf24", marginBottom: "0.2rem" }}>• {warn}</div>
                        ))}
                      </div>
                    )}

                    {/* Table field summary */}
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      background: "rgba(0, 0, 0, 0.15)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "1.5rem"
                    }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.6rem", color: "var(--text-muted)" }}>Form Summary Table</div>
                      <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                            <th style={{ padding: "0.4rem" }}>Field</th>
                            <th style={{ padding: "0.4rem" }}>Value</th>
                            <th style={{ padding: "0.4rem", textAlign: "center" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wizardFields.map((f, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "0.4rem", color: f.required && !f.suggested_value ? "#f87171" : "white" }}>{f.label}</td>
                              <td style={{ padding: "0.4rem", color: "var(--text-muted)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {f.suggested_value || <span style={{ fontStyle: "italic", color: "#ef4444" }}>empty</span>}
                              </td>
                              <td style={{ padding: "0.4rem", textAlign: "center" }}>
                                {f.required && !f.suggested_value ? "❌" : f.review_required && !f.confirmed ? "⚠" : "✓"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Navigation actions */}
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button 
                        onClick={() => setWizardStep("review")}
                        className="glow-button-secondary"
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Back to Review
                      </button>
                      <button 
                        onClick={handleGeneratePDF}
                        disabled={isCompiling || !validationPassed}
                        className="glow-button"
                        style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold", opacity: validationPassed ? 1 : 0.6 }}
                      >
                        {isCompiling ? "Generating PDF..." : "Generate Completed PDF"}
                      </button>
                    </div>
                  </div>
                )}

                {/* WIZARD STEP: DOWNLOAD COMPLETED PDF */}
                {wizardStep === "complete" && (
                  <div className="glow-card" style={{ padding: "3rem", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "5rem", marginBottom: "1.5rem" }}>🎉</div>
                    <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                      Your form is ready!
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
                      Your completed form is ready. The file has been successfully generated and compiled using backend coordinate mapping templates.
                    </p>

                    <div style={{
                      background: "rgba(16, 185, 129, 0.04)",
                      border: "1px solid rgba(16, 185, 129, 0.15)",
                      borderRadius: "8px",
                      padding: "1rem",
                      fontSize: "0.8rem",
                      color: "#34d399",
                      textAlign: "left",
                      marginBottom: "2rem"
                    }}>
                      🔒 <strong>Retention statement:</strong> The temporary file has been completely deleted from the server. Your data is private.
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button 
                        onClick={handleExitWizard}
                        className="glow-button"
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        ← Back to My Forms
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Analyzing screen overlay */}
      {wizardStep === "analyzing" && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(8,7,13,0.92)",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div className="glow-card" style={{ width: "90%", maxWidth: "500px", padding: "3rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div className="laser"></div>
            <div style={{ position: "relative", zIndex: 10 }}>
              <div style={{ fontSize: "4.5rem", marginBottom: "1.5rem", animation: "pulse 2s infinite" }}>🔍</div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                Analyzing your form...
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
                FormFlow is reading digital layout elements.
              </p>

              <div style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "8px",
                padding: "1.25rem",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono), monospace",
                color: "#10b981",
                textAlign: "left",
                minHeight: "150px"
              }}>
                {analysisLogs.map((log, i) => (
                  <div key={i} style={{ marginBottom: "0.4rem" }}>
                    {log.startsWith("✓") || log.startsWith("⟳") ? log : `✓ ${log}`}
                  </div>
                ))}
                {analysisLogs.length < 5 && (
                  <div style={{ animation: "pulse 1s infinite", color: "var(--secondary)" }}>⟳ Processing...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
