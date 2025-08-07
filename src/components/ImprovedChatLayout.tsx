import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, CheckCircle, Circle, MessageCircle, Clock, User, Bot, ChevronRight, Play, FileText, Menu, X, Target, BarChart3, Video, Download, PlayCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'student';
  content: string;
  timestamp: Date;
  avatar?: string;
}

interface KeyPoint {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SessionMoment {
  id: number;
  title: string;
  description: string;
}

interface ImprovedChatLayoutProps {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  keyPoints: KeyPoint[];
  currentMoment: number;
  sessionMoments: SessionMoment[];
  courseName: string;
  courseCode: string;
  lessonName: string;
}

const ImprovedChatLayout: React.FC<ImprovedChatLayoutProps> = ({
  messages,
  isLoading,
  sendMessage,
  messagesEndRef,
  keyPoints,
  currentMoment,
  sessionMoments,
  courseName,
  courseCode,
  lessonName
}) => {
  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('progress');

  const completedPoints = keyPoints.filter(point => point.completed).length;

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const TabButton = ({ id, label, icon: Icon, active, onClick }: {
    id: string;
    label: string;
    icon: any;
    active: boolean;
    onClick: (id: string) => void;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{courseName}</h1>
              <p className="text-sm text-slate-600">{courseCode} • {lessonName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">{completedPoints}/{keyPoints.length} objetivos</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">{Math.round((currentMoment / sessionMoments.length) * 100)}% completado</span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-1/2' : 'w-1/2'}`}>
          <div className="h-full bg-white m-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      SF
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Sophia Fuentes</h3>
                    <p className="text-sm text-slate-600">Profesora de Seguridad Industrial • En línea</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                    IA Conversacional
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Momento Actual - Banner Central */}
              <div className="flex justify-center mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-lg max-w-md text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full"></div>
                    <span className="text-sm font-medium opacity-90">Momento {currentMoment} de {sessionMoments.length}</span>
                    <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full"></div>
                  </div>
                  <h2 className="text-lg font-bold mb-1">{sessionMoments[currentMoment - 1]?.title || 'Cargando...'}</h2>
                  <p className="text-sm opacity-90">{sessionMoments[currentMoment - 1]?.description || 'Cargando descripción...'}</p>
                </div>
              </div>

                             {messages.map((message) => (
                 <div key={message.id} className={`flex items-start space-x-4 ${message.sender === 'student' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-md ${
                     message.sender === 'ai' 
                       ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' 
                       : 'bg-gradient-to-br from-slate-600 to-slate-700 text-white'
                   }`}>
                     {message.sender === 'ai' ? 'SF' : <User className="w-5 h-5" />}
                   </div>
                   
                   <div className={`flex-1 max-w-[75%] ${message.sender === 'student' ? 'text-right' : ''}`}>
                     <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${
                       message.sender === 'student'
                         ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                         : 'bg-white border border-slate-200 text-slate-900'
                     }`}>
                       <p className="text-sm leading-relaxed">{message.content}</p>
                     </div>
                     <div className={`mt-2 flex items-center space-x-2 ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                       <Clock className="w-3 h-3 text-slate-400" />
                       <span className="text-xs text-slate-500">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                   </div>
                 </div>
               ))}
              
              {isLoading && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    SF
                  </div>
                  <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-xs text-slate-500 ml-2">Sophia está escribiendo...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu pregunta sobre seguridad industrial..."
                    rows={1}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg disabled:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Multimedia Content Area */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-1/2 mr-80' : 'w-1/2'}`}>
          <div className="h-full bg-white m-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-600" />
                <span>Material de Apoyo</span>
              </h3>
            </div>
            
            <div className="flex-1 p-6">
              {/* Video Principal */}
              <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white mb-6 transition-all duration-300 ${
                sidebarOpen ? 'aspect-video' : 'aspect-video h-64'
              }`}>
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-6 hover:bg-opacity-30 transition-all cursor-pointer group">
                    <PlayCircle className="w-12 h-12 text-white ml-1 group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="text-xl font-bold text-center mb-3">Procedimientos de Seguridad</h4>
                  <p className="text-slate-300 text-center mb-6">Fundamentos y aplicación práctica</p>
                  <button className="bg-white text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors duration-200">
                    Ver Video
                  </button>
                </div>
              </div>

              {/* Recursos Descargables */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Recursos Descargables</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200 cursor-pointer border border-slate-200 hover:border-slate-300">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Manual de Procedimientos</span>
                        <p className="text-sm text-slate-500">PDF • 2.3 MB</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200 cursor-pointer border border-slate-200 hover:border-slate-300">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Lista de Verificación</span>
                        <p className="text-sm text-slate-500">XLSX • 856 KB</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Sidebar */}
        <div className={`fixed right-0 top-20 bottom-0 w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
              <TabButton
                id="progress"
                label="Progreso"
                icon={Target}
                active={activeTab === 'progress'}
                onClick={setActiveTab}
              />
              <TabButton
                id="points"
                label="Puntos Clave"
                icon={CheckCircle}
                active={activeTab === 'points'}
                onClick={setActiveTab}
              />
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'progress' && (
              <div className="space-y-6">
                {/* Progress Stats */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-slate-900 mb-3">Progreso de la Sesión</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Progreso de sesión</span>
                        <span className="font-medium text-slate-900">{currentMoment}/{sessionMoments.length}</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500" 
                             style={{width: `${(currentMoment / sessionMoments.length) * 100}%`}}></div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      <p className="font-medium">{sessionMoments[currentMoment - 1]?.title || 'Cargando...'}</p>
                      <p>{sessionMoments[currentMoment - 1]?.description || 'Cargando descripción...'}</p>
                    </div>
                  </div>
                  
                  {/* Timeline de momentos */}
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <h5 className="text-xs font-medium text-slate-700 mb-3">Momentos de la sesión</h5>
                    <div className="space-y-2">
                      {sessionMoments.map((moment) => (
                        <div key={moment.id} className={`flex items-center space-x-2 text-xs ${
                          moment.id < currentMoment ? 'text-green-600' : 
                          moment.id === currentMoment ? 'text-blue-600 font-medium' : 
                          'text-slate-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            moment.id < currentMoment ? 'bg-green-500' : 
                            moment.id === currentMoment ? 'bg-blue-500' : 
                            'bg-slate-300'
                          }`}></div>
                          <span className="truncate">{moment.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'points' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Puntos Clave</span>
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">{completedPoints}/{keyPoints.length} completados</p>
                  
                  <div className="space-y-3">
                    {keyPoints.map((point) => (
                      <div key={point.id} className={`p-4 rounded-xl border transition-all duration-200 ${
                        point.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start space-x-3">
                          {point.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <h4 className={`font-medium text-sm ${
                              point.completed ? 'text-green-900' : 'text-slate-900'
                            }`}>
                              {point.title}
                            </h4>
                            <p className={`text-xs mt-1 ${
                              point.completed ? 'text-green-700' : 'text-slate-600'
                            }`}>
                              {point.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ImprovedChatLayout;
