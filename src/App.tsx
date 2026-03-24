import { useState, useRef, useEffect } from 'react'
import './App.css'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  PenTool, 
  Calendar, 
  Edit3,
  MessageSquare,
  Users,
  Target,
  Zap,
  AlertCircle,
  Loader2,
  Settings,
  Cpu,
  Check,
  Database,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Power,
  BookOpen,
  Globe,
  FileText,
  Rss,
  Youtube,
  Newspaper,
  Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: AgentInfo
  routing?: RoutingInfo
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

interface RoutingInfo {
  selectedAgentKey: string
  selectedAgentName: string
  reason: string
  confidence?: 'low' | 'medium' | 'high'
  detectionMethod?: string
  matchedSignals?: string[]
}

interface Model {
  id: string
  name: string
  provider: string
}

interface AgentSetting {
  agent_key: string
  custom_prompt: string
  clarifications: string
  goals: string
  constraints: string
  is_active: boolean
  updated_at?: string
}

interface Source {
  id: number
  name: string
  url: string
  type: string
  category: string
  description: string
  is_active: number
  tags?: string[]
  created_at: string
}

// Иконки агентов
const AGENT_ICONS: Record<string, React.ReactNode> = {
  'CONTENT_CREATOR': <PenTool className="w-5 h-5" />,
  'EDITOR': <Edit3 className="w-5 h-5" />,
  'SMM_MANAGER': <Calendar className="w-5 h-5" />,
  'MASTER_AGENT': <Bot className="w-5 h-5" />
}

const AGENT_COLORS: Record<string, string> = {
  'CONTENT_CREATOR': 'bg-blue-500',
  'EDITOR': 'bg-purple-500',
  'SMM_MANAGER': 'bg-orange-500',
  'MASTER_AGENT': 'bg-indigo-500'
}

const AGENT_GRADIENTS: Record<string, string> = {
  'CONTENT_CREATOR': 'from-blue-500 to-blue-600',
  'EDITOR': 'from-purple-500 to-purple-600',
  'SMM_MANAGER': 'from-orange-500 to-orange-600',
  'MASTER_AGENT': 'from-indigo-500 to-indigo-600'
}

// Иконки типов источников
const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  'website': <Globe className="w-4 h-4" />,
  'blog': <FileText className="w-4 h-4" />,
  'news': <Newspaper className="w-4 h-4" />,
  'rss': <Rss className="w-4 h-4" />,
  'youtube': <Youtube className="w-4 h-4" />,
  'documentation': <BookOpen className="w-4 h-4" />
}

const welcomeMessage = `🤖 АГЕНТ: MASTER_AGENT

Привет! Я Мастер-агент для твоего Telegram-канала service.by

Я координирую команду из 3 специализированных агентов: Content Agent, Editor Agent и SMM Agent.

При создании контента я использую информацию из настроенных источников.

Просто опиши задачу — я сам определю, кто лучше справится, и верну готовый результат. Начнём?`

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')

// Компонент для управления источниками
function SourcesManager({ onSourcesChange }: { onSourcesChange: () => void }) {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'website',
    category: '',
    description: '',
    tags: ''
  })

  const loadSources = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sources`)
      if (response.ok) {
        const data = await response.json()
        setSources(data.sources || [])
      }
    } catch (err) {
      console.error('Failed to load sources:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    }

    try {
      const url = editingSource 
        ? `${API_URL}/api/sources/${editingSource.id}`
        : `${API_URL}/api/sources`
      
      const response = await fetch(url, {
        method: editingSource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editingSource ? 'Источник обновлён' : 'Источник добавлен')
        setIsDialogOpen(false)
        setEditingSource(null)
        setFormData({ name: '', url: '', type: 'website', category: '', description: '', tags: '' })
        loadSources()
        onSourcesChange()
      } else {
        toast.error('Ошибка при сохранении')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот источник?')) return
    
    try {
      const response = await fetch(`${API_URL}/api/sources/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Источник удалён')
        loadSources()
        onSourcesChange()
      }
    } catch (err) {
      toast.error('Ошибка при удалении')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/sources/${id}/toggle`, { method: 'PATCH' })
      if (response.ok) {
        loadSources()
        onSourcesChange()
      }
    } catch (err) {
      toast.error('Ошибка')
    }
  }

  const openEditDialog = (source: Source) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      category: source.category,
      description: source.description,
      tags: (source.tags || []).join(', ')
    })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingSource(null)
    setFormData({ name: '', url: '', type: 'website', category: '', description: '', tags: '' })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Источники информации</h3>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка...
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет источников</p>
          <p className="text-sm">Добавьте первый источник информации</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map(source => (
            <div 
              key={source.id} 
              className={`flex items-center gap-3 p-3 rounded-lg border ${source.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                {SOURCE_TYPE_ICONS[source.type] || <Globe className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{source.name}</span>
                  {source.category && (
                    <Badge variant="secondary" className="text-xs">{source.category}</Badge>
                  )}
                </div>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-blue-500 flex items-center gap-1 truncate"
                >
                  {source.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleToggle(source.id)}
                >
                  <Power className={`w-4 h-4 ${source.is_active ? 'text-green-500' : 'text-slate-400'}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => openEditDialog(source)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(source.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSource ? 'Редактировать источник' : 'Добавить источник'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Например: Habr"
                required
              />
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input 
                id="url" 
                value={formData.url} 
                onChange={e => setFormData({...formData, url: e.target.value})}
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Тип</Label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Веб-сайт</SelectItem>
                  <SelectItem value="blog">Блог</SelectItem>
                  <SelectItem value="news">Новости</SelectItem>
                  <SelectItem value="rss">RSS</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="documentation">Документация</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Категория</Label>
              <Input 
                id="category" 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
                placeholder="Например: Технологии"
              />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Краткое описание источника"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input 
                id="tags" 
                value={formData.tags} 
                onChange={e => setFormData({...formData, tags: e.target.value})}
                placeholder="ремонт, техника, советы"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {editingSource ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function App() {
  const STORAGE_KEY = 'serviceby-chat-history-v1'
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
  const [sourcesCount, setSourcesCount] = useState(0)
  
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [agentSettings, setAgentSettings] = useState<Record<string, AgentSetting>>({})
  const [activeSettingsAgent, setActiveSettingsAgent] = useState<string | null>(null)
  const [agentForm, setAgentForm] = useState({
    custom_prompt: '',
    clarifications: '',
    goals: '',
    constraints: '',
    is_active: true
  })
  const [isSavingAgent, setIsSavingAgent] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Авто-скролл к новому сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    checkApiStatus()
    loadModels()
    loadSourcesCount()
    loadAgentSettings()
    loadHistory()
  }, [])

  useEffect(() => {
    const serializable = messages.filter(m => m.id !== 'welcome').map(message => ({
      ...message,
      timestamp: message.timestamp.toISOString()
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  }, [messages])

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

  const loadSourcesCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sources`)
      if (response.ok) {
        const data = await response.json()
        setSourcesCount(data.sources?.length || 0)
      }
    } catch (err) {
      console.error('Failed to load sources count:', err)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/history?limit=100`)
      if (response.ok) {
        const data = await response.json()
        const history = (data.messages || []).map((item: any) => ({
          id: item.id?.toString() || `${Date.now()}-${Math.random()}`,
          role: item.role,
          content: item.content,
          agent: item.agent || undefined,
          routing: item.routing || undefined,
          timestamp: new Date(item.created_at || new Date())
        })) as Message[]

        if (history.length > 0) {
          setMessages(prev => [prev[0], ...history])
          return
        }
      }
    } catch (err) {
      console.error('Failed to load history from API:', err)
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const restored = parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
      setMessages(prev => [prev[0], ...restored])
    } catch (err) {
      console.error('Failed to restore local history:', err)
    }
  }

  const loadAgentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/agents/settings`)
      if (!response.ok) return
      const data = await response.json()
      const entries = data.settings || []
      const map: Record<string, AgentSetting> = {}
      entries.forEach((item: AgentSetting) => {
        map[item.agent_key] = item
      })
      setAgentSettings(map)
    } catch (err) {
      console.error('Failed to load agent settings:', err)
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
        routing: data.routing,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // История сохраняется на сервере через /api/chat в бэкенде
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке сообщения')
      console.error('Chat error:', err)
    } finally {
      setIsTyping(false)
    }
  }

  const openAgentSettings = (agentKey: string) => {
    const current = agentSettings[agentKey]
    setActiveSettingsAgent(agentKey)
    setAgentForm({
      custom_prompt: current?.custom_prompt || '',
      clarifications: current?.clarifications || '',
      goals: current?.goals || '',
      constraints: current?.constraints || '',
      is_active: current?.is_active ?? true
    })
  }

  const saveAgentSettings = async () => {
    if (!activeSettingsAgent) return
    try {
      setIsSavingAgent(true)
      const response = await fetch(`${API_URL}/api/agents/settings/${activeSettingsAgent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentForm)
      })
      if (!response.ok) {
        toast.error('Не удалось сохранить настройки агента')
        return
      }
      const data = await response.json()
      setAgentSettings(prev => ({ ...prev, [activeSettingsAgent]: data.setting }))
      toast.success('Настройки агента сохранены')
      setActiveSettingsAgent(null)
    } catch (err) {
      toast.error('Ошибка сети при сохранении настроек агента')
    } finally {
      setIsSavingAgent(false)
    }
  }

  const getAgentMessagesCount = (agentKey: string) => messages.filter(m => m.role === 'assistant' && m.agent?.key === agentKey).length

  const sidebarAgents = [
    { key: 'CONTENT_CREATOR', label: 'Content Agent', actions: 'Посты, рубрики, сценарии' },
    { key: 'EDITOR', label: 'Editor Agent', actions: 'Вычитка, стиль, улучшения' },
    { key: 'SMM_MANAGER', label: 'SMM Manager', actions: 'Контент-план, публикации, модерация' }
  ]

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessageContent = (content: string) => {
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

  const RoutingPanel = ({ routing }: { routing?: RoutingInfo }) => {
    if (!routing) return null
    const confidenceLabel = routing.confidence === 'high' ? 'Высокая' : routing.confidence === 'medium' ? 'Средняя' : 'Низкая'
    const confidenceClass = routing.confidence === 'high'
      ? 'bg-green-100 text-green-700 border-green-200'
      : routing.confidence === 'medium'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-700 border-slate-200'

    return (
      <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          <Bot className="h-3.5 w-3.5" />
          <span>Маршрутизация Мастер-агента</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600">Выбран агент:</span>
          <Badge variant="secondary" className="bg-white text-indigo-700 border-indigo-200">
            {routing.selectedAgentName} ({routing.selectedAgentKey})
          </Badge>
          <Badge variant="secondary" className={`border ${confidenceClass}`}>
            Уверенность: {confidenceLabel}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Причина: {routing.reason}
        </p>
        {routing.matchedSignals && routing.matchedSignals.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Сигналы: {routing.matchedSignals.join(', ')}
          </p>
        )}
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
            <p className="font-semibold text-slate-900">4</p>
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
        </div>

        {/* Sources Count */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Источники</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {sourcesCount === 0 ? 'Нет источников' : `${sourcesCount} источник${sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'}`}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Database className="w-4 h-4 mr-1" />
                  Управление
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Управление источниками информации</DialogTitle>
                </DialogHeader>
                <SourcesManager onSourcesChange={loadSourcesCount} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Agents panel */}
        <div className="p-4 border-b border-slate-100 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Агенты и настройки</p>
          </div>
          {sidebarAgents.map(agent => {
            const settings = agentSettings[agent.key]
            const requestsHandled = getAgentMessagesCount(agent.key)
            return (
              <div key={agent.key} className="rounded-lg border border-slate-200 p-3 bg-slate-50/70">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white ${AGENT_COLORS[agent.key] || 'bg-slate-500'}`}>
                      {AGENT_ICONS[agent.key]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{agent.label}</p>
                      <p className="text-[11px] text-slate-500">{agent.actions}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={settings?.is_active === false ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}>
                    {settings?.is_active === false ? 'off' : 'on'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-2">
                  <div className="rounded bg-white border border-slate-200 px-2 py-1">
                    <span className="block text-slate-400">Ответов</span>
                    <span className="font-semibold text-slate-800">{requestsHandled}</span>
                  </div>
                  <div className="rounded bg-white border border-slate-200 px-2 py-1">
                    <span className="block text-slate-400">Промпт</span>
                    <span className="font-semibold text-slate-800">{(settings?.custom_prompt || '').trim() ? 'кастом' : 'базовый'}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => openAgentSettings(agent.key)}>
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Настроить агента
                </Button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
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
        <div 
          className="flex-1 overflow-y-auto p-6" 
          ref={scrollRef}
          style={{ scrollBehavior: 'smooth' }}
        >
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
                    {message.role === 'assistant' && message.agent && (
                      <AgentBadge agent={message.agent} />
                    )}
                    {message.role === 'assistant' && (
                      <RoutingPanel routing={message.routing} />
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
            {/* Элемент для авто-скролла */}
            <div ref={messagesEndRef} />
          </div>
        </div>

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
              Мастер-агент использует {sourcesCount} источник{sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'} для создания контента
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
              onClick={async () => {
                if (!confirm('Очистить историю чата?')) return
                try {
                  await fetch(`${API_URL}/api/chat/history`, { method: 'DELETE' })
                } catch {
                  // ignore network errors; still clear local state
                }
                localStorage.removeItem(STORAGE_KEY)
                setMessages(prev => [prev[0]])
                toast.success('История очищена')
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Очистить историю
            </Button>
            {currentModel && (
              <Badge variant="outline" className="text-xs">
                <Cpu className="w-3 h-3 mr-1" />
                {getCurrentModelName()}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(activeSettingsAgent)} onOpenChange={(open) => !open && setActiveSettingsAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Настройки агента {activeSettingsAgent || ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">Статус агента</p>
                <p className="text-xs text-slate-500">Отключенный агент не будет выбран Мастер-агентом</p>
              </div>
              <Button
                variant={agentForm.is_active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAgentForm(prev => ({ ...prev, is_active: !prev.is_active }))}
              >
                {agentForm.is_active ? 'Включен' : 'Выключен'}
              </Button>
            </div>

            <div>
              <Label>Кастомный промпт</Label>
              <Textarea
                rows={4}
                placeholder="Например: всегда предлагай 3 варианта заголовка..."
                value={agentForm.custom_prompt}
                onChange={e => setAgentForm(prev => ({ ...prev, custom_prompt: e.target.value }))}
              />
            </div>

            <div>
              <Label>Уточнения</Label>
              <Textarea
                rows={3}
                placeholder="Тон, формат, стиль, требования к структуре..."
                value={agentForm.clarifications}
                onChange={e => setAgentForm(prev => ({ ...prev, clarifications: e.target.value }))}
              />
            </div>

            <div>
              <Label>Цели</Label>
              <Textarea
                rows={3}
                placeholder="Что агент должен достигать в каждом ответе..."
                value={agentForm.goals}
                onChange={e => setAgentForm(prev => ({ ...prev, goals: e.target.value }))}
              />
            </div>

            <div>
              <Label>Ограничения</Label>
              <Textarea
                rows={3}
                placeholder="Что нельзя делать, какие рамки соблюдать..."
                value={agentForm.constraints}
                onChange={e => setAgentForm(prev => ({ ...prev, constraints: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveSettingsAgent(null)}>
              Отмена
            </Button>
            <Button onClick={saveAgentSettings} disabled={isSavingAgent}>
              {isSavingAgent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
