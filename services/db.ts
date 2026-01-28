// A simple Promise-based wrapper around IndexedDB for storing image data
const DB_NAME = 'StickerStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_LAYERS = 'layers'; // Stores layer image data: key = {projectId}_{stickerIndex}_{layerId}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LAYERS)) {
        db.createObjectStore(STORE_LAYERS); // Key will be a string
      }
    };
  });
};

export const saveProject = async (project: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadProjects = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const request = tx.objectStore(STORE_PROJECTS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getProject = async (id: string): Promise<any> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const request = tx.objectStore(STORE_PROJECTS).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

// Save a specific layer's image data (base64)
export const saveLayerImage = async (key: string, dataUrl: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LAYERS, 'readwrite');
    tx.objectStore(STORE_LAYERS).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Load a specific layer's image data
export const loadLayerImage = async (key: string): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LAYERS, 'readonly');
    const request = tx.objectStore(STORE_LAYERS).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Delete all data associated with a project (cleanup)
export const deleteProjectData = async (projectId: string): Promise<void> => {
    const db = await initDB();
    // Complex deletion in IDB usually requires cursors, for MVP we just delete the project meta
    // In a real app, we'd iterate keys and delete layer data starting with projectId
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        tx.objectStore(STORE_PROJECTS).delete(projectId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}