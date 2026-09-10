import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowLeft, CheckCircle2, Layers, Users, ShieldCheck, AlertTriangle, LogOut, FileCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function StatusCheck() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [problemStatement, setProblemStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        fetchUserStatus(session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        fetchUserStatus(session.user.email);
      } else {
        setTeam(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserStatus = async (userEmail: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const emailLower = userEmail.toLowerCase().trim();
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .ilike('tl_email', emailLower)
        .maybeSingle();

      if (teamErr || !teamData) {
        setTeam(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTeam(teamData);

      const [evalRes, psRes] = await Promise.all([
        supabase.from('evaluations').select('*').eq('team_id', teamData.id).maybeSingle(),
        teamData.allocated_ps_id 
          ? supabase.from('problem_statements').select('*').eq('id', teamData.allocated_ps_id).maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      setEvaluation(evalRes.data || null);
      setProblemStatement(psRes.data || null);
    } catch (err) {
      console.error('Error fetching status data:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const redirectUrl = window.location.origin + '/status';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTeam(null);
    setNotFound(false);
  };

  const isShortlisted = (() => {
    if (!evaluation || !evaluation.scores) return false;
    if (typeof evaluation.scores === 'object') return Boolean(evaluation.scores.is_shortlisted);
    if (typeof evaluation.scores === 'string') {
      try {
        const parsed = JSON.parse(evaluation.scores);
        return Boolean(parsed.is_shortlisted);
      } catch {
        return false;
      }
    }
    return false;
  })();

  return (
    <div className="min-h-screen selection:bg-white/20 flex flex-col justify-between">
      <div>
        {/* Navigation */}
        <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/sri-indu-logo.jpg" alt="Logo" className="h-9 object-contain rounded-md" />
            <h1 className="text-lg sm:text-xl font-bold text-white">Code Storm 2026</h1>
          </div>
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => navigate('/allocation')} 
              className="text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <Layers size={15} /> View Allocation
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white">
              <Award size={32} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Your Shortlist Status</h1>
            <p className="text-sm text-gray-400 mt-2">
              Login with your registered Team Leader Google Account to view your status.
            </p>
          </div>

          <div className="card p-6 border border-white/15 bg-black/60 backdrop-blur-2xl shadow-2xl rounded-2xl space-y-6">
            {/* CASE 1: Not Logged In */}
            {!session && (
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 bg-white/5 text-white rounded-full flex items-center justify-center mx-auto border border-white/10">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Team Leader Login Required</h3>
                  <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    Please sign in with your registered Team Leader email account to verify and view your team's shortlist status.
                  </p>
                </div>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 font-bold text-sm cursor-pointer shadow-xl max-w-md mx-auto"
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
            )}

            {/* Loading state */}
            {session && loading && (
              <div className="py-12 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying your team registration...</span>
              </div>
            )}

            {/* CASE 2: No registration found for email */}
            {session && !loading && notFound && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">No Registrations Found</h3>
                  <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                    No team registration was found for: <br />
                    <span className="font-mono font-semibold text-white mt-1 block">{session.user.email}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Please ensure you sign in using the Team Leader email provided during hackathon registration.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2 max-w-sm mx-auto">
                  <button
                    onClick={handleSignOut}
                    className="btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={14} /> Sign Out & Try Another Email
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: Team Found */}
            {session && !loading && team && (
              <div className="space-y-4">
                {isShortlisted ? (
                  <div className="bg-white/[0.04] border border-white/15 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/15 text-3xl">
                      🎉
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/15 uppercase tracking-wider">
                        <CheckCircle2 size={13} /> Status: Shortlisted
                      </span>
                      <h3 className="text-2xl font-black text-white mt-2">
                        Congratulations!
                      </h3>
                      <p className="text-base font-bold text-white mt-1">
                        Team {team.team_name}
                      </p>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed max-w-sm mx-auto">
                        Your team has been shortlisted for the further round of Code Storm 2026!
                      </p>
                      <div className="mt-3 bg-white/10 border border-white/15 px-3.5 py-2 rounded-xl text-xs text-white font-medium max-w-sm mx-auto">
                        Next round is on tomorrow i.e, 03/09/2026 (Thursday). Good luck!
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto border border-white/10 text-3xl">
                      🌟
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-gray-300 border border-white/15 uppercase tracking-wider">
                        Status: Not Shortlisted
                      </span>
                      <h3 className="text-2xl font-bold text-white mt-2">
                        Better luck Next time
                      </h3>
                      <p className="text-sm font-semibold text-gray-300 mt-1">
                        Team {team.team_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-3 leading-relaxed max-w-sm mx-auto">
                        Thank you for participating in Code Storm 2026. We truly appreciate your hard work, problem-solving spirit, and innovative thinking. Keep coding, learning, and innovating!
                      </p>
                    </div>
                  </div>
                )}

                {/* Relevant Team Details Box */}
                <div className="bg-black/40 rounded-xl p-4 border border-white/10 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px] pb-1 border-b border-white/10">
                    Your Team Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-gray-300 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Team Name:</span>
                      <span className="text-white font-semibold">{team.team_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Problem Statement:</span>
                      <span className="text-white font-semibold">{team.allocated_ps_id || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-500 block">Statement Title:</span>
                      <span className="text-white">{problemStatement?.title || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Team Leader:</span>
                      <span className="text-white">{team.tl_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Leader Mobile:</span>
                      <span className="text-white">{team.tl_mobile || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-500 block">Registered Email:</span>
                      <span className="text-white break-all">{team.tl_email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Department:</span>
                      <span className="text-white">{team.tl_department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Year:</span>
                      <span className="text-white">{team.tl_year || '-'}</span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  {team.members && team.members.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] text-gray-500 block font-mono mb-1.5 flex items-center gap-1">
                        <Users size={12} /> Team Members ({team.members.length}):
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] text-gray-300">
                        {team.members.map((member: string, i: number) => (
                          <li key={i} className="bg-white/5 px-2.5 py-1 rounded border border-white/5 truncate">
                            {i + 1}. {member}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/certificates')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <FileCheck size={14} /> Download Participation Certificates (All 5) →
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    onClick={handleSignOut}
                    className="text-gray-400 hover:text-white underline underline-offset-4 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut size={12} /> Sign Out ({session.user.email})
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary text-[11px] px-3.5 py-1.5 cursor-pointer"
                  >
                    Go to Dashboard →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl text-gray-400 text-xs py-6 text-center">
        <p>© 2026 Sri Indu Institute of Engineering and Technology. All rights reserved.</p>
      </footer>
    </div>
  );
}
