import { useState, useEffect } from 'react';
import { useParties } from '../hooks/useParties';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import {
  Plus,
  Search,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
} from 'lucide-react';

export default function PartiesPage() {
  const { user } = useAuth();
  const { parties, loading, addParty, updateParty, deleteParty, refetch } = useParties();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Party detail view
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyLedger, setPartyLedger] = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Party-wise stats
  const [partyStats, setPartyStats] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data } = await supabase
        .from('ledger_entries')
        .select('party_name, type, weight, fine, amount')
        .eq('user_id', user.id);

      if (data) {
        const stats = {};
        data.forEach((e) => {
          if (!stats[e.party_name]) {
            stats[e.party_name] = { weight: 0, fine: 0, payments: 0, entries: 0 };
          }
          stats[e.party_name].entries += 1;
          if (e.type === 'payment') {
            stats[e.party_name].payments += parseFloat(e.amount || 0);
          } else if (e.type === 'issue') {
            stats[e.party_name].weight += parseFloat(e.weight || 0);
            stats[e.party_name].fine += parseFloat(e.fine || 0);
          } else if (e.type === 'receive') {
            stats[e.party_name].weight -= parseFloat(e.weight || 0);
            stats[e.party_name].fine -= parseFloat(e.fine || 0);
          }
        });
        setPartyStats(stats);
      }
    };

    fetchStats();
  }, [user, parties]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openForm = (party = null) => {
    setEditData(party);
    setFormName(party?.name || '');
    setFormPhone(party?.phone || '');
    setFormAddress(party?.address || '');
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Party name is required.');
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
      };

      if (editData) {
        await updateParty(editData.id, data);
        addToast('Party updated!');
      } else {
        await addParty(data);
        addToast('Party added!');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteParty(deleteId);
        addToast('Party deleted.', 'info');
      } catch (err) {
        addToast(err.message, 'error');
      }
      setDeleteId(null);
    }
  };

  const openPartyDetail = async (party) => {
    setSelectedParty(party);
    setPartyLoading(true);

    const { data } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('party_name', party.name)
      .order('date', { ascending: false });

    setPartyLedger(data || []);
    setPartyLoading(false);
  };

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Party detail stats
  const detailStats = selectedParty
    ? partyStats[selectedParty.name] || { weight: 0, fine: 0, payments: 0, entries: 0 }
    : null;

  // If viewing a party detail
  if (selectedParty) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSelectedParty(null)}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2>{selectedParty.name}</h2>
              <p className="page-header-subtitle">
                {selectedParty.phone && `📞 ${selectedParty.phone}`}
                {selectedParty.address && ` • 📍 ${selectedParty.address}`}
              </p>
            </div>
          </div>
        </div>

        {/* Party summary cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Total Entries</div>
            <div className="summary-card-value">{detailStats.entries}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Total Weight</div>
            <div className="summary-card-value">
              {detailStats.weight.toFixed(3)}
              <span className="summary-card-unit">gm</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Total Fine</div>
            <div className="summary-card-value" style={{ color: 'var(--gold-300)' }}>
              {detailStats.fine.toFixed(3)}
              <span className="summary-card-unit">gm</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Payments Received</div>
            <div className="summary-card-value" style={{ color: 'var(--success)' }}>
              ₹{detailStats.payments.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Party ledger table */}
        <div className="table-container">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Weight</th>
                  <th>Touch</th>
                  <th>Fine</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {partyLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </td>
                  </tr>
                ) : partyLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      <p>No entries for this party.</p>
                    </td>
                  </tr>
                ) : (
                  partyLedger.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`type-badge ${entry.type}`}>{entry.type}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{entry.quantity || '—'}</td>
                      <td>{entry.weight ? parseFloat(entry.weight).toFixed(3) : '—'}</td>
                      <td>{entry.touch ? `${parseFloat(entry.touch).toFixed(2)}%` : '—'}</td>
                      <td style={{ color: 'var(--gold-300)', fontWeight: 600 }}>
                        {entry.fine ? parseFloat(entry.fine).toFixed(3) : '—'}
                      </td>
                      <td>
                        {entry.amount
                          ? `₹${parseFloat(entry.amount).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {entry.notes || '—'}
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

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Parties</h2>
          <p className="page-header-subtitle">{parties.length} parties registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={16} /> Add Party
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
        <div className="table-search" style={{ maxWidth: '400px' }}>
          <Search size={16} className="table-search-icon" />
          <input
            id="search-parties"
            type="text"
            placeholder="Search parties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Parties Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : filteredParties.length === 0 ? (
        <div className="table-empty" style={{ padding: '3rem' }}>
          <div className="table-empty-icon">👥</div>
          <p>{search ? 'No parties found matching your search.' : 'No parties yet. Add your first party!'}</p>
        </div>
      ) : (
        <div className="parties-grid">
          {filteredParties.map((party) => {
            const stats = partyStats[party.name] || { weight: 0, fine: 0, payments: 0, entries: 0 };
            return (
              <div
                key={party.id}
                className="party-card"
                onClick={() => openPartyDetail(party)}
              >
                <div className="party-card-header">
                  <span className="party-card-name">{party.name}</span>
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Edit"
                      onClick={() => openForm(party)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Delete"
                      onClick={() => setDeleteId(party.id)}
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="party-card-info">
                  {party.phone && (
                    <span className="party-card-detail">
                      <Phone size={12} /> {party.phone}
                    </span>
                  )}
                  {party.address && (
                    <span className="party-card-detail">
                      <MapPin size={12} /> {party.address}
                    </span>
                  )}
                </div>

                <div className="party-card-stats">
                  <div className="party-stat">
                    <div className="party-stat-label">Fine</div>
                    <div className="party-stat-value">{stats.fine.toFixed(3)} gm</div>
                  </div>
                  <div className="party-stat">
                    <div className="party-stat-label">Weight</div>
                    <div className="party-stat-value">{stats.weight.toFixed(3)} gm</div>
                  </div>
                  <div className="party-stat">
                    <div className="party-stat-label">Entries</div>
                    <div className="party-stat-value">{stats.entries}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Party Form Modal */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editData ? 'Edit Party' : 'Add Party'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                {formError && (
                  <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="party-name">Party Name *</label>
                    <input
                      id="party-name"
                      type="text"
                      placeholder="Enter party name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="party-phone">Phone</label>
                    <input
                      id="party-phone"
                      type="text"
                      placeholder="Optional"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="party-address">Address</label>
                    <textarea
                      id="party-address"
                      rows={2}
                      placeholder="Optional"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editData ? 'Update' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Party"
        message="Are you sure you want to delete this party? This won't delete their ledger entries."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
}
