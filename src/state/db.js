import { supabase } from './supabase';

/**
 * Save a family tree to Supabase
 */
export const saveTree = async (userId, treeId, name, nodes, edges, dynasties = [], baseCalendarId = null) => {
  if (!userId) throw new Error("User not authenticated");
  
  const now = new Date().toISOString();
  let payload = {
    user_id: userId,
    name,
    data: { nodes, edges, dynasties, baseCalendarId },
    updated_at: now
  };

  if (treeId) {
    const { data, error } = await supabase
      .from('trees')
      .update(payload)
      .eq('id', treeId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('trees')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/**
 * Load all trees for a user (lightweight)
 */
export const loadTrees = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('trees')
    .select('id, name, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/**
 * Load a specific tree's full data
 */
export const loadTree = async (treeId, userId = null) => {
  let query = supabase.from('trees').select('*').eq('id', treeId);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
};

/**
 * Delete a specific tree
 */
export const deleteTree = async (treeId, userId) => {
  const { error } = await supabase
    .from('trees')
    .delete()
    .eq('id', treeId)
    .eq('user_id', userId);
  if (error) throw error;
  return true;
};

/**
 * Make a tree public
 */
export const shareTree = async (treeId, userId) => {
  const { error } = await supabase
    .from('trees')
    .update({ is_public: true })
    .eq('id', treeId)
    .eq('user_id', userId);
  if (error) throw error;
  return true;
};

/**
 * Upload an image
 */
export const uploadImage = async (file, userId) => {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * List all images uploaded by the user
 */
export const listImages = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase.storage
    .from('images')
    .list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });
  if (error) throw error;
  
  return data
    .filter(file => file.name !== '.emptyFolderPlaceholder')
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
};

/**
 * Delete an image
 */
export const deleteImage = async (filePath) => {
  const { error } = await supabase.storage
    .from('images')
    .remove([filePath]);
  if (error) throw error;
  return true;
};

/**
 * TIMELINES
 */
export const saveTimeline = async (userId, timelineId, name, data) => {
  if (!userId) throw new Error("User not authenticated");
  const payload = {
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
};

export const loadTimelines = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase.from('timelines').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/**
 * CALENDARS
 */
export const saveCalendar = async (userId, calendarId, name, data) => {
  if (!userId) throw new Error("User not authenticated");
  const payload = {
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
};

export const loadCalendars = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase.from('calendars').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/**
 * NAME LISTS
 */
export const saveNameList = async (userId, listId, name, type, data) => {
  if (!userId) throw new Error("User not authenticated");
  const payload = {
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
};

export const loadNameLists = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase.from('name_lists').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const deleteNameList = async (listId, userId) => {
  const { error } = await supabase.from('name_lists').delete().eq('id', listId).eq('user_id', userId);
  if (error) throw error;
  return true;
};

/**
 * MANUSCRIPTS
 */
export const saveManuscript = async (userId, manuscriptId, title, author, copyright, nodes) => {
  if (!userId) throw new Error("User not authenticated");
  const payload = {
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
    const { data: res, error } = await supabase.from('manuscripts').insert(payload).select().single();
    if (error) throw error;
    return res;
  }
};

export const loadManuscripts = async (userId) => {
  if (!userId) return [];
  
  const { data, error } = await supabase.from('manuscripts').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const deleteManuscriptApi = async (manuscriptId, userId) => {
  const { error } = await supabase.from('manuscripts').delete().eq('id', manuscriptId).eq('user_id', userId);
  if (error) throw error;
  return true;
};
