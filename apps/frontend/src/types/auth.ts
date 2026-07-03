export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

export type Role = {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserCreate = {
  email: string;
  full_name: string;
  password: string;
  roles: string[];
};

export type UserUpdate = {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  roles?: string[];
};
