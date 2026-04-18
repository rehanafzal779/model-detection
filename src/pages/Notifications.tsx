import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Search,
  RefreshCw,
  CheckCircle2,
  Circle,
  Trash2,
  User,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
  Users,
  Database,
  Eye,
  MoreVertical,
  CheckCheck,
  Inbox,
  ArrowLeft,
  Filter,
  Download,
  Zap,
  CheckSquare,
  Calendar,
  Square
} from 'lucide-react';
import notificationService, { Notification, NotificationFilters } from '../services/notificationService';

// ============================================
// TYPES
// ============================================
interface NotificationsPageProps {
  onBack?: () => void;
  onNotificationRead?: () => void;
}

type RecipientTypeFilter = 'all' | 'worker' | 'citizen' | 'admin';
type ReadStatusFilter = 'all' | 'read' | 'unread';

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now. getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function parseNotificationMessage(message: string): { title: string; body: string } {
  const match = message.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { title: match[1], body:  match[2] };
  }
  return { title: 'Notification', body: message };
}

function getRecipientTypeColor(type: string): string {
  switch (type) {
    case 'worker': 
      return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
    case 'citizen':  
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case 'admin': 
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    default:  
      return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
  }
}

function getRecipientTypeIcon(type: string) {
  switch (type) {
    case 'worker': 
      return <User className="w-4 h-4" />;
    case 'citizen': 
      return <Users className="w-4 h-4" />;
    case 'admin':  
      return <Database className="w-4 h-4" />;
    default: 
      return <User className="w-4 h-4" />;
  }
}

// ============================================
// NOTIFICATION CARD COMPONENT
// ============================================
interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onSelect: (id:  number) => void;
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  isSelected,
  onSelect,
}: NotificationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { title, body } = parseNotificationMessage(notification. message);

  return (
    <div
      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 group ${
        isSelected 
          ? 'ring-2 ring-emerald-500 border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 to-slate-900/40' 
          : notification.is_read
            ? 'border-slate-700/40 bg-gradient-to-br from-slate-800/20 to-slate-900/40 hover:border-slate-600/60 hover:bg-slate-800/40'
            : 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/8 via-slate-800/40 to-slate-900/40 hover:border-emerald-500/70 hover:shadow-lg hover:shadow-emerald-500/10'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Selection Checkbox */}
        <button
          onClick={() => onSelect(notification.notification_id)}
          className="mt-1.5 flex-shrink-0 transition-all transform hover:scale-110"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-emerald-400 drop-shadow-lg" />
          ) : (
            <Circle className={`w-5 h-5 transition-colors ${notification.is_read ? 'text-slate-600 group-hover:text-slate-500' : 'text-slate-700 group-hover:text-slate-600'}`} />
          )}
        </button>

        {/* Notification Type Icon */}
        <div className="flex-shrink-0 mt-1.5 p-2.5 rounded-lg bg-opacity-30" style={{
          backgroundColor: notification.recipient_type === 'worker' ? 'rgba(16, 185, 129, 0.1)' :
                          notification.recipient_type === 'citizen' ? 'rgba(59, 130, 246, 0.1)' :
                          'rgba(147, 51, 234, 0.1)'
        }}>
          <div className="flex items-center justify-center">
            {getRecipientTypeIcon(notification.recipient_type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {/* Title, Badge & Status */}
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <h3 className={`font-semibold text-sm leading-tight ${
                  notification.is_read ? 'text-slate-400' : 'text-white'
                }`}>
                  {title}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-1.5 leading-tight ${getRecipientTypeColor(notification. recipient_type)}`}>
                    {notification.recipient_type}
                  </span>
                  {!notification.is_read && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      New
                    </span>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <p className={`text-sm leading-relaxed line-clamp-2 ${
                notification.is_read ? 'text-slate-500' : 'text-slate-200'
              }`}>
                {body}
              </p>

              {/* Meta Info - Compact */}
              <div className="flex items-center gap-5 mt-2.5 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5 hover:text-slate-400 transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimeAgo(notification.created_at)}
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-400 transition-colors">
                  <User className="w-3.5 h-3.5" />
                  ID: {notification.recipient_id}
                </span>
              </div>
            </div>

            {/* Actions Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all border border-transparent hover:border-slate-600/50"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-slate-800/95 backdrop-blur-sm border border-slate-700/60 rounded-xl shadow-2xl shadow-slate-950/50 z-20 py-1.5 overflow-hidden">
                    {! notification.is_read && (
                      <button
                        onClick={() => {
                          onMarkAsRead(notification.notification_id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-3 transition-colors border-b border-slate-700/30"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete(notification. notification_id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS CARD COMPONENT
// ============================================
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border-2 border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-slate-600/60 transition-all duration-300 group hover:shadow-lg hover:shadow-slate-950/40`}>
      <div className="relative z-10 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-black text-white tracking-tight transition-colors group-hover:text-emerald-400">{value}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/0 via-transparent to-slate-400/0 group-hover:to-slate-400/5 transition-all" />
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-slate-950/40 border border-slate-700/50 group hover:border-slate-600 transition-all">
        <Inbox className="w-10 h-10 text-slate-600 group-hover:text-slate-500 transition-colors" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">No Notifications</h3>
      <p className="text-sm font-medium text-slate-400 max-w-md leading-relaxed">{message}</p>
      <svg className="w-40 h-40 mt-8 opacity-10" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================
function NotificationSkeleton() {
  return (
    <div className="p-4 rounded-2xl border-2 border-slate-700/30 bg-gradient-to-br from-slate-800/30 to-slate-900/30 animate-pulse backdrop-blur-sm">
      <div className="flex items-start gap-3.5">
        <div className="w-5 h-5 bg-slate-700/40 rounded-full flex-shrink-0 mt-1.5" />
        <div className="w-5 h-5 bg-slate-700/40 rounded-lg flex-shrink-0 mt-1.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 bg-slate-700/40 rounded-lg w-40" />
            <div className="h-6 bg-slate-700/40 rounded-lg w-20" />
          </div>
          <div className="h-4 bg-slate-700/40 rounded-lg w-2/3" />
          <div className="flex items-center gap-5">
            <div className="h-3 bg-slate-700/40 rounded w-24" />
            <div className="h-3 bg-slate-700/40 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN NOTIFICATIONS PAGE
// ============================================
export function Notifications({ onBack, onNotificationRead }: NotificationsPageProps) {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<RecipientTypeFilter>('all');
  const [readStatusFilter, setReadStatusFilter] = useState<ReadStatusFilter>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Stats
  const [stats, setStats] = useState({
    total:  0,
    unread:  0,
    workers: 0,
    citizens: 0,
  });

  // ============================================
  // FETCH NOTIFICATIONS
  // ============================================
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const filters: NotificationFilters = {};

      if (recipientTypeFilter !== 'all') {
        filters.recipient_type = recipientTypeFilter;
      }
      if (readStatusFilter !== 'all') {
        filters.is_read = readStatusFilter === 'read';
      }

      const response = await notificationService. getNotifications(filters);
      setNotifications(response.data || []);

      // Calculate stats
      const allNotifications = response.data || [];
      setStats({
        total: allNotifications.length,
        unread: allNotifications. filter(n => !n.is_read).length,
        workers: allNotifications.filter(n => n.recipient_type === 'worker').length,
        citizens: allNotifications.filter(n => n.recipient_type === 'citizen').length,
      });
    } catch (err:  any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientTypeFilter, readStatusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  // ============================================
  // FILTER NOTIFICATIONS
  // ============================================
  const filteredNotifications = useMemo(() => {
    let filtered = [... notifications];

    // Search filter
    if (searchQuery. trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.message.toLowerCase().includes(query) ||
        n.recipient_id.toString().includes(query) ||
        n.recipient_type.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return filtered;
  }, [notifications, searchQuery]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead([id]);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === id ? { ...n, is_read: true } :  n
        )
      );
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      onNotificationRead?. ();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const ids = Array.from(selectedIds);
      await notificationService.markAsRead(ids);
      setNotifications(prev =>
        prev. map(n =>
          selectedIds.has(n.notification_id) ? { ...n, is_read: true } : n
        )
      );
      const unreadCount = notifications.filter(
        n => selectedIds.has(n.notification_id) && !n.is_read
      ).length;
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - unreadCount) }));
      setSelectedIds(new Set());
      onNotificationRead?.();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (id: number) => {
    if (! confirm('Are you sure you want to delete this notification?')) return;

    try {
      await notificationService.deleteNotification(id);
      const deleted = notifications.find(n => n.notification_id === id);
      setNotifications(prev => prev.filter(n => n. notification_id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        unread: deleted && !deleted.is_read ? prev.unread - 1 : prev.unread,
      }));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (! confirm(`Are you sure you want to delete ${selectedIds.size} notifications?`)) return;

    try {
      const ids = Array.from(selectedIds);
      await notificationService. deleteNotifications(ids);
      const deletedUnread = notifications.filter(
        n => selectedIds.has(n. notification_id) && !n.is_read
      ).length;
      setNotifications(prev => prev.filter(n => ! selectedIds.has(n.notification_id)));
      setStats(prev => ({
        ...prev,
        total: prev.total - ids.length,
        unread: prev.unread - deletedUnread,
      }));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.message || 'Failed to delete notifications');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.notification_id)));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRecipientTypeFilter('all');
    setReadStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || recipientTypeFilter !== 'all' || readStatusFilter !== 'all';

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen space-y-6">
      {/* 🎯 PROFESSIONAL HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl p-7 shadow-lg shadow-slate-950/40 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Back Button */}
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-slate-800 rounded-xl transition-all duration-200 border border-slate-700/60 hover:border-slate-600 group flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            )}
            
            {/* Icon Badge */}
            <div className="p-3 bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-500/10 flex-shrink-0">
              <Bell className="w-6 h-6 text-emerald-400" />
            </div>
            
            {/* Header Content */}
            <div className="min-w-0">
              <h1 className="text-3xl font-black text-white tracking-tight">
                Notifications
              </h1>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                System Alerts & Updates
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 hover:from-emerald-500/25 hover:to-emerald-600/20 border border-emerald-500/50 hover:border-emerald-500/70 rounded-xl text-emerald-400 hover:text-emerald-300 transition-all duration-200 font-semibold text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex-shrink-0 group"
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid - Professional Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<Bell className="w-5 h-5 text-emerald-400" />}
          label="Total Notifications"
          value={stats.total}
          color="bg-emerald-500/20"
        />
        <StatsCard
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          label="Unread Messages"
          value={stats.unread}
          color="bg-yellow-500/20"
        />
        <StatsCard
          icon={<User className="w-5 h-5 text-blue-400" />}
          label="Worker Updates"
          value={stats.workers}
          color="bg-blue-500/20"
        />
        <StatsCard
          icon={<Users className="w-5 h-5 text-purple-400" />}
          label="Citizen Messages"
          value={stats.citizens}
          color="bg-purple-500/20"
        />
      </div>

      {/* Filters & Search - Professional Card */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/50 border-2 border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-slate-950/20 backdrop-blur-sm">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword, ID..."
              className="w-full pl-12 pr-5 py-3.5 bg-slate-800/40 hover:bg-slate-800/60 border-2 border-slate-700/50 hover:border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500 hidden sm:block flex-shrink-0" />
            
            {/* Recipient Type Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={recipientTypeFilter}
                onChange={(e) => setRecipientTypeFilter(e.target.value as RecipientTypeFilter)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 border-2 border-slate-700/50 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-all font-medium text-sm"
              >
                <option value="all">All Types</option>
                <option value="worker">Workers</option>
                <option value="citizen">Citizens</option>
                <option value="admin">Admins</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Read Status Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={readStatusFilter}
                onChange={(e) => setReadStatusFilter(e.target. value as ReadStatusFilter)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 border-2 border-slate-700/50 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all font-medium text-sm"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600 font-medium text-sm"
                title="Clear all filters"
              >
                <X className="w-4 h-4 inline mr-2" />
                Clear
              </button>
            )}
          </div>

          {/* Bulk Actions - Premium */}
          {selectedIds.size > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t-2 border-slate-700/40">
              <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/30 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleMarkSelectedAsRead}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60 rounded-lg transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                Mark as Read
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/60 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm font-semibold text-slate-400 hover:text-white transition-colors ml-auto"
              >
                Deselect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Select All Toolbar - Professional */}
      {! loading && filteredNotifications.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 backdrop-blur-sm">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors group"
          >
            {selectedIds.size === filteredNotifications.length ? (
              <CheckSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-500 transition-colors" />
            )}
            Select All ({filteredNotifications.length})
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Showing <span className="text-white">{filteredNotifications.length}</span> of <span className="text-white">{stats.total}</span> notifications
          </span>
        </div>
      )}

      {/* Error State - Professional */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/15 to-red-600/10 border-2 border-red-500/40 rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-red-500/10 backdrop-blur-sm">
          <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-300 font-semibold mb-1">Failed to Load Notifications</h3>
            <p className="text-red-200/80 text-sm mb-3">{error}</p>
            <button
              onClick={() => fetchNotifications()}
              className="text-sm font-bold text-red-400 hover:text-red-300 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all border border-red-500/40 hover:border-red-500/60"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State - Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Notifications List - Professional Layout */}
      {! loading && ! error && (
        <>
          {filteredNotifications.length > 0 ? (
            <div className="space-y-2.5">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.notification_id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  isSelected={selectedIds.has(notification.notification_id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No notifications match your search or filters. Try adjusting your criteria.'
                  : 'No notifications yet. When new alerts arrive, they will appear here.'
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export default Notifications;