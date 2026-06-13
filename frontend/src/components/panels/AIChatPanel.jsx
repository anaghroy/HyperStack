import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, FileCode } from 'lucide-react';
import { invokeAI, getSandboxId, explainCodeAPI } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { setAiInitialMessage, setAiExplainRequest } from '../../redux/slices/projectSlice';

const AIChatPanel = ({ onClose, width, onStartResize }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I am your HyperStack AI assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef(null);
  
  const dispatch = useDispatch();
  const { aiInitialMessage, aiExplainRequest } = useSelector((state) => state.project);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideMessage = null) => {
    const messageToSend = typeof overrideMessage === 'string' ? overrideMessage : inputValue;
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
                } else if (data.status) {
                  textToAdd += `\n> ${data.status}\n\n`;
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

  const handleExplain = async (code, context) => {
    if (isGenerating) return;
    const userMsg = `Explain this code:\n\`\`\`javascript\n${code}\n\`\`\``;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'ai', content: '' }]);
    setIsGenerating(true);

    try {
      const res = await explainCodeAPI(code, context);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: res.explanation
        };
        return newMessages;
      });
    } catch (error) {
      console.error("Explain error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "[Error generating explanation]";
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

  useEffect(() => {
    if (aiExplainRequest) {
      const req = aiExplainRequest;
      dispatch(setAiExplainRequest(null)); // Clear it immediately
      handleExplain(req.code, req.context);
    }
  }, [aiExplainRequest]);

  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Skip rendering anything for empty lines if they are just padding around execution status
      if (line.trim() === '') {
        // Only render <br/> if it's not the very first or very last few lines, or just skip it if next line is a tool execution to avoid double spacing
        const nextLine = lines[idx + 1];
        if (!nextLine || nextLine.trim().startsWith('> Executing') || idx === 0) return null;
        return <br key={idx} />;
      }
      
      if (line.trim().startsWith('> Executing')) {
        return (
          <div key={idx} className="tool-execution-status">
            <FileCode size={12} className="tool-icon" />
            {line.trim().substring(2)}
          </div>
        );
      }
      return <span key={idx}>{line}<br /></span>;
    });
  };

  return (
    <div className="ai-chat-panel" style={{ width: `${width}px` }}>
      {onStartResize && <div className="resizer-left" onMouseDown={onStartResize} />}
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
              {renderMessageContent(msg.content)}
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
