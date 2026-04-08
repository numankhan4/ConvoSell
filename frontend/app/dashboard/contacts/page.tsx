'use client';

import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import ExportConfirmModal from '@/components/ExportConfirmModal';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ContactsPage() {
  const { role } = usePermissions();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<'csv' | 'json' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    whatsappPhone: '',
    phone: '',
  });

  useEffect(() => {
    loadContacts();
  }, [searchQuery]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await crmApi.getContacts({ search: searchQuery || undefined });
      setContacts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load contacts', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadContactDetails = async (contactId: string) => {
    setLoadingDetails(true);
    try {
      const response = await crmApi.getContact(contactId);
      setSelectedContact(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load contact details', error);
      toast.error('Failed to load contact details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedContact(null);
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setNewContact({
      name: '',
      email: '',
      whatsappPhone: '',
      phone: '',
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewContact({
      name: '',
      email: '',
      whatsappPhone: '',
      phone: '',
    });
  };

  const handleAddContact = async () => {
    // Validate required fields
    if (!newContact.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!newContact.whatsappPhone && !newContact.email && !newContact.phone) {
      toast.error('At least one contact method (WhatsApp, Email, or Phone) is required');
      return;
    }

    // Validate WhatsApp phone format if provided
    if (newContact.whatsappPhone) {
      const whatsappPhone = newContact.whatsappPhone.trim();
      if (!whatsappPhone.match(/^\+?[1-9]\d{1,14}$/)) {
        toast.error('WhatsApp number must be in international format (e.g., +923001234567)');
        return;
      }
    }

    setAddingContact(true);

    try {
      await crmApi.createContact({
        name: newContact.name.trim(),
        email: newContact.email.trim() || undefined,
        whatsappPhone: newContact.whatsappPhone.trim() || undefined,
        phone: newContact.phone.trim() || undefined,
      });

      toast.success('Contact added successfully! ✓');
      closeAddModal();
      loadContacts(); // Reload the list
    } catch (error: any) {
      console.error('Failed to create contact', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to create contact';
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setAddingContact(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A';
    // Format international number like +92 300 1234567 to a readable format
    if (phone.startsWith('+')) {
      return phone.replace(/(\+\d{1,3})(\d{3})(\d+)/, '$1 $2 $3');
    }
    return phone;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportContacts = async (format: 'csv' | 'json') => {
    try {
      setExporting(format);
      const response = await crmApi.exportContacts(format);
      const exportBlob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
          });

      const timestamp = new Date().toISOString().slice(0, 10);
      downloadBlob(exportBlob, `contacts-export-${timestamp}.${format}`);
      toast.success(`Contacts exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to export contacts as ${format.toUpperCase()}`;
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  const requestExportContacts = (format: 'csv' | 'json') => {
    setPendingExportFormat(format);
  };

  const confirmExportContacts = async () => {
    if (!pendingExportFormat) return;
    await handleExportContacts(pendingExportFormat);
    setPendingExportFormat(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contacts</h1>
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
          <p className="text-sm sm:text-base text-slate-600">
            Manage your customer database
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <PermissionGate permission={Permissions.CONTACTS_EXPORT}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => requestExportContacts('csv')}
                disabled={exporting !== null}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => requestExportContacts('json')}
                disabled={exporting !== null}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </PermissionGate>
          <PermissionGate permission={Permissions.CONTACTS_CREATE}>
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Contact</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      <ExportConfirmModal
        open={pendingExportFormat !== null}
        resourceLabel="Contacts"
        format={pendingExportFormat || 'csv'}
        loading={exporting !== null}
        onCancel={() => setPendingExportFormat(null)}
        onConfirm={confirmExportContacts}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Contacts</p>
              <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">With WhatsApp</p>
              <p className="text-2xl font-bold text-slate-900">
                {contacts.filter(c => c.whatsappPhone).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">
                {contacts.reduce((sum, c) => sum + (c.totalOrders || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search contacts by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-500">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-600 font-medium">No contacts found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Contacts will appear here when customers message you'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    WhatsApp
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Orders
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                    Total Spent
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                    Last Contact
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => loadContactDetails(contact.id)}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {contact.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {contact.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-slate-600 truncate">
                            {contact.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center space-x-2">
                        {contact.whatsappPhone ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-slate-900">{formatPhone(contact.whatsappPhone)}</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">Not set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-900 font-medium">
                        {contact.totalOrders || 0}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(contact.totalSpent || 0)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 hidden lg:table-cell">
                      {contact.lastContactAt ? formatDate(contact.lastContactAt) : 'Never'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadContactDetails(contact.id);
                        }}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {showDetailsModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedContact.name || 'Unknown Contact'}</h2>
                  <p className="text-sm text-slate-600">{selectedContact.email || 'No email'}</p>
                </div>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <div>
                      <p className="text-xs text-slate-600">WhatsApp</p>
                      <p className="font-medium text-slate-900">
                        {selectedContact.whatsappPhone ? formatPhone(selectedContact.whatsappPhone) : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-slate-600">Email</p>
                      <p className="font-medium text-slate-900">{selectedContact.email || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase">Orders</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{selectedContact.totalOrders || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 font-medium uppercase">Total Spent</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {formatCurrency(selectedContact.totalSpent || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium uppercase">Conversations</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {selectedContact.conversations?.length || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium uppercase">Last Contact</p>
                    <p className="text-sm font-bold text-orange-900 mt-1">
                      {selectedContact.lastContactAt ? formatDate(selectedContact.lastContactAt) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              {selectedContact.orders && selectedContact.orders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Recent Orders</h3>
                  <div className="space-y-2">
                    {selectedContact.orders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">Order #{order.shopifyOrderNumber || order.id.slice(0, 8)}</p>
                          <p className="text-sm text-slate-600">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations */}
              {selectedContact.conversations && selectedContact.conversations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Conversations</h3>
                  <div className="space-y-2">
                    {selectedContact.conversations.slice(0, 5).map((conversation: any) => (
                      <Link
                        key={conversation.id}
                        href={`/dashboard/inbox`}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {conversation.lastMessagePreview || 'No messages'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {conversation.messages?.length || 0} messages • {formatDate(conversation.lastMessageAt || conversation.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          conversation.status === 'open' ? 'bg-green-100 text-green-700' :
                          conversation.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {conversation.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <PermissionGate permission={Permissions.CONTACTS_DELETE}>
                <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm">
                  Delete Contact
                </button>
              </PermissionGate>
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
                <Link
                  href={`/dashboard/inbox`}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
                >
                  Send Message
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Contact</h2>
              <button
                onClick={closeAddModal}
                disabled={addingContact}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="John Doe"
                  disabled={addingContact}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  WhatsApp Phone
                </label>
                <input
                  type="tel"
                  value={newContact.whatsappPhone}
                  onChange={(e) => setNewContact({ ...newContact, whatsappPhone: e.target.value })}
                  placeholder="+923001234567"
                  disabled={addingContact}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">
                  International format with country code (e.g., +92 for Pakistan)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="john@example.com"
                  disabled={addingContact}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+923001234567"
                  disabled={addingContact}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> At least one contact method (WhatsApp, Email, or Phone) is required.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                onClick={closeAddModal}
                disabled={addingContact}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={addingContact || !newContact.name.trim()}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {addingContact ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Contact</span>
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
