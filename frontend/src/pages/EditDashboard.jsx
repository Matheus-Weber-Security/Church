import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { HomeEditor } from '../components/HomeEditor';
import { PluginManager } from '../components/PluginManager';
import { GodolfredoChat } from '../components/GodolfredoChat';
import { UserManager } from '../components/UserManager';
import { AccessLogs } from '../components/AccessLogs';
import { useAuth } from '../context/AuthContext';

export const EditDashboard = ({ onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState('home');
  const { isAdmin } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-black)' }}>
      {/* Menu Superior Preto com Texto Branco */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigateHome={onNavigateHome}
      />

      {/* Conteúdo Principal do Painel */}
      <main className={activeTab === 'home' ? 'dashboard-layout-full' : 'dashboard-layout'}>
        {activeTab === 'home' && <HomeEditor />}
        {activeTab === 'plugins' && <PluginManager />}
        {activeTab === 'ai' && <GodolfredoChat />}
        {activeTab === 'users' && isAdmin && <UserManager />}
        {activeTab === 'logs' && isAdmin && <AccessLogs />}
      </main>
    </div>
  );
};
