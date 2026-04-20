import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, Calendar, Gem, Download, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('party');

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      setEntries(data || []);
      setLoading(false);
    };

    fetch();
  }, [user]);

  // Party-wise aggregation
  const partyAgg = {};
  entries.forEach((e) => {
    if (!partyAgg[e.party_name]) {
      partyAgg[e.party_name] = { entries: 0, weight: 0, fine: 0, payments: 0 };
    }
    partyAgg[e.party_name].entries += 1;
    if (e.type === 'payment') {
      partyAgg[e.party_name].payments += parseFloat(e.amount || 0);
    } else if (e.type === 'receive') {
      partyAgg[e.party_name].weight += parseFloat(e.weight || 0);
      partyAgg[e.party_name].fine += parseFloat(e.fine || 0);
    } else if (e.type === 'issue') {
      partyAgg[e.party_name].weight -= parseFloat(e.weight || 0);
      partyAgg[e.party_name].fine -= parseFloat(e.fine || 0);
    }
  });

  const partySummary = Object.entries(partyAgg)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.fine - a.fine);

  // Date-wise (monthly) aggregation
  const monthAgg = {};
  entries.forEach((e) => {
    const month = e.date?.slice(0, 7); // YYYY-MM
    if (!month) return;
    if (!monthAgg[month]) {
      monthAgg[month] = { entries: 0, weight: 0, fine: 0, payments: 0 };
    }
    monthAgg[month].entries += 1;
    if (e.type === 'payment') {
      monthAgg[month].payments += parseFloat(e.amount || 0);
    } else if (e.type === 'receive') {
      monthAgg[month].weight += parseFloat(e.weight || 0);
      monthAgg[month].fine += parseFloat(e.fine || 0);
    } else if (e.type === 'issue') {
      monthAgg[month].weight -= parseFloat(e.weight || 0);
      monthAgg[month].fine -= parseFloat(e.fine || 0);
    }
  });

  const monthSummary = Object.entries(monthAgg)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month));


  // Stock Ledger aggregation
  const stockAgg = {
    receiveQuantity: 0,
    issueQuantity: 0,
    receiveWeight: 0,
    issueWeight: 0,
    receiveFine: 0,
    issueFine: 0,
  };

  entries.forEach((e) => {
    if (e.type === 'receive') {
      stockAgg.receiveQuantity += parseFloat(e.quantity || 0);
      stockAgg.receiveWeight += parseFloat(e.weight || 0);
      stockAgg.receiveFine += parseFloat(e.fine || 0);
    } else if (e.type === 'issue') {
      stockAgg.issueQuantity += parseFloat(e.quantity || 0);
      stockAgg.issueWeight += parseFloat(e.weight || 0);
      stockAgg.issueFine += parseFloat(e.fine || 0);
    }
  });

  const stockSummary = {
    netQuantity: stockAgg.receiveQuantity - stockAgg.issueQuantity,
    netWeight: stockAgg.receiveWeight - stockAgg.issueWeight,
    netFine: stockAgg.receiveFine - stockAgg.issueFine,
  };

  const exportReportCSV = () => {
    let headers, rows;

    if (activeTab === 'party') {
      headers = ['Party Name', 'Entries', 'Weight (gm)', 'Fine (gm)', 'Payments (₹)'];
      rows = partySummary.map((p) => [p.name, p.entries, p.weight.toFixed(3), p.fine.toFixed(3), p.payments]);
    } else if (activeTab === 'month') {
      headers = ['Month', 'Entries', 'Weight (gm)', 'Fine (gm)', 'Payments (₹)'];
      rows = monthSummary.map((m) => [m.month, m.entries, m.weight.toFixed(3), m.fine.toFixed(3), m.payments]);
    } else if (activeTab === 'stock') {
      headers = ['Metric', 'Total Receive', 'Total Issue', 'Net Balance'];
      rows = [
        ['Quantity', stockAgg.receiveQuantity, stockAgg.issueQuantity, stockSummary.netQuantity],
        ['Weight (gm)', stockAgg.receiveWeight.toFixed(3), stockAgg.issueWeight.toFixed(3), stockSummary.netWeight.toFixed(3)],
        ['Fine Weight (gm)', stockAgg.receiveFine.toFixed(3), stockAgg.issueFine.toFixed(3), stockSummary.netFine.toFixed(3)],
      ];
    }

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const formatMonth = (ym) => {
    const [y, m] = ym.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  };

  // Totals
  const partyTotals = partySummary.reduce(
    (acc, p) => ({
      entries: acc.entries + p.entries,
      weight: acc.weight + p.weight,
      fine: acc.fine + p.fine,
      payments: acc.payments + p.payments,
    }),
    { entries: 0, weight: 0, fine: 0, payments: 0 }
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p className="page-header-subtitle">
            Aggregated summaries of your gold ledger
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportReportCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Report tabs */}
      <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
        <div className="type-tabs" style={{ display: 'inline-flex' }}>
          <button
            className={`type-tab ${activeTab === 'party' ? 'active' : ''}`}
            onClick={() => setActiveTab('party')}
          >
            <Users size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
            Party-wise
          </button>
          <button
            className={`type-tab ${activeTab === 'month' ? 'active' : ''}`}
            onClick={() => setActiveTab('month')}
          >
            <Calendar size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
            Monthly
          </button>

          <button
            className={`type-tab ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <Layers size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
            Stock Ledger
          </button>
        </div>
      </div>

      {/* Party-wise Report */}
      {activeTab === 'party' && (
        <div className="table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="mobile-cards">
              <thead>
                <tr>
                  <th>Party Name</th>
                  <th>Entries</th>
                  <th>Total Weight (gm)</th>
                  <th>Total Fine (gm)</th>
                  <th>Payments (₹)</th>
                </tr>
              </thead>
              <tbody>
                {partySummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      <p>No data available.</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {partySummary.map((p) => (
                      <tr 
                        key={p.name}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/parties', { state: { selectedPartyName: p.name } })}
                      >
                        <td data-label="Party Name" style={{ fontWeight: 500, color: 'var(--gold-300)' }}>{p.name}</td>
                        <td data-label="Entries">{p.entries}</td>
                        <td data-label="Total Weight (gm)">{p.weight.toFixed(3)}</td>
                        <td data-label="Total Fine (gm)" style={{ color: 'var(--gold-300)', fontWeight: 600 }}>{p.fine.toFixed(3)}</td>
                        <td data-label="Payments (₹)">
                          {p.payments > 0
                            ? `₹${p.payments.toLocaleString('en-IN')}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(212,165,116,0.04)', fontWeight: 600 }}>
                      <td data-label="Party Name" style={{ color: 'var(--text-muted)' }}>TOTAL</td>
                      <td data-label="Entries">{partyTotals.entries}</td>
                      <td data-label="Total Weight (gm)">{partyTotals.weight.toFixed(3)}</td>
                      <td data-label="Total Fine (gm)" style={{ color: 'var(--gold-300)' }}>{partyTotals.fine.toFixed(3)}</td>
                      <td data-label="Payments (₹)">₹{partyTotals.payments.toLocaleString('en-IN')}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Report */}
      {activeTab === 'month' && (
        <div className="table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="mobile-cards">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Entries</th>
                  <th>Total Weight (gm)</th>
                  <th>Total Fine (gm)</th>
                  <th>Payments (₹)</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      <p>No data available.</p>
                    </td>
                  </tr>
                ) : (
                  monthSummary.map((m) => (
                    <tr key={m.month}>
                      <td data-label="Month" style={{ fontWeight: 500 }}>{formatMonth(m.month)}</td>
                      <td data-label="Entries">{m.entries}</td>
                      <td data-label="Total Weight (gm)">{m.weight.toFixed(3)}</td>
                      <td data-label="Total Fine (gm)" style={{ color: 'var(--gold-300)', fontWeight: 600 }}>{m.fine.toFixed(3)}</td>
                      <td data-label="Payments (₹)">
                        {m.payments > 0
                          ? `₹${m.payments.toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Stock Ledger Report */}
      {activeTab === 'stock' && (
        <div className="table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="mobile-cards">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Total Receive</th>
                  <th>Total Issue</th>
                  <th>Net Balance (Current Stock)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Metric" style={{ fontWeight: 500 }}>Quantity</td>
                  <td data-label="Total Receive" style={{ color: 'var(--error)' }}>{stockAgg.receiveQuantity}</td>
                  <td data-label="Total Issue" style={{ color: 'var(--warning)' }}>{stockAgg.issueQuantity}</td>
                  <td data-label="Net Balance" style={{ fontWeight: 600, color: stockSummary.netQuantity >= 0 ? 'var(--gold-300)' : 'var(--error)' }}>
                    {stockSummary.netQuantity}
                  </td>
                </tr>
                <tr>
                  <td data-label="Metric" style={{ fontWeight: 500 }}>Weight (gm)</td>
                  <td data-label="Total Receive" style={{ color: 'var(--error)' }}>{stockAgg.receiveWeight.toFixed(3)}</td>
                  <td data-label="Total Issue" style={{ color: 'var(--warning)' }}>{stockAgg.issueWeight.toFixed(3)}</td>
                  <td data-label="Net Balance" style={{ fontWeight: 600, color: stockSummary.netWeight >= 0 ? 'var(--gold-300)' : 'var(--error)' }}>
                    {stockSummary.netWeight.toFixed(3)}
                  </td>
                </tr>
                <tr>
                  <td data-label="Metric" style={{ fontWeight: 500 }}>Fine Weight (gm)</td>
                  <td data-label="Total Receive" style={{ color: 'var(--error)' }}>{stockAgg.receiveFine.toFixed(3)}</td>
                  <td data-label="Total Issue" style={{ color: 'var(--warning)' }}>{stockAgg.issueFine.toFixed(3)}</td>
                  <td data-label="Net Balance" style={{ fontWeight: 600, color: stockSummary.netFine >= 0 ? 'var(--gold-300)' : 'var(--error)' }}>
                    {stockSummary.netFine.toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
