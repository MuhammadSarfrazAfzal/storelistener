import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, AlertCircle, CheckCircle, Lock, Mail, User, Store } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeCode, setStoreCode] = useState('STORE-NYC-01');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.status === 'pending') {
          setErrorMsg('⏳ Your account is currently PENDING Admin approval. Please wait for an administrator to approve your request before logging in.');
        } else if (data.status === 'rejected') {
          setErrorMsg(data.error || '❌ Your registration request was rejected by Admin.');
        } else {
          setErrorMsg(data.error || 'Invalid email or password.');
        }
        setLoading(false);
        return;
      }

      // Successful login
      localStorage.setItem('storelistener_token', data.token);
      localStorage.setItem('storelistener_user', JSON.stringify(data.user));
      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      setErrorMsg('Failed to connect to backend server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          storeCode,
          storeName: storeCode === 'STORE-NYC-01' ? 'Apple Authorized - 5th Ave' : (storeCode === 'STORE-LA-02' ? 'iStore Premium - Beverly Hills' : 'Apple Hub - Brickell')
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Registration successful, now pending Admin approval
      setSuccessNotice(data.message || '✅ Registration request submitted! Your account is pending Admin approval. You will be able to log in once an Admin approves your request.');
      setName('');
      setEmail('');
      setPassword('');
      setTab('login');
    } catch (err) {
      setErrorMsg('Registration error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick One-Click Demo Logins
  const quickLoginAsAdmin = () => {
    setEmail('admin@storelistener.com');
    setPassword('admin123');
    setTimeout(() => {
      fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@storelistener.com', password: 'admin123' })
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          localStorage.setItem('storelistener_token', d.token);
          localStorage.setItem('storelistener_user', JSON.stringify(d.user));
          onLoginSuccess(d.token, d.user);
          onClose();
        }
      });
    }, 100);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        background: '#0f172a',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '18px',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            marginBottom: '10px'
          }}>
            🛡️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>
            Storelistener Authentication
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            JWT Protected Terminal & Staff Approval System
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(148, 163, 184, 0.12)'
        }}>
          <button
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              background: tab === 'login' ? '#3b82f6' : 'transparent',
              color: tab === 'login' ? '#fff' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            User Login
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              background: tab === 'register' ? '#3b82f6' : 'transparent',
              color: tab === 'register' ? '#fff' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            Staff Sign Up (Request Access)
          </button>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10b981',
            fontSize: '12.5px',
            lineHeight: 1.5,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successNotice}</div>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: errorMsg.includes('PENDING') ? 'rgba(245, 158, 11, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            border: `1px solid ${errorMsg.includes('PENDING') ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: errorMsg.includes('PENDING') ? '#f59e0b' : '#ef4444',
            fontSize: '12.5px',
            lineHeight: 1.5,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Form: Login */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@storelistener.com or staff email"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '11px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                opacity: loading ? 0.7 : 1
              }}
            >
              <ShieldCheck size={16} />
              <span>{loading ? 'Authenticating...' : 'Sign In with JWT'}</span>
            </button>

            {/* Quick Demo Login Buttons */}
            <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)', paddingTop: '14px', marginTop: '6px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>
                Quick Instant Demo Access
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={quickLoginAsAdmin}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  ⚡ Admin Login (admin123)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Form: Register (Subject to Admin Approval) */
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#f59e0b',
              lineHeight: 1.4
            }}>
              <b>Notice:</b> New user registrations are automatically placed in <b>Pending</b> status. You can only log in after the Admin approves your account from the Admin Dashboard.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@store.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose strong password"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                Assigned Store Branch
              </label>
              <select
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '9px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#f8fafc',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              >
                <option value="STORE-NYC-01">Apple Authorized - 5th Ave (NYC-01)</option>
                <option value="STORE-LA-02">iStore Premium - Beverly Hills (LA-02)</option>
                <option value="STORE-MIA-03">Apple Hub - Brickell (MIA-03)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '11px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                opacity: loading ? 0.7 : 1
              }}
            >
              <UserCheck size={16} />
              <span>{loading ? 'Submitting...' : 'Submit Request for Admin Approval'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
