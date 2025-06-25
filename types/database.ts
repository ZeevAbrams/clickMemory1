export interface Snippet {
  id: string
  title: string
  system_role: string
  content: string
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface SharedSnippet {
  id: string
  snippet_id: string
  shared_with_user_id: string
  permission: 'view' | 'edit'
  created_at: string
}

export interface Profile {
  id: string
  email: string
  display_name?: string
  created_at: string
} 