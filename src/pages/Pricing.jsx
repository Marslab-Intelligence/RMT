import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  Tag,
  DollarSign,
  Percent,
  Search,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Sliders,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Layers,
  Building2,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1'];

export default function Pricing() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedServicePlan, setSelectedServicePlan] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' (Graphs + Table), 'graphs', 'table', 'cards'
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    vendor: 'Microsoft',
    product_name: '',
    service_category: 'Software & Services',
    sales_cost: '',
    erp_price: ''
  });
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [isCustomServicePlan, setIsCustomServicePlan] = useState(false);

  // Available vendors for dropdown select in Add/Edit modal
  const availableVendors = useMemo(() => {
    const defaults = ['Microsoft', 'Google Workspace', 'AWS', 'Azure', 'Adobe', 'Sophos', 'Veeam', 'Acronis', 'Tally', 'Redington', 'Ingram Micro', 'Fortinet', 'Cisco'];
    const fromProds = products.map(p => p.vendor).filter(Boolean);
    const combined = Array.from(new Set([...defaults, ...fromProds, formData.vendor].filter(Boolean)));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [products, formData.vendor]);

  // Available service plans for dropdown select in Add/Edit modal
  const availableServicePlans = useMemo(() => {
    const defaults = ['Software & Services', 'M365', 'GWS', 'AWS Cloud', 'Azure Cloud', 'SSL Security', 'Domains & DNS', 'Cloud Backup', 'Endpoint Security', 'Hardware & IT Services', 'Tally & ERP'];
    const fromProds = products.map(p => p.service_category).filter(Boolean);
    const combined = Array.from(new Set([...defaults, ...fromProds, formData.service_category].filter(Boolean)));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [products, formData.service_category]);

  // Fetch Pricing Data
  const fetchPricingData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [prodRes, anaRes] = await Promise.all([
        fetch('/api/pricing', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/pricing/analytics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data);
      }

      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalytics(anaData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  // Unique vendors for filtering
  const vendorsList = useMemo(() => {
    const set = new Set(products.map(p => p.vendor).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Unique service plans / categories for filtering
  const servicePlansList = useMemo(() => {
    const set = new Set(products.map(p => p.service_category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products with fuzzy normalization & client data cross-referencing
  const normalizeText = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesVendor = selectedVendor === 'all' || p.vendor.toLowerCase() === selectedVendor.toLowerCase();
      if (!matchesVendor) return false;

      const matchesPlan = selectedServicePlan === 'all' || (p.service_category || '').toLowerCase() === selectedServicePlan.toLowerCase();
      if (!matchesPlan) return false;

      if (!searchQuery.trim()) return true;

      const queryRaw = searchQuery.toLowerCase().trim();
      const queryNorm = normalizeText(searchQuery);
      const terms = queryRaw.split(/\s+/);

      const prodName = (p.product_name || '').toLowerCase();
      const vendorName = (p.vendor || '').toLowerCase();
      const category = (p.service_category || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      const associatedClients = (p.associated_clients || '').toLowerCase();

      const prodNameNorm = normalizeText(p.product_name);
      const vendorNameNorm = normalizeText(p.vendor);
      const categoryNorm = normalizeText(p.service_category);
      const associatedClientsNorm = normalizeText(p.associated_clients);

      const directMatch = prodName.includes(queryRaw) ||
                          vendorName.includes(queryRaw) ||
                          category.includes(queryRaw) ||
                          description.includes(queryRaw) ||
                          associatedClients.includes(queryRaw) ||
                          prodNameNorm.includes(queryNorm) ||
                          vendorNameNorm.includes(queryNorm) ||
                          categoryNorm.includes(queryNorm) ||
                          associatedClientsNorm.includes(queryNorm);

      if (directMatch) return true;

      const searchableText = `${prodName} ${vendorName} ${category} ${description} ${associatedClients}`;
      return terms.every(term => searchableText.includes(term) || normalizeText(searchableText).includes(normalizeText(term)));
    });
  }, [products, selectedVendor, selectedServicePlan, searchQuery]);

  // Dynamic Chart Dataset computed from active filtered items
  const chartVendorData = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) return [];
    
    const map = {};
    filteredProducts.forEach(p => {
      const v = p.vendor || 'Other';
      if (!map[v]) {
        map[v] = { vendor: v, sales_cost: 0, purchase_cost: 0, profit: 0, contracts: 0 };
      }
      const cost = parseFloat(p.sales_cost || 0);
      const sellingPrice = parseFloat(p.erp_price > 0 ? p.erp_price : (p.discounted_price || p.list_price || 0));
      const prof = sellingPrice - cost;
      const clientContracts = Math.max(1, parseInt(p.active_client_contracts || 0));

      map[v].sales_cost += sellingPrice * clientContracts;
      map[v].purchase_cost += cost * clientContracts;
      map[v].profit += prof * clientContracts;
      map[v].contracts += clientContracts;
    });

    return Object.values(map).map(item => ({
      ...item,
      sales_cost: Math.round(item.sales_cost),
      purchase_cost: Math.round(item.purchase_cost),
      profit: Math.round(item.profit),
      margin_percent: item.sales_cost > 0 ? Math.round((item.profit / item.sales_cost) * 1000) / 10 : 0
    })).sort((a, b) => b.sales_cost - a.sales_cost);
  }, [filteredProducts]);

  // Handle Edit Click
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsCustomVendor(false);
    setIsCustomServicePlan(false);
    setFormData({
      vendor: product.vendor,
      product_name: product.product_name,
      service_category: product.service_category || 'Software & Services',
      sales_cost: product.sales_cost || '',
      erp_price: product.erp_price || ''
    });
    setIsEditModalOpen(true);
  };

  // Save Edit ERP Price / Pricing
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.vendor) {
      toast.error('Vendor and Product Name are required');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/pricing/${editingProduct.id}` : '/api/pricing';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingProduct ? 'ERP Price updated successfully!' : 'New Product added to catalog!');
        setIsEditModalOpen(false);
        setIsAddModalOpen(false);
        setEditingProduct(null);
        fetchPricingData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save pricing data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while saving pricing data');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product Entry
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from pricing catalog?`)) return;
    try {
      const res = await fetch(`/api/pricing/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product deleted from catalog');
        fetchPricingData();
      } else {
        toast.error('Failed to delete product');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting product');
    }
  };

  // Custom Tooltip for Vendor Financial Bar Chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const salesCostVal = payload.find(p => p.dataKey === 'sales_cost')?.value || 0;
      const purchaseCostVal = payload.find(p => p.dataKey === 'purchase_cost')?.value || 0;
      const profitVal = payload.find(p => p.dataKey === 'profit')?.value || 0;
      const marginPct = salesCostVal > 0 ? Math.round((profitVal / salesCostVal) * 1000) / 10 : 0;

      return (
        <div className="p-3 bg-surface-900/95 text-white dark:bg-stone-900/95 border border-surface-700/50 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
          <p className="font-bold border-b border-surface-700/50 pb-1 text-amber-400">{label}</p>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Sales Cost (Revenue):</span>
            <span className="font-bold">{formatINR(salesCostVal)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Purchase Cost:</span>
            <span className="font-bold">{formatINR(purchaseCostVal)}</span>
          </div>
          <div className="flex justify-between items-center text-indigo-400">
            <span>Net Profit:</span>
            <span className="font-bold">{formatINR(profitVal)}</span>
          </div>
          <div className="pt-1 border-t border-surface-700/50 flex justify-between items-center font-extrabold text-xs">
            <span>Margin %:</span>
            <span className={marginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{marginPct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="p-3 bg-surface-900/95 text-white dark:bg-stone-900/95 border border-surface-700/50 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-1">
          <p className="font-bold text-amber-400">{data.name}</p>
          <p className="text-surface-200">Portfolio Value: <span className="font-bold text-white">{formatINR(data.value)}</span></p>
          <p className="text-emerald-400">Profit Generated: <span className="font-bold">{formatINR(data.payload.profit)}</span></p>
          <p className="text-surface-300 font-semibold">{data.payload.margin_percent}% Net Margin</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Tag className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              Vendor Pricing & ERP Margins
            </h1>
          </div>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Manage ERP product pricing, vendor discounts, client coupon tiers, and executive profit performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPricingData}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsCustomVendor(false);
              setIsCustomServicePlan(false);
              setFormData({
                vendor: 'Microsoft',
                product_name: '',
                service_category: 'Software & Services',
                sales_cost: '',
                erp_price: ''
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Product Pricing
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE DATA ANALYTICAL DASHBOARD (Non-Technical Takeaway) ── */}
      {analytics && (
        <div className="rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-white/80 via-white/50 to-amber-50/40 dark:from-stone-900/90 dark:via-stone-900/60 dark:to-stone-950/80 backdrop-blur-2xl border border-surface-200/60 dark:border-surface-800/60 shadow-xl space-y-6">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-200/50 dark:border-surface-800/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Executive Analytical Summary
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                  analytics.is_profitable 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {analytics.is_profitable ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {analytics.status_label}
                </span>
              </div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Is RMT currently in Profit or Loss?
              </h2>
            </div>

            <div className="flex items-center gap-4 bg-surface-100/60 dark:bg-surface-800/60 px-4 py-3 rounded-2xl border border-surface-200/40 dark:border-surface-700/40">
              <div>
                <p className="text-[11px] font-semibold text-surface-400 uppercase">Net Portfolio Margin</p>
                <p className={`text-xl font-black ${analytics.net_margin_percent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {analytics.net_margin_percent >= 0 ? '+' : ''}{analytics.net_margin_percent}%
                </p>
              </div>
              <div className="h-8 w-px bg-surface-300/40 dark:bg-surface-700/40" />
              <div>
                <p className="text-[11px] font-semibold text-surface-400 uppercase">Net Profit Generated</p>
                <p className="text-xl font-black text-surface-900 dark:text-white">
                  {formatINR(analytics.total_profit)}
                </p>
              </div>
            </div>
          </div>

          {/* Plain English Non-Tech Explainer */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-surface-800 dark:text-surface-200 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed space-y-1">
              <p className="font-bold text-surface-900 dark:text-white">Non-Technical Business Takeaway:</p>
              <p>{analytics.executive_summary}</p>
            </div>
          </div>

          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/40 space-y-1">
              <p className="text-xs font-semibold text-surface-400">Total Portfolio Value</p>
              <p className="text-lg sm:text-xl font-extrabold text-surface-900 dark:text-white">
                {formatINR(analytics.total_revenue)}
              </p>
              <p className="text-[11px] text-surface-500">{analytics.active_contracts_count} Active Contracts</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/40 space-y-1">
              <p className="text-xs font-semibold text-surface-400">Total Purchase Cost</p>
              <p className="text-lg sm:text-xl font-extrabold text-surface-900 dark:text-white">
                {formatINR(analytics.total_purchase_cost)}
              </p>
              <p className="text-[11px] text-surface-500">Partner Cost of Goods</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/40 space-y-1">
              <p className="text-xs font-semibold text-surface-400">Catalog Avg. ERP Margin</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {analytics.catalog_avg_margin_percent}%
              </p>
              <p className="text-[11px] text-surface-500">Catalog Margin Target</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/40 space-y-1">
              <p className="text-xs font-semibold text-surface-400">Expired Contract Risk</p>
              <p className={`text-lg sm:text-xl font-extrabold ${analytics.total_loss_value > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-surface-900 dark:text-white'}`}>
                {formatINR(analytics.total_loss_value)}
              </p>
              <p className="text-[11px] text-surface-500">{analytics.expired_contracts_count} Expired Accounts</p>
            </div>
          </div>

          {/* Visual Profit vs Loss Proportion Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-surface-500 dark:text-surface-400">Financial Revenue Breakdown</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Net Profit</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/> Purchase Cost</span>
                {analytics.total_loss_value > 0 && <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> Churn Risk</span>}
              </div>
            </div>
            
            <div className="h-3 w-full bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${Math.min(100, Math.max(5, (analytics.total_profit / (analytics.total_revenue + analytics.total_loss_value || 1)) * 100))}%` }} 
                className="bg-emerald-500 transition-all duration-500" 
                title="Net Profit"
              />
              <div 
                style={{ width: `${Math.min(100, Math.max(5, (analytics.total_purchase_cost / (analytics.total_revenue + analytics.total_loss_value || 1)) * 100))}%` }} 
                className="bg-amber-500 transition-all duration-500" 
                title="Purchase Cost"
              />
              {analytics.total_loss_value > 0 && (
                <div 
                  style={{ width: `${Math.min(100, (analytics.total_loss_value / (analytics.total_revenue + analytics.total_loss_value || 1)) * 100)}%` }} 
                  className="bg-rose-500 transition-all duration-500" 
                  title="Expired Loss Value"
                />
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── VISUAL CHARTS & INTERACTIVE ANALYTICS GRAPH SECTION ── */}
      {(viewMode === 'all' || viewMode === 'graphs') && chartVendorData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-extrabold text-surface-900 dark:text-white">
                Visual Analytics & Profit Breakdown Graphs
              </h2>
            </div>
            <span className="text-xs text-surface-400 font-semibold">
              Live updates based on current filters
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Vendor Revenue vs Purchase Cost vs Profit Bar Chart */}
            <div className="lg:col-span-2 rounded-3xl p-5 bg-white/70 dark:bg-stone-900/70 backdrop-blur-2xl border border-surface-200/60 dark:border-surface-800/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-200/40 dark:border-surface-800/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Vendor Financial Comparison (Sales Cost vs Purchase Cost vs Profit)
                  </h3>
                  <p className="text-[11px] text-surface-400">Comparing total financial impact by Vendor</p>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartVendorData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="vendor" 
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={55}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(val) => val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${val}`}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10, fontSize: '11px' }}
                      formatter={(value) => {
                        if (value === 'sales_cost') return <span className="text-emerald-500 font-semibold">Sales Cost (Revenue)</span>;
                        if (value === 'purchase_cost') return <span className="text-amber-500 font-semibold">Purchase Cost</span>;
                        if (value === 'profit') return <span className="text-indigo-500 font-semibold">Net Profit</span>;
                        return value;
                      }}
                    />
                    <Bar dataKey="sales_cost" name="sales_cost" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="purchase_cost" name="purchase_cost" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="profit" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Vendor Portfolio Share Donut Chart */}
            <div className="rounded-3xl p-5 bg-white/70 dark:bg-stone-900/70 backdrop-blur-2xl border border-surface-200/60 dark:border-surface-800/60 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="border-b border-surface-200/40 dark:border-surface-800/40 pb-3">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-brand-500" />
                  Portfolio Share by Vendor
                </h3>
                <p className="text-[11px] text-surface-400">Share of total portfolio value (%)</p>
              </div>

              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartVendorData}
                      dataKey="sales_cost"
                      nameKey="vendor"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {chartVendorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Color Legends List */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-surface-200/40 dark:border-surface-800/40 text-[11px]">
                {chartVendorData.slice(0, 6).map((item, idx) => (
                  <div key={item.vendor} className="flex items-center gap-1.5 truncate">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} 
                    />
                    <span className="font-semibold text-surface-700 dark:text-surface-300 truncate">{item.vendor}</span>
                    <span className="text-[10px] text-surface-400 font-extrabold ml-auto">{item.margin_percent}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TOOLBAR: VENDOR TABS, SEARCH BAR & PRESENTATION VIEW SWITCHER ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Vendor Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {vendorsList.map(v => (
            <button
              key={v}
              onClick={() => setSelectedVendor(v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedVendor === v
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white/60 dark:bg-surface-800/60 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200/50 dark:border-surface-700/50'
              }`}
            >
              {v === 'all' ? 'All Vendors' : v}
            </button>
          ))}
        </div>

        {/* View Format Toggle & Toolbar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
          
          {/* Data Presentation Format Switcher */}
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-xl border border-surface-200/60 dark:border-surface-700/60">
            <button
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'all' 
                  ? 'bg-white dark:bg-stone-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
              title="Show Graphs + Table View"
            >
              <Sparkles className="w-3.5 h-3.5" />
              All Views
            </button>

            <button
              onClick={() => setViewMode('graphs')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'graphs' 
                  ? 'bg-white dark:bg-stone-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
              title="Focus on Visual Graphs & Charts"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Graphs
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-stone-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
              title="Focus on Detailed Data Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-stone-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
              title="Visual Cards Format"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>

          {/* Service Plan Filter Select */}
          <div className="relative">
            <select
              value={selectedServicePlan}
              onChange={(e) => setSelectedServicePlan(e.target.value)}
              className="pl-3 pr-7 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-surface-800/70 border border-surface-200/60 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500 text-surface-700 dark:text-surface-200 cursor-pointer appearance-none"
            >
              <option value="all">All Service Plans</option>
              {servicePlansList.filter(sp => sp !== 'all').map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
            <Sliders className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search client, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/70 dark:bg-surface-800/70 border border-surface-200/60 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500 text-surface-900 dark:text-white"
            />
          </div>

          {/* Reset Filters Button */}
          {(selectedVendor !== 'all' || selectedServicePlan !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedVendor('all');
                setSelectedServicePlan('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all whitespace-nowrap flex items-center gap-1"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── EASY VISUAL CARDS GRID FORMAT ── */}
      {(viewMode === 'cards') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-12 text-center text-surface-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
              Loading Visual Catalog Cards...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full p-12 text-center text-surface-400 text-sm">
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const purchaseCost = parseFloat(p.sales_cost || 0);
              const sellingPrice = parseFloat(p.erp_price > 0 ? p.erp_price : (p.discounted_price || p.list_price || 0));
              const profitAmount = sellingPrice - purchaseCost;
              const marginPct = sellingPrice > 0 ? Math.round((profitAmount / sellingPrice) * 1000) / 10 : 0;
              const costPct = sellingPrice > 0 ? Math.round((purchaseCost / sellingPrice) * 1000) / 10 : 0;

              return (
                <div 
                  key={p.id} 
                  className="rounded-3xl p-5 bg-white/70 dark:bg-stone-900/70 backdrop-blur-2xl border border-surface-200/60 dark:border-surface-800/60 shadow-lg space-y-4 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {p.vendor.substring(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm text-surface-900 dark:text-white leading-tight">{p.product_name}</h3>
                        <p className="text-[11px] text-surface-400 font-semibold">{p.vendor} • <span className="text-surface-500">{p.service_category || 'General'}</span></p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                      profitAmount > 0 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {marginPct >= 0 ? '+' : ''}{marginPct}% margin
                    </span>
                  </div>

                  {/* Financial Breakdown Boxes */}
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-surface-50/80 dark:bg-surface-800/50 border border-surface-200/40 dark:border-surface-700/40">
                    <div>
                      <p className="text-[10px] text-surface-400 font-semibold uppercase">Purchase Cost</p>
                      <p className="text-xs font-extrabold text-surface-800 dark:text-surface-200 mt-0.5">{formatINR(purchaseCost)}</p>
                      <p className="text-[9px] text-surface-400">({costPct}%)</p>
                    </div>
                    <div className="bg-amber-500/10 rounded-xl p-1">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">ERP Price</p>
                      <p className="text-xs font-black text-amber-600 dark:text-amber-300 mt-0.5">{formatINR(p.erp_price)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-400 font-semibold uppercase">Sales Cost</p>
                      <p className="text-xs font-black text-surface-900 dark:text-white mt-0.5">{formatINR(p.discounted_price)}</p>
                    </div>
                  </div>

                  {/* Visual Cost vs Profit Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-surface-400">Cost & Margin Share</span>
                      <span className="text-emerald-500">{formatINR(profitAmount)} Profit</span>
                    </div>
                    <div className="h-2 w-full bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${Math.min(100, Math.max(0, costPct))}%` }} className="bg-amber-500" title={`Cost ${costPct}%`} />
                      <div style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }} className="bg-emerald-500" title={`Profit ${marginPct}%`} />
                    </div>
                  </div>

                  {/* Actions & Contracts info */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-200/40 dark:border-surface-800/40 text-xs">
                    <span className="text-[11px] text-surface-400 font-semibold">
                      {parseInt(p.active_client_contracts || 0)} Client contract(s)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit ERP
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.product_name)}
                        className="p-1.5 rounded-xl text-surface-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── PRODUCT PRICING TABLE ── */}
      {(viewMode === 'all' || viewMode === 'table') && (
        <div className="rounded-3xl overflow-hidden bg-white/70 dark:bg-stone-900/70 backdrop-blur-2xl border border-surface-200/60 dark:border-surface-800/60 shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-surface-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
              Loading Vendor Pricing Catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-surface-400 text-sm">
              No products found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/80 dark:bg-surface-800/50 border-b border-surface-200/60 dark:border-surface-700/60 text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span>Vendor & Product</span>
                        <select
                          value={selectedVendor}
                          onChange={(e) => setSelectedVendor(e.target.value)}
                          className="bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-[10px] font-semibold py-0.5 px-2 rounded-lg border border-surface-300 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer normal-case tracking-normal"
                          title="Filter Vendor & Product column"
                        >
                          <option value="all">Vendor: All</option>
                          {vendorsList.filter(v => v !== 'all').map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span>Service Plan</span>
                        <select
                          value={selectedServicePlan}
                          onChange={(e) => setSelectedServicePlan(e.target.value)}
                          className="bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-[10px] font-semibold py-0.5 px-2 rounded-lg border border-surface-300 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer normal-case tracking-normal"
                          title="Filter Service Plan column"
                        >
                          <option value="all">Plan: All</option>
                          {servicePlansList.filter(sp => sp !== 'all').map(sp => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right">Purchase Cost (Cost %)</th>
                    <th className="px-4 py-3.5 text-right bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      ERP Price (Editable)
                    </th>
                    <th className="px-4 py-3.5 text-right">Sales Cost</th>
                    <th className="px-4 py-3.5 text-right">Net Margin & Profit</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40 text-xs">
                  {filteredProducts.map((p) => {
                    const purchaseCost = parseFloat(p.sales_cost || 0);
                    const sellingPrice = parseFloat(p.erp_price > 0 ? p.erp_price : (p.discounted_price || p.list_price || 0));
                    const profitAmount = sellingPrice - purchaseCost;
                    const marginPct = sellingPrice > 0 ? Math.round((profitAmount / sellingPrice) * 1000) / 10 : 0;
                    const costPct = sellingPrice > 0 ? Math.round((purchaseCost / sellingPrice) * 1000) / 10 : 0;

                    return (
                      <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        
                        {/* Vendor & Product */}
                        <td className="px-4 py-3.5 font-medium">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {p.vendor.substring(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-bold text-surface-900 dark:text-white">{p.product_name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] text-surface-400 font-semibold">{p.vendor}</span>
                                {parseInt(p.active_client_contracts || 0) > 0 && (
                                  <span 
                                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    title={`Active client contracts: ${p.associated_clients_summary || ''}`}
                                  >
                                    {p.active_client_contracts} client contract{parseInt(p.active_client_contracts) > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Service Plan / Category */}
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border border-surface-200/50 dark:border-surface-700/50">
                            {p.service_category || 'General'}
                          </span>
                        </td>

                        {/* Purchase Cost (Cost %) */}
                        <td className="px-4 py-3.5 text-right font-medium text-surface-700 dark:text-surface-300">
                          <div>
                            <span>{formatINR(purchaseCost)}</span>
                            <span className="block text-[10px] text-surface-400">({costPct}% cost)</span>
                          </div>
                        </td>

                        {/* ERP Price (Editable) */}
                        <td className="px-4 py-3.5 text-right bg-amber-500/5 dark:bg-amber-500/10 font-extrabold text-amber-700 dark:text-amber-300">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer group"
                            title="Click to Edit ERP Price"
                          >
                            <span>{formatINR(p.erp_price)}</span>
                            <Edit2 className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100" />
                          </button>
                        </td>

                        {/* Sales Cost */}
                        <td className="px-4 py-3.5 text-right font-extrabold text-surface-900 dark:text-white">
                          {formatINR(p.discounted_price)}
                        </td>

                        {/* Net Margin & Profit */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                              profitAmount > 0 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : profitAmount === 0
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {marginPct >= 0 ? '+' : ''}{marginPct}%
                            </span>
                            <span className={`text-[10px] font-extrabold ${
                              profitAmount > 0 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : profitAmount === 0
                                ? 'text-surface-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {profitAmount >= 0 ? `+${formatINR(profitAmount)} profit` : `-${formatINR(Math.abs(profitAmount))} loss`}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-all"
                              title="Edit Pricing & ERP"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.product_name)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT ERP PRICE / PRICING MODAL ── */}
      {(isEditModalOpen || isAddModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-white dark:bg-stone-900 border border-surface-200 dark:border-surface-800 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                  {editingProduct ? 'Edit ERP Price & Vendor Terms' : 'Add New Vendor Pricing'}
                </h3>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setIsAddModalOpen(false); }}
                className="text-surface-400 hover:text-surface-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-surface-700 dark:text-surface-300 mb-1">Vendor Name *</label>
                  {!isCustomVendor ? (
                    <select
                      required
                      value={formData.vendor}
                      onChange={(e) => {
                        if (e.target.value === '__other__') {
                          setIsCustomVendor(true);
                          setFormData({ ...formData, vendor: '' });
                        } else {
                          setFormData({ ...formData, vendor: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="">Select Vendor</option>
                      {availableVendors.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="__other__">➕ Other (Type Custom Vendor...)</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        placeholder="Type vendor name..."
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomVendor(false)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        ← Select from list
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-surface-700 dark:text-surface-300 mb-1">Service Plan</label>
                  {!isCustomServicePlan ? (
                    <select
                      value={formData.service_category}
                      onChange={(e) => {
                        if (e.target.value === '__other__') {
                          setIsCustomServicePlan(true);
                          setFormData({ ...formData, service_category: '' });
                        } else {
                          setFormData({ ...formData, service_category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="">Select Service Plan</option>
                      {availableServicePlans.map((sp) => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                      <option value="__other__">➕ Other (Type Custom Plan...)</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        autoFocus
                        value={formData.service_category}
                        onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        placeholder="Type service plan..."
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomServicePlan(false)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        ← Select from list
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 dark:text-surface-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Microsoft 365 E3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-surface-700 dark:text-surface-300 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sales_cost}
                    onChange={(e) => setFormData({ ...formData, sales_cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 5000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">ERP Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.erp_price}
                    onChange={(e) => setFormData({ ...formData, erp_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/50 text-surface-900 dark:text-white font-extrabold focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 6500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setIsAddModalOpen(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Saving...' : 'Save Pricing'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

