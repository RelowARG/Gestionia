import React, { useState, useEffect, useRef } from 'react';

const IAWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks'); 
    const [tasks, setTasks] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ia', text: 'Hola 👋. Soy tu Gerente Virtual. Revisa la pestaña **Tareas** para ver pendientes.' }
    ]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    const API_URL = 'http://localhost:3001/api/ia';

    useEffect(() => {
        if (isOpen) fetchTasks();
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'chat') scrollToBottom();
    }, [chatHistory, activeTab, isExpanded]);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const fetchTasks = async () => {
        try {
            const res = await fetch(`${API_URL}/tasks`);
            if(!res.ok) throw new Error("Error fetching");
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) { console.error("Error tasks", error); setTasks([]); }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatHistory(prev => [...prev, { sender: 'user', text: msg }]);
        setChatInput('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: msg })
            });
            const data = await res.json();
            setChatHistory(prev => [...prev, { sender: 'ia', text: data.respuesta }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { sender: 'ia', text: 'Error de conexión.' }]);
        }
        setLoading(false);
    };

    // --- FORMATEADOR DE TEXTO MEJORADO ---
    // Ahora entiende links formato markdown: [Texto](URL) y negritas **Texto**
    const formatText = (text) => {
        if (!text) return "";
        
        // 1. Dividir por líneas para respetar párrafos
        return text.split('\n').map((line, lineIdx) => {
            // 2. Regex para detectar Links Markdown: [Texto](URL)
            // Dividimos la línea en partes: texto normal | [link](url) | texto normal
            const parts = line.split(/(\[.*?\]\(.*?\))/g);
            
            const renderParts = parts.map((part, pIdx) => {
                // Si es un link markdown
                if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
                    const match = part.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        return (
                            <a 
                                key={pIdx} 
                                href={match[2]} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{color:'#3498db', textDecoration:'underline', fontWeight:'bold'}}
                            >
                                {match[1]} ↗
                            </a>
                        );
                    }
                }
                
                // Si es texto normal, buscamos Negritas (**texto**)
                const boldParts = part.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((bPart, bIdx) => {
                    if (bPart.startsWith('**') && bPart.endsWith('**')) {
                        return <b key={`${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</b>;
                    }
                    return <span key={`${pIdx}-${bIdx}`}>{bPart}</span>;
                });
            });

            return <div key={lineIdx} style={{marginBottom:'4px'}}>{renderParts}</div>;
        });
    };

    // Estilos
    const s = {
        container: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'Segoe UI, sans-serif' },
        window: {
            position: 'absolute', bottom: '80px', right: '0',
            width: isExpanded ? '600px' : '380px',
            height: isExpanded ? '80vh' : '600px',
            background: '#f8f9fa', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #ddd',
            transition: 'all 0.3s ease'
        },
        header: {
            background: '#2c3e50', padding: '15px 20px', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        },
        tabs: { display: 'flex', background: 'white', borderBottom: '1px solid #ddd' },
        tab: (isActive) => ({
            flex: 1, padding: '12px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontWeight: isActive ? '700' : '500',
            color: isActive ? '#2c3e50' : '#95a5a6',
            borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent'
        }),
        content: { flex: 1, overflowY: 'auto', padding: '20px' },
        bubble: (sender) => ({
            maxWidth: '85%', padding: '12px 16px', borderRadius: '12px',
            background: sender === 'user' ? '#3498db' : 'white',
            color: sender === 'user' ? 'white' : '#2c3e50',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '10px',
            alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
            fontSize: '14px', lineHeight: '1.5'
        }),
        taskCard: {
            background: 'white', borderRadius: '10px', padding: '15px', marginBottom: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #e74c3c'
        },
        badge: (type) => ({
            background: type === 'cobranza' ? '#e74c3c' : '#f39c12',
            color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', float: 'right'
        }),
        waButton: {
            display: 'block', width: '100%', padding: '10px', marginTop: '10px',
            background: '#25D366', color: 'white', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontWeight: 'bold', textAlign: 'center', textDecoration: 'none'
        },
        fab: { width: '60px', height: '60px', borderRadius: '50%', background: '#2c3e50', color: 'white', border: 'none', cursor: 'pointer', fontSize: '28px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }
    };

    return (
        <div style={s.container}>
            {isOpen && (
                <div style={s.window}>
                    <div style={s.header}>
                        <div style={{fontWeight:'bold'}}>🤖 Gerente Virtual</div>
                        <div>
                            <button onClick={() => setIsExpanded(!isExpanded)} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:'18px', marginRight:'10px'}}>
                                {isExpanded ? '↙' : '↗'}
                            </button>
                            <button onClick={() => setIsOpen(false)} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:'20px'}}>×</button>
                        </div>
                    </div>
                    <div style={s.tabs}>
                        <button style={s.tab(activeTab === 'tasks')} onClick={() => setActiveTab('tasks')}>Tareas ({tasks.length})</button>
                        <button style={s.tab(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>Chat</button>
                    </div>
                    <div style={s.content}>
                        {activeTab === 'tasks' ? (
                            tasks.length === 0 ? <p style={{textAlign:'center', color:'#999'}}>¡Todo al día!</p> :
                            tasks.map(task => (
                                <div key={task.id} style={{...s.taskCard, borderLeft: task.tipo === 'cobranza' ? '4px solid #e74c3c' : '4px solid #f39c12'}}>
                                    <span style={s.badge(task.tipo)}>{task.tipo}</span>
                                    <b style={{color:'#333'}}>{task.titulo}</b>
                                    <p style={{fontSize:'13px', color:'#666', margin:'5px 0'}}>{task.subtitulo}</p>
                                    <div style={{background:'#f0f2f5', padding:'10px', borderRadius:'6px', fontSize:'13px', fontStyle:'italic', color:'#555', marginTop:'10px'}}>
                                        "{task.mensaje}"
                                    </div>
                                    {task.telefono ? (
                                        <a href={`https://wa.me/${task.telefono}?text=${encodeURIComponent(task.mensaje)}`} target="_blank" rel="noreferrer" style={s.waButton}>
                                            📲 Enviar WhatsApp
                                        </a>
                                    ) : (
                                        <button disabled style={{...s.waButton, background:'#ccc', cursor:'not-allowed'}}>Falta Teléfono</button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} style={{display:'flex', justifyContent: msg.sender==='user'?'flex-end':'flex-start'}}>
                                        <div style={s.bubble(msg.sender)}>{formatText(msg.text)}</div>
                                    </div>
                                ))}
                                {loading && <div style={{color:'#999', fontSize:'12px', marginLeft:'10px'}}>Escribiendo...</div>}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>
                    {activeTab === 'chat' && (
                        <form style={{padding:'15px', background:'white', borderTop:'1px solid #eee', display:'flex', gap:'10px'}} onSubmit={handleChatSubmit}>
                            <input style={{flex:1, padding:'10px', borderRadius:'20px', border:'1px solid #ddd'}} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe..." />
                            <button type="submit" style={{background:'#3498db', color:'white', border:'none', width:'40px', height:'40px', borderRadius:'50%', cursor:'pointer'}}>➤</button>
                        </form>
                    )}
                </div>
            )}
            <button style={s.fab} onClick={() => setIsOpen(!isOpen)}>🤖</button>
        </div>
    );
};

export default IAWidget;