import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'
import {
  AlertCircle,
  BookOpen,
  Bot,
  Calendar,
  Database,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Moon,
  Newspaper,
  PanelLeft,
  PenTool,
  Plus,
  Power,
  Rss,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  User,
  Users,
  Wrench,
  Youtube
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { cn } from './lib/utils'
import { Alert, AlertDescription } from './components/ui/alert'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet'
import { Switch } from './components/ui/switch'
import { Textarea } from './components/ui/textarea'
import { Toaster } from './components/ui/sonner'

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
  post_mode?: 'short' | 'long'
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

const AGENT_ICONS: Record<string, ReactNode> = {
  CONTENT_CREATOR: <PenTool className="h-4 w-4" />,
  EDITOR: <Edit3 className="h-4 w-4" />,
  SMM_MANAGER: <Calendar className="h-4 w-4" />,
  MASTER_AGENT: <Bot className="h-4 w-4" />
}

const AGENT_BADGE_CLASSES: Record<string, string> = {
  CONTENT_CREATOR: 'bg-blue-600/90 text-white',
  EDITOR: 'bg-violet-600/90 text-white',
  SMM_MANAGER: 'bg-amber-500/90 text-amber-950',
  MASTER_AGENT: 'bg-slate-900 text-white'
}

const STATUS_TONE_CLASSES = {
  success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
  neutral: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300'
} as const

const API_STATUS_META: Record<'checking' | 'connected' | 'error', { label: string; tone: keyof typeof STATUS_TONE_CLASSES }> = {
  checking: { label: 'Checking', tone: 'warning' },
  connected: { label: 'Online', tone: 'success' },
  error: { label: 'Offline', tone: 'danger' }
}

const SOURCE_TYPE_ICONS: Record<string, ReactNode> = {
  website: <Globe className="h-4 w-4" />,
  blog: <FileText className="h-4 w-4" />,
  news: <Newspaper className="h-4 w-4" />,
  rss: <Rss className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  documentation: <BookOpen className="h-4 w-4" />
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
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
      tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    }

    try {
      const url = editingSource ? `${API_URL}/api/sources/${editingSource.id}` : `${API_URL}/api/sources`
      const response = await fetch(url, {
        method: editingSource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        toast.error('Ошибка при сохранении')
        return
      }

      toast.success(editingSource ? 'Источник обновлён' : 'Источник добавлен')
      setShowForm(false)
      setEditingSource(null)
      setFormData({ name: '', url: '', type: 'website', category: '', description: '', tags: '' })
      setFormErrors({})
      loadSources()
      onSourcesChange()
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
      toast.error('Ошибка при переключении источника')
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
    <section className="space-y-4" aria-label="Управление источниками">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Источники информации</h3>
        <Button type="button" size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка...
        </div>
      ) : sources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Database className="h-9 w-9" />
            <p className="text-sm font-medium">Нет источников</p>
            <p className="text-xs">Добавьте первый источник информации</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-lg border p-3',
                !source.is_active && 'opacity-65'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  {SOURCE_TYPE_ICONS[source.type] || <Globe className="h-4 w-4" />}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{source.name}</span>
                    {source.category && <Badge variant="outline">{source.category}</Badge>}
                    <Badge variant="secondary">{source.is_active ? 'Активен' : 'Отключен'}</Badge>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-source-link inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {source.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {source.description && <p className="text-xs text-muted-foreground">{source.description}</p>}
                  {!!source.tags?.length && (
                    <div className="flex flex-wrap gap-1">
                      {source.tags.map((tag) => (
                        <Badge key={`${source.id}-${tag}`} variant="outline">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleToggle(source.id)} aria-label={source.is_active ? 'Отключить источник' : 'Включить источник'}>
                  <Power className={cn('h-4 w-4', source.is_active ? 'text-green-600' : 'text-muted-foreground')} />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => openEditForm(source)} aria-label="Редактировать источник">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="destructive" size="icon-sm" onClick={() => handleDelete(source.id)} aria-label="Удалить источник">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{editingSource ? 'Редактировать источник' : 'Добавить источник'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-6">
                <Label htmlFor="source-name">Название</Label>
                <Input
                  id="source-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  placeholder="Например: Habr"
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label>Тип</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Тип источника" />
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

              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="source-category">Категория</Label>
                <Input
                  id="source-category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Например: Технологии"
                />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label htmlFor="source-url">URL</Label>
                <Input
                  id="source-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                    if (formErrors.url) setFormErrors((prev) => ({ ...prev, url: undefined }))
                  }}
                  placeholder="https://..."
                />
                {formErrors.url ? (
                  <p className="text-xs text-destructive">{formErrors.url}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Ссылка должна начинаться с http:// или https://</p>
                )}
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label htmlFor="source-description">Описание</Label>
                <Textarea
                  id="source-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание источника"
                />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label htmlFor="source-tags">Теги (через запятую)</Label>
                <Input
                  id="source-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="ремонт, техника, советы"
                />
              </div>

              <div className="flex justify-end gap-2 md:col-span-12">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
                <Button type="submit">{editingSource ? 'Сохранить' : 'Добавить'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function AppShadcn() {
  const { resolvedTheme, setTheme } = useTheme()
  const STORAGE_KEY = 'serviceby-chat-history-v1'
  const SIDEBAR_MODE_KEY = 'serviceby-sidebar-mode-v1'
  const [isThemeReady, setIsThemeReady] = useState(false)
  const [isSidebarCompact, setIsSidebarCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_MODE_KEY) === 'compact'
  })
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
  const [isSourcesDialogOpen, setIsSourcesDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [agentForm, setAgentForm] = useState({
    custom_prompt: '',
    clarifications: '',
    goals: '',
    constraints: '',
    post_mode: 'long' as 'short' | 'long',
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
    setIsThemeReady(true)
  }, [])

  useEffect(() => {
    const serializable = messages
      .filter((message) => message.id !== 'welcome')
      .map((message) => ({ ...message, timestamp: message.timestamp.toISOString() }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_MODE_KEY, isSidebarCompact ? 'compact' : 'expanded')
  }, [isSidebarCompact])

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
      const restored = parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) }))
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

      if (!response.ok) {
        toast.error('Не удалось изменить модель')
        return
      }

      setCurrentModel(modelId)
      const modelInfo = models.find((model) => model.id === modelId)
      toast.success(`Модель изменена на ${modelInfo?.name || modelId}`)
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
          messages: messages
            .filter((message) => message.id !== 'welcome')
            .concat(userMessage)
            .map((message) => ({ role: message.role, content: message.content })),
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
        id: `${Date.now() + 1}`,
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
      post_mode: current?.post_mode === 'short' ? 'short' : 'long',
      is_active: current?.is_active ?? true
    })
  }

  const openSettingsModal = (agentKey = 'MASTER_AGENT') => {
    openAgentSettings(agentKey)
    setIsSettingsDialogOpen(true)
  }

  const closeSettingsModal = () => {
    setIsSettingsDialogOpen(false)
    setActiveSettingsAgent(null)
  }

  const openSettingsFromMobile = (agentKey = 'MASTER_AGENT') => {
    setIsMobilePanelOpen(false)
    window.setTimeout(() => openSettingsModal(agentKey), 120)
  }

  const openSourcesFromMobile = () => {
    setIsMobilePanelOpen(false)
    window.setTimeout(() => setIsSourcesDialogOpen(true), 120)
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

  const clearHistory = async () => {
    if (!confirm('Очистить историю чата?')) return
    try {
      await fetch(`${API_URL}/api/chat/history`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_KEY)
    setMessages((prev) => [prev[0]])
    toast.success('История очищена')
  }

  const getAgentMessagesCount = (agentKey: string) => messages.filter((message) => message.role === 'assistant' && message.agent?.key === agentKey).length
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
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
      if (part.startsWith('```') && part.endsWith('```')) {
        return (
          <pre key={index} className="my-2 overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-100">
            <code>{part.slice(3, -3).trim()}</code>
          </pre>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="rounded bg-muted px-1 py-0.5 text-xs">
            {part.slice(1, -1)}
          </code>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const AgentBadge = ({ agent }: { agent?: AgentInfo }) => {
    if (!agent) return null
    return (
      <Badge className={cn('mb-2 gap-1', AGENT_BADGE_CLASSES[agent.key] || 'bg-slate-500 text-white')}>
        {AGENT_ICONS[agent.key] || <Bot className="h-3.5 w-3.5" />}
        <span className="text-[0.8125rem] font-medium">{agent.name}</span>
        <span className="opacity-75">·</span>
        <span className="text-[0.75rem]">{agent.role}</span>
      </Badge>
    )
  }

  const RoutingPanel = ({ routing }: { routing?: RoutingInfo }) => {
    if (!routing) return null
    const confidenceLabel = routing.confidence === 'high' ? 'Высокая' : routing.confidence === 'medium' ? 'Средняя' : 'Низкая'
    const confidenceClass = routing.confidence === 'high'
      ? 'bg-emerald-600 text-white'
      : routing.confidence === 'medium'
        ? 'bg-amber-500 text-amber-950'
        : 'bg-slate-500 text-white'

    return (
      <Alert className="mb-2 border bg-muted/40 py-2">
        <AlertDescription className="space-y-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Маршрутизация Master Agent</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.75rem] text-muted-foreground">Выбран агент:</span>
            <Badge variant="secondary">{routing.selectedAgentName} ({routing.selectedAgentKey})</Badge>
            <Badge className={confidenceClass}>Уверенность: {confidenceLabel}</Badge>
          </div>
          <div className="text-[0.75rem] text-muted-foreground">Причина: {routing.reason}</div>
          {routing.matchedSignals && routing.matchedSignals.length > 0 && (
            <div className="text-[0.75rem] text-muted-foreground">Сигналы: {routing.matchedSignals.join(', ')}</div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const apiStatusMeta = API_STATUS_META[apiStatus]
  const statusBadgeClass = cn('border', STATUS_TONE_CLASSES[apiStatusMeta.tone])
  const isDarkTheme = isThemeReady && resolvedTheme === 'dark'

  const toggleTheme = () => {
    const currentTheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  const renderSidebarContent = (isMobile = false, isCompact = false) => (
    <div className={cn('space-y-4', isCompact && 'space-y-3')}>
      <section className="grid grid-cols-3 gap-2" aria-label="Быстрая статистика">
        <Card className="gap-1 py-3 app-card-hover-interactive">
          <CardContent className="px-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-blue-600" />
            <p className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Агентов</p>
            <p className="text-sm font-semibold md:text-[0.9375rem]">4</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-3 app-card-hover-interactive">
          <CardContent className="px-3 text-center">
            <MessageSquare className="mx-auto mb-1 h-4 w-4 text-violet-600" />
            <p className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Чатов</p>
            <p className="text-sm font-semibold md:text-[0.9375rem]">{messages.length}</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-3 app-card-hover-interactive">
          <CardContent className="px-3 text-center">
            <Target className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
            <p className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Задач</p>
            <p className="text-sm font-semibold md:text-[0.9375rem]">{messages.filter((message) => message.role === 'user').length}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2" aria-label="Выбор модели">
        <Label className="text-xs uppercase text-muted-foreground">Модель ИИ</Label>
        {isLoadingModels ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка моделей...
          </div>
        ) : (
          <Select value={currentModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите модель" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </section>

      <section className="space-y-2" aria-label="Источники">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Источники</p>
            <p className="text-sm md:text-[0.9375rem]">
              {sourcesCount === 0 ? 'Нет источников' : `${sourcesCount} источник${sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'}`}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => (isMobile ? openSourcesFromMobile() : setIsSourcesDialogOpen(true))}>
            <Database className="h-4 w-4" />
            {!isCompact && 'Управление'}
          </Button>
        </div>
      </section>

      <section className="space-y-2" aria-label="Агенты и настройки">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Агенты и настройки</span>
        </div>
        {sidebarAgents.map((agent) => {
          const settings = agentSettings[agent.key]
          const requestsHandled = getAgentMessagesCount(agent.key)
          return (
            <div key={agent.key} className="space-y-2 rounded-lg border p-3 app-card-hover-interactive">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-md', AGENT_BADGE_CLASSES[agent.key] || 'bg-slate-600 text-white')}>
                    {AGENT_ICONS[agent.key]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold md:text-[0.9375rem]">{agent.label}</p>
                    {!isCompact && <p className="text-[0.75rem] text-muted-foreground md:text-[0.8125rem]">{agent.actions}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={settings?.is_active === false ? 'destructive' : 'secondary'}>
                    {settings?.is_active === false ? 'off' : 'on'}
                  </Badge>
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => (isMobile ? openSettingsFromMobile(agent.key) : openSettingsModal(agent.key))} aria-label={`Настроить ${agent.label}`}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{isCompact ? `Ответов ${requestsHandled}` : `Ответов: ${requestsHandled}`}</Badge>
                {!isCompact && <Badge variant="outline">Промпт: {(settings?.custom_prompt || '').trim() ? 'кастом' : 'базовый'}</Badge>}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_-10%,hsl(var(--brand-primary-100))_0%,transparent_50%),radial-gradient(circle_at_100%_0%,hsl(var(--brand-accent-100))_0%,transparent_45%)] transition-colors duration-500">
      <div className="mx-auto max-w-[1600px] p-3 md:p-4">
        <Card className="mb-3 lg:hidden">
          <CardContent className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Мастер-агент</p>
                <p className="text-xs text-muted-foreground">service.by</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMobilePanelOpen(true)}>
                <PanelLeft className="h-4 w-4" />
                Панель
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="motion-safe:transition-transform motion-safe:hover:scale-105" onClick={toggleTheme} aria-label="Переключить тему">
                <span className="relative block h-4 w-4">
                  <Sun className={cn('absolute inset-0 h-4 w-4 motion-safe:transition-all motion-safe:duration-300', isDarkTheme ? 'rotate-0 scale-100' : 'rotate-90 scale-0')} />
                  <Moon className={cn('absolute inset-0 h-4 w-4 motion-safe:transition-all motion-safe:duration-300', isDarkTheme ? '-rotate-90 scale-0' : 'rotate-0 scale-100')} />
                </span>
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => openSettingsModal()} aria-label="Настройки агентов">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className={cn(
          'grid gap-3 motion-safe:transition-[grid-template-columns] motion-safe:duration-300',
          isSidebarCompact ? 'lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]' : 'lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr]'
        )}>
          <aside className="hidden lg:block">
            <Card className="flex h-[calc(100vh-2rem)] flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-[1.0625rem]">Мастер-агент</CardTitle>
                    <p className="text-[0.75rem] text-muted-foreground md:text-[0.8125rem]">service.by</p>
                  </div>
                  <Button type="button" variant="outline" size="icon-sm" className="ml-auto" onClick={() => openSettingsModal()} aria-label="Настройки агентов">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="motion-safe:transition-transform motion-safe:hover:scale-105" onClick={() => setIsSidebarCompact((prev) => !prev)} aria-label={isSidebarCompact ? 'Расширить сайдбар' : 'Свернуть сайдбар'}>
                    <PanelLeft className={cn('h-4 w-4 motion-safe:transition-transform motion-safe:duration-300', isSidebarCompact && 'rotate-180')} />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="motion-safe:transition-transform motion-safe:hover:scale-105" onClick={toggleTheme} aria-label="Переключить тему">
                    <span className="relative block h-4 w-4">
                      <Sun className={cn('absolute inset-0 h-4 w-4 motion-safe:transition-all motion-safe:duration-300', isDarkTheme ? 'rotate-0 scale-100' : 'rotate-90 scale-0')} />
                      <Moon className={cn('absolute inset-0 h-4 w-4 motion-safe:transition-all motion-safe:duration-300', isDarkTheme ? '-rotate-90 scale-0' : 'rotate-0 scale-100')} />
                    </span>
                  </Button>
                  <Badge className={statusBadgeClass}>{apiStatusMeta.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pt-4">
                {renderSidebarContent(false, isSidebarCompact)}
              </CardContent>
              <CardFooter className="justify-center border-t pt-4 text-center text-xs text-muted-foreground">
                Telegram-канал о ремонте бытовой техники в Беларуси
              </CardFooter>
            </Card>
          </aside>

          <main>
            <Card className="flex h-[calc(100vh-1rem)] min-h-[680px] flex-col lg:h-[calc(100vh-2rem)]">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <div>
                      <CardTitle className="text-base md:text-[1.0625rem]">Чат с Мастер-агентом</CardTitle>
                      <p className="text-[0.75rem] text-muted-foreground md:text-[0.8125rem]">Координатор команды контент-маркетинга</p>
                    </div>
                  </div>
                  <Badge className={statusBadgeClass}>{apiStatusMeta.label}</Badge>
                </div>
              </CardHeader>

              {error && (
                <div className="px-6 pt-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              <CardContent ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-3 py-3 md:px-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <Avatar className="h-9 w-9 border bg-slate-900 text-white">
                        <AvatarFallback className="bg-transparent">
                          {message.agent ? AGENT_ICONS[message.agent.key] : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={cn(
                      'max-w-[92%] rounded-2xl border px-3 py-2 text-sm shadow-sm md:max-w-[80%]',
                      message.role === 'user'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground'
                    )}>
                      {message.role === 'assistant' && message.agent && <AgentBadge agent={message.agent} />}
                      {message.role === 'assistant' && <RoutingPanel routing={message.routing} />}
                      <div className="leading-relaxed">{renderMessageContent(message.content)}</div>
                      <div className={cn('mt-2 text-[11px]', message.role === 'user' ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="h-9 w-9 border bg-muted">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 border bg-slate-900 text-white">
                      <AvatarFallback className="bg-transparent">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1 rounded-md border bg-card px-3 py-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              <CardFooter className="block border-t pt-4">
                <form
                  className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSend()
                  }}
                >
                  <Input
                    id="chat-input"
                    className="h-10 text-sm md:text-[0.9375rem]"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Опишите задачу..."
                    disabled={isTyping}
                  />
                  <Button type="button" variant="outline" className="h-10 md:min-w-[170px]" onClick={clearHistory}>
                    <Trash2 className="h-4 w-4" />
                    Очистить историю
                  </Button>
                  <Button type="submit" className="h-10 md:min-w-[170px]" disabled={!input.trim() || isTyping}>
                    {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Отправить
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
                  Мастер-агент использует {sourcesCount} источник{sourcesCount === 1 ? '' : sourcesCount < 5 ? 'а' : 'ов'}
                </p>
              </CardFooter>
            </Card>
          </main>
        </div>
      </div>

      <Sheet open={isMobilePanelOpen} onOpenChange={setIsMobilePanelOpen}>
        <SheetContent side="left" className="w-[92vw] max-w-sm p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Панель управления</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-y-auto p-4">
            {renderSidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isSourcesDialogOpen} onOpenChange={setIsSourcesDialogOpen}>
        <DialogContent className="max-h-[94vh] w-[96vw] sm:!max-w-[96vw] xl:!max-w-[1200px] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle>Управление источниками информации</DialogTitle>
            <DialogDescription>Добавляйте, редактируйте и отключайте источники контента.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[78vh] overflow-y-auto px-6 py-4">
            <SourcesManager onSourcesChange={loadSourcesCount} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={(open) => {
          setIsSettingsDialogOpen(open)
          if (!open) setActiveSettingsAgent(null)
        }}
      >
        <DialogContent className="app-dialog-settings-friendly max-h-[95vh] w-[97vw] sm:!max-w-[97vw] 2xl:!max-w-[1500px] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle className="app-type-heading">Настройка агентов</DialogTitle>
            <DialogDescription className="app-type-body">
              Выберите агента слева и настройте его поведение. Форма справа рассчитана на длинные инструкции и удобную редактуру.
            </DialogDescription>
          </DialogHeader>

          <div className="app-settings-layout grid max-h-[80vh] grid-cols-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[clamp(300px,28vw,380px)_minmax(0,1fr)]">
            <aside className="app-settings-sidebar space-y-3 xl:sticky xl:top-0 xl:self-start">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="app-type-title font-semibold">Выберите агента</p>
                <p className="app-type-caption text-muted-foreground">
                  Активный агент подсвечивается. Настройки сохраняются индивидуально для каждого.
                </p>
              </div>
              <div className="space-y-2">
                {settingsAgents.map((agent) => {
                  const setting = agentSettings[agent.key]
                  const isSelected = activeSettingsAgent === agent.key
                  return (
                    <button
                      key={agent.key}
                      type="button"
                      className={cn(
                        'app-interactive app-settings-agent-item w-full rounded-xl border p-3.5 text-left',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'hover:border-primary/35 hover:bg-muted/40'
                      )}
                      onClick={() => openAgentSettings(agent.key)}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', AGENT_BADGE_CLASSES[agent.key] || 'bg-slate-600 text-white')}>
                          {AGENT_ICONS[agent.key] || <Bot className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="app-type-body font-semibold">{agent.label}</span>
                            <Badge variant={setting?.is_active === false ? 'destructive' : 'secondary'}>
                              {setting?.is_active === false ? 'off' : 'on'}
                            </Badge>
                          </div>
                          <p className="app-type-caption break-words text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="app-settings-main min-w-0 space-y-4 rounded-xl border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="app-type-title font-semibold">{activeAgentMeta.label}</p>
                  <p className="app-type-caption break-words text-muted-foreground">{activeAgentMeta.role}</p>
                  <p className="app-type-micro mt-1 text-muted-foreground">
                    Изменения применяются при следующем ответе выбранного агента.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Label htmlFor="agent-active">Активен</Label>
                  <Switch
                    id="agent-active"
                    checked={agentForm.is_active}
                    onCheckedChange={(checked) => setAgentForm((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>

              {activeSettingsAgent === 'EDITOR' && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label htmlFor="editor-post-mode">Режим поста для Telegram</Label>
                  <Select
                    value={agentForm.post_mode}
                    onValueChange={(value: 'short' | 'long') => setAgentForm((prev) => ({ ...prev, post_mode: value }))}
                  >
                    <SelectTrigger id="editor-post-mode" className="w-full">
                      <SelectValue placeholder="Выберите режим поста" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Короткий пост (до 700 символов)</SelectItem>
                      <SelectItem value="long">Развернутый пост (1200–2200 символов)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="app-type-caption text-muted-foreground">
                    {agentForm.post_mode === 'short'
                      ? 'Короткий режим: плотный, лаконичный пост с быстрым донесением сути.'
                      : 'Развернутый режим: подробный пост с логичной структурой и более полным раскрытием темы.'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="agent-custom-prompt">Кастомный промпт</Label>
                <Textarea
                  id="agent-custom-prompt"
                  rows={9}
                  className="min-h-[220px] text-sm leading-relaxed"
                  placeholder="Например: всегда предлагай 3 варианта заголовка..."
                  value={agentForm.custom_prompt}
                  onChange={(event) => setAgentForm((prev) => ({ ...prev, custom_prompt: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agent-clarifications">Уточнения</Label>
                  <Textarea
                    id="agent-clarifications"
                    rows={5}
                    className="min-h-[150px] text-sm leading-relaxed"
                    placeholder="Тон, формат, стиль, требования..."
                    value={agentForm.clarifications}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, clarifications: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-goals">Цели</Label>
                  <Textarea
                    id="agent-goals"
                    rows={5}
                    className="min-h-[150px] text-sm leading-relaxed"
                    placeholder="Что агент должен достигать..."
                    value={agentForm.goals}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, goals: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-constraints">Ограничения</Label>
                <Textarea
                  id="agent-constraints"
                  rows={5}
                  className="min-h-[150px] text-sm leading-relaxed"
                  placeholder="Что нельзя делать, какие рамки соблюдать..."
                  value={agentForm.constraints}
                  onChange={(event) => setAgentForm((prev) => ({ ...prev, constraints: event.target.value }))}
                />
              </div>
            </section>
          </div>

          <DialogFooter className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <Button type="button" variant="outline" onClick={closeSettingsModal}>Отмена</Button>
            <Button type="button" onClick={saveAgentSettings} disabled={isSavingAgent || !activeSettingsAgent}>
              {isSavingAgent && <Loader2 className="h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="top-right" />
    </div>
  )
}

export default AppShadcn
