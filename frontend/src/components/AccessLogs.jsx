import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FileText, RefreshCw, Trash2, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';

export const AccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getLogs();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || 'Erro ao consultar logs de acesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Deseja realmente limpar todo o histórico de logs de acesso?')) return;
    try {
      await api.clearLogs();
      loadLogs();
    } catch (err) {
      alert(err.message || 'Erro ao limpar logs.');
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'login_success':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#34d399',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={12} /> Login Bem-Sucedido
          </span>
        );
      case 'login_failed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#f87171',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <AlertTriangle size={12} /> Tentativa Falha
          </span>
        );
      case 'logout':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#9ca3af',
            backgroundColor: 'rgba(156, 163, 175, 0.15)',
            border: '1px solid rgba(156, 163, 175, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <LogOut size={12} /> Logout Realizado
          </span>
        );
      default:
        return action;
    }
  };

  return (
    <div className="container-main">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            <FileText size={26} />
            <span>Logs de Acesso e Auditoria</span>
          </h1>
          <p className="section-subtitle">
            Monitore o histórico em tempo real de quem fez login ou tentou acessar o painel de edição do Church.
          </p>
        </div>

        <div className="action-buttons">
          <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>

          <button className="btn-secondary" onClick={handleClearLogs} style={{ color: '#f87171' }}>
            <Trash2 size={15} />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Data e Hora</th>
              <th>Usuário</th>
              <th>Evento</th>
              <th>Endereço IP</th>
              <th>Dispositivo / Navegador</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Carregando registros de auditoria...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum registro de acesso registrado até o momento.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.85rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {log.username}
                  </td>
                  <td>
                    {getActionBadge(log.action)}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {log.ip_address}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.user_agent}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
