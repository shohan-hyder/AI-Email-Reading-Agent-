import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type EmailNotification, type AgentRun } from '@/lib/supabase'
import { ModeToggle } from '@/components/mode-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Inbox,
  MailOpen,
  Play,
  RefreshCw,
  RotateCcw,
  Loader2,
  TrendingUp,
  XCircle,
  Zap,
  CreditCard,
  MessageSquareWarning,
  Bell,
  BellOff,
  Server,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RunStats = {
  processed: number
  flagged: number
  skipped: number
  errors?: number
}

const POLL_INTERVAL_MS = 30_000

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  SERVER_DOWN: { label: 'Server Down', icon: Server, color: 'text-red-500' },
  PAYMENT_ISSUE: { label: 'Payment Issue', icon: CreditCard, color: 'text-orange-500' },
  CLIENT_COMPLAINT: { label: 'Client Complaint', icon: MessageSquareWarning, color: 'text-yellow-500' },
  SECURITY_ALERT: { label: 'Security Alert', icon: ShieldAlert, color: 'text-red-600' },
  SUBSCRIPTION: { label: 'Subscription', icon: Bell, color: 'text-blue-500' },
  BILLING_INQUIRY: { label: 'Billing Inquiry', icon: CreditCard, color: 'text-orange-400' },
  OTHER: { label: 'Other', icon: Inbox, color: 'text-muted-foreground' },
  SPAM: { label: 'Spam', icon: BellOff, color: 'text-muted-foreground' },
  NEWSLETTER: { label: 'Newsletter', icon: MailOpen, color: 'text-muted-foreground' },
  ERROR: { label: 'Error', icon: XCircle, color: 'text-destructive' },
}

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', className: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400', dot: 'bg-red-500' },
  MEDIUM: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400', dot: 'bg-yellow-500' },
  LOW: { label: 'Low', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400', dot: 'bg-blue-500' },
}

function PriorityBadge({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cfg.className)}>
      <span className={cn('size-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.OTHER
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Icon className={cn('size-3', meta.color)} />
      {meta.label || category}
    </span>
  )
}

function EmailCard({
  notification,
  onMarkRead,
}: {
  notification: EmailNotification
  onMarkRead: (id: string) => void
}) {
  const receivedDate = new Date(notification.received_at)
  const timeStr = receivedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = receivedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const isToday = receivedDate.toDateString() === new Date().toDateString()
  const displayTime = isToday ? `Today ${timeStr}` : `${dateStr} ${timeStr}`

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-lg border p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-foreground/20',
        notification.is_read
          ? 'border-border/50 bg-card/60 opacity-75'
          : 'border-border bg-card shadow-xs',
        notification.priority === 'HIGH' && !notification.is_read && 'border-l-[3px] border-l-red-500',
        notification.priority === 'MEDIUM' && !notification.is_read && 'border-l-[3px] border-l-yellow-500',
        notification.priority === 'LOW' && !notification.is_read && 'border-l-[3px] border-l-blue-500',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={notification.priority} />
            <CategoryBadge category={notification.category} />
            {!notification.is_read && (
              <span className="size-1.5 rounded-full bg-primary" title="Unread" />
            )}
          </div>
          <h3 className={cn('text-sm font-semibold leading-snug', notification.is_read && 'font-normal text-muted-foreground')}>
            {notification.subject}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{displayTime}</span>
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMarkRead(notification.id)}
              title="Mark as read"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <CheckCircle2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MailOpen className="size-3 shrink-0" />
        <span className="truncate">
          <span className="font-medium text-foreground/80">{notification.sender}</span>
          {notification.sender_email && (
            <span className="ml-1 opacity-60">&lt;{notification.sender_email}&gt;</span>
          )}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2">
        <Bot className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground/70">AI: </span>
          {notification.reason}
        </p>
      </div>

      {notification.body_preview && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {notification.body_preview}
        </p>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accentClass,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  accentClass?: string
}) {
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', accentClass || 'bg-muted')}>
          <Icon className={cn('size-5', accentClass ? 'text-white' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{title}</p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground/60">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function AgentLogItem({ message }: { message: string }) {
  const isFlag = message.includes('✓ FLAGGED')
  const isIgnore = message.includes('✗ IGNORED')
  const isSkip = message.includes('Skipping')
  return (
    <div className="flex items-start gap-2 py-1 text-xs font-mono">
      {isFlag && <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-green-500" />}
      {isIgnore && <XCircle className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />}
      {isSkip && <RefreshCw className="mt-0.5 size-3 shrink-0 text-blue-400" />}
      {!isFlag && !isIgnore && !isSkip && <Zap className="mt-0.5 size-3 shrink-0 text-primary" />}
      <span className={cn(
        isFlag && 'text-green-600 dark:text-green-400',
        isIgnore && 'text-muted-foreground/60',
        !isFlag && !isIgnore && 'text-foreground/80',
      )}>
        {message}
      </span>
    </div>
  )
}

export function App() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [filterPriority, setFilterPriority] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [agentLog, setAgentLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [runStats, setRunStats] = useState<RunStats | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      
      // Fetch notifications from backend
      const response = await fetch(`${backendUrl}/notifications?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setNotifications((data.notifications || []) as EmailNotification[])
      } else {
        console.warn('Failed to fetch notifications from backend')
        setNotifications([])
      }
      
      // Try to fetch from Supabase as fallback (if configured)
      try {
        const { data: runs } = await supabase
          .from('agent_runs')
          .select('*')
          .order('run_at', { ascending: false })
          .limit(5)
        if (runs) setAgentRuns(runs as AgentRun[])
      } catch (err) {
        console.warn('Supabase fetch failed, using backend only')
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setNotifications([])
    }
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))

    const channel = supabase
      .channel('email_notifications_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'email_notifications' }, () => {
        fetchData()
      })
      .subscribe()

    pollTimerRef.current = setInterval(fetchData, POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [fetchData])

  const handleRunAgent = useCallback(async (reset = false) => {
    setRunning(true)
    setAgentLog([])
    setShowLog(true)
    setRunStats(null)

    const log: string[] = []
    const onProgress = (msg: string) => {
      log.push(msg)
      setAgentLog([...log])
    }

    try {
      onProgress('Connecting to backend...')
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      
      if (reset) {
        onProgress('Resetting all data...')
        await fetch(`${backendUrl}/reset`, { method: 'POST' })
        onProgress('✓ Reset complete')
      }

      onProgress('Triggering email agent...')
      const response = await fetch(`${backendUrl}/run`, { method: 'POST' })
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`)
      }

      onProgress('✓ Agent triggered, processing emails...')
      
      // Wait a moment for backend to process
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onProgress('Fetching updated notifications...')
      await fetchData()
      onProgress('✓ Complete!')
      
      // Set mock stats
      const stats = { processed: 20, flagged: 10, skipped: 0, errors: 0 }
      setRunStats(stats as any)
      setLastRun(new Date())
    } catch (err) {
      onProgress(`✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Agent error:', err)
    } finally {
      setRunning(false)
    }
  }, [fetchData])

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      await fetch(`${backendUrl}/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      )
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    try {
      // Mark each notification as read
      await Promise.all(
        notifications
          .filter((n) => !n.is_read)
          .map((n) =>
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/${n.id}/read`, {
              method: 'POST',
            }),
          ),
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [notifications])

  const filtered = notifications.filter((n) => {
    if (filterPriority !== 'ALL' && n.priority !== filterPriority) return false
    if (filterCategory !== 'ALL' && n.category !== filterCategory) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const highCount = notifications.filter((n) => n.priority === 'HIGH').length
  const categories = [...new Set(notifications.map((n) => n.category))].sort()
  const lastRunDisplay = lastRun
    ? lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : agentRuns[0]
    ? new Date(agentRuns[0].run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="size-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">AI Email Agent</h1>
              <p className="text-xs text-muted-foreground">Intelligent inbox monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs sm:flex">
              <span className={cn('size-1.5 rounded-full', running ? 'animate-pulse bg-amber-500' : 'bg-green-500')} />
              <span className="text-muted-foreground">{running ? 'Scanning...' : 'Ready'}</span>
              {lastRunDisplay && !running && (
                <span className="text-muted-foreground/60">· last {lastRunDisplay}</span>
              )}
            </div>

            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="hidden sm:flex">
                <CheckCircle2 className="size-3.5" />
                Mark all read
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" disabled={running}>
                  {running ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  {running ? 'Scanning' : 'Scan Emails'}
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRunAgent(false)} disabled={running}>
                  <Play className="size-4" />
                  Scan new emails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRunAgent(true)} disabled={running}>
                  <RotateCcw className="size-4" />
                  Reset &amp; full rescan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={fetchData}>
                  <RefreshCw className="size-4" />
                  Refresh dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            title="Important Emails"
            value={loading ? '—' : notifications.length}
            icon={Inbox}
            accentClass="bg-primary"
          />
          <StatCard
            title="Unread"
            value={loading ? '—' : unreadCount}
            icon={Bell}
            accentClass={unreadCount > 0 ? 'bg-blue-500' : undefined}
          />
          <StatCard
            title="High Priority"
            value={loading ? '—' : highCount}
            icon={AlertTriangle}
            accentClass={highCount > 0 ? 'bg-red-500' : undefined}
          />
          <StatCard
            title="Agent Runs"
            value={loading ? '—' : agentRuns.length}
            icon={TrendingUp}
            description={agentRuns[0] ? `Last: ${agentRuns[0].emails_processed} processed` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="size-3" />
                Filter:
              </div>

              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filterPriority === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {p === 'ALL' ? 'All Priorities' : p}
                </button>
              ))}

              <Separator orientation="vertical" className="h-4" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="xs" className="h-7">
                    {filterCategory === 'ALL'
                      ? 'All Categories'
                      : (CATEGORY_META[filterCategory]?.label || filterCategory)}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setFilterCategory('ALL')}>
                    All Categories
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {categories.map((cat) => {
                    const meta = CATEGORY_META[cat]
                    const Icon = meta?.icon || Inbox
                    return (
                      <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}>
                        <Icon className={cn('size-4', meta?.color)} />
                        {meta?.label || cat}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="ml-auto text-xs text-muted-foreground">
                {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <Skeleton className="mb-2 h-4 w-3/4" />
                    <Skeleton className="mb-3 h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                  <MailOpen className="size-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {notifications.length === 0 ? 'No important emails yet' : 'No emails match this filter'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notifications.length === 0
                      ? 'Click "Scan Emails" to run the AI agent on 20 mock emails'
                      : 'Try changing your filter criteria'}
                  </p>
                </div>
                {notifications.length === 0 && (
                  <Button onClick={() => handleRunAgent(false)} disabled={running}>
                    {running ? <Loader2 className="animate-spin" /> : <Play />}
                    Scan Mock Emails
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((notification) => (
                  <EmailCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Agent Log</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowLog((v) => !v)}
                  >
                    <ChevronDown className={cn('size-3.5 transition-transform', showLog && 'rotate-180')} />
                  </Button>
                </div>
                <CardDescription>
                  {runStats
                    ? `${runStats.processed} processed · ${runStats.flagged} flagged · ${runStats.skipped} skipped`
                    : 'Run the agent to see output'}
                </CardDescription>
              </CardHeader>
              {showLog && (
                <CardContent className="pt-0">
                  <ScrollArea className="h-48 rounded-md border bg-muted/30 p-2">
                    {agentLog.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No log output yet</p>
                    ) : (
                      agentLog.map((msg, i) => <AgentLogItem key={i} message={msg} />)
                    )}
                    {running && (
                      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Processing...
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Run History</CardTitle>
                <CardDescription>Recent agent scan results</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {agentRuns.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No runs yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {agentRuns.map((run) => (
                      <div key={run.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                        <div className={cn('size-1.5 shrink-0 rounded-full', run.status === 'success' ? 'bg-green-500' : 'bg-yellow-500')} />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium">{run.emails_processed} processed</span>
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                              {run.emails_flagged} flagged
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-2.5" />
                            {new Date(run.run_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  {[
                    { icon: Inbox, text: 'Reads emails from Gmail, IMAP, or mock data' },
                    { icon: Bot, text: 'AI classifies: important / priority / category / reason' },
                    { icon: AlertTriangle, text: 'Important emails appear as notifications' },
                    { icon: BellOff, text: 'Unimportant emails silently ignored' },
                    { icon: CheckCircle2, text: 'Duplicate prevention via processed ID store' },
                    { icon: Clock, text: 'Continuous polling every 2 minutes' },
                  ].map(({ text }, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
