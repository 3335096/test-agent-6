import { useState, useRef, useEffect } from 'react'
import './App.css'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  PenTool, 
  Search, 
  Palette, 
  Calendar, 
  TrendingUp, 
  Edit3,
  ChevronRight,
  MessageSquare,
  Users,
  Target,
  Zap,
  AlertCircle,
  Loader2,
  Settings,
  Cpu,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: AgentInfo
  timestamp: Date
}

interface AgentInfo {
  key: string
  name: string
  role: string
  description: string
  color: string
  icon: string
}

interface Model {
  id: string
  name: string
  provider: string
}

// Иконки агентов
const AGENT_ICONS: Record<string, React.ReactNode> = {
  'CONTENT_CREATOR': <PenTool className="w-5 h-5" />,
  'EDITOR': <Edit3 className="w-5 h-5" />,
  'ANALYST': <Search className="w-5 h-5" />,
  'DESIGNER': <Palette className="w-5 h-5" />,
  'SMM_MANAGER': <Calendar className="w-5 h-5" />,
  'GROWTH_MANAGER': <TrendingUp className="w-5 h-5" />,
  'MASTER_AGENT': <Bot className="w-5 h-5" />
}

// Цвета агентов для фона
const AGENT_COLORS: Record<string, string> = {
  'CONTENT_CREATOR': 'bg-blue-500',
  'EDITOR': 'bg-purple-500',
  'ANALYST': 'bg-green-500',
  'DESIGNER': 'bg-pink-500',
  'SMM_MANAGER': 'bg-orange-500',
  'GROWTH_MANAGER': 'bg-red-500',
  'MASTER_AGENT': 'bg-indigo-500'
}

// Градиенты для карточек
const AGENT_GRADIENTS: Record<string, string> = {
  'CONTENT_CREATOR': 'from-blue-500 to-blue-600',
  'EDITOR': 'from-purple-500 to-purple-600',
  'ANALYST': 'from-green-500 to-green-600',
  'DESIGNER': 'from-pink-500 to-pink-600',
  'SMM_MANAGER': 'from-orange-500 to-orange-600',
  'GROWTH_MANAGER': 'from-red-500 to-red-600',
  'MASTER_AGENT': 'from-indigo-500 to-indigo-600'
}

const agentsList = [
  {
    id: 'CONTENT_CREATOR',
    name: 'Content Creator',
    role: 'Контент',
    description: 'Посты, сценарии, рубрики, идеи',
    icon: <PenTool className="w-4 h-4" />,
    color: 'bg-blue-500'
  },
  {
    id: 'EDITOR',
    name: 'Editor',
    role: 'Редактура',
    description: 'Вычитка, стиль, финальная подготовка',
    icon: <Edit3 className="w-4 h-4" />,
    color: 'bg-purple-500'
  },
  {
    id: 'ANALYST',
    name: 'Analyst',
    role: 'Аналитика',
    description: 'Исследования, метрики, тренды',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-green-500'
  },
  {
    id: 'DESIGNER',
    name: 'Designer',
    role: 'Дизайн',
    description: 'Визуалы, инфографика, креативы',
    icon: <Palette className="w-4 h-4" />,
    color: 'bg-pink-500'
  },
  {
    id: 'SMM_MANAGER',
    name: 'SMM Manager',
    role: 'SMM',
    description: 'Планирование, модерация, реклама',
    icon: <Calendar className="w-4 h-4" />,
    color: 'bg-orange-500'
  },
  {
    id: 'GROWTH_MANAGER',
    name: 'Growth Manager',
    role: 'Рост',
    description: 'Стратегия, лидогенерация, A/B тесты',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'bg-red-500'
  }
]

const welcomeMessage = `🤖 АГЕНТ: MASTER_AGENT

Привет! Я Мастер-агент для твоего Telegram-канала service.by

Я координирую команду из 6 специализированных агентов:
• Content Creator — пишет посты и сценарии
• Editor — вычитывает и редактирует  
• Analyst — исследует рынок и метрики
• Designer — создаёт визуалы
• SMM Manager — планирует публикации и рекламу
• Growth Manager — отвечает за рост и стратегию

Просто опиши задачу — я сам определю, кто лучше справится, и верну готовый результат. Начнём?`

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      agent: {
        key: 'MASTER_AGENT',
        name: 'Master Agent',
        role: 'Координатор',
        description: 'Координация команды',
        color: '#6366f1',
        icon: 'Bot'
      },
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    checkApiStatus()
    loadModels()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`)
      if (response.ok) {
        setApiStatus('connected')
      } else {
        setApiStatus('error')
      }
    } catch {
      setApiStatus('error')
    }
  }

  const loadModels = async () => {
    try {
      setIsLoadingModels(true)
      const response = await fetch(`${API_URL}/api/models`)
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
        setCurrentModel(data.current || '')
      }
    } catch (err) {
      console.error('Failed to load models:', err)
      setModels([
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' }
      ])
      setCurrentModel('anthropic/claude-3.5-sonnet')
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleModelChange = async (modelId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      })
      
      if (response.ok) {
        setCurrentModel(modelId)
        const modelInfo = models.find(m => m.id === modelId)
        toast.success(`Модель изменена на ${modelInfo?.name || modelId}`)
      } else {
        toast.error('Не удалось изменить модель')
      }
    } catch (err) {
      console.error('Failed to change model:', err)
      toast.error('Ошибка при смене модели')
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.filter(m => m.id !== 'welcome').concat(userMessage).map(m => ({
            role: m.role,
            content: m.content
          })),
          model: currentModel
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при получении ответа')
      }

      const data = await response.json()
      const assistantContent = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ'
      
      // Получаем информацию об агенте из ответа сервера
      const agentInfo = data.agent || {
        key: 'MASTER_AGENT',
        name: 'Master Agent',
        role: 'Координатор',
        description: 'Координация команды',
        color: '#6366f1',
        icon: 'Bot'
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        agent: agentInfo,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке сообщения')
      console.error('Chat error:', err)
    } finally {
      setIsTyping(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessageContent = (content: string) => {
    // Убираем тег агента из отображаемого контента
    const cleanContent = content.replace(/🤖\s*АГЕНТ:\s*\w+\n?/i, '').trim()
    
    const parts = cleanContent.split(/(\*\*.*?\*\*|```[\s\S]*?```|`.*?`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('```') && part.endsWith('```')) {
        return (
          <pre key={i} className="bg-slate-800 text-slate-100 p-3 rounded-lg my-2 overflow-x-auto text-sm">
            <code>{part.slice(3, -3).trim()}</code>
          </pre>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  const getCurrentModelName = () => {
    const model = models.find(m => m.id === currentModel)
    return model?.name || currentModel.split('/').pop() || 'AI'
  }

  const getCurrentModelProvider = () => {
    const model = models.find(m => m.id === currentModel)
    return model?.provider || ''
  }

  // Компонент карточки агента
  const AgentBadge = ({ agent }: { agent?: AgentInfo }) => {
    if (!agent) return null
    
    const gradientClass = AGENT_GRADIENTS[agent.key] || 'from-slate-500 to-slate-600'
    const icon = AGENT_ICONS[agent.key] || <Bot className="w-4 h-4" />
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${gradientClass} text-white text-xs font-medium mb-2 shadow-sm`}>
        {icon}
        <span>{agent.name}</span>
        <span className="opacity-75">·</span>
        <span className="opacity-90">{agent.role}</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Мастер-агент</h1>
              <p className="text-xs text-slate-500">service.by</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={apiStatus === 'connected' ? 'bg-green-100 text-green-700' : apiStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
              <Zap className="w-3 h-3 mr-1" />
              {apiStatus === 'connected' ? 'OpenRouter' : apiStatus === 'error' ? 'Офлайн' : 'Проверка...'}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-3 gap-2 border-b border-slate-100">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <Users className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-slate-500">Агентов</p>
            <p className="font-semibold text-slate-900">6</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <MessageSquare className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-slate-500">Чатов</p>
            <p className="font-semibold text-slate-900">{messages.length}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <Target className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-slate-500">Задач</p>
            <p className="font-semibold text-slate-900">{messages.filter(m => m.role === 'user').length}</p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Модель ИИ</p>
          </div>
          
          {isLoadingModels ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка...
            </div>
          ) : (
            <Select value={currentModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите модель" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <span className="text-xs text-slate-400">({model.provider})</span>
                      {currentModel === model.id && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {currentModel && (
            <p className="text-xs text-slate-500 mt-2">
              Текущая: <span className="font-medium text-slate-700">{getCurrentModelName()}</span>
              {getCurrentModelProvider() && (
                <span className="text-slate-400"> · {getCurrentModelProvider()}</span>
              )}
            </p>
          )}
        </div>

        {/* Agents List */}
        <ScrollArea className="flex-1 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Команда агентов</p>
          <div className="space-y-2">
            {agentsList.map(agent => (
              <Card key={agent.id} className="cursor-pointer hover:shadow-md transition-shadow border-slate-100">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center flex-shrink-0 text-white`}>
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Telegram-канал о ремонте бытовой техники в Беларуси
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="font-semibold text-slate-900">Чат с Мастер-агентом</h2>
              <p className="text-xs text-slate-500">Координатор команды контент-маркетинга</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-600">
              <Cpu className="w-3 h-3 mr-1" />
              {getCurrentModelName()}
            </Badge>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Настройки</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Модель ИИ</label>
                    <Select value={currentModel} onValueChange={handleModelChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <span className="text-xs text-slate-400">({model.provider})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className={`w-10 h-10 flex-shrink-0 ${message.role === 'assistant' && message.agent ? AGENT_COLORS[message.agent.key] || 'bg-gradient-to-br from-blue-600 to-purple-600' : message.role === 'assistant' ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-slate-200'}`}>
                  <AvatarFallback className="text-white">
                    {message.role === 'assistant' ? (message.agent ? AGENT_ICONS[message.agent.key] : <Bot className="w-5 h-5" />) : <User className="w-5 h-5 text-slate-600" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[80%] ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'} rounded-2xl px-5 py-3 shadow-sm text-left`}>
                    {/* Badge агента */}
                    {message.role === 'assistant' && message.agent && (
                      <AgentBadge agent={message.agent} />
                    )}
                    <div className={`text-sm whitespace-pre-line ${message.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 px-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4">
                <Avatar className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600">
                  <AvatarFallback className="text-white">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Опишите задачу..."
              className="flex-1 h-12 text-sm border-slate-200 focus-visible:ring-blue-500"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Отправить
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <p className="text-xs text-slate-400">
              Мастер-агент автоматически определит нужного специалиста
            </p>
            {currentModel && (
              <Badge variant="outline" className="text-xs">
                <Cpu className="w-3 h-3 mr-1" />
                {getCurrentModelName()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
