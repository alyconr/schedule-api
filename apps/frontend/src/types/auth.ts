export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CoordinationScopeItem {
  id: number;
  code: string;
  name: string;
}

export interface AccessScope {
  is_global: boolean;
  coordinations: CoordinationScopeItem[];
}

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  scope: AccessScope;
}

export type Specialty = {
  id: number;
  coordination_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

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
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  coordination_id?: number | null;
  specialty_id?: number | null;
  coordination_name?: string | null;
  specialty_name?: string | null;
  roles: string[];
  coordination_ids: number[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserCreate = {
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password: string;
  confirm_password?: string;
  coordination_id?: number | null;
  specialty_id?: number | null;
  roles: string[];
  coordination_ids: number[];
};

export type UserUpdate = {
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string;
  confirm_password?: string;
  coordination_id?: number | null;
  specialty_id?: number | null;
  is_active?: boolean;
  roles?: string[];
  coordination_ids?: number[];
};

