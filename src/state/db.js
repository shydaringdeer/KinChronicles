import { supabase } from './supabase';

/**
 * Save a user's family tree to Supabase
 */
export const saveTree = async (uid, nodes, edges) => {
  if (!uid) throw new Error("User not authenticated");
  
  try {
    const { error } = await supabase
      .from('trees')
      .upsert({ 
        id: uid, 
        data: { nodes, edges },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving tree to Supabase:", error);
    throw error;
  }
};

/**
 * Load a user's family tree from Supabase
 */
export const loadTree = async (uid) => {
  if (!uid) return { nodes: [], edges: [] };
  
  try {
    const { data, error } = await supabase
      .from('trees')
      .select('data')
      .eq('id', uid)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned (this is fine, they just haven't saved a tree yet)
        return { nodes: null, edges: null };
      }
      throw error;
    }
    
    if (data && data.data) {
      return { nodes: data.data.nodes || [], edges: data.data.edges || [] };
    }
    
    return { nodes: null, edges: null };
  } catch (error) {
    console.error("Error loading tree from Supabase:", error);
    throw error;
  }
};
