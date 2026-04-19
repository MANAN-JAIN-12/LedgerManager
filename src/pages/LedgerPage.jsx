import { useState } from 'react';
import { useLedger } from '../hooks/useLedger';
import { useParties } from '../hooks/useParties';
import LedgerEntryForm from '../components/LedgerEntryForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import SecureImage from '../components/SecureImage';

const parseNotes = (notesStr) => {
  if (!notesStr) return { text: '', photos: [] };
  try {
    const parsed = JSON.parse(notesStr);
    if (parsed.text !== undefined || parsed.photoPaths !== undefined) {
      return { text: parsed.text || '', photos: parsed.photoPaths || [] };
    }
  } catch (e) {
    // legacy 
  }
  return { text: notesStr, photos: [] };
};
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Download,
} from 'lucide-react';

export default function LedgerPage() {
  const {
    entries,
    loading,
    totals,
    searchParty,
    setSearchParty,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortField,
    sortDirection,
    handleSort,
    typeFilter,
    setTypeFilter,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useLedger();

  const { partyNames } = useParties();

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAdd = async (entry) => {
    await addEntry(entry);
    addToast('Entry added successfully!');
  };

  const handleEdit = (entry) => {
    setEditData(entry);
    setFormOpen(true);
  };

  const handleUpdate = async (entry) => {
    await updateEntry(editData.id, entry);
    setEditData(null);
    addToast('Entry updated successfully!');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEntry(deleteId);
      setDeleteId(null);
      addToast('Entry deleted.', 'info');
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = ['Date', 'Type', 'Party Name', 'Quantity', 'Weight', 'Touch', 'Fine', 'Amount', 'Notes'];
    const rows = entries.map((e) => [
      e.date,
      e.type,
      e.party_name,
      e.quantity || '',
      e.weight || '',
      e.touch || '',
      e.fine || '',
      e.amount || '',
      e.notes || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('CSV exported!', 'info');
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Ledger</h2>
          <p className="page-header-subtitle">
            {entries.length} entries • {totals.totalWeight.toFixed(3)} gm weight • {totals.totalFine.toFixed(3)} gm fine
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> Export
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setEditData(null); setFormOpen(true); }}
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} className="table-search-icon" />
            <input
              id="search-party"
              type="text"
              placeholder="Search by party name..."
              value={searchParty}
              onChange={(e) => setSearchParty(e.target.value)}
            />
          </div>

          <div className="type-tabs">
            {['all', 'issue', 'receive', 'payment'].map((t) => (
              <button
                key={t}
                className={`type-tab ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="table-filter">
            <span className="table-filter-label">From</span>
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="table-filter-label">To</span>
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ fontSize: '0.75rem', color: 'var(--error)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th
                  className={sortField === 'date' ? 'sorted' : ''}
                  onClick={() => handleSort('date')}
                >
                  Date <SortIcon field="date" />
                </th>
                <th>Type</th>
                <th
                  className={sortField === 'party_name' ? 'sorted' : ''}
                  onClick={() => handleSort('party_name')}
                >
                  Party <SortIcon field="party_name" />
                </th>
                <th>Quantity</th>
                <th
                  className={sortField === 'weight' ? 'sorted' : ''}
                  onClick={() => handleSort('weight')}
                >
                  Weight <SortIcon field="weight" />
                </th>
                <th>Touch</th>
                <th
                  className={sortField === 'fine' ? 'sorted' : ''}
                  onClick={() => handleSort('fine')}
                >
                  Fine <SortIcon field="fine" />
                </th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-empty">
                    <div className="table-empty-icon">📒</div>
                    <p>No entries found. {searchParty ? 'Try a different search.' : 'Add your first entry!'}</p>
                  </td>
                </tr>
              ) : (
                <>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.date).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <span className={`type-badge ${entry.type}`}>{entry.type}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{entry.party_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {entry.quantity || '—'}
                      </td>
                      <td>
                        {entry.weight ? `${parseFloat(entry.weight).toFixed(3)}` : '—'}
                      </td>
                      <td>
                        {entry.touch ? `${parseFloat(entry.touch).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ color: 'var(--gold-300)', fontWeight: 600 }}>
                        {entry.fine ? parseFloat(entry.fine).toFixed(3) : '—'}
                      </td>
                      <td>
                        {entry.amount
                          ? `₹${parseFloat(entry.amount).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '160px' }}>
                        {(() => {
                          const { text, photos } = parseNotes(entry.notes);
                          if (!text && photos.length === 0) return '—';
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {text && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</div>}
                              {photos.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '2px' }}>
                                  {photos.map((path, idx) => (
                                    <SecureImage key={idx} path={path} size={32} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Delete"
                            onClick={() => setDeleteId(entry.id)}
                            style={{ color: 'var(--error)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr style={{ background: 'rgba(212,165,116,0.04)', fontWeight: 600 }}>
                    <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      TOTALS
                    </td>
                    <td>{totals.totalWeight.toFixed(3)}</td>
                    <td>—</td>
                    <td style={{ color: 'var(--gold-300)' }}>{totals.totalFine.toFixed(3)}</td>
                    <td>
                      {totals.totalPayment > 0
                        ? `₹${totals.totalPayment.toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Form Modal */}
      <LedgerEntryForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null); }}
        onSubmit={editData ? handleUpdate : handleAdd}
        editData={editData}
        partyNames={partyNames}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Entry"
        message="Are you sure you want to delete this ledger entry? This action cannot be undone."
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
