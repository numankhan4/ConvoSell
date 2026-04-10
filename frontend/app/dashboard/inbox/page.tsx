'use client';

import { useEffect, useState, useRef } from 'react';
import { crmApi, whatsappApi } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const { role } = usePermissions();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New Message Modal State
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);

  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    // Scroll instantly on initial load, smooth for updates
    const isInitialLoad = messages.length > 0;
    scrollToBottom(false); // Always instant scroll
  }, [messages]);

  useEffect(() => {
    loadConversations();
    
    // Poll conversations at a moderate interval and only on visible tab.
    conversationsPollingRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadConversations();
    }, 10000);

    return () => {
      if (conversationsPollingRef.current) {
        clearInterval(conversationsPollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll selected conversation messages, but avoid background-tab traffic.
    if (selectedConversation) {
      pollingIntervalRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        loadMessages(selectedConversation.id, true);
      }, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await crmApi.getConversations();
      setConversations(response.data.data);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, silent = false) => {
    try {
      const response = await crmApi.getConversation(conversationId);
      if (!silent) {
        setSelectedConversation(response.data);
      } else {
        // Update only if it's the currently selected conversation
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(response.data);
        }
      }
      const loadedMessages = response.data.messages || [];

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    const messageToSend = messageText.trim();
    const currentMessages = [...messages]; // Backup for error revert
    
    setSending(true);
    
    // Clear input immediately for better UX
    setMessageText('');
    
    try {
      // Send message via WhatsApp API
      const result = await whatsappApi.sendMessage(
        selectedConversation.contact.whatsappPhone,
        messageToSend
      );

      // Add optimistic message immediately - polling will replace it with real data
      const optimisticMessage = {
        id: result.data?.messageId || `temp-${Date.now()}`,
        content: messageToSend,
        direction: 'outbound',
        status: 'sent',
        createdAt: new Date().toISOString(),
        whatsappMessageId: result.data?.messageId,
      };
      setMessages([...currentMessages, optimisticMessage]);

      // Show success feedback
      toast.success('Message sent successfully! ✓', {
        duration: 3000,
      });

      // Reload conversations list to update the preview
      loadConversations();
      
      // Force immediate message reload after short delay
      setTimeout(async () => {
        // Pause polling briefly
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        
        // Reload messages
        await loadMessages(selectedConversation.id, true);
        
        // Resume polling
        pollingIntervalRef.current = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return;
          loadMessages(selectedConversation.id, true);
        }, 5000);
      }, 1000);
      
    } catch (error: any) {
      // Revert optimistic update on error
      setMessages(currentMessages);
      setMessageText(messageToSend); // Restore the message text
      
      console.error('Failed to send message', error);
      
      // Extract error message from API response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to send message';
      
      // Show error with proper formatting
      if (errorMessage.includes('📱')) {
        // Multi-line error with instructions - show as custom toast
        toast.error(
          (t) => (
            <div className="space-y-2">
              <div className="font-semibold text-red-900">WhatsApp Development Mode Restriction</div>
              <div className="text-sm text-slate-700 whitespace-pre-line max-h-[300px] overflow-y-auto">
                {errorMessage}
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          ),
          {
            duration: 15000,
            style: {
              maxWidth: '600px',
              padding: '16px',
            },
          }
        );
      } else {
        // Simple error message
        const additionalHelp = errorMessage.includes('WhatsApp not connected') 
          ? 'Please configure WhatsApp integration in Settings first.' 
          : 'Please try again or check Settings.';
        
        toast.error(
          <div className="space-y-1">
            <div className="font-medium">{errorMessage}</div>
            <div className="text-xs text-slate-600">{additionalHelp}</div>
          </div>,
          { duration: 6000 }
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Load contacts for new message modal
  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await crmApi.getContacts();
      setContacts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load contacts', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Open new message modal
  const openNewMessageModal = () => {
    setShowNewMessageModal(true);
    setSelectedContact(null);
    setNewMessageText('');
    setContactSearchQuery('');
    loadContacts();
  };

  // Close new message modal
  const closeNewMessageModal = () => {
    setShowNewMessageModal(false);
    setSelectedContact(null);
    setNewMessageText('');
    setContactSearchQuery('');
  };

  // Send new message
  const handleSendNewMessage = async () => {
    if (!selectedContact || !newMessageText.trim() || sendingNewMessage) return;

    // Validate WhatsApp phone number
    if (!selectedContact.whatsappPhone) {
      toast.error('Contact does not have a WhatsApp phone number');
      return;
    }

    setSendingNewMessage(true);
    
    try {
      await whatsappApi.sendMessage(
        selectedContact.whatsappPhone,
        newMessageText.trim()
      );

      toast.success('Message sent successfully! ✓');
      
      // Close modal first
      closeNewMessageModal();
      
      // Reload conversations to show the new conversation
      await loadConversations();
      
      // Wait for state to update and then find the conversation
      setTimeout(async () => {
        try {
          const response = await crmApi.getConversations();
          const newConv = response.data.data.find(
            (conv: any) => conv.contact?.whatsappPhone === selectedContact.whatsappPhone
          );
          if (newConv) {
            await loadMessages(newConv.id);
          }
        } catch (error) {
          console.error('Failed to load conversation', error);
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Failed to send message', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to send message';
      
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setSendingNewMessage(false);
    }
  };

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    // Only show contacts with WhatsApp phone numbers
    if (!contact.whatsappPhone) return false;
    
    if (!contactSearchQuery) return true;
    const query = contactSearchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.whatsappPhone?.includes(query) ||
      contact.phone?.includes(query)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Inbox</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              role === 'owner' ? 'bg-purple-100 text-purple-800' :
              role === 'admin' ? 'bg-blue-100 text-blue-800' :
              role === 'manager' ? 'bg-green-100 text-green-800' :
              role === 'agent' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {role}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-600">Manage your WhatsApp conversations</p>
        </div>
        <PermissionGate permission={Permissions.CONVERSATIONS_SEND}>
          <button 
            onClick={openNewMessageModal}
            className="px-4 py-2 sm:px-4 sm:py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Message</span>
          </button>
        </PermissionGate>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)] lg:h-[calc(100vh-16rem)]">
        {/* Conversations list - Hidden on mobile when conversation selected */}
        <div className={`
          ${selectedConversation ?'hidden lg:block' : 'block'}
          lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col
        `}>
          {/* Search */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                <p className="mt-3 text-sm text-slate-500">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-slate-600 font-medium">No conversations yet</p>
                <p className="text-sm text-slate-500 mt-1">Start messaging your customers</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {conv.contact?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-900 truncate">{conv.contact?.name || 'Unknown'}</p>
                        <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{conv.lastMessagePreview}</p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-block bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full mt-1">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel - Full screen on mobile when conversation selected */}
        <div className={`
          ${selectedConversation ? 'block' : 'hidden lg:block'}
          lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    {/* Back button - Mobile only */}
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                      {selectedConversation.contact?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {selectedConversation.contact?.name || 'Unknown Contact'}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 truncate">
                        {selectedConversation.contact?.whatsappPhone}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Re-engagement Warning Banner */}
              {(() => {
                // Find the most recent re-engagement error message
                const reengagementFailure = messages
                  .filter((m: any) => m.status === 'failed' && (m.errorCode === '131047' || m.errorMessage?.includes('Re-engagement')))
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                
                // If there's a re-engagement failure, check if customer has sent a message after it
                if (reengagementFailure) {
                  const failureTime = new Date(reengagementFailure.createdAt).getTime();
                  const hasCustomerMessageAfter = messages.some((m: any) => 
                    m.direction === 'inbound' && 
                    new Date(m.createdAt).getTime() > failureTime
                  );
                  
                  // Only show banner if no customer message after the failure
                  return !hasCustomerMessageAfter;
                }
                
                return false;
              })() && (
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">24-Hour Messaging Window Expired</p>
                      <p className="text-xs text-amber-800 mt-1">
                        You can't send regular messages after 24 hours of customer's last message. Wait for them to message you first or use approved WhatsApp message templates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-slate-50 bg-opacity-50">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 mt-8">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm sm:text-base">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm ${
                          msg.direction === 'outbound'
                            ? msg.status === 'failed' 
                              ? 'bg-red-500 text-white rounded-tr-sm'
                              : 'bg-primary-500 text-white rounded-tr-sm'
                            : 'bg-white text-slate-900 rounded-tl-sm border border-slate-200'
                        }`}
                      >
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.status === 'failed' && msg.errorMessage && (
                          <div className="text-xs mt-2 bg-red-600 bg-opacity-50 px-2 py-1 rounded">
                            <p className="font-semibold">⚠️ Message Failed</p>
                            <p className="mt-0.5">{msg.errorMessage}</p>
                            {(msg.errorCode === '131047' || msg.errorMessage?.includes('Re-engagement')) && (
                              <p className="mt-1 text-[10px] opacity-90">
                                💡 Can't send after 24h. Customer must message you first or use approved templates.
                              </p>
                            )}
                          </div>
                        )}
                        <div className={`flex items-center justify-end space-x-1 mt-1 ${
                          msg.direction === 'outbound' 
                            ? msg.status === 'failed' ? 'text-red-100' : 'text-primary-100' 
                            : 'text-slate-500'
                        }`}>
                          <span className="text-xs">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.direction === 'outbound' && (
                            <>
                              {msg.status === 'read' ? (
                                // Blue double checkmarks (read)
                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M12.354 4.354a.5.5 0 00-.708-.708L5 10.293 2.854 8.146a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l7-7z"/>
                                  <path d="M6.25 8.043l-.896-.897a.5.5 0 10-.708.708l.897.896.707-.707zm1 2.414l.896.897a.5.5 0 00.708 0l7-7a.5.5 0 00-.708-.708L9 9.793l-.543-.543-.707.707z"/>
                                </svg>
                              ) : msg.status === 'delivered' ? (
                                // Gray double checkmarks (delivered)
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M12.354 4.354a.5.5 0 00-.708-.708L5 10.293 2.854 8.146a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l7-7z"/>
                                  <path d="M6.25 8.043l-.896-.897a.5.5 0 10-.708.708l.897.896.707-.707zm1 2.414l.896.897a.5.5 0 00.708 0l7-7a.5.5 0 00-.708-.708L9 9.793l-.543-.543-.707.707z"/>
                                </svg>
                              ) : msg.status === 'sent' ? (
                                // Gray single checkmark (sent)
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M12.354 4.354a.5.5 0 00-.708-.708L5 10.293 2.854 8.146a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l7-7z"/>
                                </svg>
                              ) : msg.status === 'failed' ? (
                                // Red X icon (failed)
                                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                                </svg>
                              ) : (
                                // Clock icon (pending/sending/null)
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                                </svg>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Touch-friendly for mobile */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
                <div className="flex items-end space-x-2 sm:space-x-3">
                  <button className="p-2 sm:p-2.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <textarea
                    placeholder="Type a message..."
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <PermissionGate 
                    permission={Permissions.CONVERSATIONS_SEND}
                    fallback={
                      <div className="px-4 sm:px-5 py-3 bg-gray-200 text-gray-600 rounded-xl flex-shrink-0 flex items-center space-x-1.5 sm:space-x-2 min-h-[44px] cursor-not-allowed">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="font-medium text-sm sm:text-base hidden sm:inline">Read Only</span>
                      </div>
                    }
                  >
                    <button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="px-4 sm:px-5 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-xl transition-colors flex-shrink-0 flex items-center space-x-1.5 sm:space-x-2 shadow-sm hover:shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none min-h-[44px]"
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin h-4 h-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="font-medium text-sm sm:text-base hidden sm:inline">Sending...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-sm sm:text-base hidden sm:inline">Send</span>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </>
                      )}
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-4 sm:p-6 lg:p-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Select a conversation</h3>
              <p className="text-xs sm:text-sm text-slate-500 text-center max-w-sm px-4">
                Choose a conversation from the list to view messages and start chatting with your customers
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">New Message</h2>
              <button
                onClick={closeNewMessageModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Contact Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Contact
                </label>
                
                {/* Search Contacts */}
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search contacts by name, phone, or email..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Contacts List */}
                <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                  {loadingContacts ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                      <p className="mt-3 text-sm text-slate-500">Loading contacts...</p>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="font-medium text-slate-600">
                        {contactSearchQuery ? 'No contacts found' : contacts.length > 0 ? 'No contacts with WhatsApp numbers' : 'No contacts available'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {contactSearchQuery ? 'Try different search terms' : contacts.length > 0 ? 'Add WhatsApp phone numbers to your contacts' : 'Add contacts from the Contacts page'}
                      </p>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {contact.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{contact.name || 'Unknown'}</p>
                            <p className="text-sm text-slate-600 truncate">{contact.whatsappPhone || contact.phone}</p>
                            {contact.email && (
                              <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                            )}
                          </div>
                          {selectedContact?.id === contact.id && (
                            <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Type your message..."
                  rows={6}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  disabled={sendingNewMessage}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {newMessageText.length} characters
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                onClick={closeNewMessageModal}
                disabled={sendingNewMessage}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessage}
                disabled={!selectedContact || !selectedContact.whatsappPhone || !newMessageText.trim() || sendingNewMessage}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {sendingNewMessage ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
