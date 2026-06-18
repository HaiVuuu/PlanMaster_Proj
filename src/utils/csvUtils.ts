import { Task, User, TaskStatus } from '@/types';

/**
 * Parses a CSV string into an array of Task objects.
 * Assumes a specific header format for import.
 * @param csvText The CSV content as a string.
 * @param currentTasksLength The number of tasks already in the project, for ordering.
 * @returns An array of parsed Task objects.
 */
export const parseCSV = (csvText: string, currentTasksLength: number): Task[] => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      if (currentCell || currentRow.length > 0) currentRow.push(currentCell);
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  // Skip header row (index 0), process data rows
  // Expected CSV columns (0-based index):
  // 0: STT (ignored), 1: Mã CV, 2: Tên công việc, 3: Giao việc (ignored for import), 4: ĐVT, 5: Khối lượng, 6: Đã xong, 7: Bắt đầu, 8: Kết thúc
  const importedTasks: Task[] = rows.slice(1).map((row, index): Task | null => {
    if (row.length < 9) return null; // Ensure enough columns

    return {
      id: `imp-${Date.now()}-${index}`, // Temporary ID, Firebase will assign a real one
      parentId: null,
      order: currentTasksLength + index + 1,
      code: row[1] || `IMP-${index + 1}`,
      name: row[2] || 'Công việc nhập khẩu',
      unit: row[4] || '',
      quantity: parseFloat(row[5]) || 0,
      completedQuantity: parseFloat(row[6]) || 0,
      logs: [],
      startDate: row[7] || new Date().toISOString().split('T')[0],
      endDate: row[8] || new Date().toISOString().split('T')[0],
      progress: 0,
      status: TaskStatus.NEW,
      assignees: []
    };
  }).filter((t): t is Task => t !== null);

  return importedTasks;
};

/**
 * Exports a list of tasks to a CSV file.
 * @param tasks The array of Task objects to export.
 * @param userMap A Map of User IDs to User objects for resolving assignee names.
 * @param projectId The ID of the current project, for filename.
 */
export const exportTasksToCSV = (tasks: Task[], userMap: Map<string, User>, projectId: string): void => {
  const headers = ["STT", "Mã CV", "Tên công việc", "Giao việc", "ĐVT", "Khối lượng", "Đã xong", "Bắt đầu", "Kết thúc"];
  const csvRows = [headers.join(',')];

  tasks.forEach((t, idx) => {
    const assigneesNames = t.assignees?.map(uid => userMap.get(uid)?.fullname || uid).join('; ') || '';

    const row = [
      idx + 1,
      `"${t.code}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${assigneesNames}"`,
      `"${t.unit}"`,
      t.quantity,
      t.completedQuantity || 0,
      t.startDate,
      t.endDate
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for UTF-8 compatibility in Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Tasks_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};