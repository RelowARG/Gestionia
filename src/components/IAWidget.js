// src/components/IAWidget.js
import React, { useState, useEffect, useRef } from 'react';
import './IAWidget.css';
import miloLogo from '../assets/milo.png';

const IAWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ia', text: 'Hola 👋. Soy **Milo**. Estoy acá para responder tus consultas rápidas mientras trabajás.' }
    ]);
    const [loadingChat, setLoadingChat] = useState(false);
    
    const chatEndRef = useRef(null);

    const api = window.electronAPI; 
    const DEV_URL = 'http://localhost:3001/api/ia'; // Ajustá si usás otra IP

    // Autoscroll cuando hay un mensaje nuevo
    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isOpen, isExpanded]);

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
                    method: 'POST', 
                    body: JSON.stringify({ question: msg }), 
                    headers: {'Content-Type': 'application/json'}
                });
                const data = await res.json();
                respuesta = data.respuesta;
            }
            setChatHistory(prev => [...prev, { sender: 'ia', text: respuesta }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { sender: 'ia', text: 'Error de conexión con mis servidores.' }]);
        }
        setLoadingChat(false);
    };

    const formatText = (text) => {
        if (!text) return "";
        return text.split('\n').map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return <div key={lineIdx} style={{marginBottom:'4px'}}>
                {parts.map((p,i)=> p.startsWith('**') ? <b key={i}>{p.slice(2,-2)}</b> : <span key={i}>{p}</span>)}
            </div>;
        });
    };

    return (
        <div className="ia-container">
            <div className={`ia-window ${isOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}>
                
                <div className="ia-header">
                    <div className="ia-header-title">
                        <img src={miloLogo} alt="Milo" style={{width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px'}} />
                        Chat con Milo
                    </div>
                    <div className="ia-header-actions">
                        <button onClick={() => setIsExpanded(!isExpanded)} className="ia-btn-icon">{isExpanded ? '↙' : '↗'}</button>
                        <button onClick={() => setIsOpen(false)} className="ia-btn-icon ia-btn-close">×</button>
                    </div>
                </div>

                <div className="ia-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                    <div className="ia-chat-container" style={{ padding: '15px' }}>
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`ia-bubble ${msg.sender}`}>
                                {formatText(msg.text)}
                            </div>
                        ))}
                        {loadingChat && <div className="ia-bubble ia" style={{color: '#a0aec0'}}><i>Pensando...</i></div>}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                <form className="ia-chat-input-area" onSubmit={handleChatSubmit}>
                    <input 
                        className="ia-chat-input" 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        placeholder="Preguntame algo..." 
                    />
                    <button type="submit" className="ia-chat-send-btn" disabled={loadingChat}>➤</button>
                </form>

            </div>

            {!isOpen && (
                <button 
                    className="ia-fab" 
                    onClick={() => setIsOpen(true)}
                    style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3498db' }}
                >
                    <img 
                        src={miloLogo}
                        alt="Milo" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </button>
            )}
        </div>
    );
};

export default IAWidget;