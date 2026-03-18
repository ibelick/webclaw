import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deriveAgentIdFromKey,
  deriveFriendlyIdFromKey,
  isMissingGatewayAuth,
  isSessionNotFound,
  readError,
} from './utils'
import { createOptimisticMessage } from './chat-screen-utils'
import {
  appendHistoryMessage,
  chatQueryKeys,
  clearHistoryMessages,
  fetchAgents,
  fetchGatewayStatus,
  removeHistoryMessageByClientId,
  updateHistoryMessageByClientId,
  updateSessionLastMessage,
} from './chat-queries'
import { chatUiQueryKey, getChatUiState, setChatUiState } from './chat-ui'
import { ChatSidebar } from './components/chat-sidebar'
import { ChatHeader } from './components/chat-header'
import { ChatMessageList } from './components/chat-message-list'
import { ChatComposer } from './components/chat-composer'
import { GatewayStatusMessage } from './components/gateway-status-message'
import {
  hasPendingGeneration,
  hasPendingSend,
  isRecentSession,
  setPendingGeneration,
  setRecentSession,
  stashPendingSend,
} from './pending-send'
import { useChatMeasurements } from './hooks/use-chat-measurements'
import { useChatHistory } from './hooks/use-chat-history'
import { useChatMobile } from './hooks/use-chat-mobile'
import { useChatSessions } from './hooks/use-chat-sessions'
import { useChatStream } from './hooks/use-chat-stream'
import { useChatPendingSend } from './hooks/use-chat-pending-send'
import { useChatGenerationGuard } from './hooks/use-chat-generation-guard'
import { shouldRedirectToConnect } from './hooks/use-chat-error-state'
import { useChatRedirect } from './hooks/use-chat-redirect'
import type { AttachmentFile } from '@/components/attachment-button'
import type { ChatComposerHelpers } from './components/chat-composer'
import { useExport } from '@/hooks/use-export'
import { useChatSettings } from '@/hooks/use-chat-settings'
import { cn, randomUUID } from '@/lib/utils'

type ChatScreenProps = {
  activeFriendlyId: string
  isNewChat?: boolean
  onSessionResolved?: (payload: {
    sessionKey: string
    friendlyId: string
  }) => void
  forcedSessionKey?: string
}

export function ChatScreen({
  activeFriendlyId,
  isNewChat = false,
  onSessionResolved,
  forcedSessionKey,
}: ChatScreenProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('main')
  const { headerRef, composerRef, mainRef, pinGroupMinHeight, headerHeight } =
    useChatMeasurements()
  const [waitingForResponse, setWaitingForResponse] = useState(
    () => hasPendingSend() || hasPendingGeneration(),
  )
  const [pinToTop, setPinToTop] = useState(
    () => hasPendingSend() || hasPendingGeneration(),
  )
  const { settings } = useChatSettings()
  const pendingRunIdsRef = useRef(new Set<string>())
  const pendingRunTimersRef = useRef(new Map<string, number>())
  const { isMobile } = useChatMobile(queryClient)
  const {
    sessionsQuery,
    sessions,
    activeSession,
    activeExists,
    activeSessionKey,
    activeTitle,
    sessionsError,
  } = useChatSessions({ activeFriendlyId, isNewChat, forcedSessionKey })
  const {
    historyQuery,
    displayMessages,
    historyError,
    resolvedSessionKey,
    activeCanonicalKey,
    sessionKeyForHistory,
  } = useChatHistory({
    activeFriendlyId,
    activeSessionKey,
    forcedSessionKey,
    isNewChat,
    isRedirecting,
    activeExists,
    sessionsReady: sessionsQuery.isSuccess,
    queryClient,
  })

  const { exportConversation } = useExport({
    currentFriendlyId: activeFriendlyId,
    currentSessionKey: sessionKeyForHistory,
    sessionTitle: activeTitle,
  })

  const uiQuery = useQuery({
    queryKey: chatUiQueryKey,
    queryFn: function readUiState() {
      return getChatUiState(queryClient)
    },
    initialData: function initialUiState() {
      return getChatUiState(queryClient)
    },
    staleTime: Infinity,
  })
  
  const agentsQuery = useQuery({
    queryKey: chatQueryKeys.agents,
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000,
  })

  // Set the correct agent ID for the current context
  const currentAgentId = useMemo(() => {
    if (isNewChat) return selectedAgentId
    return deriveAgentIdFromKey(activeCanonicalKey) || 'main'
  }, [isNewChat, selectedAgentId, activeCanonicalKey])

  const defaultAgentIdAppliedRef = useRef(false)
  useEffect(() => {
    if (defaultAgentIdAppliedRef.current) return
    const data = agentsQuery.data
    if (!data) return
    defaultAgentIdAppliedRef.current = true
    const { agents, defaultAgentId } = data
    const matched = agents.some((agent) => agent.id === defaultAgentId)
    if (matched) {
      setSelectedAgentId(defaultAgentId)
    } else if (agents.length > 0) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agentsQuery.data])
  const gatewayStatusQuery = useQuery({
    queryKey: ['gateway', 'status'],
    queryFn: fetchGatewayStatus,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
  })
  const gatewayStatusMountRef = useRef(Date.now())
  const gatewayStatusError =
    gatewayStatusQuery.error instanceof Error
      ? gatewayStatusQuery.error.message
      : gatewayStatusQuery.data && !gatewayStatusQuery.data.ok
        ? gatewayStatusQuery.data.error || 'Gateway unavailable'
        : null
  const gatewayError = gatewayStatusError ?? sessionsError ?? historyError
  const handleGatewayRefetch = useCallback(() => {
    void gatewayStatusQuery.refetch()
  }, [gatewayStatusQuery])
  const isSidebarCollapsed = uiQuery.data.isSidebarCollapsed
  const handleActiveSessionDelete = useCallback(() => {
    setIsRedirecting(true)
    navigate({ to: '/new', replace: true })
  }, [navigate])
  const stableContentStyle = useMemo<React.CSSProperties>(() => ({}), [])
  const missingSessionError =
    isSessionNotFound(historyError ?? '') ||
    isSessionNotFound(sessionsError ?? '')

  const shouldRedirectToNew =
    !isNewChat &&
    !forcedSessionKey &&
    !isRecentSession(activeFriendlyId) &&
    sessionsQuery.isSuccess &&
    !sessions.some((session) => session.friendlyId === activeFriendlyId) &&
    (missingSessionError || (!historyQuery.isFetching && !historyQuery.isSuccess))

  const refreshHistory = useCallback(() => {
    void historyQuery.refetch()
  }, [historyQuery])

  const hideUi = shouldRedirectToNew || isRedirecting

  const finishRun = useCallback(
    (runId: string) => {
      if (!runId) return
      const timer = pendingRunTimersRef.current.get(runId)
      if (typeof timer === 'number') {
        window.clearTimeout(timer)
      }
      pendingRunTimersRef.current.delete(runId)
      pendingRunIdsRef.current.delete(runId)
      if (pendingRunIdsRef.current.size === 0) {
        setPendingGeneration(false)
        setWaitingForResponse(false)
      }
    },
    [setWaitingForResponse],
  )

  const startRun = useCallback(
    (runId: string) => {
      if (!runId) return
      pendingRunIdsRef.current.add(runId)
      const existingTimer = pendingRunTimersRef.current.get(runId)
      if (typeof existingTimer === 'number') {
        window.clearTimeout(existingTimer)
      }
      const timeout = window.setTimeout(() => {
        pendingRunTimersRef.current.delete(runId)
        pendingRunIdsRef.current.delete(runId)
        refreshHistory()
        if (pendingRunIdsRef.current.size === 0) {
          setPendingGeneration(false)
          setWaitingForResponse(false)
        }
      }, 120000)
      pendingRunTimersRef.current.set(runId, timeout)
      setPendingGeneration(true)
      setWaitingForResponse(true)
    },
    [refreshHistory],
  )

  const finishAllRuns = useCallback(() => {
    for (const [, timer] of pendingRunTimersRef.current) {
      window.clearTimeout(timer)
    }
    pendingRunTimersRef.current.clear()
    pendingRunIdsRef.current.clear()
    setPendingGeneration(false)
    setWaitingForResponse(false)
  }, [])

  useEffect(() => {
    return () => {
      finishAllRuns()
    }
  }, [finishAllRuns])

  function sendMessage(
    sessionKey: string,
    friendlyId: string,
    body: string,
    skipOptimistic = false,
    attachments?: Array<AttachmentFile>,
  ) {
    let optimisticClientId = ''
    if (!skipOptimistic) {
      const { clientId, optimisticMessage } = createOptimisticMessage(
        body,
        attachments,
      )
      optimisticClientId = clientId
      appendHistoryMessage(
        queryClient,
        friendlyId,
        sessionKey,
        optimisticMessage,
      )
      updateSessionLastMessage(
        queryClient,
        sessionKey,
        friendlyId,
        optimisticMessage,
      )
    }

    setPendingGeneration(true)
    setSending(true)
    setWaitingForResponse(true)
    setPinToTop(true)

    const attachmentsPayload = attachments?.map((a) => ({
      mimeType: a.file.type,
      content: a.base64,
    }))

    fetch('/api/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        friendlyId,
        message: body,
        thinking: settings.thinkingLevel,
        idempotencyKey: randomUUID(),
        attachments: attachmentsPayload,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res))
        const payload = (await res.json().catch(() => ({}))) as {
          runId?: string
        }
        if (
          typeof payload.runId === 'string' &&
          payload.runId.trim().length > 0
        ) {
          startRun(payload.runId.trim())
        }
        refreshHistory()
      })
      .catch((err) => {
        const messageText = err instanceof Error ? err.message : String(err)
        if (isMissingGatewayAuth(messageText)) {
          navigate({ to: '/connect', replace: true })
          return
        }
        if (optimisticClientId) {
          updateHistoryMessageByClientId(
            queryClient,
            friendlyId,
            sessionKey,
            optimisticClientId,
            function markFailed(message) {
              return { ...message, status: 'error' }
            },
          )
        }
        setPendingGeneration(false)
        setWaitingForResponse(false)
        setPinToTop(false)
      })
      .finally(() => {
        setSending(false)
      })
  }

  const createSessionForMessage = useCallback(async () => {
    setCreatingSession(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId }),
      })
      if (!res.ok) throw new Error(await readError(res))

      const data = (await res.json()) as {
        sessionKey?: string
        friendlyId?: string
      }

      const sessionKey =
        typeof data.sessionKey === 'string' ? data.sessionKey : ''
      const friendlyId =
        typeof data.friendlyId === 'string' && data.friendlyId.trim().length > 0
          ? data.friendlyId.trim()
          : deriveFriendlyIdFromKey(sessionKey)

      if (!sessionKey || !friendlyId) {
        throw new Error('Invalid session response')
      }

      queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
      return { sessionKey, friendlyId }
    } finally {
      setCreatingSession(false)
    }
  }, [queryClient, selectedAgentId])

  const send = useCallback(
    (body: string, helpers: ChatComposerHelpers) => {
      const attachments = helpers.attachments
      if (body.length === 0 && (!attachments || attachments.length === 0))
        return
      helpers.reset()

      if (isNewChat) {
        const { clientId, optimisticId, optimisticMessage } =
          createOptimisticMessage(body, attachments)
        appendHistoryMessage(queryClient, 'new', 'new', optimisticMessage)
        setPendingGeneration(true)
        setSending(true)
        setWaitingForResponse(true)
        setPinToTop(true)

        createSessionForMessage()
          .then(({ sessionKey, friendlyId }) => {
            setRecentSession(friendlyId)
            stashPendingSend({
              sessionKey,
              friendlyId,
              message: body,
              optimisticMessage,
              attachments,
            })
            if (onSessionResolved) {
              onSessionResolved({ sessionKey, friendlyId })
              return
            }
            navigate({
              to: '/chat/$sessionKey',
              params: { sessionKey: friendlyId },
              replace: true,
            })
          })
          .catch(() => {
            removeHistoryMessageByClientId(
              queryClient,
              'new',
              'new',
              clientId,
              optimisticId,
            )
            helpers.setValue(body)
            setPendingGeneration(false)
            setWaitingForResponse(false)
            setPinToTop(false)
            setSending(false)
          })
        return
      }

      const sessionKeyForSend =
        forcedSessionKey ||
        resolvedSessionKey ||
        activeSessionKey ||
        activeFriendlyId
      sendMessage(sessionKeyForSend, activeFriendlyId, body, false, attachments)
    },
    [
      activeFriendlyId,
      activeSessionKey,
      createSessionForMessage,
      forcedSessionKey,
      isNewChat,
      navigate,
      onSessionResolved,
      queryClient,
      resolvedSessionKey,
      settings.thinkingLevel,
    ],
  )

  const startNewChat = useCallback(() => {
    setWaitingForResponse(false)
    setPinToTop(false)
    clearHistoryMessages(queryClient, 'new', 'new')
    navigate({ to: '/new' })
    if (isMobile) {
      setChatUiState(queryClient, function collapse(state) {
        return { ...state, isSidebarCollapsed: true }
      })
    }
  }, [isMobile, navigate, queryClient])

  const handleToggleSidebarCollapse = useCallback(() => {
    setChatUiState(queryClient, function toggle(state) {
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed }
    })
  }, [queryClient])

  const handleSelectSession = useCallback(() => {
    if (!isMobile) return
    setChatUiState(queryClient, function collapse(state) {
      return { ...state, isSidebarCollapsed: true }
    })
  }, [isMobile, queryClient])

  const handleOpenSidebar = useCallback(() => {
    setChatUiState(queryClient, function open(state) {
      return { ...state, isSidebarCollapsed: false }
    })
  }, [queryClient])

  const historyLoading = historyQuery.isLoading || isRedirecting
  const showGatewayDown = Boolean(gatewayStatusError)
  const showGatewayNotice =
    showGatewayDown &&
    gatewayStatusQuery.errorUpdatedAt > gatewayStatusMountRef.current
  const redirectToConnect = shouldRedirectToConnect({
    isRedirecting,
    shouldRedirectToNew,
    sessionsReady: sessionsQuery.isSuccess,
    activeExists,
    sessionsError,
    historyError,
    gatewayStatusError,
  })
  const historyEmpty = !historyLoading && displayMessages.length === 0
  const gatewayNotice = useMemo(() => {
    if (!showGatewayNotice) return null
    if (!gatewayError) return null
    return (
      <GatewayStatusMessage
        state="error"
        error={gatewayError}
        onRetry={handleGatewayRefetch}
      />
    )
  }, [gatewayError, handleGatewayRefetch, showGatewayNotice])

  useChatStream({
    activeFriendlyId,
    isNewChat,
    isRedirecting,
    resolvedSessionKey,
    sessionKeyForHistory,
    queryClient,
    refreshHistory,
    onChatEvent(payload) {
      const payloadSessionKey =
        typeof payload.sessionKey === 'string' ? payload.sessionKey : ''
      if (
        payloadSessionKey &&
        resolvedSessionKey &&
        payloadSessionKey !== resolvedSessionKey &&
        payloadSessionKey !== sessionKeyForHistory
      ) {
        return
      }
      const runId = typeof payload.runId === 'string' ? payload.runId : ''
      const state = typeof payload.state === 'string' ? payload.state : ''
      if (runId && state === 'delta') {
        startRun(runId)
      }
      if (
        runId &&
        (state === 'final' || state === 'error' || state === 'aborted')
      ) {
        finishRun(runId)
      }
      if (
        !runId &&
        (state === 'final' || state === 'error' || state === 'aborted')
      ) {
        finishAllRuns()
      }
    },
  })

  useChatRedirect({
    activeFriendlyId,
    isNewChat,
    isRedirecting,
    shouldRedirectToNew,
    sessionsReady: sessionsQuery.isSuccess,
    sessionKeyForHistory,
    queryClient,
    setIsRedirecting,
  })

  useChatGenerationGuard({
    waitingForResponse,
    refreshHistory,
    setWaitingForResponse,
  })

  useChatPendingSend({
    activeFriendlyId,
    activeSessionKey,
    forcedSessionKey,
    isNewChat,
    queryClient,
    resolvedSessionKey,
    setWaitingForResponse,
    setPinToTop,
    sendMessage,
  })

  const sidebar = (
    <ChatSidebar
      sessions={sessions}
      activeFriendlyId={activeFriendlyId}
      creatingSession={creatingSession}
      onCreateSession={startNewChat}
      isCollapsed={isMobile ? false : isSidebarCollapsed}
      onToggleCollapse={handleToggleSidebarCollapse}
      onSelectSession={handleSelectSession}
      onActiveSessionDelete={handleActiveSessionDelete}
    />
  )

  if (redirectToConnect) {
    return <Navigate to="/connect" replace />
  }

  return (
    <div className="h-screen bg-surface text-primary-900">
      <div
        className={cn(
          'h-full overflow-hidden',
          isMobile ? 'relative' : 'grid grid-cols-[auto_1fr]',
        )}
      >
        {hideUi ? null : isMobile ? (
          <>
            <div
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-[300px] transition-transform duration-200',
                isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
              )}
            >
              {sidebar}
            </div>
          </>
        ) : (
          sidebar
        )}

        <main className="flex flex-col h-full min-h-0" ref={mainRef}>
          <ChatHeader
            activeTitle={activeTitle}
            wrapperRef={headerRef}
            showSidebarButton={isMobile}
            onOpenSidebar={handleOpenSidebar}
            onExport={exportConversation}
            exportDisabled={historyLoading || displayMessages.length === 0}
            showExport={!isNewChat}
            usedTokens={activeSession?.totalTokens}
            maxTokens={activeSession?.contextTokens}
            isNewChat={isNewChat}
            agents={agentsQuery.data?.agents}
            selectedAgentId={currentAgentId}
            onSelectAgent={setSelectedAgentId}
          />

          {hideUi ? null : (
            <>
              <ChatMessageList
                messages={displayMessages}
                loading={historyLoading}
                empty={historyEmpty}
                notice={gatewayNotice}
                noticePosition="end"
                waitingForResponse={waitingForResponse}
                sessionKey={activeCanonicalKey}
                pinToTop={pinToTop}
                pinGroupMinHeight={pinGroupMinHeight}
                headerHeight={headerHeight}
                contentStyle={stableContentStyle}
              />
              <ChatComposer
                onSubmit={send}
                isLoading={sending}
                disabled={sending}
                wrapperRef={composerRef}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
