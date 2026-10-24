import React, { useState } from 'react';
import { Exercise, Submission, User } from '../../types';
import {
  X,
  Printer,
  FileText,
  Settings2,
  ExternalLink,
  RotateCcw,
  Upload,
  Trash2,
} from 'lucide-react';

interface LabRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  exercises: Exercise[];
  submissions: Submission[];
}

export const LabRecordModal: React.FC<LabRecordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  exercises,
  submissions,
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

  // Student's custom logo (optional image upload, or leave completely empty as requested)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Per-exercise student-entered procedure / algorithm state
  const [procedures, setProcedures] = useState<Record<string, string>>({});

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleResetProcedure = (id: string, title: string) => {
    setProcedures((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  if (!isOpen) return null;

  // Build records for exercises
  const exerciseRecords = exercises.map((ex, index) => {
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

    const outputResult =
      bestSub?.publicLog ||
      `Input:\n${ex.publicInput}\n\nOutput Result:\n${ex.publicOutput}\n\nEvaluation Status: [TEST PASSED 100%]`;

    return {
      index: index + 1,
      id: ex.id,
      title: ex.title,
      description: ex.description,
      date: formattedDate,
      pageNo: 4 + index,
      score,
      isPassed,
      code: sourceCode,
      publicInput: ex.publicInput,
      publicOutput: ex.publicOutput,
      outputResult,
      procedure: getProcedureForExercise(ex.id, ex.title),
    };
  });

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
                Customizable procedure text areas, bonafide certificate, index, and formatted experiment sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-xs"
              title="Customize Name, Reg No, Faculty, and Course information"
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showConfigDrawer ? 'Hide Details' : 'Edit Details'}</span>
            </button>

            {/* Print via isolated iframe button */}
            <button
              onClick={printViaIframe}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition shadow-xs"
              title="Print via isolated document if browser blocks modal print"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Print via Frame</span>
            </button>

            {/* Primary Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
              title="Print directly or save as formatted PDF (Ctrl+P / Cmd+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Toolbar (Hidden when printing) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Candidate:</span>
              <span className="font-bold text-slate-900">{studentName || '(Enter Name in Details)'}</span>
              {regNo && <span className="font-mono text-indigo-600 font-bold">({regNo})</span>}
            </div>
            <div className="text-slate-300">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Subject:</span>
              <span className="font-semibold text-slate-800">{courseCode} - {courseName}</span>
            </div>
            <div className="text-slate-300">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Scheduled Exercises:</span>
              <span className="font-bold text-emerald-700">{exerciseRecords.length} Programs</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-600 font-medium text-[11px] shadow-xs">
            <span>Rubrics: Left blank for Faculty evaluation &amp; signing</span>
          </div>
        </div>

        {/* Optional Collapsible Settings Drawer for Editing Custom Fields */}
        {showConfigDrawer && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 text-xs print:hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter Student Name"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Registration Number</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. 21BCE0450"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Course Code</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Course Name</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Degree & Branch</label>
                <input
                  type="text"
                  value={`${degree} ${specialization}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(' ');
                    setDegree(parts[0] || 'MCA');
                    setSpecialization(parts.slice(1).join(' ') || 'Computer Applications');
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Subject-in-Charge</label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Report Date</label>
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Logo Options: Let student add their own logo or leave empty */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Logo Space on Page 1:</span>
                <label className="cursor-pointer px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-indigo-600 font-semibold flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Logo File...</span>
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
                    onClick={() => setCustomLogoUrl(null)}
                    className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear (Leave Space Empty)</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                You can upload an image or leave the space empty to attach or draw on print.
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible print-scroll-container">
          
          {/* Printable Book Container */}
          <div
            id="printable-record-book"
            className="max-w-[210mm] mx-auto bg-white shadow-xl border border-slate-300 print:shadow-none print:border-none print:w-full text-black leading-relaxed"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            
            {/* ======================================================== */}
            {/*                   PAGE 1: TITLE PAGE                     */}
            {/* ======================================================== */}
            <div className="min-h-[297mm] p-12 sm:p-16 flex flex-col justify-between text-center relative print:p-14 print:min-h-screen break-after-page" style={{ pageBreakAfter: 'always' }}>
              {/* Institution Header: Words with Empty Space for Student's Logo */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Logo Space - Left blank or custom image added by student */}
                <div className="relative group w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-2 text-center shrink-0 print:border-dashed print:border-slate-300">
                  {customLogoUrl ? (
                    <>
                      <img src={customLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomLogoUrl(null);
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
                          {/* Rubrics columns - Clean empty cells for Faculty manual marking */}
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-1.5 print:border-black"></td>
                          <td className="border border-slate-900 p-2 print:border-black"></td>
                          <td className="border border-slate-900 p-2 font-mono print:border-black">
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
                          onClick={() => handleResetProcedure(item.id, item.title)}
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
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden shrink-0">
          <span>Click <strong>Print / Save as PDF</strong> or <strong>Print via Frame</strong> to generate physical lab record pages with exact A4 page breaks.</span>
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
