export type UserRole = 'FACULTY' | 'STUDENT' | 'GUEST';

export interface User {
  role: UserRole;
  email: string;
  personalEmail?: string;
  deviceId?: string;
  multiStudentAlert?: string;
  name: string;
  regNo?: string;
  department?: string;
  verifiedViaSheet?: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  openTime: string; // ISO string or datetime-local
  closeTime: string; // ISO string or datetime-local
  publicInput: string;
  publicOutput: string;
  privateInput: string;
  privateOutput: string;
  starterCode?: string;
  maxScore?: number;
}

export type SubmissionStatus = 
  | 'ALL TEST CASES PASSED'
  | 'PARTIAL PASS'
  | 'FAILED'
  | 'COMPILATION ERROR'
  | 'TIME LIMIT EXCEEDED'
  | 'PENDING';

export interface Submission {
  id: string;
  timestamp: string;
  studentEmail: string;
  personalEmail?: string;
  deviceId?: string;
  multiStudentAlert?: string;
  regNo: string;
  studentName?: string;
  exerciseId: string;
  exerciseTitle?: string;
  code: string;
  status: SubmissionStatus;
  publicLog: string;
  privateLog: string;
  publicPassed: boolean;
  privatePassed: boolean;
  score: number;
}

export type ViolationType = 
  | 'TAB_SWITCH' 
  | 'FULLSCREEN_EXIT' 
  | 'COPY' 
  | 'PASTE' 
  | 'DEVTOOLS_ATTEMPT' 
  | 'MULTIPLE_DEVICES';

export interface Violation {
  id: string;
  timestamp: string;
  studentEmail: string;
  personalEmail?: string;
  deviceId?: string;
  regNo: string;
  studentName?: string;
  exerciseId: string;
  exerciseTitle?: string;
  type: ViolationType;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LoginAuditRecord {
  id: string;
  timestamp: string;
  officialEmail: string;
  regNo: string;
  studentName: string;
  personalEmail: string;
  deviceId: string;
  otherRegNos: string;
  status: 'CLEAR' | 'FLAGGED: MULTI-STUDENT PROXY' | string;
}

export interface StudentRecord {
  email: string;
  regNo: string;
  name: string;
  department: string;
  submissionsCount?: number;
  violationsCount?: number;
}

export interface FacultyRecord {
  email: string;
  name: string;
  department: string;
}

export interface ExecutionResult {
  passed: boolean;
  log: string;
  actualOutput?: string;
  expectedOutput?: string;
  executionTimeMs?: number;
  isError?: boolean;
  isTimeout?: boolean;
}

export interface SystemSettings {
  renderServiceUrl: string;
  apiSecret: string;
  googleSheetsUrl: string;
  enforceFullscreen: boolean;
  blockCopyPaste: boolean;
  trackTabSwitches: boolean;
  useBuiltinRunner: boolean;
}

export interface LabRecordMetadata {
  courseCode: string;
  courseName: string;
  degree: string;
  specialization: string;
  academicYear: string;
  facultyName: string;
  department: string;
  institution: string;
  location: string;
  reportDate: string;
  examDate?: string;
  rubricMode?: 'blank';
}

export interface RubricBreakdown {
  conceptImplemented: number; // Max 5 marks
  namingConventions: number;  // Max 1 mark
  documentation: number;      // Max 1 mark
  output: number;             // Max 3 marks
  total: number;              // Max 10 marks
  totalMarks?: number;
}

export type LabRecordStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_EVALUATION'
  | 'EVALUATED_APPROVED'
  | 'NEEDS_REVISION'
  | 'PENDING'
  | 'APPROVED';

export interface StudentLabRecordSubmission {
  id: string;
  timestamp: string;
  studentEmail: string;       // Official email account
  personalEmail?: string;     // Student's personal Mail ID (Gmail)
  deviceId?: string;          // Browser / Device identifier
  multiStudentAlert?: string; // Flagged if same Mail ID / device used for >1 RegNo
  regNo: string;              // Student registration number
  studentName: string;
  department?: string;
  completedExercisesCount: number;
  totalExercisesCount: number;
  antiCheatingViolationsCount: number;
  status: LabRecordStatus;
  rubrics?: RubricBreakdown;
  rubric?: RubricBreakdown;
  facultyRemarks?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  isVerifiedAndApproved: boolean;
  procedures?: Record<string, string>;
  isGmailSuspicious?: boolean;
  loggedGmail?: string;
  submissionDate?: string;
  violationsCount?: number;
}

