import React, { useState, useEffect } from 'react';
import { Exercise, Submission, User, StudentLabRecordSubmission, Violation } from '../../types';
import { getOrCreateDeviceId, getSavedPersonalEmail } from '../../utils/deviceAudit';
import {
  X,
  Printer,
  FileText,
  Settings2,
  ExternalLink,
  RotateCcw,
  Upload,
  Trash2,
  Send,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  ArrowLeft,
  ImagePlus,
  Loader2,
  Download,
} from 'lucide-react';

interface LabRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
  evaluation?: StudentLabRecordSubmission;
  isFacultyPreview?: boolean;
  onSubmitRecordToFaculty?: (record: StudentLabRecordSubmission) => Promise<void> | void;
  violations?: Violation[];
}

export const LabRecordModal: React.FC<LabRecordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  exercises,
  submissions,
  evaluation,
  isFacultyPreview = false,
  onSubmitRecordToFaculty,
  violations = [],
}) => {
  // Configurable metadata
  const [studentName, setStudentName] = useState(currentUser.name || '');
  const [regNo, setRegNo] = useState(currentUser.regNo || '');
  const [courseCode, setCourseCode] = useState('BCB52003');
  const [courseName, setCourseName] = useState('Object Oriented Programming');
  const [reportTitle, setReportTitle] = useState('PRACTICAL REPORT');
  const [degree, setDegree] = useState('MCA');
  const [specialization, setSpecialization] = useState('Computer Applications');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [facultyName, setFacultyName] = useState('Dr. Sathish Kumar M, Asst Prof');
  const [department, setDepartment] = useState('Department of Computer Applications');
  const [institution, setInstitution] = useState('Hindustan Institute of Technology and Science');
  const [location, setLocation] = useState('Padur, Chennai');
  const [reportDate, setReportDate] = useState('Nov 2026');
  const [examDate, setExamDate] = useState('');

  const HITS_LOGO_STORAGE_KEY = 'javalab_pro_hits_logo';
  const OFFICIAL_HITS_LOGO_PATH = './assets/aistudio/HITS_LOGO_2025_47293b08.jpg';

  // Student's custom Hindustan logo (persisted locally so it remains after faculty approval)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('javalab_pro_hits_logo');
    } catch {
      return null;
    }
  });
  const [isWideBannerLogo, setIsWideBannerLogo] = useState(false);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Per-exercise student-entered procedure / algorithm state
  const [procedures, setProcedures] = useState<Record<string, string>>({});

  const [isSubmittingToFaculty, setIsSubmittingToFaculty] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(true);

  const activeRubrics = evaluation?.rubrics || evaluation?.rubric;
  const isApproved = Boolean(
    evaluation?.isVerifiedAndApproved ||
      evaluation?.status === 'EVALUATED_APPROVED' ||
      evaluation?.status === 'APPROVED'
  );
  const isPending = Boolean(
    !isApproved &&
      (evaluation?.status === 'PENDING_EVALUATION' || evaluation?.status === 'PENDING')
  );

  // Section-wise workflow state for students:
  // Section 1 ('preview'): See completed record PDF & upload Hindustan logo
  // Section 2 ('submit'): Submit record to faculty
  // Section 3 ('download'): Download/Print PDF (unlocked only after faculty approves)
  const [activeSection, setActiveSection] = useState<'preview' | 'submit' | 'download'>('preview');

  useEffect(() => {
    if (isOpen) {
      setStudentName(currentUser.name || '');
      setRegNo(currentUser.regNo || '');
      setSubmitErrorMsg(null);
      if (isApproved) {
        setActiveSection('download');
      } else if (isPending) {
        setActiveSection('submit');
      } else {
        setActiveSection('preview');
      }
    }
  }, [isOpen, isApproved, isPending, currentUser.name, currentUser.regNo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setIsWideBannerLogo(false);
        setCustomLogoUrl(result);
        try {
          localStorage.setItem(HITS_LOGO_STORAGE_KEY, result);
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setCustomLogoUrl(null);
    setIsWideBannerLogo(false);
    try {
      localStorage.removeItem(HITS_LOGO_STORAGE_KEY);
    } catch {}
  };

  const getDefaultProcedure = (title: string) => {
    return `1. Start the program execution.
2. Import the required package java.util.Scanner for console input.
3. Declare the main class and define public static void main(String[] args).
4. Initialize variables and Scanner objects according to problem requirements.
5. Implement the core logic to process inputs and compute output for ${title}.
6. Print the formatted result to the console using System.out.println().
7. Stop the program.`;
  };

  const getProcedureForExercise = (id: string, title: string) => {
    return procedures[id] !== undefined ? procedures[id] : getDefaultProcedure(title);
  };

  const handleProcedureChange = (id: string, text: string) => {
    setProcedures((prev) => ({ ...prev, [id]: text }));
  };

  const handleResetProcedure = (id: string) => {
    setProcedures((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleSubmitToFaculty = async () => {
    if (!onSubmitRecordToFaculty) return;
    setSubmitErrorMsg(null);
    setSubmitSuccessMsg(null);

    const cleanReg = (regNo || currentUser.regNo || '').trim().toUpperCase();
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanPersonalEmail = (
      currentUser.personalEmail ||
      getSavedPersonalEmail() ||
      ''
    )
      .trim()
      .toLowerCase();
    const activeDeviceId = currentUser.deviceId || getOrCreateDeviceId();
    const cleanName = (studentName || currentUser.name || '').trim();

    if (!cleanReg) {
      setSubmitErrorMsg('Please enter your Registration Number below before submitting to faculty.');
      return;
    }

    if (!cleanEmail) {
      setSubmitErrorMsg('Please sign in / verify your Official University Email before submitting.');
      return;
    }

    setIsSubmittingToFaculty(true);

    const completedCount = allExerciseRecords.filter((r) => r.hasSubmission).length;

    const record: StudentLabRecordSubmission = {
      id: `REC_${cleanReg}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      studentEmail: cleanEmail,
      personalEmail: cleanPersonalEmail,
      loggedGmail: cleanPersonalEmail,
      deviceId: activeDeviceId,
      multiStudentAlert: currentUser.multiStudentAlert || '',
      regNo: cleanReg,
      studentName: cleanName,
      department,
      completedExercisesCount: completedCount,
      totalExercisesCount: exercises.length,
      antiCheatingViolationsCount: violations.length,
      status: 'PENDING_EVALUATION',
      isVerifiedAndApproved: false,
      procedures,
    };

    try {
      await onSubmitRecordToFaculty(record);
      setSubmitSuccessMsg(
        `Lab Record successfully submitted for ${cleanName} (${cleanReg})! Wait for Faculty approval to download & print your PDF.`
      );
    } catch (err: any) {
      setSubmitErrorMsg('Failed to submit record: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmittingToFaculty(false);
    }
  };

  if (!isOpen) return null;

  // Build records for exercises
  const allExerciseRecords = exercises.map((ex, index) => {
    const studentSubs: Submission[] = submissions.filter(
      (s) =>
        s.exerciseId === ex.id &&
        ((currentUser.regNo && s.regNo.trim().toUpperCase() === currentUser.regNo.trim().toUpperCase()) ||
          (currentUser.email && s.studentEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );

    const bestSub: Submission | null = studentSubs.reduce<Submission | null>((acc, cur) => {
      if (!acc || cur.score > acc.score) return cur;
      return acc;
    }, null);

    const hasSubmission = bestSub !== null;
    const isPassed = bestSub !== null && bestSub.score === 100;
    const score = bestSub ? bestSub.score : 0;

    const rawDate = bestSub?.timestamp || ex.openTime || new Date().toISOString();
    let formattedDate = '';
    try {
      formattedDate = new Date(rawDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      formattedDate = new Date().toLocaleDateString('en-GB');
    }

    const sourceCode =
      bestSub?.code ||
      ex.starterCode ||
      `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Program implementation for: ${ex.title}\n        System.out.println("${ex.publicOutput.replace(/\n/g, ' ')}");\n    }\n}`;

    const formatOutputResult = (): string => {
      if (!bestSub) {
        return `Input:\n${ex.publicInput}\n\nOutput Result:\n${ex.publicOutput}\n\nEvaluation Status: [TEST PASSED 100%]`;
      }

      const rawLog = (bestSub.publicLog || '').trim();
      const isPublicPassed =
        bestSub.publicPassed || /^PASSED(\s*\(.*\))?$/i.test(rawLog);

      if (isPublicPassed) {
        const statusLabel =
          bestSub.score === 100
            ? 'TEST PASSED 100%'
            : `${bestSub.status || 'PARTIAL PASS'} (${bestSub.score}%)`;
        return `Input:\n${ex.publicInput}\n\nOutput Result:\n${ex.publicOutput}\n\nEvaluation Status: [${statusLabel}]`;
      }

      if (rawLog.includes('Got:\n')) {
        const gotPart = rawLog.split('Got:\n')[1]?.trim() || '(No output printed)';
        return `Input:\n${ex.publicInput}\n\nOutput Result:\n${gotPart}\n\nEvaluation Status: [${bestSub.status || 'FAILED'} (${bestSub.score}%)]`;
      }

      if (!rawLog) {
        return `Input:\n${ex.publicInput}\n\nOutput Result:\n${ex.publicOutput}\n\nEvaluation Status: [${bestSub.status || 'SUBMITTED'} (${bestSub.score}%)]`;
      }

      return `Input:\n${ex.publicInput}\n\nOutput Result:\n${rawLog}\n\nEvaluation Status: [${bestSub.status || 'ERROR'}]`;
    };

    const outputResult = formatOutputResult();

    return {
      index: index + 1,
      id: ex.id,
      title: ex.title,
      description: ex.description,
      date: formattedDate,
      pageNo: 4 + index,
      score,
      isPassed,
      hasSubmission,
      code: sourceCode,
      publicInput: ex.publicInput,
      publicOutput: ex.publicOutput,
      outputResult,
      procedure: getProcedureForExercise(ex.id, ex.title),
    };
  });

  const completedOnlyRecords = allExerciseRecords.filter((r) => r.hasSubmission);
  const exerciseRecords =
    !isFacultyPreview && showOnlyCompleted && completedOnlyRecords.length > 0
      ? completedOnlyRecords.map((item, idx) => ({ ...item, index: idx + 1, pageNo: 4 + idx }))
      : allExerciseRecords;

  // Reliable Multi-Strategy Print Handler
  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct window.print() failed, falling back to isolated frame:', err);
      printViaIframe();
    }
  };

  const printViaIframe = () => {
    const printableElement = document.getElementById('printable-record-book');
    if (!printableElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${courseCode} Practical Report - ${studentName || 'Student'}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            body { background: white; color: black; font-family: "Times New Roman", Times, serif; margin: 0; padding: 0; }
            .break-after-page { page-break-after: always; break-after: page; }
            .print\\:hidden { display: none !important; }
            pre { white-space: pre-wrap; font-family: monospace; font-size: 11px; }
            img { max-width: 100%; max-height: 115px; height: auto; object-fit: contain; display: block; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; border: 1px solid black; }
            th, td { border: 1px solid black; padding: 6px; font-size: 12px; }
          </style>
        </head>
        <body>
          ${printableElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 2000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto print-modal-container">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden print:w-full print:h-auto print:border-none print:shadow-none print:rounded-none text-slate-900">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Official Lab Record Generator
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  HITS Template
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isFacultyPreview
                  ? 'Faculty Inspection View — Verify student practical record pages and print if needed'
                  : 'Follow Sections 1 → 2 → 3: Preview completed record & upload Hindustan logo, submit to faculty, then download approved PDF'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFacultyPreview && (
              <>
                <button
                  onClick={printViaIframe}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print via Frame</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section-Wise Workflow Stepper (Student Portal Only, Hidden on Print) */}
        {!isFacultyPreview && (
          <div className="bg-white border-b border-slate-200 px-6 py-3 print:hidden shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Section 1 */}
              <button
                type="button"
                onClick={() => setActiveSection('preview')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  activeSection === 'preview'
                    ? 'bg-indigo-50 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    activeSection === 'preview'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Preview Record &amp; Upload Logo
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {completedOnlyRecords.length} completed program(s) • {customLogoUrl ? 'Logo uploaded' : 'Upload Hindustan logo'}
                  </div>
                </div>
              </button>

              {/* Section 2 */}
              <button
                type="button"
                onClick={() => setActiveSection('submit')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  activeSection === 'submit'
                    ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isApproved || isPending
                      ? 'bg-emerald-600 text-white'
                      : activeSection === 'submit'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isApproved || isPending ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Submit Record to Faculty
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {isApproved
                      ? 'Evaluated & Approved'
                      : isPending
                      ? 'Submitted • Pending Review'
                      : 'Send for faculty approval'}
                  </div>
                </div>
              </button>

              {/* Section 3 */}
              <button
                type="button"
                onClick={() => setActiveSection('download')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  activeSection === 'download'
                    ? isApproved
                      ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                      : 'bg-slate-100 border-slate-400 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isApproved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Download &amp; Print PDF
                  </div>
                  <div className="text-[11px] truncate font-semibold">
                    {isApproved ? (
                      <span className="text-emerald-700">Approved ({activeRubrics?.total ?? activeRubrics?.totalMarks ?? 10}/10) • Ready</span>
                    ) : (
                      <span className="text-slate-500">Locked until Faculty approves</span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Section-Specific Action Panels (Hidden when printing) */}
        {!isFacultyPreview && activeSection === 'preview' && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 space-y-3 print:hidden shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Hindustan Logo Upload Card */}
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Hindustan Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">
                    Step 1A: Download &amp; Upload Hindustan University Logo
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={OFFICIAL_HITS_LOGO_PATH}
                      download="HITS_LOGO_2025.jpg"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Official Logo</span>
                    </a>
                    <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition">
                      <Upload className="w-3 h-3" />
                      <span>{customLogoUrl ? 'Change Logo' : 'Upload Hindustan Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {customLogoUrl && (
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Completed Programs Filter + Edit Details + Next Step */}
              <div className="flex flex-wrap items-center gap-2.5">
                {completedOnlyRecords.length > 0 && completedOnlyRecords.length < allExerciseRecords.length && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyCompleted(!showOnlyCompleted)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    {showOnlyCompleted
                      ? `Showing Completed Only (${completedOnlyRecords.length}/${allExerciseRecords.length})`
                      : `Showing All Scheduled (${allExerciseRecords.length})`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
                >
                  <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showConfigDrawer ? 'Hide Details' : 'Edit Record Details'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('submit')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <span>Next: Submit to Faculty</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {completedOnlyRecords.length === 0 && (
              <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  You have not submitted any exercise code yet. Previewing scheduled template exercises below — complete and submit exercises in the IDE to include your solutions.
                </span>
              </div>
            )}

            {/* Collapsible Details Editor */}
            {showConfigDrawer && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Student Name</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter Student Name"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Registration Number</label>
                    <input
                      type="text"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. 2411001"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Course Code</label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Course Name</label>
                    <input
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Degree &amp; Branch</label>
                    <input
                      type="text"
                      value={`${degree} ${specialization}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(' ');
                        setDegree(parts[0] || 'MCA');
                        setSpecialization(parts.slice(1).join(' ') || 'Computer Applications');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Academic Year</label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Subject-in-Charge</label>
                    <input
                      type="text"
                      value={facultyName}
                      onChange={(e) => setFacultyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Report Date</label>
                    <input
                      type="text"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3 Top Action Strip when Approved */}
        {!isFacultyPreview && activeSection === 'download' && isApproved && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Approved by Faculty: {activeRubrics?.total ?? activeRubrics?.totalMarks ?? 10} / 10 Marks Awarded
                </span>
              </div>
              <div className="text-xs text-emerald-800">
                Concept: <strong>{activeRubrics?.conceptImplemented ?? 5}/5</strong> • Naming: <strong>{activeRubrics?.namingConventions ?? 1}/1</strong> • Doc: <strong>{activeRubrics?.documentation ?? 1}/1</strong> • Output: <strong>{activeRubrics?.output ?? 3}/3</strong> • Verified by <strong>{evaluation?.evaluatedBy || facultyName}</strong>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={printViaIframe}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-300 transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Print via Frame</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print Official PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible print-scroll-container ${
            !isApproved && !isFacultyPreview ? 'print:hidden' : ''
          }`}
        >
          {/* SECTION 2 BODY: SUBMIT RECORD TO FACULTY */}
          {!isFacultyPreview && activeSection === 'submit' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6 my-4 print:hidden">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Section 2 of 3
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">
                    Submit Lab Record for Faculty Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Confirm your completed programs and Hindustan logo details, then submit your Lab Record to your faculty for rubric grading and approval.
                  </p>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Student Name</div>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    disabled={isApproved}
                    placeholder="Enter Student Name"
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Registration Number</div>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    disabled={isApproved}
                    placeholder="e.g. 2411001"
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Completed Exercises</div>
                  <div className="text-sm font-black text-emerald-700 mt-1">
                    {completedOnlyRecords.length} / {allExerciseRecords.length} Programs
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold">Hindustan Logo</div>
                    <div className={`text-xs font-bold mt-1 ${customLogoUrl ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {customLogoUrl ? 'Uploaded & Ready' : 'Not uploaded yet'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('preview')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                  >
                    {customLogoUrl ? 'Change' : 'Upload Logo'}
                  </button>
                </div>
              </div>

              {submitErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitErrorMsg}</span>
                </div>
              )}

              {submitSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{submitSuccessMsg}</span>
                </div>
              )}

              {/* Status & Action Buttons */}
              {isApproved ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Your Lab Record is Evaluated &amp; Approved ({activeRubrics?.total ?? activeRubrics?.totalMarks ?? 10} / 10 Marks)!</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Your PDF is unlocked. Proceed to Section 3 to download and print your official approved Practical Lab Record.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('download')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
                  >
                    <span>Go to Section 3: Download &amp; Print PDF</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : isPending ? (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>Record Submitted • Awaiting Faculty Evaluation &amp; Approval</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Your lab record has been sent to the Faculty Portal. As soon as your instructor evaluates and approves your record, Section 3 will unlock PDF download &amp; print.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSection('preview')}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Section 1 Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitToFaculty}
                      disabled={isSubmittingToFaculty}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingToFaculty ? 'Updating...' : 'Re-Submit Updated Record'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveSection('preview')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Section 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitToFaculty}
                    disabled={isSubmittingToFaculty || !onSubmitRecordToFaculty}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmittingToFaculty ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Record to Faculty...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Record to Faculty</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3 LOCKED STATE (When NOT yet approved by Faculty) */}
          {!isFacultyPreview && activeSection === 'download' && !isApproved && (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center space-y-4 my-8 print:hidden">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {isPending ? 'Awaiting Faculty Approval' : 'Submission Required'}
                </span>
                <h3 className="text-xl font-black text-slate-900 pt-1">
                  PDF Download &amp; Print Locked
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {isPending
                    ? 'You have submitted your Lab Record to Faculty. Once your faculty evaluates your 10-mark rubrics and approves the record, your official PDF download and print buttons will unlock automatically here.'
                    : 'Please preview your completed Lab Record and upload the Hindustan logo in Section 1, then submit your record to Faculty in Section 2. Once Faculty approves it, you can download & print your PDF here.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('preview')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Section 1: Preview &amp; Logo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('submit')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>Section 2: {isPending ? 'View Submission Status' : 'Submit to Faculty'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Printable Book Container (Shown in Section 1 on-screen preview, Section 3 when Approved, or Faculty Inspection) */}
          {(isFacultyPreview || activeSection === 'preview' || (activeSection === 'download' && isApproved)) && (
          <div
            id="printable-record-book"
            className="max-w-[210mm] mx-auto bg-white shadow-xl border border-slate-300 print:shadow-none print:border-none print:w-full text-black leading-relaxed"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            
            {/* ======================================================== */}
            {/*                   PAGE 1: TITLE PAGE                     */}
            {/* ======================================================== */}
            <div className="min-h-[297mm] p-12 sm:p-16 flex flex-col justify-between text-center relative print:p-14 print:min-h-screen break-after-page" style={{ pageBreakAfter: 'always' }}>
              {/* Institution Header: Banner Logo OR Emblem + Text */}
              {customLogoUrl && isWideBannerLogo ? (
                <div className="pt-4 flex flex-col items-center justify-center">
                  <div className="relative group w-full max-w-[480px] flex items-center justify-center p-2 rounded-2xl">
                    <img
                      src={customLogoUrl}
                      alt="Hindustan Institute of Technology and Science Logo"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setIsWideBannerLogo(img.naturalWidth / Math.max(1, img.naturalHeight) > 2.0);
                      }}
                      className="w-full h-auto max-h-28 object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearLogo();
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 print:hidden"
                      title="Remove logo (leave space empty)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer print:hidden"
                      title="Click to change logo image"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* Logo Space - Left blank or custom image added by student */}
                  <div className={`relative group ${customLogoUrl ? 'w-24 h-24 sm:w-28 sm:h-28 border-transparent' : 'w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-slate-300 print:border-dashed print:border-slate-300'} rounded-2xl flex flex-col items-center justify-center p-2 text-center shrink-0`}>
                    {customLogoUrl ? (
                      <>
                        <img
                          src={customLogoUrl}
                          alt="Logo"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            setIsWideBannerLogo(img.naturalWidth / Math.max(1, img.naturalHeight) > 2.0);
                          }}
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearLogo();
                          }}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 print:hidden"
                          title="Remove logo (leave space empty)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 font-sans block leading-tight">
                          [ Logo Space ]
                        </span>
                        <span className="text-[9px] text-slate-400 font-sans block print:hidden">
                          Click to add logo or leave empty
                        </span>
                      </div>
                    )}
                    {/* Click to upload custom logo */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer print:hidden"
                      title="Click to select your own logo image, or leave empty"
                    />
                  </div>

                  {/* Institution Name in Words */}
                  <div className="text-left font-sans select-none">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 print:text-black tracking-wide leading-none">
                      HINDUSTAN
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 print:text-black tracking-[0.25em] sm:tracking-[0.28em] uppercase mt-2">
                      INSTITUTE OF TECHNOLOGY &amp; SCIENCE
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-700 print:text-gray-800 tracking-[0.18em] sm:tracking-[0.2em] uppercase mt-1">
                      (DEEMED TO BE UNIVERSITY)
                    </p>
                  </div>
                </div>
              )}

              {/* Title & Subject */}
              <div className="space-y-6 my-auto py-10" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="text-xl font-bold tracking-wider text-slate-900 print:text-black">
                  {courseCode}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight print:text-black">
                  {courseName}
                </div>
                <div className="inline-block border-y-2 border-slate-900 py-2.5 px-8 text-xl font-black uppercase tracking-wider text-slate-900 print:border-black print:text-black">
                  {reportTitle}
                </div>
              </div>

              {/* Submission Information - Clean without << >> */}
              <div className="space-y-8 pb-8">
                <div className="space-y-2">
                  <p className="text-sm italic text-slate-700 print:text-black">
                    Submitted By
                  </p>
                  <p className="text-lg font-bold text-slate-900 print:text-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {studentName || 'Student Name'}
                  </p>
                  <p className="text-base font-bold text-slate-800 print:text-black font-mono">
                    {regNo || 'Registration Number'}
                  </p>
                </div>

                <div className="text-sm font-semibold text-slate-800 pt-4 print:text-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {reportDate}
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/*              PAGE 2: BONAFIDE CERTIFICATE                */}
            {/* ======================================================== */}
            <div className="min-h-[297mm] p-12 sm:p-16 flex flex-col justify-between text-left relative print:p-14 print:min-h-screen break-after-page border-t border-slate-200 print:border-none" style={{ pageBreakAfter: 'always' }}>
              <div className="space-y-12 pt-6">
                {/* Certificate Heading */}
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 pb-2 print:text-black">
                  Bonafide Certificate
                </h2>

                {/* Certificate Text matching exact template wording */}
                <div className="text-base leading-loose text-justify text-slate-900 print:text-black">
                  This is to certify that the record work of{' '}
                  <strong className="font-bold">{courseName} Laboratory</strong> record
                  of work done by{' '}
                  <strong className="font-bold">
                    {studentName || 'Student Name'}
                  </strong>
                  ,{' '}
                  <strong className="font-bold font-mono">
                    {regNo || 'Registration Number'}
                  </strong>{' '}
                  is part of the partial fulfilment of the award of{' '}
                  <strong className="font-bold">{degree}</strong>{' '}
                  {specialization} degree during the academic year{' '}
                  <strong className="font-bold">{academicYear}</strong>.
                </div>

                {/* Staff In-charge signature block */}
                <div className="pt-10 space-y-1">
                  <p className="text-sm font-bold text-slate-900 print:text-black">
                    Subject-in-Charge
                  </p>
                  <p className="text-sm font-semibold text-slate-900 print:text-black">
                    {facultyName}
                  </p>
                  <p className="text-xs text-slate-700 print:text-black">{department}</p>
                  <p className="text-xs text-slate-700 print:text-black">{institution}</p>
                  <p className="text-xs text-slate-700 print:text-black">{location}</p>
                </div>
              </div>

              {/* Examination and Examiner signatures */}
              <div className="space-y-12 pb-6">
                <div className="text-sm text-slate-800 print:text-black">
                  Practical Examination held on {examDate || '____________________'}
                </div>

                <div className="flex items-center justify-between pt-8 text-sm font-bold text-slate-900 print:text-black">
                  <div className="text-center">
                    <div className="w-44 border-b border-slate-900 mb-2 print:border-black"></div>
                    <span>Internal Examiner</span>
                  </div>
                  <div className="text-center">
                    <div className="w-44 border-b border-slate-900 mb-2 print:border-black"></div>
                    <span>External Examiner</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/*                   PAGE 3: INDEX TABLE                    */}
            {/* ======================================================== */}
            <div className="min-h-[297mm] p-10 sm:p-14 flex flex-col justify-start relative print:p-10 print:min-h-screen break-after-page border-t border-slate-200 print:border-none" style={{ pageBreakAfter: 'always' }}>
              <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900 tracking-wider mb-6 print:text-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                INDEX
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-900 text-left print:border-black">
                  <thead>
                    <tr className="bg-slate-100 print:bg-white text-center font-bold">
                      <th rowSpan={2} className="border border-slate-900 p-2 w-10 print:border-black">
                        S. No
                      </th>
                      <th rowSpan={2} className="border border-slate-900 p-2 w-20 print:border-black">
                        Date
                      </th>
                      <th rowSpan={2} className="border border-slate-900 p-2 print:border-black">
                        Program Title
                      </th>
                      <th colSpan={4} className="border border-slate-900 p-1.5 print:border-black">
                        Rubrics
                      </th>
                      <th rowSpan={2} className="border border-slate-900 p-2 w-14 print:border-black">
                        Total<br />(10)
                      </th>
                      <th rowSpan={2} className="border border-slate-900 p-2 w-12 print:border-black">
                        Page No
                      </th>
                      <th rowSpan={2} className="border border-slate-900 p-2 w-20 print:border-black">
                        Faculty Sign
                      </th>
                    </tr>
                    <tr className="bg-slate-50 print:bg-white text-center text-[10px] font-semibold">
                      <th className="border border-slate-900 p-1.5 w-16 print:border-black leading-tight">
                        Concept Implemented<br />(5)
                      </th>
                      <th className="border border-slate-900 p-1.5 w-16 print:border-black leading-tight">
                        Naming Conventions<br />(1)
                      </th>
                      <th className="border border-slate-900 p-1.5 w-16 print:border-black leading-tight">
                        Documentation<br />(1)
                      </th>
                      <th className="border border-slate-900 p-1.5 w-14 print:border-black leading-tight">
                        Output<br />(3)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseRecords.length === 0 ? (
                      /* Clean blank 9 rows matching page 3 of template if empty */
                      Array.from({ length: 9 }).map((_, i) => (
                        <tr key={i} className="text-center h-8">
                          <td className="border border-slate-900 p-2 font-bold print:border-black">
                            {i + 1}
                          </td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                        </tr>
                      ))
                    ) : (
                      exerciseRecords.map((item) => (
                        <tr key={item.id} className="text-center">
                          <td className="border border-slate-900 p-2 font-bold print:border-black">
                            {item.index}
                          </td>
                          <td className="border border-slate-900 p-2 font-mono text-[11px] print:border-black">
                            {item.date}
                          </td>
                          <td className="border border-slate-900 p-2 text-left font-semibold print:border-black">
                            {item.title}
                          </td>
                          {/* Rubrics columns - populated when evaluated by faculty */}
                          <td className="border border-slate-900 p-1.5 print:border-black font-mono font-bold text-center">
                            {activeRubrics ? activeRubrics.conceptImplemented : ''}
                          </td>
                          <td className="border border-slate-900 p-1.5 print:border-black font-mono font-bold text-center">
                            {activeRubrics ? activeRubrics.namingConventions : ''}
                          </td>
                          <td className="border border-slate-900 p-1.5 print:border-black font-mono font-bold text-center">
                            {activeRubrics ? activeRubrics.documentation : ''}
                          </td>
                          <td className="border border-slate-900 p-1.5 print:border-black font-mono font-bold text-center">
                            {activeRubrics ? activeRubrics.output : ''}
                          </td>
                          <td className="border border-slate-900 p-2 print:border-black font-mono font-bold text-center text-indigo-950 print:text-black">
                            {activeRubrics ? (activeRubrics.total ?? activeRubrics.totalMarks) : ''}
                          </td>
                          <td className="border border-slate-900 p-2 font-mono print:border-black text-center">
                            {item.pageNo}
                          </td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* ======================================================== */}
            {/*         PAGES 4+: EXPERIMENT SHEETS (1 PER PROGRAM)      */}
            {/* ======================================================== */}
            {exerciseRecords.length === 0 ? (
              /* Single blank template page if no exercises scheduled yet */
              <div
                className="min-h-[297mm] p-10 sm:p-14 flex flex-col justify-between text-left relative print:p-10 print:min-h-screen break-after-page border-t border-slate-200 print:border-none"
                style={{ pageBreakAfter: 'always' }}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-xs font-bold print:border-black">
                    <span>Date: </span>
                    <span>Experiment #1</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 print:text-black">
                    1. Program Title
                  </h3>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                      Aim:
                    </h4>
                    <p className="text-xs text-slate-500 italic">
                      [Aim will be populated automatically when faculty schedules the exercise]
                    </p>
                  </div>

                  {/* Procedure Area */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                      Procedure / Algorithm:
                    </h4>
                    <p className="text-xs text-slate-500 italic">
                      [Procedure text area will be active for scheduled programs]
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                      Coding:
                    </h4>
                    <div className="h-32 border border-slate-400 rounded-lg p-3 bg-slate-50 print:bg-white"></div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                      Output:
                    </h4>
                    <div className="h-20 border border-slate-400 rounded-lg p-3 bg-slate-50 print:bg-white"></div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                      Result:
                    </h4>
                    <p className="text-xs text-slate-500 italic">
                      [Result will appear here]
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between text-xs font-bold print:text-black">
                  <div>Page 4</div>
                  <div className="text-right">
                    <span className="inline-block w-40 border-b border-slate-900 mr-2 print:border-black"></span>
                    <span>Staff Signature</span>
                  </div>
                </div>
              </div>
            ) : (
              exerciseRecords.map((item) => (
                <div
                  key={item.id}
                  className="min-h-[297mm] p-10 sm:p-14 flex flex-col justify-between text-left relative print:p-10 print:min-h-screen break-after-page border-t border-slate-200 print:border-none"
                  style={{ pageBreakAfter: 'always' }}
                >
                  <div className="space-y-5">
                    {/* Experiment Top Bar */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-xs font-bold print:border-black">
                      <span>Date: {item.date}</span>
                      <span>Experiment #{item.index}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-slate-900 print:text-black">
                      {item.index}. {item.title}
                    </h3>

                    {/* Aim */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                        Aim:
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed text-justify print:text-black">
                        To write, compile, and execute a Java program for{' '}
                        <strong>{item.title}</strong>, evaluate standard input data, and verify execution
                        against test criteria.
                      </p>
                    </div>

                    {/* Procedure Text Area for Students */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-1.5">
                          <span>Procedure / Algorithm:</span>
                          <span className="text-[10px] font-normal text-indigo-600 print:hidden font-sans">
                            (Editable Text Area for Student)
                          </span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleResetProcedure(item.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 print:hidden font-sans"
                          title="Reset to default algorithm"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>

                      {/* Browser Interactive Editable Textarea */}
                      <div className="print:hidden">
                        <textarea
                          rows={6}
                          value={item.procedure}
                          onChange={(e) => handleProcedureChange(item.id, e.target.value)}
                          placeholder="Type or paste step-by-step procedure/algorithm for this experiment..."
                          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans transition"
                        />
                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                          Tip: You can edit or write your own procedure steps above. When printed, it formats as clean publication text.
                        </span>
                      </div>

                      {/* Printed Output View (Pristine typography, no textarea box in PDF) */}
                      <div className="hidden print:block text-xs text-slate-800 leading-relaxed font-serif whitespace-pre-wrap pl-1">
                        {item.procedure}
                      </div>
                    </div>

                    {/* Coding */}
                    <div className="space-y-1 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                        Coding:
                      </h4>
                      <div className="bg-slate-50 border border-slate-400 rounded-lg p-3 font-mono text-[11px] leading-relaxed overflow-x-auto print:bg-white print:border-black print:text-black">
                        <pre className="whitespace-pre-wrap">{item.code}</pre>
                      </div>
                    </div>

                    {/* Output */}
                    <div className="space-y-1 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                        Output:
                      </h4>
                      <div className="bg-slate-50 border border-slate-400 rounded-lg p-2.5 font-mono text-[11px] leading-relaxed print:bg-white print:border-black print:text-black">
                        <pre className="whitespace-pre-wrap">{item.outputResult}</pre>
                      </div>
                    </div>

                    {/* Result */}
                    <div className="space-y-1 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black">
                        Result:
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed print:text-black">
                        Thus the Java program for <strong>{item.title}</strong> was successfully written,
                        compiled, and executed, and the output was verified.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Signature Line */}
                  <div className="pt-6 flex items-center justify-between text-xs font-bold print:text-black">
                    <div>Page {item.pageNo}</div>
                    <div className="text-right">
                      <span className="inline-block w-40 border-b border-slate-900 mr-2 print:border-black"></span>
                      <span>Staff Signature</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden shrink-0">
          <span>
            {isFacultyPreview || isApproved
              ? 'Ready to download / print official Lab Record pages with exact A4 page breaks.'
              : 'Section 1: Preview & Upload Hindustan Logo → Section 2: Submit to Faculty → Section 3: Download PDF (after approval).'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
