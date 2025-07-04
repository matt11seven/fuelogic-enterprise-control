import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MinusCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SophiaAIWidgetProps {
  webhookUrl?: string;
}

// URL padrão do webhook da Sophia AI - usa variável de ambiente específica se disponível
const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_SOPHIA_API_URL 
  ? `${import.meta.env.VITE_SOPHIA_API_URL}/chat`
  : '/api/sophia/chat';

// Componente principal do widget de chat da Sophia IA
export function SophiaAIWidget({ webhookUrl = DEFAULT_WEBHOOK_URL }: SophiaAIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: 'Olá! Eu sou a Sophia, sua assistente para pedidos e cotações de combustível. Como posso ajudar você hoje?',
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  }, []);

  // Scroll automático para a mensagem mais recente
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Função para enviar mensagem para o webhook
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Adiciona a mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userId: user?.id || 'guest',
          userName: user?.username || 'Visitante'
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a Sophia');
      }

      const data = await response.json();

      // Adiciona a resposta da IA
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.message || 'Desculpe, não consegui processar sua solicitação.',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Mensagem de erro em caso de falha
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error('Erro ao enviar mensagem para webhook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para lidar com tecla Enter (enviar mensagem)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isMinimized) {
      setIsMinimized(false);
    }
  };

  const minimizeChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Botão do widget */}
      <Button
        onClick={toggleChat}
        variant="default"
        className="rounded-full h-14 w-14 bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Janela de chat */}
      {isOpen && (
        <div className={`fixed ${isMinimized ? 'h-14' : 'h-[500px]'} w-[350px] bottom-20 right-5 bg-white dark:bg-slate-900 rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700`}>
          {/* Cabeçalho */}
          <div className="bg-blue-500 p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8 bg-white text-blue-500">
                <span className="font-bold">S</span>
              </Avatar>
              <div className="text-white font-medium">Sophia IA</div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={minimizeChat} 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-white hover:bg-blue-600 rounded-full"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <Button 
                onClick={toggleChat} 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-white hover:bg-blue-600 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Corpo do chat (mensagens) - só mostra se não estiver minimizado */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <div 
                      className={`text-xs mt-1 ${
                        message.sender === 'user'
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input para mensagem - só mostra se não estiver minimizado */}
          {!isMinimized && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-end space-x-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="min-h-[80px] resize-none flex-1 text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 h-10 w-10 p-0 rounded-full"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SophiaAIWidget;
