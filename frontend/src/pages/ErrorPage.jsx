import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, Lock, FileQuestion, WifiOff, ServerCrash, ArrowLeft, Home } from 'lucide-react';

const ErrorPage = ({ type = '404', message }) => {
  const navigate = useNavigate();

  const getErrorContent = () => {
    switch (type) {
      case '403':
        return {
          icon: <Lock size={64} style={{ color: 'var(--error)' }} />,
          code: '403',
          title: 'Access Denied',
          desc: message || "You don't have permission to access this page. Please contact your administrator if you believe this is a mistake."
        };
      case '500':
        return {
          icon: <ServerCrash size={64} style={{ color: 'var(--error)' }} />,
          code: '500',
          title: 'Internal Server Error',
          desc: message || "Oops! Something went wrong on our end. Our servers are having a little trouble. Please try again later."
        };
      case 'offline':
        return {
          icon: <WifiOff size={64} style={{ color: 'var(--warning)' }} />,
          code: 'Offline',
          title: 'No Internet Connection',
          desc: message || "It looks like you've lost your internet connection. Please check your network settings and try again."
        };
      case '404':
      default:
        return {
          icon: <FileQuestion size={64} style={{ color: 'var(--primary-gold)' }} />,
          code: '404',
          title: 'Page Not Found',
          desc: message || "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
        };
    }
  };

  const content = getErrorContent();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        padding: '3rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        maxWidth: '500px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        
        {/* Icon & Code */}
        <div style={{ position: 'relative' }}>
          {content.icon}
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            right: '-15px',
            background: 'var(--bg-panel)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            {content.code}
          </div>
        </div>

        {/* Text content */}
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {content.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            {content.desc}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => navigate('/dashboard')}
          >
            <Home size={16} /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
