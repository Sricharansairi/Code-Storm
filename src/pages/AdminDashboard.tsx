// @ts-nocheck
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Users, Settings, Database, Filter, X, Trash2, Plus, Edit2, LayoutDashboard, Clock, Trophy, Award, Search, Medal, CheckCircle2, Star, Sparkles, Lock, Unlock, Layers, ShieldCheck, FileCheck, Eye, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportStyledExcel, exportPanelWiseBatchExcel, getExpectedSolutionForPS } from '../utils/excelExporter';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

interface AdminDashboardProps {
  session: Session;
}

export default function AdminDashboard({ session }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'settings' | 'evaluations' | 'leaderboard' | 'shortlisted' | 'certificates' | 'logistics'>('dashboard');

  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, allocated: 0, popular: '-' });

  // Leaderboard Filter States
  const [leaderboardBatch, setLeaderboardBatch] = useState('All');
  const [leaderboardStatus, setLeaderboardStatus] = useState('All');
  const [leaderboardPS, setLeaderboardPS] = useState('All');
  const [leaderboardDept, setLeaderboardDept] = useState('All');
  const [leaderboardYear, setLeaderboardYear] = useState('All');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Shortlisted Tab Filter States
  const [shortlistBatch, setShortlistBatch] = useState('All');
  const [shortlistPS, setShortlistPS] = useState('All');
  const [shortlistDept, setShortlistDept] = useState('All');
  const [shortlistSearch, setShortlistSearch] = useState('');

  // Evaluation States
  const [evalSettings, setEvalSettings] = useState<any>({ categories: [{ id: 'cat1', name: 'Innovation' }, { id: 'cat2', name: 'Feasibility' }, { id: 'cat3', name: 'Presentation' }, { id: 'cat4', name: 'Technicality' }], maxMarks: 100 });
  const [evaluations, setEvaluations] = useState<any[]>([]);

  // Coordinators States
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [logisticsDay, setLogisticsDay] = useState('31st August');

  const fetchCoordinators = async () => {
    try {
      const { data, error } = await supabase.from('room_coordinators').select('*');
      if (data && !error) setCoordinators(data);
    } catch (e) {
      console.error("Error fetching room coordinators:", e);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const BATCH_OPTIONS = [
    { id: 'ALL', label: 'All Batches (Batch 1 to 6)' },
    { id: 'Batch 1', label: 'Batch 1: Day 1 (31st August) - Room D-013' },
    { id: 'Batch 2', label: 'Batch 2: Day 1 (31st August) - Room C-003' },
    { id: 'Batch 3', label: 'Batch 3: Day 2 (1st September) - Room C-003' },
    { id: 'Batch 4', label: 'Batch 4: Day 2 (1st September) - Room D-013' },
    { id: 'Batch 5', label: 'Batch 5: Day 3 (2nd September) - Room D-013' },
    { id: 'Batch 6', label: 'Batch 6: Day 3 (2nd September) - Room C-003' },
  ];

  const BATCH_ROOM_MAP: Record<number, string> = {
    1: 'D-013',
    2: 'C-003',
    3: 'C-003',
    4: 'D-013',
    5: 'D-013',
    6: 'C-003'
  };

  const getDayNormalized = (dayStr?: string) => {
    if (!dayStr) return '31st August';
    const s = String(dayStr).trim();
    if (s.includes('31st') || s.includes('Day 1') || s.includes('August') || s.includes('Aug') || s.includes('31')) return '31st August';
    if (s.includes('1st') || s.includes('Day 2') || s.includes('Sept 1') || s.includes('September 1')) return '1st September';
    if (s.includes('2nd') || s.includes('Day 3') || s.includes('Sept 2') || s.includes('September 2')) return '2nd September';
    return '31st August';
  };

  const getBatchFromDaySession = (day?: string, session: string = 'FN') => {
    const normDay = getDayNormalized(day);
    let dayNum = 'Day 1';
    let batchNum = session === 'AN' ? 'Batch 2' : 'Batch 1';
    if (normDay === '1st September') {
      dayNum = 'Day 2';
      batchNum = session === 'AN' ? 'Batch 4' : 'Batch 3';
    } else if (normDay === '2nd September') {
      dayNum = 'Day 3';
      batchNum = session === 'AN' ? 'Batch 6' : 'Batch 5';
    }
    return `${batchNum} (${dayNum})`;
  };

  const normalizePS = (str?: string) => {
    if (!str) return '';
    return String(str).trim().toLowerCase().replace(/\s+/g, '');
  };

  const isPSMatch = (id1?: string, id2?: string) => {
    if (!id1 || !id2) return false;
    const n1 = normalizePS(id1);
    const n2 = normalizePS(id2);
    if (n1 === n2) return true;
    const digits1 = n1.replace(/^ps/i, '');
    const digits2 = n2.replace(/^ps/i, '');
    if (digits1 && digits2 && digits1 === digits2) return true;
    return false;
  };

  const getTeamSlotInfo = (team: any) => {
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
        pptRoom: '-',
        protoRoom: '-',
        fnMode: '-',
        fnRoom: '-',
        anMode: '-',
        anRoom: '-',
        session: 'Unassigned',
        sessionType: 'Unassigned',
        roomNumber: '-'
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
      const psTeams = teams
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

    // Static room allocation: Batch 1: D-013, Batch 2: C-003, Batch 3: C-003, Batch 4: D-013, Batch 5: D-013, Batch 6: C-003
    const roomNumber = BATCH_ROOM_MAP[batchNumber] || (isFirstGroup ? 'D-013' : 'C-003');

    const fnMode = isFirstGroup ? 'PPT' : 'Prototype';
    const anMode = isFirstGroup ? 'Prototype' : 'PPT';

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
      pptRoom: roomNumber,
      protoRoom: roomNumber,
      fnMode,
      fnRoom: roomNumber,
      anMode,
      anRoom: roomNumber,
      session: 'FN (09:30 AM) & AN (01:30 PM)',
      sessionType: `FN: ${fnMode} (${roomNumber}) | AN: ${anMode} (${roomNumber})`,
      roomNumber
    };
  };

  const [evalFilterPS, setEvalFilterPS] = useState('All');
  const [evalFilterDay, setEvalFilterDay] = useState('All');
  const [evalFilterBatch, setEvalFilterBatch] = useState('All');
  const [evalFilterStatus, setEvalFilterStatus] = useState('All');
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [teamToEvaluate, setTeamToEvaluate] = useState<any>(null);
  const [evalScores, setEvalScores] = useState<Record<string, string | number>>({});
  const [savingEval, setSavingEval] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Team Slot Edit States (in Team Details Modal)
  const [slotBatch, setSlotBatch] = useState('Day 1 - FN');
  const [slotDay, setSlotDay] = useState('31st August');
  const [slotSession, setSlotSession] = useState('FN');
  const [slotSessionType, setSlotSessionType] = useState('PPT');
  const [savingSlot, setSavingSlot] = useState(false);

  // Certificate Generator States & Filtered Evaluated Teams (5 Members, Single Great Vibes Font)
  const [certSelectedTeamId, setCertSelectedTeamId] = useState<string>('');
  const [certMembers, setCertMembers] = useState<{ role: string; name: string }[]>([
    { role: 'Team Leader', name: 'Sri Charan' },
    { role: 'Member 1', name: 'Member 1' },
    { role: 'Member 2', name: 'Member 2' },
    { role: 'Member 3', name: 'Member 3' },
    { role: 'Member 4', name: 'Member 4' },
  ]);
  const [certPreviews, setCertPreviews] = useState<string[]>([]);
  const [certLoadingPreviews, setCertLoadingPreviews] = useState<boolean>(false);
  const [certGenerating, setCertGenerating] = useState<boolean>(false);
  const [certStatusMessage, setCertStatusMessage] = useState<string>('');
  const [zoomCertIndex, setZoomCertIndex] = useState<number | null>(null);
  const [certViewMode, setCertViewMode] = useState<'preview' | 'audit'>('preview');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'evaluated' | 'non_evaluated' | 'non_eval_granted' | 'downloaded' | 'pending'>('all');

  // Helper to check if a team has completed evaluation
  const isTeamEvaluated = (teamId: string) => {
    const evalData = evaluations.find(e => e.team_id === teamId);
    const isAbsent = Boolean(evalData?.scores?.is_absent || evalData?.is_absent);
    return Boolean(evalData && !isAbsent && evalData.total_score !== null && evalData.total_score !== undefined);
  };

  // Filter ONLY evaluated teams (not absent, has valid evaluation score)
  const evaluatedTeams = useMemo(() => {
    return teams.filter(t => isTeamEvaluated(t.id));
  }, [teams, evaluations]);

  // Filter teams for Certificate Download Status Tracker (Covers ALL teams, allowing access management for non-evaluated teams)
  const filteredAuditTeams = useMemo(() => {
    return teams.filter(t => {
      const evalData = evaluations.find(e => e.team_id === t.id);
      const isEval = isTeamEvaluated(t.id);
      let sc = evalData?.scores || {};
      if (typeof sc === 'string') {
        try { sc = JSON.parse(sc); } catch { sc = {}; }
      }
      const isDownloaded = Boolean(sc.certificate_downloaded);
      const isGrantedForNonEval = Boolean(sc.certificate_access_granted);

      if (auditFilter === 'evaluated' && !isEval) return false;
      if (auditFilter === 'non_evaluated' && isEval) return false;
      if (auditFilter === 'non_eval_granted' && (isEval || !isGrantedForNonEval)) return false;
      if (auditFilter === 'downloaded' && !isDownloaded) return false;
      if (auditFilter === 'pending' && isDownloaded) return false;

      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchName = t.team_name?.toLowerCase().includes(q);
        const matchEmail = t.tl_email?.toLowerCase().includes(q);
        const matchTL = t.tl_name?.toLowerCase().includes(q);
        const matchPS = t.allocated_ps_id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTL && !matchPS) return false;
      }
      return true;
    });
  }, [teams, auditFilter, auditSearch, evaluations]);

  // When team selection changes, populate all 5 member slots
  const handleSelectCertTeam = (teamId: string) => {
    setCertSelectedTeamId(teamId);
    if (!teamId) {
      setCertMembers([
        { role: 'Team Leader', name: 'Sri Charan' },
        { role: 'Member 1', name: 'Member 1' },
        { role: 'Member 2', name: 'Member 2' },
        { role: 'Member 3', name: 'Member 3' },
        { role: 'Member 4', name: 'Member 4' },
      ]);
      return;
    }
    const team = evaluatedTeams.find(t => t.id === teamId) || teams.find(t => t.id === teamId);
    if (team) {
      setCertMembers([
        { role: 'Team Leader', name: team.tl_name || 'Team Leader' },
        { role: 'Member 1', name: team.members?.[0] || 'Member 1' },
        { role: 'Member 2', name: team.members?.[1] || 'Member 2' },
        { role: 'Member 3', name: team.members?.[2] || 'Member 3' },
        { role: 'Member 4', name: team.members?.[3] || 'Member 4' },
      ]);
    }
  };

  // Auto-select the first evaluated team on load so 5 certificates immediately autofill
  useEffect(() => {
    if (activeTab === 'certificates' && evaluatedTeams.length > 0) {
      if (!certSelectedTeamId || !evaluatedTeams.some(t => t.id === certSelectedTeamId)) {
        handleSelectCertTeam(evaluatedTeams[0].id);
      }
    }
  }, [activeTab, evaluatedTeams, certSelectedTeamId]);

  const handleUpdateMemberName = (index: number, newName: string) => {
    setCertMembers(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], name: newName };
      }
      return copy;
    });
  };

  // Preload and cache template image without CORS issues for same-origin
  const certTemplateImgRef = useRef<HTMLImageElement | null>(null);
  const certTemplateLoadPromiseRef = useRef<Promise<HTMLImageElement> | null>(null);

  const getCertTemplateImage = (): Promise<HTMLImageElement> => {
    if (certTemplateImgRef.current && certTemplateImgRef.current.complete && certTemplateImgRef.current.naturalWidth > 0) {
      return Promise.resolve(certTemplateImgRef.current);
    }
    if (certTemplateLoadPromiseRef.current) {
      return certTemplateLoadPromiseRef.current;
    }
    certTemplateLoadPromiseRef.current = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        certTemplateImgRef.current = img;
        resolve(img);
      };
      img.onerror = (e) => {
        certTemplateLoadPromiseRef.current = null;
        console.error("Certificate template load error:", e);
        reject(e);
      };
      img.src = '/certificate_template.png';
    });
    return certTemplateLoadPromiseRef.current;
  };

  // Render certificate using the single official cursive font: Great Vibes
  const renderCertificateToCanvas = async (name: string): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 3300;
    canvas.height = 2550;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const img = await getCertTemplateImage();
    ctx.drawImage(img, 0, 0, 3300, 2550);

    try {
      await document.fonts.ready;
      await document.fonts.load('190px "Great Vibes"');
    } catch (_) {}

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Single official font: Great Vibes cursive (300 DPI high resolution)
    let effSize = 190;
    ctx.font = `${effSize}px "Great Vibes", cursive, serif`;
    let textWidth = ctx.measureText(name).width;
    const maxWidth = 1850;
    if (textWidth > maxWidth) {
      effSize = Math.floor(effSize * (maxWidth / textWidth));
      ctx.font = `${effSize}px "Great Vibes", cursive, serif`;
    }

    // Baseline centered at X=1650, Y=1515 directly above underline
    ctx.fillText(name, 1650, 1515);
    return canvas;
  };

  // Auto-generate live previews for all 5 certificates
  useEffect(() => {
    if (activeTab !== 'certificates') return;
    let isCancelled = false;
    setCertLoadingPreviews(true);

    const generateAllPreviews = async () => {
      try {
        const urls: string[] = [];
        for (let i = 0; i < certMembers.length; i++) {
          const m = certMembers[i];
          const canvas = await renderCertificateToCanvas(m.name || m.role);
          urls.push(canvas.toDataURL('image/png'));
        }
        if (!isCancelled) {
          setCertPreviews(urls);
          setCertLoadingPreviews(false);
        }
      } catch (err) {
        console.error("Failed to generate cert previews:", err);
        if (!isCancelled) setCertLoadingPreviews(false);
      }
    };

    const timer = setTimeout(generateAllPreviews, 80);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, certMembers]);

  // Download Single 300 DPI PNG
  const handleDownloadSingleCertPNG = async (name: string, role: string) => {
    const trimmed = (name || role).trim();
    setCertGenerating(true);
    setCertStatusMessage(`Generating 300 DPI high-res PNG for ${trimmed}...`);
    try {
      const canvas = await renderCertificateToCanvas(trimmed);
      const link = document.createElement('a');
      link.download = `CodeStorm2026_Certificate_${trimmed.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setCertStatusMessage(`Downloaded certificate PNG for ${trimmed}`);
    } catch (err: any) {
      alert("Error generating PNG: " + err.message);
    } finally {
      setCertGenerating(false);
      setTimeout(() => setCertStatusMessage(''), 3500);
    }
  };

  // Download Single PDF
  const handleDownloadSingleCertPDF = async (name: string, role: string) => {
    const trimmed = (name || role).trim();
    setCertGenerating(true);
    setCertStatusMessage(`Generating official PDF for ${trimmed}...`);
    try {
      const canvas = await renderCertificateToCanvas(trimmed);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [3300, 2550]
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 3300, 2550);
      pdf.save(`CodeStorm2026_Certificate_${trimmed.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      setCertStatusMessage(`Downloaded certificate PDF for ${trimmed}`);
    } catch (err: any) {
      alert("Error generating PDF: " + err.message);
    } finally {
      setCertGenerating(false);
      setTimeout(() => setCertStatusMessage(''), 3500);
    }
  };

  // Download All Team Certificates as Individual Files in a ZIP (PDF or PNG)
  const handleDownloadAllTeamCertificates = async (format: 'pdf' | 'png') => {
    if (certMembers.length === 0) return;
    setCertGenerating(true);
    setCertStatusMessage(`Generating 5 individual ${format.toUpperCase()} certificates (300 DPI)...`);
    try {
      const zip = new JSZip();
      const team = evaluatedTeams.find(t => t.id === certSelectedTeamId) || teams.find(t => t.id === certSelectedTeamId);
      const teamLabel = team?.team_name ? team.team_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Team';

      for (let i = 0; i < certMembers.length; i++) {
        const m = certMembers[i];
        const memName = (m.name || m.role).trim();
        const roleLabel = i === 0 ? 'Team_Leader' : `Member_${i}`;
        const safeName = memName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filenameBase = `${i + 1}_${roleLabel}_${safeName}`;

        const canvas = await renderCertificateToCanvas(memName);

        if (format === 'pdf') {
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [3300, 2550]
          });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 3300, 2550, undefined, 'FAST');
          const pdfArrayBuffer = pdf.output('arraybuffer');
          zip.file(`${filenameBase}.pdf`, pdfArrayBuffer);
        } else {
          const pngDataUrl = canvas.toDataURL('image/png');
          const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
          zip.file(`${filenameBase}.png`, base64Data, { base64: true });
        }
      }

      setCertStatusMessage(`Compressing individual ${format.toUpperCase()} certificates into zip...`);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CodeStorm2026_Individual_${format.toUpperCase()}_Certificates_${teamLabel}.zip`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setCertStatusMessage(`Successfully downloaded 5 individual ${format.toUpperCase()} certificates!`);
    } catch (err: any) {
      alert("Error generating batch certificates: " + err.message);
    } finally {
      setCertGenerating(false);
      setTimeout(() => setCertStatusMessage(''), 4500);
    }
  };

  // Helper to extract team download status
  const getTeamDownloadStatus = (teamId: string) => {
    const evalData = evaluations.find(e => e.team_id === teamId);
    const isEval = isTeamEvaluated(teamId);
    let sc = evalData?.scores || {};
    if (typeof sc === 'string') {
      try { sc = JSON.parse(sc); } catch { sc = {}; }
    }
    const explicitGrant = Boolean(sc.certificate_access_granted);
    return {
      downloaded: Boolean(sc.certificate_downloaded),
      at: sc.certificate_downloaded_at ? new Date(sc.certificate_downloaded_at).toLocaleString() : null,
      by: sc.certificate_downloaded_by || null,
      format: (sc.certificate_download_format || 'pdf').toUpperCase(),
      count: sc.certificate_download_count || 0,
      isEvaluated: isEval,
      // Evaluated teams are automatically authorized! Non-evaluated teams are authorized if admin gave access!
      accessGranted: isEval || explicitGrant,
      explicitGrant
    };
  };

  // Admin action to toggle certificate download access for a non-evaluated team
  const handleToggleTeamAccess = async (teamId: string, currentExplicitGrant: boolean) => {
    const evalData = evaluations.find(e => e.team_id === teamId);
    let sc = evalData?.scores || {};
    if (typeof sc === 'string') {
      try { sc = JSON.parse(sc); } catch { sc = {}; }
    }
    const newAccess = !currentExplicitGrant;
    const updated = {
      ...sc,
      certificate_access_granted: newAccess
    };

    const payload = {
      team_id: teamId,
      cat1_score: evalData?.cat1_score || 0,
      cat2_score: evalData?.cat2_score || 0,
      cat3_score: evalData?.cat3_score || 0,
      cat4_score: evalData?.cat4_score || 0,
      total_score: evalData?.total_score ?? null,
      scores: updated,
      evaluated_by: evalData?.evaluated_by || session.user.email,
      update_count: evalData ? (evalData.update_count || 0) + 1 : 1,
      evaluated_at: evalData?.evaluated_at || new Date().toISOString()
    };

    const { error } = await supabase
      .from('evaluations')
      .upsert(payload, { onConflict: 'team_id' });

    if (error) {
      alert("Error updating team access: " + error.message);
    } else {
      setEvaluations(prev => {
        const idx = prev.findIndex(e => e.team_id === teamId);
        if (idx >= 0) {
          return prev.map(e => e.team_id === teamId ? { ...e, scores: updated } : e);
        } else {
          return [...prev, payload];
        }
      });
      setCertStatusMessage(`Certificate download access ${newAccess ? 'GRANTED' : 'LOCKED'} for non-evaluated team!`);
      setTimeout(() => setCertStatusMessage(''), 3000);
    }
  };

  // Admin action to grant access to ALL NON-EVALUATED teams
  const handleGrantNonEvaluatedAccess = async () => {
    const nonEvalTeams = teams.filter(t => !isTeamEvaluated(t.id));
    if (!confirm(`Grant certificate download access to ALL ${nonEvalTeams.length} NON-EVALUATED teams?`)) return;
    setCertGenerating(true);
    setCertStatusMessage('Granting download access to non-evaluated teams...');
    try {
      for (const t of nonEvalTeams) {
        const evalData = evaluations.find(e => e.team_id === t.id);
        let sc = evalData?.scores || {};
        if (typeof sc === 'string') {
          try { sc = JSON.parse(sc); } catch { sc = {}; }
        }
        sc.certificate_access_granted = true;
        await supabase.from('evaluations').upsert({
          team_id: t.id,
          cat1_score: evalData?.cat1_score || 0,
          cat2_score: evalData?.cat2_score || 0,
          cat3_score: evalData?.cat3_score || 0,
          cat4_score: evalData?.cat4_score || 0,
          total_score: evalData?.total_score ?? null,
          scores: sc,
          evaluated_by: evalData?.evaluated_by || session.user.email,
          update_count: evalData ? (evalData.update_count || 0) + 1 : 1,
          evaluated_at: evalData?.evaluated_at || new Date().toISOString()
        }, { onConflict: 'team_id' });
      }
      await fetchEvalData();
      setCertStatusMessage('Successfully granted download access to ALL non-evaluated teams!');
    } catch (err: any) {
      alert('Error granting access: ' + err.message);
    } finally {
      setCertGenerating(false);
      setTimeout(() => setCertStatusMessage(''), 4000);
    }
  };

  // Admin action to lock/revoke access for ALL NON-EVALUATED teams
  const handleRevokeNonEvaluatedAccess = async () => {
    const nonEvalTeams = teams.filter(t => !isTeamEvaluated(t.id));
    if (!confirm(`Lock certificate download access for ALL ${nonEvalTeams.length} NON-EVALUATED teams?`)) return;
    setCertGenerating(true);
    setCertStatusMessage('Locking download access for non-evaluated teams...');
    try {
      for (const t of nonEvalTeams) {
        const evalData = evaluations.find(e => e.team_id === t.id);
        let sc = evalData?.scores || {};
        if (typeof sc === 'string') {
          try { sc = JSON.parse(sc); } catch { sc = {}; }
        }
        sc.certificate_access_granted = false;
        await supabase.from('evaluations').upsert({
          team_id: t.id,
          cat1_score: evalData?.cat1_score || 0,
          cat2_score: evalData?.cat2_score || 0,
          cat3_score: evalData?.cat3_score || 0,
          cat4_score: evalData?.cat4_score || 0,
          total_score: evalData?.total_score ?? null,
          scores: sc,
          evaluated_by: evalData?.evaluated_by || session.user.email,
          update_count: evalData ? (evalData.update_count || 0) + 1 : 1,
          evaluated_at: evalData?.evaluated_at || new Date().toISOString()
        }, { onConflict: 'team_id' });
      }
      await fetchEvalData();
      setCertStatusMessage('Successfully locked access for all non-evaluated teams!');
    } catch (err: any) {
      alert('Error revoking access: ' + err.message);
    } finally {
      setCertGenerating(false);
      setTimeout(() => setCertStatusMessage(''), 4000);
    }
  };

  // Admin action to reset download limit for a team
  const handleResetDownloadLimit = async (teamId: string) => {
    const evalData = evaluations.find(e => e.team_id === teamId);
    if (!evalData) return;
    let sc = evalData.scores || {};
    if (typeof sc === 'string') {
      try { sc = JSON.parse(sc); } catch { sc = {}; }
    }
    const updated = {
      ...sc,
      certificate_downloaded: false,
      certificate_downloaded_at: null
    };
    const { error } = await supabase
      .from('evaluations')
      .update({ scores: updated })
      .eq('team_id', teamId);

    if (error) {
      alert("Error resetting download limit: " + error.message);
    } else {
      setEvaluations(prev => prev.map(e => e.team_id === teamId ? { ...e, scores: updated } : e));
      setCertStatusMessage("Download limit successfully reset for team!");
      setTimeout(() => setCertStatusMessage(''), 3000);
    }
  };

  const fetchEvalData = async () => {
    try {
      const { data: settingsList } = await supabase.from('evaluation_settings').select('*').order('updated_at', { ascending: false }).limit(1);
      const settings = settingsList?.[0];
      if (settings) {
        let cats = settings.categories;
        if (!cats || !Array.isArray(cats) || cats.length === 0) {
          cats = [
            { id: 'cat1', name: settings.category_1 || 'Innovation' },
            { id: 'cat2', name: settings.category_2 || 'Feasibility' },
            { id: 'cat3', name: settings.category_3 || 'Presentation' },
            { id: 'cat4', name: settings.category_4 || 'Technicality' }
          ];
        }
        setEvalSettings({
          ...settings,
          categories: cats
        });
      }
      const { data: evals } = await supabase.from('evaluations').select('*');
      if (evals) setEvaluations(evals);
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryName = (index: number) => {
    if (evalSettings?.categories && Array.isArray(evalSettings.categories) && evalSettings.categories[index]?.name) {
      return evalSettings.categories[index].name;
    }
    const key = `category_${index + 1}`;
    if (evalSettings && evalSettings[key]) {
      return evalSettings[key];
    }
    const defaults = ['Innovation', 'Feasibility', 'Presentation', 'Technicality'];
    return defaults[index] || `Category ${index + 1}`;
  };

  useEffect(() => {
    fetchEvalData();
  }, []);


  // Filter States
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterPS, setFilterPS] = useState('All');

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  useEffect(() => {
    if (selectedTeam) {
      const slot = getTeamSlotInfo(selectedTeam);
      setSlotBatch(slot.batch);
      setSlotDay(slot.day);
      setSlotSession(slot.session);
      setSlotSessionType(slot.sessionType);
    }
  }, [selectedTeam]);

  // Settings States
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [newPS, setNewPS] = useState({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17, batch: '', presentation_day: '', session: 'FN', session_type: 'PPT', room_number: '' });
  const [editingPSId, setEditingPSId] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' });
  
  // Custom Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'delete' | 'add' | 'edit-team' | 'delete-team' | null>(null);
  const [modalPS, setModalPS] = useState<any>({ batch: '', presentation_day: '31st August', session: 'FN', session_type: 'PPT', room_number: '' });
  const [modalCode, setModalCode] = useState('');
  const [modalError, setModalError] = useState('');
  const [newTeam, setNewTeam] = useState({ team_name: '', tl_email: '' });
  
  // Visitor Tracking States
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [revokeAdminEmail, setRevokeAdminEmail] = useState<string | null>(null);
  const [visitorData, setVisitorData] = useState<{
    admins: { email: string; last_visited_at?: string | null }[];
    knownLeaders: {
      id: string;
      team_name: string;
      tl_name: string;
      tl_email: string;
      tl_mobile: string;
      tl_department?: string;
      tl_year?: string;
      visited: boolean;
      last_visited_at?: string | null;
    }[];
    unknownVisitors: { email: string; last_visited_at?: string | null }[];
  }>({ admins: [], knownLeaders: [], unknownVisitors: [] });
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [knownFilter, setKnownFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [knownSearch, setKnownSearch] = useState('');
  const [visitorTab, setVisitorTab] = useState<'LEADERS' | 'ADMINS' | 'UNKNOWN'>('LEADERS');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
    fetchProblemStatements();
  }, []);

  const handleRevokeAdmin = async (emailToRevoke: string) => {
    if (emailToRevoke === session?.user?.email) {
      alert("You cannot revoke your own admin account.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to revoke admin access for ${emailToRevoke}?`);
    if (!confirmed) return;
    
    try {
      const { error } = await supabase.from('admins').delete().eq('email', emailToRevoke);
      if (error) {
        alert("Failed to revoke admin: " + error.message);
      } else {
        alert(`Admin access revoked for ${emailToRevoke}`);
        fetchVisitors();
      }
    } catch (err: any) {
      alert("Error revoking admin: " + err.message);
    }
  };

  const formatVisitTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Not Visited Yet';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const fetchVisitors = async () => {
    setLoadingVisitors(true);
    try {
      // 1. Fetch admins
      const { data: admins } = await supabase.from('admins').select('email');
      const adminEmails = (admins || []).map(a => (a.email || '').toLowerCase().trim());

      // 2. Fetch site visits
      const { data: visits } = await supabase.from('site_visits').select('email, last_visited_at').order('last_visited_at', { ascending: false });
      
      // 3. Fetch all teams / team leaders
      const { data: teamsData } = await supabase.from('teams').select('id, team_name, tl_name, tl_email, tl_mobile, tl_department, tl_year');
      
      // Build a map of visits with timestamp (email -> last_visited_at)
      const visitMap = new Map<string, string>();
      (visits || []).forEach((v: any) => {
        if (v.email) {
          const em = v.email.toLowerCase().trim();
          if (!visitMap.has(em) || new Date(v.last_visited_at) > new Date(visitMap.get(em)!)) {
            visitMap.set(em, v.last_visited_at);
          }
        }
      });

      // Known visitors = Team Leaders
      const teamLeadersList = (teamsData || []).map((t: any) => {
        const email = (t.tl_email || '').toLowerCase().trim();
        const visitedAt = visitMap.get(email) || null;
        return {
          id: t.id,
          team_name: t.team_name,
          tl_name: t.tl_name,
          tl_email: t.tl_email,
          tl_mobile: t.tl_mobile || '-',
          tl_department: t.tl_department || '-',
          tl_year: t.tl_year || '-',
          visited: !!visitedAt,
          last_visited_at: visitedAt
        };
      });

      const leaderEmailSet = new Set(teamLeadersList.map(t => (t.tl_email || '').toLowerCase().trim()));
      const adminEmailSet = new Set(adminEmails);

      // Unknown visitors = visits not matching any team leader or admin
      const unknownVisitorsList = (visits || [])
        .filter((v: any) => {
          const em = (v.email || '').toLowerCase().trim();
          return em && !adminEmailSet.has(em) && !leaderEmailSet.has(em);
        })
        .map((v: any) => ({
          email: v.email,
          last_visited_at: v.last_visited_at
        }));

      // Admin list with timestamps
      const adminList = adminEmails.map(email => ({
        email,
        last_visited_at: visitMap.get(email) || null
      }));

      setVisitorData({
        admins: adminList,
        knownLeaders: teamLeadersList,
        unknownVisitors: unknownVisitorsList
      });
      setVisitorModalOpen(true);
    } catch (err) {
      console.error('Error fetching visitors:', err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  const fetchTeams = async () => {
    const { data: teamsData } = await supabase.from('teams').select('*');
    if (teamsData) {
      setTeams(teamsData);
      
      const allocated = teamsData.filter(t => t.allocated_ps_id).length;
      
      const psCounts: Record<string, number> = {};
      teamsData.forEach(t => {
        if (t.allocated_ps_id) {
          psCounts[t.allocated_ps_id] = (psCounts[t.allocated_ps_id] || 0) + 1;
        }
      });
      let popular = '-';
      let max = 0;
      for (const [psId, count] of Object.entries(psCounts)) {
        if (count > max) { max = count; popular = psId; }
      }

      setMetrics({ total: teamsData.length, allocated, popular });
    }
  };

  const fetchProblemStatements = async () => {
    const { data } = await supabase.from('problem_statements').select('*').order('id');
    if (data) setProblemStatements(data);
  };

  const getPSTeamCount = (psId: string) => {
    return teams.filter(t => isPSMatch(t.allocated_ps_id, psId)).length;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading file...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const formattedData = data.map((row: any) => ({
          team_name: row['Name of the Team'],
          tl_name: row['Name of the Team Leader'],
          tl_email: row['Team Leader Email Id']?.toString().toLowerCase().trim(),
          tl_mobile: row['Team Leader Mobile Number']?.toString(),
          tl_department: row['Team Leader Department '], 
          tl_year: row['Team Leader Year']?.toString(),
          members: [row['Member 1'], row['Member 2'], row['Member 3'], row['Member 4']].filter(Boolean)
        }));

        const { error } = await supabase.from('teams').upsert(formattedData, { onConflict: 'tl_email' });
        
        if (error) throw error;
        
        setUploadStatus(`Successfully uploaded ${formattedData.length} teams.`);
        fetchTeams(); 
      } catch (err: any) {
        console.error(err);
        setUploadStatus(`Error: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportData = () => {
    const exportData = filteredTeams.map((t, index) => ({
      'Sl No': index + 1,
      'Team Name': t.team_name,
      'TL Name': t.tl_name || '-',
      'TL Email': t.tl_email,
      'TL Mobile': t.tl_mobile || '-',
      'Department': t.tl_department || '-',
      'Year': t.tl_year || '-',
      'Member 1': t.members?.[0] || '',
      'Member 2': t.members?.[1] || '',
      'Member 3': t.members?.[2] || '',
      'Member 4': t.members?.[3] || '',
      'Problem Statement ID': t.allocated_ps_id || '-',
      'Status': t.allocated_ps_id ? `Allocated (${t.allocated_ps_id})` : 'Pending'
    }));

    exportStyledExcel([
      { sheetName: 'Allocations', data: exportData }
    ], 'CodeStorm_Allocations.xlsx');
  };


  const filteredEvalTeams = teams.filter(t => {
    const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
    if (!ps) return false;
    
    const slot = getTeamSlotInfo(t);
    if (evalFilterDay !== 'All') {
      if (!slot.isAssigned) return false;
      if (getDayNormalized(slot.day) !== getDayNormalized(evalFilterDay)) return false;
    }
    if (evalFilterBatch !== 'All') {
      if (!slot.isAssigned) return false;
      const match = slot.batchName === evalFilterBatch || slot.batch === evalFilterBatch || slot.batch.startsWith(evalFilterBatch);
      if (!match) return false;
    }
    if (evalFilterPS !== 'All' && !isPSMatch(ps.id, evalFilterPS)) return false;
    const evalData = evaluations.find(e => e.team_id === t.id);
    const isEvaluated = Boolean(evalData);
    const isAbsent = Boolean(evalData?.scores?.is_absent || evalData?.is_absent);
    if (evalFilterStatus === 'Evaluated' && (!isEvaluated || isAbsent)) return false;
    if (evalFilterStatus === 'Pending' && isEvaluated) return false;
    if (evalFilterStatus === 'Absent' && !isAbsent) return false;
    return true;
  });

  const handleExportEvaluations = () => {
    const exportData = filteredEvalTeams.map((t: any, index: number) => {
      const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
      const evalData = evaluations.find(e => e.team_id === t.id);
      const slot = getTeamSlotInfo(t);
      return {
        'Sl No': index + 1,
        'Team Name': t.team_name,
        'Batch': slot.batch,
        'Session': slot.session,
        'Session Type': slot.sessionType,
        'TL Name': t.tl_name || '-',
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile || '-',
        'Problem Statement ID': t.allocated_ps_id || '-',
        'Presentation Day': slot.day,
        'Room Number': slot.roomNumber,
        [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
        [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
        [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
        [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
        'Total Score': evalData ? evalData.total_score : '-',
        'Updates Count': evalData ? (evalData.update_count || 0) : 0,
        'Evaluated By': evalData ? evalData.evaluated_by : '-'
      };
    });

    exportStyledExcel([
      { sheetName: 'Evaluations', data: exportData }
    ], 'CodeStorm_Evaluations.xlsx');
  };

  const [selectedExportPS, setSelectedExportPS] = useState('ALL');

  const handleExportEvaluationsByPS = (targetPS: string = selectedExportPS) => {
    const activeTeams = teams.filter(t => t.allocated_ps_id);
    
    const filteredTeams = (targetPS === 'ALL' || targetPS === 'All')
      ? activeTeams 
      : activeTeams.filter(t => isPSMatch(t.allocated_ps_id, targetPS));

    if (filteredTeams.length === 0) {
      alert("No active teams found for the selected problem statement.");
      return;
    }

    filteredTeams.sort((a, b) => {
      const slotA = getTeamSlotInfo(a);
      const slotB = getTeamSlotInfo(b);
      if (slotA.batch !== slotB.batch) return slotA.batch.localeCompare(slotB.batch);
      return a.team_name.localeCompare(b.team_name);
    });

    const pptRows: any[] = [];
    const protoRows: any[] = [];

    filteredTeams.forEach((t, index) => {
      const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
      const evalData = evaluations.find(e => e.team_id === t.id);
      const slot = getTeamSlotInfo(t);

      const norm = getDayNormalized(slot.day);
      let dayFnType = evalSettings?.day1_fn_type || 'PPT';
      if (norm === '1st September') {
        dayFnType = evalSettings?.day2_fn_type || 'Prototype';
      } else if (norm === '2nd September') {
        dayFnType = evalSettings?.day3_fn_type || 'PPT';
      }

      const pptSession = dayFnType === 'PPT' ? 'Morning (FN) - 09:30 AM' : 'Afternoon (AN) - 01:30 PM';
      const protoSession = dayFnType === 'Prototype' ? 'Morning (FN) - 09:30 AM' : 'Afternoon (AN) - 01:30 PM';

      const baseTeamData = {
        'Room Number': slot.roomNumber,
        'Team Name': t.team_name,
        'TL Name': t.tl_name || '-',
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile || '-',
        'Department': t.tl_department || '-',
        'Year': t.tl_year || '-',
        'Problem Statement ID': ps?.id || '-',
        'Problem Statement Title': ps?.title || '-',
        'Team Members': (t.members || []).join(', ') || '-',
        [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
        [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
        [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
        [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
        'Total Score': evalData ? evalData.total_score : '-',
        'Evaluation Status': evalData ? 'Evaluated' : 'Pending',
        'Evaluated By': evalData ? evalData.evaluated_by : '-'
      };

      pptRows.push({
        'Sl No': index + 1,
        'Batch': slot.batch,
        'Presentation Day': slot.day,
        'Session': pptSession,
        'Evaluation Round': 'PPT Presentation',
        ...baseTeamData
      });

      protoRows.push({
        'Sl No': index + 1,
        'Batch': slot.batch,
        'Presentation Day': slot.day,
        'Session': protoSession,
        'Evaluation Round': 'Prototype Evaluation',
        ...baseTeamData
      });
    });

    const filename = (targetPS === 'ALL' || targetPS === 'All') 
      ? 'CodeStorm_Evaluations_All_Problem_Statements.xlsx' 
      : `CodeStorm_Evaluations_${targetPS}.xlsx`;

    exportStyledExcel([
      { sheetName: 'PPT Presentations', data: pptRows },
      { sheetName: 'Prototype Evaluations', data: protoRows }
    ], filename);
  };

  const handleExportLeaderboard = () => {
    const activeTeams = teams.filter(t => t.allocated_ps_id);
    
    const ranked = activeTeams
      .map(t => {
        const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
        const evalData = evaluations.find(e => e.team_id === t.id);
        const slot = getTeamSlotInfo(t);
        const totalScore = evalData ? Number(evalData.total_score) : null;
        return {
          team: t,
          ps,
          evalData,
          slot,
          totalScore,
          isEvaluated: evalData !== undefined
        };
      })
      .filter(item => {
        if (leaderboardPS !== 'All' && !isPSMatch(item.ps?.id || item.team.allocated_ps_id, leaderboardPS)) return false;
        if (leaderboardDept !== 'All' && item.team.tl_department !== leaderboardDept) return false;
        if (leaderboardYear !== 'All' && item.team.tl_year !== leaderboardYear) return false;
        if (leaderboardSearch) {
          const query = leaderboardSearch.toLowerCase();
          const matchesName = item.team.team_name.toLowerCase().includes(query);
          const matchesTL = (item.team.tl_name || '').toLowerCase().includes(query);
          const matchesPS = (item.ps?.id || '').toLowerCase().includes(query);
          if (!matchesName && !matchesTL && !matchesPS) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const scoreA = a.totalScore ?? -1;
        const scoreB = b.totalScore ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.team.team_name.localeCompare(b.team.team_name);
      });

    if (ranked.length === 0) {
      alert("No teams match the selected leaderboard filters.");
      return;
    }

    const exportData = ranked.map((item, index) => ({
      'Rank': item.totalScore !== null ? index + 1 : '-',
      'Team Name': item.team.team_name,
      'Total Score': item.totalScore !== null ? item.totalScore : '-',
      [getCategoryName(0)]: item.evalData ? item.evalData.cat1_score : '-',
      [getCategoryName(1)]: item.evalData ? item.evalData.cat2_score : '-',
      [getCategoryName(2)]: item.evalData ? item.evalData.cat3_score : '-',
      [getCategoryName(3)]: item.evalData ? item.evalData.cat4_score : '-',
      'Problem Statement ID': item.ps?.id || '-',
      'Problem Statement Title': item.ps?.title || '-',
      'Department': item.team.tl_department || '-',
      'Year': item.team.tl_year || '-',
      'Batch': item.slot.batch,
      'Presentation Day': item.slot.day,
      'Session': item.slot.session,
      'Room Number': item.slot.roomNumber,
      'TL Name': item.team.tl_name || '-',
      'TL Email': item.team.tl_email,
      'TL Mobile': item.team.tl_mobile || '-',
      'Team Members': (item.team.members || []).join(', ') || '-',
      'Evaluation Status': item.isEvaluated ? 'Evaluated' : 'Pending',
      'Evaluated By': item.evalData ? item.evalData.evaluated_by : '-'
    }));

    exportStyledExcel([
      { sheetName: 'Leaderboard', data: exportData }
    ], `CodeStorm_Leaderboard_${leaderboardPS}_${leaderboardDept}_${leaderboardYear}.xlsx`.replace(/ /g, '_'));
  };

  const [selectedExportBatch, setSelectedExportBatch] = useState('ALL');

  const handleExportEvaluationsByBatch = (targetBatch: string = selectedExportBatch) => {
    const activeTeams = teams.filter(t => t.allocated_ps_id);
    
    const filteredTeams = (targetBatch === 'ALL' || targetBatch === 'All') 
      ? activeTeams 
      : activeTeams.filter(t => {
          const slot = getTeamSlotInfo(t);
          return slot.batchName === targetBatch || slot.batch === targetBatch || slot.batch.startsWith(targetBatch);
        });

    if (filteredTeams.length === 0) {
      alert("No active teams found for the selected batch.");
      return;
    }

    filteredTeams.sort((a, b) => {
      const slotA = getTeamSlotInfo(a);
      const slotB = getTeamSlotInfo(b);
      if (slotA.batch !== slotB.batch) return slotA.batch.localeCompare(slotB.batch);
      return a.team_name.localeCompare(b.team_name);
    });

    const pptRows: any[] = [];
    const protoRows: any[] = [];

    filteredTeams.forEach((t, index) => {
      const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
      const evalData = evaluations.find(e => e.team_id === t.id);
      const slot = getTeamSlotInfo(t);

      const norm = getDayNormalized(slot.day);
      let dayFnType = evalSettings?.day1_fn_type || 'PPT';
      if (norm === '1st September') {
        dayFnType = evalSettings?.day2_fn_type || 'Prototype';
      } else if (norm === '2nd September') {
        dayFnType = evalSettings?.day3_fn_type || 'PPT';
      }

      const pptSession = dayFnType === 'PPT' ? 'Morning (FN) - 09:30 AM' : 'Afternoon (AN) - 01:30 PM';
      const protoSession = dayFnType === 'Prototype' ? 'Morning (FN) - 09:30 AM' : 'Afternoon (AN) - 01:30 PM';

      const baseTeamData = {
        'Room Number': slot.roomNumber,
        'Team Name': t.team_name,
        'TL Name': t.tl_name || '-',
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile || '-',
        'Department': t.tl_department || '-',
        'Year': t.tl_year || '-',
        'Problem Statement ID': ps?.id || '-',
        'Problem Statement Title': ps?.title || '-',
        'Team Members': (t.members || []).join(', ') || '-',
        [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
        [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
        [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
        [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
        'Total Score': evalData ? evalData.total_score : '-',
        'Evaluation Status': evalData ? 'Evaluated' : 'Pending',
        'Evaluated By': evalData ? evalData.evaluated_by : '-'
      };

      pptRows.push({
        'Sl No': index + 1,
        'Batch': slot.batch,
        'Presentation Day': slot.day,
        'Session': pptSession,
        'Evaluation Round': 'PPT Presentation',
        ...baseTeamData
      });

      protoRows.push({
        'Sl No': index + 1,
        'Batch': slot.batch,
        'Presentation Day': slot.day,
        'Session': protoSession,
        'Evaluation Round': 'Prototype Evaluation',
        ...baseTeamData
      });
    });

    let filename = `${targetBatch}.xlsx`;
    if (targetBatch === 'ALL' || targetBatch === 'All') {
      filename = 'All Batches.xlsx';
    }

    exportStyledExcel([
      { sheetName: 'PPT Presentations', data: pptRows },
      { sheetName: 'Prototype Evaluations', data: protoRows }
    ], filename);
  };

  const [selectedPanelBatch, setSelectedPanelBatch] = useState('Batch 1');

  const handleExportPanelWiseBatch = (targetBatch: string = selectedPanelBatch) => {
    const activeTeams = teams.filter(t => t.allocated_ps_id);
    const isAll = targetBatch === 'ALL' || targetBatch === 'All';

    const targetTeams = isAll 
      ? activeTeams 
      : activeTeams.filter(t => {
          const slot = getTeamSlotInfo(t);
          return slot.batchName === targetBatch || slot.batch === targetBatch || slot.batch.startsWith(targetBatch);
        });

    if (targetTeams.length === 0) {
      alert("No active teams found for the selected batch.");
      return;
    }

    // Deterministic sorting of Problem Statements
    const psIds = Array.from(new Set(targetTeams.map(t => t.allocated_ps_id))).sort();

    const statementGroups = psIds.map(psId => {
      const psObj = problemStatements.find(p => isPSMatch(p.id, psId));
      const groupTeams = targetTeams
        .filter(t => isPSMatch(t.allocated_ps_id, psId))
        .sort((a, b) => a.team_name.localeCompare(b.team_name));

      const slot = groupTeams.length > 0 ? getTeamSlotInfo(groupTeams[0]) : null;
      const roomNum = psObj?.room_number || (slot ? slot.roomNumber : 'PPT: C-002 | Proto: D-013');

      return {
        id: psObj?.id || psId,
        title: psObj?.title || 'Problem Statement',
        description: psObj?.description || '',
        expectedSolution: getExpectedSolutionForPS(psObj?.id || psId, psObj?.title, psObj?.description),
        roomNumber: roomNum,
        panelName: roomNum,
        teams: groupTeams
      };
    });

    const displayBatchName = isAll ? 'All Batches' : targetBatch;

    exportPanelWiseBatchExcel({
      batchName: displayBatchName,
      statementGroups,
      allBatchTeams: targetTeams,
      evaluations,
      getTeamSlotInfo,
      getCategoryName,
      fileName: isAll ? 'All Batches.xlsx' : `${targetBatch}.xlsx`
    });
  };

  const [savingSchedule, setSavingSchedule] = useState(false);

  const handleAssignPSToTrack = (psId: string, day: string, track: 'FN_PPT_AN_PROTO' | 'FN_PROTO_AN_PPT' | 'SPLIT') => {
    setProblemStatements(prev => prev.map(ps => {
      if (ps.id === psId) {
        const sessionVal = track === 'SPLIT' ? 'SPLIT' : track === 'FN_PROTO_AN_PPT' ? 'AN' : 'FN';
        return {
          ...ps,
          presentation_day: day,
          session: sessionVal,
          schedule_track: track,
          session_type: track === 'FN_PROTO_AN_PPT' ? 'Prototype' : 'PPT'
        };
      }
      return ps;
    }));
  };

  const handleUnassignPSFromTrack = (psId: string) => {
    setProblemStatements(prev => prev.map(ps => {
      if (ps.id === psId) {
        return {
          ...ps,
          presentation_day: null,
          schedule_track: null,
          batch: null,
          session: null,
          session_type: null
        };
      }
      return ps;
    }));
  };

  const handleSaveScheduleAndBatches = async () => {
    setSavingSchedule(true);
    try {
      // 1. Save schedule settings and rooms
      const { data: existing } = await supabase.from('evaluation_settings').select('id').limit(1);
      const schedulePayload = {
        day1_ppt_room: evalSettings?.day1_ppt_room || 'C-002',
        day1_proto_room: evalSettings?.day1_proto_room || 'D-013',
        day2_ppt_room: evalSettings?.day2_ppt_room || 'C-002',
        day2_proto_room: evalSettings?.day2_proto_room || 'D-013',
        day3_ppt_room: evalSettings?.day3_ppt_room || 'C-002',
        day3_proto_room: evalSettings?.day3_proto_room || 'D-013',
        day1_fn_type: 'PPT',
        day1_an_type: 'Prototype',
        day2_fn_type: 'Prototype',
        day2_an_type: 'PPT',
        day3_fn_type: 'PPT',
        day3_an_type: 'Prototype',
        updated_at: new Date().toISOString()
      };
      if (existing && existing.length > 0) {
        await supabase.from('evaluation_settings').update(schedulePayload).eq('id', existing[0].id);
      } else {
        await supabase.from('evaluation_settings').insert([schedulePayload]);
      }

      // 2. Batch update problem statements with existing columns (presentation_day, session, session_type)
      for (const ps of problemStatements) {
        const sessionVal = ps.session || (ps.schedule_track === 'FN_PROTO_AN_PPT' ? 'AN' : ps.schedule_track === 'SPLIT' ? 'SPLIT' : 'FN');
        const defaultType = sessionVal === 'AN' ? 'Prototype' : 'PPT';
        await supabase.from('problem_statements').update({
          presentation_day: ps.presentation_day || null,
          session: sessionVal,
          session_type: defaultType
        }).eq('id', ps.id);
      }

      alert("Dual-Room Schedules & Problem Statement Tracks saved successfully!");
      fetchEvalData();
      fetchProblemStatements();
      fetchTeams();
    } catch (err: any) {
      alert("Error saving schedule: " + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleResetAllScheduleAllocations = async () => {
    const passcode = prompt("Enter Master Passcode to reset all Day & Track allocations (INDUS):");
    if (passcode !== 'INDUS') {
      alert("Incorrect master passcode. Reset cancelled.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reset all Problem Statement Day & Track allocations?\n\nThis will unassign all problem statements from Day 1, Day 2, and Day 3 so you can allocate freshly.\n(All team details, uploaded data, and marks will remain safe)."
    );
    if (!confirmed) return;

    setSavingSchedule(true);
    try {
      // 1. Reset problem_statements allocations in DB using ONLY existing columns
      const { error: psError } = await supabase
        .from('problem_statements')
        .update({
          presentation_day: null,
          batch: null,
          session: null,
          session_type: null,
          room_number: null
        })
        .neq('id', '___nonexistent___');

      if (psError) throw psError;

      // 2. Reset team slot overrides if any
      await supabase
        .from('teams')
        .update({
          presentation_day: null,
          batch: null,
          session: null,
          session_type: null
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Update local state
      setProblemStatements(prev => prev.map(ps => ({
        ...ps,
        presentation_day: null,
        schedule_track: null,
        batch: null,
        session: null,
        session_type: null,
        room_number: null
      })));

      alert("All problem statement day and track allocations have been reset successfully! You can now allocate freshly.");
      fetchProblemStatements();
      fetchTeams();
    } catch (err: any) {
      alert("Error resetting allocations: " + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteMarks = async (teamId: string) => {
    const passcode = prompt("Enter Master Passcode to delete marks:");
    if (passcode !== 'INDUS') {
      alert("Incorrect passcode. Deletion cancelled.");
      return;
    }
    
    const { error } = await supabase.from('evaluations').delete().eq('team_id', teamId);
    if (error) {
      alert("Error deleting marks: " + error.message);
    } else {
      alert("Marks successfully deleted.");
      setEvalModalOpen(false);
      fetchEvalData();
    }
  };

  const handleMarkAbsent = async (teamId: string) => {
    const targetTeam = teams.find(t => t.id === teamId) || teamToEvaluate;
    const confirmed = window.confirm(`Are you sure you want to mark "${targetTeam?.team_name || 'this team'}" as Absent?`);
    if (!confirmed) return;

    setSavingEval(true);
    try {
      const existingEval = evaluations.find(e => e.team_id === teamId);
      const evalData = {
        team_id: teamId,
        cat1_score: 0,
        cat2_score: 0,
        cat3_score: 0,
        cat4_score: 0,
        total_score: 0,
        scores: { ...(existingEval?.scores || {}), is_absent: true },
        evaluated_by: session.user.email,
        update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1,
        evaluated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('evaluations').upsert(evalData, { onConflict: 'team_id' });
      setSavingEval(false);
      if (error) {
        alert("Error marking team as absent: " + error.message);
      } else {
        alert(`Team "${targetTeam?.team_name || ''}" marked as Absent successfully.`);
        setEvalModalOpen(false);
        fetchEvalData();
      }
    } catch (err: any) {
      setSavingEval(false);
      alert("Error marking absent: " + err.message);
    }
  };

  // Robust Shortlisting Helpers & Handlers
  const isTeamShortlisted = (evalData?: any): boolean => {
    if (!evalData || !evalData.scores) return false;
    if (typeof evalData.scores === 'object') {
      return Boolean(evalData.scores.is_shortlisted);
    }
    if (typeof evalData.scores === 'string') {
      try {
        const parsed = JSON.parse(evalData.scores);
        return Boolean(parsed.is_shortlisted);
      } catch {
        return false;
      }
    }
    return false;
  };

  // Draft / Pending Shortlist Map: { [teamId]: boolean }
  const [draftShortlistMap, setDraftShortlistMap] = useState<Record<string, boolean>>({});
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitCode, setCommitCode] = useState('');
  const [commitError, setCommitError] = useState('');
  const [committingBatch, setCommittingBatch] = useState(false);

  // Helper to determine active shortlist status taking draft changes into account
  const getEffectiveShortlistStatus = (teamId: string, evalData?: any): boolean => {
    if (draftShortlistMap[teamId] !== undefined) {
      return draftShortlistMap[teamId];
    }
    return isTeamShortlisted(evalData);
  };

  // Helper to check if a team has pending uncommitted changes
  const isTeamDraftChanged = (teamId: string, evalData?: any): boolean => {
    if (draftShortlistMap[teamId] === undefined) return false;
    const dbStatus = isTeamShortlisted(evalData);
    return draftShortlistMap[teamId] !== dbStatus;
  };

  // Toggle draft shortlist status
  const handleStageShortlistToggle = (teamId: string, evalData?: any) => {
    const currentEffective = getEffectiveShortlistStatus(teamId, evalData);
    const newStatus = !currentEffective;
    const dbStatus = isTeamShortlisted(evalData);

    setDraftShortlistMap(prev => {
      const updated = { ...prev };
      if (newStatus === dbStatus) {
        delete updated[teamId]; // reverted to saved state
      } else {
        updated[teamId] = newStatus;
      }
      return updated;
    });
  };

  // Get total pending changes count
  const pendingShortlistCount = Object.keys(draftShortlistMap).filter(teamId => {
    const evalData = evaluations.find(e => e.team_id === teamId);
    return isTeamDraftChanged(teamId, evalData);
  }).length;

  // Execute Batch Commit
  const handleCommitShortlistChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeClean = commitCode.trim().toUpperCase();
    if (codeClean !== 'INDUS' && codeClean !== '2026') {
      setCommitError('Invalid Master Code. Please enter INDUS.');
      return;
    }

    setCommittingBatch(true);
    setCommitError('');

    try {
      const entries = Object.entries(draftShortlistMap);
      for (const [teamId, shouldShortlist] of entries) {
        const existingEval = evaluations.find(e => e.team_id === teamId);
        let parsedScores: any = {};
        if (existingEval?.scores) {
          if (typeof existingEval.scores === 'object') {
            parsedScores = { ...existingEval.scores };
          } else if (typeof existingEval.scores === 'string') {
            try { parsedScores = JSON.parse(existingEval.scores); } catch {}
          }
        }
        parsedScores.is_shortlisted = shouldShortlist;

        const evalData = {
          team_id: teamId,
          cat1_score: existingEval ? (Number(existingEval.cat1_score) || 0) : 0,
          cat2_score: existingEval ? (Number(existingEval.cat2_score) || 0) : 0,
          cat3_score: existingEval ? (Number(existingEval.cat3_score) || 0) : 0,
          cat4_score: existingEval ? (Number(existingEval.cat4_score) || 0) : 0,
          total_score: existingEval ? (Number(existingEval.total_score) || 0) : 0,
          scores: parsedScores,
          evaluated_by: existingEval?.evaluated_by || session.user.email,
          update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1,
          evaluated_at: existingEval?.evaluated_at || new Date().toISOString()
        };

        const { error } = await supabase.from('evaluations').upsert(evalData, { onConflict: 'team_id' });
        if (error) {
          throw new Error(`Failed for team ${teamId}: ${error.message}`);
        }
      }

      setDraftShortlistMap({});
      setCommitModalOpen(false);
      setCommitCode('');
      await fetchEvalData();
      alert("All shortlist changes have been committed and permanently saved to the database!");
    } catch (err: any) {
      setCommitError("Error committing changes: " + err.message);
    } finally {
      setCommittingBatch(false);
    }
  };

  const handleExportAllShortlisted = () => {
    const shortlistedTeams = teams
      .filter(t => {
        const evalData = evaluations.find(e => e.team_id === t.id);
        return isTeamShortlisted(evalData);
      })
      .map((t, index) => {
        const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
        const evalData = evaluations.find(e => e.team_id === t.id);
        return {
          'Sl No': index + 1,
          'Team Name': t.team_name,
          'Problem Statement ID': t.allocated_ps_id || '-',
          'Problem Statement Title': ps?.title || '-',
          'Total Score': evalData ? evalData.total_score : '-',
          [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
          [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
          [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
          [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
          'TL Name': t.tl_name || '-',
          'TL Email': t.tl_email,
          'TL Mobile': t.tl_mobile || '-',
          'Department': t.tl_department || '-',
          'Year': t.tl_year || '-',
          'Team Members': (t.members || []).join(', ') || '-',
          'Shortlist Status': 'Shortlisted'
        };
      });

    if (shortlistedTeams.length === 0) {
      alert("No teams have been shortlisted yet.");
      return;
    }

    exportStyledExcel([
      { sheetName: 'All Shortlisted Teams', data: shortlistedTeams }
    ], 'CodeStorm_All_Shortlisted_Teams.xlsx');
  };

  const handleExportStatementWiseShortlisted = () => {
    const shortlisted = teams.filter(t => {
      const evalData = evaluations.find(e => e.team_id === t.id);
      return Boolean(evalData?.scores?.is_shortlisted);
    });

    if (shortlisted.length === 0) {
      alert("No teams have been shortlisted yet.");
      return;
    }

    // 1. Summary Sheet
    const psMap: Record<string, { title: string; count: number }> = {};
    shortlisted.forEach(t => {
      const psId = t.allocated_ps_id || 'Unallocated';
      const ps = problemStatements.find(p => isPSMatch(p.id, psId));
      if (!psMap[psId]) {
        psMap[psId] = { title: ps?.title || '-', count: 0 };
      }
      psMap[psId].count += 1;
    });

    const summaryData = Object.entries(psMap).map(([psId, info], idx) => ({
      'Sl No': idx + 1,
      'Problem Statement ID': psId,
      'Statement Title': info.title,
      'Shortlisted Teams Count': info.count
    }));

    const sheets: any[] = [
      { sheetName: 'Shortlist Summary', data: summaryData }
    ];

    // 2. Individual Problem Statement Sheets
    const groupedByPS: Record<string, typeof shortlisted> = {};
    shortlisted.forEach(t => {
      const psId = t.allocated_ps_id || 'Unallocated';
      if (!groupedByPS[psId]) groupedByPS[psId] = [];
      groupedByPS[psId].push(t);
    });

    Object.entries(groupedByPS).forEach(([psId, teamList]) => {
      const ps = problemStatements.find(p => isPSMatch(p.id, psId));
      const sheetData = teamList.map((t, index) => {
        const evalData = evaluations.find(e => e.team_id === t.id);
        return {
          'Rank': index + 1,
          'Team Name': t.team_name,
          'Problem Statement ID': psId,
          'Problem Statement Title': ps?.title || '-',
          'Total Score': evalData ? evalData.total_score : '-',
          [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
          [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
          [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
          [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
          'TL Name': t.tl_name || '-',
          'TL Email': t.tl_email,
          'TL Mobile': t.tl_mobile || '-',
          'Department': t.tl_department || '-',
          'Year': t.tl_year || '-',
          'Team Members': (t.members || []).join(', ') || '-'
        };
      });

      const cleanSheetName = psId.replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
      sheets.push({ sheetName: cleanSheetName, data: sheetData });
    });

    exportStyledExcel(sheets, 'CodeStorm_Statement_Wise_Shortlisted.xlsx');
  };

  const handleDeleteCoordinators = async (day: string, room: string) => {
    const { error } = await supabase.from('room_coordinators').delete().eq('presentation_day', day).eq('room_number', room);
    if (error) {
      alert("Error deleting coordinators: " + error.message);
    } else {
      fetchCoordinators();
    }
  };

  const handleExportLogistics = () => {
    const rooms = Array.from(new Set(
      problemStatements
        .filter(ps => ps.presentation_day === logisticsDay && ps.room_number)
        .map(ps => ps.room_number)
    ));
    
    const exportData = rooms.map((room, index) => {
      const coord = coordinators.find(c => c.presentation_day === logisticsDay && c.room_number === room) || {};
      const psAssigned = problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number === room).map(ps => ps.id).join(', ');
      
      return {
        'Sl No': index + 1,
        'Presentation Day': logisticsDay,
        'Room Number': room,
        'Assigned Problem Statements': psAssigned,
        'Faculty Coordinator': coord.faculty_coordinator || '-',
        'Student Coordinator': coord.student_coordinator || '-'
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logistics");
    XLSX.writeFile(workbook, `CodeStorm_Logistics_${logisticsDay.replace(/ /g, '_')}.xlsx`);
  };


  const handleAddPS = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoriesArray = newPS.categories.split(',').map(c => c.trim()).filter(Boolean);
    const { error } = await supabase.from('problem_statements').upsert([{
      id: newPS.id,
      title: newPS.title,
      sponsor: newPS.sponsor,
      description: newPS.description,
      categories: categoriesArray,
      max_teams: newPS.max_teams,
      batch: newPS.batch || null,
      presentation_day: newPS.presentation_day || null,
      session: newPS.session || 'FN',
      session_type: newPS.session_type || 'PPT',
      room_number: newPS.room_number || null
    }]);

    if (error) {
      setSettingsMessage({ text: error.message, type: 'error' });
    } else {
      setSettingsMessage({ text: editingPSId ? 'Problem statement updated successfully!' : 'Problem statement added successfully!', type: 'success' });
      setNewPS({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17, batch: '', presentation_day: '', session: 'FN', session_type: 'PPT', room_number: '' });
      setEditingPSId(null);
      fetchProblemStatements();
    }
  };

  const openEditModal = (ps: any) => {
    setModalPS(ps);
    setModalType('edit');
    setModalCode('');
    setModalError('');
    setModalOpen(true);
  };

  const openDeleteModal = (ps: any) => {
    setModalPS(ps);
    setModalType('delete');
    setModalCode('');
    setModalError('');
    setModalOpen(true);
  };

  const openAddTeamModal = () => {
    setModalType('add');
    setModalCode('');
    setModalError('');
    setNewTeam({ team_name: '', tl_email: '' });
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalCode !== 'INDUS') {
      setModalError('Invalid Master Code');
      return;
    }
    setModalError('');
    
    if (modalType === 'edit') {
      const psBatch = modalPS.batch || (modalPS.presentation_day ? getBatchFromDaySession(modalPS.presentation_day, modalPS.session || 'FN') : '');
      let day = modalPS.presentation_day || '';
      let sess = modalPS.session || 'FN';
      if (psBatch) {
        if (psBatch.startsWith('Day 1')) {
          day = '31st August';
          sess = psBatch.includes('AN') ? 'AN' : 'FN';
        } else if (psBatch.startsWith('Day 2')) {
          day = '1st September';
          sess = psBatch.includes('AN') ? 'AN' : 'FN';
        } else if (psBatch.startsWith('Day 3')) {
          day = '2nd September';
          sess = psBatch.includes('AN') ? 'AN' : 'FN';
        }
      }
      setNewPS({
        id: modalPS.id,
        title: modalPS.title,
        sponsor: modalPS.sponsor || '',
        description: modalPS.description,
        categories: (modalPS.categories || []).join(', '),
        max_teams: modalPS.max_teams,
        batch: psBatch,
        presentation_day: day,
        session: sess,
        session_type: modalPS.session_type || 'PPT',
        room_number: modalPS.room_number || ''
      });
      setEditingPSId(modalPS.id);
      setSettingsMessage({ text: `Editing ${modalPS.id}... Scroll up to update fields.`, type: 'success' });
      setModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (modalType === 'delete') {
      const { error: unallocateError } = await supabase.from('teams').update({ allocated_ps_id: null }).eq('allocated_ps_id', modalPS.id);
      if (unallocateError) {
        setSettingsMessage({ text: `Failed to unallocate teams: ${unallocateError.message}`, type: 'error' });
        setModalOpen(false);
        return;
      }

      const { error } = await supabase.from('problem_statements').delete().eq('id', modalPS.id);
      if (error) setSettingsMessage({ text: error.message, type: 'error' });
      else {
        setSettingsMessage({ text: `Deleted ${modalPS.id} successfully.`, type: 'success' });
        fetchProblemStatements();
        fetchTeams(); 
      }
      setModalOpen(false);
    } else if (modalType === 'add') {
      const formattedEmail = newTeam.tl_email.toLowerCase().trim();
      const { error } = await supabase.from('teams').upsert([{
        team_name: newTeam.team_name,
        tl_email: formattedEmail,
        tl_name: 'Manual Entry',
        members: []
      }], { onConflict: 'tl_email' });

      if (error) {
        setUploadStatus(`Error adding team: ${error.message}`);
      } else {
        setUploadStatus(`Successfully added team ${newTeam.team_name} with email ${formattedEmail}.`);
        fetchTeams();
      }
      setModalOpen(false);
    } else if (modalType === 'edit-team') {
      const formattedEmail = newTeam.tl_email.toLowerCase().trim();
      const { error } = await supabase.from('teams').update({
        team_name: newTeam.team_name,
        tl_email: formattedEmail,
      }).eq('id', selectedTeam.id);
      
      if (error) {
        setUploadStatus(`Error updating team: ${error.message}`);
      } else {
        setUploadStatus(`Successfully updated team ${newTeam.team_name}.`);
        fetchTeams();
        setSelectedTeam(null);
      }
      setModalOpen(false);
    } else if (modalType === 'delete-team') {
      const { error } = await supabase.from('teams').delete().eq('id', selectedTeam.id);
      if (error) {
        setUploadStatus(`Error deleting team: ${error.message}`);
      } else {
        setUploadStatus(`Successfully deleted team.`);
        fetchTeams();
        setSelectedTeam(null);
      }
      setModalOpen(false);
    }
  };

  const handleDeleteData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteCode === 'INDUS') {
      const confirmed = window.confirm("CRITICAL WARNING: This will permanently delete ALL teams and reset all allocations. Are you absolutely sure?");
      if (confirmed) {
        // Delete all teams
        const { error: deleteError } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // hack to delete all rows
        // Reset current_teams
        const { error: resetError } = await supabase.from('problem_statements').update({ current_teams: 0 }).neq('id', 'none');
        
        if (deleteError || resetError) {
          setSettingsMessage({ text: 'Error deleting data.', type: 'error' });
        } else {
          setSettingsMessage({ text: 'All team data successfully wiped.', type: 'success' });
          setDeleteCode('');
          fetchTeams();
          fetchProblemStatements();
        }
      }
    } else {
      setSettingsMessage({ text: 'Invalid Master Code. Deletion aborted.', type: 'error' });
    }
  };

  const filteredTeams = teams.filter(t => {
    if (filterStatus === 'Allocated' && !t.allocated_ps_id) return false;
    if (filterStatus === 'Pending' && t.allocated_ps_id) return false;
    if (filterDept !== 'All' && t.tl_department !== filterDept) return false;
    if (filterYear !== 'All' && t.tl_year !== filterYear) return false;
    if (filterPS !== 'All' && !isPSMatch(t.allocated_ps_id, filterPS)) return false;
    return true;
  });

  const departments = ['All', ...Array.from(new Set(teams.map(t => t.tl_department).filter(Boolean)))];
  const years = ['All', ...Array.from(new Set(teams.map(t => t.tl_year).filter(Boolean)))];
  const allocatedProblemStatements = ['All', ...Array.from(new Set(teams.map(t => t.allocated_ps_id).filter(Boolean)))];

  return (
    <div className="min-h-screen pb-12">
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
           <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             onClick={() => window.location.href = '/'}
           >
              <img src="/sri-indu-logo.jpg" alt="Sri Indu Logo" className="h-10 object-contain" />
              <h1 className="text-lg font-bold text-white hidden sm:block">Code Storm 2026</h1>
           </div>
           
           <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'upload' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                Upload Data
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                Settings
              </button>
              <button 
                onClick={() => setActiveTab('evaluations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'evaluations' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                Evaluations
              </button>
              <button 
                onClick={() => setActiveTab('leaderboard')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'leaderboard' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                <Trophy size={16} className="text-amber-400" /> Leaderboard
              </button>
              <button 
                onClick={() => setActiveTab('shortlisted')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'shortlisted' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                <Award size={16} className="text-emerald-400" /> Shortlisted
              </button>
              <button 
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'certificates' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                <FileCheck size={16} className="text-amber-300" /> Certificates
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-500 hover:text-blue-300 transition-colors" title="Switch to Participant Dashboard">
                <LayoutDashboard size={20} />
              </button>
            </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 cursor-pointer transition-colors"
            onClick={fetchVisitors}
            title="Click to view website visitors and activity"
          >
             <img src={session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}`} alt="Avatar" className="w-6 h-6 rounded-full" />
             <span className="text-xs font-medium text-white">{session.user.email}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-xs sm:text-sm border border-white/10 text-white px-3.5 py-1.5 rounded-md hover:bg-white/10 transition-colors">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 overflow-hidden">
        
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-8"
            >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card flex items-center gap-4">
                <div className="p-3 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/20"><Users size={24} /></div>
                <div className="relative z-[2]">
                  <p className="text-sm text-gray-500">Total Registered Teams</p>
                  <p className="text-2xl font-bold text-white">{metrics.total}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/20"><Database size={24} /></div>
                <div className="relative z-[2]">
                  <p className="text-sm text-gray-500">Teams Allocated</p>
                  <p className="text-2xl font-bold text-white">{metrics.allocated}</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 bg-purple-500/15 text-purple-400 rounded-lg border border-purple-500/20"><Settings size={24} /></div>
                <div className="relative z-[2]">
                  <p className="text-sm text-gray-500">Most Popular PS</p>
                  <p className="text-lg font-bold text-white truncate">{metrics.popular}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-lg font-bold">Team Allocations</h2>
                <button onClick={handleExportData} className="flex items-center justify-center gap-2 btn-secondary text-sm shrink-0">
                  <Download size={16} /> Export View to Excel
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300 w-full md:w-auto">
                  <Filter size={16} /> Filters:
                </div>
                
                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs text-gray-300 mb-1">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/40 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 text-white">
                    <option value="All">All</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs text-gray-300 mb-1">Problem Statement</label>
                  <select value={filterPS} onChange={e => setFilterPS(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/40 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 text-white max-w-[150px]">
                    {allocatedProblemStatements.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                  </select>
                </div>

                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs text-gray-300 mb-1">Department</label>
                  <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/40 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 text-white max-w-[150px]">
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs text-gray-300 mb-1">Year</label>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/40 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 text-white max-w-[150px]">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 text-sm">
                      <th className="pb-3 font-semibold w-12 text-center">#</th>
                      <th className="pb-3 font-semibold min-w-[150px]">Team Name</th>
                      <th className="pb-3 font-semibold min-w-[150px]">Dept / Year</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.map((team, index) => (
                      <tr key={team.id} onClick={() => setSelectedTeam(team)} className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                        <td className="py-3 text-sm text-center text-gray-500 font-medium">{index + 1}</td>
                        <td className="py-3 text-sm">
                          <p className="font-semibold text-white">{team.team_name}</p>
                          <p className="text-xs text-gray-500">{team.tl_email}</p>
                        </td>
                        <td className="py-3 text-sm">
                          <p className="text-white">{team.tl_department || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Year {team.tl_year || 'N/A'}</p>
                        </td>
                        <td className="py-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`badge ${!team.allocated_ps_id ? 'badge-red' : 'badge-green'}`}>
                              {team.allocated_ps_id ? `Allocated (${team.allocated_ps_id})` : 'Pending'}
                            </span>
                            {team.is_disabled && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                Disabled
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTeams.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">No teams match your current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="card max-w-2xl mx-auto"
            >
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary/15 text-blue-300 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/30/20">
                 <Upload size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">Upload Participant Data</h2>
              <p className="text-gray-500 mt-2">Upload the Excel sheet containing the registration data.</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-blue-300">
                <span className="font-bold">Pro tip:</span> Ensure your Excel sheet has columns named exactly: "Name of the Team", "Name of the Team Leader", "Team Leader Email Id", "Team Leader Department ", and "Team Leader Year".
              </p>
              <button onClick={openAddTeamModal} className="flex items-center gap-2 btn-secondary shrink-0 text-sm py-2 px-4">
                <Plus size={16} /> Add Team Manually
              </button>
            </div>

            <div className="border-2 border-dashed border-white/15 rounded-xl p-12 text-center hover:bg-white/5 transition-colors">
              <Upload className="mx-auto text-gray-500 mb-4" size={40} />
              <p className="font-medium text-gray-300 mb-2">Click or drag & drop excel file here</p>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
            {uploadStatus && (
              <div className={`mt-6 p-4 rounded-lg text-center font-medium ${uploadStatus.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {uploadStatus}
              </div>
            )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-8"
            >
                          <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Dynamic Evaluation Schema</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {((evalSettings?.categories as any[]) || []).map((cat: any, index: number) => (
                    <div key={cat.id} className="relative">
                      <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">{cat.name}</label>
                      <input 
                        type="text" 
                        value={cat.name} 
                        onChange={(e) => {
                          const newCats = [...(evalSettings.categories || [])];
                          newCats[index].name = e.target.value;
                          setEvalSettings({...evalSettings, categories: newCats});
                        }}
                        className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/30 text-white pr-8" 
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Max Total Marks</label>
                    <input 
                      type="number" 
                      value={evalSettings?.maxMarks || 100} 
                      onChange={(e) => setEvalSettings({...evalSettings, maxMarks: Number(e.target.value)})}
                      className="w-32 text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/30 text-white" 
                    />
                  </div>
                  
                  <div className="flex-grow flex justify-end items-end gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          const cats = evalSettings.categories || [];
                          const payload = {
                            categories: cats,
                            category_1: cats[0]?.name || 'Innovation',
                            category_2: cats[1]?.name || 'Feasibility',
                            category_3: cats[2]?.name || 'Presentation',
                            category_4: cats[3]?.name || 'Technicality',
                            max_marks: evalSettings.maxMarks || 100,
                            updated_at: new Date().toISOString()
                          };

                          const { data: existing } = await supabase.from('evaluation_settings').select('id').limit(1);
                          let error;
                          if (existing && existing.length > 0) {
                            const res = await supabase.from('evaluation_settings').update(payload).eq('id', existing[0].id);
                            error = res.error;
                          } else {
                            const res = await supabase.from('evaluation_settings').insert([payload]);
                            error = res.error;
                          }
                          if (error) {
                            // Fallback if specific columns are not yet in Supabase
                            const fallback = { categories: cats };
                            if (existing && existing.length > 0) {
                              const res2 = await supabase.from('evaluation_settings').update(fallback).eq('id', existing[0].id);
                              if (res2.error) alert("Error saving settings: " + res2.error.message);
                              else {
                                alert("Evaluation Schema saved successfully!");
                                fetchEvalData();
                              }
                            } else {
                              const res2 = await supabase.from('evaluation_settings').insert([fallback]);
                              if (res2.error) alert("Error saving settings: " + res2.error.message);
                              else {
                                alert("Evaluation Schema saved successfully!");
                                fetchEvalData();
                              }
                            }
                          } else {
                            alert("Evaluation Schema saved successfully!");
                            fetchEvalData();
                          }
                        } catch (err: any) {
                          alert("Error saving settings: " + err.message);
                        }
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-6 py-2 rounded shadow-sm text-sm"
                    >
                      Save Schema
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Reports by Problem Statement */}
              <div className="card max-w-4xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Download size={20} className="text-gray-300" /> Export Reports by Problem Statement
                    </h3>
                    <p className="text-xs text-gray-400">
                      Choose a specific Problem Statement or All Statements to export team evaluations into Excel.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <select
                      value={selectedExportPS}
                      onChange={(e) => setSelectedExportPS(e.target.value)}
                      className="text-sm border-white/20 rounded-lg bg-black/40 backdrop-blur-xl border py-2 px-3 focus:ring-white/30 focus:border-white/30 text-white min-w-[220px]"
                    >
                      <option value="ALL">All Problem Statements</option>
                      {problemStatements.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.id} - {ps.title.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleExportEvaluationsByPS(selectedExportPS)}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-sm flex items-center justify-center gap-2 shrink-0 py-2 px-5 rounded-lg transition-all font-medium"
                    >
                      <Download size={16} /> Export to Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel-Wise Batch Segregation Export */}
              <div className="card max-w-4xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Download size={20} className="text-gray-300" /> Panel-Wise Batch Segregation Export
                    </h3>
                    <p className="text-xs text-gray-400">
                      Export batch sheets with Problem Statement banners, intelligent Expected Solutions & Benefits, Room/Panel allocations, and complete team details.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                    <select
                      value={selectedPanelBatch}
                      onChange={(e) => setSelectedPanelBatch(e.target.value)}
                      className="text-sm border-white/20 rounded-lg bg-black/40 backdrop-blur-xl border py-2 px-3 focus:ring-white/30 focus:border-white/30 text-white min-w-[220px]"
                    >
                      {BATCH_OPTIONS.map((b) => (
                        <option key={b.id} value={b.id} className="bg-gray-900 text-white">
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleExportPanelWiseBatch(selectedPanelBatch)}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-sm flex items-center justify-center gap-2 shrink-0 py-2 px-5 rounded-lg transition-all font-medium cursor-pointer"
                    >
                      <Download size={16} /> Export Panel-Wise (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Real-time preview of statements in selected batch */}
                {(() => {
                  const isAll = selectedPanelBatch === 'ALL' || selectedPanelBatch === 'All';
                  const activeBatchTeams = isAll 
                    ? teams.filter(t => t.allocated_ps_id) 
                    : teams.filter(t => {
                        const slot = getTeamSlotInfo(t);
                        return slot.batchName === selectedPanelBatch || slot.batch === selectedPanelBatch || slot.batch.startsWith(selectedPanelBatch);
                      });
                  
                  const uniquePSIds = Array.from(new Set(activeBatchTeams.map(t => t.allocated_ps_id)));

                  return (
                    <div className="mt-4 pt-1 space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Selected Target: <strong className="text-white">{isAll ? 'All Batches (1 to 6)' : selectedPanelBatch}</strong> ({activeBatchTeams.length} Teams allocated)</span>
                        <span>File Name: <code className="text-gray-200 font-mono font-bold">{isAll ? 'All Batches.xlsx' : `${selectedPanelBatch}.xlsx`}</code></span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                        {uniquePSIds.map(psId => {
                          const psObj = problemStatements.find(p => isPSMatch(p.id, psId));
                          const psTeams = activeBatchTeams.filter(t => isPSMatch(t.allocated_ps_id, psId));
                          const slot = psTeams.length > 0 ? getTeamSlotInfo(psTeams[0]) : null;

                          return (
                            <div key={psId} className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-white">{psObj?.id || psId}</span>
                                <span className="text-[11px] font-mono bg-white/10 text-gray-200 px-2 py-0.5 rounded">
                                  {psTeams.length} Teams
                                </span>
                              </div>
                              <p className="text-xs text-gray-200 font-medium line-clamp-1">{psObj?.title || 'Problem Statement'}</p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                                <span>Day: {slot?.day || '31st August'}</span>
                                <span>•</span>
                                <span>Room: {psObj?.room_number || slot?.roomNumber || 'C-002'}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 bg-white/5 p-2 rounded border border-white/5 line-clamp-2 italic">
                                {getExpectedSolutionForPS(psObj?.id || psId, psObj?.title, psObj?.description).replace(/[\r\n]+/g, ' ')}
                              </div>
                            </div>
                          );
                        })}

                        {uniquePSIds.length === 0 && (
                          <div className="col-span-2 text-center py-4 text-xs text-gray-500">
                            No teams currently assigned to this batch.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Export Reports Batch-wise (Standard Evaluation Format) */}
              <div className="card max-w-4xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Download size={20} className="text-gray-300" /> Export Standard Evaluation Sheets
                    </h3>
                    <p className="text-xs text-gray-400">
                      Export full marks and evaluation breakdown sheets by batch.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <select
                      value={selectedExportBatch}
                      onChange={(e) => setSelectedExportBatch(e.target.value)}
                      className="text-sm border-white/20 rounded-lg bg-black/40 backdrop-blur-xl border py-2 px-3 focus:ring-white/30 focus:border-white/30 text-white min-w-[220px]"
                    >
                      {BATCH_OPTIONS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleExportEvaluationsByBatch(selectedExportBatch)}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-sm flex items-center justify-center gap-2 shrink-0 py-2 px-5 rounded-lg transition-all font-medium"
                    >
                      <Download size={16} /> Export to Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Dual-Room Day Schedule & Problem Statement Track Allocation */}
              <div className="card max-w-5xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock size={20} className="text-gray-300" /> Dual-Room Day Schedule & Track Allocation
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Configure dedicated PPT & Prototype rooms for each day. In FN, Track A does PPT in PPT Room while Track B does Prototype in Prototype Room; in AN, they automatically swap!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      disabled={savingSchedule}
                      onClick={handleResetAllScheduleAllocations}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-4 py-2 rounded-lg text-sm transition-all font-medium flex items-center gap-1.5"
                      title="Reset all problem statement day and track assignments to start freshly"
                    >
                      <Trash2 size={16} /> Reset All Allocations
                    </button>
                    <button 
                      disabled={savingSchedule}
                      onClick={handleSaveScheduleAndBatches}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-6 py-2 rounded-lg shadow-sm text-sm transition-all font-medium flex items-center gap-2"
                    >
                      {savingSchedule ? 'Saving Schedules & Tracks...' : 'Save Dual-Room Schedule & Allocations'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { dayName: 'Day 1 (31st August)', dayKey: '31st August', pptKey: 'day1_ppt_room', protoKey: 'day1_proto_room', defaultPpt: 'C-002', defaultProto: 'D-013' },
                    { dayName: 'Day 2 (1st September)', dayKey: '1st September', pptKey: 'day2_ppt_room', protoKey: 'day2_proto_room', defaultPpt: 'C-002', defaultProto: 'D-013' },
                    { dayName: 'Day 3 (2nd September)', dayKey: '2nd September', pptKey: 'day3_ppt_room', protoKey: 'day3_proto_room', defaultPpt: 'C-002', defaultProto: 'D-013' },
                  ].map((d) => {
                    const currentPptRoom = evalSettings?.[d.pptKey] || d.defaultPpt;
                    const currentProtoRoom = evalSettings?.[d.protoKey] || d.defaultProto;

                    const trackAPS = problemStatements.filter(ps => ps.presentation_day === d.dayKey && (ps.session === 'FN' || ps.schedule_track === 'FN_PPT_AN_PROTO') && ps.session !== 'SPLIT' && ps.schedule_track !== 'SPLIT');
                    const trackBPS = problemStatements.filter(ps => ps.presentation_day === d.dayKey && (ps.session === 'AN' || ps.schedule_track === 'FN_PROTO_AN_PPT') && ps.session !== 'SPLIT' && ps.schedule_track !== 'SPLIT');
                    const splitPS = problemStatements.filter(ps => ps.presentation_day === d.dayKey && (ps.session === 'SPLIT' || ps.schedule_track === 'SPLIT'));

                    return (
                      <div key={d.dayKey} className="bg-black/30 p-5 rounded-xl border border-white/10 space-y-4">
                        {/* Day Header & Dual Room Inputs */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-white/10">
                          <div>
                            <h4 className="text-base font-bold text-white">{d.dayName}</h4>
                            <span className="text-xs text-gray-400">2 Dedicated Rooms • Automatic Afternoon Track Swap</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-300 font-medium">PPT Room (All Day):</label>
                              <input
                                type="text"
                                value={currentPptRoom}
                                onChange={(e) => setEvalSettings({ ...evalSettings, [d.pptKey]: e.target.value })}
                                placeholder="e.g. C-002"
                                className="w-24 text-xs font-mono font-bold py-1 px-2 border border-white/20 rounded-md bg-black/50 text-white focus:border-white/40"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-300 font-medium">Prototype Room (All Day):</label>
                              <input
                                type="text"
                                value={currentProtoRoom}
                                onChange={(e) => setEvalSettings({ ...evalSettings, [d.protoKey]: e.target.value })}
                                placeholder="e.g. D-013"
                                className="w-24 text-xs font-mono font-bold py-1 px-2 border border-white/20 rounded-md bg-black/50 text-white focus:border-white/40"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tracks & Split Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Track A */}
                          <div className="bg-black/40 p-4 rounded-lg border border-white/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="text-sm font-bold text-white">Track A (Whole PS)</h5>
                                <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                                  FN: PPT ({currentPptRoom}) ➔ AN: Proto ({currentProtoRoom})
                                </p>
                              </div>
                              <span className="text-xs bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                                {trackAPS.length} PS
                              </span>
                            </div>

                            {/* Assigned Statements Chips */}
                            <div>
                              <label className="block text-[11px] text-gray-300 font-medium mb-1.5">
                                Assigned Problem Statements:
                              </label>
                              <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 bg-black/20 rounded-lg border border-white/5">
                                {trackAPS.map(ps => (
                                  <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white px-2 py-0.5 rounded-md border border-white/15">
                                    <span className="font-bold">{ps.id}</span>
                                    <span className="text-[10px] text-gray-300">({getPSTeamCount(ps.id)}t)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignPSFromTrack(ps.id)}
                                      className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                      title="Remove from track"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                                {trackAPS.length === 0 && (
                                  <p className="text-[11px] text-gray-500 italic p-1">No statements in Track A</p>
                                )}
                              </div>

                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleAssignPSToTrack(e.target.value, d.dayKey, 'FN_PPT_AN_PROTO');
                                }}
                                className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <option value="">+ Add PS to Track A...</option>
                                {problemStatements.filter(ps => ps.presentation_day !== d.dayKey || ps.session !== 'FN').map(ps => (
                                  <option key={ps.id} value={ps.id}>
                                    {ps.id} - {ps.title.substring(0, 24)}... ({getPSTeamCount(ps.id)} teams)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Track B */}
                          <div className="bg-black/40 p-4 rounded-lg border border-white/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="text-sm font-bold text-white">Track B (Whole PS)</h5>
                                <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                                  FN: Proto ({currentProtoRoom}) ➔ AN: PPT ({currentPptRoom})
                                </p>
                              </div>
                              <span className="text-xs bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                                {trackBPS.length} PS
                              </span>
                            </div>

                            {/* Assigned Statements Chips */}
                            <div>
                              <label className="block text-[11px] text-gray-300 font-medium mb-1.5">
                                Assigned Problem Statements:
                              </label>
                              <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 bg-black/20 rounded-lg border border-white/5">
                                {trackBPS.map(ps => (
                                  <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white px-2 py-0.5 rounded-md border border-white/15">
                                    <span className="font-bold">{ps.id}</span>
                                    <span className="text-[10px] text-gray-300">({getPSTeamCount(ps.id)}t)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignPSFromTrack(ps.id)}
                                      className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                      title="Remove from track"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                                {trackBPS.length === 0 && (
                                  <p className="text-[11px] text-gray-500 italic p-1">No statements in Track B</p>
                                )}
                              </div>

                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleAssignPSToTrack(e.target.value, d.dayKey, 'FN_PROTO_AN_PPT');
                                }}
                                className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <option value="">+ Add PS to Track B...</option>
                                {problemStatements.filter(ps => ps.presentation_day !== d.dayKey || ps.session !== 'AN').map(ps => (
                                  <option key={ps.id} value={ps.id}>
                                    {ps.id} - {ps.title.substring(0, 24)}... ({getPSTeamCount(ps.id)} teams)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 50/50 Split Track (Half Track A + Half Track B) */}
                          <div className="bg-black/40 p-4 rounded-lg border border-white/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <span>⚡</span> 50/50 Split (Both Tracks)
                                </h5>
                                <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                                  Half 1: FN PPT ➔ AN Proto | Half 2: FN Proto ➔ AN PPT
                                </p>
                              </div>
                              <span className="text-xs bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                                {splitPS.length} PS
                              </span>
                            </div>

                            {/* Assigned Statements Chips */}
                            <div>
                              <label className="block text-[11px] text-gray-300 font-medium mb-1.5">
                                Assigned Problem Statements:
                              </label>
                              <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 bg-black/20 rounded-lg border border-white/5">
                                {splitPS.map(ps => (
                                  <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white px-2 py-0.5 rounded-md border border-white/15">
                                    <span className="font-bold">{ps.id}</span>
                                    <span className="text-[10px] text-gray-300">({getPSTeamCount(ps.id)}t - 50/50)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignPSFromTrack(ps.id)}
                                      className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                      title="Remove from track"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                                {splitPS.length === 0 && (
                                  <p className="text-[11px] text-gray-500 italic p-1">No statements in 50/50 Split</p>
                                )}
                              </div>

                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleAssignPSToTrack(e.target.value, d.dayKey, 'SPLIT');
                                }}
                                className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <option value="">+ Add PS to 50/50 Split...</option>
                                {problemStatements.filter(ps => ps.presentation_day !== d.dayKey || ps.session !== 'SPLIT').map(ps => (
                                  <option key={ps.id} value={ps.id}>
                                    {ps.id} - {ps.title.substring(0, 24)}... ({getPSTeamCount(ps.id)} teams)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card max-w-4xl mx-auto mt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 text-white rounded-lg"><Settings size={20} /></div>
                  <h2 className="text-xl font-bold">Problem Statement Management</h2>
                </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add new PS form */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><Plus size={18}/> {editingPSId ? `Edit Statement: ${editingPSId}` : 'Add New Statement'}</h3>
                    {editingPSId && (
                      <button onClick={() => { setEditingPSId(null); setNewPS({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17, batch: '', presentation_day: '', session: 'FN', session_type: 'PPT', room_number: '' }); }} className="text-xs text-red-400 hover:text-red-300 underline">Cancel Edit</button>
                    )}
                  </div>
                  <form onSubmit={handleAddPS} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">ID (e.g. PS7)</label>
                        <input type="text" required disabled={!!editingPSId} value={newPS.id} onChange={e=>setNewPS({...newPS, id: e.target.value})} className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Max Teams</label>
                        <input type="number" required min="1" value={newPS.max_teams} onChange={e=>setNewPS({...newPS, max_teams: parseInt(e.target.value)})} className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Title</label>
                      <input type="text" required value={newPS.title} onChange={e=>setNewPS({...newPS, title: e.target.value})} className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
                      <textarea required value={newPS.description} onChange={e=>setNewPS({...newPS, description: e.target.value})} className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white h-24" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Categories (comma separated)</label>
                      <input type="text" value={newPS.categories} onChange={e=>setNewPS({...newPS, categories: e.target.value})} placeholder="e.g. AI/ML, Healthcare" className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Assign to Batch</label>
                        <select 
                          value={newPS.batch || (newPS.presentation_day ? getBatchFromDaySession(newPS.presentation_day, newPS.session || 'FN') : '')} 
                          onChange={e => {
                            const selectedBatch = e.target.value;
                            let day = '';
                            let sess = 'FN';
                            if (selectedBatch.startsWith('Day 1')) {
                              day = '31st August';
                              sess = selectedBatch.includes('AN') ? 'AN' : 'FN';
                            } else if (selectedBatch.startsWith('Day 2')) {
                              day = '1st September';
                              sess = selectedBatch.includes('AN') ? 'AN' : 'FN';
                            } else if (selectedBatch.startsWith('Day 3')) {
                              day = '2nd September';
                              sess = selectedBatch.includes('AN') ? 'AN' : 'FN';
                            }
                            setNewPS({
                              ...newPS,
                              batch: selectedBatch,
                              presentation_day: day,
                              session: sess
                            });
                          }} 
                          className="w-full text-xs py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white"
                        >
                          <option value="">Select Batch (Optional)</option>
                          <option value="Day 1 - FN">Batch 1: Day 1 - FN (31st Aug Morning)</option>
                          <option value="Day 1 - AN">Batch 2: Day 1 - AN (31st Aug Afternoon)</option>
                          <option value="Day 2 - FN">Batch 3: Day 2 - FN (1st Sept Morning)</option>
                          <option value="Day 2 - AN">Batch 4: Day 2 - AN (1st Sept Afternoon)</option>
                          <option value="Day 3 - FN">Batch 5: Day 3 - FN (2nd Sept Morning)</option>
                          <option value="Day 3 - AN">Batch 6: Day 3 - AN (2nd Sept Afternoon)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Room Number(s)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. C-002, D-013" 
                          value={newPS.room_number} 
                          onChange={e => setNewPS({...newPS, room_number: e.target.value})} 
                          className="w-full text-xs py-2 px-3 border border-white/20 rounded-lg bg-black/40 text-white placeholder-gray-500" 
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 py-2 rounded-lg text-sm font-medium transition-all">Save Statement</button>
                  </form>
                </div>

                {/* Edit existing PS max limits */}
                <div className="card p-0 flex flex-col h-full">
                  <div className="p-4 border-b border-white/10 bg-black/20">
                    <h3 className="font-bold text-white">Existing Statements</h3>
                  </div>
                  <div className="overflow-y-auto p-0 flex-grow max-h-[420px]">
                    <ul className="divide-y divide-white/5">
                      {problemStatements.map(ps => {
                        const psBatch = ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : 'Not Assigned');
                        return (
                          <li key={ps.id} className="p-4 flex items-center justify-between hover:bg-white/5 border-b border-white/5 last:border-0">
                            <div>
                              <p className="font-bold text-sm text-white">{ps.id}: <span className="font-normal text-gray-300">{ps.title.substring(0,25)}...</span></p>
                              <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                                <span className="text-gray-400">Teams: {getPSTeamCount(ps.id)} / {ps.max_teams}</span>
                                <span className="text-gray-300">• {psBatch}</span>
                                <span className="text-gray-300">• Room: {ps.room_number || 'Not Set'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEditModal(ps)} className="p-2 text-gray-400 hover:text-white transition-colors bg-black/40 border border-white/10 rounded hover:bg-white/10" title="Edit Statement">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => openDeleteModal(ps)} className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-black/40 border border-white/10 rounded hover:bg-white/10" title="Delete Statement">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto flex justify-end mt-4">
              <form onSubmit={handleDeleteData} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <input 
                  type="password" 
                  placeholder="Master code" 
                  required
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  className="w-28 py-1 px-2 text-xs border border-white/20 rounded focus:ring-red-500 focus:border-red-500"
                />
                <button type="submit" className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 size={12} /> Delete all data
                </button>
              </form>
            </div>
            {settingsMessage.text && (
              <div className={`max-w-4xl mx-auto mt-2 p-2 rounded text-xs font-medium text-center ${settingsMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {settingsMessage.text}
              </div>
            )}
            </motion.div>
          )}
        
          {activeTab === 'evaluations' && (
            <motion.div 
              key="evaluations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-6"
            >


              <div className="card overflow-hidden p-0 border border-white/10 bg-white/[0.02]">
                <div className="p-5 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.01]">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                      Teams Evaluation 
                      <button 
                        onClick={() => setExportModalOpen(true)} 
                        className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs px-3 py-1 rounded-lg transition-all cursor-pointer font-medium"
                        title="Open Export Options"
                      >
                        <Download size={14} /> Export
                      </button>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Evaluate teams and record marks</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-[11px] text-gray-400 font-medium mb-1">Batch</label>
                      <select value={evalFilterBatch} onChange={e => setEvalFilterBatch(e.target.value)} className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30">
                        <option value="All">All Batches</option>
                        {BATCH_OPTIONS.filter(b => b.id !== 'ALL').map(b => (
                          <option key={b.id} value={b.id}>{b.id}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] text-gray-400 font-medium mb-1">Presentation Day</label>
                      <select value={evalFilterDay} onChange={e => setEvalFilterDay(e.target.value)} className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30">
                        <option value="All">All Days</option>
                        <option value="31st August">31st August</option>
                        <option value="1st September">1st September</option>
                        <option value="2nd September">2nd September</option>
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] text-gray-400 font-medium mb-1">Problem Statement</label>
                      <select value={evalFilterPS} onChange={e => setEvalFilterPS(e.target.value)} className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30">
                        {allocatedProblemStatements.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] text-gray-400 font-medium mb-1">Status</label>
                      <select value={evalFilterStatus} onChange={e => setEvalFilterStatus(e.target.value)} className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30">
                        <option value="All">All</option>
                        <option value="Evaluated">Evaluated</option>
                        <option value="Pending">Pending</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.02]">
                        <th className="p-3.5 w-12 text-center">#</th>
                        <th className="p-3.5">Team Name</th>
                        <th className="p-3.5">Problem Statement</th>
                        <th className="p-3.5 text-center">Batch No</th>
                        <th className="p-3.5 text-center">Score (100)</th>
                        <th className="p-3.5 text-center">Updates</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvalTeams.map((team, index) => {
                        const ps = problemStatements.find(p => p.id === team.allocated_ps_id);
                        const evaluation = evaluations.find(e => e.team_id === team.id);
                        const isAbsent = Boolean(evaluation?.scores?.is_absent || evaluation?.is_absent);
                        const slot = getTeamSlotInfo(team);
                        return (
                          <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="p-3.5 text-center text-gray-500 font-mono text-xs">{index + 1}</td>
                            <td className="p-3.5">
                              <p className="font-semibold text-white text-sm cursor-pointer hover:underline" onClick={() => {
                                setSelectedTeam(team);
                                setSlotDay(slot.day);
                                setSlotSession(slot.session);
                                setSlotSessionType(slot.sessionType);
                              }}>
                                {team.team_name}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{team.tl_email}</p>
                            </td>
                            <td className="p-3.5 font-mono text-xs font-semibold text-white">
                              {ps?.id || team.allocated_ps_id || 'N/A'}
                            </td>
                            <td className="p-3.5 text-center text-gray-300 font-mono text-xs">
                              Batch {slot.batchNumber || '-'}
                            </td>
                            <td className="p-3.5 text-center font-mono">
                              {isAbsent ? (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[11px] font-mono">
                                  Absent
                                </span>
                              ) : evaluation ? (
                                <span className="font-bold text-emerald-400 text-sm">{evaluation.total_score}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center text-gray-400 font-mono text-xs">
                              {evaluation?.update_count || 0}
                            </td>
                            <td className="p-3.5 text-right">
                              <button 
                                onClick={() => {
                                  setTeamToEvaluate(team);
                                  if (evaluation && !isAbsent) {
                                    setEvalScores({
                                      cat1: evaluation.cat1_score !== undefined && evaluation.cat1_score !== null ? evaluation.cat1_score : '',
                                      cat2: evaluation.cat2_score !== undefined && evaluation.cat2_score !== null ? evaluation.cat2_score : '',
                                      cat3: evaluation.cat3_score !== undefined && evaluation.cat3_score !== null ? evaluation.cat3_score : '',
                                      cat4: evaluation.cat4_score !== undefined && evaluation.cat4_score !== null ? evaluation.cat4_score : ''
                                    });
                                  } else {
                                    setEvalScores({ cat1: '', cat2: '', cat3: '', cat4: '' });
                                  }
                                  setEvalModalOpen(true);
                                }}
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                              >
                                {isAbsent ? 'Edit (Absent)' : evaluation ? 'Edit Marks' : 'Evaluate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'certificates' && (
            <motion.div 
              key="certificates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/50 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white">
                      <FileCheck size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Participation Certificates
                        <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white">
                          Evaluated Teams Only
                        </span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        Official 300 DPI high-resolution certificates (3300 × 2550). Preserves vector-sharp college stamps, signatures, and logos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/15">
                    <button
                      type="button"
                      onClick={() => setCertViewMode('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        certViewMode === 'preview'
                          ? 'bg-white text-black shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Eye size={13} />
                      <span>Generator & Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertViewMode('audit')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        certViewMode === 'audit'
                          ? 'bg-white text-black shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <FileCheck size={13} />
                      <span>Download Tracker</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        certViewMode === 'audit' ? 'bg-black text-white' : 'bg-white/10 text-gray-300'
                      }`}>
                        {evaluatedTeams.filter(t => getTeamDownloadStatus(t.id).downloaded).length}/{evaluatedTeams.length}
                      </span>
                    </button>
                  </div>

                  {certViewMode === 'preview' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadAllTeamCertificates('pdf')}
                        disabled={certGenerating || certMembers.length === 0}
                        className="bg-white hover:bg-gray-100 text-black px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                        title="Download 5 individual printable PDFs in a zip archive"
                      >
                        <FileCheck size={14} /> 5 Individual PDFs (.zip)
                      </button>
                      <button
                        onClick={() => handleDownloadAllTeamCertificates('png')}
                        disabled={certGenerating || certMembers.length === 0}
                        className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Download 5 individual 300 DPI PNGs in a zip archive"
                      >
                        <Download size={14} /> 5 Individual PNGs (.zip)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message Banner */}
              {certStatusMessage && (
                <div className="p-3.5 bg-black/60 border border-white/15 rounded-xl text-white text-xs font-mono flex items-center justify-between shadow-lg">
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-white" />
                    {certStatusMessage}
                  </span>
                  {certGenerating && <span className="animate-spin text-white">⏳</span>}
                </div>
              )}

              {/* VIEW MODE 1: PREVIEW & GENERATOR */}
              {certViewMode === 'preview' && (
                <div className="space-y-6">
                  {/* Team Selector Card */}
                  <div className="card p-5 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>1. Select Team</span>
                        <span className="text-[10px] text-gray-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/15 font-mono font-normal">
                          {teams.length} Registered Teams ({evaluatedTeams.length} Evaluated)
                        </span>
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Official Font: <strong className="text-white">Great Vibes (Single Calligraphy Script)</strong>
                      </span>
                    </div>

                    {teams.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-white/15 rounded-xl bg-white/[0.01] space-y-2">
                        <p className="text-sm font-semibold text-white">No Teams Found</p>
                      </div>
                    ) : (
                      <>
                        <select
                          value={certSelectedTeamId}
                          onChange={(e) => handleSelectCertTeam(e.target.value)}
                          className="w-full text-xs sm:text-sm border border-white/15 rounded-xl bg-black/80 py-3 px-4 text-white focus:border-white/40 focus:outline-none transition-colors"
                        >
                          {teams.map((t) => {
                            const evalData = evaluations.find(e => e.team_id === t.id);
                            const st = getTeamDownloadStatus(t.id);
                            const evalLabel = st.isEvaluated ? `Evaluated: ${evalData?.total_score}/100` : 'Non-Evaluated';
                            const accessLabel = st.isEvaluated ? '🔓 [Auto-Granted]' : (st.explicitGrant ? '🔓 [Admin-Granted]' : '🔒 [Access Locked]');
                            return (
                              <option key={t.id} value={t.id}>
                                {t.team_name} — TL: {t.tl_name || 'TL'} ({evalLabel} • PS: {t.allocated_ps_id || 'No PS'}) {accessLabel} {st.downloaded ? '✓ [Downloaded]' : ''}
                              </option>
                            );
                          })}
                        </select>

                        {certSelectedTeamId && (() => {
                          const selectedT = teams.find(t => t.id === certSelectedTeamId);
                          const evalData = evaluations.find(e => e.team_id === certSelectedTeamId);
                          const st = getTeamDownloadStatus(certSelectedTeamId);
                          return (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300">
                                Team: <strong className="text-white">{selectedT?.team_name}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300">
                                PS ID: <strong className="text-white">{selectedT?.allocated_ps_id || 'N/A'}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300">
                                Department: <strong className="text-white">{selectedT?.tl_department || 'N/A'}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-xs bg-white/10 border border-white/15 text-white font-mono">
                                Evaluation: <strong className={st.isEvaluated ? "text-emerald-400" : "text-amber-400"}>{st.isEvaluated ? `${evalData?.total_score} / 100` : 'Non-Evaluated'}</strong>
                              </span>
                              <span className={`px-2.5 py-1 rounded-lg text-xs border font-mono flex items-center gap-1 ${
                                st.accessGranted 
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              }`}>
                                {st.accessGranted ? <Unlock size={11} /> : <Lock size={11} />}
                                {st.isEvaluated ? 'Evaluated (Auto-Unlocked)' : (st.explicitGrant ? 'Non-Eval (Admin Unlocked)' : 'Non-Eval (Locked)')}
                              </span>
                              {st.downloaded ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs bg-white/10 text-white border border-white/20 flex items-center gap-1 font-mono">
                                  <CheckCircle2 size={12} className="text-emerald-400" /> Downloaded ({st.format} on {st.at})
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-xs bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1 font-mono">
                                  <Clock size={12} /> Pending Download
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* Notice Alerting that Names Can Be Edited */}
                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs text-gray-300 font-mono">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white shrink-0">
                        <Edit2 size={15} />
                      </div>
                      <div>
                        <span className="font-bold text-white">Names are editable:</span> You can click <strong className="text-white">"Edit Name"</strong> on any member card below to fix typos before downloading. Previews re-render automatically.
                      </div>
                    </div>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-white/10 border border-white/15 text-gray-300">
                      Live Re-render
                    </span>
                  </div>

                  {/* 5 Certificates Preview Gallery */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          2. Team Certificates ({certMembers.length} Autofilled Previews)
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          The team leader and 4 members are automatically populated. You can edit any name directly to fix typos.
                        </p>
                      </div>
                      {certLoadingPreviews && (
                        <span className="text-xs text-gray-300 flex items-center gap-1.5 font-mono animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> Rendering high-res previews...
                        </span>
                      )}
                    </div>

                    {/* Grid of 5 Certificates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {certMembers.map((m, idx) => {
                        const isTL = idx === 0;
                        const previewUrl = certPreviews[idx];
                        const adminInputId = `admin-cert-member-input-${idx}`;
                        return (
                          <div
                            key={idx}
                            className="card p-4 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl hover:border-white/20 transition-all space-y-3 flex flex-col justify-between"
                          >
                            {/* Card Header: Role & Actions */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 font-mono bg-white/10 text-white border border-white/10">
                                  {isTL ? 'Team Leader' : `Member ${idx}`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSingleCertPNG(m.name, m.role)}
                                    disabled={certGenerating}
                                    className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Download 300 DPI PNG"
                                  >
                                    <Download size={11} /> PNG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSingleCertPDF(m.name, m.role)}
                                    disabled={certGenerating}
                                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Download official PDF"
                                  >
                                    <FileCheck size={11} /> PDF
                                  </button>
                                </div>
                              </div>

                              {/* Editable Name Input with visible Edit button and label */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono px-0.5">
                                  <span>Full Name on Certificate:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(adminInputId);
                                      if (el) { el.focus(); (el as HTMLInputElement).select(); }
                                    }}
                                    className="text-[10px] text-white hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                  >
                                    <Edit2 size={10} /> Edit Name
                                  </button>
                                </div>
                                <div className="relative">
                                  <input
                                    id={adminInputId}
                                    type="text"
                                    value={m.name}
                                    onChange={(e) => handleUpdateMemberName(idx, e.target.value)}
                                    placeholder={`Enter ${m.role} Name`}
                                    className="w-full text-xs font-semibold bg-black/70 border border-white/15 rounded-xl py-2 pl-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all hover:border-white/30"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(adminInputId);
                                      if (el) { el.focus(); (el as HTMLInputElement).select(); }
                                    }}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1 cursor-pointer transition-all"
                                    title="Click to edit name"
                                  >
                                    <Edit2 size={10} /> Edit
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 px-1">
                                  <span>💡</span>
                                  <span>Click input or 'Edit' to change spelling</span>
                                </p>
                              </div>
                            </div>

                            {/* Certificate Image Preview */}
                            <div 
                              onClick={() => previewUrl && setZoomCertIndex(idx)}
                              className="relative aspect-[3300/2550] w-full overflow-hidden rounded-xl border border-white/10 bg-black/60 group cursor-pointer shadow-md"
                              title="Click to zoom and inspect high-res certificate"
                            >
                              {previewUrl ? (
                                <>
                                  <img
                                    src={previewUrl}
                                    alt={`Certificate for ${m.name}`}
                                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                                    <Eye size={16} /> Click to Inspect
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 text-xs font-mono">
                                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                  <span>Rendering...</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono pt-1">
                              <span>300 DPI Official Format</span>
                              <span className="text-gray-300 font-semibold">Font: Great Vibes</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW MODE 2: DOWNLOAD STATUS TRACKER */}
              {certViewMode === 'audit' && (
                <div className="space-y-5">
                  {/* Summary Metric Cards (4 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-5 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl space-y-1">
                      <span className="text-xs font-mono text-gray-400 block uppercase">Total Registered</span>
                      <strong className="text-2xl font-bold text-white block">{teams.length}</strong>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {evaluatedTeams.length} Evaluated • {teams.length - evaluatedTeams.length} Non-Evaluated
                      </span>
                    </div>

                    <div className="card p-5 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl space-y-1">
                      <span className="text-xs font-mono text-emerald-400 block uppercase flex items-center gap-1">
                        <CheckCircle2 size={12} /> Evaluated (Auto-Granted)
                      </span>
                      <strong className="text-2xl font-bold text-emerald-400 block">
                        {evaluatedTeams.length}
                      </strong>
                      <span className="text-[11px] text-gray-400 font-mono">
                        100% full download access (Never locked)
                      </span>
                    </div>

                    <div className="card p-5 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl space-y-1">
                      <span className="text-xs font-mono text-amber-400 block uppercase flex items-center gap-1">
                        <Unlock size={12} /> Non-Evaluated Access
                      </span>
                      <strong className="text-2xl font-bold text-amber-300 block">
                        {teams.filter(t => !isTeamEvaluated(t.id) && getTeamDownloadStatus(t.id).explicitGrant).length}
                      </strong>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Granted of {teams.length - evaluatedTeams.length} non-evaluated teams
                      </span>
                    </div>

                    <div className="card p-5 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl space-y-1">
                      <span className="text-xs font-mono text-gray-400 block uppercase flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" /> Completed Downloads
                      </span>
                      <strong className="text-2xl font-bold text-white block">
                        {teams.filter(t => getTeamDownloadStatus(t.id).downloaded).length}
                      </strong>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {teams.length > 0 
                          ? Math.round((teams.filter(t => getTeamDownloadStatus(t.id).downloaded).length / teams.length) * 100) 
                          : 0}% total claim rate
                      </span>
                    </div>
                  </div>

                  {/* Batch Access Controls Toolbar (Specifically for Non-Evaluated Teams) */}
                  <div className="card p-4 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          Non-Evaluated Team Certificate Access Controls
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono">
                          Evaluated teams have automatic access. Use these controls to give or revoke download access for all other non-evaluated teams.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleGrantNonEvaluatedAccess}
                        disabled={certGenerating || (teams.length - evaluatedTeams.length) === 0}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Allow all non-evaluated teams to download their certificates"
                      >
                        <Unlock size={14} /> Give Access to All Non-Evaluated
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeNonEvaluatedAccess}
                        disabled={certGenerating || (teams.length - evaluatedTeams.length) === 0}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Lock certificate download access for all non-evaluated teams"
                      >
                        <Lock size={14} /> Lock All Non-Evaluated
                      </button>
                    </div>
                  </div>

                  {/* Search and Filter Controls */}
                  <div className="card p-4 border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search team, TL email, or PS..."
                        className="w-full text-xs bg-black/60 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                      />
                      {auditSearch && (
                        <button
                          type="button"
                          onClick={() => setAuditSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setAuditFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'all' ? 'bg-white text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        All ({teams.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditFilter('evaluated')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'evaluated' ? 'bg-emerald-400 text-black font-bold' : 'bg-emerald-500/10 text-emerald-300 hover:text-white border border-emerald-500/20'
                        }`}
                      >
                        Evaluated ({evaluatedTeams.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditFilter('non_evaluated')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'non_evaluated' ? 'bg-amber-400 text-black font-bold' : 'bg-amber-500/10 text-amber-300 hover:text-white border border-amber-500/20'
                        }`}
                      >
                        Non-Evaluated ({teams.length - evaluatedTeams.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditFilter('non_eval_granted')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'non_eval_granted' ? 'bg-emerald-400 text-black font-bold' : 'bg-emerald-500/10 text-emerald-300 hover:text-white border border-emerald-500/20'
                        }`}
                      >
                        Non-Eval Granted ({teams.filter(t => !isTeamEvaluated(t.id) && getTeamDownloadStatus(t.id).explicitGrant).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditFilter('downloaded')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'downloaded' ? 'bg-white text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        Downloaded ({teams.filter(t => getTeamDownloadStatus(t.id).downloaded).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          auditFilter === 'pending' ? 'bg-white text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        Pending ({teams.filter(t => !getTeamDownloadStatus(t.id).downloaded).length})
                      </button>
                    </div>
                  </div>

                  {/* Audit Table */}
                  <div className="card border border-white/10 bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 uppercase text-[10px]">
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Team Name</th>
                            <th className="py-3 px-4">Team Leader Email</th>
                            <th className="py-3 px-4">PS ID</th>
                            <th className="py-3 px-4">Dept / Year</th>
                            <th className="py-3 px-4">Evaluation</th>
                            <th className="py-3 px-4 text-center">Download Access</th>
                            <th className="py-3 px-4">Download Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredAuditTeams.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-8 text-gray-500">
                                No teams match the selected filter.
                              </td>
                            </tr>
                          ) : (
                            filteredAuditTeams.map((team, idx) => {
                              const st = getTeamDownloadStatus(team.id);
                              const evalData = evaluations.find(e => e.team_id === team.id);
                              return (
                                <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
                                  <td className="py-3 px-4">
                                    <strong className="text-white block">{team.team_name}</strong>
                                    <span className="text-[10px] text-gray-400">
                                      {team.tl_name} • {(team.members?.length || 0) + 1} members
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-gray-300">{team.tl_email || '—'}</td>
                                  <td className="py-3 px-4 text-white font-bold">{team.allocated_ps_id || '—'}</td>
                                  <td className="py-3 px-4 text-gray-400">
                                    {team.tl_department || '—'} ({team.tl_year || '—'})
                                  </td>
                                  <td className="py-3 px-4">
                                    {st.isEvaluated ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                        <CheckCircle2 size={10} /> Graded ({evalData?.total_score}/100)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                        <Clock size={10} /> Non-Evaluated
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {st.isEvaluated ? (
                                      <span 
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        title="Evaluated teams are automatically authorized to download their certificates"
                                      >
                                        <CheckCircle2 size={11} /> Auto-Granted
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTeamAccess(team.id, st.explicitGrant)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                          st.explicitGrant
                                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                        }`}
                                        title={st.explicitGrant ? "Click to lock / revoke access for this non-evaluated team" : "Click to GIVE ACCESS for this non-evaluated team to download"}
                                      >
                                        {st.explicitGrant ? (
                                          <>
                                            <Unlock size={12} /> Granted (Revoke)
                                          </>
                                        ) : (
                                          <>
                                            <Lock size={12} /> Give Access
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {st.downloaded ? (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          <CheckCircle2 size={11} /> Downloaded ({st.format})
                                        </span>
                                        <div className="text-[10px] text-gray-400">
                                          {st.at}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-400 border border-white/10">
                                        <Clock size={11} /> Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCertSelectedTeamId(team.id);
                                          setCertViewMode('preview');
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Preview certificates for this team"
                                      >
                                        <Eye size={11} /> Preview
                                      </button>
                                      {st.downloaded && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to reset the download limit for team "${team.team_name}"?\nThis will allow the team leader to download their certificates again.`)) {
                                              handleResetDownloadLimit(team.id);
                                            }
                                          }}
                                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                                          title="Reset one-time download limit so team can download again"
                                        >
                                          <RefreshCw size={11} /> Reset Limit
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Full-Screen Zoom Inspection Modal */}
              {zoomCertIndex !== null && certMembers[zoomCertIndex] && (
                <div 
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
                  onClick={() => setZoomCertIndex(null)}
                >
                  <div 
                    className="relative max-w-5xl w-full bg-zinc-950 border border-white/20 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <span>High-Resolution Inspection:</span>
                          <span className="text-amber-400 font-mono">{certMembers[zoomCertIndex].name}</span>
                          <span className="text-xs text-gray-400">({certMembers[zoomCertIndex].role})</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">Vector-sharp preview of the 3300 × 2550 official certificate</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleCertPNG(certMembers[zoomCertIndex].name, certMembers[zoomCertIndex].role)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={13} /> PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleCertPDF(certMembers[zoomCertIndex].name, certMembers[zoomCertIndex].role)}
                          className="btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileCheck size={13} /> PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomCertIndex(null)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer ml-2"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="w-full max-h-[75vh] overflow-auto rounded-xl border border-white/10 bg-black flex items-center justify-center p-2">
                      {certPreviews[zoomCertIndex] ? (
                        <img
                          src={certPreviews[zoomCertIndex]}
                          alt="Certificate Zoom"
                          className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl"
                        />
                      ) : (
                        <div className="py-20 text-gray-400">Loading certificate...</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'logistics' && (
            <motion.div 
              key="logistics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-6"
            >
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Logistics & Coordinators</h2>
                    <button onClick={handleExportLogistics} className="flex items-center justify-center gap-2 btn-secondary text-sm shrink-0">
                      <Download size={16} /> Export to Excel
                    </button>
                    <button 
                      onClick={async () => {
                        const r = prompt(`Enter Room Number for ${logisticsDay}:`);
                        if (r && r.trim()) {
                          const { error } = await supabase.from('room_coordinators').upsert({
                            presentation_day: logisticsDay,
                            room_number: r.trim(),
                            faculty_coordinator: '',
                            student_coordinator: ''
                          }, { onConflict: 'presentation_day,room_number' });
                          if (error) alert("Error adding room: " + error.message);
                          else fetchCoordinators();
                        }
                      }} 
                      className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-4 py-2 text-sm shrink-0 transition-all font-medium"
                    >
                      <Plus size={16} /> Add Room Manually
                    </button>
                  </div>
                  <div className="flex flex-col w-full md:w-auto">
                      <select value={logisticsDay} onChange={e => setLogisticsDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-2 px-3 focus:ring-white/30 focus:border-white/30 text-white">
                        <option value="31st August">Day 1: 31st August</option>
                        <option value="1st September">Day 2: 1st September</option>
                        <option value="2nd September">Day 3: 2nd September</option>
                      </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Derive rooms based on PS assigned to this day OR manually added coordinators */}
                  {Array.from(new Set([
                    ...problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number).map(ps => ps.room_number),
                    ...coordinators.filter(c => c.presentation_day === logisticsDay && c.room_number).map(c => c.room_number)
                  ])).map(room => {
                    const coord = coordinators.find(c => c.presentation_day === logisticsDay && c.room_number === room) || {};
                    const assignedPS = problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number === room).map(ps => ps.id);
                    return (
                      <div key={room} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-shrink-0">
                          <h4 className="text-lg font-bold text-white">Room {room}</h4>
                          <p className="text-xs text-gray-400">
                            Problem Statements: {assignedPS.length > 0 ? assignedPS.join(', ') : 'None (Manually Added Room)'}
                          </p>
                        </div>

                        <div className="flex-grow flex gap-4 items-center">
                          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">

                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Faculty Coordinator</label>
                            <input 
                              type="text" 
                              defaultValue={coord.faculty_coordinator || ''}
                              onBlur={async (e) => {
                                await supabase.from('room_coordinators').upsert({
                                  presentation_day: logisticsDay,
                                  room_number: room,
                                  faculty_coordinator: e.target.value
                                }, { onConflict: 'presentation_day,room_number' });
                                fetchCoordinators();
                              }}
                              className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-white/30 text-white" 
                              placeholder="Name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Student Coordinator</label>
                            <input 
                              type="text" 
                              defaultValue={coord.student_coordinator || ''}
                              onBlur={async (e) => {
                                await supabase.from('room_coordinators').upsert({
                                  presentation_day: logisticsDay,
                                  room_number: room,
                                  student_coordinator: e.target.value
                                }, { onConflict: 'presentation_day,room_number' });
                                fetchCoordinators();
                              }}
                              className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-white/30 text-white" 
                              placeholder="Name"
                            />
                          </div>

                          </div>
                          {coord.id && (
                            <button 
                              onClick={() => handleDeleteCoordinators(logisticsDay, room)} 
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/30 transition-colors"
                              title="Delete Room & Coordinators"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {Array.from(new Set([
                    ...problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number).map(ps => ps.room_number),
                    ...coordinators.filter(c => c.presentation_day === logisticsDay && c.room_number).map(c => c.room_number)
                  ])).length === 0 && (
                    <div className="text-center p-8 border border-white/10 rounded-xl border-dashed">
                      <p className="text-gray-400">No rooms have been assigned or added for {logisticsDay} yet.</p>
                      <button 
                        onClick={async () => {
                          const r = prompt(`Enter Room Number for ${logisticsDay}:`);
                          if (r && r.trim()) {
                            const { error } = await supabase.from('room_coordinators').upsert({
                              presentation_day: logisticsDay,
                              room_number: r.trim(),
                              faculty_coordinator: '',
                              student_coordinator: ''
                            }, { onConflict: 'presentation_day,room_number' });
                            if (error) alert("Error adding room: " + error.message);
                            else fetchCoordinators();
                          }
                        }} 
                        className="mt-3 inline-flex items-center gap-2 btn-secondary text-sm"
                      >
                        <Plus size={16} /> Add Room Manually
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (() => {
            const activeTeams = teams.filter(t => t.allocated_ps_id);
            
            const ranked = activeTeams
              .map(t => {
                const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));
                const evalData = evaluations.find(e => e.team_id === t.id);
                const slot = getTeamSlotInfo(t);
                const isAbsent = Boolean(evalData?.scores?.is_absent || evalData?.is_absent);
                const isShortlisted = getEffectiveShortlistStatus(t.id, evalData);
                const isStaged = isTeamDraftChanged(t.id, evalData);
                const totalScore = (evalData && !isAbsent) ? Number(evalData.total_score) : null;
                return {
                  team: t,
                  ps,
                  evalData,
                  slot,
                  totalScore,
                  isAbsent,
                  isShortlisted,
                  isStaged,
                  isEvaluated: evalData !== undefined
                };
              })
              .filter(item => {
                if (leaderboardBatch !== 'All' && `Batch ${item.slot.batchNumber}` !== leaderboardBatch && item.slot.batchName !== leaderboardBatch) return false;
                if (leaderboardStatus === 'Shortlisted' && !item.isShortlisted) return false;
                if (leaderboardStatus === 'Evaluated' && (!item.isEvaluated || item.isAbsent)) return false;
                if (leaderboardStatus === 'Absent' && !item.isAbsent) return false;
                if (leaderboardPS !== 'All' && !isPSMatch(item.ps?.id || item.team.allocated_ps_id, leaderboardPS)) return false;
                if (leaderboardDept !== 'All' && item.team.tl_department !== leaderboardDept) return false;
                if (leaderboardYear !== 'All' && item.team.tl_year !== leaderboardYear) return false;
                if (leaderboardSearch) {
                  const query = leaderboardSearch.toLowerCase();
                  const matchesName = item.team.team_name.toLowerCase().includes(query);
                  const matchesTL = (item.team.tl_name || '').toLowerCase().includes(query);
                  const matchesPS = (item.ps?.id || '').toLowerCase().includes(query);
                  if (!matchesName && !matchesTL && !matchesPS) return false;
                }
                return true;
              })
              .sort((a, b) => {
                if (a.isAbsent && !b.isAbsent) return 1;
                if (!a.isAbsent && b.isAbsent) return -1;
                const scoreA = a.totalScore ?? -1;
                const scoreB = b.totalScore ?? -1;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return a.team.team_name.localeCompare(b.team.team_name);
              });

            const availableDepts = ['All', ...Array.from(new Set(teams.map(t => t.tl_department).filter(Boolean))).sort()];
            const availableYears = ['All', ...Array.from(new Set(teams.map(t => t.tl_year).filter(Boolean))).sort()];
            const availablePSList = ['All', ...Array.from(new Set(teams.map(t => t.allocated_ps_id).filter(Boolean))).sort()];

            const top3 = ranked.filter(r => r.totalScore !== null && !r.isAbsent).slice(0, 3);

            return (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="space-y-8"
              >
                {/* Header & Export */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Trophy className="text-amber-400" size={28} /> Evaluation Leaderboard
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 font-mono">
                      Live ranked standings. Shortlist teams and click "Commit Shortlist Changes" to publish.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {pendingShortlistCount > 0 && (
                      <button
                        onClick={() => {
                          setCommitCode('');
                          setCommitError('');
                          setCommitModalOpen(true);
                        }}
                        className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer animate-pulse"
                      >
                        <Lock size={15} /> Commit Shortlist Changes ({pendingShortlistCount})
                      </button>
                    )}
                    <button
                      onClick={handleExportLeaderboard}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Download size={14} /> Export Leaderboard
                    </button>
                  </div>
                </div>

                {/* Top 3 Podium Cards */}
                {top3.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {top3.map((item, idx) => {
                      const rank = idx + 1;
                      const badgeBorder = rank === 1 ? 'border-amber-400/30 bg-amber-500/5' : rank === 2 ? 'border-gray-400/30 bg-white/5' : 'border-amber-700/30 bg-amber-800/5';
                      const medalColor = rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-gray-200' : 'text-amber-500';
                      const medalTitle = rank === 1 ? '1st Place 🥇' : rank === 2 ? '2nd Place 🥈' : '3rd Place 🥉';

                      return (
                        <div key={item.team.id} className={`card border ${badgeBorder} relative overflow-hidden p-5 space-y-4 rounded-2xl bg-white/[0.02]`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeBorder} ${medalColor}`}>
                                  {medalTitle}
                                </span>
                                {item.isShortlisted && (
                                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    item.isStaged 
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' 
                                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    <CheckCircle2 size={10} /> {item.isStaged ? 'Shortlisted (Draft)' : 'Shortlisted'}
                                  </span>
                                )}
                              </div>
                              <h4 
                                className="text-lg font-bold text-white mt-2 cursor-pointer hover:underline transition-all"
                                onClick={() => {
                                  setSelectedTeam(item.team);
                                  setSlotDay(item.slot.day);
                                  setSlotSession(item.slot.session);
                                  setSlotSessionType(item.slot.sessionType);
                                  setSlotBatch(item.slot.batchName || getBatchFromDaySession(item.slot.day, item.slot.session));
                                }}
                                title="Click to view team details"
                              >
                                {item.team.team_name}
                              </h4>
                              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{item.ps?.id} • {item.team.tl_name}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-emerald-400 font-mono">{item.totalScore}</span>
                              <span className="text-[10px] text-gray-500 block font-mono">/ 100</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-white/5 text-gray-400 font-mono">
                            <div>Batch: <strong className="text-white">Batch {item.slot.batchNumber}</strong></div>
                            <div>Room: <strong className="text-white">{item.slot.roomNumber}</strong></div>
                            <div>Dept: <strong className="text-white">{item.team.tl_department || 'N/A'}</strong></div>
                            <div>Year: <strong className="text-white">{item.team.tl_year || 'N/A'}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Filters & Leaderboard Table */}
                <div className="card overflow-hidden p-0 border border-white/10 bg-white/[0.02]">
                  <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/[0.01]">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Batch Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Batch</label>
                        <select
                          value={leaderboardBatch}
                          onChange={(e) => setLeaderboardBatch(e.target.value)}
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[120px]"
                        >
                          <option value="All">All Batches</option>
                          <option value="Batch 1">Batch 1</option>
                          <option value="Batch 2">Batch 2</option>
                          <option value="Batch 3">Batch 3</option>
                          <option value="Batch 4">Batch 4</option>
                          <option value="Batch 5">Batch 5</option>
                          <option value="Batch 6">Batch 6</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Status</label>
                        <select
                          value={leaderboardStatus}
                          onChange={(e) => setLeaderboardStatus(e.target.value)}
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[110px]"
                        >
                          <option value="All">All Status</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Evaluated">Evaluated</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </div>

                      {/* Problem Statement Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Problem Statement</label>
                        <select
                          value={leaderboardPS}
                          onChange={(e) => setLeaderboardPS(e.target.value)}
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[140px]"
                        >
                          {availablePSList.map(ps => (
                            <option key={ps} value={ps}>{ps === 'All' ? 'All Statements' : ps}</option>
                          ))}
                        </select>
                      </div>

                      {/* Department Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Department</label>
                        <select
                          value={leaderboardDept}
                          onChange={(e) => setLeaderboardDept(e.target.value)}
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[120px]"
                        >
                          {availableDepts.map(d => (
                            <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Academic Year Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Academic Year</label>
                        <select
                          value={leaderboardYear}
                          onChange={(e) => setLeaderboardYear(e.target.value)}
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[100px]"
                        >
                          {availableYears.map(y => (
                            <option key={y} value={y}>{y === 'All' ? 'All Years' : `Year ${y}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative min-w-[220px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search team, TL or PS..."
                        value={leaderboardSearch}
                        onChange={(e) => setLeaderboardSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-white/10 rounded-lg bg-black/40 text-white placeholder-gray-500 focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Ranked Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.02]">
                          <th className="p-3.5 w-12 text-center">#</th>
                          <th className="p-3.5">Team & Presentation Info</th>
                          <th className="p-3.5">Problem Statement</th>
                          <th className="p-3.5">Leader Details</th>
                          <th className="p-3.5 text-center">Category Breakdown</th>
                          <th className="p-3.5 text-center">Total Score (100)</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((item, index) => {
                          const rank = index + 1;
                          return (
                            <tr key={item.team.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="p-3.5 text-center font-mono text-gray-500">
                                {item.isAbsent ? (
                                  <span className="text-gray-600">-</span>
                                ) : item.totalScore !== null ? (
                                  <span className={`font-bold ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {rank}
                                  </span>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <p 
                                  className="font-bold text-white text-sm cursor-pointer hover:underline"
                                  onClick={() => {
                                    setSelectedTeam(item.team);
                                    setSlotDay(item.slot.day);
                                    setSlotSession(item.slot.session);
                                    setSlotSessionType(item.slot.sessionType);
                                    setSlotBatch(item.slot.batchName || getBatchFromDaySession(item.slot.day, item.slot.session));
                                  }}
                                  title="Click to view team details"
                                >
                                  {item.team.team_name}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                                  Batch {item.slot.batchNumber} • Room {item.slot.roomNumber}
                                </p>
                              </td>
                              <td className="p-3.5 font-mono text-xs text-white">
                                <span className="font-semibold">{item.ps?.id || item.team.allocated_ps_id || 'N/A'}</span>
                                {item.ps?.title && <span className="text-gray-400 block text-[11px] truncate max-w-[200px]">{item.ps.title}</span>}
                              </td>
                              <td className="p-3.5">
                                <p className="text-gray-300 font-medium">{item.team.tl_name || '-'}</p>
                                <p className="text-[11px] text-gray-400 font-mono">{item.team.tl_department || 'N/A'} • {item.team.tl_year || 'N/A'}</p>
                              </td>
                              <td className="p-3.5 text-center font-mono text-[11px] text-gray-400">
                                {item.isAbsent ? (
                                  <span className="text-rose-400 font-semibold italic">Absent</span>
                                ) : item.evalData ? (
                                  <div className="flex justify-center gap-2.5">
                                    <span>C1: <strong className="text-white">{item.evalData.cat1_score}</strong></span>
                                    <span>C2: <strong className="text-white">{item.evalData.cat2_score}</strong></span>
                                    <span>C3: <strong className="text-white">{item.evalData.cat3_score}</strong></span>
                                    <span>C4: <strong className="text-white">{item.evalData.cat4_score}</strong></span>
                                  </div>
                                ) : (
                                  <span className="text-gray-600 italic">Not Evaluated</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center font-mono">
                                {item.isAbsent ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs font-mono">Absent</span>
                                ) : item.totalScore !== null ? (
                                  <span className="font-bold text-emerald-400 text-sm">{item.totalScore}</span>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                {item.isShortlisted ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStageShortlistToggle(item.team.id, item.evalData);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ml-auto cursor-pointer ${
                                      item.isStaged
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                                    }`}
                                    title={item.isStaged ? "Staged for Shortlist (Pending Commit)" : "Currently Shortlisted in Database"}
                                  >
                                    <CheckCircle2 size={13} className="text-emerald-400" />
                                    {item.isStaged ? 'Shortlisted (Draft)' : 'Shortlisted'}
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStageShortlistToggle(item.team.id, item.evalData);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all inline-flex items-center gap-1.5 ml-auto cursor-pointer ${
                                      item.isStaged
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                                    }`}
                                    title={item.isStaged ? "Staged for Removal (Pending Commit)" : "Click to stage for shortlisting"}
                                  >
                                    {item.isStaged ? 'Removed (Draft)' : '+ Shortlist'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {ranked.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400">
                              No teams matched the selected leaderboard filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {activeTab === 'shortlisted' && (() => {
            const shortlistedTeams = teams.filter(t => {
              const evalData = evaluations.find(e => e.team_id === t.id);
              if (!getEffectiveShortlistStatus(t.id, evalData)) return false;
              const ps = problemStatements.find(p => isPSMatch(p.id, t.allocated_ps_id));

              if (shortlistPS !== 'All' && !isPSMatch(ps?.id || t.allocated_ps_id, shortlistPS)) return false;
              if (shortlistDept !== 'All' && t.tl_department !== shortlistDept) return false;
              if (shortlistSearch) {
                const query = shortlistSearch.toLowerCase().trim();
                const matchesName = (t.team_name || '').toLowerCase().includes(query);
                const matchesTL = (t.tl_name || '').toLowerCase().includes(query) || (t.tl_email || '').toLowerCase().includes(query);
                const matchesPS = (ps?.id || t.allocated_ps_id || '').toLowerCase().includes(query);
                if (!matchesName && !matchesTL && !matchesPS) return false;
              }
              return true;
            });

            const totalShortlistedCount = teams.filter(t => {
              const evalData = evaluations.find(e => e.team_id === t.id);
              return getEffectiveShortlistStatus(t.id, evalData);
            }).length;

            return (
              <motion.div
                key="shortlisted"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="space-y-6"
              >
                {/* Header & Export Options */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Award className="text-white" size={28} /> Shortlisted Teams
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 font-mono">
                      Teams shortlisted for the further round of Code Storm 2026 ({totalShortlistedCount} total shortlisted)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {pendingShortlistCount > 0 && (
                      <button
                        onClick={() => {
                          setCommitCode('');
                          setCommitError('');
                          setCommitModalOpen(true);
                        }}
                        className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer animate-pulse"
                      >
                        <Lock size={14} /> Commit Changes ({pendingShortlistCount})
                      </button>
                    )}
                    <button
                      onClick={handleExportAllShortlisted}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      title="Export all shortlisted teams across all statements"
                    >
                      <Download size={14} /> Export All Shortlisted
                    </button>
                    <button
                      onClick={handleExportStatementWiseShortlisted}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      title="Export multi-sheet Excel with individual sheets per statement"
                    >
                      <Layers size={14} /> Export Statement-Wise
                    </button>
                  </div>
                </div>

                {/* Filter bar and Table Container */}
                <div className="card overflow-hidden p-0 border border-white/10 bg-white/[0.02]">
                  <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/[0.01]">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Problem Statement Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Problem Statement</label>
                        <select 
                          value={shortlistPS} 
                          onChange={e => setShortlistPS(e.target.value)} 
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[140px]"
                        >
                          <option value="All">All Statements</option>
                          {allocatedProblemStatements.filter(p => p !== 'All').map(ps => (
                            <option key={ps} value={ps}>{ps}</option>
                          ))}
                        </select>
                      </div>

                      {/* Department Filter */}
                      <div className="flex flex-col">
                        <label className="text-[11px] text-gray-400 font-medium mb-1">Department</label>
                        <select 
                          value={shortlistDept} 
                          onChange={e => setShortlistDept(e.target.value)} 
                          className="text-xs border-white/10 rounded-lg bg-black/40 border py-1.5 px-2.5 text-gray-200 focus:border-white/30 min-w-[120px]"
                        >
                          <option value="All">All Departments</option>
                          {Array.from(new Set(teams.map(t => t.tl_department).filter(Boolean))).sort().map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative min-w-[220px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search team, TL or PS..."
                        value={shortlistSearch}
                        onChange={(e) => setShortlistSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-white/10 rounded-lg bg-black/40 text-white placeholder-gray-500 focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.02]">
                          <th className="p-3.5 w-12 text-center">#</th>
                          <th className="p-3.5">Team Details</th>
                          <th className="p-3.5">Problem Statement</th>
                          <th className="p-3.5 text-center">Score (100)</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortlistedTeams.map((team, index) => {
                          const ps = problemStatements.find(p => isPSMatch(p.id, team.allocated_ps_id));
                          const evaluation = evaluations.find(e => e.team_id === team.id);
                          const slot = getTeamSlotInfo(team);
                          const isStaged = isTeamDraftChanged(team.id, evaluation);

                          return (
                            <tr 
                              key={team.id} 
                              onClick={() => {
                                setSelectedTeam(team);
                                setSlotDay(slot.day);
                                setSlotSession(slot.session);
                                setSlotSessionType(slot.sessionType);
                                setSlotBatch(slot.batchName || getBatchFromDaySession(slot.day, slot.session));
                              }}
                              className="border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                            >
                              <td className="p-3.5 text-center text-gray-500 font-mono text-xs">{index + 1}</td>
                              <td className="p-3.5">
                                <p className="font-semibold text-white text-sm hover:underline">
                                  {team.team_name}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{team.tl_name} ({team.tl_email})</p>
                              </td>
                              <td className="p-3.5 font-mono text-xs font-semibold text-white">
                                {ps?.id || team.allocated_ps_id || 'N/A'}{ps?.title ? ` • ${ps.title}` : ''}
                              </td>
                              <td className="p-3.5 text-center font-mono">
                                {evaluation ? (
                                  <span className="font-bold text-white text-sm">{evaluation.total_score}</span>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                                  isStaged
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-white/10 text-white border-white/15'
                                }`}>
                                  <CheckCircle2 size={12} /> {isStaged ? 'Shortlisted (Draft)' : 'Shortlisted'}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStageShortlistToggle(team.id, evaluation);
                                  }}
                                  className="bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-300 border border-white/10 hover:border-red-500/20 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                  title="Remove from shortlisted teams"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {shortlistedTeams.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-gray-400 space-y-3">
                              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                                <Award size={24} />
                              </div>
                              <p className="text-sm font-semibold text-gray-300">
                                {totalShortlistedCount === 0 ? 'No teams have been shortlisted yet.' : 'No shortlisted teams match your filter.'}
                              </p>
                              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Go to the Leaderboard tab and click Shortlist on any team to add them.
                              </p>
                              {totalShortlistedCount === 0 && (
                                <button
                                  onClick={() => setActiveTab('leaderboard')}
                                  className="mt-2 btn-secondary text-xs px-4 py-2 cursor-pointer"
                                >
                                  Go to Leaderboard →
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </main>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="card w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Team Details</h3>
              <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{selectedTeam.team_name}</h4>
                {(() => {
                  const psObj = problemStatements.find(p => isPSMatch(p.id, selectedTeam.allocated_ps_id));
                  const selSlot = getTeamSlotInfo(selectedTeam);
                  const evalData = evaluations.find(e => e.team_id === selectedTeam.id);
                  const isAbsent = Boolean(evalData?.scores?.is_absent || evalData?.is_absent);

                  return (
                    <div className="space-y-2.5 mt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/10">
                          {selectedTeam.allocated_ps_id ? `PS: ${selectedTeam.allocated_ps_id}` : 'PS: Pending'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Batch {selSlot.batchNumber || '-'} ({selSlot.batchName})
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-white/5 text-gray-300 border border-white/10">
                          Room {selSlot.roomNumber}
                        </span>
                        {isAbsent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            ABSENT
                          </span>
                        ) : evalData ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Score: {evalData.total_score} / 100
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono text-gray-400 bg-white/5 border border-white/10">
                            Evaluation Pending
                          </span>
                        )}
                      </div>

                      {psObj && (
                        <div className="bg-white/[0.03] p-3 rounded-xl border border-white/10 text-xs">
                          <p className="text-white font-semibold flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold">{psObj.id}:</span>
                            {psObj.title}
                          </p>
                          {psObj.description && (
                            <p className="text-gray-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                              {psObj.description}
                            </p>
                          )}
                        </div>
                      )}

                      {evalData && !isAbsent && (
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 text-xs grid grid-cols-4 gap-2 text-center font-mono">
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <p className="text-[10px] text-gray-400">{getCategoryName(0)}</p>
                            <p className="font-bold text-white text-sm mt-0.5">{evalData.cat1_score}</p>
                          </div>
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <p className="text-[10px] text-gray-400">{getCategoryName(1)}</p>
                            <p className="font-bold text-white text-sm mt-0.5">{evalData.cat2_score}</p>
                          </div>
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <p className="text-[10px] text-gray-400">{getCategoryName(2)}</p>
                            <p className="font-bold text-white text-sm mt-0.5">{evalData.cat3_score}</p>
                          </div>
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <p className="text-[10px] text-gray-400">{getCategoryName(3)}</p>
                            <p className="font-bold text-white text-sm mt-0.5">{evalData.cat4_score}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Team Leader</h5>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-blue-400/60 text-xs">Name</p>
                    <p className="font-semibold text-white">{selectedTeam.tl_name}</p>
                  </div>
                  <div>
                    <p className="text-blue-400/60 text-xs">Mobile</p>
                    <p className="font-semibold text-white">{selectedTeam.tl_mobile || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-400/60 text-xs">Email</p>
                    <p className="font-semibold text-white">{selectedTeam.tl_email}</p>
                  </div>
                  <div>
                    <p className="text-blue-400/60 text-xs">Department</p>
                    <p className="font-medium text-white">{selectedTeam.tl_department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-blue-400/60 text-xs">Year</p>
                    <p className="font-medium text-white">{selectedTeam.tl_year || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Shortlist Status Toggle Card */}
              {(() => {
                const evalData = evaluations.find(e => e.team_id === selectedTeam.id);
                const isShortlisted = getEffectiveShortlistStatus(selectedTeam.id, evalData);
                const isStaged = isTeamDraftChanged(selectedTeam.id, evalData);

                return (
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    isShortlisted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isShortlisted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                        <Award size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Next Round Shortlist Status</p>
                        <p className="text-[11px] text-gray-400">
                          {isShortlisted 
                            ? isStaged ? 'Staged to Shortlist (Pending Master Code Commit)' : 'Team is Shortlisted for Further Round'
                            : isStaged ? 'Staged to Remove (Pending Master Code Commit)' : 'Team is not shortlisted yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStageShortlistToggle(selectedTeam.id, evalData)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isShortlisted 
                          ? isStaged
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' 
                          : isStaged
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {isShortlisted 
                        ? (isStaged ? 'Shortlisted (Draft)' : '✓ Shortlisted')
                        : (isStaged ? 'Removed (Draft)' : '+ Shortlist Team')}
                    </button>
                  </div>
                );
              })()}

              {selectedTeam.members && selectedTeam.members.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Team Members</h5>
                  <ul className="space-y-2">
                    {selectedTeam.members.map((member: string, i: number) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-200 bg-black/40 px-4 py-2.5 rounded-lg border border-white/10">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i+1}</div>
                        {member}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-white/10 bg-white/5/50 flex justify-end">
              <button 
                type="button" 
                onClick={() => setSelectedTeam(null)} 
                className="btn-secondary text-sm px-6 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortlist Commit Master Code Authorization Modal */}
      {commitModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="card w-full max-w-md border border-white/15 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-white" size={20} />
                <h3 className="text-base font-bold text-white">Commit Shortlist Changes</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCommitModalOpen(false);
                  setCommitCode('');
                  setCommitError('');
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCommitShortlistChanges} className="p-6 space-y-4">
              <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Pending Changes:</span>
                  <span className="font-mono font-bold px-2.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingShortlistCount} Team{pendingShortlistCount > 1 ? 's' : ''} Staged
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                  You are about to permanently save and publish all shortlisted teams to the database. Participants checking their status will see this live.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-gray-300 font-medium block">
                  Enter Master Admin Code to Confirm (INDUS):
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter INDUS..."
                    value={commitCode}
                    onChange={(e) => {
                      setCommitCode(e.target.value);
                      setCommitError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
              </div>

              {commitError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                  {commitError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setCommitModalOpen(false);
                    setCommitCode('');
                    setCommitError('');
                  }}
                  className="btn-secondary text-xs px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={committingBatch || !commitCode.trim()}
                  className="btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {committingBatch ? 'Saving & Publishing...' : 'Confirm & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar when there are pending shortlist changes */}
      {pendingShortlistCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-bold font-mono text-white">
              {pendingShortlistCount} Unsaved Shortlist Change{pendingShortlistCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDraftShortlistMap({})}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button 
              onClick={() => {
                setCommitCode('');
                setCommitError('');
                setCommitModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-gray-200 transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Lock size={13} /> Commit Changes
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="card w-full max-w-md overflow-hidden">
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              (modalType === 'delete' || modalType === 'delete-team') ? 'border-red-500/20' : 
              (modalType === 'edit' || modalType === 'edit-team') ? 'border-blue-500/20' : 'border-emerald-500/20'
            }`}>
              <h3 className={`text-lg font-bold ${
                (modalType === 'delete' || modalType === 'delete-team') ? 'text-red-400' : 
                (modalType === 'edit' || modalType === 'edit-team') ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {modalType === 'delete' ? 'Delete Statement' : 
                 modalType === 'edit' ? 'Edit Statement' : 
                 modalType === 'delete-team' ? 'Delete Team' : 
                 modalType === 'edit-team' ? 'Edit Team Details' : 'Add Team Manually'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-4">
                  {modalType === 'delete' ? (
                    <>
                      <span className="font-bold text-red-600">CRITICAL WARNING:</span> Are you sure you want to permanently delete Problem Statement <strong>{modalPS?.id}</strong>? All teams allocated to this statement will be unassigned.
                    </>
                  ) : modalType === 'edit' ? (
                    <>
                      You are about to edit Problem Statement <strong>{modalPS?.id}</strong>.
                    </>
                  ) : modalType === 'delete-team' ? (
                    <>
                      <span className="font-bold text-red-600">CRITICAL WARNING:</span> Are you sure you want to permanently delete Team <strong>{selectedTeam?.team_name}</strong>?
                    </>
                  ) : modalType === 'edit-team' ? (
                    <>
                      You are about to edit details for Team <strong>{selectedTeam?.team_name}</strong>.
                    </>
                  ) : (
                    <>
                      Add a new team manually. This is useful for overriding or adding missing entries.
                    </>
                  )}
                </p>

                {(modalType === 'add' || modalType === 'edit-team') && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Team Name</label>
                      <input 
                        type="text" 
                        required
                        value={newTeam.team_name}
                        onChange={(e) => setNewTeam({...newTeam, team_name: e.target.value})}
                        className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg w-full text-sm"
                        placeholder="e.g. Code Wizards"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Team Leader Email</label>
                      <input 
                        type="email" 
                        required
                        value={newTeam.tl_email}
                        onChange={(e) => setNewTeam({...newTeam, tl_email: e.target.value})}
                        className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg w-full text-sm"
                        placeholder="leader@example.com"
                      />
                    </div>
                  </div>
                )}

                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Master Code</label>
                <input 
                  type="password" 
                  placeholder="Enter INDUS to proceed"
                  required
                  value={modalCode}
                  onChange={(e) => setModalCode(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg w-full text-sm"
                />
                {modalError && <p className="text-xs font-medium text-red-500 mt-2">{modalError}</p>}
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary py-2 px-4">Cancel</button>
                <button type="submit" className={`py-2 px-6 rounded-xl font-bold text-white transition-all ${
                  (modalType === 'delete' || modalType === 'delete-team') ? 'bg-red-600 hover:bg-red-700 text-white' : 
                  modalType === 'add' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}>
                  {modalType === 'delete' ? 'Delete Statement' : 
                   modalType === 'edit' ? 'Proceed to Edit' : 
                   modalType === 'delete-team' ? 'Delete Team' : 
                   modalType === 'edit-team' ? 'Save Changes' : 'Add Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
            {/* Revoke Admin Confirmation */}
      {revokeAdminEmail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2">Revoke Admin Access?</h3>
            <p className="text-gray-300 text-sm mb-6">Are you sure you want to revoke admin privileges for <strong>{revokeAdminEmail}</strong>?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRevokeAdminEmail(null)} className="btn-secondary text-sm px-6">Cancel</button>
              <button onClick={handleRevokeAdmin} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-6 rounded-lg transition-all duration-300 text-sm">Revoke Access</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Visitor Modal */}
      {visitorModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="card max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col bg-[#0d0e14] border border-white/15 shadow-2xl"
          >
            {/* Header & Tabs */}
            <div className="px-6 pt-5 pb-4 border-b border-white/10 shrink-0 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-gray-300" /> Website Visitors
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Tracking logins and visits to the platform.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (window.confirm("Clear all previous visitor logs and start fresh monitoring for View Allocation from now?")) {
                        try {
                          const { error } = await supabase.from('site_visits').delete().neq('email', '');
                          if (error) {
                            alert("Error resetting logs: " + error.message);
                          } else {
                            alert("Visitor logs cleared successfully! Now tracking all new visits.");
                            fetchVisitors();
                          }
                        } catch (err: any) {
                          alert("Error: " + err.message);
                        }
                      }
                    }}
                    className="text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                  >
                    Reset Logs
                  </button>
                  <button 
                    onClick={() => setVisitorModalOpen(false)} 
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Segmented Tabs */}
              <div className="flex gap-2 border-b border-white/5 pb-1">
                <button
                  onClick={() => setVisitorTab('LEADERS')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    visitorTab === 'LEADERS'
                      ? 'bg-white/15 text-white shadow-sm border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users size={14} /> Team Leaders
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-gray-300 font-mono">
                    {visitorData.knownLeaders.length}
                  </span>
                </button>

                <button
                  onClick={() => setVisitorTab('ADMINS')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    visitorTab === 'ADMINS'
                      ? 'bg-white/15 text-white shadow-sm border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Admins
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-gray-300 font-mono">
                    {visitorData.admins.length}
                  </span>
                </button>

                <button
                  onClick={() => setVisitorTab('UNKNOWN')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    visitorTab === 'UNKNOWN'
                      ? 'bg-white/15 text-white shadow-sm border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Other Visitors
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-gray-300 font-mono">
                    {visitorData.unknownVisitors.length}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            {loadingVisitors ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
                <p className="text-xs text-gray-400">Loading visitors data...</p>
              </div>
            ) : (
              <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1 text-xs">
                {/* Tab 1: Team Leaders */}
                {visitorTab === 'LEADERS' && (() => {
                  const visitedCount = visitorData.knownLeaders.filter(l => l.visited).length;
                  const unvisitedCount = visitorData.knownLeaders.filter(l => !l.visited).length;

                  const filteredLeaders = visitorData.knownLeaders.filter(leader => {
                    const matchesFilter = 
                      knownFilter === 'ALL' ? true :
                      knownFilter === 'VISITED' ? leader.visited : !leader.visited;
                    
                    const query = knownSearch.toLowerCase().trim();
                    const matchesSearch = !query || 
                      leader.team_name.toLowerCase().includes(query) ||
                      leader.tl_name.toLowerCase().includes(query) ||
                      leader.tl_email.toLowerCase().includes(query) ||
                      leader.tl_mobile.includes(query);

                    return matchesFilter && matchesSearch;
                  });

                  return (
                    <div className="space-y-4">
                      {/* Filter Bar & Search */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/10">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setKnownFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              knownFilter === 'ALL'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white bg-white/5'
                            }`}
                          >
                            All ({visitorData.knownLeaders.length})
                          </button>
                          <button
                            onClick={() => setKnownFilter('VISITED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              knownFilter === 'VISITED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-gray-400 hover:text-emerald-300 bg-white/5'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Visited ({visitedCount})
                          </button>
                          <button
                            onClick={() => setKnownFilter('UNVISITED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              knownFilter === 'UNVISITED'
                                ? 'bg-white/15 text-white'
                                : 'text-gray-400 hover:text-white bg-white/5'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Unvisited ({unvisitedCount})
                          </button>
                        </div>

                        <div className="relative min-w-[240px]">
                          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                          <input
                            type="text"
                            placeholder="Search by team, TL name, email..."
                            value={knownSearch}
                            onChange={(e) => setKnownSearch(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-1.5 bg-black/40 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:border-white/30"
                          />
                        </div>
                      </div>

                      {/* Leaders Table */}
                      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                        {filteredLeaders.map(leader => (
                          <div key={leader.id} className="p-3.5 hover:bg-white/[0.03] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white text-sm">{leader.team_name}</p>
                                <span className="text-xs text-gray-400 font-normal">({leader.tl_name})</span>
                              </div>
                              <p className="text-[11px] text-gray-400 font-mono">
                                {leader.tl_email} • {leader.tl_mobile} • {leader.tl_department} ({leader.tl_year})
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center gap-4">
                              <div className="text-right">
                                {leader.visited ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Visited
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Not Visited
                                  </span>
                                )}
                                <p className="text-[10px] text-gray-400 font-mono mt-1">
                                  {formatVisitTime(leader.last_visited_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {filteredLeaders.length === 0 && (
                          <div className="p-8 text-center text-xs text-gray-400">
                            No team leaders matched the filter.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Tab 2: Admins */}
                {visitorTab === 'ADMINS' && (
                  <div className="space-y-3">
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                      {visitorData.admins.map((admin: any) => (
                        <div key={admin.email} className="p-3.5 flex items-center justify-between hover:bg-white/[0.03]">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-white text-sm">{admin.email}</p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              Last active: {formatVisitTime(admin.last_visited_at)}
                            </p>
                          </div>

                          {admin.email !== session.user.email && (
                            <button 
                              onClick={() => handleRevokeAdmin(admin.email)} 
                              className="text-red-400 hover:text-red-300 text-xs px-3 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors font-medium"
                            >
                              Revoke Admin
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Other Visitors */}
                {visitorTab === 'UNKNOWN' && (
                  <div className="space-y-3">
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                      {visitorData.unknownVisitors.length === 0 && (
                        <div className="p-8 text-center text-xs text-gray-400">No unrecognized visitor logs recorded.</div>
                      )}
                      {visitorData.unknownVisitors.map((visitor: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex justify-between items-center hover:bg-white/[0.03]">
                          <p className="font-semibold text-white">{visitor.email}</p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {formatVisitTime(visitor.last_visited_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evalModalOpen && teamToEvaluate && (() => {
        const evalSlot = getTeamSlotInfo(teamToEvaluate);
        const norm = getDayNormalized(evalSlot.day);
        let fnType = evalSettings?.day1_fn_type || 'PPT';
        let anType = evalSettings?.day1_an_type || 'Prototype';
        if (norm === '1st September') {
          fnType = evalSettings?.day2_fn_type || 'Prototype';
          anType = evalSettings?.day2_an_type || 'PPT';
        } else if (norm === '2nd September') {
          fnType = evalSettings?.day3_fn_type || 'PPT';
          anType = evalSettings?.day3_an_type || 'Prototype';
        }

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
            <div className="card w-full max-w-md overflow-hidden border-white/30/30">
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Evaluate: {teamToEvaluate.team_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-semibold bg-white/10 text-white px-2 py-0.5 rounded border border-white/10">
                      {evalSlot.badgeLabel} • {evalSlot.sessionType}
                    </span>
                    <span className="text-xs text-gray-400">
                      Room: {evalSlot.roomNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono mt-1">
                    Schedule: FN = {fnType} | AN = {anType}
                  </p>
                </div>
                <button type="button" onClick={() => setEvalModalOpen(false)} className="text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-black/30 backdrop-blur-xl/10">
                  <X size={20} />
                </button>
              </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingEval(true);
                const c1 = Number(evalScores.cat1) || 0;
                const c2 = Number(evalScores.cat2) || 0;
                const c3 = Number(evalScores.cat3) || 0;
                const c4 = Number(evalScores.cat4) || 0;
                const total = c1 + c2 + c3 + c4;
                
                const existingEval = evaluations.find(e => e.team_id === teamToEvaluate.id);
                const evalData = {
                  team_id: teamToEvaluate.id,
                  cat1_score: c1,
                  cat2_score: c2,
                  cat3_score: c3,
                  cat4_score: c4,
                  total_score: total,
                  scores: { ...(existingEval?.scores || {}), is_absent: false },
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1,
                  evaluated_at: new Date().toISOString()
                };

                const { error } = await supabase.from('evaluations').upsert(evalData, { onConflict: 'team_id' });
                
                setSavingEval(false);
                if (error) {
                  alert("Error saving evaluation: " + error.message);
                } else {
                  alert("Evaluation saved successfully!");
                  setEvalModalOpen(false);
                  fetchEvalData();
                }
              }} 
              className="p-6"
            >
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-300">Assign marks out of 25 for each category.</p>
                  {teamToEvaluate && evaluations.find(e => e.team_id === teamToEvaluate.id)?.scores?.is_absent && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs font-mono">
                      Currently ABSENT
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(0)}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25" 
                    placeholder="0"
                    value={evalScores.cat1 ?? ''} 
                    onChange={e => setEvalScores({...evalScores, cat1: e.target.value})} 
                    className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" 
                  />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(1)}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25" 
                    placeholder="0"
                    value={evalScores.cat2 ?? ''} 
                    onChange={e => setEvalScores({...evalScores, cat2: e.target.value})} 
                    className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" 
                  />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(2)}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25" 
                    placeholder="0"
                    value={evalScores.cat3 ?? ''} 
                    onChange={e => setEvalScores({...evalScores, cat3: e.target.value})} 
                    className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" 
                  />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(3)}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25" 
                    placeholder="0"
                    value={evalScores.cat4 ?? ''} 
                    onChange={e => setEvalScores({...evalScores, cat4: e.target.value})} 
                    className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" 
                  />
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                  <span className="text-sm text-gray-400 uppercase tracking-wider font-bold">Total Score</span>
                  <span className="text-2xl font-black text-white">
                    {(Number(evalScores.cat1) || 0) + (Number(evalScores.cat2) || 0) + (Number(evalScores.cat3) || 0) + (Number(evalScores.cat4) || 0)} <span className="text-sm text-gray-500 font-normal">/ 100</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-between items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => handleMarkAbsent(teamToEvaluate.id)} 
                  disabled={savingEval}
                  className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold py-2 px-3.5 rounded-lg transition-all duration-200 text-xs flex items-center gap-1.5"
                  title="Mark this team as Absent"
                >
                  Mark as Absent
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-xs py-2 px-3">Cancel</button>
                  {evaluations.some(e => e.team_id === teamToEvaluate.id) && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteMarks(teamToEvaluate.id)} 
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-2 px-3 rounded-lg transition-all text-xs"
                    >
                      Delete
                    </button>
                  )}
                  <button type="submit" disabled={savingEval} className="btn-primary text-xs py-2 px-4">
                    {savingEval ? 'Saving...' : 'Save Evaluation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Export Evaluations Options Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card max-w-lg w-full overflow-hidden shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Download className="text-primary" size={20} /> Export Evaluation Sheets
              </h3>
              <button onClick={() => setExportModalOpen(false)} className="text-gray-400 hover:text-white p-1 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Option 1: Download Batch Wise */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-200">
                  📦 Download Batch-wise
                </h4>
                <span className="text-xs text-gray-400">
                  PPT & Prototype tabs
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select 
                  value={selectedExportBatch} 
                  onChange={e => setSelectedExportBatch(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/20 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-white/30"
                >
                  <option value="Batch 1">Batch 1 (Day 1 - Track A)</option>
                  <option value="Batch 2">Batch 2 (Day 1 - Track B)</option>
                  <option value="Batch 3">Batch 3 (Day 2 - Track A)</option>
                  <option value="Batch 4">Batch 4 (Day 2 - Track B)</option>
                  <option value="Batch 5">Batch 5 (Day 3 - Track A)</option>
                  <option value="Batch 6">Batch 6 (Day 3 - Track B)</option>
                  <option value="ALL">All Batches (1 to 6)</option>
                </select>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      handleExportPanelWiseBatch(selectedExportBatch);
                      setExportModalOpen(false);
                    }}
                    className="flex-1 sm:flex-initial bg-white/15 hover:bg-white/25 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition-all shrink-0 flex items-center justify-center gap-1.5 border border-white/15 cursor-pointer"
                    title="Export sheet with Problem Statement banners & Expected Solutions"
                  >
                    <Download size={14} /> Panel-Wise (.xlsx)
                  </button>
                  <button 
                    onClick={() => {
                      handleExportEvaluationsByBatch(selectedExportBatch);
                      setExportModalOpen(false);
                    }}
                    className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/15 text-gray-300 text-xs px-3 py-2 rounded-lg font-medium transition-all shrink-0 flex items-center justify-center gap-1 border border-white/10 cursor-pointer"
                    title="Export standard evaluation table"
                  >
                    <Download size={14} /> Standard
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                File will be downloaded as: <code className="text-gray-200 font-mono font-bold">{selectedExportBatch === 'ALL' ? 'All Batches.xlsx' : `${selectedExportBatch}.xlsx`}</code>
              </p>
            </div>

            {/* Option 2: Download Current Filtered Table */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-200">🔍 Download Current Filtered View</h4>
                <p className="text-xs text-gray-400">Exports active teams matching current filters</p>
              </div>
              <button 
                onClick={() => {
                  handleExportEvaluations();
                  setExportModalOpen(false);
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg font-medium border border-white/15 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={15} /> Download
              </button>
            </div>

            {/* Option 3: Download Problem Statement Wise */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-purple-300">🎯 Download by Problem Statement</h4>
                <span className="text-xs text-gray-400">Select statement</span>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={selectedExportPS} 
                  onChange={e => setSelectedExportPS(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/20 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-purple-500"
                >
                  <option value="ALL">All Statements</option>
                  {problemStatements.map(ps => (
                    <option key={ps.id} value={ps.id}>{ps.id} - {ps.title.substring(0, 25)}...</option>
                  ))}
                </select>
                <button 
                  onClick={() => {
                    handleExportEvaluationsByPS(selectedExportPS);
                    setExportModalOpen(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download size={15} /> Download
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
</div>
  );
}
