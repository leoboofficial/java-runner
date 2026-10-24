import { Exercise, StudentRecord, Submission, Violation } from '../types';

/**
 * Utility functions for exporting faculty assessment results:
 * - Consolidated Class Marksheet (CSV)
 * - Detailed Submissions Log (CSV)
 * - Anti-Cheating & Proctoring Incident Report (CSV)
 * - Complete Assessment Archive (JSON)
 */

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const sanitizeCSVCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * 1. Export Consolidated Student Marksheet / Gradebook (CSV)
 */
export const exportConsolidatedMarksheetCSV = (
  students: StudentRecord[],
  submissions: Submission[],
  exercises: Exercise[],
  violations: Violation[] = []
) => {
  const studentBestScores = new Map<string, Map<string, number>>();
  const studentSubmissionsCount = new Map<string, number>();

  submissions.forEach((sub) => {
    const reg = (sub.regNo || '').trim().toUpperCase();
    if (!studentBestScores.has(reg)) {
      studentBestScores.set(reg, new Map());
    }
    const currentBest = studentBestScores.get(reg)!.get(sub.exerciseId) || 0;
    if (sub.score > currentBest) {
      studentBestScores.get(reg)!.set(sub.exerciseId, sub.score);
    }
    studentSubmissionsCount.set(reg, (studentSubmissionsCount.get(reg) || 0) + 1);
  });

  const studentViolationCount = new Map<string, number>();
  violations.forEach((v) => {
    const reg = (v.regNo || '').trim().toUpperCase();
    studentViolationCount.set(reg, (studentViolationCount.get(reg) || 0) + 1);
  });

  const allStudentsMap = new Map<string, { regNo: string; name: string; email: string; department: string }>();

  students.forEach((s) => {
    const reg = s.regNo.trim().toUpperCase();
    allStudentsMap.set(reg, {
      regNo: s.regNo,
      name: s.name,
      email: s.email,
      department: s.department || 'Department of Computer Applications',
    });
  });

  submissions.forEach((sub) => {
    const reg = sub.regNo.trim().toUpperCase();
    if (!allStudentsMap.has(reg)) {
      allStudentsMap.set(reg, {
        regNo: sub.regNo,
        name: sub.studentName || 'Student',
        email: sub.studentEmail,
        department: 'Department of Computer Applications',
      });
    }
  });

  const maxTotalScore = exercises.length * 100;
  const exerciseHeaders = exercises.map((ex) => `${ex.id} (${ex.title.replace(/,/g, ' ')})`);
  const headers = [
    'Registration Number',
    'Student Name',
    'Institutional Email',
    'Department',
    ...exerciseHeaders,
    'Total Score',
    'Max Possible Score',
    'Percentage (%)',
    'Solved Exercises (100%)',
    'Total Submissions',
    'Proctoring Flags',
    'Evaluation Remark',
  ];

  const calculatedRows = Array.from(allStudentsMap.values()).map((stu) => {
    const reg = stu.regNo.trim().toUpperCase();
    const scoresMap = studentBestScores.get(reg) || new Map<string, number>();
    let totalScore = 0;
    let solvedCount = 0;
    const exScores = exercises.map((ex) => {
      const score = scoresMap.get(ex.id) ?? 0;
      totalScore += score;
      if (score === 100) solvedCount++;
      return score;
    });
    const percentage = maxTotalScore > 0 ? ((totalScore / maxTotalScore) * 100).toFixed(1) : '0.0';
    const flagCount = studentViolationCount.get(reg) || 0;
    const totalSubs = studentSubmissionsCount.get(reg) || 0;
    let remark = 'Pass';
    if (flagCount >= 3) {
      remark = 'Needs Academic Integrity Review (High Flags)';
    } else if (totalScore === maxTotalScore && maxTotalScore > 0) {
      remark = 'Exemplary - All Problems Solved';
    } else if (totalScore === 0) {
      remark = 'No Successful Solutions';
    }

    return {
      stu,
      totalScore,
      percentage,
      solvedCount,
      totalSubs,
      flagCount,
      remark,
      exScores,
    };
  });

  calculatedRows.sort((a, b) => b.totalScore - a.totalScore);

  const rows = calculatedRows.map((item) => {
    return [
      sanitizeCSVCell(item.stu.regNo),
      sanitizeCSVCell(item.stu.name),
      sanitizeCSVCell(item.stu.email),
      sanitizeCSVCell(item.stu.department),
      ...item.exScores.map((s) => s),
      item.totalScore,
      maxTotalScore,
      item.percentage,
      item.solvedCount,
      item.totalSubs,
      item.flagCount,
      sanitizeCSVCell(item.remark),
    ];
  });

  const csvContent = '\uFEFF' + [headers.map(sanitizeCSVCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `JavaLab_Consolidated_Marksheet_${dateStr}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * 2. Export Detailed Submissions Log (CSV)
 */
export const exportDetailedSubmissionsCSV = (
  submissions: Submission[],
  exercises: Exercise[]
) => {
  const exMap = new Map<string, string>();
  exercises.forEach((ex) => exMap.set(ex.id, ex.title));

  const headers = [
    'Submission ID',
    'Timestamp',
    'Registration Number',
    'Student Name',
    'Institutional Email',
    'Exercise ID',
    'Exercise Title',
    'Status',
    'Score',
    'Public Test Result',
    'Private Hidden Test Result',
    'Public Execution Output',
    'Private Execution Output',
  ];

  const rows = submissions.map((s) => {
    const exTitle = exMap.get(s.exerciseId) || s.exerciseTitle || s.exerciseId;
    return [
      sanitizeCSVCell(s.id),
      sanitizeCSVCell(s.timestamp),
      sanitizeCSVCell(s.regNo),
      sanitizeCSVCell(s.studentName || 'Student'),
      sanitizeCSVCell(s.studentEmail),
      sanitizeCSVCell(s.exerciseId),
      sanitizeCSVCell(exTitle),
      sanitizeCSVCell(s.status),
      s.score,
      sanitizeCSVCell(s.publicPassed ? 'PASSED' : 'FAILED'),
      sanitizeCSVCell(s.privatePassed ? 'PASSED' : 'FAILED'),
      sanitizeCSVCell((s.publicLog || '').slice(0, 500)),
      sanitizeCSVCell((s.privateLog || '').slice(0, 500)),
    ];
  });

  const csvContent = '\uFEFF' + [headers.map(sanitizeCSVCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `JavaLab_Detailed_Submissions_Log_${dateStr}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * 3. Export Anti-Cheating & Proctoring Incident Audit (CSV)
 */
export const exportViolationsAuditCSV = (violations: Violation[]) => {
  const headers = [
    'Incident ID',
    'Timestamp',
    'Registration Number',
    'Student Name',
    'Institutional Email',
    'Exercise ID',
    'Exercise Title',
    'Violation Type',
    'Severity',
    'Incident Details',
  ];

  const rows = violations.map((v) => [
    sanitizeCSVCell(v.id),
    sanitizeCSVCell(v.timestamp),
    sanitizeCSVCell(v.regNo),
    sanitizeCSVCell(v.studentName),
    sanitizeCSVCell(v.studentEmail),
    sanitizeCSVCell(v.exerciseId),
    sanitizeCSVCell(v.exerciseTitle),
    sanitizeCSVCell(v.type),
    sanitizeCSVCell(v.severity.toUpperCase()),
    sanitizeCSVCell(v.details),
  ]);

  const csvContent = '\uFEFF' + [headers.map(sanitizeCSVCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `JavaLab_Proctoring_Audit_Report_${dateStr}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * 4. Export Complete Assessment Archive (JSON)
 */
export const exportCompleteAssessmentJSON = (
  exercises: Exercise[],
  submissions: Submission[],
  students: StudentRecord[],
  violations: Violation[]
) => {
  const archive = {
    exportedAt: new Date().toISOString(),
    institution: 'Hindustan Institute of Technology & Science',
    domain: 'hindustanuniv.ac.in',
    summary: {
      totalExercises: exercises.length,
      totalStudents: students.length,
      totalSubmissions: submissions.length,
      totalProctoringFlags: violations.length,
    },
    exercises,
    students,
    submissions,
    violations,
  };

  const jsonContent = JSON.stringify(archive, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(jsonContent, `JavaLab_Assessment_Archive_${dateStr}.json`, 'application/json');
};
