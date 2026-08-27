import XLSX from 'xlsx-js-style';

export interface ExportSheetConfig {
  sheetName: string;
  data: any[];
}

/**
 * Generates and downloads a beautifully styled Excel workbook matching professional spreadsheet design:
 * - Deep purple header with bold white text and borders
 * - Native Excel AutoFilter enabled on all column headers
 * - Auto-calculated generous column widths (no truncated text)
 * - Clean borders, typography, and centered alignments
 */
export const exportStyledExcel = (sheets: ExportSheetConfig[], fileName: string) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);

    // 1. Calculate generous column widths dynamically
    const colKeys = Object.keys(data[0] || {});
    const colWidths = colKeys.map(key => {
      let maxLen = key.toString().length;
      data.forEach(row => {
        const val = row[key] !== undefined && row[key] !== null ? row[key].toString() : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      // Add padding of 4 chars, minimum 14 width, max 50 width
      return { wch: Math.min(Math.max(maxLen + 4, 14), 50) };
    });
    worksheet['!cols'] = colWidths;

    // 2. Set native Excel AutoFilter on header row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    // 3. Set row height (Header 28px, Data 20px)
    const rowHeights: any[] = [{ hpt: 26 }];
    for (let r = 1; r <= data.length; r++) {
      rowHeights.push({ hpt: 20 });
    }
    worksheet['!rows'] = rowHeights;

    // 4. Header Style: Deep Purple background (#581C87), Bold White Text, Centered
    const headerStyle = {
      fill: {
        fgColor: { rgb: "581C87" }
      },
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: false
      },
      border: {
        top: { style: "thin", color: { rgb: "3B0764" } },
        bottom: { style: "medium", color: { rgb: "3B0764" } },
        left: { style: "thin", color: { rgb: "3B0764" } },
        right: { style: "thin", color: { rgb: "3B0764" } }
      }
    };

    // Apply header style to row 0
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // 5. Data Rows Style: Clean typography, subtle borders, alternating row fills
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEven = R % 2 === 0;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        const colKey = colKeys[C];
        const isCenterCol = ['Sl No', 'Rank', 'Batch', 'Session', 'Year', 'Department', 'Total Score', 'Updates Count', 'Evaluation Status', 'Problem Statement ID', 'Room Number'].includes(colKey);

        worksheet[cellAddress].s = {
          fill: isEven ? { fgColor: { rgb: "F8FAFC" } } : { fgColor: { rgb: "FFFFFF" } },
          font: {
            name: "Calibri",
            sz: 10,
            color: { rgb: "1E293B" }
          },
          alignment: {
            vertical: "center",
            horizontal: isCenterCol ? "center" : "left",
            wrapText: false
          },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalName);
};
