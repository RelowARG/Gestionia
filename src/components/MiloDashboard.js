// src/components/MiloDashboard.js
import React, { useState, useEffect } from 'react';
import miloLogo from '../assets/milo.png';
import './MiloDashboard.css';

const MiloDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);
    
    const api = window.electronAPI;
    const API_URL = 'http://localhost:3001/api/ia'; // Ajustá si usás otra IP

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            let data;
            if (api && api.iaGetTasks) {
                data = await api.iaGetTasks();
            } else {
                const res = await fetch(`${API_URL}/tasks`);
                data = await res.json();
            }
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) { 
            console.error("Error trayendo tareas", error); 
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
            original_db_id: task.original_db_id
        };

        try {
            if (api && api.iaPerformAction) {
                await api.iaPerformAction(payload);
            } else {
                await fetch(`${API_URL}/action`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(payload) 
                });
            }
            if (action === 'auto_send') await new Promise(r => setTimeout(r, 1000));
            setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setProcessingAction(null);
        }
    };

    // Agrupamos las tareas
    const fugasYAlertas = tasks.filter(t => t.titulo?.includes('Riesgo') || t.tipo === 'alerta' || t.titulo?.includes('URGENTE'));
    const ventasYRecuperos = tasks.filter(t => t.tipo === 'recupero' || t.tipo === 'recontacto' || t.tipo === 'presupuesto');
    const leadsYMensajes = tasks.filter(t => t.tipo === 'lead' || t.tipo === 'mensaje' || t.titulo?.includes('Mail'));
    const cobranzas = tasks.filter(t => t.tipo === 'cobranza');

    const renderTask = (task, cssClass) => (
        <div key={task.id} className={`milo-card ${cssClass}`} style={{opacity: processingAction===task.id?0.5:1}}>
            <h4>{task.titulo}</h4>
            <p>{task.subtitulo}</p>
            <div className="milo-preview-box">"{task.mensaje}"</div>
            <div className="milo-buttons-row">
                {task.telefono && (
                    <button onClick={() => handleTaskAction(task, 'auto_send')} className="milo-btn-primary" disabled={processingAction===task.id}>
                        {processingAction===task.id ? '⌛ Enviando...' : '🤖 Auto Enviar WA'}
                    </button>
                )}
                <button onClick={() => handleTaskAction(task, 'completed')} className="milo-btn-secondary" disabled={processingAction===task.id}>✅ Listo</button>
                <button onClick={() => handleTaskAction(task, 'dismiss')} className="milo-btn-secondary milo-btn-dismiss" disabled={processingAction===task.id}>✕ Descartar</button>
            </div>
        </div>
    );

    return (
        <div className="milo-dashboard">
            <div className="milo-header">
                <img src={miloLogo} alt="Milo IA" className="milo-logo" />
                <div className="milo-header-text">
                    <h1 className="milo-title">Centro de Inteligencia Milo</h1>
                    <p className="milo-subtitle">Monitor de Gestión Activa (Modo Oscuro)</p>
                </div>
            </div>

            <div className="milo-content">
                {loadingTasks ? (
                    <h3 style={{color: '#888', textAlign: 'center'}}>⏳ Milo está sincronizando datos...</h3>
                ) : (
                    <div className="milo-grid">
                        
                        {/* SECCIÓN 1: FUGAS Y URGENCIAS */}
                        {fugasYAlertas.length > 0 && (
                            <div className="milo-task-group">
                                <h3 className="milo-section-title">🔥 Urgencias y Riesgo de Fuga</h3>
                                {fugasYAlertas.map(t => renderTask(t, 'milo-card-riesgo'))}
                            </div>
                        )}

                        {/* SECCIÓN 2: VENTAS Y RECUPEROS */}
                        {ventasYRecuperos.length > 0 && (
                            <div className="milo-task-group">
                                <h3 className="milo-section-title">💼 Recupero de Clientes</h3>
                                {ventasYRecuperos.map(t => renderTask(t, 'milo-card-venta'))}
                            </div>
                        )}

                        {/* SECCIÓN 3: MAILS Y CHATS ENTRANTES */}
                        {leadsYMensajes.length > 0 && (
                            <div className="milo-task-group">
                                <h3 className="milo-section-title">📩 Bandeja Analizada</h3>
                                {leadsYMensajes.map(t => renderTask(t, ''))}
                            </div>
                        )}

                        {/* SECCIÓN 4: COBRANZAS */}
                        {cobranzas.length > 0 && (
                            <div className="milo-task-group">
                                <h3 className="milo-section-title">💰 Cobranzas Pendientes</h3>
                                {cobranzas.map(t => renderTask(t, 'milo-card-cobro'))}
                            </div>
                        )}

                        {/* MENSAJE VACÍO */}
                        {tasks.length === 0 && (
                            <div className="milo-empty-state">
                                <h2>☕ Todo al día</h2>
                                <p>No hay alertas ni tareas pendientes en este momento.</p>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiloDashboard;