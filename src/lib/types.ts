export interface ShortLink {
  code: string;
  targetUrl: string;
  title?: string;
  clicks: number;
  createdAt: string;
  lastClickedAt?: string;
  isActive: boolean;
}

export type StorageType = 'redis' | 'local_file' | 'in_memory';

export interface StorageStatus {
  type: StorageType;
  isReady: boolean;
  message: string;
}

export interface CreateLinkInput {
  targetUrl: string;
  code?: string;
  title?: string;
}

export interface UpdateLinkInput {
  targetUrl?: string;
  title?: string;
  isActive?: boolean;
}
