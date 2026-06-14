import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, FileCode, CircleStop, History, ChevronDown, ChevronRight } from 'lucide-react';
import { invokeAI, getSandboxId, explainCodeAPI, getChatHistoryAPI } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { setAiInitialMessage, setAiExplainRequest } from '../../redux/slices/projectSlice';

const AIChatPanel = ({ onClose, width, onStartResize }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I am your HyperStack AI assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState(null);
  const chatEndRef = useRef(null);
  
  const dispatch = useDispatch();
  const { aiInitialMessage, aiExplainRequest } = useSelector((state) => state.project);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showHistory, expandedHistoryIdx]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const projectId = getSandboxId();
        if (!projectId) return;
        const history = await getChatHistoryAPI(projectId);
        if (history && history.messages && history.messages.length > 0) {
          setMessages([
            { role: 'ai', content: 'Hi! I am your HyperStack AI assistant. How can I help you today?' },
            ...history.messages
          ]);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    loadHistory();
  }, []);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      
      setMessages(prev => {
        // Find the last user message
        const lastUserMsg = prev.slice().reverse().find(m => m.role === 'user');
        if (lastUserMsg) setInputValue(lastUserMsg.content);
        
        // Remove the last user message and the partial AI response
        return prev.slice(0, prev.length - 2);
      });
    }
  };

  const handleSend = async (overrideMessage = null) => {
    const messageToSend = typeof overrideMessage === 'string' ? overrideMessage : inputValue;
    if (!messageToSend.trim() || isGenerating) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }, { role: 'ai', content: '' }]);
    setIsGenerating(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const projectId = getSandboxId();
      if (!projectId) throw new Error("Sandbox not running");
      
      const res = await invokeAI(messageToSend, projectId, controller.signal);
      
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
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
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error('AI invocation failed:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content += "\n\n[Error communicating with AI]";
          return newMessages;
        });
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <History 
            size={16} 
            className="history-icon" 
            style={{ cursor: 'pointer', color: showHistory ? 'var(--color-primary)' : 'inherit' }}
            onClick={() => setShowHistory(!showHistory)} 
            title="Chat History"
          />
          <X size={16} className="close-icon" onClick={onClose} />
        </div>
      </div>
      
      {showHistory ? (
        <div className="chat-history-overlay" style={{ flex: 1, overflowY: 'auto', padding: '15px', backgroundColor: 'var(--bg-panel)' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Conversation History</h3>
          {messages.filter(m => m.role === 'user').map((msg, idx) => {
            const isExpanded = expandedHistoryIdx === idx;
            // Find the corresponding AI response
            const aiResponseIndex = messages.indexOf(msg) + 1;
            const aiResponse = messages[aiResponseIndex] && messages[aiResponseIndex].role === 'ai' ? messages[aiResponseIndex] : null;
            
            return (
              <div key={idx} className="history-item" style={{ marginBottom: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  className="history-prompt" 
                  style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setExpandedHistoryIdx(isExpanded ? null : idx)}
                >
                  <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                    {msg.content}
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {isExpanded && aiResponse && (
                  <div className="history-response" style={{ padding: '10px', fontSize: '13px', backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)' }}>
                    {renderMessageContent(aiResponse.content)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
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
      )}

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
          {isGenerating ? (
            <button 
              className="stop-btn" 
              onClick={handleStop}
              title="Stop Generation"
              style={{ color: '#ff4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CircleStop size={18} />
            </button>
          ) : (
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!inputValue.trim()}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
