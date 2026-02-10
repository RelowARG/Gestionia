import React, { useState, useEffect } from 'react';

const IAPanel = () => {
    const [insights, setInsights] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatResponse, setChatResponse] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);

    // Ajusta si tu puerto de backend es diferente
    const API_URL = 'http://localhost:4000/api/ia';

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            const res = await fetch(`${API_URL}/insights`);
            const data = await res.json();
            setInsights(data);
        } catch (error) {
            console.error("Error cargando insights:", error);
        }
    };

    // Función segura para abrir enlaces en Electron o Navegador
    const openExternalLink = (url) => {
        if (window.electron && window.electron.openExternal) {
            window.electron.openExternal(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSendWhatsapp = async (insight) => {
        const { telefono, mensaje_whatsapp, nombre_cliente } = insight.datos_extra;

        if (!telefono) {
            alert(`El cliente ${nombre_cliente} no tiene teléfono registrado.`);
            return;
        }

        // Crear link de WhatsApp
        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje_whatsapp)}`;
        
        // Abrir ventana
        openExternalLink(waUrl);

        // Marcar como gestionado en DB
        try {
            await fetch(`${API_URL}/insights/${insight.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'gestionado' })
            });
            // Recargar lista
            fetchInsights();
        } catch (err) {
            console.error("Error actualizando estado", err);
        }
    };

    const handleDismiss = async (id) => {
        try {
            await fetch(`${API_URL}/insights/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'descartado' })
            });
            fetchInsights();
        } catch (err) {
            console.error("Error descartando", err);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setLoadingChat(true);
        setChatResponse('');
        
        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: chatInput })
            });
            const data = await res.json();
            setChatResponse(data.respuesta);
        } catch (error) {
            setChatResponse("Error conectando con el cerebro de la IA.");
        }
        setLoadingChat(false);
    };

    // Estilos Inline (para fácil integración)
    const styles = {
        container: {
            background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '30px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            border: '1px solid #e1e4e8'
        },
        header: {
            margin: '0 0 15px 0',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        card: {
            background: '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            borderLeft: '5px solid #3498db',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        },
        waBox: {
            background: '#dcf8c6',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '10px',
            border: '1px solid #c2eaba'
        },
        waText: {
            fontStyle: 'italic',
            color: '#333',
            marginBottom: '10px',
            display: 'block'
        },
        btnWa: {
            background: '#25D366',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '10px',
            fontSize: '0.9rem'
        },
        btnDismiss: {
            background: 'transparent',
            color: '#7f8c8d',
            border: '1px solid #bdc3c7',
            padding: '7px 15px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9rem'
        },
        chatSection: {
            marginTop: '20px',
            borderTop: '1px solid #dcdcdc',
            paddingTop: '20px'
        },
        chatForm: {
            display: 'flex',
            gap: '10px'
        },
        input: {
            flex: 1,
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #bdc3c7',
            fontSize: '1rem'
        },
        btnChat: {
            background: '#34495e',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
        },
        responseBox: {
            marginTop: '15px',
            background: '#ecf0f1',
            padding: '15px',
            borderRadius: '6px',
            color: '#2c3e50',
            lineHeight: '1.5'
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>✨ Asistente Virtual Inteligente</h2>

            {/* SECCIÓN ALERTAS */}
            {insights.length > 0 ? (
                <div>
                    {insights.map((item) => (
                        <div key={item.id} style={styles.card}>
                            <h4 style={{margin: '0 0 5px 0'}}>{item.datos_extra?.titulo || item.tipo}</h4>
                            <p style={{margin: 0, color: '#555'}}>{item.mensaje}</p>

                            {item.tipo === 'WHATSAPP_SUGERIDO' && (
                                <div style={styles.waBox}>
                                    <span style={styles.waText}>
                                        "{item.datos_extra?.mensaje_whatsapp}"
                                    </span>
                                    <button style={styles.btnWa} onClick={() => handleSendWhatsapp(item)}>
                                        📲 Enviar WhatsApp
                                    </button>
                                    <button style={styles.btnDismiss} onClick={() => handleDismiss(item.id)}>
                                        Ignorar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{color: '#7f8c8d', fontStyle: 'italic'}}>Todo tranquilo por ahora. No hay alertas pendientes.</p>
            )}

            {/* SECCIÓN CHAT */}
            <div style={styles.chatSection}>
                <h4 style={{margin: '0 0 10px 0'}}>💬 Pregúntame sobre el negocio</h4>
                <form onSubmit={handleChatSubmit} style={styles.chatForm}>
                    <input 
                        type="text" 
                        placeholder="Ej: ¿Cómo van las ventas hoy?" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        style={styles.input}
                    />
                    <button type="submit" style={styles.btnChat} disabled={loadingChat}>
                        {loadingChat ? 'Pensando...' : 'Preguntar'}
                    </button>
                </form>
                {chatResponse && (
                    <div style={styles.responseBox}>
                        <strong>IA:</strong> {chatResponse}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IAPanel;