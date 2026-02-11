// src/components/IAWidget.js
import React, { useState, useEffect, useRef } from 'react';
import './IAWidget.css';
import miloLogo from '../assets/milo.png';

const IAWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks'); 
    
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [processingAction, setProcessingAction] = useState(null); 
    
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ia', text: 'Hola 👋. Soy **Milowsky**. Mis sugerencias ahora son persistentes: no desaparecen hasta que las gestiones.' }
    ]);
    const [loadingChat, setLoadingChat] = useState(false);
    
    const chatEndRef = useRef(null);

    const api = window.electronAPI; 
    const DEV_URL = 'http://100.115.111.50:3001/api/ia';

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
            let data;
            if (api && api.iaGetTasks) {
                data = await api.iaGetTasks();
            } else {
                const res = await fetch(`${DEV_URL}/tasks`);
                data = await res.json();
            }
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) { 
            console.error("Error tasks", error); 
            setTasks([]); 
        }
        setLoadingTasks(false);
    };

    const handleTaskAction = async (task, action) => {
        setProcessingAction(task.id); 
        
        const payload = {
            taskId: task.id,
            taskType: task.tipo,
            action: action, 
            phone: task.telefono,
            message: task.mensaje,
            original_db_id: task.original_db_id // <--- IMPORTANTE: Enviamos esto si existe
        };

        try {
            if (api && api.iaPerformAction) {
                await api.iaPerformAction(payload);
            } else {
                await fetch(`${DEV_URL}/action`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
            }
            
            if (action === 'auto_send') await new Promise(r => setTimeout(r, 1000));
            setTasks(prev => prev.filter(t => t.id !== task.id));
            
        } catch (e) {
            console.error("Error accion tarea", e);
            alert("Error: " + e.message);
        } finally {
            setProcessingAction(null);
        }
    };

    // ... (El resto del código del chat y renderizado es IDÉNTICO al anterior, 
    // solo asegúrate de mantener las funciones handleChatSubmit y formatText)
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatHistory(prev => [...prev, { sender: 'user', text: msg }]);
        setChatInput('');
        setLoadingChat(true);
        try {
            let respuesta;
            if (api && api.iaChat) {
                const res = await api.iaChat(msg);
                respuesta = res.respuesta;
            } else {
                const res = await fetch(`${DEV_URL}/chat`, {
                    method: 'POST', body: JSON.stringify({ question: msg }), headers: {'Content-Type': 'application/json'}
                });
                const data = await res.json();
                respuesta = data.respuesta;
            }
            setChatHistory(prev => [...prev, { sender: 'ia', text: respuesta }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { sender: 'ia', text: 'Error conexión.' }]);
        }
        setLoadingChat(false);
    };

    const formatText = (text) => {
        if (!text) return "";
        return text.split('\n').map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return <div key={lineIdx} style={{marginBottom:'4px'}}>{parts.map((p,i)=>p.startsWith('**')?<b key={i}>{p.slice(2,-2)}</b>:<span key={i}>{p}</span>)}</div>;
        });
    };

    return (
        <div className="ia-container">
            <div className={`ia-window ${isOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}>
                <div className="ia-header">
                    <div className="ia-header-title">🤖 Milowsky</div>
                    <div className="ia-header-actions">
                        <button onClick={fetchTasks} className="ia-btn-icon">🔄</button>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="ia-btn-icon">{isExpanded ? '↙' : '↗'}</button>
                        <button onClick={() => setIsOpen(false)} className="ia-btn-icon ia-btn-close">×</button>
                    </div>
                </div>
                <div className="ia-tabs">
                    <button className={`ia-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tareas {tasks.length > 0 && `(${tasks.length})`}</button>
                    <button className={`ia-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
                </div>
                <div className="ia-content">
                    {activeTab === 'tasks' ? (
                        loadingTasks ? <div className="ia-loading-state">⏳ Cargando tareas...</div> : 
                        tasks.length === 0 ? <div className="ia-empty-state">✅ ¡Todo al día!</div> : 
                        tasks.map(task => (
                            <div key={task.id} className={`ia-task-card ${task.tipo}`} style={{opacity: processingAction===task.id?0.5:1}}>
                                <span className={`ia-badge ${task.tipo}`}>{task.tipo === 'mensaje' ? '💬' : task.tipo.toUpperCase()}</span>
                                <b className="ia-task-title">{task.titulo}</b>
                                <p className="ia-task-subtitle">{task.subtitulo}</p>
                                <div className="ia-task-preview">"{task.mensaje}"</div>
                                <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                                    {task.telefono ? (
                                        <button onClick={() => handleTaskAction(task, 'auto_send')} className="ia-wa-button" disabled={processingAction===task.id}>
                                            {processingAction===task.id ? '...' : '🤖 Auto Enviar'}
                                        </button>
                                    ) : <button disabled className="ia-wa-button disabled">Sin Tel</button>}
                                    <button onClick={() => handleTaskAction(task, 'completed')} className="ia-btn-secondary" style={{flex:1, border:'1px solid #ccc', background:'white'}} disabled={processingAction===task.id}>✅ Listo</button>
                                    <button onClick={() => handleTaskAction(task, 'dismiss')} className="ia-btn-secondary" style={{color:'#e74c3c', border:'1px solid #ccc', background:'white'}} disabled={processingAction===task.id}>✕</button>
                                </div>
                                {task.telefono && <a href={`https://wa.me/${task.telefono}?text=${encodeURIComponent(task.mensaje)}`} target="_blank" rel="noreferrer" style={{display:'block', textAlign:'center', marginTop:'8px', fontSize:'11px', color:'#7f8c8d'}}>WhatsApp Web ↗</a>}
                            </div>
                        ))
                    ) : (
                        <div className="ia-chat-container">
                            {chatHistory.map((msg, idx) => <div key={idx} className={`ia-bubble ${msg.sender}`}>{formatText(msg.text)}</div>)}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>
                {activeTab === 'chat' && <form className="ia-chat-input-area" onSubmit={handleChatSubmit}><input className="ia-chat-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe..." /><button type="submit" className="ia-chat-send-btn">➤</button></form>}
            </div>
            {!isOpen && (
    <button 
        className="ia-fab" 
        onClick={() => setIsOpen(true)}
        // Agregamos estilos extra al botón para que la imagen quede perfecta
        style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
        <img 
            src={miloLogo}
            alt="Milo" 
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover' 
            }}
        />
    </button>
)}
        </div>
    );
};

export default IAWidget;