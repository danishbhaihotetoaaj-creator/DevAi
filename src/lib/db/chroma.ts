import { ChromaClient, Collection, EmbeddingFunction } from 'chromadb';

let chromaClient: ChromaClient | null = null;
let collections: Map<string, Collection> = new Map();

export interface ChromaConfig {
  host: string;
  port: number;
  persistDirectory?: string;
}

export async function getChromaClient(): Promise<ChromaClient> {
  if (!chromaClient) {
    const config: ChromaConfig = {
      host: process.env.CHROMADB_HOST || 'localhost',
      port: parseInt(process.env.CHROMADB_PORT || '8000'),
      persistDirectory: process.env.CHROMADB_PERSIST_DIRECTORY,
    };

    try {
      chromaClient = new ChromaClient({
        path: `http://${config.host}:${config.port}`,
      });

      console.log('ChromaDB Client Connected');
    } catch (error) {
      console.error('Failed to connect to ChromaDB:', error);
      throw new Error('ChromaDB connection failed');
    }
  }

  return chromaClient;
}

export async function getCollection(name: string): Promise<Collection> {
  if (collections.has(name)) {
    return collections.get(name)!;
  }

  try {
    const client = await getChromaClient();
    let collection: Collection;

    try {
      collection = await client.getCollection({ name });
    } catch (error) {
      // Collection doesn't exist, create it
      collection = await client.createCollection({ name });
    }

    collections.set(name, collection);
    return collection;
  } catch (error) {
    console.error(`Failed to get/create collection ${name}:`, error);
    throw error;
  }
}

export async function closeChromaConnection(): Promise<void> {
  if (chromaClient) {
    try {
      await chromaClient.reset();
      chromaClient = null;
      collections.clear();
      console.log('ChromaDB connection closed');
    } catch (error) {
      console.error('Error closing ChromaDB connection:', error);
    }
  }
}

// Vector storage helpers
export async function storeVector(
  collectionName: string,
  documents: string[],
  metadatas: Record<string, any>[],
  ids: string[],
  embeddings?: number[][]
): Promise<void> {
  try {
    const collection = await getCollection(collectionName);
    
    await collection.add({
      ids,
      documents,
      metadatas,
      ...(embeddings && { embeddings }),
    });
  } catch (error) {
    console.error('Failed to store vectors:', error);
    throw error;
  }
}

export async function searchVectors(
  collectionName: string,
  queryEmbeddings: number[],
  nResults: number = 10,
  where?: Record<string, any>
): Promise<{
  ids: string[][];
  distances: number[][];
  metadatas: Record<string, any>[][];
  documents: string[][];
}> {
  try {
    const collection = await getCollection(collectionName);
    
    const results = await collection.query({
      queryEmbeddings: [queryEmbeddings],
      nResults,
      ...(where && { where }),
    });

    return {
      ids: results.ids || [],
      distances: results.distances || [],
      metadatas: results.metadatas || [],
      documents: results.documents || [],
    };
  } catch (error) {
    console.error('Failed to search vectors:', error);
    throw error;
  }
}

export async function deleteVectors(
  collectionName: string,
  ids: string[]
): Promise<void> {
  try {
    const collection = await getCollection(collectionName);
    await collection.delete({ ids });
  } catch (error) {
    console.error('Failed to delete vectors:', error);
    throw error;
  }
}

export async function updateVector(
  collectionName: string,
  id: string,
  document?: string,
  metadata?: Record<string, any>,
  embedding?: number[]
): Promise<void> {
  try {
    const collection = await getCollection(collectionName);
    
    const updateData: any = { id };
    if (document) updateData.document = document;
    if (metadata) updateData.metadata = metadata;
    if (embedding) updateData.embedding = embedding;

    await collection.update(updateData);
  } catch (error) {
    console.error('Failed to update vector:', error);
    throw error;
  }
}

// Collection management
export async function listCollections(): Promise<string[]> {
  try {
    const client = await getChromaClient();
    const collections = await client.listCollections();
    return collections.map(col => col.name);
  } catch (error) {
    console.error('Failed to list collections:', error);
    return [];
  }
}

export async function deleteCollection(name: string): Promise<void> {
  try {
    const client = await getChromaClient();
    await client.deleteCollection({ name });
    collections.delete(name);
  } catch (error) {
    console.error(`Failed to delete collection ${name}:`, error);
    throw error;
  }
}

export async function getCollectionInfo(name: string): Promise<{
  name: string;
  count: number;
  metadata?: Record<string, any>;
}> {
  try {
    const collection = await getCollection(name);
    const count = await collection.count();
    
    return {
      name,
      count,
      metadata: collection.metadata,
    };
  } catch (error) {
    console.error(`Failed to get collection info for ${name}:`, error);
    throw error;
  }
}

// Batch operations for performance
export async function batchStoreVectors(
  collectionName: string,
  batchSize: number = 100,
  documents: string[],
  metadatas: Record<string, any>[],
  ids: string[],
  embeddings?: number[][]
): Promise<void> {
  try {
    const collection = await getCollection(collectionName);
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batchDocs = documents.slice(i, i + batchSize);
      const batchMetadatas = metadatas.slice(i, i + batchSize);
      const batchIds = ids.slice(i, i + batchSize);
      const batchEmbeddings = embeddings ? embeddings.slice(i, i + batchSize) : undefined;

      await collection.add({
        ids: batchIds,
        documents: batchDocs,
        metadatas: batchMetadatas,
        ...(batchEmbeddings && { embeddings: batchEmbeddings }),
      });
    }
  } catch (error) {
    console.error('Failed to batch store vectors:', error);
    throw error;
  }
}

// Health check
export async function checkChromaHealth(): Promise<boolean> {
  try {
    const client = await getChromaClient();
    await client.heartbeat();
    return true;
  } catch (error) {
    console.error('ChromaDB health check failed:', error);
    return false;
  }
}