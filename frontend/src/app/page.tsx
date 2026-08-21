"use client";

import React, { useState, useEffect, useRef } from "react";
import { Profile, FormField, SavedDocument } from "../types";
import { apiService } from "../services/api";

type ActiveTab = "dashboard" | "profile" | "upload" | "help";

export default function Home() {
  // Navigation & Active View Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [wizardStep, setWizardStep] = useState<SavedDocument["currentStep"] | "NONE">("NONE");
  
  // App-wide state
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
  
  // Documents history state
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  
  // PDF Upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  
  // Form values currently being edited in wizard
  const [wizardFields, setWizardFields] = useState<FormField[]>([]);
  
  // Conversational Chat state
  const [chatMessages, setChatMessages] = useState<{ sender: "bot" | "user"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMissingFields, setChatMissingFields] = useState<FormField[]>([]);
  const [chatIndex, setChatIndex] = useState(0);
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  // Validation checks
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load profile & documents history on start
  useEffect(() => {
    loadProfileData();
    loadDocumentsHistory();
  }, []);

  // Sync documents list back to localStorage
  const saveDocumentsToStorage = (docs: SavedDocument[]) => {
    setDocuments(docs);
    localStorage.setItem("formflow_documents", JSON.stringify(docs));
  };

  const loadDocumentsHistory = () => {
    const saved = localStorage.getItem("formflow_documents");
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading doc history", err);
      }
    }
  };

  const loadProfileData = async () => {
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

  // Populate Demo Data
  const populateDemoProfile = () => {
    const demo = {
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
    };
    setProfile(demo);
  };

  // Submit Profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.saveProfile(profile);
      setIsProfileSaved(true);
      alert("Profile successfully saved and encrypted in database!");
      setActiveTab("dashboard");
    } catch (err) {
      alert("Error saving profile. Make sure the FastAPI backend is running.");
    }
  };

  // Wipe Profile permanent deletion
  const handleWipeProfile = async () => {
    if (!confirm("Are you sure you want to permanently delete your profile? This deletes the SQLite database row and voids encryption keys.")) return;
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
      alert("Profile wiped successfully.");
    } catch (err) {
      alert("Error wiping profile.");
    }
  };

  // Drag and drop upload handlers
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
      setupFileForAnalysis(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupFileForAnalysis(e.target.files[0]);
    }
  };

  const setupFileForAnalysis = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF documents are supported.");
      return;
    }
    setSelectedFile(file);
    // Create browser URL object for local PDF previewing
    const url = URL.createObjectURL(file);
    setFileUrl(url);
  };

  // PDF Text analysis call
  const runFileAnalysis = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setAnalysisLogs([]);
    
    // Simulate log steps
    const mockLogs = [
      "Uploading PDF to secure parsing engine...",
      "Extracting digital layout fonts...",
      "Sending text contents to LLM extractor...",
      "Identifying form fields, types, and flags...",
      "Deciphering semantic mapping with profile variables..."
    ];

    for (let i = 0; i < mockLogs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setAnalysisLogs(prev => [...prev, mockLogs[i]]);
    }

    try {
      const result = await apiService.uploadPDF(selectedFile);
      
      const enrichedFields = result.fields.map(f => ({
        ...f,
        confirmed: !f.review_required // auto-confirmed if review not required
      }));

      const newDoc: SavedDocument = {
        id: result.file_name,
        originalName: selectedFile.name,
        fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toLocaleString(),
        status: "In Progress",
        fields: enrichedFields,
        currentStep: "REVIEW"
      };

      // Save document to history
      saveDocumentsToStorage([newDoc, ...documents]);
      setActiveDocId(newDoc.id);
      setWizardFields(enrichedFields);
      setWizardStep("REVIEW");
      setIsAnalyzing(false);
    } catch (err) {
      console.error(err);
      alert("Form analysis failed. Ensure the server is online and API keys are set.");
      setIsAnalyzing(false);
    }
  };

  // Sidebar actions
  const selectDocument = (doc: SavedDocument) => {
    setActiveDocId(doc.id);
    setWizardFields(doc.fields);
    setWizardStep(doc.currentStep);
    setActiveTab("upload"); // switch context to wizard view
    
    // Note: since it's a previously uploaded file, we don't have the local Blob File object.
    // However, for the live demo, users can download the generated form directly from the backend later.
    // If it's a demo scholarship template, we can fetch it or just display an informational note
    setFileUrl(null); 
  };

  const deleteDocument = (id: string) => {
    if (!confirm("Remove this form from history?")) return;
    const filtered = documents.filter(d => d.id !== id);
    saveDocumentsToStorage(filtered);
    if (activeDocId === id) {
      setActiveDocId(null);
      setWizardStep("NONE");
    }
  };

  // Field Review actions
  const handleFieldChange = (idx: number, value: string) => {
    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, suggested_value: value } : f));
  };

  const toggleConfirmField = (idx: number) => {
    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, confirmed: !f.confirmed } : f));
  };

  const handleExplainField = async (idx: number) => {
    const field = wizardFields[idx];
    if (field.explanation) return;
    
    setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation: "Analyzing field requirements..." } : f));
    
    try {
      const explanation = await apiService.explainField(field.label);
      setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation } : f));
    } catch (err) {
      setWizardFields(prev => prev.map((f, i) => i === idx ? { ...f, explanation: "Explanation unavailable." } : f));
    }
  };

  const handleReviewSubmit = () => {
    // Determine which fields have absolutely NO value
    const missing = wizardFields.filter(f => !f.suggested_value);
    
    // Update local storage document status state
    updateDocStep(activeDocId!, "CHAT", wizardFields);

    if (missing.length > 0) {
      setChatMissingFields(missing);
      setChatIndex(0);
      setChatMessages([
        { sender: "bot", text: `Hello! I've automatically mapped out most of the fields. However, I need details for ${missing.length} missing field(s) to finalize the document.` },
        { sender: "bot", text: `Let's start with this one: What should we fill for "${missing[0].label}"?` }
      ]);
      setWizardStep("CHAT");
    } else {
      runValidationStep(wizardFields);
    }
  };

  // Sync state helper
  const updateDocStep = (id: string, stepName: SavedDocument["currentStep"], currentFields: FormField[]) => {
    const updated = documents.map(d => {
      if (d.id === id) {
        return { ...d, currentStep: stepName, fields: currentFields };
      }
      return d;
    });
    saveDocumentsToStorage(updated);
  };

  // Conversational Chat messaging submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const value = chatInput.trim();
    const targetField = chatMissingFields[chatIndex];

    // User message bubble
    setChatMessages(prev => [...prev, { sender: "user", text: value }]);
    setChatInput("");
    setIsChatTyping(true);

    // Save field value
    const updatedFields = wizardFields.map(f => 
      f.label === targetField.label ? { ...f, suggested_value: value, confirmed: true } : f
    );
    setWizardFields(updatedFields);

    const nextIndex = chatIndex + 1;
    setTimeout(() => {
      setIsChatTyping(false);
      if (nextIndex < chatMissingFields.length) {
        setChatIndex(nextIndex);
        setChatMessages(prev => [
          ...prev,
          { sender: "bot", text: `Recorded: "${value}" for ${targetField.label}.` },
          { sender: "bot", text: `Next question: What value should we input for "${chatMissingFields[nextIndex].label}"?` }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { sender: "bot", text: "Excellent! All missing fields have been answered. Progressing to the validation checklist..." }
        ]);
        setTimeout(() => {
          runValidationStep(updatedFields);
        }, 1200);
      }
    }, 800);
  };

  // Validation rules check
  const runValidationStep = (currentFields: FormField[]) => {
    setWizardStep("VALIDATE");
    updateDocStep(activeDocId!, "VALIDATE", currentFields);
    
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    currentFields.forEach(f => {
      const val = f.suggested_value?.trim();
      
      // Empty required check
      if (f.required && !val) {
        errors.push(`"${f.label}" is marked required but is empty.`);
      }

      if (val) {
        // Format check
        if (f.type === "email" || f.label.toLowerCase().includes("email")) {
          if (!emailRegex.test(val)) {
            errors.push(`"${f.label}" must be a valid email. Currently: "${val}"`);
          }
        }
        if (f.label.toLowerCase().includes("phone") || f.label.toLowerCase().includes("mobile")) {
          const digits = val.replace(/[\s-()]/g, "");
          if (!phoneRegex.test(digits)) {
            errors.push(`"${f.label}" must be a 10-digit number. Currently: "${val}"`);
          }
        }
        if (f.label.toLowerCase().includes("date of birth") || f.label.toLowerCase().includes("dob")) {
          if (!val.includes("/") && !val.includes("-")) {
            errors.push(`"${f.label}" should represent a date (e.g. 12/08/2004). Currently: "${val}"`);
          }
        }
      }
    });

    setValidationErrors(errors);
    setValidationPassed(errors.length === 0);
  };

  // Call fill compiler PDF backend service
  const handleCompilePDF = async () => {
    if (!activeDocId) return;
    
    setIsCompiling(true);
    
    const valuesMap: Record<string, string> = {};
    wizardFields.forEach(f => {
      valuesMap[f.label] = f.suggested_value || "";
    });

    try {
      const blob = await apiService.fillPDF(activeDocId, valuesMap);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `filled_${documents.find(d => d.id === activeDocId)?.originalName || "formflow_form.pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Update local storage history status to Completed
      const updatedDocs = documents.map(d => {
        if (d.id === activeDocId) {
          return { ...d, status: "Completed" as const, currentStep: "DOWNLOAD" as const };
        }
        return d;
      });
      saveDocumentsToStorage(updatedDocs);
      setWizardStep("DOWNLOAD");
      setIsCompiling(false);
    } catch (err) {
      alert("Failed to fill and compile PDF form. Backend file might have expired.");
      setIsCompiling(false);
    }
  };

  // Reset helper
  const handleExitWizard = () => {
    setWizardStep("NONE");
    setActiveDocId(null);
    setSelectedFile(null);
    setFileUrl(null);
    setWizardFields([]);
    setActiveTab("dashboard");
    loadDocumentsHistory();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background-hex)" }}>
      
      {/* LEFT SIDEBAR NAVIGATION */}
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
          {/* Logo Brand */}
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

          {/* Nav List Links */}
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
              My Profile
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
              Privacy & Info
            </button>
          </nav>
        </div>

        {/* User profile state pill */}
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
              {isProfileSaved ? "Profile Encrypted" : "Profile Unconfigured"}
            </span>
          </div>
          {isProfileSaved && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              ID: 001_LOCAL_USER
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN VIEW CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        
        {/* Header toolbar */}
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
              {wizardStep !== "NONE" ? `Filling: ${documents.find(d => d.id === activeDocId)?.originalName}` : "Student Portal Dashboard"}
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {wizardStep !== "NONE" ? `FormFlow Guided Wizard Step: ${wizardStep}` : "Reimagine the Routine hackathon entry"}
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
              {/* VIEW TAB 1: DASHBOARD */}
              {activeTab === "dashboard" && (
                <div style={{ width: "100%", maxWidth: "1000px" }}>
                  
                  {/* Dashboard stats boxes */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Total Uploads</div>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--secondary)" }}>
                        {documents.length} File(s)
                      </div>
                    </div>
                    
                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Completed Forms</div>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--success)" }}>
                        {documents.filter(d => d.status === "Completed").length} Done
                      </div>
                    </div>

                    <div className="glow-card" style={{ padding: "1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Local Profile Security</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "semibold", color: isProfileSaved ? "var(--success)" : "var(--warning)", marginTop: "0.5rem" }}>
                        {isProfileSaved ? "🔒 AES Encrypted SQLite" : "⚠️ Needs Setup"}
                      </div>
                    </div>
                  </div>

                  {/* Saved Documents table panel */}
                  <div className="glow-card" style={{ padding: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <div>
                        <h2 style={{ fontSize: "1.3rem", fontWeight: "bold" }}>My Active Forms</h2>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Continue filling or download completed templates.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("upload")} 
                        className="glow-button"
                        style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "semibold" }}
                      >
                        + Upload New Form
                      </button>
                    </div>

                    {documents.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
                        <p style={{ fontSize: "1.1rem", fontWeight: "semibold", marginBottom: "0.5rem", color: "white" }}>No Forms Uploaded Yet</p>
                        <p style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>Upload a digital PDF application to test semantic auto-filling.</p>
                        <button 
                          onClick={() => setActiveTab("upload")}
                          className="glow-button-secondary"
                          style={{ padding: "0.5rem 1.2rem", borderRadius: "8px", fontSize: "0.85rem" }}
                        >
                          Scanned PDF Template Uploader
                        </button>
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                              <th style={{ padding: "0.75rem 1rem" }}>Form Filename</th>
                              <th style={{ padding: "0.75rem 1rem" }}>Uploaded On</th>
                              <th style={{ padding: "0.75rem 1rem" }}>Size</th>
                              <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map(doc => (
                              <tr key={doc.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "1rem", fontWeight: "medium" }}>{doc.originalName}</td>
                                <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{doc.uploadedAt}</td>
                                <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{doc.fileSize || "N/A"}</td>
                                <td style={{ padding: "1rem" }}>
                                  <span style={{
                                    fontSize: "0.75rem",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "4px",
                                    fontWeight: "bold",
                                    background: doc.status === "Completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                                    color: doc.status === "Completed" ? "#34d399" : "#fbbf24",
                                    border: doc.status === "Completed" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)"
                                  }}>
                                    {doc.status}
                                  </span>
                                </td>
                                <td style={{ padding: "1rem", textAlign: "right" }}>
                                  <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                                    <button 
                                      onClick={() => selectDocument(doc)}
                                      className="glow-button-secondary"
                                      style={{ padding: "0.3rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem" }}
                                    >
                                      {doc.status === "Completed" ? "Download Again" : "Continue"}
                                    </button>
                                    <button 
                                      onClick={() => deleteDocument(doc.id)}
                                      className="glow-button-danger"
                                      style={{ padding: "0.3rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem" }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW TAB 2: PROFILE EDITOR */}
              {activeTab === "profile" && (
                <div className="glow-card" style={{ width: "100%", maxWidth: "780px", padding: "2.5rem" }}>
                  <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                      My Student Profile
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      Details below represent your encrypted reusable identity. Placed into the database with AES Fernet keys.
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
                      
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Full Legal Name</label>
                        <input type="text" name="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="form-input" required placeholder="John Doe" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Date of Birth (DD/MM/YYYY) 🔒</label>
                        <input type="text" name="dob" value={profile.dob} onChange={(e) => setProfile({ ...profile, dob: e.target.value })} className="form-input" required placeholder="12/08/2004" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Gender</label>
                        <select name="gender" value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="form-input" required>
                          <option value="" disabled>Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Email Address</label>
                        <input type="email" name="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="form-input" required placeholder="john.doe@example.com" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Mobile Number 🔒</label>
                        <input type="text" name="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="form-input" required placeholder="9876543210" />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>College / Institution</label>
                        <input type="text" name="college" value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} className="form-input" required placeholder="State Technical University" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Course / Department</label>
                        <input type="text" name="course" value={profile.course} onChange={(e) => setProfile({ ...profile, course: e.target.value })} className="form-input" required placeholder="Computer Engineering" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Roll Number / Registration</label>
                        <input type="text" name="roll_number" value={profile.roll_number} onChange={(e) => setProfile({ ...profile, roll_number: e.target.value })} className="form-input" required placeholder="CS-2022-045" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Current Semester</label>
                        <input type="text" name="semester" value={profile.semester} onChange={(e) => setProfile({ ...profile, semester: e.target.value })} className="form-input" required placeholder="5th Semester" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Current CGPA / GPA</label>
                        <input type="text" name="cgpa" value={profile.cgpa} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} className="form-input" required placeholder="9.12" />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Permanent Residential Address 🔒</label>
                        <input type="text" name="address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="form-input" required placeholder="402 Royal Residency, Park Street, Pune" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Parent Name 🔒</label>
                        <input type="text" name="parent_name" value={profile.parent_name} onChange={(e) => setProfile({ ...profile, parent_name: e.target.value })} className="form-input" required placeholder="Satish Doe" />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Parent Occupation 🔒</label>
                        <input type="text" name="parent_occupation" value={profile.parent_occupation} onChange={(e) => setProfile({ ...profile, parent_occupation: e.target.value })} className="form-input" required placeholder="Business" />
                      </div>

                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                      <button 
                        type="button" 
                        onClick={populateDemoProfile} 
                        className="glow-button-secondary"
                        style={{ flex: 1, padding: "0.8rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        ⚡ Populate Demo Data
                      </button>
                      <button 
                        type="submit" 
                        className="glow-button"
                        style={{ flex: 2, padding: "0.8rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Save Profile Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* VIEW TAB 3: UPLOAD NEW FORM */}
              {activeTab === "upload" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "600px" }}>
                  {!isProfileSaved && (
                    <div style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      color: "#fbbf24",
                      fontSize: "0.85rem"
                    }}>
                      ⚠️ <strong>Warning:</strong> You must configure a profile first. Unmatched inputs can be entered manually, but profiles automate the autofill mechanism.
                    </div>
                  )}

                  {!selectedFile ? (
                    <div className="glow-card" style={{ padding: "3rem", textAlign: "center" }}>
                      <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                        Upload Scholarship or College PDF
                      </h2>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
                        Select or drag your file. FormFlow extracts fields and matches them to your profile automatically.
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
                          padding: "4rem 2rem",
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
                          Drag & drop form PDF here
                        </p>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          or click to browse local files
                        </p>
                      </div>

                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                          Use our test PDF form template to run the complete demo:
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
                          📥 Download Demo Scholarship PDF Template
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="glow-card" style={{ padding: "2.5rem", textAlign: "center" }}>
                      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📄</div>
                      <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "0.2rem" }}>
                        {selectedFile.name}
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
                        Size: {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>

                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button 
                          onClick={() => setSelectedFile(null)} 
                          className="glow-button-secondary"
                          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={runFileAnalysis} 
                          className="glow-button"
                          style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Analyze Form →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW TAB 4: HELP & PRIVACY */}
              {activeTab === "help" && (
                <div className="glow-card" style={{ width: "100%", maxWidth: "700px", padding: "2.5rem" }}>
                  <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
                    Security, Privacy, and How it Works
                  </h2>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", lineHeight: "1.6", fontSize: "0.95rem" }}>
                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        1. Local Encrypted Storage
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        Your details are stored locally on your machine in an SQLite database. High-risk columns (phone number, date of birth, address, family occupation) are encrypted at the application-layer using a 256-bit symmetric AES Fernet key before writing.
                      </p>
                    </section>

                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        2. Temporary Data Retention
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        Uploaded PDF documents are treated as processing cache. The backend saves files temporarily during layout analysis and completely purges them from the filesystem once overlay generation is complete.
                      </p>
                    </section>

                    <section>
                      <h3 style={{ fontWeight: "bold", color: "var(--secondary)", marginBottom: "0.4rem" }}>
                        3. Semantic Autofill, not Key matching
                      </h3>
                      <p style={{ color: "var(--text-muted)" }}>
                        Traditional browser autofill requires matching explicit input tags. FormFlow uses a semantic LLM mapper to map disparate fields (such as "Permanent Residential Address", "Location", and "Correspondence Address") to your single profile record automatically.
                      </p>
                    </section>

                    <div style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      paddingTop: "1.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Have you saved private details already?</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Wiping database removes all entries and cached keys.</div>
                      </div>
                      <button 
                        onClick={handleWipeProfile} 
                        disabled={!isProfileSaved}
                        className="glow-button-danger"
                        style={{ padding: "0.5rem 1.2rem", borderRadius: "8px", fontSize: "0.85rem" }}
                      >
                        Wipe Database Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            
            /* ACTIVE FORM FILLING WIZARD WRAPPER (TWO-COLUMN INTERFACE) */
            <div style={{
              display: "grid",
              gridTemplateColumns: fileUrl ? "1.2fr 1fr" : "1fr",
              gap: "2rem",
              width: "100%",
              maxWidth: fileUrl ? "1300px" : "800px",
              height: "calc(100vh - 160px)"
            }}>
              
              {/* LEFT COLUMN: PDF NATIVE IFRAME PREVIEW */}
              {fileUrl && (
                <div className="glow-card" style={{ padding: "0.5rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  <div style={{
                    padding: "0.5rem 1rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem"
                  }}>
                    <span style={{ fontWeight: "medium", color: "var(--secondary)" }}>📄 Document Preview</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Native Browser PDF Frame</span>
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

              {/* RIGHT COLUMN: WIZARD STEP PANELS */}
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                
                {/* WIZARD STEP 1: REVIEW & CONFIRM FIELDS */}
                {wizardStep === "REVIEW" && (
                  <div className="glow-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h2 style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Review Autofilled Values</h2>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Confirm matches. Low-confidence (under 85%) or 🛡️ sensitive fields require approval.
                      </p>
                    </div>

                    {/* Scrollable list */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.5rem", marginBottom: "1.5rem" }}>
                      {wizardFields.map((field, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "10px",
                            padding: "1rem",
                            background: "rgba(255, 255, 255, 0.01)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: "semibold", fontSize: "0.9rem" }}>{field.label}</span>
                              {field.required && <span style={{ color: "var(--danger)", fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "3px", border: "1px solid rgba(239,68,68,0.2)" }}>Required</span>}
                              {field.is_sensitive && <span style={{ color: "#a78bfa", fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "3px", border: "1px solid rgba(167,139,250,0.2)" }}>🛡️ Encrypted</span>}
                            </div>
                            
                            <div>
                              {field.confidence > 0 ? (
                                <span style={{
                                  fontSize: "0.7rem",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                  background: field.confidence >= 0.85 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                                  color: field.confidence >= 0.85 ? "#34d399" : "#fbbf24",
                                  border: field.confidence >= 0.85 ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(245,158,11,0.15)"
                                }}>
                                  {Math.round(field.confidence * 100)}% Match
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                                  No Match
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Cached explanation tooltip */}
                          {field.explanation ? (
                            <div style={{ fontSize: "0.8rem", color: "var(--secondary)", background: "rgba(6,182,212,0.04)", padding: "0.4rem 0.6rem", borderRadius: "4px", marginBottom: "0.5rem" }}>
                              💡 {field.explanation}
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => handleExplainField(idx)}
                              style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0, marginBottom: "0.5rem" }}
                            >
                              🔎 Explain this field
                            </button>
                          )}

                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <input 
                              type="text" 
                              value={field.suggested_value || ""} 
                              onChange={(e) => handleFieldChange(idx, e.target.value)}
                              placeholder={field.suggested_value ? "" : "Empty field (Chat flow will ask)"}
                              className="form-input"
                              style={{ flex: 1, padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                            />
                            
                            {field.suggested_value && field.review_required && (
                              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", cursor: "pointer", color: field.confirmed ? "var(--success)" : "var(--warning)" }}>
                                <input 
                                  type="checkbox" 
                                  checked={!!field.confirmed} 
                                  onChange={() => toggleConfirmField(idx)}
                                  style={{ width: "15px", height: "15px", accentColor: "var(--success)" }}
                                />
                                Approve
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleReviewSubmit}
                      className="glow-button"
                      style={{ padding: "0.8rem", borderRadius: "8px", fontWeight: "bold", width: "100%" }}
                    >
                      Confirm Fields & Next
                    </button>
                  </div>
                )}

                {/* WIZARD STEP 2: CONVERSATIONAL CHAT */}
                {wizardStep === "CHAT" && (
                  <div className="glow-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Provide Missing Info</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        Ask and fill the remaining fields with conversation assistant.
                      </p>
                    </div>

                    {/* Conversational content body */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            alignSelf: msg.sender === "bot" ? "flex-start" : "flex-end",
                            background: msg.sender === "bot" ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)",
                            border: msg.sender === "bot" ? "1px solid rgba(255,255,255,0.05)" : "none",
                            borderRadius: "12px",
                            padding: "0.7rem 1rem",
                            maxWidth: "85%",
                            fontSize: "0.85rem",
                            lineHeight: "1.4"
                          }}
                        >
                          {msg.text}
                        </div>
                      ))}
                      {isChatTyping && (
                        <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "0.7rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          AI is writing...
                        </div>
                      )}
                      <div ref={chatEndRef}></div>
                    </div>

                    {/* Chat input box */}
                    <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={`Enter details...`}
                        className="form-input"
                        autoFocus
                      />
                      <button 
                        type="submit" 
                        className="glow-button"
                        style={{ padding: "0.75rem 1.25rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* WIZARD STEP 3: FORMAT VALIDATION CHECKLIST */}
                {wizardStep === "VALIDATE" && (
                  <div className="glow-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                        {validationPassed ? "✅" : "⚠️"}
                      </div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                        {validationPassed ? "Format Check Passed!" : "Formatting Issues Detected"}
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        We validated layout syntax constraints.
                      </p>
                    </div>

                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      background: "rgba(0, 0, 0, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "10px",
                      padding: "1.25rem",
                      marginBottom: "1.5rem"
                    }}>
                      {validationPassed ? (
                        <div style={{ color: "#34d399", fontSize: "0.85rem", lineHeight: "1.5" }}>
                          ✓ Format patterns for email matching: Passed.<br/>
                          ✓ Phone constraints (10 digits): Passed.<br/>
                          ✓ Date of birth parsing: Passed.<br/>
                          ✓ Required entries check: Passed.<br/><br/>
                          Your PDF fill overlay layout coordinates are generated. Click compile below.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#fbbf24" }}>Correct formatting warnings:</p>
                          {validationErrors.map((err, i) => (
                            <div key={i} style={{ fontSize: "0.8rem", color: "#f87171", background: "rgba(239,68,68,0.04)", padding: "0.4rem 0.6rem", borderRadius: "4px", borderLeft: "2.5px solid var(--danger)" }}>
                              • {err}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {!validationPassed && (
                        <button 
                          onClick={() => setWizardStep("REVIEW")}
                          className="glow-button-secondary"
                          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                        >
                          Edit Fields
                        </button>
                      )}
                      <button 
                        onClick={handleCompilePDF}
                        disabled={isCompiling}
                        className="glow-button"
                        style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        {isCompiling ? "Compiling Form Overlay..." : "Compile & Download PDF"}
                      </button>
                    </div>
                  </div>
                )}

                {/* WIZARD STEP 4: DOWNLOAD SUCCESS SCREEN */}
                {wizardStep === "DOWNLOAD" && (
                  <div className="glow-card" style={{ padding: "3rem", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "4.5rem", marginBottom: "1rem" }}>🎉</div>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                      Form Completed!
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
                      We mapped the coordinates, generated the overlay canvas, and pushed the merged PDF download stream.
                    </p>

                    <div style={{
                      background: "rgba(16, 185, 129, 0.04)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "10px",
                      padding: "1rem",
                      fontSize: "0.8rem",
                      color: "#34d399",
                      textAlign: "left",
                      marginBottom: "2rem"
                    }}>
                      🔒 <strong>Retention Policy Audit:</strong> Upload cache file was deleted from server system cache as soon as the response file stream closed.
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button 
                        onClick={handleExitWizard}
                        className="glow-button-secondary"
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Back to Portal
                      </button>
                      <button 
                        onClick={() => { setWizardStep("NONE"); setSelectedFile(null); setFileUrl(null); setActiveTab("upload"); }}
                        className="glow-button"
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}
                      >
                        Fill Another PDF
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Loading analyzing full screen overlay */}
      {isAnalyzing && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(8,7,13,0.9)",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div className="glow-card" style={{ width: "90%", maxWidth: "500px", padding: "3rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div className="laser"></div>
            <div style={{ position: "relative", zIndex: 10 }}>
              <div style={{ fontSize: "4rem", marginBottom: "1.5rem", animation: "pulse 2s infinite" }}>🔍</div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                AI Document Scanner Active
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
                FormFlow is matching parsed strings to local crypt records.
              </p>

              {/* Progress logger */}
              <div style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono), monospace",
                color: "#10b981",
                textAlign: "left",
                minHeight: "150px"
              }}>
                {analysisLogs.map((log, i) => (
                  <div key={i} style={{ marginBottom: "0.3rem" }}>
                    &gt; {log}
                  </div>
                ))}
                {analysisLogs.length < 5 && (
                  <div style={{ animation: "pulse 1s infinite" }}>&gt; scanning...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
