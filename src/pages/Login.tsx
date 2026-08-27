import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  session: Session | null;
}

export default function Login({ session }: LoginProps) {
  const [message, setMessage] = useState('');
  const [checkingRole, setCheckingRole] = useState(false);
  const [unregistered, setUnregistered] = useState(false);
  const [hasBothRoles, setHasBothRoles] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      checkUserRole(session.user.email);
    }
  }, [session]);

  const checkUserRole = async (userEmail: string | undefined) => {
    if (!userEmail) return;
    setCheckingRole(true);
    
    const { data: adminData } = await supabase.from('admins').select('email').eq('email', userEmail).single();
    const { data: teamData } = await supabase.from('teams').select('tl_email').eq('tl_email', userEmail).single();

    if (adminData && teamData) {
      setCheckingRole(false);
      setHasBothRoles(true);
      return;
    } else if (adminData) {
      navigate('/admin');
      return;
    } else if (teamData) {
      navigate('/dashboard');
      return;
    }

    setCheckingRole(false);
    setUnregistered(true);
  };

  const handleGoogleLogin = async () => {
    setMessage('');
    const redirectUrl = window.location.origin + '/login';
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
    
    if (error) {
      setMessage('Error logging in: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUnregistered(false);
    setMessage('');
  };

  if (checkingRole && session && !unregistered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-300 font-medium animate-pulse">Verifying access...</p>
      </div>
    );
  }

  if (unregistered && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full space-y-6 text-center border-yellow-500/25">
          <div className="w-16 h-16 bg-yellow-500/15 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Not Registered</h2>
          <p className="text-gray-300">
            No registration found with this mail: <span className="font-semibold text-white">{session.user.email}</span>
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <button onClick={() => navigate('/dashboard')} className="w-full btn-primary text-center">
              View Statements (Guest)
            </button>
            <button onClick={handleSignOut} className="w-full btn-secondary">
              Sign out and try another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasBothRoles && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full space-y-6 text-center border-primary/25">
          <div className="w-16 h-16 bg-primary/15 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Choose Workspace</h2>
          <p className="text-gray-300 text-sm">
            You have both Administrator and Participant access for Code Storm 2026. Where would you like to go?
          </p>
          
          <div className="grid grid-cols-1 gap-4 pt-4">
            <button onClick={() => navigate('/admin')} className="w-full btn-primary flex flex-col items-center p-4 gap-2 h-auto">
              <span className="font-bold text-lg">Admin Dashboard</span>
              <span className="text-xs opacity-80 font-normal">Manage problem statements and teams</span>
            </button>
            <button onClick={() => navigate('/dashboard')} className="w-full btn-secondary flex flex-col items-center p-4 gap-2 h-auto">
              <span className="font-bold text-lg text-white">Participant Dashboard</span>
              <span className="text-xs text-gray-300 font-normal">Select problem statements for your team</span>
            </button>
          </div>
          
          <button onClick={handleSignOut} className="text-sm text-red-400 hover:text-red-300 mt-4 underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden z-[1]">
      {/* Extra decorative glow for login page */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none" 
           style={{ background: 'radial-gradient(circle, rgba(124,107,196,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full pointer-events-none" 
           style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      <div className="card max-w-md w-full space-y-8 relative">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 transform -rotate-3 shadow-lg shadow-primary/30">
            CS
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-gray-300">
            Sign in to access the Problem Statement Portal
          </p>
        </div>
        
        <div className="space-y-6 mt-8">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-black/30 backdrop-blur-xl/8 border border-white/15 text-white px-6 py-3 rounded-xl font-semibold hover:bg-black/30 backdrop-blur-xl/12 hover:border-white/25 transition-all duration-300 backdrop-blur-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {message && (
            <div className={`p-4 text-sm rounded-lg border ${message.includes('Error') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
