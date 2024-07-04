import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../App';
import socketIOClient from 'socket.io-client';
import './Chat.css'; 

const ChatRequestButton = () => {
  const [currentUser] = useContext(UserContext);
  const [socket] = useState(socketIOClient('http://localhost:8080'));
  const [response, setResponse] = useState('');
  const [activeChat, setActiveChat] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [secretarySocketId, setSecretarySocketId] = useState('');

  useEffect(() => {
    socket.on('chatRequestResponse', (response) => {
      setResponse(response.message);
      setWaitingForApproval(false);
      if (response.accepted) {
        setActiveChat(true);
        setSecretarySocketId(response.secretarySocketId);
        sendInitialMessage(response.secretarySocketId);
      } else {
        setMessages((prevMessages) => [...prevMessages, { text: response.message, userName: 'System', timestamp: new Date().toISOString() }]);
      }
    });

    const handleIncomingMessage = (message) => {
      if (message.recipientId === socket.id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    socket.on('receiveMessage', handleIncomingMessage);

    return () => {
      socket.off('chatRequestResponse');
      socket.off('receiveMessage', handleIncomingMessage);
    };
  }, [socket]);

  const handleRequestChat = () => {
    socket.emit('requestChat', { userId: currentUser.id, userName: currentUser.firstName, userType: 'customer', customerSocketId: socket.id });
    setMessages([{ text: 'מחכה לאישור מהמזכירה...', userName: 'System', timestamp: new Date().toISOString() }]);
    setWaitingForApproval(true);
  };

  const sendInitialMessage = (secretarySocketId) => {
    const initialMessage = {
      senderId: socket.id,
      recipientId: secretarySocketId,
      userName: currentUser.firstName,
      text: `שלום לך ${currentUser.firstName} ${currentUser.lastName} איך אוכל לעזור לך היום?`,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('sendMessage', initialMessage);
    setMessages((prevMessages) => [...prevMessages, initialMessage]);
  };

  const sendMessage = () => {
    if (messageInput.trim() === '') return;

    const message = {
      senderId: socket.id,
      recipientId: secretarySocketId,
      userName: currentUser.firstName,
      text: messageInput,
      timestamp: new Date().toISOString()
    };

    socket.emit('sendMessage', message);
    setMessages((prevMessages) => [...prevMessages, message]);
    setMessageInput('');
  };

  const closeChat = () => {
    const closingMessage = {
      senderId: socket.id,
      recipientId: secretarySocketId,
      userName: currentUser.firstName,
      text: 'הלקוח סיים את השיחה',
      timestamp: new Date().toISOString()
    };

    socket.emit('sendMessage', closingMessage);
    setMessages((prevMessages) => [...prevMessages, closingMessage]);

    setTimeout(() => {
      setActiveChat(false);
      setMessages([]);
      setResponse('');
      setWaitingForApproval(false);
    }, 500); // Delay to ensure the message is sent before closing the chat
  };

  return (
    <div>
      <button 
        className={`chat-request-button ${activeChat || waitingForApproval ? 'disabled' : ''}`} 
        onClick={handleRequestChat} 
        disabled={activeChat || waitingForApproval}
      >
        התחל צ'אט עם מזכירה
      </button>
      {response && !activeChat && !waitingForApproval && <p>{response}</p>}
      {(waitingForApproval || activeChat) && (
        <div className="chat-window">
          <h3>שיחה עם המזכירה</h3>
          <button className="close-chat-button" onClick={closeChat}>❎</button>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={msg.userName === currentUser.firstName ? 'message sent' : 'message received'}>
                <p><strong>{msg.userName}</strong>: {msg.text}</p>
                <p className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input 
              type="text" 
              value={messageInput} 
              onChange={(e) => setMessageInput(e.target.value)} 
              placeholder="הקלד הודעה..." 
              disabled={!activeChat}
            />
            <button onClick={sendMessage} disabled={!activeChat}>שלח</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRequestButton;
