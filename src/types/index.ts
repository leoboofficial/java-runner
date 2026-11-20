export type UserRole = 'FACULTY' | 'STUDENT' | 'COORDINATOR' | 'GUEST';
export type AssessmentType = 'LAB' | 'ESE';
export type RubricAutoRule = 'CODE_IMPLEMENTATION' | 'OUTPUT_TESTS' | 'DOCUMENTATION' | 'MANUAL';

export interface RubricCriterion {
  id: string;
  label: string;
  description?: string;
  maxMarks: number;
  autoRule?: RubricAutoRule;
}

export interface DynamicRubricConfig {
  LAB: RubricCriterion[];
  ESE: RubricCriterion[];
}

export const DEFAULT_RUBRIC_CONFIG: DynamicRubricConfig = {
  LAB: [
    {
      id: 'conceptImplemented',
      label: 'Concept Implemented',
      description: 'Correct Java OOP logic, Scanner, and control structures',
      maxMarks: 5,
      autoRule: 'CODE_IMPLEMENTATION',
    },
    {
      id: 'namingConventions',
      label: 'Naming Conventions',
      description: 'Standard camelCase variables and PascalCase classes',
      maxMarks: 1,
      autoRule: 'DOCUMENTATION',
    },
    {
      id: 'documentation',
      label: 'Documentation',
      description: 'Comments, Aim, and written algorithm / procedure',
      maxMarks: 1,
      autoRule: 'DOCUMENTATION',
    },
    {
      id: 'output',
      label: 'Output Accuracy',
      description: 'Public and hidden test case execution passes',
      maxMarks: 3,
      autoRule: 'OUTPUT_TESTS',
    },
  ],
  ESE: [
    {
      id: 'algorithm',
      label: 'Algorithm & Problem Analysis',
      description: 'Logical approach, edge case handling, and class structure',
      maxMarks: 10,
      autoRule: 'DOCUMENTATION',
    },
    {
      id: 'implementation',
      label: 'Program Implementation',
      description: 'Java 17 syntax, OOP design, and modular code quality',
      maxMarks: 20,
      autoRule: 'CODE_IMPLEMENTATION',
    },
    {
      id: 'execution',
      label: 'Execution & Test Output',
      description: 'Public and hidden private test case verification',
      maxMarks: 15,
      autoRule: 'OUTPUT_TESTS',
    },
    {
      id: 'viva',
      label: 'Viva-Voce & Explanation',
      description: 'Oral examination and code defense during practical exam',
      maxMarks: 5,
      autoRule: 'MANUAL',
    },
  ],
};

export interface ExamModeConfig {
  eseEnabled: boolean;
  eseTitle: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface User {
  role: UserRole;
  email: string;
  username?: string;
  personalEmail?: string;
  deviceId?: string;
  multiStudentAlert?: string;
  name: string;
  regNo?: string;
  department?: string;
  verifiedViaSheet?: boolean;
  mustChangePassword?: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  assessmentType?: AssessmentType;
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
  assessmentType?: AssessmentType;
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
  assessmentType?: AssessmentType;
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
  dynamicScores?: Record<string, number>;
  maxTotalMarks?: number;
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

