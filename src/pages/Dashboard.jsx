import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BookOpen,
  Scale,
  Sparkles,
  Users,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalWeight: 0,
    totalFine: 0,
    totalPayments: 0,
    uniqueParties: 0,
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboard = async () => {
      setLoading(true);

      // Fetch all entries for stats
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (entries) {
        const parties = new Set();
        let totalWeight = 0;
        let totalFine = 0;
        let totalPayments = 0;

        entries.forEach((e) => {
          parties.add(e.party_name);
          if (e.type === 'payment') {
            totalPayments += parseFloat(e.amount || 0);
          } else {
            totalWeight += parseFloat(e.weight || 0);
            totalFine += parseFloat(e.fine || 0);
          }
        });

        setStats({
          totalEntries: entries.length,
          totalWeight,
          totalFine,
          totalPayments,
          uniqueParties: parties.size,
        });

        setRecentEntries(entries.slice(0, 8));
      }

      setLoading(false);
    };

    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Entries',
      value: stats.totalEntries,
      unit: '',
      icon: BookOpen,
      color: 'gold',
    },
    {
      label: 'Total Weight',
      value: stats.totalWeight.toFixed(3),
      unit: 'gm',
      icon: Scale,
      color: 'orange',
    },
    {
      label: 'Total Fine',
      value: stats.totalFine.toFixed(3),
      unit: 'gm',
      icon: Sparkles,
      color: 'gold',
    },
    {
      label: 'Parties',
      value: stats.uniqueParties,
      unit: '',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Payments Received',
      value: `₹${stats.totalPayments.toLocaleString('en-IN')}`,
      unit: '',
      icon: TrendingUp,
      color: 'green',
    },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-header-subtitle">Overview of your gold ledger</p>
        </div>
        <Link to="/ledger" className="btn btn-primary">
          <BookOpen size={16} /> Open Ledger
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        {summaryCards.map((card) => (
          <div className="summary-card" key={card.label}>
            <div className={`summary-card-icon ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="summary-card-label">{card.label}</div>
            <div className="summary-card-value">
              {card.value}
              {card.unit && <span className="summary-card-unit">{card.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Entries Table */}
      <div className="table-container">
        <div className="table-toolbar" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recent Entries</h3>
          <Link
            to="/ledger"
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.3rem' }}
          >
            View All <ArrowUpRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Party</th>
                <th>Quantity</th>
                <th>Weight</th>
                <th>Touch</th>
                <th>Fine</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    <div className="table-empty-icon">📒</div>
                    <p>No entries yet. Start by adding your first entry!</p>
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`type-badge ${entry.type}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{entry.party_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {entry.quantity || '—'}
                    </td>
                    <td>{entry.weight ? `${parseFloat(entry.weight).toFixed(3)}` : '—'}</td>
                    <td>{entry.touch ? `${parseFloat(entry.touch).toFixed(2)}%` : '—'}</td>
                    <td style={{ color: 'var(--gold-300)', fontWeight: 600 }}>
                      {entry.fine ? parseFloat(entry.fine).toFixed(3) : '—'}
                    </td>
                    <td>
                      {entry.amount
                        ? `₹${parseFloat(entry.amount).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
