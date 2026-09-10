import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Lightbulb, Download, Globe, MapPin, Award, X, CheckCircle2, Users, ShieldCheck, AlertTriangle, LogOut, FileCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

const InstagramIcon = ({ size = 15, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const YoutubeIcon = ({ size = 15, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <polygon points="10 15 15 12 10 9"/>
  </svg>
);

const LinkedinIcon = ({ size = 15, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

export default function Landing() {
  const navigate = useNavigate();

  // Status modal & session state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [problemStatement, setProblemStatement] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (statusModalOpen) {
      if (session?.user?.email) {
        fetchUserStatus(session.user.email);
      } else {
        setTeam(null);
        setNotFound(false);
      }
    }
  }, [statusModalOpen, session]);

  const fetchUserStatus = async (userEmail: string) => {
    setLoadingStatus(true);
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
        setLoadingStatus(false);
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
      console.error('Error fetching team status:', err);
      setNotFound(true);
    } finally {
      setLoadingStatus(false);
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
        <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/sri-indu-logo.jpg" alt="Logo" className="h-9 object-contain rounded-md" />
            <h1 className="text-lg sm:text-xl font-bold text-white">Code Storm 2026</h1>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
            {/* Download Certificates Button */}
            <button 
              onClick={() => navigate('/certificates')} 
              className="text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <FileCheck size={15} /> Download Certificates
            </button>
            {/* View Your Status Button */}
            <button 
              onClick={() => setStatusModalOpen(true)} 
              className="text-xs sm:text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <Award size={15} /> View Status
            </button>
            <button 
              onClick={() => navigate('/auth')} 
              className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors px-2"
            >
              Admin Auth
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
            >
              Leader Login
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-300 mb-2 tracking-widest uppercase">Code Storm 2026</h2>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            Internal Hackathon for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">SIH 2026</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Welcome to Code Storm 2026. The ultimate hackathon experience. Build innovative solutions, tackle real-world problems, and showcase your skills.
          </p>
          
          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-3xl mx-auto">
            <button 
              onClick={() => navigate('/certificates')} 
              className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5 shadow-2xl font-bold cursor-pointer"
            >
              <FileCheck size={18} /> Download Participation Certificate <ArrowRight size={18} />
            </button>

            <button 
              onClick={() => setStatusModalOpen(true)} 
              className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 text-base px-7 py-3.5 cursor-pointer"
            >
              <Award size={18} /> View Your Status
            </button>
            
            <button 
              onClick={() => navigate('/details')} 
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-base text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={18} /> PPT Format
            </button>
          </div>

          {/* Sub Text Links */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2.5 sm:gap-4 mt-6 text-xs text-gray-400">
            <button 
              onClick={() => navigate('/allocation')} 
              className="hover:text-white underline underline-offset-4 py-1 cursor-pointer transition-colors"
            >
              View Your Allocation
            </button>
            <span className="hidden sm:inline text-gray-600">•</span>
            <button 
              onClick={() => navigate('/login')} 
              className="hover:text-white underline underline-offset-4 py-1 cursor-pointer transition-colors"
            >
              Exercise Options (Team Leader Login)
            </button>
            <span className="hidden sm:inline text-gray-600">•</span>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="hover:text-white underline underline-offset-4 py-1 cursor-pointer transition-colors"
            >
              View Statements (Guest)
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div id="about" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white">About Code Storm 2026</h2>
              <p className="mt-4 text-lg text-gray-300">SIIET's internal hackathon to select teams for Smart India Hackathon 2026</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="card text-center p-8 bg-white/[0.03] border border-white/10">
                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <Trophy size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">SIH 2026 Selection</h3>
                <p className="text-gray-400 text-sm">Top performers get selected to represent SIIET at the national-level Smart India Hackathon 2026.</p>
              </div>
              
              <div className="card text-center p-8 bg-white/[0.03] border border-white/10">
                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <Lightbulb size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Solve Real-World PS</h3>
                <p className="text-gray-400 text-sm">Work on problem statements from government ministries and industries — build solutions that make an impact.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* View Your Status Modal - Authentication Required */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="card w-full max-w-lg border border-white/15 bg-black/80 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Award className="text-white" size={20} />
                <h3 className="text-lg font-bold text-white">Your Shortlist Status</h3>
              </div>
              <button 
                onClick={() => setStatusModalOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* CASE 1: Not Logged In */}
              {!session && (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 bg-white/5 text-white rounded-full flex items-center justify-center mx-auto border border-white/10">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Team Leader Login Required</h4>
                    <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Please sign in with your registered Team Leader email account to view your team's shortlist status.
                    </p>
                  </div>
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 font-bold text-sm cursor-pointer shadow-xl"
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

              {/* Loading State */}
              {session && loadingStatus && (
                <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying your team registration...</span>
                </div>
              )}

              {/* CASE 2: Logged In but No Registration Found */}
              {session && !loadingStatus && notFound && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                    <AlertTriangle size={30} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">No Registrations Found</h4>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      No team registration was found for: <br />
                      <span className="font-mono font-semibold text-white mt-1 block">{session.user.email}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">
                      Please ensure you are signed in with the exact Team Leader email used during registration.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleSignOut}
                      className="btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} /> Sign Out & Try Another Email
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 3: Team Found & Status Display */}
              {session && !loadingStatus && team && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  {isShortlisted ? (
                    <div className="bg-white/[0.04] border border-white/15 rounded-2xl p-5 text-center space-y-3 shadow-xl">
                      <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/15 text-2xl">
                        🎉
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/15 uppercase tracking-wider">
                          <CheckCircle2 size={13} /> Status: Shortlisted
                        </span>
                        <h3 className="text-xl font-black text-white mt-2">
                          Congratulations!
                        </h3>
                        <p className="text-sm font-bold text-white mt-0.5">
                          Team {team.team_name}
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                          Your team has been shortlisted for the further round of Code Storm 2026!
                        </p>
                        <div className="mt-2.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-white font-medium">
                          Next round is on tomorrow i.e, 03/09/2026 (Thursday). Good luck!
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto border border-white/10 text-2xl">
                        🌟
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-gray-300 border border-white/15 uppercase tracking-wider">
                          Status: Not Shortlisted
                        </span>
                        <h3 className="text-xl font-bold text-white mt-2">
                          Better luck Next time
                        </h3>
                        <p className="text-sm font-semibold text-gray-300 mt-0.5">
                          Team {team.team_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
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

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={handleSignOut}
                      className="text-gray-400 hover:text-white underline underline-offset-4 flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut size={12} /> Sign Out ({session.user.email})
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="btn-secondary text-[11px] px-3 py-1 cursor-pointer"
                    >
                      Go to Dashboard →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.01] flex justify-end">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="btn-secondary text-xs px-5 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-8">
            
            {/* College Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src="/sri-indu-logo.jpg" alt="Sri Indu Logo" className="h-10 object-contain rounded-md" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Sri Indu Institute of Engineering & Technology</h3>
                  <p className="text-[11px] text-gray-400">Approved by AICTE, New Delhi & Affiliated to JNTUH</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 flex items-start gap-1.5 leading-relaxed pt-1">
                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <span>Sheriguda (V), Ibrahimpatnam (M), R.R. District, Hyderabad, Telangana - 501510</span>
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-2 md:text-center">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
              <div className="flex flex-col gap-2 text-xs">
                <button onClick={() => setStatusModalOpen(true)} className="hover:text-white transition-colors text-left md:text-center font-medium">
                  View Shortlist Status
                </button>
                <button onClick={() => navigate('/allocation')} className="hover:text-white transition-colors text-left md:text-center">
                  View Batch & Slot Allocation
                </button>
                <button onClick={() => navigate('/details')} className="hover:text-white transition-colors text-left md:text-center">
                  Event Details & PPT Template
                </button>
                <button onClick={() => navigate('/login')} className="hover:text-white transition-colors text-left md:text-center">
                  Team Leader Login
                </button>
                <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors text-left md:text-center">
                  Problem Statements (Guest)
                </button>
              </div>
            </div>

            {/* Social & Web Links */}
            <div className="space-y-3 md:text-right">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Connect With Us</h4>
              <div className="flex md:justify-end gap-3 items-center">
                <a 
                  href="https://siiet.ac.in" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Official Website"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all"
                >
                  <Globe size={15} />
                </a>
                <a 
                  href="https://www.instagram.com/sriindu_institutions/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Instagram"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all"
                >
                  <InstagramIcon size={15} />
                </a>
                <a 
                  href="https://www.youtube.com/@sriinduinstitutions" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="YouTube"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all"
                >
                  <YoutubeIcon size={15} />
                </a>
                <a 
                  href="https://www.linkedin.com/school/sri-indu-institute-of-engineering-and-technology/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="LinkedIn"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all"
                >
                  <LinkedinIcon size={15} />
                </a>
              </div>
              <p className="text-[11px] text-gray-500 pt-1">
                Official Hackathon Portal • SIIET
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-gray-500">
            <p>© 2026 Sri Indu Institute of Engineering and Technology. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Code Storm 2026 • Internal SIH Selection
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
