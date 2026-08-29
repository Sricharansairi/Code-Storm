export const BATCH_ROOM_MAP: Record<number, string> = {
  1: 'D-013',
  2: 'C-003',
  3: 'C-003',
  4: 'D-013',
  5: 'D-013',
  6: 'C-003'
};

export const BATCH_OPTIONS = [
  { id: 'ALL', label: 'All Batches (Batch 1 to 6)' },
  { id: 'Batch 1', label: 'Batch 1: Day 1 (31st August) - Room D-013' },
  { id: 'Batch 2', label: 'Batch 2: Day 1 (31st August) - Room C-003' },
  { id: 'Batch 3', label: 'Batch 3: Day 2 (1st September) - Room C-003' },
  { id: 'Batch 4', label: 'Batch 4: Day 2 (1st September) - Room D-013' },
  { id: 'Batch 5', label: 'Batch 5: Day 3 (2nd September) - Room D-013' },
  { id: 'Batch 6', label: 'Batch 6: Day 3 (2nd September) - Room C-003' },
];

export const getDayNormalized = (dayStr?: string): string => {
  if (!dayStr) return '31st August';
  const s = String(dayStr).trim();
  if (s.includes('31st') || s.includes('Day 1') || s.includes('August') || s.includes('Aug') || s.includes('31')) return '31st August';
  if (s.includes('1st') || s.includes('Day 2') || s.includes('Sept 1') || s.includes('September 1')) return '1st September';
  if (s.includes('2nd') || s.includes('Day 3') || s.includes('Sept 2') || s.includes('September 2')) return '2nd September';
  return '31st August';
};

export const normalizePS = (str?: string): string => {
  if (!str) return '';
  return String(str).trim().toLowerCase().replace(/\s+/g, '');
};

export const isPSMatch = (id1?: string, id2?: string): boolean => {
  if (!id1 || !id2) return false;
  const n1 = normalizePS(id1);
  const n2 = normalizePS(id2);
  if (n1 === n2) return true;
  const digits1 = n1.replace(/^ps/i, '');
  const digits2 = n2.replace(/^ps/i, '');
  if (digits1 && digits2 && digits1 === digits2) return true;
  return false;
};

export interface TeamSlotInfo {
  day: string;
  dayNum: string;
  isAssigned: boolean;
  isSplit: boolean;
  batchNumber: number;
  batchName: string;
  batch: string;
  badgeLabel: string;
  roomNumber: string;
  pptRoom: string;
  protoRoom: string;
  fnMode: string;
  fnRoom: string;
  anMode: string;
  anRoom: string;
  session: string;
  sessionType: string;
}

export const getTeamSlotInfo = (
  team: any,
  problemStatements: any[] = [],
  allTeams: any[] = []
): TeamSlotInfo => {
  const ps = problemStatements.find(p => isPSMatch(p.id, team.allocated_ps_id));
  const rawDay = team.presentation_day || ps?.presentation_day;

  if (!rawDay) {
    return {
      day: 'Unassigned',
      dayNum: 'Unassigned',
      isAssigned: false,
      isSplit: false,
      batchNumber: 0,
      batchName: 'Unassigned',
      batch: 'Unassigned',
      badgeLabel: 'Unassigned',
      roomNumber: '-',
      pptRoom: '-',
      protoRoom: '-',
      fnMode: '-',
      fnRoom: '-',
      anMode: '-',
      anRoom: '-',
      session: 'Unassigned',
      sessionType: 'Unassigned'
    };
  }

  const normDay = getDayNormalized(rawDay);
  let dayNum = 'Day 1';
  if (normDay === '1st September') {
    dayNum = 'Day 2';
  } else if (normDay === '2nd September') {
    dayNum = 'Day 3';
  }

  // Determine batch grouping
  const psMode = ps?.session || ps?.schedule_track || 'FN';
  let isFirstGroup = true;
  let isSplit = false;

  if (team.schedule_track === 'FN_PROTO_AN_PPT' || team.session === 'AN') {
    isFirstGroup = false;
  } else if (team.schedule_track === 'FN_PPT_AN_PROTO' || team.session === 'FN') {
    isFirstGroup = true;
  } else if (psMode === 'SPLIT' || psMode === 'SPLIT_50_50') {
    isSplit = true;
    const psTeams = (allTeams.length > 0 ? allTeams : [team])
      .filter(t => isPSMatch(t.allocated_ps_id, ps?.id))
      .sort((a, b) => (a.team_name || '').localeCompare(b.team_name || ''));
    const teamIdx = psTeams.findIndex(t => t.id === team.id);
    const halfCount = Math.ceil(psTeams.length / 2);
    isFirstGroup = teamIdx < halfCount;
  } else if (psMode === 'AN' || psMode === 'FN_PROTO_AN_PPT') {
    isFirstGroup = false;
  } else {
    isFirstGroup = true;
  }

  let batchNumber = 1;
  if (dayNum === 'Day 1') {
    batchNumber = isFirstGroup ? 1 : 2;
  } else if (dayNum === 'Day 2') {
    batchNumber = isFirstGroup ? 3 : 4;
  } else if (dayNum === 'Day 3') {
    batchNumber = isFirstGroup ? 5 : 6;
  }

  // Static room allocation - no room swapping, stays in same room all day
  const roomNumber = BATCH_ROOM_MAP[batchNumber] || 'C-003';

  const fnMode = isFirstGroup ? 'PPT Presentation' : 'Prototype Evaluation';
  const anMode = isFirstGroup ? 'Prototype Evaluation' : 'PPT Presentation';

  const batchName = `Batch ${batchNumber}`;
  const batch = `Batch ${batchNumber} (${dayNum} - Room ${roomNumber})`;
  const badgeLabel = `Batch ${batchNumber}: ${dayNum} (Room ${roomNumber})${isSplit ? ' [50/50 Split]' : ''}`;

  return {
    day: normDay,
    dayNum,
    isAssigned: true,
    isSplit,
    batchNumber,
    batchName,
    batch,
    badgeLabel,
    roomNumber,
    pptRoom: roomNumber,
    protoRoom: roomNumber,
    fnMode,
    fnRoom: roomNumber,
    anMode,
    anRoom: roomNumber,
    session: 'FN (09:30 AM) & AN (01:30 PM)',
    sessionType: `FN: ${fnMode} (${roomNumber}) | AN: ${anMode} (${roomNumber})`
  };
};
