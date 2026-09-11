import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Trash2,
  KeyRound,
  Check,
  AlertCircle,
  X
} from 'lucide-react';

export const UserManager = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State para Novo Usuário
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'editor'
  });

  // Form State para Editar Usuário
  const [editFormData, setEditFormData] = useState({
    role: 'editor',
    newPassword: ''
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setIsModalOpen(false);
      setNewUser({ username: '', password: '', role: 'editor' });
      loadUsers();
      alert('Usuário cadastrado com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  const handleOpenEdit = (targetUser) => {
    setSelectedUser(targetUser);
    setEditFormData({
      role: targetUser.role,
      newPassword: ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(selectedUser.id, {
        role: editFormData.role,
        password: editFormData.newPassword || undefined
      });
      setIsEditModalOpen(false);
      loadUsers();
      alert('Usuário atualizado com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao atualizar usuário.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'root') {
      alert('O usuário "root" primordial não pode ser excluído.');
      return;
    }
    if (targetUser.id === currentUser?.id) {
      alert('Você não pode excluir seu próprio usuário logado.');
      return;
    }

    if (!window.confirm(`Tem certeza de que deseja remover o usuário "${targetUser.username}"?`)) {
      return;
    }

    try {
      await api.deleteUser(targetUser.id);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Erro ao excluir usuário.');
    }
  };

  return (
    <div className="container-main">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            <UsersIcon size={26} />
            <span>Gerenciamento de Usuários</span>
          </h1>
          <p className="section-subtitle">
            Crie e administre os acessos à página de edição (<code>/edit</code>) e atribua permissões de Admin ou Editor.
          </p>
        </div>

        <button
          id="btn-new-user"
          className="btn-accent"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus size={18} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Permissão (Role)</th>
              <th>Data de Cadastro</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Carregando lista de usuários...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#272732',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>(você)</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge-role ${u.role === 'admin' ? 'badge-admin' : 'badge-editor'}`}>
                      {u.role === 'admin' ? 'Administrador' : 'Editor de Conteúdo'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : 'Original'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenEdit(u)}
                        title="Alterar permissão ou senha"
                      >
                        <KeyRound size={13} />
                        <span>Editar</span>
                      </button>

                      {u.username !== 'root' && u.id !== currentUser?.id && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#f87171' }}
                          onClick={() => handleDeleteUser(u)}
                          title="Remover acesso do usuário"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Criar Novo Usuário */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cadastrar Novo Usuário</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nome de Usuário</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: pastor.lucas"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha Inicial</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 4 dígitos (ex: C1234)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Perfil de Acesso (Role)</label>
                <select
                  className="form-input"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="editor">Editor (Pode alterar cards, fotos e textos da Home)</option>
                  <option value="admin">Administrador (Acesso total, gestão de usuários e logs)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Usuário: {selectedUser.username}</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Perfil de Acesso (Role)</label>
                <select
                  className="form-input"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Redefinir Senha (opcional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  Salvar Modificações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
