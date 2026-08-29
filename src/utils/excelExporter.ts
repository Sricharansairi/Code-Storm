import XLSX from 'xlsx-js-style';

export interface ExportSheetConfig {
  sheetName: string;
  data: any[];
}

/**
 * Intelligent Expected Solutions Knowledge Base for Problem Statements.
 * Matches exact wording and formatting from official SIH problem statement specifications.
 */
export const getExpectedSolutionForPS = (psId?: string, title?: string, description?: string): string => {
  const normId = (psId || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const KNOWLEDGE_BASE: Record<string, string> = {
    'SIH26033': 'Expected Solution: Create a digital marketplace that:\r\n• Connects farmers/FPOs directly with consumers and bulk buyers.\r\n• Provides logistics support.\r\n• Uses AI for demand forecasting and route optimization.Benefits:\r\n• Better prices for farmers. Lower prices for consumers.\r\n• Reduced supply chain inefficiencies.',
    'SIH26047': 'Expected Solution: Create an AI-powered clinical history software platform ("MediKiosk") that:\r\n• Allows patients to record medical histories via natural voice and touchscreen interactions.\r\n• Digitize, OCR, and chronologically organize prior physical medical documentsBenefits:\r\n• Reduced doctor consultation time spent on manual data collection.\r\n• Improved diagnostic accuracy through comprehensive clinical and AYUSH history taking.',
    'SIH26083': 'Expected Solution: Build an intelligent early warning and human thermal stress index platform that:\r\n• Computes advanced Human Thermal Stress and Mortality Risk Indices.\r\n• Integrates temperature, humidity, wind, and solar radiation data for hyper-local predictive forecasts.\r\n• Delivers automated authority alerts and GIS mapping.Benefits:\r\n• Preemptive healthcare deployment and timely public interventions during extreme heatwaves.\r\n• Significant reduction in heat-related morbidity and mortality.',
    'SIH26115': 'Expected Solution: Design and develop an AI-powered autonomous mobile medical-waste collection and segregation system that:\r\n• Automates collection, identification, and segregation of biomedical waste across hospital wards.\r\n• Uses computer vision to classify and isolate waste into dedicated hazard compartments.\r\n• Digitally tracks waste disposal logs and maintains audit trails.Benefits:\r\n• Minimizes human exposure to hazardous pathogens and bio-waste.\r\n• Guarantees 100% regulatory compliance and eliminates manual segregation errors.',
    'SIH26091': 'Expected Solution: Create a multilingual AI-driven hyper-local business advisory and financial structuring assistant that:\r\n• Evaluates local market feasibility and calculates loan/scheme eligibility for rural micro-entrepreneurs.\r\n• Automatically routes users to appropriate government loan schemes (PMEGP, Mudra).\r\n• Generates hyper-local feasibility reports and credit application structures.Benefits:\r\n• Drastically reduces business failure rates among rural micro-enterprises.\r\n• Democratizes access to institutional funding and drives financial inclusion.',
    'SIH26005': 'Expected Solution: Design a solar-powered smart mini cold storage system for fresh vegetables that:\r\n• Provides decentralized, energy-efficient refrigeration with thermal/battery energy storage.\r\n• Integrates IoT environmental monitoring (temperature, humidity, ethylene gas detection).\r\n• Operates reliably in off-grid and remote rural farming areas.Benefits:\r\n• Reduces post-harvest vegetable spoilage from 30%+ to under 5%.\r\n• Extends produce shelf life and maximizes farmer profit margins.',
    'SIH26181': 'Expected Solution: Develop a secure, on-device AI Personal Health Companion that:\r\n• Operates 100% offline on wearables and smartphones for privacy-preserving health monitoring.\r\n• Delivers real-time anomaly detection and early warning alerts for heatwaves, floods, and pollution.\r\n• Provides continuous emergency support during disasters.Benefits:\r\n• Zero cloud privacy risks with localized, on-device health intelligence.\r\n• Proactive health resilience and 24/7 personal safety support.',
    'SIH26135': 'Expected Solution: Build a longitudinal skilling-outcomes and impact-measurement system that:\r\n• Creates consent-based trainee records linked with employment signals and wage data.\r\n• Performs automated follow-ups to track retention, self-employment, and skill progression.\r\n• Generates cohort, course, and demographic analytics to identify skill gaps.Benefits:\r\n• Enhances training provider accountability and placement transparency.\r\n• Empowers policymakers with accurate data for curriculum refinement.'
  };

  for (const key of Object.keys(KNOWLEDGE_BASE)) {
    if (normId.includes(key) || key.includes(normId)) {
      return KNOWLEDGE_BASE[key];
    }
  }

  // Fallback if custom statement
  if (description && description.trim().length > 10) {
    const cleanDesc = description.replace(/^Description:\s*/i, '').trim();
    return `Expected Solution: Develop an end-to-end technological solution addressing:\r\n• ${cleanDesc}\r\nBenefits:\r\n• High operational efficiency, scalability, and measurable socio-economic impact.`;
  }

  return `Expected Solution: Build an end-to-end prototype addressing:\r\n• ${title || 'Stated problem statement requirements.'}\r\nBenefits:\r\n• Measurable efficiency, high usability, and scalable community impact.`;
};

/**
 * Standard Styled Excel Exporter
 */
export const exportStyledExcel = (sheets: ExportSheetConfig[], fileName: string) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Dynamic column widths
    const colKeys = Object.keys(data[0] || {});
    const colWidths = colKeys.map(key => {
      let maxLen = key.toString().length;
      data.forEach(row => {
        const val = row[key] !== undefined && row[key] !== null ? row[key].toString() : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 14), 50) };
    });
    worksheet['!cols'] = colWidths;

    // AutoFilter
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    // Row heights
    const rowHeights: any[] = [{ hpt: 26 }];
    for (let r = 1; r <= data.length; r++) {
      rowHeights.push({ hpt: 20 });
    }
    worksheet['!rows'] = rowHeights;

    // Header Style: Deep Purple (#7030A0), Bold White Text, Centered
    const headerStyle = {
      fill: { fgColor: { rgb: "7030A0" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "592680" } },
        bottom: { style: "thin", color: { rgb: "592680" } },
        left: { style: "thin", color: { rgb: "592680" } },
        right: { style: "thin", color: { rgb: "592680" } }
      }
    };

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // Data rows style
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEven = R % 2 === 0;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        const colKey = colKeys[C];
        const isCenterCol = ['Sl No', 'Rank', 'Batch', 'Session', 'Year', 'Department', 'Total Score', 'Updates Count', 'Evaluation Status', 'Problem Statement ID', 'Room Number', 'TL Mobile'].includes(colKey);

        worksheet[cellAddress].s = {
          fill: isEven ? { fgColor: { rgb: "F8FAFC" } } : { fgColor: { rgb: "FFFFFF" } },
          font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
          alignment: {
            vertical: "center",
            horizontal: isCenterCol ? "center" : "left"
          },
          border: {
            top: { style: "thin", color: { rgb: "D9D9D9" } },
            bottom: { style: "thin", color: { rgb: "D9D9D9" } },
            left: { style: "thin", color: { rgb: "D9D9D9" } },
            right: { style: "thin", color: { rgb: "D9D9D9" } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalName);
};

export interface PanelWiseStatementGroup {
  id: string;
  title: string;
  description?: string;
  expectedSolution?: string;
  roomNumber?: string;
  panelName?: string;
  teams: any[];
}

export interface PanelWiseExportBatchConfig {
  batchName: string;
  statementGroups: PanelWiseStatementGroup[];
  allBatchTeams: any[];
  evaluations: any[];
  getTeamSlotInfo: (team: any) => any;
  getCategoryName: (index: number) => string;
  fileName?: string;
}

/**
 * Generates official Panel-Wise Batch Segregated Excel workbook matching exact format of Batch 1.xlsx / Batch 2.xlsx:
 * 
 * - Sheet 1 (PPT Presentations):
 *    - Row 1: SRI INDU INSTITUTE OF ENGINEERING AND TECHNOLOGY (Steel Blue #366092, Merged A1:I1, Bold Black text, Center)
 *    - Row 2: CODE STROM-2026 (Steel Blue #366092, Merged A2:I2, Bold Black text, Center)
 *    - For each Problem Statement:
 *        - Row 3: [PS_ID]-[PS_TITLE] (Bright Yellow #FFFF00, Merged A3:I3, Bold Black text, Center)
 *        - Row 4: Expected Solution & Benefits (Navy Blue #1F497D, Merged A4:I4, White text, Center/WrapText)
 *        - Row 5: Pannel : (Bright Yellow #FFFF00, Merged A5:I5, Bold Black text, Center)
 *        - Row 6: Column Headers (Deep Purple #7030A0, Bold White text, Centered, with native AutoFilter)
 *        - Rows 7+: Team Details
 * 
 * - Sheet 2 (Prototype Evaluations):
 *    - Full Evaluation sheet with 22 columns, Deep Purple header, AutoFilter, clean bordered data rows.
 */
export const exportPanelWiseBatchExcel = (config: PanelWiseExportBatchConfig) => {
  const {
    batchName,
    statementGroups,
    allBatchTeams,
    evaluations,
    getTeamSlotInfo,
    getCategoryName,
    fileName
  } = config;

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: PPT Presentations (Exact Format)
  // ==========================================
  const pptRowsData: any[][] = [];
  const merges: any[] = [];
  const rowHeights: any[] = [];
  const cellStyleMap: Record<string, any> = {};

  // Styles Definition
  const blueBannerStyle = {
    fill: { fgColor: { rgb: "366092" } },
    font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const blueSubBannerStyle = {
    fill: { fgColor: { rgb: "366092" } },
    font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const yellowTitleStyle = {
    fill: { fgColor: { rgb: "FFFF00" } },
    font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const navySolutionStyle = {
    fill: { fgColor: { rgb: "1F497D" } },
    font: { name: "Calibri", sz: 9.5, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };

  const yellowPanelStyle = {
    fill: { fgColor: { rgb: "FFFF00" } },
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const purpleHeaderStyle = {
    fill: { fgColor: { rgb: "7030A0" } },
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "592680" } },
      bottom: { style: "thin", color: { rgb: "592680" } },
      left: { style: "thin", color: { rgb: "592680" } },
      right: { style: "thin", color: { rgb: "592680" } }
    }
  };

  const dataRowStyle = (isCenter: boolean) => ({
    fill: { fgColor: { rgb: "FFFFFF" } },
    font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
    alignment: { horizontal: isCenter ? "center" : "left", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "D9D9D9" } },
      bottom: { style: "thin", color: { rgb: "D9D9D9" } },
      left: { style: "thin", color: { rgb: "D9D9D9" } },
      right: { style: "thin", color: { rgb: "D9D9D9" } }
    }
  });

  // Row 0: College Header Banner (Steel Blue)
  pptRowsData.push(['SRI INDU INSTITUTE OF ENGINEERING AND TECHNOLOGY']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
  rowHeights.push({ hpt: 28 });
  for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: 0, c })] = blueBannerStyle;

  // Row 1: Event Name Banner (Steel Blue)
  pptRowsData.push(['CODE STROM-2026']);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
  rowHeights.push({ hpt: 24 });
  for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: 1, c })] = blueSubBannerStyle;

  let currentRow = 2;
  let firstHeaderRow = 5;

  statementGroups.forEach((group, groupIdx) => {
    if (groupIdx > 0) {
      // Blank separator row
      pptRowsData.push([]);
      rowHeights.push({ hpt: 16 });
      currentRow++;
    }

    // Problem Statement Title Banner (Bright Yellow)
    const psHeader = `${group.id}-${group.title}`;
    pptRowsData.push([psHeader]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 8 } });
    rowHeights.push({ hpt: 26 });
    for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: currentRow, c })] = yellowTitleStyle;
    currentRow++;

    // Expected Solution & Benefits (Navy Blue)
    const expSol = group.expectedSolution || getExpectedSolutionForPS(group.id, group.title, group.description);
    pptRowsData.push([expSol]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 8 } });
    rowHeights.push({ hpt: 72 });
    for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: currentRow, c })] = navySolutionStyle;
    currentRow++;

    // Panel Row (Bright Yellow)
    const panelText = group.panelName && group.panelName !== 'PPT: C-002 | Proto: D-013' ? `Pannel : ${group.panelName}` : 'Pannel : ';
    pptRowsData.push([panelText]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 8 } });
    rowHeights.push({ hpt: 22 });
    for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: currentRow, c })] = yellowPanelStyle;
    currentRow++;

    // Column Headers (Deep Purple)
    if (groupIdx === 0) firstHeaderRow = currentRow;
    const headers = [
      'Sl No',
      'Team Name',
      'Presentation Day',
      'Room Number',
      'TL Name',
      'TL Mobile',
      'Department',
      'Year',
      'Team Members'
    ];
    pptRowsData.push(headers);
    rowHeights.push({ hpt: 24 });
    for (let c = 0; c < 9; c++) cellStyleMap[XLSX.utils.encode_cell({ r: currentRow, c })] = purpleHeaderStyle;
    currentRow++;

    // Data Rows
    group.teams.forEach((team, teamIdx) => {
      const slot = getTeamSlotInfo(team);
      const row = [
        teamIdx + 1,
        team.team_name,
        slot.day || '31st August',
        slot.roomNumber || 'PPT: C-002 | Proto: D-013',
        team.tl_name || '-',
        team.tl_mobile || '-',
        team.tl_department || '-',
        team.tl_year || '-',
        (team.members || []).join(', ') || '-'
      ];
      pptRowsData.push(row);
      rowHeights.push({ hpt: 20 });

      for (let c = 0; c < 9; c++) {
        const isCenter = [0, 2, 3, 5, 6, 7].includes(c); // Sl No, Day, Room, Mobile, Dept, Year
        cellStyleMap[XLSX.utils.encode_cell({ r: currentRow, c })] = dataRowStyle(isCenter);
      }
      currentRow++;
    });
  });

  const pptWorksheet = XLSX.utils.aoa_to_sheet(pptRowsData);
  pptWorksheet['!merges'] = merges;
  pptWorksheet['!rows'] = rowHeights;

  // Generous column widths (Sl No, Team Name, Presentation Day, Room Number, TL Name, TL Mobile, Department, Year, Team Members)
  pptWorksheet['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 24 }, // Team Name
    { wch: 18 }, // Presentation Day
    { wch: 28 }, // Room Number
    { wch: 24 }, // TL Name
    { wch: 16 }, // TL Mobile
    { wch: 16 }, // Department
    { wch: 10 }, // Year
    { wch: 55 }  // Team Members
  ];

  // Set AutoFilter on the first table headers
  pptWorksheet['!autofilter'] = { ref: `A${firstHeaderRow + 1}:I${currentRow}` };

  // Apply cell styles
  for (const cellKey in cellStyleMap) {
    if (pptWorksheet[cellKey]) {
      pptWorksheet[cellKey].s = cellStyleMap[cellKey];
    }
  }

  XLSX.utils.book_append_sheet(workbook, pptWorksheet, 'PPT Presentations');

  // ==========================================
  // SHEET 2: Prototype Evaluations (Exact Format)
  // ==========================================
  const protoData = allBatchTeams.map((team, index) => {
    const slot = getTeamSlotInfo(team);
    const evalData = evaluations.find(e => e.team_id === team.id);
    const matchedGroup = statementGroups.find(g => team.allocated_ps_id && (g.id === team.allocated_ps_id || g.id.includes(team.allocated_ps_id) || team.allocated_ps_id.includes(g.id)));

    return {
      'Sl No': index + 1,
      'Batch': slot.batch || batchName,
      'Presentation Day': slot.day || '31st August',
      'Session': slot.batch?.includes('AN') || slot.batch?.includes('Track B') ? 'Morning (FN) - 09:30 AM' : 'Afternoon (AN) - 01:30 PM',
      'Evaluation Round': 'Prototype Evaluation',
      'Room Number': slot.roomNumber || 'PPT: C-002 | Proto: D-013',
      'Team Name': team.team_name,
      'TL Name': team.tl_name || '-',
      'TL Email': team.tl_email,
      'TL Mobile': team.tl_mobile || '-',
      'Department': team.tl_department || '-',
      'Year': team.tl_year || '-',
      'Problem Statement ID': matchedGroup?.id || team.allocated_ps_id || '-',
      'Problem Statement Title': matchedGroup?.title || '-',
      'Team Members': (team.members || []).join(', ') || '-',
      [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
      [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
      [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
      [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
      'Total Score': evalData ? evalData.total_score : '-',
      'Evaluation Status': evalData ? 'Evaluated' : 'Pending',
      'Evaluated By': evalData ? evalData.evaluated_by : '-'
    };
  });

  const protoWorksheet = XLSX.utils.json_to_sheet(protoData);

  // Column widths for Sheet 2
  const protoKeys = Object.keys(protoData[0] || {});
  const protoWidths = protoKeys.map(key => {
    let maxLen = key.toString().length;
    protoData.forEach(row => {
      const val = (row as any)[key] !== undefined && (row as any)[key] !== null ? (row as any)[key].toString() : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 50) };
  });
  protoWorksheet['!cols'] = protoWidths;

  // AutoFilter for Sheet 2
  const protoRange = XLSX.utils.decode_range(protoWorksheet['!ref'] || 'A1:A1');
  protoWorksheet['!autofilter'] = { ref: XLSX.utils.encode_range(protoRange) };

  // Styling for Sheet 2 Headers (Deep Purple #7030A0)
  for (let C = protoRange.s.c; C <= protoRange.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (protoWorksheet[cellAddress]) {
      protoWorksheet[cellAddress].s = purpleHeaderStyle;
    }
  }

  // Styling for Sheet 2 Data Rows
  for (let R = protoRange.s.r + 1; R <= protoRange.e.r; ++R) {
    const isEven = R % 2 === 0;
    for (let C = protoRange.s.c; C <= protoRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!protoWorksheet[cellAddress]) continue;

      const colKey = protoKeys[C];
      const isCenter = ['Sl No', 'Batch', 'Session', 'Year', 'Department', 'Total Score', 'Evaluation Status', 'Problem Statement ID', 'Room Number', 'TL Mobile'].includes(colKey);

      protoWorksheet[cellAddress].s = {
        fill: isEven ? { fgColor: { rgb: "F8FAFC" } } : { fgColor: { rgb: "FFFFFF" } },
        font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
        alignment: { vertical: "center", horizontal: isCenter ? "center" : "left" },
        border: {
          top: { style: "thin", color: { rgb: "D9D9D9" } },
          bottom: { style: "thin", color: { rgb: "D9D9D9" } },
          left: { style: "thin", color: { rgb: "D9D9D9" } },
          right: { style: "thin", color: { rgb: "D9D9D9" } }
        }
      };
    }
  }

  XLSX.utils.book_append_sheet(workbook, protoWorksheet, 'Prototype Evaluations');

  // Save Workbook
  const finalFilename = fileName || (batchName === 'ALL' || batchName === 'All' ? 'All Batches.xlsx' : `${batchName}.xlsx`);
  const safeName = finalFilename.endsWith('.xlsx') ? finalFilename : `${finalFilename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
};
