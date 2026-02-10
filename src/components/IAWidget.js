// src/components/IAWidget.js
import React, { useState, useEffect, useRef } from 'react';
import './IAWidget.css'; 

const IAWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks'); 
    
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ia', text: 'Hola 👋. Soy tu Gerente Labeltech. Revisa la pestaña **Tareas** para ver novedades.' }
    ]);
    const [loadingChat, setLoadingChat] = useState(false);
    
    const chatEndRef = useRef(null);
    
    // *** AQUÍ ESTÁ TU IP DE TAILSCALE ***
    const API_URL = 'http://100.115.111.50:3001/api/ia';

    useEffect(() => {
        if (isOpen) fetchTasks();
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, activeTab, isExpanded]);

    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            const timestamp = new Date().getTime(); 
            // Obtenemos el token almacenado (aunque el backend lo permite sin token por ahora, es buena práctica enviarlo)
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/tasks?t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(!res.ok) throw new Error("Error fetching");
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) { 
            console.error("Error tasks", error); 
            setTasks([]); 
        }
        setLoadingTasks(false);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        
        const msg = chatInput;
        setChatHistory(prev => [...prev, { sender: 'user', text: msg }]);
        setChatInput('');
        setLoadingChat(true);
        
        const token = localStorage.getItem('authToken');

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question: msg })
            });
            const data = await res.json();
            setChatHistory(prev => [...prev, { sender: 'ia', text: data.respuesta }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { sender: 'ia', text: 'Error de conexión.' }]);
        }
        setLoadingChat(false);
    };

    const formatText = (text) => {
        if (!text) return "";
        return text.split('\n').map((line, lineIdx) => {
            const parts = line.split(/(\[.*?\]\(.*?\))/g);
            const renderParts = parts.map((part, pIdx) => {
                if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
                    const match = part.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        return (
                            <a key={pIdx} href={match[2]} target="_blank" rel="noreferrer" className="ia-chat-link">
                                {match[1]} ↗
                            </a>
                        );
                    }
                }
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

    return (
        <div className="ia-container">
            <div className={`ia-window ${isOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}>
                <div className="ia-header">
                    <div className="ia-header-title">🤖 Gerente Labeltech</div>
                    <div className="ia-header-actions">
                        <button onClick={fetchTasks} className="ia-btn-icon" title="Actualizar">🔄</button>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="ia-btn-icon" title={isExpanded ? "Achicar" : "Agrandar"}>{isExpanded ? '↙' : '↗'}</button>
                        <button onClick={() => setIsOpen(false)} className="ia-btn-icon ia-btn-close">×</button>
                    </div>
                </div>

                <div className="ia-tabs">
                    <button className={`ia-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tareas {tasks.length > 0 && `(${tasks.length})`}</button>
                    <button className={`ia-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat Virtual</button>
                </div>

                <div className="ia-content">
                    {activeTab === 'tasks' ? (
                        loadingTasks ? (
                            <div className="ia-loading-state"><div style={{fontSize:'24px', marginBottom:'10px'}}>⏳</div>Analizando datos...</div>
                        ) : tasks.length === 0 ? (
                            <div className="ia-empty-state"><div style={{fontSize:'40px', marginBottom:'10px'}}>✅</div><p>¡Todo al día! No hay alertas.</p></div>
                        ) : (
                            tasks.map(task => (
                                <div key={task.id} className={`ia-task-card ${task.tipo}`}>
                                    <span className={`ia-badge ${task.tipo}`}>{task.tipo === 'mensaje' ? '💬 NUEVO' : task.tipo}</span>
                                    <b className="ia-task-title">{task.titulo}</b>
                                    <p className="ia-task-subtitle">{task.subtitulo}</p>
                                    <div className="ia-task-preview">"{task.mensaje}"</div>
                                    {task.telefono ? (
                                        <a href={`https://wa.me/${task.telefono}?text=${encodeURIComponent(task.mensaje)}`} target="_blank" rel="noreferrer" className="ia-wa-button">📲 Enviar WhatsApp</a>
                                    ) : (
                                        <button disabled className="ia-wa-button disabled">🚫 Falta Teléfono</button>
                                    )}
                                </div>
                            ))
                        )
                    ) : (
                        <div className="ia-chat-container">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} style={{display:'flex', justifyContent: msg.sender==='user'?'flex-end':'flex-start'}}>
                                    <div className={`ia-bubble ${msg.sender}`}>{formatText(msg.text)}</div>
                                </div>
                            ))}
                            {loadingChat && <div style={{color:'#95a5a6', fontSize:'12px', marginLeft:'10px', marginTop:'5px'}}>Escribiendo...</div>}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {activeTab === 'chat' && (
                    <form className="ia-chat-input-area" onSubmit={handleChatSubmit}>
                        <input className="ia-chat-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe aquí..." />
                        <button type="submit" className="ia-chat-send-btn">➤</button>
                    </form>
                )}
            </div>
            {!isOpen && <button className="ia-fab" onClick={() => setIsOpen(true)}>🤖</button>}
        </div>
    );
};

export default IAWidget;