import { supabase } from './supabase';

/**
 * Save a family tree to Supabase
 */
export const saveTree = async (userId, treeId, name, nodes, edges, dynasties = []) => {
  if (!userId) throw new Error("User not authenticated");
  
  try {
    let payload = {
      user_id: userId,
      name,
      data: { nodes, edges, dynasties },
      updated_at: new Date().toISOString()
    };

    if (treeId) {
      // Update existing tree
      const { data, error } = await supabase
        .from('trees')
        .update(payload)
        .eq('id', treeId)
        .eq('user_id', userId) // Enforce ownership
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } else {
      // Insert new tree
      const { data, error } = await supabase
        .from('trees')
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      return data; // Returns the newly generated tree including its id
    }
  } catch (error) {
    console.error("Error saving tree to Supabase:", error);
    throw error;
  }
};

/**
 * Load all trees for a user (lightweight)
 */
export const loadTrees = async (userId) => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('trees')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error loading trees list:", error);
    throw error;
  }
};

/**
 * Load a specific tree's full data
 */
export const loadTree = async (treeId, userId) => {
  try {
    const { data, error } = await supabase
      .from('trees')
      .select('*')
      .eq('id', treeId)
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading specific tree:", error);
    throw error;
  }
};

/**
 * Delete a specific tree
 */
export const deleteTree = async (treeId, userId) => {
  try {
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('id', treeId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting tree:", error);
    throw error;
  }
};

/**
 * Upload an image to Supabase Storage
 */
export const uploadImage = async (file) => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
