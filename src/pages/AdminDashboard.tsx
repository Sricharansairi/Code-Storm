// @ts-nocheck
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Users, Settings, Database, Filter, X, Trash2, Plus, Edit2, LayoutDashboard, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminDashboardProps {
  session: Session;
}

export default function AdminDashboard({ session }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'settings' | 'evaluations' | 'certificates' | 'logistics'>('dashboard');

  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, allocated: 0, popular: '-' });

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
    { id: 'ALL', label: 'All Batches (6 Batches)' },
    { id: 'Day 1 - FN', label: 'Batch 1: Day 1 - FN (Morning)' },
    { id: 'Day 1 - AN', label: 'Batch 2: Day 1 - AN (Afternoon)' },
    { id: 'Day 2 - FN', label: 'Batch 3: Day 2 - FN (Morning)' },
    { id: 'Day 2 - AN', label: 'Batch 4: Day 2 - AN (Afternoon)' },
    { id: 'Day 3 - FN', label: 'Batch 5: Day 3 - FN (Morning)' },
    { id: 'Day 3 - AN', label: 'Batch 6: Day 3 - AN (Afternoon)' },
  ];

  const getDayNormalized = (dayStr?: string) => {
    if (!dayStr) return '31st August';
    if (dayStr.includes('1st') || dayStr.includes('Day 2')) return '1st September';
    if (dayStr.includes('2nd') || dayStr.includes('Day 3')) return '2nd September';
    return '31st August';
  };

  const getBatchFromDaySession = (day?: string, session: string = 'FN') => {
    const normDay = getDayNormalized(day);
    let dayNum = 'Day 1';
    if (normDay === '1st September') dayNum = 'Day 2';
    else if (normDay === '2nd September') dayNum = 'Day 3';
    return `${dayNum} - ${session || 'FN'}`;
  };

  const getTeamSlotInfo = (team: any) => {
    const ps = problemStatements.find(p => p.id === team.allocated_ps_id);
    
    // Batch either from team override or from problem statement
    let batch = team.batch || ps?.batch;
    let day = team.presentation_day || ps?.presentation_day;
    let session = team.session || ps?.session;
    
    if (batch) {
      if (batch.startsWith('Day 1')) {
        day = '31st August';
        session = batch.includes('AN') ? 'AN' : 'FN';
      } else if (batch.startsWith('Day 2')) {
        day = '1st September';
        session = batch.includes('AN') ? 'AN' : 'FN';
      } else if (batch.startsWith('Day 3')) {
        day = '2nd September';
        session = batch.includes('AN') ? 'AN' : 'FN';
      }
    } else {
      day = day || '31st August';
      session = session || 'FN';
      batch = getBatchFromDaySession(day, session);
    }
    
    let defaultType = 'PPT';
    if (batch.startsWith('Day 1')) {
      defaultType = session === 'FN' ? (evalSettings?.day1_fn_type || 'PPT') : (evalSettings?.day1_an_type || 'Prototype');
    } else if (batch.startsWith('Day 2')) {
      defaultType = session === 'FN' ? (evalSettings?.day2_fn_type || 'Prototype') : (evalSettings?.day2_an_type || 'PPT');
    } else if (batch.startsWith('Day 3')) {
      defaultType = session === 'FN' ? (evalSettings?.day3_fn_type || 'PPT') : (evalSettings?.day3_an_type || 'Prototype');
    }
    const sessionType = team.session_type || ps?.session_type || defaultType;

    let dayNum = 'Day 1';
    const normDay = getDayNormalized(day);
    if (normDay === '1st September') dayNum = 'Day 2';
    else if (normDay === '2nd September') dayNum = 'Day 3';
    const badgeLabel = `${dayNum}/${session}`;

    return {
      day,
      session,
      sessionType,
      batch,
      badgeLabel,
      roomNumber: ps?.room_number || '-'
    };
  };

  const [evalFilterPS, setEvalFilterPS] = useState('All');
  const [evalFilterDay, setEvalFilterDay] = useState('All');
  const [evalFilterBatch, setEvalFilterBatch] = useState('All');
  const [evalFilterStatus, setEvalFilterStatus] = useState('All');
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [teamToEvaluate, setTeamToEvaluate] = useState<any>(null);
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});
  const [savingEval, setSavingEval] = useState(false);

  // Team Slot Edit States (in Team Details Modal)
  const [slotBatch, setSlotBatch] = useState('Day 1 - FN');
  const [slotDay, setSlotDay] = useState('31st August');
  const [slotSession, setSlotSession] = useState('FN');
  const [slotSessionType, setSlotSessionType] = useState('PPT');
  const [savingSlot, setSavingSlot] = useState(false);

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
  const [visitorData, setVisitorData] = useState<{admins: string[], unregistered: string[], registered: {email: string, visited: boolean}[]}>({ admins: [], unregistered: [], registered: [] });
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
    fetchProblemStatements();
  }, []);

  const fetchVisitors = async () => {
    setLoadingVisitors(true);
    try {
      const { data: admins } = await supabase.from('admins').select('email');
      const adminEmails = (admins || []).map(a => a.email);

      const { data: visits } = await supabase.from('site_visits').select('email, last_visited_at');
      
      const { data: registered } = await supabase.from('registered_emails').select('email');
      const registeredEmails = (registered || []).map(r => r.email);

      const visitedEmails = new Set((visits || []).map(v => v.email));
      
      const unregisteredList = (visits || [])
        .map(v => v.email)
        .filter(email => !adminEmails.includes(email) && !registeredEmails.includes(email));
        
      const registeredList = registeredEmails.map(email => ({
        email,
        visited: visitedEmails.has(email)
      }));

      setVisitorData({
        admins: adminEmails,
        unregistered: unregisteredList,
        registered: registeredList
      });
      setVisitorModalOpen(true);
    } catch (err) {
      console.error(err);
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
      'TL Name': t.tl_name,
      'TL Email': t.tl_email,
      'TL Mobile': t.tl_mobile,
      'Department': t.tl_department,
      'Year': t.tl_year,
      'Member 1': t.members?.[0] || '',
      'Member 2': t.members?.[1] || '',
      'Member 3': t.members?.[2] || '',
      'Member 4': t.members?.[3] || '',
      'Status': t.allocated_ps_id ? `Allocated (${t.allocated_ps_id})` : 'Pending'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Allocations");
    XLSX.writeFile(workbook, "CodeStorm_Allocations.xlsx");
  };


  const filteredEvalTeams = teams.filter(t => {
    if (t.is_disabled) return false;
    const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
    if (!ps) return false;
    
    const slot = getTeamSlotInfo(t);
    if (evalFilterDay !== 'All' && getDayNormalized(slot.day) !== getDayNormalized(evalFilterDay)) return false;
    if (evalFilterBatch !== 'All' && slot.batch !== evalFilterBatch) return false;
    if (evalFilterPS !== 'All' && ps.id !== evalFilterPS) return false;
    const isEvaluated = evaluations.some(e => e.team_id === t.id);
    if (evalFilterStatus === 'Evaluated' && !isEvaluated) return false;
    if (evalFilterStatus === 'Pending' && isEvaluated) return false;
    return true;
  });

  const handleExportEvaluations = () => {
    const exportData = filteredEvalTeams.map((t: any, index: number) => {
      const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
      const evalData = evaluations.find(e => e.team_id === t.id);
      const slot = getTeamSlotInfo(t);
      return {
        'Sl No': index + 1,
        'Team Name': t.team_name,
        'Batch': slot.batch,
        'Session': slot.session,
        'Session Type': slot.sessionType,
        'TL Name': t.tl_name,
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile,
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
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluations");
    XLSX.writeFile(workbook, "CodeStorm_Evaluations.xlsx");
  };

  const [selectedExportPS, setSelectedExportPS] = useState('ALL');

  const handleExportEvaluationsByPS = (targetPS: string = selectedExportPS) => {
    const exportData: any[] = [];
    const targetStatements = targetPS === 'ALL' 
      ? problemStatements 
      : problemStatements.filter(ps => ps.id === targetPS);

    if (targetStatements.length === 0) {
      alert("No matching Problem Statements found to export.");
      return;
    }
    
    targetStatements.forEach((ps) => {
      const allocatedTeams = teams.filter(t => t.allocated_ps_id === ps.id && !t.is_disabled);
      
      if (allocatedTeams.length === 0) {
        exportData.push({
          'Problem Statement ID': ps.id,
          'Problem Statement Title': ps.title,
          'Presentation Day': ps.presentation_day || '-',
          'Room Number': ps.room_number || '-',
          'Team Name': 'No Active Teams Allocated',
          'Batch': '-',
          'Session': '-',
          'Session Type': '-',
          'TL Name': '-',
          'TL Email': '-',
          'TL Mobile': '-',
          'Department': '-',
          'Year': '-',
          'Team Members': '-',
          [getCategoryName(0)]: '-',
          [getCategoryName(1)]: '-',
          [getCategoryName(2)]: '-',
          [getCategoryName(3)]: '-',
          'Total Score': '-',
          'Evaluation Status': 'N/A',
          'Evaluated By': '-'
        });
      } else {
        allocatedTeams.forEach((t) => {
          const evalData = evaluations.find(e => e.team_id === t.id);
          const slot = getTeamSlotInfo(t);
          exportData.push({
            'Problem Statement ID': ps.id,
            'Problem Statement Title': ps.title,
            'Presentation Day': slot.day,
            'Room Number': slot.roomNumber,
            'Team Name': t.team_name,
            'Batch': slot.batch,
            'Session': slot.session,
            'Session Type': slot.sessionType,
            'TL Name': t.tl_name || '-',
            'TL Email': t.tl_email,
            'TL Mobile': t.tl_mobile || '-',
            'Department': t.tl_department || '-',
            'Year': t.tl_year || '-',
            'Team Members': (t.members || []).join(', ') || '-',
            [getCategoryName(0)]: evalData ? evalData.cat1_score : '-',
            [getCategoryName(1)]: evalData ? evalData.cat2_score : '-',
            [getCategoryName(2)]: evalData ? evalData.cat3_score : '-',
            [getCategoryName(3)]: evalData ? evalData.cat4_score : '-',
            'Total Score': evalData ? evalData.total_score : '-',
            'Evaluation Status': evalData ? 'Evaluated' : 'Pending',
            'Evaluated By': evalData ? evalData.evaluated_by : '-'
          });
        });
      }
    });

    const filename = targetPS === 'ALL' 
      ? 'CodeStorm_Evaluations_All_Problem_Statements.xlsx' 
      : `CodeStorm_Evaluations_${targetPS}.xlsx`;
    const sheetName = targetPS === 'ALL' ? 'All_PS_Evaluations' : targetPS.replace(/[:\\/?*\[\]]/g, '_');

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };

  const [selectedExportBatch, setSelectedExportBatch] = useState('ALL');

  const handleExportEvaluationsByBatch = (targetBatch: string = selectedExportBatch) => {
    const activeTeams = teams.filter(t => t.allocated_ps_id && !t.is_disabled);
    
    const filteredTeams = targetBatch === 'ALL' 
      ? activeTeams 
      : activeTeams.filter(t => getTeamSlotInfo(t).batch === targetBatch);

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

    const workbook = XLSX.utils.book_new();
    const title = targetBatch === 'ALL' ? 'ALL BATCHES' : targetBatch.toUpperCase();

    // Build worksheet with two stacked tables
    const worksheet = XLSX.utils.aoa_to_sheet([
      [`CODE STORM 2026 - ${title} - PPT PRESENTATIONS TABLE`],
      [`Generated on: ${new Date().toLocaleString()}`],
      []
    ]);

    // Table 1: PPT Presentations starting at row 4 (A4)
    XLSX.utils.sheet_add_json(worksheet, pptRows, { origin: 'A4' });

    // Table 2: Prototype Evaluations starting after Table 1
    const protoStartRow = pptRows.length + 7;
    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      [`CODE STORM 2026 - ${title} - PROTOTYPE EVALUATIONS TABLE`],
      [`Generated on: ${new Date().toLocaleString()}`],
      []
    ], { origin: `A${protoStartRow}` });

    XLSX.utils.sheet_add_json(worksheet, protoRows, { origin: `A${protoStartRow + 4}` });

    const filename = targetBatch === 'ALL' 
      ? 'CodeStorm_Evaluations_All_Batches.xlsx' 
      : `CodeStorm_Evaluations_${targetBatch.replace(/ /g, '_')}.xlsx`;
    const sheetName = targetBatch === 'ALL' ? 'All_Batches' : targetBatch.replace(/[:\\/?*\[\]]/g, '_');

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };

  const [savingSchedule, setSavingSchedule] = useState(false);

  const handleAssignPSToBatch = (psId: string, targetBatch: string) => {
    let day = '31st August';
    let session = 'FN';
    if (targetBatch.startsWith('Day 1')) {
      day = '31st August';
      session = targetBatch.includes('AN') ? 'AN' : 'FN';
    } else if (targetBatch.startsWith('Day 2')) {
      day = '1st September';
      session = targetBatch.includes('AN') ? 'AN' : 'FN';
    } else if (targetBatch.startsWith('Day 3')) {
      day = '2nd September';
      session = targetBatch.includes('AN') ? 'AN' : 'FN';
    }

    setProblemStatements(prev => prev.map(ps => {
      if (ps.id === psId) {
        return {
          ...ps,
          batch: targetBatch,
          presentation_day: day,
          session: session
        };
      }
      return ps;
    }));
  };

  const handleUnassignPSFromBatch = (psId: string) => {
    setProblemStatements(prev => prev.map(ps => {
      if (ps.id === psId) {
        return {
          ...ps,
          batch: null,
          presentation_day: null,
          session: 'FN'
        };
      }
      return ps;
    }));
  };

  const handleSaveScheduleAndBatches = async () => {
    setSavingSchedule(true);
    try {
      // 1. Save schedule settings
      const { data: existing } = await supabase.from('evaluation_settings').select('id').limit(1);
      const schedulePayload = {
        day1_fn_type: evalSettings?.day1_fn_type || 'PPT',
        day1_an_type: evalSettings?.day1_an_type || 'Prototype',
        day2_fn_type: evalSettings?.day2_fn_type || 'Prototype',
        day2_an_type: evalSettings?.day2_an_type || 'PPT',
        day3_fn_type: evalSettings?.day3_fn_type || 'PPT',
        day3_an_type: evalSettings?.day3_an_type || 'Prototype',
        updated_at: new Date().toISOString()
      };
      if (existing && existing.length > 0) {
        await supabase.from('evaluation_settings').update(schedulePayload).eq('id', existing[0].id);
      } else {
        await supabase.from('evaluation_settings').insert([schedulePayload]);
      }

      // 2. Batch update problem statements
      for (const ps of problemStatements) {
        let defaultType = 'PPT';
        const b = ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : null);
        if (b) {
          if (b.startsWith('Day 1')) {
            defaultType = (ps.session === 'FN' || b.includes('FN')) ? (evalSettings?.day1_fn_type || 'PPT') : (evalSettings?.day1_an_type || 'Prototype');
          } else if (b.startsWith('Day 2')) {
            defaultType = (ps.session === 'FN' || b.includes('FN')) ? (evalSettings?.day2_fn_type || 'Prototype') : (evalSettings?.day2_an_type || 'PPT');
          } else if (b.startsWith('Day 3')) {
            defaultType = (ps.session === 'FN' || b.includes('FN')) ? (evalSettings?.day3_fn_type || 'PPT') : (evalSettings?.day3_an_type || 'Prototype');
          }
        }

        await supabase.from('problem_statements').update({
          batch: ps.batch || null,
          presentation_day: ps.presentation_day || null,
          session: ps.session || 'FN',
          session_type: defaultType
        }).eq('id', ps.id);
      }

      alert("Day & Session Schedule and Batch Allocations saved successfully!");
      fetchEvalData();
      fetchProblemStatements();
      fetchTeams();
    } catch (err: any) {
      alert("Error saving schedule: " + err.message);
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
    if (filterPS !== 'All' && t.allocated_ps_id !== filterPS) return false;
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
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-500 hover:text-blue-300 transition-colors" title="Switch to Participant Dashboard">
                <LayoutDashboard size={20} />
              </button>
            </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <div 
            className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 hidden lg:flex cursor-pointer hover:bg-white/10 transition-colors"
            onClick={fetchVisitors}
          >
             <img src={session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}`} alt="Avatar" className="w-6 h-6 rounded-full" />
             <span className="text-xs font-medium text-white">{session.user.email}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm border border-white/10 text-white px-4 py-2 rounded-md hover:bg-white/10 transition-colors">Sign Out</button>
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

              {/* Export Reports Batch-wise */}
              <div className="card max-w-4xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Download size={20} className="text-gray-300" /> Export Reports Batch-wise (6 Batches)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Select a specific batch or All Batches to export team evaluation results grouped by batch to Excel.
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

              {/* Day & Session Schedule Configuration */}
              <div className="card max-w-5xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock size={20} className="text-gray-300" /> Day & Session Schedule (6 Batches & Statement Allocations)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Configure evaluation modes (PPT / Prototype) and allocate problem statements directly to the 6 Batches.
                    </p>
                  </div>
                  <button 
                    disabled={savingSchedule}
                    onClick={handleSaveScheduleAndBatches}
                    className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-6 py-2 rounded-lg shadow-sm text-sm transition-all font-medium flex items-center gap-2"
                  >
                    {savingSchedule ? 'Saving Schedule & Allocations...' : 'Save Schedule & Allocations'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Day 1 */}
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-4">
                    <div className="border-b border-white/10 pb-2 flex justify-between items-center">
                      <h4 className="text-sm font-bold text-white">Day 1 (31st August)</h4>
                      <span className="text-[11px] text-gray-400 font-mono">Batches 1 & 2</span>
                    </div>

                    {/* Batch 1 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 1 (FN Morning)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">09:30 AM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day1_fn_type || 'PPT'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day1_fn_type || 'PPT'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day1_fn_type: e.target.value, day1_an_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="PPT">PPT Presentation</option>
                          <option value="Prototype">Prototype Evaluation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - FN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - FN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - FN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 1 - FN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 1...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 1 - FN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Batch 2 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 2 (AN Afternoon)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">01:30 PM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day1_an_type || 'Prototype'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day1_an_type || 'Prototype'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day1_an_type: e.target.value, day1_fn_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="Prototype">Prototype Evaluation</option>
                          <option value="PPT">PPT Presentation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - AN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - AN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 1 - AN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 1 - AN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 2...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 1 - AN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Day 2 */}
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-4">
                    <div className="border-b border-white/10 pb-2 flex justify-between items-center">
                      <h4 className="text-sm font-bold text-white">Day 2 (1st September)</h4>
                      <span className="text-[11px] text-gray-400 font-mono">Batches 3 & 4</span>
                    </div>

                    {/* Batch 3 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 3 (FN Morning)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">09:30 AM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day2_fn_type || 'Prototype'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day2_fn_type || 'Prototype'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day2_fn_type: e.target.value, day2_an_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="Prototype">Prototype Evaluation</option>
                          <option value="PPT">PPT Presentation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - FN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - FN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - FN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 2 - FN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 3...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 2 - FN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Batch 4 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 4 (AN Afternoon)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">01:30 PM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day2_an_type || 'PPT'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day2_an_type || 'PPT'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day2_an_type: e.target.value, day2_fn_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="PPT">PPT Presentation</option>
                          <option value="Prototype">Prototype Evaluation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - AN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - AN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 2 - AN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 2 - AN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 4...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 2 - AN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Day 3 */}
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-4">
                    <div className="border-b border-white/10 pb-2 flex justify-between items-center">
                      <h4 className="text-sm font-bold text-white">Day 3 (2nd September)</h4>
                      <span className="text-[11px] text-gray-400 font-mono">Batches 5 & 6</span>
                    </div>

                    {/* Batch 5 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 5 (FN Morning)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">09:30 AM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day3_fn_type || 'PPT'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day3_fn_type || 'PPT'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day3_fn_type: e.target.value, day3_an_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="PPT">PPT Presentation</option>
                          <option value="Prototype">Prototype Evaluation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - FN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - FN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - FN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 3 - FN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 5...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 3 - FN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Batch 6 */}
                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-white">Batch 6 (AN Afternoon)</h5>
                          <span className="text-[10px] text-gray-400 font-mono">01:30 PM</span>
                        </div>
                        <span className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded font-mono font-medium">
                          {evalSettings?.day3_an_type || 'Prototype'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-medium">Evaluation Mode</label>
                        <select 
                          value={evalSettings?.day3_an_type || 'Prototype'} 
                          onChange={(e) => setEvalSettings({ ...evalSettings, day3_an_type: e.target.value, day3_fn_type: e.target.value === 'PPT' ? 'Prototype' : 'PPT' })}
                          className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/50 text-white"
                        >
                          <option value="Prototype">Prototype Evaluation</option>
                          <option value="PPT">PPT Presentation</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] text-gray-300 font-medium">
                            Assigned Statements ({problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - AN').length})
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-lg border border-white/5">
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - AN').map(ps => (
                            <span key={ps.id} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white px-2 py-0.5 rounded-md border border-white/10">
                              <span className="font-semibold">{ps.id}</span>
                              <span className="text-[10px] text-gray-400">({ps.current_teams}t)</span>
                              <button
                                type="button"
                                onClick={() => handleUnassignPSFromBatch(ps.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-0.5"
                                title="Remove from batch"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) === 'Day 3 - AN').length === 0 && (
                            <p className="text-[11px] text-gray-500 italic p-0.5">No statements assigned</p>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPSToBatch(e.target.value, 'Day 3 - AN');
                          }}
                          className="w-full text-xs py-1.5 px-2 border border-white/10 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <option value="">+ Add Statement to Batch 6...</option>
                          {problemStatements.filter(ps => (ps.batch || (ps.presentation_day ? getBatchFromDaySession(ps.presentation_day, ps.session || 'FN') : '')) !== 'Day 3 - AN').map(ps => (
                            <option key={ps.id} value={ps.id}>
                              {ps.id} - {ps.title.substring(0, 22)}... ({ps.current_teams} teams)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    disabled={savingSchedule}
                    onClick={handleSaveScheduleAndBatches}
                    className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-6 py-2 rounded-lg shadow-sm text-sm transition-all font-medium"
                  >
                    {savingSchedule ? 'Saving Schedule & Allocations...' : 'Save Schedule & Allocations'}
                  </button>
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
                                <span className="text-gray-400">Teams: {ps.current_teams} / {ps.max_teams}</span>
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


              <div className="card overflow-hidden p-0">
                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-4">Teams Evaluation <button onClick={handleExportEvaluations} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-sm px-3 py-1 rounded"><Download size={16} /> Export</button></h2>
                                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Batch</label>
                      <select value={evalFilterBatch} onChange={e => setEvalFilterBatch(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 max-w-[170px]">
                        <option value="All">All Batches</option>
                        {BATCH_OPTIONS.filter(b => b.id !== 'ALL').map(b => (
                          <option key={b.id} value={b.id}>{b.id}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Presentation Day</label>
                      <select value={evalFilterDay} onChange={e => setEvalFilterDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 max-w-[150px]">
                        <option value="All">All Days</option>
                        <option value="31st August">31st August</option>
                        <option value="1st September">1st September</option>
                        <option value="2nd September">2nd September</option>
                      </select>
                    </div>

                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Problem Statement</label>
                      <select value={evalFilterPS} onChange={e => setEvalFilterPS(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 max-w-[150px]">
                        {allocatedProblemStatements.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Status</label>
                      <select value={evalFilterStatus} onChange={e => setEvalFilterStatus(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-white/30 focus:border-white/30 max-w-[150px]">
                        <option value="All">All</option>
                        <option value="Evaluated">Evaluated</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-300 text-sm bg-black/20">
                        <th className="p-4 font-semibold w-12 text-center">#</th>
                        <th className="p-4 font-semibold">Team & Batch</th>
                        <th className="p-4 font-semibold">PS / Slot / Room</th>
                        <th className="p-4 font-semibold text-center">Score (100)</th>
                        <th className="p-4 font-semibold text-center">Updates</th>
                        <th className="p-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvalTeams.map((team, index) => {
                        const ps = problemStatements.find(p => p.id === team.allocated_ps_id);
                        const evaluation = evaluations.find(e => e.team_id === team.id);
                        const slot = getTeamSlotInfo(team);
                        return (
                          <tr key={team.id} className="border-b border-white/10 hover:bg-black/20 transition-colors">
                            <td className="p-4 text-sm text-center text-gray-300 font-medium">{index + 1}</td>
                            <td className="p-4 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-white cursor-pointer hover:underline" onClick={() => {
                                  setSelectedTeam(team);
                                  setSlotDay(slot.day);
                                  setSlotSession(slot.session);
                                  setSlotSessionType(slot.sessionType);
                                }}>
                                  {team.team_name}
                                </p>
                                <span className="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded font-medium">
                                  {slot.badgeLabel}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">{team.tl_email}</p>
                            </td>
                            <td className="p-4 text-sm">
                              <p className="font-medium text-gray-200">{ps?.id || 'N/A'}</p>
                              <p className="text-xs text-gray-400">
                                {slot.day} • <span className="text-gray-200 font-medium">{slot.session} ({slot.sessionType})</span> • Room: {slot.roomNumber}
                              </p>
                              {(() => {
                                const norm = getDayNormalized(slot.day);
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
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    Schedule: FN = {fnType} | AN = {anType}
                                  </p>
                                );
                              })()}
                            </td>
                            <td className="p-4 text-sm text-center">
                              {evaluation ? (
                                <span className="font-bold text-green-400 text-lg">{evaluation.total_score}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-center text-gray-400">
                              {evaluation?.update_count || 0}
                            </td>
                            <td className="p-4 text-sm text-right">
                              <button 
                                onClick={() => {
                                  setTeamToEvaluate(team);
                                  if (evaluation) {
                                    setEvalScores({
                                      cat1: evaluation.cat1_score, cat2: evaluation.cat2_score,
                                      cat3: evaluation.cat3_score, cat4: evaluation.cat4_score
                                    });
                                  } else {
                                    const initScores: Record<string, number> = {}; (evalSettings?.categories || []).forEach((c: any) => initScores[c.id] = 0); setEvalScores(initScores);
                                  }
                                  setEvalModalOpen(true);
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                              >
                                {evaluation ? 'Edit Marks' : 'Evaluate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-12 border-t border-white/10/10 pt-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><div className="p-2 bg-primary/10 text-blue-300 rounded-lg">📋</div> Certificates & Awards</h2>
            <div className="card max-w-2xl mx-auto text-center py-12">
              <div className="w-16 h-16 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <Download size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Certificate Generation</h2>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                The mechanism for uploading a participation certificate template and enabling dynamic generation is currently under development.
              </p>
              
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 bg-black/20">
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-300 mb-1">Template Upload Placeholder</p>
                <p className="text-xs text-gray-500">Coming soon in a future update.</p>
              </div>
              </div>
              <div className="mt-12 border-t border-white/10/10 pt-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"> Room & Logistics</h2>
            <div className="space-y-6">
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
              </div>
              </div>
              </div>
            </motion.div>
          )}
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
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{selectedTeam.team_name}</h4>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-200 border border-white/10">
                  {selectedTeam.allocated_ps_id ? `Allocated: ${selectedTeam.allocated_ps_id}` : 'Selection Pending'}
                </div>
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

              {/* Presentation Slot & Batch Assignment */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Presentation Slot & Batch</h5>
                  <span className="text-xs font-mono font-bold bg-white/10 text-white border border-white/10 px-2 py-0.5 rounded">
                    {slotBatch || getBatchFromDaySession(slotDay, slotSession)} • {slotSessionType}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-medium">Assign Batch</label>
                    <select
                      value={slotBatch || getBatchFromDaySession(slotDay, slotSession)}
                      onChange={(e) => {
                        const selBatch = e.target.value;
                        setSlotBatch(selBatch);
                        if (selBatch.startsWith('Day 1')) {
                          setSlotDay('31st August');
                          setSlotSession(selBatch.includes('AN') ? 'AN' : 'FN');
                        } else if (selBatch.startsWith('Day 2')) {
                          setSlotDay('1st September');
                          setSlotSession(selBatch.includes('AN') ? 'AN' : 'FN');
                        } else if (selBatch.startsWith('Day 3')) {
                          setSlotDay('2nd September');
                          setSlotSession(selBatch.includes('AN') ? 'AN' : 'FN');
                        }
                      }}
                      className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/40 text-white"
                    >
                      <option value="Day 1 - FN">Batch 1: Day 1 - FN (31st Aug Morning)</option>
                      <option value="Day 1 - AN">Batch 2: Day 1 - AN (31st Aug Afternoon)</option>
                      <option value="Day 2 - FN">Batch 3: Day 2 - FN (1st Sept Morning)</option>
                      <option value="Day 2 - AN">Batch 4: Day 2 - AN (1st Sept Afternoon)</option>
                      <option value="Day 3 - FN">Batch 5: Day 3 - FN (2nd Sept Morning)</option>
                      <option value="Day 3 - AN">Batch 6: Day 3 - AN (2nd Sept Afternoon)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-medium">Session Mode</label>
                    <select
                      value={slotSessionType}
                      onChange={(e) => setSlotSessionType(e.target.value)}
                      className="w-full text-xs py-1.5 px-2 border border-white/20 rounded-lg bg-black/40 text-white"
                    >
                      <option value="PPT">PPT Presentation</option>
                      <option value="Prototype">Prototype Evaluation</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    disabled={savingSlot}
                    onClick={async () => {
                      setSavingSlot(true);
                      try {
                        const targetBatch = slotBatch || getBatchFromDaySession(slotDay, slotSession);
                        let targetDay = slotDay;
                        let targetSession = slotSession;
                        if (targetBatch.startsWith('Day 1')) {
                          targetDay = '31st August';
                          targetSession = targetBatch.includes('AN') ? 'AN' : 'FN';
                        } else if (targetBatch.startsWith('Day 2')) {
                          targetDay = '1st September';
                          targetSession = targetBatch.includes('AN') ? 'AN' : 'FN';
                        } else if (targetBatch.startsWith('Day 3')) {
                          targetDay = '2nd September';
                          targetSession = targetBatch.includes('AN') ? 'AN' : 'FN';
                        }

                        const { error } = await supabase.from('teams').update({
                          presentation_day: targetDay,
                          session: targetSession,
                          session_type: slotSessionType,
                          batch: targetBatch
                        }).eq('id', selectedTeam.id);

                        if (error) {
                          alert("Error saving slot: " + error.message);
                        } else {
                          alert("Presentation slot updated successfully!");
                          setTeams(teams.map(t => t.id === selectedTeam.id ? {
                            ...t,
                            presentation_day: targetDay,
                            session: targetSession,
                            session_type: slotSessionType,
                            batch: targetBatch
                          } : t));
                          setSelectedTeam({
                            ...selectedTeam,
                            presentation_day: targetDay,
                            session: targetSession,
                            session_type: slotSessionType,
                            batch: targetBatch
                          });
                        }
                      } catch (err: any) {
                        alert("Error saving slot: " + err.message);
                      } finally {
                        setSavingSlot(false);
                      }
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-xs font-semibold py-1.5 px-4 rounded-lg transition-all"
                  >
                    {savingSlot ? 'Saving Batch...' : 'Save Presentation Batch'}
                  </button>
                </div>
              </div>

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
            
            <div className="px-6 py-4 border-t border-white/10 bg-white/5/50 flex justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => { 
                  setModalType('edit-team'); 
                  setNewTeam({ team_name: selectedTeam.team_name, tl_email: selectedTeam.tl_email }); 
                  setModalOpen(true); 
                }} className="btn-secondary text-sm">Edit</button>
                <button 
                  onClick={async () => {
                    const isDisabling = !selectedTeam.is_disabled;
                    const confirmMsg = isDisabling 
                      ? `Are you sure you want to disable "${selectedTeam.team_name}"? They will not be able to opt for problem statements and will be hidden from evaluations.`
                      : `Are you sure you want to re-enable "${selectedTeam.team_name}"?`;
                    if (window.confirm(confirmMsg)) {
                      const { error } = await supabase.from('teams').update({ is_disabled: isDisabling }).eq('id', selectedTeam.id);
                      if (error) {
                        alert("Error updating team: " + error.message);
                      } else {
                        alert(`Team successfully ${isDisabling ? 'disabled' : 'enabled'}!`);
                        setSelectedTeam({ ...selectedTeam, is_disabled: isDisabling });
                        fetchTeams();
                      }
                    }
                  }}
                  className={`btn-secondary text-sm ${selectedTeam.is_disabled ? 'text-green-400 border-green-500/30 hover:bg-green-500/10' : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'}`}
                >
                  {selectedTeam.is_disabled ? 'Enable Team' : 'Disable Team'}
                </button>
                <button onClick={() => { 
                  setModalType('delete-team'); 
                  setModalOpen(true); 
                }} className="btn-secondary text-sm text-red-400 border-red-500/30 hover:bg-red-500/10">Delete</button>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="btn-secondary text-sm">
                Close
              </button>
            </div>
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Website Visitors</h2>
              <button onClick={() => setVisitorModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            {loadingVisitors ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div></div>
            ) : (
              <div className="overflow-y-auto pr-2 space-y-6 pb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Admins ({visitorData.admins.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    {visitorData.admins.map(email => (
                      <div key={email} className="flex justify-between items-center text-sm text-white font-medium px-2 py-1 border-b border-white/10 last:border-0 hover:bg-white/10 transition-colors">
                        <span>{email}</span>
                        {email !== session.user.email && (
                          <button 
                            onClick={() => setRevokeAdminEmail(email)} 
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/30 rounded border border-red-900/50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Unregistered Visitors ({visitorData.unregistered.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    {visitorData.unregistered.length === 0 && <span className="text-sm text-gray-400 px-2">No unregistered visitors.</span>}
                    {visitorData.unregistered.map(email => (
                      <div key={email} className="text-sm text-white px-2 py-1">{email}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Registered Users ({visitorData.registered.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                     {visitorData.registered.length === 0 && <span className="text-sm text-gray-400 px-2">No registered emails found.</span>}
                    {visitorData.registered.map(user => (
                      <div key={user.email} className="flex justify-between items-center text-sm px-2 py-1.5 border-b border-white/10 last:border-0">
                        <span className="text-white">{user.email}</span>
                        {user.visited ? (
                           <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Visited</span>
                        ) : (
                           <span className="px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full">Not Visited</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1
                };

                
                const { error } = await supabase.from('evaluations').upsert(evalData, { onConflict: 'team_id' });
                
                setSavingEval(false);
                if (error) {
                  alert("Error saving evaluation: " + error.message);
                } else {
                  alert("Evaluation saved successfully!");
                  setEvalModalOpen(false);
                  fetchEvalData(); // Refresh data
                }
              }} 
              className="p-6"
            >
              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-300 mb-2">Assign marks out of 25 for each category.</p>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(0)}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat1 ?? 0} onChange={e => setEvalScores({...evalScores, cat1: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(1)}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat2 ?? 0} onChange={e => setEvalScores({...evalScores, cat2: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(2)}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat3 ?? 0} onChange={e => setEvalScores({...evalScores, cat3: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{getCategoryName(3)}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat4 ?? 0} onChange={e => setEvalScores({...evalScores, cat4: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-white/30 text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                  <span className="text-sm text-gray-400 uppercase tracking-wider font-bold">Total Score</span>
                  <span className="text-2xl font-black text-white">
                    {(Number(evalScores.cat1) || 0) + (Number(evalScores.cat2) || 0) + (Number(evalScores.cat3) || 0) + (Number(evalScores.cat4) || 0)} <span className="text-sm text-gray-500 font-normal">/ 100</span>
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end items-center gap-3">
                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteMarks(teamToEvaluate.id)} 
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-5 rounded-lg transition-all duration-300 text-sm"
                >
                  Delete Marks
                </button>
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
</div>
  );
}
