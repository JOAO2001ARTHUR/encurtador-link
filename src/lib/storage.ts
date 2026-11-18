import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';
import { ShortLink, StorageStatus, StorageType } from './types';

// In-memory fallback in case filesystem is read-only (such as serverless without Redis)
const memoryStore = new Map<string, ShortLink>();

// Resolve Redis credentials
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisConfigured = Boolean(redisUrl && redisToken);

const redisClient: Redis | null = isRedisConfigured
  ? new Redis({
      url: redisUrl!,
      token: redisToken!,
    })
  : null;

// File-based local storage setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'links.json');

function ensureFileStorage(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialLinks: ShortLink[] = [
        {
          code: 'google',
          targetUrl: 'https://google.com',
          title: 'Link de Exemplo (Google)',
          clicks: 0,
          createdAt: new Date().toISOString(),
          isActive: true,
        },
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialLinks, null, 2), 'utf-8');
    }
    return true;
  } catch (err) {
    console.warn('[Storage] File system not writable, falling back to in-memory:', err);
    return false;
  }
}

function readFromFile(): ShortLink[] {
  try {
    if (ensureFileStorage()) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data) as ShortLink[];
    }
  } catch (err) {
    console.error('[Storage] Error reading links from file:', err);
  }
  return Array.from(memoryStore.values());
}

function writeToFile(links: ShortLink[]): boolean {
  try {
    if (ensureFileStorage()) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), 'utf-8');
      return true;
    }
  } catch (err) {
    console.error('[Storage] Error writing links to file:', err);
  }
  // Update memory store as fallback
  memoryStore.clear();
  for (const link of links) {
    memoryStore.set(link.code, link);
  }
  return false;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (isRedisConfigured && redisClient) {
    try {
      await redisClient.ping();
      return {
        type: 'redis',
        isReady: true,
        message: 'Conectado ao Upstash Redis (Edge & Serverless Otimizado)',
      };
    } catch (err) {
      return {
        type: 'redis',
        isReady: false,
        message: `Falha ao conectar ao Redis: ${(err as Error).message}`,
      };
    }
  }

  const fileWritable = ensureFileStorage();
  if (fileWritable) {
    return {
      type: 'local_file',
      isReady: true,
      message: 'Armazenamento local em arquivo (data/links.json). Conecte Upstash Redis para produção na Vercel.',
    };
  }

  return {
    type: 'in_memory',
    isReady: true,
    message: 'Armazenamento temporário em memória.',
  };
}

export async function getAllLinks(): Promise<ShortLink[]> {
  if (isRedisConfigured && redisClient) {
    try {
      const codes = await redisClient.smembers('links:all');
      if (!codes || codes.length === 0) {
        return [];
      }

      // Pipeline fetch for ultra-fast response
      const pipeline = redisClient.pipeline();
      for (const code of codes) {
        pipeline.get(`link:${code}`);
      }
      const results = await pipeline.exec<ShortLink[]>();
      
      const links: ShortLink[] = [];
      for (const item of results) {
        if (item && typeof item === 'object') {
          links.push(item);
        } else if (typeof item === 'string') {
          try {
            links.push(JSON.parse(item));
          } catch {
            // ignore malformed item
          }
        }
      }

      // Sort descending by creation date
      return links.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.error('[Storage] Redis getAllLinks error:', err);
    }
  }

  const links = readFromFile();
  return links.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getLinkByCode(code: string): Promise<ShortLink | null> {
  const normalizedCode = code.trim().toLowerCase();

  if (isRedisConfigured && redisClient) {
    try {
      const data = await redisClient.get<ShortLink | string>(`link:${normalizedCode}`);
      if (!data) return null;
      if (typeof data === 'string') {
        return JSON.parse(data) as ShortLink;
      }
      return data;
    } catch (err) {
      console.error('[Storage] Redis getLinkByCode error:', err);
    }
  }

  const links = readFromFile();
  return links.find((l) => l.code.toLowerCase() === normalizedCode) || null;
}

export async function saveLink(link: ShortLink): Promise<boolean> {
  const normalizedCode = link.code.trim().toLowerCase();
  const cleanLink: ShortLink = {
    ...link,
    code: normalizedCode,
  };

  if (isRedisConfigured && redisClient) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.set(`link:${normalizedCode}`, JSON.stringify(cleanLink));
      pipeline.sadd('links:all', normalizedCode);
      await pipeline.exec();
      return true;
    } catch (err) {
      console.error('[Storage] Redis saveLink error:', err);
      return false;
    }
  }

  const links = readFromFile();
  const existingIndex = links.findIndex((l) => l.code.toLowerCase() === normalizedCode);
  if (existingIndex >= 0) {
    links[existingIndex] = cleanLink;
  } else {
    links.push(cleanLink);
  }
  writeToFile(links);
  return true;
}

export async function deleteLink(code: string): Promise<boolean> {
  const normalizedCode = code.trim().toLowerCase();

  if (isRedisConfigured && redisClient) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.del(`link:${normalizedCode}`);
      pipeline.srem('links:all', normalizedCode);
      await pipeline.exec();
      return true;
    } catch (err) {
      console.error('[Storage] Redis deleteLink error:', err);
      return false;
    }
  }

  const links = readFromFile();
  const filtered = links.filter((l) => l.code.toLowerCase() !== normalizedCode);
  writeToFile(filtered);
  return true;
}

export async function recordClick(code: string): Promise<void> {
  const normalizedCode = code.trim().toLowerCase();
  const now = new Date().toISOString();

  if (isRedisConfigured && redisClient) {
    try {
      // Fetch link and update click + timestamp
      const link = await getLinkByCode(normalizedCode);
      if (link) {
        link.clicks = (link.clicks || 0) + 1;
        link.lastClickedAt = now;
        await redisClient.set(`link:${normalizedCode}`, JSON.stringify(link));
      }
      return;
    } catch (err) {
      console.error('[Storage] Redis recordClick error:', err);
      return;
    }
  }

  const links = readFromFile();
  const link = links.find((l) => l.code.toLowerCase() === normalizedCode);
  if (link) {
    link.clicks = (link.clicks || 0) + 1;
    link.lastClickedAt = now;
    writeToFile(links);
  }
}
