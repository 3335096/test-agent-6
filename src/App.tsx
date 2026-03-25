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
  AlertCircle,
  Loader2,
  Settings,
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
  Wrench,
  PanelLeft
} from 'lucide-react'
import { Toaster, toast } from 'sonner'

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

const AGENT_ICONS: Record<string, React.ReactNode> = {
  CONTENT_CREATOR: <PenTool size={16} />,
  EDITOR: <Edit3 size={16} />,
  SMM_MANAGER: <Calendar size={16} />,
  MASTER_AGENT: <Bot size={16} />
}

const AGENT_COLORS: Record<string, string> = {
  CONTENT_CREATOR: 'text-bg-primary',
  EDITOR: 'text-bg-secondary',
  SMM_MANAGER: 'text-bg-warning',
  MASTER_AGENT: 'text-bg-dark'
}

const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  website: <Globe size={16} />,
  blog: <FileText size={16} />,
  news: <Newspaper size={16} />,
  rss: <Rss size={16} />,
  youtube: <Youtube size={16} />,
  documentation: <BookOpen size={16} />
}

const welcomeMessage = `🤖 АГЕНТ: MASTER_AGENT

Привет! Я Мастер-агент для твоего Telegram-канала service.by

Я координирую команду из 3 специализированных агентов: Content Agent, Editor Agent и SMM Agent.

При создании контента я использую информацию из настроенных источников.

Просто опиши задачу — я сам определю, кто лучше справится, и верну готовый результат. Начнём?`

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')

function SourcesManager({ onSourcesChange }: { onSourcesChange: () => void }) {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'website',
    category: '',
    description: '',
    tags: ''
  })
  const [formErrors, setFormErrors] = useState<{ name?: string; url?: string }>({})

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
    const nextErrors: { name?: string; url?: string } = {}
    const trimmedName = formData.name.trim()
    const trimmedUrl = formData.url.trim()

    if (!trimmedName) {
      nextErrors.name = 'Укажите название источника'
    }

    try {
      new URL(trimmedUrl)
    } catch {
      nextErrors.url = 'Укажите корректный URL (например, https://example.com)'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    const payload = {
      ...formData,
      name: trimmedName,
      url: trimmedUrl,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    try {
      const url = editingSource ? `${API_URL}/api/sources/${editingSource.id}` : `${API_URL}/api/sources`
      const response = await fetch(url, {
        method: editingSource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editingSource ? 'Источник обновлён' : 'Источник добавлен')
        setShowForm(false)
        setEditingSource(null)
        setFormData({ name: '', url: '', type: 'website', category: '', description: '', tags: '' })
        setFormErrors({})
        loadSources()
        onSourcesChange()
      } else {
        toast.error('Ошибка при сохранении')
      }
    } catch {
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
    } catch {
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
    } catch {
      toast.error('Ошибка')
    }
  }

  const openEditForm = (source: Source) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      category: source.category,
      description: source.description,
      tags: (source.tags || []).join(', ')
    })
    setFormErrors({})
    setShowForm(true)
  }

  const openCreateForm = () => {
    setEditingSource(null)
    setFormData({ name: '', url: '', type: 'website', category: '', description: '', tags: '' })
    setFormErrors({})
    setShowForm(true)
  }

  return (
    <section aria-label="Управление источниками" className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="h5 mb-0">Источники информации</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreateForm}>
          <Plus size={16} className="me-1" />
          Добавить
        </button>
      </div>

      {isLoading ? (
        <div className="d-flex align-items-center text-secondary">
          <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          <span>Загрузка...</span>
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center text-secondary py-4 border rounded">
          <Database size={36} className="mb-2" />
          <p className="mb-1">Нет источников</p>
          <p className="mb-0 small">Добавьте первый источник информации</p>
        </div>
      ) : (
        <div className="list-group app-source-list">
          {sources.map((source) => (
            <div key={source.id} className={`list-group-item app-source-list-item d-flex align-items-start justify-content-between gap-3 ${source.is_active ? '' : 'opacity-75'}`}>
              <div className="d-flex align-items-start gap-2 flex-grow-1">
                <div className="border rounded d-flex align-items-center justify-content-center source-icon">
                  {SOURCE_TYPE_ICONS[source.type] || <Globe size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <strong className="small">{source.name}</strong>
                    {source.category && <span className="badge text-bg-light">{source.category}</span>}
                    <span className={`badge ${source.is_active ? 'text-bg-success-subtle text-success-emphasis' : 'text-bg-secondary-subtle text-secondary-emphasis'}`}>
                      {source.is_active ? 'Активен' : 'Отключен'}
                    </span>
                  </div>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="small text-decoration-none d-inline-flex align-items-center gap-1 app-source-link">
                    {source.url} <ExternalLink size={12} />
                  </a>
                  {source.description && <div className="small text-muted mt-1">{source.description}</div>}
                  {!!source.tags?.length && (
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {source.tags.map((tag) => (
                        <span key={`${source.id}-${tag}`} className="badge text-bg-light">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="btn-group btn-group-sm" role="group" aria-label="Управление источником">
                <button type="button" className="btn btn-outline-secondary" onClick={() => handleToggle(source.id)} aria-label={source.is_active ? 'Отключить источник' : 'Включить источник'}>
                  <Power size={14} className={source.is_active ? 'text-success' : 'text-secondary'} />
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => openEditForm(source)} aria-label="Редактировать источник">
                  <Edit size={14} />
                </button>
                <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(source.id)} aria-label="Удалить источник">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card border app-source-form-card">
          <div className="card-body p-3 p-md-4">
            <h4 className="h6 mb-3">{editingSource ? 'Редактировать источник' : 'Добавить источник'}</h4>
            <form onSubmit={handleSubmit} className="row g-3" noValidate>
              <div className="col-12 col-md-6">
                <label htmlFor="source-name" className="form-label">Название</label>
                <input
                  id="source-name"
                  className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  placeholder="Например: Habr"
                  required
                />
                {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
              </div>
              <div className="col-12 col-md-3">
                <label htmlFor="source-type" className="form-label">Тип</label>
                <select id="source-type" className="form-select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="website">Веб-сайт</option>
                  <option value="blog">Блог</option>
                  <option value="news">Новости</option>
                  <option value="rss">RSS</option>
                  <option value="youtube">YouTube</option>
                  <option value="documentation">Документация</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label htmlFor="source-category" className="form-label">Категория</label>
                <input id="source-category" className="form-control" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Например: Технологии" />
              </div>
              <div className="col-12">
                <label htmlFor="source-url" className="form-label">URL</label>
                <input
                  id="source-url"
                  type="url"
                  className={`form-control ${formErrors.url ? 'is-invalid' : ''}`}
                  value={formData.url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value })
                    if (formErrors.url) setFormErrors((prev) => ({ ...prev, url: undefined }))
                  }}
                  placeholder="https://..."
                  required
                />
                {formErrors.url ? <div className="invalid-feedback">{formErrors.url}</div> : <div className="form-text">Ссылка должна начинаться с http:// или https://</div>}
              </div>
              <div className="col-12">
                <label htmlFor="source-description" className="form-label">Описание</label>
                <textarea id="source-description" className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Краткое описание источника" rows={3} />
              </div>
              <div className="col-12">
                <label htmlFor="source-tags" className="form-label">Теги (через запятую)</label>
                <input id="source-tags" className="form-control" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="ремонт, техника, советы" />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">{editingSource ? 'Сохранить' : 'Добавить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
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
    const serializable = messages.filter((m) => m.id !== 'welcome').map((message) => ({ ...message, timestamp: message.timestamp.toISOString() }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  }, [messages])

  useEffect(() => {
    if (!isSettingsModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSettingsModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSettingsModalOpen])

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`)
      setApiStatus(response.ok ? 'connected' : 'error')
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
          setMessages((prev) => [prev[0], ...history])
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
      const restored = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      setMessages((prev) => [prev[0], ...restored])
    } catch (err) {
      console.error('Failed to restore local history:', err)
    }
  }

  const loadAgentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/agents/settings`)
      if (!response.ok) return
      const data = await response.json()
      const map: Record<string, AgentSetting> = {}
      ;(data.settings || []).forEach((item: AgentSetting) => {
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
        const modelInfo = models.find((m) => m.id === modelId)
        toast.success(`Модель изменена на ${modelInfo?.name || modelId}`)
      } else {
        toast.error('Не удалось изменить модель')
      }
    } catch {
      toast.error('Ошибка при смене модели')
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter((m) => m.id !== 'welcome').concat(userMessage).map((m) => ({ role: m.role, content: m.content })),
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
      setMessages((prev) => [...prev, assistantMessage])
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
      const response = await fetch(`${API_URL}/api/agents/${activeSettingsAgent}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentForm)
      })
      if (!response.ok) {
        toast.error('Не удалось сохранить настройки агента')
        return
      }
      const data = await response.json()
      setAgentSettings((prev) => ({ ...prev, [activeSettingsAgent]: data.setting }))
      toast.success('Настройки агента сохранены')
      closeSettingsModal()
    } catch {
      toast.error('Ошибка сети при сохранении настроек агента')
    } finally {
      setIsSavingAgent(false)
    }
  }

  const openSettingsModal = (agentKey: string = 'MASTER_AGENT') => {
    openAgentSettings(agentKey)
    setIsSettingsModalOpen(true)
  }

  const closeSettingsModal = () => {
    setActiveSettingsAgent(null)
    setIsSettingsModalOpen(false)
  }

  const openSettingsFromMobile = (agentKey: string = 'MASTER_AGENT') => {
    openAgentSettings(agentKey)
    const offcanvasCloseButton = document.querySelector<HTMLButtonElement>('#mobileControlPanel .btn-close')
    if (offcanvasCloseButton) {
      offcanvasCloseButton.click()
    }
    window.setTimeout(() => setIsSettingsModalOpen(true), 180)
  }

  const clearHistory = async () => {
    if (!confirm('Очистить историю чата?')) return
    try {
      await fetch(`${API_URL}/api/chat/history`, { method: 'DELETE' })
    } catch {
      // ignore network errors
    }
    localStorage.removeItem(STORAGE_KEY)
    setMessages((prev) => [prev[0]])
    toast.success('История очищена')
  }

  const getAgentMessagesCount = (agentKey: string) => messages.filter((m) => m.role === 'assistant' && m.agent?.key === agentKey).length
  const sidebarAgents = [
    { key: 'CONTENT_CREATOR', label: 'Content Agent', actions: 'Посты, рубрики, сценарии' },
    { key: 'EDITOR', label: 'Editor Agent', actions: 'Вычитка, стиль, улучшения' },
    { key: 'SMM_MANAGER', label: 'SMM Manager', actions: 'Контент-план, публикации, модерация' }
  ]
  const settingsAgents = [
    { key: 'MASTER_AGENT', label: 'Master Agent', role: 'Маршрутизация и координация' },
    ...sidebarAgents.map((agent) => ({ key: agent.key, label: agent.label, role: agent.actions }))
  ]
  const activeAgentMeta = settingsAgents.find((agent) => agent.key === activeSettingsAgent) || settingsAgents[0]
  const formatTime = (date: Date) => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  const renderMessageContent = (content: string) => {
    const cleanContent = content.replace(/🤖\s*АГЕНТ:\s*\w+\n?/i, '').trim()
    const parts = cleanContent.split(/(\*\*.*?\*\*|```[\s\S]*?```|`.*?`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="fw-semibold">{part.slice(2, -2)}</strong>
      if (part.startsWith('```') && part.endsWith('```')) return <pre key={i} className="bg-dark text-light rounded p-2 my-2 small overflow-auto"><code>{part.slice(3, -3).trim()}</code></pre>
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-light border rounded px-1 py-0 small">{part.slice(1, -1)}</code>
      return <span key={i}>{part}</span>
    })
  }

  const AgentBadge = ({ agent }: { agent?: AgentInfo }) => {
    if (!agent) return null
    const badgeClass = AGENT_COLORS[agent.key] || 'text-bg-secondary'
    const icon = AGENT_ICONS[agent.key] || <Bot size={14} />
    return <span className={`badge ${badgeClass} d-inline-flex align-items-center gap-1 mb-2`}>{icon}<span>{agent.name}</span><span className="opacity-75">·</span><span>{agent.role}</span></span>
  }

  const RoutingPanel = ({ routing }: { routing?: RoutingInfo }) => {
    if (!routing) return null
    const confidenceLabel = routing.confidence === 'high' ? 'Высокая' : routing.confidence === 'medium' ? 'Средняя' : 'Низкая'
    const confidenceClass = routing.confidence === 'high' ? 'text-bg-success' : routing.confidence === 'medium' ? 'text-bg-warning' : 'text-bg-secondary'
    return (
      <div className="alert alert-light border mb-2 py-2" role="status" aria-live="polite">
        <div className="small fw-semibold text-uppercase text-secondary mb-1">Маршрутизация Master Agent</div>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
          <span className="small text-secondary">Выбран агент:</span>
          <span className="badge text-bg-primary">{routing.selectedAgentName} ({routing.selectedAgentKey})</span>
          <span className={`badge ${confidenceClass}`}>Уверенность: {confidenceLabel}</span>
        </div>
        <div className="small text-muted">Причина: {routing.reason}</div>
        {routing.matchedSignals && routing.matchedSignals.length > 0 && <div className="small text-muted mt-1">Сигналы: {routing.matchedSignals.join(', ')}</div>}
      </div>
    )
  }

  const renderSidebarContent = (isMobile = false) => (
    <div className="d-grid gap-3 app-sidebar-body">
      <section aria-label="Быстрая статистика">
        <div className="row g-2">
          <div className="col-4">
            <div className="rounded app-mini-stat p-2 text-center h-100">
              <Users size={16} className="text-primary mb-1" />
              <div className="small text-muted">Агентов</div>
              <div className="fw-semibold">4</div>
            </div>
          </div>
          <div className="col-4">
            <div className="rounded app-mini-stat p-2 text-center h-100">
              <MessageSquare size={16} className="text-secondary mb-1" />
              <div className="small text-muted">Чатов</div>
              <div className="fw-semibold">{messages.length}</div>
            </div>
          </div>
          <div className="col-4">
            <div className="rounded app-mini-stat p-2 text-center h-100">
              <Target size={16} className="text-success mb-1" />
              <div className="small text-muted">Задач</div>
              <div className="fw-semibold">{messages.filter((m) => m.role === 'user').length}</div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Выбор модели" className="d-grid gap-2">
        <label htmlFor={isMobile ? 'model-select-mobile' : 'model-select'} className="form-label small text-uppercase text-muted mb-0">Модель ИИ</label>
        {isLoadingModels ? <div className="d-flex align-items-center text-secondary"><div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /><span>Загрузка моделей...</span></div> : (
          <select id={isMobile ? 'model-select-mobile' : 'model-select'} className="form-select" value={currentModel} onChange={(e) => handleModelChange(e.target.value)}>
            {models.map((model) => <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>)}
          </select>
        )}
      </section>

      <section aria-label="Источники" className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div>
          <div className="small text-uppercase text-muted">Источники</div>
          <div className="small">{sourcesCount === 0 ? 'Нет источников' : `${sourcesCount} источник${sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'}`}</div>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#sourcesModal" data-bs-dismiss={isMobile ? 'offcanvas' : undefined}>
          <Database size={14} className="me-1" />
          Управление
        </button>
      </section>

      <section aria-label="Агенты и настройки" className="d-grid gap-2">
        <div className="d-flex align-items-center gap-2">
          <Wrench size={14} className="text-muted" />
          <span className="small text-uppercase text-muted">Агенты и настройки</span>
        </div>
        {sidebarAgents.map((agent) => {
          const settings = agentSettings[agent.key]
          const requestsHandled = getAgentMessagesCount(agent.key)
          const colorClass = AGENT_COLORS[agent.key] || 'text-bg-secondary'
          return (
            <article key={agent.key} className="border rounded p-2 app-agent-card" aria-label={`Агент ${agent.label}`}>
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div className="d-flex align-items-start gap-2">
                  <div className={`rounded d-flex align-items-center justify-content-center text-white agent-badge ${colorClass}`}>{AGENT_ICONS[agent.key]}</div>
                  <div>
                    <div className="fw-semibold small">{agent.label}</div>
                    <div className="text-muted small">{agent.actions}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <span className={`badge ${settings?.is_active === false ? 'text-bg-danger' : 'text-bg-success'}`}>{settings?.is_active === false ? 'off' : 'on'}</span>
                  <button type="button" className="btn btn-outline-secondary btn-sm app-icon-only-btn" onClick={() => (isMobile ? openSettingsFromMobile(agent.key) : openSettingsModal(agent.key))} aria-label={`Настроить ${agent.label}`}>
                    <Settings size={13} />
                  </button>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <span className="badge text-bg-light app-compact-badge">Ответов: {requestsHandled}</span>
                <span className="badge text-bg-light app-compact-badge">Промпт: {(settings?.custom_prompt || '').trim() ? 'кастом' : 'базовый'}</span>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )

  return (
    <div className="app-bootstrap">
      <div className="container-fluid py-3 py-md-4 px-2 px-md-3 px-xl-4">
        <div className="d-lg-none mb-3">
          <div className="card app-mobile-topbar shadow-sm">
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center app-icon">
                  <Bot size={16} />
                </div>
                <div>
                  <div className="fw-semibold small">Мастер-агент</div>
                  <small className="text-muted">service.by</small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                  data-bs-toggle="offcanvas"
                  data-bs-target="#mobileControlPanel"
                  aria-controls="mobileControlPanel"
                >
                  <PanelLeft size={14} className="me-1" />
                  Панель
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm app-icon-only-btn" onClick={() => openSettingsModal()} aria-label="Настройки агентов">
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <aside className="d-none d-lg-block col-lg-4 col-xl-3" aria-label="Панель управления">
            <div className="card app-shell-card shadow-sm h-100">
              <div className="card-header bg-white">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center app-icon"><Bot size={16} /></div>
                  <div><h1 className="h6 mb-0">Мастер-агент</h1><small className="text-muted">service.by</small></div>
                  <button type="button" className="btn btn-outline-secondary btn-sm app-icon-only-btn" onClick={() => openSettingsModal()} aria-label="Настройки агентов">
                    <Settings size={14} />
                  </button>
                  <span className={`badge ms-auto ${apiStatus === 'connected' ? 'text-bg-success' : apiStatus === 'error' ? 'text-bg-danger' : 'text-bg-warning'}`}>{apiStatus === 'connected' ? 'Online' : apiStatus === 'error' ? 'Offline' : 'Checking'}</span>
                </div>
              </div>
              <div className="card-body">{renderSidebarContent(false)}</div>
              <div className="card-footer bg-light small text-muted text-center">Telegram-канал о ремонте бытовой техники в Беларуси</div>
            </div>
          </aside>

          <main className="col-12 col-lg-8 col-xl-9" aria-label="Чат мастер-агента">
            <div className="card app-shell-card shadow-sm app-chat-card">
              <div className="card-header bg-white d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2">
                  <Sparkles size={18} className="text-warning" />
                  <div>
                    <h2 className="h6 mb-0">Чат с Мастер-агентом</h2>
                    <small className="text-muted">Координатор команды контент-маркетинга</small>
                  </div>
                </div>
                <span className={`badge ${apiStatus === 'connected' ? 'text-bg-success' : apiStatus === 'error' ? 'text-bg-danger' : 'text-bg-warning'}`}>{apiStatus === 'connected' ? 'Online' : apiStatus === 'error' ? 'Offline' : 'Checking'}</span>
              </div>

              {error && <div className="alert alert-danger rounded-0 mb-0" role="alert"><AlertCircle size={16} className="me-2" />{error}</div>}

              <div className="card-body app-chat-scroll px-3 px-md-4 py-3" ref={scrollRef}>
                <div className="d-grid gap-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`d-flex gap-2 align-items-end ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                      {message.role === 'assistant' && <div className="rounded-circle text-bg-dark d-flex align-items-center justify-content-center app-avatar">{message.agent ? AGENT_ICONS[message.agent.key] : <Bot size={16} />}</div>}
                      <div className={`app-message ${message.role === 'user' ? 'app-message-user' : 'app-message-assistant'}`}>
                        {message.role === 'assistant' && message.agent && <AgentBadge agent={message.agent} />}
                        {message.role === 'assistant' && <RoutingPanel routing={message.routing} />}
                        <div className="small">{renderMessageContent(message.content)}</div>
                        <div className="text-muted very-small mt-2">{formatTime(message.timestamp)}</div>
                      </div>
                      {message.role === 'user' && <div className="rounded-circle bg-secondary-subtle d-flex align-items-center justify-content-center app-avatar"><User size={16} /></div>}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle text-bg-dark d-flex align-items-center justify-content-center app-avatar"><Bot size={16} /></div>
                      <div className="border rounded p-2 bg-body-tertiary">
                        <div className="spinner-grow spinner-grow-sm text-secondary me-1" role="status" aria-hidden="true" />
                        <div className="spinner-grow spinner-grow-sm text-secondary me-1" role="status" aria-hidden="true" />
                        <div className="spinner-grow spinner-grow-sm text-secondary" role="status" aria-hidden="true" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="card-footer bg-white px-3 px-md-4 py-3">
                <form className="row g-2 align-items-stretch" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
                  <div className="col-12 col-md">
                    <label htmlFor="chat-input" className="visually-hidden">Сообщение</label>
                    <input id="chat-input" className="form-control app-chat-input h-100" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Опишите задачу..." disabled={isTyping} />
                  </div>
                  <div className="col-6 col-md-auto d-grid">
                    <button type="button" className="btn btn-outline-danger app-chat-action-btn h-100" onClick={clearHistory}>
                      <Trash2 size={14} className="me-1" />
                      Очистить историю
                    </button>
                  </div>
                  <div className="col-6 col-md-auto d-grid">
                    <button type="submit" className="btn btn-primary app-chat-action-btn h-100" disabled={!input.trim() || isTyping}>
                      {isTyping ? <Loader2 size={16} className="me-1 app-spin" /> : <Send size={16} className="me-1" />}
                      Отправить
                    </button>
                  </div>
                </form>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
                  <small className="text-muted">Мастер-агент использует {sourcesCount} источник{sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'}</small>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className="offcanvas offcanvas-start d-lg-none" tabIndex={-1} id="mobileControlPanel" aria-labelledby="mobileControlPanelLabel">
        <div className="offcanvas-header">
          <h2 className="offcanvas-title fs-6" id="mobileControlPanelLabel">Панель управления</h2>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Закрыть" />
        </div>
        <div className="offcanvas-body">
          {renderSidebarContent(true)}
        </div>
      </div>

      <div className="modal fade" id="sourcesModal" tabIndex={-1} aria-labelledby="sourcesModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="sourcesModalLabel">Управление источниками информации</h2>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" />
            </div>
            <div className="modal-body p-3 p-md-4">
              <SourcesManager onSourcesChange={loadSourcesCount} />
            </div>
          </div>
        </div>
      </div>

      <div className={`modal ${isSettingsModalOpen ? 'show d-block' : 'd-none'}`} id="agentSettingsModal" tabIndex={-1} aria-labelledby="agentSettingsModalLabel" aria-hidden={!isSettingsModalOpen} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="agentSettingsModalLabel">Настройка агентов</h2>
              <button type="button" className="btn-close" onClick={closeSettingsModal} aria-label="Закрыть" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="list-group app-agent-settings-list" role="tablist" aria-label="Список агентов для настройки">
                    {settingsAgents.map((agent) => (
                      <button
                        key={agent.key}
                        type="button"
                        className={`list-group-item list-group-item-action ${activeSettingsAgent === agent.key ? 'active' : ''}`}
                        onClick={() => openAgentSettings(agent.key)}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${AGENT_COLORS[agent.key] || 'text-bg-secondary'} d-inline-flex align-items-center gap-1`}>
                            {AGENT_ICONS[agent.key] || <Bot size={12} />}
                          </span>
                          <div className="text-start">
                            <div className="fw-semibold small">{agent.label}</div>
                            <div className="very-small opacity-75">{agent.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-md-8">
                  <div className="border rounded p-3 p-md-4 d-grid gap-3 app-agent-settings-pane">
                    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                      <div>
                        <div className="fw-semibold">{activeAgentMeta.label}</div>
                        <small className="text-muted">{activeAgentMeta.role}</small>
                      </div>
                      <button type="button" className={`btn btn-sm ${agentForm.is_active ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setAgentForm((prev) => ({ ...prev, is_active: !prev.is_active }))}>
                        {agentForm.is_active ? 'Включен' : 'Выключен'}
                      </button>
                    </div>
                    <div className="alert alert-light border mb-0 py-2 small">
                      Для каждого агента можно задать свой рабочий промпт и дополнительные инструкции.
                    </div>
                    <div>
                      <label htmlFor="agent-custom-prompt" className="form-label">Кастомный промпт</label>
                      <textarea id="agent-custom-prompt" className="form-control" rows={5} placeholder="Например: всегда предлагай 3 варианта заголовка..." value={agentForm.custom_prompt} onChange={(e) => setAgentForm((prev) => ({ ...prev, custom_prompt: e.target.value }))} />
                    </div>
                    <div className="row g-3">
                      <div className="col-12 col-lg-6">
                        <label htmlFor="agent-clarifications" className="form-label">Уточнения</label>
                        <textarea id="agent-clarifications" className="form-control" rows={3} placeholder="Тон, формат, стиль, требования..." value={agentForm.clarifications} onChange={(e) => setAgentForm((prev) => ({ ...prev, clarifications: e.target.value }))} />
                      </div>
                      <div className="col-12 col-lg-6">
                        <label htmlFor="agent-goals" className="form-label">Цели</label>
                        <textarea id="agent-goals" className="form-control" rows={3} placeholder="Что агент должен достигать..." value={agentForm.goals} onChange={(e) => setAgentForm((prev) => ({ ...prev, goals: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="agent-constraints" className="form-label">Ограничения</label>
                      <textarea id="agent-constraints" className="form-control" rows={3} placeholder="Что нельзя делать, какие рамки соблюдать..." value={agentForm.constraints} onChange={(e) => setAgentForm((prev) => ({ ...prev, constraints: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={closeSettingsModal}>Отмена</button>
              <button type="button" className="btn btn-primary" onClick={saveAgentSettings} disabled={isSavingAgent || !activeSettingsAgent}>
                {isSavingAgent && <Loader2 size={14} className="me-1 app-spin" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
      {isSettingsModalOpen && <div className="modal-backdrop fade show" onClick={closeSettingsModal} aria-hidden="true" />}

      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
