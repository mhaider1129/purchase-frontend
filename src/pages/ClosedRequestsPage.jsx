// src/pages/ClosedRequestsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import ApprovalTimeline from '../components/ApprovalTimeline';
import useApprovalTimeline from '../hooks/useApprovalTimeline';

const ITEMS_PER_PAGE = 10;

const formatDate = (value, locale) => {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString(locale || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const mapStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 ring-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 ring-red-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
};

const ClosedRequestsPage = () => {
  const { t: translate, i18n } = useTranslation();
  const tr = useMemo(
    () => (key, options) => translate(`closedRequests.${key}`, options),
    [translate]
  );

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [requestType, setRequestType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const {
    expandedApprovalsId,
    approvalsMap,
    loadingApprovalsId,
    toggleApprovals,
    resetApprovals,
  } = useApprovalTimeline();

  const timelineLabels = useMemo(
    () => ({
      title: translate('common.approvalTimeline'),
      loading: translate('common.loadingApprovals'),
      empty: translate('common.noApprovals'),
      columns: {
        level: translate('common.approvalLevel'),
        approver: translate('common.approver'),
        role: translate('common.approverRole'),
        decision: translate('common.approvalDecision'),
        comment: translate('common.approvalComment'),
        date: translate('common.approvalDate'),
      },
    }),
    [translate]
  );

  useEffect(() => {
    const fetchClosed = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/api/requests/closed');
        setRequests(response.data || []);
        resetApprovals();
      } catch (err) {
        console.error('Failed to fetch closed requests:', err);
        setError(tr('errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchClosed();
  }, [resetApprovals, tr]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, requestType, statusFilter, sortOrder, requests.length]);

  const statusCounts = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        const key = (req.status || '').toLowerCase();
        if (!key) {
          return acc;
        }

        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );
  }, [requests]);

  const statusCards = useMemo(() => {
    const entries = Object.entries(statusCounts).map(([status, count]) => ({
      key: status,
      label: translate(`closedRequests.statuses.${status}`, {
        defaultValue: status ? status.charAt(0).toUpperCase() + status.slice(1) : status,
      }),
      count,
    }));

    entries.sort((a, b) => b.count - a.count);

    return [
      {
        key: 'total',
        label: tr('cards.total'),
        count: requests.length,
        isTotal: true,
      },
      ...entries,
    ];
  }, [statusCounts, requests.length, tr, translate]);

  const uniqueTypes = useMemo(() => {
    return Array.from(
      new Set(requests.map((req) => req.request_type).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const normalizedLocale = useMemo(() => {
    return i18n.language?.startsWith('ar') ? 'ar' : undefined;
  }, [i18n.language]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const normalizedStatus = statusFilter === 'all' ? '' : statusFilter.toLowerCase();
    const normalizedType = requestType === 'all' ? '' : requestType.toLowerCase();

    return requests.filter((req) => {
      const status = (req.status || '').toLowerCase();
      const type = (req.request_type || '').toLowerCase();
      const matchesStatus = !normalizedStatus || status === normalizedStatus;
      const matchesType = !normalizedType || type === normalizedType;

      const matchesSearch =
        !term ||
        [
          req.request_type,
          req.justification,
          req.status,
          req.assigned_user_name,
          req.project_name,
          req.id,
        ]
          .filter((value) => value !== undefined && value !== null)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, search, statusFilter, requestType]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const first = new Date(a.updated_at || a.created_at || 0).getTime();
      const second = new Date(b.updated_at || b.created_at || 0).getTime();

      return sortOrder === 'newest' ? second - first : first - second;
    });
  }, [filtered, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const exportCSV = () => {
    const rows = [
      [
        tr('table.id'),
        tr('table.type'),
        tr('table.project'),
        tr('table.status'),
        tr('table.assigned'),
        tr('table.updated'),
      ],
      ...sorted.map((req) => [
        req.id,
        req.request_type,
        req.project_name || tr('notAvailable'),
        req.status,
        req.assigned_user_name || tr('notAvailable'),
        formatDate(req.updated_at || req.created_at, normalizedLocale),
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${tr('csvFileName')}.csv`);
  };

  const handleStatusCardClick = (value) => {
    if (value === 'total') {
      return;
    }

    setStatusFilter((prev) => (prev === value ? 'all' : value));
  };

  const handleClearFilters = () => {
    setSearch('');
    setRequestType('all');
    setStatusFilter('all');
    setSortOrder('newest');
    resetApprovals();
  };

  const renderApprovalButtonText = (requestId) =>
    expandedApprovalsId === requestId
      ? translate('common.hideApprovals')
      : translate('common.viewApprovals');

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {tr('title')}
          </h1>
          <button
            type="button"
            onClick={exportCSV}
            disabled={sorted.length === 0}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {tr('exportCSV')}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusCards.map(({ key, label, count, isTotal }) => {
            const isActive = !isTotal && statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusCardClick(key)}
                disabled={isTotal}
                className={`group rounded-xl border p-4 text-start shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isTotal
                    ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 cursor-default'
                    : isActive
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                    : 'border-gray-200 bg-white hover:border-blue-400 dark:border-gray-700 dark:bg-gray-800'
                } ${isTotal ? '' : 'disabled:cursor-not-allowed'}`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {count}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {tr('searchLabel')}
            </label>
            <input
              type="search"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              placeholder={tr('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {tr('filters.type')}
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
            >
              <option value="all">{tr('filters.allTypes')}</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {tr('filters.status')}
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{tr('filters.allStatuses')}</option>
              {statusCards
                .filter(({ isTotal }) => !isTotal)
                .map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {tr('filters.sort')}
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">{tr('sort.newest')}</option>
              <option value="oldest">{tr('sort.oldest')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="md:self-start inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {tr('filters.clear')}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-300">{tr('loading')}</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-300">{tr('emptyState')}</p>
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 shadow-sm dark:border-gray-700 md:block">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.id')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.type')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.project')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.status')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.assigned')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.submitted')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.updated')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {tr('table.approvals')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginated.map((req) => {
                    const normalizedStatus = (req.status || '').toLowerCase();
                    const statusLabel = translate(`closedRequests.statuses.${normalizedStatus}`, {
                      defaultValue:
                        normalizedStatus.length > 0
                          ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
                          : tr('notAvailable'),
                    });

                    return (
                      <React.Fragment key={req.id}>
                        <tr className="bg-white dark:bg-gray-900">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                            #{req.id}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {req.request_type || tr('notAvailable')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {req.project_name || tr('notAvailable')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${mapStatusColor(
                                normalizedStatus
                              )}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {req.assigned_user_name || tr('notAvailable')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {formatDate(req.created_at, normalizedLocale)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {formatDate(req.updated_at, normalizedLocale)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            <button
                              type="button"
                              onClick={() => toggleApprovals(req.id)}
                              disabled={loadingApprovalsId === req.id}
                              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              {renderApprovalButtonText(req.id)}
                            </button>
                          </td>
                        </tr>
                        {expandedApprovalsId === req.id && (
                          <tr>
                            <td colSpan={8} className="bg-gray-50 px-4 py-4 dark:bg-gray-800">
                              <ApprovalTimeline
                                approvals={approvalsMap[req.id]}
                                isLoading={loadingApprovalsId === req.id}
                                labels={timelineLabels}
                                formatDate={(value) => formatDate(value, normalizedLocale)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {paginated.map((req) => {
                const normalizedStatus = (req.status || '').toLowerCase();
                const statusLabel = translate(`closedRequests.statuses.${normalizedStatus}`, {
                  defaultValue:
                    normalizedStatus.length > 0
                      ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
                      : tr('notAvailable'),
                });

                return (
                  <article
                    key={`card-${req.id}`}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {tr('table.id')} #{req.id}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {req.request_type || tr('notAvailable')}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {tr('table.project')}: {req.project_name || tr('notAvailable')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${mapStatusColor(
                          normalizedStatus
                        )}`}
                      >
                        {statusLabel}
                      </span>
                    </header>

                    <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {req.assigned_user_name && (
                        <div className="flex justify-between gap-3">
                          <dt className="font-medium">{tr('table.assigned')}</dt>
                          <dd className="text-right">{req.assigned_user_name}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="font-medium">{tr('table.submitted')}</dt>
                        <dd className="text-right">{formatDate(req.created_at, normalizedLocale)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-medium">{tr('table.updated')}</dt>
                        <dd className="text-right">{formatDate(req.updated_at, normalizedLocale)}</dd>
                      </div>
                    </dl>

                    {req.justification && (
                      <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <p className="font-medium">{tr('table.justification')}</p>
                        <p className="mt-1 whitespace-pre-line">{req.justification}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleApprovals(req.id)}
                        disabled={loadingApprovalsId === req.id}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {renderApprovalButtonText(req.id)}
                      </button>
                    </div>

                    {expandedApprovalsId === req.id && (
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                        <ApprovalTimeline
                          approvals={approvalsMap[req.id]}
                          isLoading={loadingApprovalsId === req.id}
                          labels={timelineLabels}
                          formatDate={(value) => formatDate(value, normalizedLocale)}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 md:flex-row">
              <span>{translate('common.pageOf', { current: currentPage, total: totalPages })}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {translate('common.prev')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {translate('common.next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ClosedRequestsPage;