import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Send, Sparkles, RefreshCw, HelpCircle, Bot, User, CheckCircle2, Lightbulb } from 'lucide-react';

export const GodolfredoChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'godolfredo',
      text: `Olá! Eu sou o **Godolfredo**, seu anjo assistente e copiloto no construtor de páginas! 👼✨

Estou aqui para tirar qualquer dúvida sobre:
- 🎨 **Edição da Página Home:** Como arrastar blocos, trocar textos com duplo clique (CKEditor), enviar fotos e cores.
- 🧩 **Gerenciador de Plugins:** Como ligar/desligar plugins nativos e cadastrar novas ferramentas via CDN.
- 👥 **Usuários e Acessos:** Como criar usuários, permissões de Admin vs Editor e consultar logs.
- 📱 **Modo Celular e Links:** Como ajustar a versão mobile e criar botões para WhatsApp.

Pode escolher uma das perguntas rápidas abaixo ou digitar a sua dúvida! 💡`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const quickQuestions = [
    { label: 'Como adicionar um novo plugin?', icon: '🧩' },
    { label: 'Como editar textos com o CKEditor?', icon: '✍️' },
    { label: 'Como cadastrar um novo usuário editor?', icon: '👥' },
    { label: 'Como ajustar o layout para celular?', icon: '📱' },
    { label: 'Como criar um botão de WhatsApp?', icon: '💬' },
    { label: 'Por que os 9 plugins não podem ser excluídos?', icon: '🔒' },
    { label: 'Como fazer upload de imagens na página?', icon: '🖼️' }
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend = null) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim() || loading) return;

    const userMessageId = Date.now().toString();
    const newUserMessage = {
      id: userMessageId,
      sender: 'user',
      text: query.trim()
    };

    setMessages((prev) => [...prev, newUserMessage]);
    if (typeof textToSend !== 'string') setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await api.sendAiMessage(query.trim(), historyPayload);
      const botReply = res?.reply || 'Oi! Tive uma pequena oscilação. Pode perguntar novamente? 👼';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'godolfredo',
          text: botReply,
          source: res?.source
        }
      ]);
    } catch (err) {
      console.error('Erro ao falar com Godolfredo:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'godolfredo',
          text: 'Puxa, parece que tive uma leve perda de conexão com os servidores. Por favor, tente enviar sua pergunta novamente! 👼'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'godolfredo',
        text: `Conversa reiniciada com sucesso! 👼✨ 

Estou de prontidão para te ajudar. Sobre o que você gostaria de aprender agora? Edição de páginas, plugins ou cadastro de usuários?`
      }
    ]);
  };

  // Renderiza texto simples com formatação de negrito, listas e blocos de código
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content = line;

      // Títulos simples (# ou ## ou ###)
      if (line.startsWith('### ')) {
        return <h4 key={idx} style={{ color: '#60a5fa', margin: '12px 0 6px', fontSize: '1.05rem' }}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} style={{ color: '#93c5fd', margin: '14px 0 8px', fontSize: '1.15rem' }}>{line.replace('## ', '')}</h3>;
      }

      // Linhas com marcador (- ou *)
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0 4px 12px' }}>
            <span style={{ color: '#38bdf8', marginTop: '2px' }}>•</span>
            <span>{parseInlineStyles(bulletText)}</span>
          </div>
        );
      }

      // Linhas numeradas (1. 2. 3.)
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '6px 0 6px 8px' }}>
            <span style={{ 
              background: 'rgba(59, 130, 246, 0.2)', 
              color: '#60a5fa', 
              borderRadius: '50%', 
              width: '20px', 
              height: '20px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '11px', 
              fontWeight: 700, 
              flexShrink: 0 
            }}>
              {numMatch[1]}
            </span>
            <span style={{ lineHeight: 1.5 }}>{parseInlineStyles(numMatch[2])}</span>
          </div>
        );
      }

      // Linha vazia
      if (!line.trim()) {
        return <div key={idx} style={{ height: '8px' }} />;
      }

      return <p key={idx} style={{ margin: '4px 0', lineHeight: 1.6 }}>{parseInlineStyles(line)}</p>;
    });
  };

  // Helper para substituir **negrito**, `código` e *itálico*
  const parseInlineStyles = (str) => {
    const parts = [];
    let remaining = str;
    let keyIdx = 0;

    // Regex simples para negrito **...** e código `...`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={keyIdx++} style={{ color: '#f8fafc' }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={keyIdx++} style={{ 
            backgroundColor: '#18181b', 
            border: '1px solid #27272a', 
            color: '#38bdf8', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '0.85em', 
            fontFamily: 'monospace' 
          }}>
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={keyIdx++} style={{ color: '#cbd5e1' }}>{token.slice(1, -1)}</em>);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '1.5rem 1rem',
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      color: '#ffffff'
    }}>
      {/* Cabeçalho do Godolfredo */}
      <div style={{
        background: 'linear-gradient(135deg, #18181b 0%, #1e1b4b 100%)',
        border: '1px solid #312e81',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Avatar com halo e luz */}
          <div style={{ position: 'relative' }}>
            <img
              src="/godolfredo.jpg"
              alt="Godolfredo Anjo Assistente"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #fbbf24',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.45)'
              }}
              onError={(e) => {
                // Fallback se a imagem não carregar por algum motivo
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{
              display: 'none',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#4338ca',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              border: '3px solid #fbbf24'
            }}>
              👼
            </div>
            {/* Ponto verde Online */}
            <span style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #18181b'
            }} title="Godolfredo está online" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Godolfredo</h2>
              <span style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fde68a',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={11} /> Anjo Assistente IA
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
              Tire dúvidas sobre edição da Home, novos plugins e cadastro de usuários em tempo real
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleResetChat}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px'
            }}
            title="Limpar e reiniciar conversa"
          >
            <RefreshCw size={14} />
            <span>Nova Conversa</span>
          </button>
        </div>
      </div>

      {/* Sugestões de Perguntas Rápidas */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 2px',
        scrollbarWidth: 'none'
      }}>
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q.label)}
            disabled={loading}
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#cbd5e1',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = '#1e1b4b';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#27272a';
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#18181b';
            }}
          >
            <span>{q.icon}</span>
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Caixa de Mensagens (Chat Scroll) */}
      <div style={{
        flex: 1,
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '16px',
        padding: '1.25rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              {!isUser && (
                <img
                  src="/godolfredo.jpg"
                  alt="Godolfredo"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #fbbf24',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              )}
              {!isUser && (
                <div style={{
                  display: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#4338ca',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  border: '2px solid #fbbf24',
                  flexShrink: 0
                }}>
                  👼
                </div>
              )}

              <div style={{
                maxWidth: isUser ? '75%' : '85%',
                backgroundColor: isUser ? '#2563eb' : '#18181b',
                border: isUser ? '1px solid #3b82f6' : '1px solid #27272a',
                color: '#ffffff',
                padding: '0.9rem 1.25rem',
                borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                fontSize: '0.92rem',
                lineHeight: 1.5,
                boxShadow: isUser ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>Godolfredo</span>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Assistente Oficial</span>
                  </div>
                )}
                <div>
                  {isUser ? msg.text : renderFormattedText(msg.text)}
                </div>
              </div>

              {isUser && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <User size={18} color="#ffffff" />
                </div>
              )}
            </div>
          );
        })}

        {/* Indicador de Digitando (Loading) */}
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <img
              src="/godolfredo.jpg"
              alt="Godolfredo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #fbbf24'
              }}
            />
            <div style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              padding: '0.75rem 1.25rem',
              borderRadius: '4px 16px 16px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Godolfredo está pensando...</span>
              <span className="dot-flashing" style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                animation: 'pulse 1.2s infinite ease-in-out'
              }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Barra de Entrada de Mensagem */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        background: '#121217',
        border: '1px solid #27272a',
        borderRadius: '12px',
        padding: '0.5rem 0.75rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte ao Godolfredo (ex: como adicionar plugins, editar textos, cadastrar usuários)..."
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.92rem',
            padding: '0.5rem',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#27272a',
            color: input.trim() && !loading ? '#ffffff' : '#71717a',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: input.trim() && !loading ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none'
          }}
        >
          <Send size={15} />
          <span>Enviar</span>
        </button>
      </div>
    </div>
  );
};
