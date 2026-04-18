import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function LedgerEntryForm({
  isOpen,
  onClose,
  onSubmit,
  editData,
  partyNames,
}) {
  const [formType, setFormType] = useState('issue');
  const [date, setDate] = useState('');
  const [partyName, setPartyName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [touch, setTouch] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const partyInputRef = useRef(null);

  // Calculate fine preview
  const finePreview =
    weight && touch
      ? ((parseFloat(weight) * parseFloat(touch)) / 100).toFixed(3)
      : '';

  // Populate form on edit
  useEffect(() => {
    if (editData) {
      setFormType(editData.type || 'issue');
      setDate(editData.date || '');
      setPartyName(editData.party_name || '');
      setQuantity(editData.quantity?.toString() || '');
      setWeight(editData.weight?.toString() || '');
      setTouch(editData.touch?.toString() || '');
      setAmount(editData.amount?.toString() || '');
      setNotes(editData.notes || '');
    } else {
      // Default for new entry
      setFormType('issue');
      setDate(new Date().toISOString().split('T')[0]);
      setPartyName('');
      setQuantity('');
      setWeight('');
      setTouch('');
      setAmount('');
      setNotes('');
    }
    setError('');
  }, [editData, isOpen]);

  const filteredParties = partyNames.filter(
    (name) =>
      partyName &&
      name.toLowerCase().includes(partyName.toLowerCase()) &&
      name.toLowerCase() !== partyName.toLowerCase()
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date || !partyName.trim()) {
      setError('Date and Party Name are required.');
      return;
    }

    if (formType !== 'payment') {
      if (!weight || parseFloat(weight) <= 0) {
        setError('Weight must be greater than 0.');
        return;
      }
      if (!touch || parseFloat(touch) <= 0 || parseFloat(touch) > 100) {
        setError('Touch must be between 0 and 100.');
        return;
      }
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        setError('Amount must be greater than 0.');
        return;
      }
    }

    setLoading(true);
    try {
      const entry = {
        date,
        type: formType,
        party_name: partyName.trim(),
        quantity: quantity.trim() ? parseFloat(quantity) : null,
        weight: formType !== 'payment' ? parseFloat(weight) : null,
        touch: formType !== 'payment' ? parseFloat(touch) : null,
        fine: formType !== 'payment' ? parseFloat(finePreview) : null,
        amount: formType === 'payment' ? parseFloat(amount) : null,
        notes: notes.trim() || null,
      };

      await onSubmit(entry);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editData ? 'Edit Entry' : 'New Entry'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {/* Entry type tabs */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label>Entry Type</label>
              <div className="type-tabs">
                <button
                  type="button"
                  className={`type-tab ${formType === 'issue' ? 'active' : ''}`}
                  onClick={() => setFormType('issue')}
                >
                  🔸 Issue
                </button>
                <button
                  type="button"
                  className={`type-tab ${formType === 'receive' ? 'active' : ''}`}
                  onClick={() => setFormType('receive')}
                >
                  🟢 Receive
                </button>
                <button
                  type="button"
                  className={`type-tab ${formType === 'payment' ? 'active' : ''}`}
                  onClick={() => setFormType('payment')}
                >
                  💰 Payment
                </button>
              </div>
            </div>

            <div className="form-grid">
              {/* Date */}
              <div className="form-group">
                <label htmlFor="entry-date">Date *</label>
                <input
                  id="entry-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Party Name */}
              <div className="form-group autocomplete-wrapper">
                <label htmlFor="entry-party">Party Name *</label>
                <input
                  id="entry-party"
                  ref={partyInputRef}
                  type="text"
                  placeholder="Enter party name"
                  value={partyName}
                  onChange={(e) => {
                    setPartyName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
                {showSuggestions && filteredParties.length > 0 && (
                  <div className="autocomplete-list">
                    {filteredParties.map((name) => (
                      <div
                        key={name}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          setPartyName(name);
                          setShowSuggestions(false);
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formType !== 'payment' ? (
                <>
                  {/* Quantity (optional) */}
                  <div className="form-group">
                    <label htmlFor="entry-quantity">Quantity</label>
                    <input
                      id="entry-quantity"
                      type="number"
                      placeholder="e.g. 5 (optional)"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  {/* Weight */}
                  <div className="form-group">
                    <label htmlFor="entry-weight">Weight (gm) *</label>
                    <input
                      id="entry-weight"
                      type="number"
                      placeholder="0.000"
                      step="0.001"
                      min="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                    />
                  </div>

                  {/* Touch */}
                  <div className="form-group">
                    <label htmlFor="entry-touch">Touch (%) *</label>
                    <input
                      id="entry-touch"
                      type="number"
                      placeholder="e.g. 91.60"
                      step="0.01"
                      min="0"
                      max="100"
                      value={touch}
                      onChange={(e) => setTouch(e.target.value)}
                      required
                    />
                  </div>

                  {/* Fine preview */}
                  <div className="form-group">
                    <label>Fine (auto-calculated)</label>
                    <input
                      type="text"
                      value={finePreview ? `${finePreview} gm` : '—'}
                      readOnly
                      style={{
                        background: 'rgba(212,165,116,0.06)',
                        color: 'var(--gold-300)',
                        fontWeight: 600,
                        cursor: 'default',
                        borderColor: 'rgba(212,165,116,0.15)',
                      }}
                    />
                    {finePreview && (
                      <span className="fine-preview">
                        {weight} × {touch}% = {finePreview}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Amount for payment */}
                  <div className="form-group full-width">
                    <label htmlFor="entry-amount">Payment Amount (₹) *</label>
                    <input
                      id="entry-amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label htmlFor="entry-notes">Notes</label>
              <textarea
                id="entry-notes"
                placeholder="Add any notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{
                  resize: 'vertical',
                  minHeight: '2.5rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editData ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
