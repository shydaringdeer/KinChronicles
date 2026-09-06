-- Create the name_lists table
CREATE TABLE public.name_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'character' or 'dynasty'
  data jsonb DEFAULT '{}'::jsonb, -- stores the actual names, e.g. { names: [{name, gender}, ...] }
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.name_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own name lists
CREATE POLICY "Users can view their own name lists."
  ON public.name_lists FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own name lists
CREATE POLICY "Users can insert their own name lists."
  ON public.name_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own name lists
CREATE POLICY "Users can update their own name lists."
  ON public.name_lists FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own name lists
CREATE POLICY "Users can delete their own name lists."
  ON public.name_lists FOR DELETE
  USING (auth.uid() = user_id);
