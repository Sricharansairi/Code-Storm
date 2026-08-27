import type { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import ProblemStatementCard from '../components/ProblemStatementCard';
import { LogOut, CheckCircle2, Search, Users, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  session: Session | null;
}

export default function ParticipantDashboard({ session }: DashboardProps) {
  const [statements, setStatements] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('realtime_ps')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setStatements(prev => prev.map(ps => ps.id === payload.new.id ? payload.new : ps));
        } else if (payload.eventType === 'INSERT') {
          setStatements(prev => [...prev, payload.new].sort((a, b) => a.id.localeCompare(b.id)));
        } else if (payload.eventType === 'DELETE') {
          setStatements(prev => prev.filter(ps => ps.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    const { data: psData } = await supabase.from('problem_statements').select('*').order('id');
    if (psData) {
      setStatements(psData);
    }

    if (session) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('tl_email', session.user.email)
        .single();

      if (teamData) {
        setTeamInfo(teamData);
        if (teamData.allocated_ps_id) {
          setSelectedId(teamData.allocated_ps_id);
          setIsLocked(true);
        }
      }

      const { data: adminData } = await supabase.from('admins').select('email').eq('email', session.user.email).single();
      if (adminData) {
        setIsAdmin(true);
      }
    }

    setLoading(false);
  };


  const handleSelect = (id: string) => {
    if (!session) {
      alert("Please log in as a Team Leader to opt for a problem statement!");
      window.location.href = '/login';
      return;
    }
    if (!teamInfo) {
      alert("Only Registered Team Leaders can opt for a problem statement!");
      return;
    }
    if (teamInfo.is_disabled) {
      alert("Your team has been disabled by the administrator and cannot opt for problem statements.");
      return;
    }
    if (isLocked) return;
    setSelectedId(selectedId === id ? null : id);
  };

  const handleConfirm = async () => {
    if (!selectedId || !session) return;
    if (teamInfo?.is_disabled) {
      alert("Your team has been disabled by the administrator and cannot lock in problem statements.");
      return;
    }

    const isConfirmed = window.confirm("WARNING: Are you absolutely sure? Once you lock in this problem statement, your choice is final and cannot be changed!");
    if (!isConfirmed) return;
    
    const { data: ps } = await supabase
      .from('problem_statements')
      .select('current_teams, max_teams')
      .eq('id', selectedId)
      .single();

    if (ps && ps.current_teams >= ps.max_teams) {
      alert("Sorry, this problem statement just became full!");
      fetchData();
      return;
    }

    await supabase.from('problem_statements').update({ current_teams: (ps?.current_teams || 0) + 1 }).eq('id', selectedId);
    await supabase.from('teams').update({ 
      allocated_ps_id: selectedId, 
      allocation_time: new Date().toISOString() 
    }).eq('tl_email', session.user.email);

    setIsLocked(true);
    alert('Successfully locked in your problem statement!');
    fetchData();
  };

  const filteredStatements = statements.filter(ps => 
    ps.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (ps.categories && ps.categories.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div 
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => window.location.href = '/'}
        >
          <img src="/sri-indu-logo.jpg" alt="Sri Indu Logo" className="h-10 object-contain rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Code Storm 2026</h1>
            <p className="text-xs text-gray-300">Problem Statement Selection</p>
          </div>
        </div>
        

        <div className="flex items-center gap-4">
           <div className="text-sm text-right">
             <p className="font-bold text-white max-w-[160px] sm:max-w-none truncate">
               {session ? session.user.email : 'Guest Visitor'}
             </p>
             <p className="text-gray-300 text-xs truncate max-w-[160px] sm:max-w-none">
               {session ? (teamInfo?.team_name || 'Team Leader') : 'Viewing Only'}
             </p>
           </div>
           
           <div className="flex items-center gap-2">
             {isAdmin && (
               <button onClick={() => window.location.href = '/admin'} className="p-2 text-gray-300 hover:text-primary transition-colors" title="Switch to Admin Dashboard">
                 <ShieldCheck size={20} />
               </button>
             )}
             {session ? (
               <button onClick={() => supabase.auth.signOut()} className="p-2 text-gray-300 hover:text-red-400 transition-colors" title="Sign Out">
                 <LogOut size={20} />
               </button>
             ) : (
               <button onClick={() => window.location.href = '/login'} className="px-4 py-1.5 bg-primary/20 text-primary text-sm font-semibold rounded-lg hover:bg-primary/30 transition-colors">
                 Log In
               </button>
             )}
           </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Team Details Card */}
        {teamInfo && (
          <div className="card p-6 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/15 text-primary rounded-xl border border-primary/20">
                <Users size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{teamInfo.team_name}</h2>
                <p className="text-gray-300 text-sm mt-1">Leader: {teamInfo.tl_name} ({teamInfo.tl_email})</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-300 font-medium">
                   <span>Dept: {teamInfo.tl_department}</span>
                   <span>Year: {teamInfo.tl_year}</span>
                </div>
              </div>
            </div>
            {teamInfo.members && teamInfo.members.length > 0 && (
              <div className="text-right bg-black/30 backdrop-blur-xl rounded-lg p-4 w-full md:w-auto border border-white/10">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 text-left md:text-right">Team Members</p>
                <ul className="text-sm text-gray-200 space-y-1 text-left md:text-right">
                  {teamInfo.members.map((m: string, i: number) => (
                    <li key={i} className="flex items-center justify-start md:justify-end gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Disabled Banner */}
        {teamInfo?.is_disabled && (
          <div className="card rounded-xl p-4 flex items-center gap-3 border-red-500/30 bg-red-500/10 text-red-300">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-200">Account Disabled</h3>
              <p className="text-sm text-red-300/90">
                Your team has been disabled by the administrator. Problem statement selection and modifications are currently unavailable.
              </p>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <div className={`card rounded-xl p-4 flex items-center gap-3 ${
          isLocked 
            ? 'border-emerald-500/25 bg-emerald-500/5' 
            : 'border-yellow-500/25 bg-yellow-500/5'
        }`}>
          <CheckCircle2 className={isLocked ? 'text-emerald-400' : 'text-yellow-400'} />
          <div>
            <h3 className={`font-semibold ${isLocked ? 'text-emerald-300' : 'text-yellow-300'}`}>
              {isLocked ? 'Statement Allocated' : 'Selection Pending'}
            </h3>
            <p className={`text-sm ${isLocked ? 'text-emerald-400/80' : 'text-yellow-400/80'}`}>
              {isLocked 
                ? `Your team has successfully secured ${selectedId}. Good luck hacking!` 
                : 'Please select a problem statement below. Statements are allocated on a First-Come-First-Serve basis.'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="card flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
           <div className="relative w-full sm:w-96 z-[2]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
             <input 
               type="text" 
               placeholder="Search by keyword or category..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg w-full pl-10 pr-4"
             />
           </div>
        </div>

        {/* Problem Statements */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Available Statements (Max 13 Teams per PS)</h2>
          {loading ? (
            <p className="text-gray-300 animate-pulse">Loading statements from database...</p>
          ) : (
            <div className="flex flex-col space-y-4">
              {filteredStatements.map(ps => (
                <ProblemStatementCard 
                  key={ps.id}
                  id={ps.id}
                  title={ps.title}
                  sponsor={ps.sponsor}
                  description={ps.description}
                  categories={ps.categories || []}
                  currentTeams={ps.current_teams}
                  maxTeams={ps.max_teams}
                  selected={selectedId === ps.id}
                  onSelect={handleSelect}
                  know_more_link={ps.know_more_link}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Confirmation Bar */}
      {!isLocked && selectedId && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/10 p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-gray-300">Currently Selected:</p>
              <p className="font-bold text-primary">{statements.find(p => p.id === selectedId)?.title}</p>
            </div>
            <button onClick={handleConfirm} className="btn-primary w-full sm:w-auto px-8">
              Confirm & Lock Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
