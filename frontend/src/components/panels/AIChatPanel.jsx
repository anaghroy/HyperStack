import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { invokeAI, getSandboxId } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { setAiInitialMessage } from '../../redux/slices/projectSlice';

const AIChatPanel = ({ onClose, width }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I am your HyperStack AI assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef(null);
  
  const dispatch = useDispatch();
  const { aiInitialMessage } = useSelector((state) => state.project);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideMessage = null) => {
    const messageToSend = overrideMessage || inputValue;
    if (!messageToSend.trim() || isGenerating) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }, { role: 'ai', content: '' }]);
    setIsGenerating(true);

    try {
      const projectId = getSandboxId();
      if (!projectId) throw new Error("Sandbox not running");
      
      const res = await invokeAI(messageToSend, projectId);
      
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          // Basic SSE parsing: parse "data: ..." from chunk if it's SSE format
          // If the server just sends raw text streams, we just append it.
          // Let's assume standard SSE or raw text.
          const lines = chunk.split('\n');
          let textToAdd = '';
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                // If the data is JSON, parse it
                const data = JSON.parse(line.substring(6));
                if (data.error) {
                  textToAdd += `\n\n[Error: ${data.error}]\n`;
                } else {
                  textToAdd += data.text || '';
                }
              } catch {
                // if it's not JSON, just append the string
                textToAdd += line.substring(6) + '\n';
              }
            } else if (line.trim().length > 0) {
                textToAdd += line + '\n';
            }
          });

          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: newMessages[lastIndex].content + textToAdd
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content += "\n\n[Error communicating with AI]";
        return newMessages;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (aiInitialMessage) {
      const msg = aiInitialMessage;
      dispatch(setAiInitialMessage(null)); // Clear it immediately
      handleSend(msg);
    }
  }, [aiInitialMessage]);

  return (
    <div className="ai-chat-panel" style={{ width: `${width}px` }}>
      <div className="chat-header">
        <div className="header-title">
          <Sparkles size={16} color="var(--color-primary)" />
          HyperStack AI
        </div>
        <X size={16} className="close-icon" onClick={onClose} />
      </div>
      
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to write code or explain..."
            disabled={isGenerating}
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
          />
          <button 
            className="send-btn" 
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
