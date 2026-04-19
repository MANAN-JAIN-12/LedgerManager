import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  const [photoPaths, setPhotoPaths] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const partyInputRef = useRef(null);
  const { user } = useAuth();

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
      
      let initialNotes = '';
      let initialPhotos = [];
      if (editData.notes) {
        try {
          const parsed = JSON.parse(editData.notes);
          if (parsed.text !== undefined || parsed.photoPaths !== undefined) {
             initialNotes = parsed.text || '';
             initialPhotos = parsed.photoPaths || [];
          } else {
             initialNotes = editData.notes;
          }
        } catch {
          initialNotes = editData.notes;
        }
      }
      setNotes(initialNotes);
      setPhotoPaths(initialPhotos);
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
      setPhotoPaths([]);
    }
    setError('');
  }, [editData, isOpen]);

  const filteredParties = partyNames.filter(
    (name) =>
      partyName &&
      name.toLowerCase().includes(partyName.toLowerCase()) &&
      name.toLowerCase() !== partyName.toLowerCase()
  );

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    setError('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('notes_photos')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      setPhotoPaths(prev => [...prev, filePath]);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Make sure bucket is set up as Private in Supabase policies.');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // reset file input
    }
  };

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
      let finalNotes = notes.trim() || null;
      if (photoPaths.length > 0) {
        finalNotes = JSON.stringify({
          text: notes.trim(),
          photoPaths: photoPaths,
        });
      }

      const entry = {
        date,
        type: formType,
        party_name: partyName.trim(),
        quantity: quantity.trim() ? parseFloat(quantity) : null,
        weight: formType !== 'payment' ? parseFloat(weight) : null,
        touch: formType !== 'payment' ? parseFloat(touch) : null,
        fine: formType !== 'payment' ? parseFloat(finePreview) : null,
        amount: formType === 'payment' ? parseFloat(amount) : null,
        notes: finalNotes,
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
              {/* Notes & Photos */}
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

              <div className="form-group full-width">
                <label>Photos / Attachments</label>
                {photoPaths.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {photoPaths.map((path, idx) => (
                      <div key={idx} className="secure-image-placeholder">
                        <ImageIcon size={16} />
                        <span>Photo attached ({idx + 1})</span>
                        <button 
                          type="button" 
                          onClick={() => setPhotoPaths(prev => prev.filter((_, i) => i !== idx))} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <label className="btn btn-secondary" style={{ width: 'max-content', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    {uploadingImage ? <Loader2 size={16} className="spinning" /> : <ImageIcon size={16} />}
                    {uploadingImage ? 'Uploading...' : 'Add Photo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      disabled={uploadingImage}
                      onChange={handlePhotoUpload} 
                    />
                  </label>
                </div>
              </div>
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
