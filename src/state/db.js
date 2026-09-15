import { supabase, isSupabaseConfigured } from './supabase';

const getLocal = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Failed to write to localStorage for key ${key}:`, e);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

const isLocalOnly = (userId) => !isSupabaseConfigured || userId === 'local-pro-user';

/**
 * Save a family tree to Supabase with localStorage fallback
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

  if (isLocalOnly(userId)) {
    const trees = getLocal('kinchronicles_trees', []);
    const id = treeId || generateId();
    const existingIndex = trees.findIndex(t => t.id === id);
    const savedRecord = { id, ...payload };
    if (existingIndex >= 0) {
      trees[existingIndex] = savedRecord;
    } else {
      trees.unshift(savedRecord);
    }
    setLocal('kinchronicles_trees', trees);
    return savedRecord;
  }

  try {
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
  } catch (error) {
    console.warn("Supabase tree save failed, falling back to localStorage:", error);
    const trees = getLocal('kinchronicles_trees', []);
    const id = treeId || generateId();
    const savedRecord = { id, ...payload };
    const existingIndex = trees.findIndex(t => t.id === id);
    if (existingIndex >= 0) {
      trees[existingIndex] = savedRecord;
    } else {
      trees.unshift(savedRecord);
    }
    setLocal('kinchronicles_trees', trees);
    return savedRecord;
  }
};

/**
 * Load all trees for a user (lightweight)
 */
export const loadTrees = async (userId) => {
  if (!userId) return [];
  
  if (isLocalOnly(userId)) {
    const trees = getLocal('kinchronicles_trees', []);
    return trees.map(t => ({ id: t.id, name: t.name, updated_at: t.updated_at }));
  }

  try {
    const { data, error } = await supabase
      .from('trees')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("Supabase loadTrees failed, falling back to localStorage:", error);
    const trees = getLocal('kinchronicles_trees', []);
    return trees.map(t => ({ id: t.id, name: t.name, updated_at: t.updated_at }));
  }
};

/**
 * Load a specific tree's full data
 */
export const loadTree = async (treeId, userId = null) => {
  if (isLocalOnly(userId)) {
    const trees = getLocal('kinchronicles_trees', []);
    const tree = trees.find(t => t.id === treeId);
    if (!tree) throw new Error("Tree not found");
    return tree;
  }

  try {
    let query = supabase.from('trees').select('*').eq('id', treeId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("Supabase loadTree failed, falling back to localStorage:", error);
    const trees = getLocal('kinchronicles_trees', []);
    const tree = trees.find(t => t.id === treeId);
    if (!tree) throw error;
    return tree;
  }
};

/**
 * Delete a specific tree
 */
export const deleteTree = async (treeId, userId) => {
  const localTrees = getLocal('kinchronicles_trees', []).filter(t => t.id !== treeId);
  setLocal('kinchronicles_trees', localTrees);

  if (isLocalOnly(userId)) return true;

  try {
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('id', treeId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Supabase deleteTree failed:", error);
    return true;
  }
};

/**
 * Make a tree public
 */
export const shareTree = async (treeId, userId) => {
  const trees = getLocal('kinchronicles_trees', []);
  const idx = trees.findIndex(t => t.id === treeId);
  if (idx >= 0) {
    trees[idx].is_public = true;
    setLocal('kinchronicles_trees', trees);
  }

  if (isLocalOnly(userId)) return true;

  try {
    const { error } = await supabase
      .from('trees')
      .update({ is_public: true })
      .eq('id', treeId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Supabase shareTree failed:", error);
    return true;
  }
};

/**
 * Upload an image
 */
export const uploadImage = async (file, userId) => {
  if (!file) return null;

  if (isLocalOnly(userId)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result;
        const images = getLocal('kinchronicles_images', []);
        const fileName = `${Date.now()}_${file.name}`;
        images.unshift({
          name: file.name,
          path: fileName,
          url,
          created_at: new Date().toISOString(),
          size: file.size
        });
        setLocal('kinchronicles_images', images);
        resolve(url);
      };
      reader.readAsDataURL(file);
    });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.warn("Supabase image upload failed, storing locally:", error);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }
};

/**
 * List all images uploaded by the user
 */
export const listImages = async (userId) => {
  if (!userId) return [];
  if (isLocalOnly(userId)) {
    return getLocal('kinchronicles_images', []);
  }

  try {
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
  } catch (error) {
    console.warn("Supabase listImages failed, falling back to local images:", error);
    return getLocal('kinchronicles_images', []);
  }
};

/**
 * Delete an image
 */
export const deleteImage = async (filePath) => {
  const images = getLocal('kinchronicles_images', []).filter(img => img.path !== filePath);
  setLocal('kinchronicles_images', images);

  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Supabase deleteImage failed:", error);
    return true;
  }
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

  if (isLocalOnly(userId)) {
    const timelines = getLocal('kinchronicles_timelines', []);
    const id = timelineId || generateId();
    const existingIndex = timelines.findIndex(t => t.id === id);
    const saved = { id, ...payload };
    if (existingIndex >= 0) {
      timelines[existingIndex] = saved;
    } else {
      timelines.unshift(saved);
    }
    setLocal('kinchronicles_timelines', timelines);
    return saved;
  }

  try {
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
    console.warn("Supabase saveTimeline failed, using local storage:", err);
    const timelines = getLocal('kinchronicles_timelines', []);
    const id = timelineId || generateId();
    const saved = { id, ...payload };
    timelines.unshift(saved);
    setLocal('kinchronicles_timelines', timelines);
    return saved;
  }
};

export const loadTimelines = async (userId) => {
  if (!userId) return [];
  if (isLocalOnly(userId)) {
    return getLocal('kinchronicles_timelines', []);
  }

  try {
    const { data, error } = await supabase.from('timelines').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase loadTimelines failed, using local storage:", err);
    return getLocal('kinchronicles_timelines', []);
  }
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

  if (isLocalOnly(userId)) {
    const cals = getLocal('kinchronicles_calendars', []);
    const id = calendarId || generateId();
    const existingIndex = cals.findIndex(c => c.id === id);
    const saved = { id, ...payload };
    if (existingIndex >= 0) {
      cals[existingIndex] = saved;
    } else {
      cals.unshift(saved);
    }
    setLocal('kinchronicles_calendars', cals);
    return saved;
  }

  try {
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
    console.warn("Supabase saveCalendar failed, using local storage:", err);
    const cals = getLocal('kinchronicles_calendars', []);
    const id = calendarId || generateId();
    const saved = { id, ...payload };
    cals.unshift(saved);
    setLocal('kinchronicles_calendars', cals);
    return saved;
  }
};

export const loadCalendars = async (userId) => {
  if (!userId) return [];
  if (isLocalOnly(userId)) {
    return getLocal('kinchronicles_calendars', []);
  }

  try {
    const { data, error } = await supabase.from('calendars').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase loadCalendars failed, using local storage:", err);
    return getLocal('kinchronicles_calendars', []);
  }
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

  if (isLocalOnly(userId)) {
    const lists = getLocal('kinchronicles_name_lists', []);
    const id = listId || generateId();
    const existingIndex = lists.findIndex(l => l.id === id);
    const saved = { id, ...payload };
    if (existingIndex >= 0) {
      lists[existingIndex] = saved;
    } else {
      lists.unshift(saved);
    }
    setLocal('kinchronicles_name_lists', lists);
    return saved;
  }

  try {
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
    console.warn("Supabase saveNameList failed, using local storage:", err);
    const lists = getLocal('kinchronicles_name_lists', []);
    const id = listId || generateId();
    const saved = { id, ...payload };
    lists.unshift(saved);
    setLocal('kinchronicles_name_lists', lists);
    return saved;
  }
};

export const loadNameLists = async (userId) => {
  if (!userId) return [];
  if (isLocalOnly(userId)) {
    return getLocal('kinchronicles_name_lists', []);
  }

  try {
    const { data, error } = await supabase.from('name_lists').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase loadNameLists failed, using local storage:", err);
    return getLocal('kinchronicles_name_lists', []);
  }
};

export const deleteNameList = async (listId, userId) => {
  const localLists = getLocal('kinchronicles_name_lists', []).filter(l => l.id !== listId);
  setLocal('kinchronicles_name_lists', localLists);

  if (isLocalOnly(userId)) return true;

  try {
    const { error } = await supabase.from('name_lists').delete().eq('id', listId).eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Supabase deleteNameList failed:", error);
    return true;
  }
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

  if (isLocalOnly(userId)) {
    const manuscripts = getLocal('kinchronicles_manuscripts', []);
    const id = manuscriptId || generateId();
    const existingIndex = manuscripts.findIndex(m => m.id === id);
    const saved = { id, ...payload };
    if (existingIndex >= 0) {
      manuscripts[existingIndex] = saved;
    } else {
      manuscripts.unshift(saved);
    }
    setLocal('kinchronicles_manuscripts', manuscripts);
    return saved;
  }

  try {
    if (manuscriptId) {
      const { data: res, error } = await supabase.from('manuscripts').update(payload).eq('id', manuscriptId).eq('user_id', userId).select().single();
      if (error) throw error;
      return res;
    } else {
      const { data: res, error } = await supabase.from('manuscripts').insert(payload).select().single();
      if (error) throw error;
      return res;
    }
  } catch (err) {
    console.warn("Supabase saveManuscript failed, using local storage:", err);
    const manuscripts = getLocal('kinchronicles_manuscripts', []);
    const id = manuscriptId || generateId();
    const saved = { id, ...payload };
    manuscripts.unshift(saved);
    setLocal('kinchronicles_manuscripts', manuscripts);
    return saved;
  }
};

export const loadManuscripts = async (userId) => {
  if (!userId) return [];
  if (isLocalOnly(userId)) {
    return getLocal('kinchronicles_manuscripts', []);
  }

  try {
    const { data, error } = await supabase.from('manuscripts').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase loadManuscripts failed, using local storage:", err);
    return getLocal('kinchronicles_manuscripts', []);
  }
};

export const deleteManuscriptApi = async (manuscriptId, userId) => {
  const localManuscripts = getLocal('kinchronicles_manuscripts', []).filter(m => m.id !== manuscriptId);
  setLocal('kinchronicles_manuscripts', localManuscripts);

  if (isLocalOnly(userId)) return true;

  try {
    const { error } = await supabase.from('manuscripts').delete().eq('id', manuscriptId).eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Supabase deleteManuscriptApi failed:", error);
    return true;
  }
};

