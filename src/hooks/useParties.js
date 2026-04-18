import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useParties() {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParties = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching parties:', error);
    } else {
      setParties(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const addParty = async (party) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('parties')
      .insert([{ ...party, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    await fetchParties();
    return data;
  };

  const updateParty = async (id, updates) => {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    await fetchParties();
    return data;
  };

  const deleteParty = async (id) => {
    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchParties();
  };

  // Get party-wise aggregation from ledger
  const getPartyLedger = async (partyName) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('party_name', partyName)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching party ledger:', error);
      return [];
    }
    return data || [];
  };

  const partyNames = parties.map((p) => p.name);

  return {
    parties,
    loading,
    partyNames,
    addParty,
    updateParty,
    deleteParty,
    getPartyLedger,
    refetch: fetchParties,
  };
}
