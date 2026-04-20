import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & sort
  const [searchParty, setSearchParty] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'issue', 'receive', 'payment'

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (searchParty.trim()) {
        query = query.ilike('party_name', `%${searchParty.trim()}%`);
      }

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user, searchParty, dateFrom, dateTo, sortField, sortDirection, typeFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{ ...entry, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    await fetchEntries();
    return data;
  };

  const updateEntry = async (id, updates) => {
    const { data, error } = await supabase
      .from('ledger_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    await fetchEntries();
    return data;
  };

  const deleteEntry = async (id) => {
    const { error } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchEntries();
  };

  // Aggregations
  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.type === 'payment') {
        acc.totalPayment += parseFloat(entry.amount || 0);
      } else if (entry.type === 'receive') {
        acc.totalWeight += parseFloat(entry.weight || 0);
        acc.totalFine += parseFloat(entry.fine || 0);
      } else if (entry.type === 'issue') {
        acc.totalWeight -= parseFloat(entry.weight || 0);
        acc.totalFine -= parseFloat(entry.fine || 0);
      }
      acc.totalEntries += 1;
      return acc;
    },
    { totalWeight: 0, totalFine: 0, totalPayment: 0, totalEntries: 0 }
  );

  const uniqueParties = [...new Set(entries.map((e) => e.party_name))].length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return {
    entries,
    loading,
    error,
    totals,
    uniqueParties,
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
    refetch: fetchEntries,
  };
}
