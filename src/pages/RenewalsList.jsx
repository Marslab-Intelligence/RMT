import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getStatusColor, getDaysLeftColor } from '../utils/formatters';
import { 
  Plus, Search, Filter, Download, ChevronLeft, ChevronRight, 
  MoreVertical, Edit, RotateCw, MailCheck, ShieldAlert, CheckCircle, Trash2, X, Upload, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import RenewalForm from '../components/RenewalForm';
import RenewActionModal from '../components/RenewActionModal';
import ClientDetailsModal from '../components/ClientDetailsModal';
import InvoiceDetailsModal from '../components/InvoiceDetailsModal';

const normalizeHeader = (h) => {
  const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'clientname') return 'client_name';
  if (clean === 'service' || clean === 'servicename' || clean === 'serviceplan') return 'service';
  if (clean === 'renewaldate') return 'renewal_date';
  if (clean === 'value' || clean === 'contractvalue' || clean.includes('value')) return 'value';
  if (clean === 'clientemail') return 'client_email';
  if (clean === 'salesemail' || clean === 'clientsecondarymail' || clean === 'secondaryemail' || clean.includes('secondarymail')) return 'sales_email';
  if (clean === 'owner' || clean === 'contactperson' || clean === 'accountmanager' || clean.includes('person')) return 'owner';
  if (clean === 'contactnumber' || clean === 'phone' || clean.includes('contactnumber') || clean.includes('phone')) return 'contact_number';
  if (clean === 'referenceid' || clean === 'invoiceno' || clean.includes('reference') || clean.includes('invoice')) return 'reference_id';
  if (clean === 'renewed') return 'renewed';
  return clean;
};

const parseCSVDate = (dateStr) => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  
  // Format: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try standard JS Date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
};

export default function RenewalsList() {
  const { token, user } = useAuth();
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  // Column filters
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [valueFilter, setValueFilter] = useState('all');
  const [statusColFilter, setStatusColFilter] = useState('all');
  const [renewedFilter, setRenewedFilter] = useState('all');
  const [openFilterCol, setOpenFilterCol] = useState(null); // which column dropdown is open
  const filterRef = useRef(null);

  useEffect(() => {
    const s = searchParams.get('search') || '';
    if (s !== search) {
      setSearch(s);
    }
    const status = searchParams.get('status') || 'all';
    if (status !== statusFilter) {
      setStatusFilter(status);
    }
  }, [searchParams]);
  
  // Update URL and local state when status changes
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    setSearchParams(newStatus === 'all' ? {} : { status: newStatus });
  };
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRenewalToEdit, setSelectedRenewalToEdit] = useState(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [showRenewConfirmationModal, setShowRenewConfirmationModal] = useState(false);
  const [confirmRenewalId, setConfirmRenewalId] = useState(null);
  const [selectedInvoiceRenewal, setSelectedInvoiceRenewal] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [newRenewalDate, setNewRenewalDate] = useState('');
  const datePickerRef = useRef(null);

  const handleNativeDateSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month, day] = val.split('-');
    setNewRenewalDate(`${day}/${month}/${year}`);
  };

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals?page=${page}&limit=25&search=${search}&status=${statusColFilter !== 'all' ? statusColFilter : statusFilter}&dateRange=${dateRangeFilter}&valueRange=${valueFilter}&renewalConfirmation=${renewedFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRenewals(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to load renewals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRenewals();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [page, search, statusFilter, dateRangeFilter, valueFilter, statusColFilter, renewedFilter, token]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilterCol(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (col) => setOpenFilterCol(prev => prev === col ? null : col);

  const FilterDropdown = ({ col, value, onChange, options }) => {
    const isActive = value !== 'all';
    return (
      <div className="relative inline-block" ref={openFilterCol === col ? filterRef : null}>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFilter(col); }}
          className={`ml-1.5 p-0.5 rounded transition-colors ${
            isActive
              ? 'text-brand-500 dark:text-brand-400'
              : 'text-surface-300 dark:text-surface-600 hover:text-surface-500'
          }`}
          title={isActive ? 'Filter active' : 'Filter'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        </button>
        {openFilterCol === col && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg min-w-[160px] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpenFilterCol(null); setPage(1); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  value === opt.value
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const DATE_OPTIONS = [
    { value: 'all', label: 'All Dates' },
    { value: 'expired', label: 'Expired' },
    { value: 'today', label: 'Due Today' },
    { value: 'next7', label: 'Next 7 Days' },
    { value: 'next30', label: 'Next 30 Days' },
    { value: 'next60', label: 'Next 60 Days' },
    { value: 'next90', label: 'Next 90 Days' },
  ];

  const VALUE_OPTIONS = [
    { value: 'all', label: 'All Values' },
    { value: 'under50k', label: 'Under ₹50K' },
    { value: '50k-1l', label: '₹50K – ₹1L' },
    { value: '1l-5l', label: '₹1L – ₹5L' },
    { value: 'above5l', label: 'Above ₹5L' },
  ];

  const STATUS_COL_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Pending Renewal', label: 'Pending Renewal' },
    { value: 'Expired', label: 'Expired' },
    { value: '-', label: 'Discontinued' },
  ];

  const RENEWED_OPTIONS = [
    { value: 'all', label: 'All Options' },
    { value: 'pending', label: 'Pending' },
    { value: 'quotation_confirmation', label: 'Order confirmation' },
    { value: 'awaiting_client_approval', label: 'Awaiting client approval' },
    { value: 'awaiting_with_vendor', label: 'Awaiting with vendor' },
    { value: 'renewed', label: 'Renewed' },
    { value: 'service_discontinued', label: 'Service Discontinued' },
  ];

  const handleExportCSV = () => {
    // Simple CSV export logic
    const headers = ['Unique ID', 'Client', 'Service', 'Renewal Date', 'Value', 'Status', 'Days Left'];
    const csvData = renewals.map(r => [
      r.unique_id, `"${r.client_name}"`, `"${r.service}"`, r.renewal_date, r.value, r.status, r.days_left
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `renewals_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Client Name',
      'Service Name',
      'Renewal Date',
      'Contract Value (₹)',
      'Client Email',
      'Client Secondary Mail',
      'Contact Person',
      'Contact Number',
      'Reference ID (Invoice No)',
      'Renewed'
    ];
    const sampleData = [
      ['ABC Technologies Pvt Ltd', 'Cloud Hosting Service', '2026-08-15', '125000', 'admin@abctech.com', 'support@abctech.com', 'Rahul Sharma', '9876543210', 'INV-2026-001', 'Awaiting with vendor'],
      ['Global Media Solutions', 'Digital Marketing Subscription', '2026-09-05', '85000', 'contact@globalmedia.com', 'accounts@globalmedia.com', 'Priya Menon', '9123456780', 'INV-2026-002', 'Service Discontinued']
    ];
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Renewal_Sample_Data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRequestEdit = async (id) => {
    try {
      const res = await fetch(`/api/renewals/${id}/request-edit`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Edit request sent to Admin.');
        fetchRenewals();
      } else {
        toast.error('Failed to request edit.');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleApproveEdit = async (id) => {
    try {
      const res = await fetch(`/api/renewals/${id}/approve-edit`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Edit request approved.');
        setSearch('');
        setSearchParams({});
        fetchRenewals();
      } else {
        toast.error('Failed to approve edit.');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const submitDelete = async (id) => {
    try {
      const res = await fetch(`/api/renewals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Renewal moved to trash');
        fetchRenewals();
      } else {
        toast.error('Failed to delete renewal');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size must be within 10MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result;
      if (typeof csvText !== 'string') {
        toast.error('Failed to read file content.');
        return;
      }

      try {
        const lines = csvText.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error('CSV file must contain a header row and at least one data row.');
          return;
        }

        const parseRow = (line) => {
          const row = [];
          let inQuotes = false;
          let cell = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(cell.trim());
              cell = '';
            } else {
              cell += char;
            }
          }
          row.push(cell.trim());
          return row;
        };

        const rawHeaders = parseRow(lines[0]);
        const headers = rawHeaders.map(h => normalizeHeader(h));

        const records = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const rowData = parseRow(lines[i]);
          const record = {};
          
          headers.forEach((header, index) => {
            if (header) {
              let val = rowData[index] || '';
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
              }
              record[header] = val;
            }
          });

          // Check if it has any data
          if (Object.values(record).some(v => v)) {
            // Validate required columns
            if (!record.client_name || !record.service || !record.renewal_date || !record.owner || !record.client_email || !record.contact_number || !record.reference_id) {
              throw new Error(`Row ${i + 1}: Missing required fields (Client Name, Service, Renewal Date, Contact Person, Client Email, Contact Number, or Reference ID).`);
            }

            // Normalise date
            const parsedDate = parseCSVDate(record.renewal_date);
            if (!parsedDate) {
              throw new Error(`Row ${i + 1}: Invalid date value: ${record.renewal_date}. Support formats: DD/MM/YYYY or YYYY-MM-DD.`);
            }
            record.renewal_date = parsedDate;
            record.value = parseFloat(record.value) || 0;
            
            // Normalize renewed option if present
            if (record.renewed) {
              const rClean = record.renewed.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (rClean.includes('quotation')) {
                record.renewal_confirmation = 'quotation_confirmation';
              } else if (rClean.includes('clientapproval') || rClean.includes('awaitingclient')) {
                record.renewal_confirmation = 'awaiting_client_approval';
              } else if (rClean.includes('withvendor') || rClean.includes('awaitingwith')) {
                record.renewal_confirmation = 'awaiting_with_vendor';
              } else if (rClean === 'renewed') {
                record.renewal_confirmation = 'renewed';
              } else if (rClean.includes('discontinued')) {
                record.renewal_confirmation = 'service_discontinued';
              } else {
                record.renewal_confirmation = 'pending';
              }
            } else {
              record.renewal_confirmation = 'pending';
            }

            records.push(record);
          }
        }

        if (records.length === 0) {
          toast.error('No valid records found in the CSV file.');
          return;
        }

        // Upload JSON payload
        const response = await fetch('/api/renewals/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ records })
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(result.message || `Successfully imported ${records.length} records.`);
          fetchRenewals();
        } else {
          const errData = await response.json();
          toast.error(errData.error || 'Failed to import CSV.');
        }
      } catch (err) {
        toast.error(err.message || 'Error parsing CSV file.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const isFinance = user?.role === 'finance';
  const isSales = user?.role === 'sales';
  const isAdmin = user?.role === 'admin';

  const handleRenewalConfirmation = async (id, confirmation) => {
    if (confirmation === 'renewed') {
      const current = renewals.find(r => r.id === id);
      // Pre-fill with current date in DD/MM/YYYY if available
      let currentFormatted = '';
      if (current?.renewal_date) {
        try {
          const date = new Date(current.renewal_date);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            currentFormatted = `${day}/${month}/${year}`;
          }
        } catch (e) {
          currentFormatted = '';
        }
      }
      setNewRenewalDate(currentFormatted);
      setConfirmRenewalId(id);
      setShowRenewConfirmationModal(true);
      return;
    }

    const remarks = confirmation === 'renewed_with_update' 
      ? window.prompt('Enter update details / remarks:') 
      : null;
    if (confirmation === 'renewed_with_update' && !remarks) return;
    
    try {
      const res = await fetch(`/api/renewals/${id}/confirm-renewal`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ renewal_confirmation: confirmation, remarks })
      });
      if (res.ok) {
        toast.success('Renewal status is changed');
        fetchRenewals();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleInvoiceStatus = async (id, status) => {
    if (status === 'Sent') {
      const rec = renewals.find(r => r.id === id);
      if (rec) {
        setSelectedInvoiceRenewal(rec);
        setIsInvoiceModalOpen(true);
      }
      return;
    }
    try {
      const res = await fetch(`/api/renewals/${id}/invoice`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoice_status: status })
      });
      if (res.ok) {
        toast.success('Invoice status updated');
        fetchRenewals();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update invoice status');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleNewRenewalDateChange = (e) => {
    let val = e.target.value;
    val = val.replace(/[^0-9/]/g, '');
    const oldVal = newRenewalDate || '';
    if (val.length > oldVal.length) {
      if (val.length === 2) val = val + '/';
      else if (val.length === 5) val = val + '/';
    }
    if (val.length <= 10) {
      setNewRenewalDate(val);
    }
  };

  const submitRenewedConfirmation = async () => {
    if (!newRenewalDate) {
      toast.error('Please select a new renewal date.');
      return;
    }

    let dbRenewalDate = '';
    const parts = newRenewalDate.split('/');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) {
        toast.error('Please enter a valid date in DD/MM/YYYY format.');
        return;
      }
      dbRenewalDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      toast.error('Please enter the date in DD/MM/YYYY format.');
      return;
    }
    
    try {
      const res = await fetch(`/api/renewals/${confirmRenewalId}/confirm-renewal`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          renewal_confirmation: 'renewed', 
          new_renewal_date: dbRenewalDate 
        })
      });
      if (res.ok) {
        toast.success('Renewal status is changed');
        setShowRenewConfirmationModal(false);
        setConfirmRenewalId(null);
        setNewRenewalDate('');
        fetchRenewals();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const getRenewalConfirmationBadge = (status) => {
    switch (status) {
      case 'quotation_confirmation':
        return { label: 'Order confirmation', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' };
      case 'awaiting_client_approval':
        return { label: 'Awaiting client approval', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
      case 'awaiting_with_vendor':
        return { label: 'Awaiting with vendor', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' };
      case 'renewed':
        return { label: 'Renewed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' };
      case 'service_discontinued':
        return { label: 'Service Discontinued', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' };
      default:
        return { label: 'Pending', color: 'bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-700 dark:text-surface-400 dark:border-surface-600' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Renewal Management</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {totalRecords} total records found
          </p>
        </div>
        
        <div className="flex flex-nowrap items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="relative flex-shrink-0 w-32 sm:w-36">
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                setPage(1);
                setSearchParams(prev => {
                  if (val) prev.set('search', val);
                  else prev.delete('search');
                  return prev;
                });
              }}
              className="input-field pl-8 text-xs py-1.5 bg-white dark:bg-surface-800 text-zinc-900 dark:text-white"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-surface-400 pointer-events-none z-10" />
          </div>
          
          <div className="relative flex-shrink-0">
            <select 
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input-field pl-8 pr-7 text-xs py-1.5 appearance-none bg-white dark:bg-surface-800 text-zinc-900 dark:text-white"
            >
              <option value="all" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">All Statuses</option>
              <option value="Active" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Active</option>
              <option value="Pending Renewal" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Pending Renewal</option>
              <option value="Expired" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Expired</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-surface-400 pointer-events-none z-10" />
          </div>

          <button onClick={handleExportCSV} className="btn-secondary flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </button>

          {isAdmin && (
            <>
              <input
                type="file"
                id="csv-import-input"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />


              <button 
                onClick={() => document.getElementById('csv-import-input').click()}
                className="btn-secondary flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2.5 text-xs whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
            </>
          )}

          {(isSales || isAdmin) && (
            <button 
              onClick={() => { setSelectedRenewalToEdit(null); setIsFormOpen(true); }}
              className="btn-primary flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2.5 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Renewal
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card overflow-hidden dark:bg-surface-800 dark:border-surface-700">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium w-[7%]">Unique ID</th>
                <th className="px-4 py-3 font-medium w-[14%]">Client Info</th>
                <th className="px-4 py-3 font-medium w-[10%]">Service</th>
                <th className="px-4 py-3 font-medium w-[10%]">
                  <div className="flex items-center">
                    Renewal Date
                    <FilterDropdown col="date" value={dateRangeFilter} onChange={setDateRangeFilter} options={DATE_OPTIONS} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-right w-[8%]">
                  <div className="flex items-center justify-end">
                    Value
                    <FilterDropdown col="value" value={valueFilter} onChange={setValueFilter} options={VALUE_OPTIONS} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-center w-[9%]">
                  <div className="flex items-center justify-center">
                    Status
                    <FilterDropdown col="status" value={statusColFilter} onChange={setStatusColFilter} options={STATUS_COL_OPTIONS} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-center w-[7%]">Timeline</th>
                <th className="px-4 py-3 font-medium text-center w-[11%]">
                  <div className="flex items-center justify-center">
                    Renewed
                    <FilterDropdown col="renewed" value={renewedFilter} onChange={setRenewedFilter} options={RENEWED_OPTIONS} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-center w-[11%]">
                  <div className="flex items-center justify-center">
                    Invoice
                  </div>
                </th>
                {!isFinance && <th className="px-4 py-3 font-medium text-center w-[7%]">Actions</th>}
                {isAdmin && <th className="px-4 py-3 font-medium text-center w-[6%]">Approvals</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center text-surface-500">
                    <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div></div>
                    Loading records...
                  </td>
                </tr>
              ) : renewals.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center text-surface-500">
                    No renewal records found matching your criteria.
                  </td>
                </tr>
              ) : (
                renewals.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400 font-medium" title={row.unique_id}>
                      {row.unique_id.length > 10 ? row.unique_id.substring(0, 10) + '...' : row.unique_id}
                    </td>
                    <td className="px-4 py-3 overflow-hidden">
                      <button 
                        onClick={() => setSelectedClientDetails(row)}
                        className="text-left font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors truncate block max-w-full"
                      >
                        {row.client_name}
                      </button>
                      <p className="text-xs text-surface-500 mt-0.5 truncate">{row.client_email}</p>
                    </td>
                    <td className="px-4 py-3 overflow-hidden">
                      <p className="text-surface-900 dark:text-white font-medium truncate">{row.service}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-surface-900 dark:text-white">{row.renewal_date ? formatDate(row.renewal_date) : '-'}</p>
                      {row.renewal_date && (
                        <p className={`text-xs mt-0.5 ${getDaysLeftColor(row.days_left)}`}>
                          {row.days_left < 0 ? 'Expired' : row.days_left === 0 ? 'Due Today' : `${row.days_left} days left`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-surface-900 dark:text-white">
                      {formatCurrency(row.value)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === '-' ? (
                        <div className="text-center text-surface-400 dark:text-surface-600 font-medium">—</div>
                      ) : (
                        /* Visual Email Tracking timeline */
                        <div className="flex justify-center gap-1">
                          {['30','20','15','10','5','3'].map(day => {
                            const sent = row[`day_${day}_sent`] === 'Yes';
                            return (
                              <div 
                                key={day} 
                                title={`${day} Day Reminder: ${sent ? 'Sent' : 'Pending'}`}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${sent ? 'bg-green-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-400'}`}
                              >
                                {sent && <MailCheck className="w-2.5 h-2.5" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center overflow-hidden">
                      {((isSales || isAdmin) && !(row.renewal_confirmation === 'renewed' && row.days_left !== null && row.days_left !== undefined && row.days_left >= 30)) ? (
                        <select
                          value={row.renewal_confirmation || 'pending'}
                          onChange={(e) => handleRenewalConfirmation(row.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer outline-none transition-all w-full ${
                            row.renewal_confirmation === 'quotation_confirmation' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                            row.renewal_confirmation === 'awaiting_client_approval' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400' :
                            row.renewal_confirmation === 'awaiting_with_vendor' ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400' :
                            row.renewal_confirmation === 'renewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            row.renewal_confirmation === 'service_discontinued' ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-surface-100 text-surface-500 border-surface-300 dark:bg-surface-700 dark:text-surface-200'
                          }`}
                        >
                          <option value="pending" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">— Select —</option>
                          <option value="quotation_confirmation" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Order confirmation</option>
                          <option value="awaiting_client_approval" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Awaiting client approval</option>
                          <option value="awaiting_with_vendor" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Awaiting with vendor</option>
                          <option value="renewed" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Renewed</option>
                          <option value="service_discontinued" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Service Discontinued</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRenewalConfirmationBadge(row.renewal_confirmation).color}`}>
                          {getRenewalConfirmationBadge(row.renewal_confirmation).label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(isFinance || isAdmin) ? (
                        <select
                          value={row.invoice_status || 'Not'}
                          onChange={(e) => handleInvoiceStatus(row.id, e.target.value)}
                          className={`text-[11px] font-medium px-1.5 py-1 rounded-md border cursor-pointer outline-none transition-all w-20 mx-auto block ${
                            row.invoice_status === 'Sent'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-surface-100 text-surface-500 border-surface-300 dark:bg-surface-700 dark:text-surface-200'
                          }`}
                        >
                          <option value="Not" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Not</option>
                          <option value="Sent" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Sent</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border w-20 mx-auto block text-center ${
                          row.invoice_status === 'Sent'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:border-surface-600'
                        }`}>
                          {row.invoice_status === 'Sent' ? 'Sent' : 'Not'}
                        </span>
                      )}
                    </td>
                    {!isFinance && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isSales && (
                            <>
                              {row.edit_status === 'approved' ? (
                                <button 
                                  onClick={() => { setSelectedRenewalToEdit(row); setIsFormOpen(true); }}
                                  className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                  title="Edit Record"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              ) : row.edit_status === 'requested' ? (
                                <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                  Pending
                                </span>
                              ) : (
                                <button 
                                  onClick={() => handleRequestEdit(row.id)}
                                  className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                  title="Request Edit Access"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => { setSelectedRenewalToEdit(row); setIsFormOpen(true); }}
                                className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                title="Edit Record (Admin)"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(row.id)}
                                className="p-1.5 text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Record (Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                    
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {row.edit_status === 'requested' && (
                          <button 
                            onClick={() => handleApproveEdit(row.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Approve Edit Request"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between bg-white dark:bg-surface-800">
          <div className="text-sm text-surface-500 dark:text-surface-400">
            Showing <span className="font-medium text-surface-900 dark:text-white">{Math.min((page - 1) * 25 + 1, totalRecords)}</span> to <span className="font-medium text-surface-900 dark:text-white">{Math.min(page * 25, totalRecords)}</span> of <span className="font-medium text-surface-900 dark:text-white">{totalRecords}</span> results
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-surface-300 rounded-lg disabled:opacity-50 hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 border border-surface-300 rounded-lg disabled:opacity-50 hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <RenewalForm 
          onClose={() => { setIsFormOpen(false); setSelectedRenewalToEdit(null); }} 
          onSuccess={() => { setIsFormOpen(false); setSelectedRenewalToEdit(null); fetchRenewals(); }} 
          editData={selectedRenewalToEdit}
        />
      )}

      {isRenewModalOpen && selectedRenewal && (
        <RenewActionModal 
          renewal={selectedRenewal}
          onClose={() => { setIsRenewModalOpen(false); setSelectedRenewal(null); }}
          onSuccess={() => { setIsRenewModalOpen(false); setSelectedRenewal(null); fetchRenewals(); }}
        />
      )}

      <ClientDetailsModal 
        client={selectedClientDetails} 
        onClose={() => setSelectedClientDetails(null)} 
      />

      <InvoiceDetailsModal
        isOpen={isInvoiceModalOpen}
        renewal={selectedInvoiceRenewal}
        onClose={() => { setIsInvoiceModalOpen(false); setSelectedInvoiceRenewal(null); }}
        onSuccess={() => { setIsInvoiceModalOpen(false); setSelectedInvoiceRenewal(null); fetchRenewals(); }}
      />

      {showRenewConfirmationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col">
            
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                  Confirm Renewal
                </h2>
                <p className="text-xs text-surface-500 mt-1">Select a new renewal date for the contract cycle.</p>
              </div>
              <button 
                onClick={() => { setShowRenewConfirmationModal(false); setConfirmRenewalId(null); }} 
                className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                  new renewal date
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="DD/MM/YYYY" 
                    required 
                    value={newRenewalDate} 
                    onChange={handleNewRenewalDateChange} 
                    className="w-full pl-3 pr-10 py-2 border border-surface-300 dark:border-surface-650 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" 
                  />
                  <button
                    type="button"
                    onClick={() => datePickerRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-white"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  <input 
                    type="date"
                    ref={datePickerRef}
                    onChange={handleNativeDateSelect}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  />
                </div>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 p-4 rounded-lg">
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Selecting a new renewal date will automatically update the record, reset email flags, and start the next automated reminder cycle.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => { setShowRenewConfirmationModal(false); setConfirmRenewalId(null); }} 
                className="px-4 py-2 border border-surface-300 dark:border-surface-650 rounded-lg text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={submitRenewedConfirmation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Confirm Renewal
              </button>
            </div>

          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col">
            
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                  Move to Trash
                </h2>
                <p className="text-xs text-surface-500 mt-1">Confirm deletion of this renewal.</p>
              </div>
              <button 
                onClick={() => { setShowDeleteModal(false); setDeleteId(null); }} 
                className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300 font-medium">
                    Are you sure you want to delete this renewal?
                  </p>
                  <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                    The deleted record will be moved to the Trash bin. You can restore it later or delete it permanently from there.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => { setShowDeleteModal(false); setDeleteId(null); }} 
                className="px-4 py-2 border border-surface-300 dark:border-surface-650 rounded-lg text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  submitDelete(deleteId);
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
