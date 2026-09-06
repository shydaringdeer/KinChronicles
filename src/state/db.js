import { supabase } from './supabase';

/**
 * Save a family tree to Supabase
 */
export const saveTree = async (userId, treeId, name, nodes, edges, dynasties = [], baseCalendarId = null) => {
  if (!userId) throw new Error("User not authenticated");
  
  try {
    let payload = {
      user_id: userId,
      name,
      data: { nodes, edges, dynasties, baseCalendarId },
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
export const loadTree = async (treeId, userId = null) => {
  try {
    let query = supabase.from('trees').select('*').eq('id', treeId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.single();
      
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
 * Make a tree public
 */
export const shareTree = async (treeId, userId) => {
  try {
    const { error } = await supabase
      .from('trees')
      .update({ is_public: true })
      .eq('id', treeId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error sharing tree:", error);
    throw error;
  }
};

/**
 * Upload an image to Supabase Storage
 */
export const uploadImage = async (file, userId) => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  
  // Use a folder structure based on userId if provided, otherwise fallback to root
  const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;

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

/**
 * List all images uploaded by the user
 */
export const listImages = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;
    
    // Map over the files to get their full public URLs
    return data
      .filter(file => file.name !== '.emptyFolderPlaceholder') // Sometimes created by clients
      .map(file => {
        const filePath = `${userId}/${file.name}`;
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        return {
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          created_at: file.created_at,
          size: file.metadata?.size || 0
        };
      });
  } catch (error) {
    console.error("Error listing images:", error);
    return [];
  }
};

/**
 * Delete an image from Supabase Storage
 */
export const deleteImage = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

/**
 * TIMELINES
 */
export const saveTimeline = async (userId, timelineId, name, data) => {
  if (!userId) throw new Error("User not authenticated");
  try {
    let payload = {
      user_id: userId,
      name,
      data,
      updated_at: new Date().toISOString()
    };
    if (timelineId) {
      const { data: res, error } = await supabase.from('timelines').update(payload).eq('id', timelineId).eq('user_id', userId).select().single();
      if (error) throw error;
      return res;
    } else {
      const { data: res, error } = await supabase.from('timelines').insert(payload).select().single();
      if (error) throw error;
      return res;
    }
  } catch (err) {
    console.error("Error saving timeline:", err);
    throw err;
  }
};

export const loadTimelines = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.from('timelines').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading timelines:", err);
    return [];
  }
};

/**
 * CALENDARS
 */
export const saveCalendar = async (userId, calendarId, name, data) => {
  if (!userId) throw new Error("User not authenticated");
  try {
    let payload = {
      user_id: userId,
      name,
      data,
      updated_at: new Date().toISOString()
    };
    if (calendarId) {
      const { data: res, error } = await supabase.from('calendars').update(payload).eq('id', calendarId).eq('user_id', userId).select().single();
      if (error) throw error;
      return res;
    } else {
      const { data: res, error } = await supabase.from('calendars').insert(payload).select().single();
      if (error) throw error;
      return res;
    }
  } catch (err) {
    console.error("Error saving calendar:", err);
    throw err;
  }
};

export const loadCalendars = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.from('calendars').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading calendars:", err);
    return [];
  }
};

/**
 * NAME LISTS
 */
export const saveNameList = async (userId, listId, name, type, data) => {
  if (!userId) throw new Error("User not authenticated");
  try {
    let payload = {
      user_id: userId,
      name,
      type,
      data,
      updated_at: new Date().toISOString()
    };
    if (listId) {
      const { data: res, error } = await supabase.from('name_lists').update(payload).eq('id', listId).eq('user_id', userId).select().single();
      if (error) throw error;
      return res;
    } else {
      const { data: res, error } = await supabase.from('name_lists').insert(payload).select().single();
      if (error) throw error;
      return res;
    }
  } catch (err) {
    console.error("Error saving name list:", err);
    throw err;
  }
};

export const loadNameLists = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.from('name_lists').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading name lists:", err);
    return [];
  }
};

export const deleteNameList = async (listId, userId) => {
  try {
    const { error } = await supabase.from('name_lists').delete().eq('id', listId).eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting name list:", error);
    throw error;
  }
};

/**
 * MANUSCRIPTS
 */
export const saveManuscript = async (userId, manuscriptId, title, author, copyright, nodes) => {
  if (!userId) throw new Error("User not authenticated");
  try {
    let payload = {
      user_id: userId,
      title,
      author,
      copyright,
      nodes,
      updated_at: new Date().toISOString()
    };
    if (manuscriptId) {
      const { data: res, error } = await supabase.from('manuscripts').update(payload).eq('id', manuscriptId).eq('user_id', userId).select().single();
      if (error) throw error;
      return res;
    } else {
      const { data: res, error } = await supabase.from('manuscripts').insert({ ...payload, id: manuscriptId }).select().single();
      if (error) throw error;
      return res;
    }
  } catch (err) {
    console.error("Error saving manuscript:", err);
    throw err;
  }
};

export const loadManuscripts = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.from('manuscripts').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error loading manuscripts:", err);
    return [];
  }
};

export const deleteManuscriptApi = async (manuscriptId, userId) => {
  try {
    const { error } = await supabase.from('manuscripts').delete().eq('id', manuscriptId).eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting manuscript:", error);
    throw error;
  }
};
