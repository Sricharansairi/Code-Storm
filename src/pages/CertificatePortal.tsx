import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileCheck, ShieldCheck, AlertTriangle, CheckCircle2, Lock, ArrowLeft, LogOut, Info, Edit3 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

interface CertMemberSlot {
  role: string;
  name: string;
}

export default function CertificatePortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 5 Members Certificate State
  const [certMembers, setCertMembers] = useState<CertMemberSlot[]>([
    { role: 'Team Leader', name: '' },
    { role: 'Team Member 1', name: '' },
    { role: 'Team Member 2', name: '' },
    { role: 'Team Member 3', name: '' },
    { role: 'Team Member 4', name: '' },
  ]);
  const [certPreviews, setCertPreviews] = useState<string[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'png'>('pdf');

  // Initialize Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
      if (session?.user?.email) {
        fetchTeamAndEval(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
      if (session?.user?.email) {
        fetchTeamAndEval(session.user.email);
      } else {
        setTeam(null);
        setEvaluation(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Team & Evaluation Data
  const fetchTeamAndEval = async (email: string) => {
    setLoadingData(true);
    setNotFound(false);
    try {
      const emailLower = email.toLowerCase().trim();
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .ilike('tl_email', emailLower)
        .maybeSingle();

      if (teamErr || !teamData) {
        setTeam(null);
        setNotFound(true);
        setLoadingData(false);
        return;
      }

      setTeam(teamData);

      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('team_id', teamData.id)
        .maybeSingle();

      setEvaluation(evalData || null);

      // Parse members safely whether array, json, or delimited string
      let membersList: string[] = [];
      if (Array.isArray(teamData.members)) {
        membersList = teamData.members;
      } else if (typeof teamData.members === 'string') {
        try {
          const parsed = JSON.parse(teamData.members);
          if (Array.isArray(parsed)) membersList = parsed;
          else membersList = teamData.members.split(',').map((s: string) => s.trim()).filter(Boolean);
        } catch {
          membersList = teamData.members.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      // Populate 5 slots with team member data
      setCertMembers([
        { role: 'Team Leader', name: teamData.tl_name || 'Team Leader' },
        { role: 'Team Member 1', name: membersList[0] || 'Member 1' },
        { role: 'Team Member 2', name: membersList[1] || 'Member 2' },
        { role: 'Team Member 3', name: membersList[2] || 'Member 3' },
        { role: 'Team Member 4', name: membersList[3] || 'Member 4' },
      ]);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setNotFound(true);
    } finally {
      setLoadingData(false);
    }
  };

  const handleGoogleLogin = async () => {
    const redirectUrl = window.location.origin + '/certificates';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTeam(null);
    setEvaluation(null);
    setNotFound(false);
  };

  // Evaluation Status & Download Checks
  const isAbsent = Boolean(evaluation?.scores?.is_absent || evaluation?.is_absent);
  const isEvaluated = Boolean(evaluation && !isAbsent && evaluation.total_score !== null && evaluation.total_score !== undefined);
  
  // Access check: did admin grant certificate download access to this team?
  const hasAdminGrant = (() => {
    if (!evaluation || !evaluation.scores) return false;
    let sc = evaluation.scores;
    if (typeof sc === 'string') {
      try { sc = JSON.parse(sc); } catch { return false; }
    }
    return Boolean(sc.certificate_access_granted);
  })();

  // Evaluated teams are NEVER locked! Non-evaluated teams are unlocked if admin grants access!
  const isAccessGranted = isEvaluated || hasAdminGrant;

  const isAlreadyDownloaded = (() => {
    if (!evaluation || !evaluation.scores) return false;
    if (typeof evaluation.scores === 'object') {
      return Boolean(evaluation.scores.certificate_downloaded);
    }
    if (typeof evaluation.scores === 'string') {
      try {
        const parsed = JSON.parse(evaluation.scores);
        return Boolean(parsed.certificate_downloaded);
      } catch {
        return false;
      }
    }
    return false;
  })();

  const downloadInfo = (() => {
    if (!evaluation || !evaluation.scores) return null;
    let scoresObj = evaluation.scores;
    if (typeof scoresObj === 'string') {
      try { scoresObj = JSON.parse(scoresObj); } catch { return null; }
    }
    if (scoresObj.certificate_downloaded) {
      return {
        at: scoresObj.certificate_downloaded_at ? new Date(scoresObj.certificate_downloaded_at).toLocaleString() : 'Recorded',
        by: scoresObj.certificate_downloaded_by || 'Team Leader',
        format: (scoresObj.certificate_download_format || 'pdf').toUpperCase()
      };
    }
    return null;
  })();

  const handleUpdateMemberName = (index: number, newName: string) => {
    if (isAlreadyDownloaded) return; // Locked if already downloaded
    setCertMembers(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], name: newName };
      }
      return copy;
    });
  };

  // Cached Master Template Image Loader (Same-Origin Safe)
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

  // Render certificate using the single official font: Great Vibes
  const renderCertificateToCanvas = async (name: string): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 3300;
    canvas.height = 2550;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Ensure maximum bicubic filtering quality so fine text and logos stay razor sharp
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

    // Single official font: Great Vibes
    let effSize = 190;
    ctx.font = `${effSize}px "Great Vibes", cursive, serif`;
    let textWidth = ctx.measureText(name).width;
    const maxWidth = 1850;
    if (textWidth > maxWidth) {
      effSize = Math.floor(effSize * (maxWidth / textWidth));
      ctx.font = `${effSize}px "Great Vibes", cursive, serif`;
    }

    // Baseline centered at X=1650, Y=1515 directly above the underline
    ctx.fillText(name, 1650, 1515);
    return canvas;
  };

  // Live previews generator (generates for all team members as soon as team is loaded)
  useEffect(() => {
    if (!team) return;
    let isCancelled = false;
    setLoadingPreviews(true);

    const generateAllPreviews = async () => {
      try {
        const urls: string[] = [];
        for (let i = 0; i < certMembers.length; i++) {
          const m = certMembers[i];
          const canvas = await renderCertificateToCanvas(m.name || m.role);
          // Use lossless PNG so small logo details and letters are perfectly sharp in preview
          urls.push(canvas.toDataURL('image/png'));
        }
        if (!isCancelled) {
          setCertPreviews(urls);
          setLoadingPreviews(false);
        }
      } catch (err) {
        console.error("Failed to generate cert previews:", err);
        if (!isCancelled) setLoadingPreviews(false);
      }
    };

    const timer = setTimeout(generateAllPreviews, 100);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [team, certMembers]);

  // Execute One-Time Download (Direct download for all individual certificates without zip)
  const executeOneTimeDownload = async (format: 'pdf' | 'png') => {
    if (!team || isAlreadyDownloaded || downloading) return;
    setDownloading(true);
    setStatusMessage(`Preparing all ${certMembers.length} ${format.toUpperCase()} certificates (300 DPI)...`);
    setConfirmModalOpen(false);

    try {
      const teamLabel = team?.team_name ? team.team_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Team';

      for (let i = 0; i < certMembers.length; i++) {
        const m = certMembers[i];
        const roleLabel = i === 0 ? 'Team_Leader' : `Member_${i}`;
        const memName = (m.name || '').trim() || m.role;
        const safeName = memName.replace(/[^a-zA-Z0-9_-]/g, '_') || roleLabel;
        const filenameBase = `${teamLabel}_${i + 1}_${roleLabel}_${safeName}`;

        setStatusMessage(`Downloading certificate ${i + 1} of ${certMembers.length} (${memName})...`);

        const canvas = await renderCertificateToCanvas(memName);

        if (format === 'pdf') {
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [3300, 2550]
          });
          // Embed as lossless PNG so college logos, fine letters, and text remain 100% sharp
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 3300, 2550, undefined, 'FAST');
          pdf.save(`${filenameBase}.pdf`);
        } else {
          const pngDataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngDataUrl;
          link.download = `${filenameBase}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Small pause between file triggers to ensure smooth multi-file browser downloads
        if (i < certMembers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      // Record one-time download in Supabase
      let currentScores = evaluation?.scores || {};
      if (typeof currentScores === 'string') {
        try { currentScores = JSON.parse(currentScores); } catch { currentScores = {}; }
      }

      const updatedScores = {
        ...currentScores,
        certificate_downloaded: true,
        certificate_downloaded_at: new Date().toISOString(),
        certificate_downloaded_by: session?.user?.email || team.tl_email,
        certificate_download_format: format,
        certificate_download_count: (currentScores.certificate_download_count || 0) + 1
      };

      const { error: updateErr } = await supabase
        .from('evaluations')
        .upsert({
          team_id: team.id,
          cat1_score: evaluation?.cat1_score || 0,
          cat2_score: evaluation?.cat2_score || 0,
          cat3_score: evaluation?.cat3_score || 0,
          cat4_score: evaluation?.cat4_score || 0,
          total_score: evaluation?.total_score ?? null,
          scores: updatedScores,
          evaluated_by: evaluation?.evaluated_by || 'system_cert',
          update_count: evaluation ? (evaluation.update_count || 0) + 1 : 1,
          evaluated_at: evaluation?.evaluated_at || new Date().toISOString()
        }, { onConflict: 'team_id' });

      if (updateErr) {
        console.warn('Note: download logged locally', updateErr);
      }

      setEvaluation({
        ...(evaluation || {}),
        team_id: team.id,
        scores: updatedScores
      });

      setStatusMessage(`Successfully downloaded all ${certMembers.length} certificates in ${format.toUpperCase()}!`);
    } catch (err: any) {
      alert('Error downloading certificates: ' + err.message);
    } finally {
      setDownloading(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className="min-h-screen selection:bg-white/20 flex flex-col justify-between relative">
      {/* Main Container */}
      <div>
        {/* Navigation Bar */}
        <nav className="bg-black/50 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/sri-indu-logo.jpg" alt="Logo" className="h-9 object-contain rounded-md" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Code Storm 2026</h1>
              <span className="text-[10px] text-gray-400 font-mono block">Official Certificate Portal</span>
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            {session && (
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <LogOut size={13} /> Sign Out
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={13} /> Home
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">

          {/* CASE 1: Not Logged In */}
          {!session && !loadingSession && (
            <div className="max-w-lg mx-auto card p-8 border border-white/10 bg-black/60 backdrop-blur-2xl rounded-2xl text-center space-y-5 shadow-2xl mt-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">Team Leader Sign In</h2>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-sm mx-auto">
                  Only registered Team Leaders can preview and download official certificates for their 5-member team.
                </p>
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-gray-400 font-mono text-left space-y-1">
                <span className="text-white font-bold block flex items-center gap-1">
                  <Lock size={12} /> One-Time Download Rule:
                </span>
                <span>• Evaluated teams can download their official bundle only once.</span>
                <span className="block">• Please verify participant name spellings before downloading.</span>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-gray-100 text-black py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign in with Google (Team Leader)
              </button>
            </div>
          )}

          {/* Loading Session or Team */}
          {session && (loadingSession || loadingData) && (
            <div className="py-20 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="font-mono text-xs">Authenticating and verifying team eligibility...</span>
            </div>
          )}

          {/* CASE 2: Logged In, but No Registration Found */}
          {session && !loadingData && notFound && (
            <div className="max-w-lg mx-auto card p-8 border border-white/10 bg-black/60 backdrop-blur-2xl rounded-2xl text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">No Team Registration Found</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                We could not find any team registered under: <br />
                <span className="font-mono text-white font-semibold mt-1 block">{session.user.email}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                Please make sure you are signed in with the exact Google email address provided as the Team Leader email during hackathon registration.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                >
                  Sign Out & Try Another Email
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: Not Evaluated & Admin has not unlocked access yet */}
          {session && !loadingData && team && !isAccessGranted && (
            <div className="max-w-xl mx-auto card p-8 border border-white/10 bg-black/60 backdrop-blur-2xl rounded-2xl text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Lock size={32} />
              </div>
              <div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 uppercase tracking-wider">
                  Evaluation Pending
                </span>
                <h3 className="text-2xl font-bold text-white mt-2">Certificates Locked</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-md mx-auto">
                  Team <strong className="text-white">{team.team_name}</strong> has not completed formal evaluation yet, or certificate download access has not been unlocked by the coordinators.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-left font-mono text-xs space-y-2 text-gray-300">
                <div>Team: <strong className="text-white">{team.team_name}</strong></div>
                <div>Department: <strong className="text-white">{team.tl_department || 'N/A'}</strong></div>
                <div>Year: <strong className="text-white">{team.tl_year || 'N/A'}</strong></div>
                <div>Statement ID: <strong className="text-white">{team.allocated_ps_id || 'N/A'}</strong></div>
              </div>

              <p className="text-[11px] text-gray-500 font-mono">
                Official certificates are unlocked immediately once your evaluation is recorded, or when coordinators grant download access from the admin dashboard.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => session?.user?.email && fetchTeamAndEval(session.user.email)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                >
                  Refresh Access Status
                </button>
              </div>
            </div>
          )}

          {/* CASE 4: Certificate Generation & Download Portal (UNLOCKED for all evaluated teams + any non-evaluated team granted by admin) */}
          {session && !loadingData && team && isAccessGranted && (
            <div className="space-y-6">

              {/* Clean Top Glass Header & Command Panel */}
              <div className="card p-6 sm:p-7 border border-white/10 bg-black/60 backdrop-blur-xl rounded-2xl space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-white">
                        <FileCheck size={26} />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                          Participation Certificates
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 font-mono mt-0.5">
                          <span>Team: <strong className="text-white">{team.team_name}</strong></span>
                          <span>•</span>
                          <span>Dept: <strong className="text-white">{team.tl_department || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Year: <strong className="text-white">{team.tl_year || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Statement ID: <strong className="text-white">{team.allocated_ps_id || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Batch Download Actions (Loophole-free: Downloads all 5 at once) */}
                  <div className="shrink-0 w-full lg:w-auto">
                    {isAlreadyDownloaded ? (
                      <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-gray-300 text-xs font-mono flex items-center justify-center gap-2.5">
                        <CheckCircle2 size={16} className="text-white" />
                        <span>Downloaded ({downloadInfo?.format} on {downloadInfo?.at})</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedFormat('pdf');
                            setConfirmModalOpen(true);
                          }}
                          disabled={downloading || loadingPreviews}
                          className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-black px-5 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
                        >
                          <FileCheck size={16} /> Download 5 PDFs (.zip)
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFormat('png');
                            setConfirmModalOpen(true);
                          }}
                          disabled={downloading || loadingPreviews}
                          className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-xs font-bold border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
                        >
                          <Download size={16} /> Download 5 PNGs (.zip)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* BIG & BOLD NAME EDITING NOTICE (Monochrome Glass Panel) */}
                {!isAlreadyDownloaded ? (
                  <div className="card p-5 rounded-2xl bg-white/[0.04] border border-white/15 backdrop-blur-xl space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Info size={20} className="text-white shrink-0" />
                      <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                        IMPORTANT: CLICK DIRECTLY ON NAMES TO EDIT FULL NAMES & FIX TYPOS!
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base font-medium text-gray-300 leading-relaxed pl-7">
                      By <span className="underline decoration-white decoration-2 font-bold text-white">clicking directly on any member's name box below</span>, you can edit it to their official full name (including initials and surnames) or fix any spelling mistakes. Previews update live instantly. All 5 certificates will be downloaded with the exact names entered here!
                    </p>
                  </div>
                ) : (
                  <div className="card p-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-gray-300 font-mono flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-gray-400 shrink-0" />
                    <span>Download locked. Official certificates have already been claimed by your team.</span>
                  </div>
                )}

                {/* Live Status Message Toast */}
                {statusMessage && (
                  <div className="p-3 bg-white/10 border border-white/20 rounded-xl text-white text-xs font-mono flex items-center justify-between animate-fade-in">
                    <span>{statusMessage}</span>
                    {downloading && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                    )}
                  </div>
                )}
              </div>

              {/* 5 Clean Member Certificate Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {certMembers.map((m, idx) => {
                  const isTL = idx === 0;
                  const previewUrl = certPreviews[idx];
                  return (
                    <div
                      key={idx}
                      className="card p-4 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl space-y-3 flex flex-col justify-between hover:border-white/25 transition-all"
                    >
                      {/* Card Header with Role and Slot */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border bg-white/10 text-white border-white/15">
                            {isTL ? 'Team Leader' : `Member ${idx}`}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            Slot {idx + 1} of 5
                          </span>
                        </div>

                        {/* Direct Clean Name Input with Instant Live Re-render */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-0.5">
                            <span>Click to edit / fix typo:</span>
                            {!isAlreadyDownloaded && (
                              <span className="text-[11px] text-gray-300 flex items-center gap-1 font-mono">
                                <Edit3 size={10} className="text-gray-400" /> Editable
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            disabled={isAlreadyDownloaded}
                            value={m.name}
                            onChange={(e) => handleUpdateMemberName(idx, e.target.value)}
                            placeholder={`Enter ${m.role} Full Name`}
                            className={`w-full text-sm font-semibold bg-black/70 border border-white/20 rounded-xl py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all ${
                              isAlreadyDownloaded ? 'opacity-60 cursor-not-allowed' : 'hover:border-white/35'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 300 DPI Certificate Canvas Preview */}
                      <div className="relative aspect-[3300/2550] w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-md">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`Certificate for ${m.name}`}
                            className="w-full h-full object-contain rounded-xl"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 text-xs font-mono">
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Generating preview...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Clean Action Banner */}
              {!isAlreadyDownloaded && (
                <div className="card p-6 border border-white/10 bg-black/60 backdrop-blur-xl rounded-2xl text-center space-y-3">
                  <h4 className="text-base font-bold text-white">All names verified?</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Download all certificates directly to your device at once (no zip extraction needed). Remember, each team can download only once.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        setSelectedFormat('pdf');
                        setConfirmModalOpen(true);
                      }}
                      disabled={downloading || loadingPreviews}
                      className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all shadow-xl cursor-pointer disabled:opacity-50 hover:scale-105"
                    >
                      <FileCheck size={16} /> Download All ({certMembers.length}) PDFs
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFormat('png');
                        setConfirmModalOpen(true);
                      }}
                      disabled={downloading || loadingPreviews}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-xs font-bold border border-white/20 inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:scale-105"
                    >
                      <Download size={16} /> Download All ({certMembers.length}) PNGs
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Modal Before Download */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full card p-6 border border-white/15 bg-black/95 backdrop-blur-2xl rounded-2xl space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-white">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">One-Time Download Warning</h4>
                <span className="text-xs text-gray-400 font-mono">Select Format & Confirm Accurate Names</span>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 bg-white/[0.04] border border-white/15 rounded-xl space-y-1 text-xs text-gray-300 font-mono">
              <div className="font-bold text-white flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-white shrink-0" /> Important Notice:
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Each team is strictly allowed to download their official certificate package <strong>ONLY ONCE</strong> in either <strong>PDF</strong> or <strong>PNG</strong> format. All {certMembers.length} certificates will download directly into your downloads folder. Once confirmed, your team's download access will be permanently locked.
              </p>
            </div>

            {/* Format Selector: PDF vs PNG */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
                Choose Certificate File Format:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                    selectedFormat === 'pdf'
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-black/60 text-gray-300 border-white/15 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck size={16} />
                      <strong className="text-xs font-bold">Individual PDFs</strong>
                    </div>
                    {selectedFormat === 'pdf' && (
                      <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5 rounded">Selected</span>
                    )}
                  </div>
                  <p className={`text-[10px] ${selectedFormat === 'pdf' ? 'text-gray-800' : 'text-gray-400'}`}>
                    All {certMembers.length} separate printable .pdf documents downloaded directly
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('png')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                    selectedFormat === 'png'
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-black/60 text-gray-300 border-white/15 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download size={16} />
                      <strong className="text-xs font-bold">Individual PNGs</strong>
                    </div>
                    {selectedFormat === 'png' && (
                      <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5 rounded">Selected</span>
                    )}
                  </div>
                  <p className={`text-[10px] ${selectedFormat === 'png' ? 'text-gray-800' : 'text-gray-400'}`}>
                    All {certMembers.length} separate ultra-sharp 300 DPI .png images downloaded directly
                  </p>
                </button>
              </div>
            </div>

            {/* Verify Member Names */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Review Names on Certificates ({certMembers.length} Slots):</span>
                <span className="text-white text-[10px]">No typos?</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5 text-xs font-mono text-gray-300 max-h-36 overflow-y-auto">
                {certMembers.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-0.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-500 text-[11px]">{m.role}:</span>
                    <span className="text-white font-bold">{m.name || '(Blank)'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors cursor-pointer"
              >
                Go Back & Edit Names
              </button>
              <button
                type="button"
                onClick={() => executeOneTimeDownload(selectedFormat)}
                disabled={downloading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-gray-100 transition-colors cursor-pointer shadow-lg flex items-center gap-2"
              >
                {downloading ? (
                  <span>Downloading...</span>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Confirm & Download All ({certMembers.length}) {selectedFormat.toUpperCase()}s</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl text-gray-500 text-xs py-6 text-center">
        <p>© 2026 Sri Indu Institute of Engineering and Technology. Official Hackathon Certificates.</p>
      </footer>
    </div>
  );
}
