import React, { useState, useEffect, useRef } from 'react';

const IAWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'chat'
    const [insights, setInsights] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ia', text: 'Hola, soy tu analista virtual. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Referencia para el scroll del chat
    const chatEndRef = useRef(null);

    // Ajusta tu URL de backend si es necesario
    const API_URL = 'http://localhost:4000/api/ia';

    useEffect(() => {
        fetchInsights();
        // Opcional: Polling cada 5 minutos para nuevas alertas
        const interval = setInterval(fetchInsights, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            scrollToBottom();
        }
    }, [chatHistory, isOpen, activeTab]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchInsights = async () => {
        try {
            const res = await fetch(`${API_URL}/insights`);
            const data = await res.json();
            setInsights(data);
            setUnreadCount(data.length);
        } catch (error) {
            console.error("Error fetching insights:", error);
        }
    };

    const openExternalLink = (url) => {
        if (window.electron && window.electron.openExternal) {
            window.electron.openExternal(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSendWhatsapp = async (insight) => {
        const { telefono, mensaje_whatsapp, nombre_cliente } = insight.datos_extra;
        if (!telefono) return alert("Sin teléfono registrado.");

        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje_whatsapp)}`;
        openExternalLink(waUrl);

        try {
            await fetch(`${API_URL}/insights/${insight.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'gestionado' })
            });
            fetchInsights();
        } catch (err) { console.error(err); }
    };

    const handleDismiss = async (id) => {
        try {
            await fetch(`${API_URL}/insights/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'descartado' })
            });
            fetchInsights();
        } catch (err) { console.error(err); }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
        setChatInput('');
        setLoadingChat(true);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMsg })
            });
            const data = await res.json();
            setChatHistory(prev => [...prev, { sender: 'ia', text: data.respuesta }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { sender: 'ia', text: 'Error de conexión. Intenta de nuevo.' }]);
        }
        setLoadingChat(false);
    };

    // --- ESTILOS INLINE (Para copiar y pegar fácil) ---
    const s = {
        widgetContainer: {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            fontFamily: 'Segoe UI, sans-serif'
        },
        fab: {
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            transition: 'transform 0.2s'
        },
        badge: {
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ff4757',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            border: '2px solid white'
        },
        window: {
            position: 'absolute',
            bottom: '80px',
            right: '0',
            width: '350px',
            height: '500px',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 5px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #eee'
        },
        header: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '15px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        tabs: {
            display: 'flex',
            background: '#f1f2f6',
            padding: '5px',
            gap: '5px'
        },
        tab: (isActive) => ({
            flex: 1,
            padding: '8px',
            border: 'none',
            background: isActive ? 'white' : 'transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: isActive ? 'bold' : 'normal',
            color: isActive ? '#764ba2' : '#747d8c',
            boxShadow: isActive ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s'
        }),
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '15px',
            background: '#f8f9fa'
        },
        // Estilos Alertas
        card: {
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '10px',
            borderLeft: '4px solid #764ba2',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        },
        waBtn: {
            background: '#25D366',
            color: 'white',
            border: 'none',
            width: '100%',
            padding: '8px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '8px',
            fontWeight: 'bold'
        },
        // Estilos Chat
        msgRow: (sender) => ({
            display: 'flex',
            justifyContent: sender === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '10px'
        }),
        bubble: (sender) => ({
            maxWidth: '80%',
            padding: '10px 14px',
            borderRadius: '12px',
            background: sender === 'user' ? '#764ba2' : 'white',
            color: sender === 'user' ? 'white' : '#333',
            boxShadow: sender === 'ia' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            borderBottomRightRadius: sender === 'user' ? '2px' : '12px',
            borderBottomLeftRadius: sender === 'ia' ? '2px' : '12px'
        }),
        chatInputArea: {
            padding: '10px',
            background: 'white',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: '10px'
        },
        input: {
            flex: 1,
            padding: '10px',
            borderRadius: '20px',
            border: '1px solid #ddd',
            outline: 'none'
        },
        sendBtn: {
            background: '#764ba2',
            color: 'white',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }
    };

    return (
        <div style={s.widgetContainer}>
            {isOpen && (
                <div style={s.window}>
                    <div style={s.header}>
                        <h4 style={{margin:0}}>Asistente Virtual</h4>
                        <button onClick={() => setIsOpen(false)} style={{background:'transparent', border:'none', color:'white', cursor:'pointer', fontSize:'20px'}}>×</button>
                    </div>
                    
                    <div style={s.tabs}>
                        <button style={s.tab(activeTab === 'alerts')} onClick={() => setActiveTab('alerts')}>
                            Alertas {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                        <button style={s.tab(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
                            Chat IA
                        </button>
                    </div>

                    <div style={s.content}>
                        {activeTab === 'alerts' ? (
                            <>
                                {insights.length === 0 ? (
                                    <p style={{textAlign:'center', color:'#888', marginTop:'20px'}}>Todo al día. No hay alertas.</p>
                                ) : (
                                    insights.map(item => (
                                        <div key={item.id} style={s.card}>
                                            <strong style={{display:'block', marginBottom:'5px'}}>{item.datos_extra?.titulo}</strong>
                                            <p style={{margin:0, fontSize:'0.9rem', color:'#555'}}>{item.mensaje}</p>
                                            
                                            {item.tipo === 'WHATSAPP_SUGERIDO' && (
                                                <div style={{marginTop:'10px', background:'#f0f2f5', padding:'8px', borderRadius:'5px', fontSize:'0.85rem'}}>
                                                    <em style={{display:'block', marginBottom:'5px'}}>"{item.datos_extra?.mensaje_whatsapp}"</em>
                                                    <button style={s.waBtn} onClick={() => handleSendWhatsapp(item)}>
                                                        📲 Enviar WhatsApp
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDismiss(item.id)}
                                                        style={{marginTop:'5px', background:'transparent', border:'none', color:'#999', cursor:'pointer', width:'100%', fontSize:'0.8rem'}}
                                                    >
                                                        Descartar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </>
                        ) : (
                            // CHAT VIEW
                            <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                                <div style={{flex:1}}>
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} style={s.msgRow(msg.sender)}>
                                            <div style={s.bubble(msg.sender)}>{msg.text}</div>
                                        </div>
                                    ))}
                                    {loadingChat && <div style={{color:'#999', fontSize:'0.8rem', fontStyle:'italic'}}>Escribiendo...</div>}
                                    <div ref={chatEndRef} />
                                </div>
                            </div>
                        )}
                    </div>

                    {activeTab === 'chat' && (
                        <form style={s.chatInputArea} onSubmit={handleChatSubmit}>
                            <input 
                                style={s.input} 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Pregunta sobre ventas, stock..."
                            />
                            <button type="submit" style={s.sendBtn} disabled={loadingChat}>➤</button>
                        </form>
                    )}
                </div>
            )}

            <button style={s.fab} onClick={() => setIsOpen(!isOpen)}>
                🤖
                {unreadCount > 0 && !isOpen && <div style={s.badge}>{unreadCount}</div>}
            </button>
        </div>
    );
};

export default IAWidget;