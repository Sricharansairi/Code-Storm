import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { 
  Users, 
  MapPin, 
  FileText, 
  LogOut, 
  ArrowLeft, 
  CheckCircle2, 
  Layers, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getTeamSlotInfo, isPSMatch } from '../utils/batchUtils';

interface AllocationViewerProps {
  session: Session | null;
}

export default function AllocationViewer({ session }: AllocationViewerProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any>(null);
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [unregistered, setUnregistered] = useState(false);

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch problem statements
      const { data: psData } = await supabase.from('problem_statements').select('*');
      const loadedPS = psData || [];
      setProblemStatements(loadedPS);

      // Fetch all teams (needed for deterministic 50/50 split index calculation)
      const { data: teamsData } = await supabase.from('teams').select('*');
      const loadedTeams = teamsData || [];
      setAllTeams(loadedTeams);

      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase().trim();

        // Match logged in user's team ONLY
        const matchedTeam = loadedTeams.find((t: any) => t.tl_email?.toLowerCase().trim() === userEmail);
        
        if (matchedTeam) {
          setTeamData(matchedTeam);
          setUnregistered(false);
          // Explicitly record allocation view visit
          try {
            await supabase.from('site_visits').upsert({
              email: userEmail,
              last_visited_at: new Date().toISOString()
            });
          } catch (e) {
            console.error('Error recording allocation visit:', e);
          }
        } else {
          setTeamData(null);
          setUnregistered(true);
        }
      }
    } catch (err) {
      console.error('Error fetching allocation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const redirectUrl = window.location.origin + '/allocation';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTeamData(null);
    setUnregistered(false);
  };

  const slotInfo = teamData ? getTeamSlotInfo(teamData, problemStatements, allTeams) : null;
  const psInfo = teamData ? problemStatements.find(p => isPSMatch(p.id, teamData.allocated_ps_id)) : null;

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex flex-col selection:bg-white/20">
      {/* Navigation Bar */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/sri-indu-logo.jpg" alt="Logo" className="h-9 object-contain rounded-md" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Code Storm 2026</h1>
            <p className="text-[11px] text-gray-400">Team Allocation Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>

          {session && (
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">Loading your allocation...</p>
          </div>
        )}

        {/* Not Logged In View */}
        {!loading && !session && (
          <div className="max-w-md mx-auto py-12 text-center space-y-6">
            <div className="card p-8 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto text-white">
                <Layers size={32} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">View Your Allocation</h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Please log in with your <strong>Registered Team Leader Email</strong> to view your team's assigned Batch, Presentation Day, and Room Number.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full btn-primary flex items-center justify-center gap-3 py-3 px-4 font-semibold text-sm shadow-xl"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <div className="pt-4 border-t border-white/10 text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} className="text-gray-400" />
                Team leaders only
              </div>
            </div>
          </div>
        )}

        {/* Unregistered / No Team Found */}
        {!loading && session && unregistered && (
          <div className="max-w-md mx-auto py-12 text-center space-y-6">
            <div className="card p-8 bg-white/[0.03] border border-white/10 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">No Team Found</h2>
                <p className="text-xs text-gray-400">
                  Signed in as: <span className="font-mono text-gray-200">{session.user.email}</span>
                </p>
                <p className="text-xs text-gray-400 pt-1">
                  No registered team was found for this email address. Please make sure you are signed in with the exact email provided during team registration.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={handleSignOut} className="btn-primary text-xs py-2.5">
                  Sign out and try another account
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary text-xs py-2">
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registered Team Allocation View (Shows ONLY Their Team & Batch) */}
        {!loading && teamData && slotInfo && (
          <div className="space-y-6">
            {/* Top Team Header Card */}
            <div className="card p-6 sm:p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/10 text-white px-3 py-1 rounded-full border border-white/10">
                  <CheckCircle2 size={13} className="text-white" /> Confirmed Allocation
                </span>
                
                <span className="text-xs font-mono text-gray-400">
                  Team Leader Email: <span className="text-gray-200">{teamData.tl_email}</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {teamData.team_name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Team Leader: <strong className="text-white">{teamData.tl_name}</strong> • Department: <strong className="text-white">{teamData.tl_department || 'Engineering'}</strong> • Year: <strong className="text-white">{teamData.tl_year || 'II'}</strong>
                </p>
              </div>

              {/* 4 Pillars Allocation Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={11} /> Batch Number
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-white">{slotInfo.batchName}</p>
                  <span className="text-[10px] text-gray-500">Your Assigned Batch</span>
                </div>

                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={11} /> Presentation Day
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-white">{slotInfo.day}</p>
                  <span className="text-[10px] text-gray-500">{slotInfo.dayNum}</span>
                </div>

                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={11} /> Allocated Room
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-white">{slotInfo.roomNumber}</p>
                  <span className="text-[10px] text-gray-500">All-Day Room</span>
                </div>

                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Users size={11} /> Total Members
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-white">{(teamData.members?.length || 0) + 1}</p>
                  <span className="text-[10px] text-gray-500">1 Leader + {teamData.members?.length || 0} Members</span>
                </div>
              </div>
            </div>

            {/* Problem Statement Card */}
            <div className="card p-6 bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
                  <FileText size={14} /> Problem Statement Chosen
                </span>
                <span className="text-xs font-mono font-bold bg-white/10 text-white px-2.5 py-0.5 rounded-md border border-white/10">
                  {psInfo?.id || teamData.allocated_ps_id}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white">
                {psInfo?.title || 'Problem Statement Title'}
              </h2>

              {psInfo?.description && (
                <p className="text-xs text-gray-300 leading-relaxed bg-black/20 p-3.5 rounded-lg border border-white/5">
                  {psInfo.description}
                </p>
              )}

              {psInfo?.categories && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(Array.isArray(psInfo.categories) ? psInfo.categories : String(psInfo.categories).split(',')).map((cat: string, i: number) => (
                    <span key={i} className="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                      {cat.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Registered Team Members */}
            <div className="card p-6 bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-gray-300" /> Registered Team Members
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-0.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Team Leader</span>
                  <p className="text-xs font-bold text-white">{teamData.tl_name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{teamData.tl_mobile || '-'}</p>
                </div>

                {(teamData.members || []).map((m: string, idx: number) => (
                  <div key={idx} className="p-3 bg-black/20 rounded-lg border border-white/5 space-y-0.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Member {idx + 1}</span>
                    <p className="text-xs font-bold text-white">{m}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guidelines */}
            <div className="card p-6 bg-white/[0.03] border border-white/10 space-y-2 text-xs text-gray-400 leading-relaxed">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                📌 Key Guidelines
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Please report to room <strong>{slotInfo.roomNumber}</strong> by <strong>09:00 AM</strong> on <strong>{slotInfo.day}</strong>.</li>
                <li>All team members must carry their valid college ID cards.</li>
                <li>Ensure your presentation is prepared in accordance with official PPT format.</li>
                <li>Carry your own laptops, chargers, and pre-installed software dependencies.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
