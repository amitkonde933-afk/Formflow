export interface Profile {
  full_name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  roll_number: string;
  semester: string;
  cgpa: string;
  address: string;
  parent_name: string;
  parent_occupation: string;
}

export interface FormField {
  label: string;
  type: string;
  required: boolean;
  matched_field: string | null;
  confidence: number;
  suggested_value: string;
  is_sensitive: boolean;
  review_required: boolean;
  confirmed?: boolean;
  explanation?: string;
}

export interface SavedDocument {
  id: string; // backend file_name
  originalName: string;
  fileSize?: string;
  uploadedAt: string;
  status: "In Progress" | "Completed";
  fields: FormField[];
  currentStep: "review" | "validation" | "complete";
}
