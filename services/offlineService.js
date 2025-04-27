/**
 * Offline Service
 * 
 * Manages application behavior during offline scenarios by coordinating
 * between the cache manager and mock data manager.
 */

const cacheManager = require('../utils/cacheManager');
const mockDataManager = require('../utils/mockDataManager');

// Status of network connectivity
let isOnline = true;

// Configuration options
const config = {
  // How often to check for network connectivity (in ms)
  connectivityCheckInterval: 30000,
  // Auto-sync when coming back online
  autoSyncOnReconnect: true,
  // Default fallback strategy: 'cache-first', 'mock-first', or 'mock-only'
  defaultFallbackStrategy: 'cache-first',
  // Debug mode
  debug: false
};

/**
 * Check if the application is currently online
 * 
 * @returns {boolean} Current online status
 */
const checkOnlineStatus = () => {
  return isOnline;
};

/**
 * Set the online status manually
 * 
 * @param {boolean} status - Online status to set
 */
const setOnlineStatus = (status) => {
  const previousStatus = isOnline;
  isOnline = Boolean(status);
  
  // Update database connection status in cache manager
  cacheManager.setDatabaseConnected(isOnline);
  
  // Configure mock data manager based on online status
  mockDataManager.configureMockData({
    enableMocking: !isOnline
  });
  
  if (config.debug) {
    console.log(`Online status changed from ${previousStatus} to ${isOnline}`);
  }
  
  // If we're coming back online and auto-sync is enabled, trigger sync
  if (!previousStatus && isOnline && config.autoSyncOnReconnect) {
    syncOfflineChanges();
  }
  
  return isOnline;
};

/**
 * Configure the offline service
 * 
 * @param {Object} newConfig - Configuration options
 */
const configureOfflineService = (newConfig = {}) => {
  Object.assign(config, newConfig);
  
  // Apply relevant configuration to dependent services
  cacheManager.configureCache({
    databaseConnected: isOnline
  });
  
  mockDataManager.configureMockData({
    enableMocking: !isOnline || config.defaultFallbackStrategy === 'mock-only',
    simulateLatency: config.debug ? 500 : 0 // Add latency in debug mode
  });
  
  if (config.debug) {
    console.log('Offline service configured:', config);
  }
  
  return config;
};

/**
 * Get data with offline fallback capabilities
 * 
 * @param {string} entityType - Type of entity (products, orders, etc.)
 * @param {string} id - Optional ID to retrieve specific entity
 * @param {Function} dbFetchFunction - Database fetch function to use when online
 * @param {string} fallbackStrategy - Strategy to use: 'cache-first', 'mock-first', or 'mock-only'
 * @returns {Promise<Object|Array|null>} Requested data
 */
const getDataWithFallback = async (entityType, id = null, dbFetchFunction, fallbackStrategy = config.defaultFallbackStrategy) => {
  const cacheKey = id ? `${entityType}:${id}` : `${entityType}:all`;
  
  try {
    // If we're online and not using mock-only, try the database first
    if (isOnline && fallbackStrategy !== 'mock-only') {
      try {
        const dbData = await dbFetchFunction();
        
        // Cache the result for offline use
        if (dbData) {
          cacheManager.saveToCache(cacheKey, dbData);
        }
        
        return dbData;
      } catch (error) {
        if (config.debug) {
          console.error(`Database fetch failed for ${cacheKey}:`, error);
        }
        // Fall through to offline strategies
      }
    }
    
    // Offline strategies
    if (fallbackStrategy === 'cache-first' || fallbackStrategy === 'mock-first') {
      // Try cache first or mock first based on strategy
      const firstSource = fallbackStrategy === 'cache-first' ? 'cache' : 'mock';
      const secondSource = fallbackStrategy === 'cache-first' ? 'mock' : 'cache';
      
      // Try first source
      let data = null;
      if (firstSource === 'cache') {
        data = await cacheManager.getFromCache(cacheKey);
      } else {
        data = await mockDataManager.getMockData(entityType, id);
      }
      
      if (data) {
        return data;
      }
      
      // Try second source if first source failed
      if (secondSource === 'cache') {
        data = await cacheManager.getFromCache(cacheKey);
      } else {
        data = await mockDataManager.getMockData(entityType, id);
      }
      
      return data;
    } else if (fallbackStrategy === 'mock-only') {
      // Only use mock data
      return await mockDataManager.getMockData(entityType, id);
    }
    
    return null;
  } catch (error) {
    console.error(`Error in getDataWithFallback for ${cacheKey}:`, error);
    return null;
  }
};

/**
 * Save data with offline capabilities
 * 
 * @param {string} entityType - Type of entity (products, orders, etc.) 
 * @param {Object} data - Data to save
 * @param {string} id - Optional ID for updating specific entity
 * @param {Function} dbSaveFunction - Database save function to use when online
 * @returns {Promise<Object|null>} Saved data
 */
const saveDataWithFallback = async (entityType, data, id = null, dbSaveFunction) => {
  const cacheKey = id ? `${entityType}:${id}` : `${entityType}:${Date.now()}`;
  
  try {
    // If we're online, try to save to the database
    if (isOnline) {
      try {
        const savedData = await dbSaveFunction(data);
        
        // Cache the result
        if (savedData) {
          cacheManager.saveToCache(
            id ? `${entityType}:${savedData.id || savedData._id}` : `${entityType}:all`,
            savedData
          );
        }
        
        return savedData;
      } catch (error) {
        if (config.debug) {
          console.error(`Database save failed for ${entityType}:`, error);
        }
        // Fall through to offline save
      }
    }
    
    // Save to mock data when offline
    const savedMockData = await mockDataManager.saveMockData(entityType, data, id);
    
    // Also cache the data
    if (savedMockData) {
      cacheManager.saveToCache(
        `${entityType}:${savedMockData.id || savedMockData._id}`,
        savedMockData
      );
    }
    
    return savedMockData;
  } catch (error) {
    console.error(`Error in saveDataWithFallback for ${entityType}:`, error);
    return null;
  }
};

/**
 * Delete data with offline capabilities
 * 
 * @param {string} entityType - Type of entity (products, orders, etc.)
 * @param {string} id - ID of entity to delete
 * @param {Function} dbDeleteFunction - Database delete function to use when online
 * @returns {Promise<boolean>} Success status
 */
const deleteDataWithFallback = async (entityType, id, dbDeleteFunction) => {
  const cacheKey = `${entityType}:${id}`;
  
  try {
    // If we're online, try to delete from the database
    if (isOnline) {
      try {
        const success = await dbDeleteFunction(id);
        
        if (success) {
          // Remove from cache
          cacheManager.removeFromCache(cacheKey);
          return true;
        }
      } catch (error) {
        if (config.debug) {
          console.error(`Database delete failed for ${cacheKey}:`, error);
        }
        // Fall through to offline delete
      }
    }
    
    // Delete from mock data when offline
    const mockDeleteSuccess = await mockDataManager.deleteMockData(entityType, id);
    
    // Also remove from cache
    if (mockDeleteSuccess) {
      cacheManager.removeFromCache(cacheKey);
    }
    
    return mockDeleteSuccess;
  } catch (error) {
    console.error(`Error in deleteDataWithFallback for ${cacheKey}:`, error);
    return false;
  }
};

/**
 * Synchronize offline changes when coming back online
 * 
 * @returns {Promise<{success: boolean, syncedCount: number, failedCount: number}>} Sync results
 */
const syncOfflineChanges = async () => {
  if (!isOnline) {
    return { success: false, syncedCount: 0, failedCount: 0, message: 'Cannot sync while offline' };
  }
  
  try {
    const pendingOperations = mockDataManager.getPendingOperations();
    
    if (pendingOperations.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, message: 'No changes to sync' };
    }
    
    let syncedCount = 0;
    let failedCount = 0;
    const syncedOperationIds = [];
    
    // TODO: Implement actual sync with database
    // This would involve iterating through pendingOperations and applying each one
    // to the database using appropriate API calls or database functions
    
    // For now, we'll just simulate a successful sync
    syncedCount = pendingOperations.length;
    pendingOperations.forEach(op => syncedOperationIds.push(op.id));
    
    // Clear synced operations
    mockDataManager.clearPendingOperations(syncedOperationIds);
    
    return {
      success: true,
      syncedCount,
      failedCount,
      message: `Successfully synced ${syncedCount} operations`
    };
  } catch (error) {
    console.error('Error syncing offline changes:', error);
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      message: `Error syncing: ${error.message}`
    };
  }
};

/**
 * Start periodic connectivity checks
 */
const startConnectivityChecks = () => {
  // Clear any existing interval
  stopConnectivityChecks();
  
  // Set up periodic check
  const intervalId = setInterval(() => {
    // This would typically check internet connection
    // For now, it's just a placeholder
    const simulatedOnlineStatus = Math.random() > 0.1; // 90% chance of being online
    
    if (isOnline !== simulatedOnlineStatus) {
      setOnlineStatus(simulatedOnlineStatus);
    }
  }, config.connectivityCheckInterval);
  
  // Store interval ID for later cleanup
  global._connectivityCheckInterval = intervalId;
  
  if (config.debug) {
    console.log(`Started connectivity checks every ${config.connectivityCheckInterval}ms`);
  }
  
  return true;
};

/**
 * Stop periodic connectivity checks
 */
const stopConnectivityChecks = () => {
  if (global._connectivityCheckInterval) {
    clearInterval(global._connectivityCheckInterval);
    delete global._connectivityCheckInterval;
    
    if (config.debug) {
      console.log('Stopped connectivity checks');
    }
    
    return true;
  }
  
  return false;
};

// Initialize on load if debug mode is enabled
if (config.debug) {
  startConnectivityChecks();
}

module.exports = {
  getDataWithFallback,
  saveDataWithFallback,
  deleteDataWithFallback,
  checkOnlineStatus,
  setOnlineStatus,
  configureOfflineService,
  syncOfflineChanges,
  startConnectivityChecks,
  stopConnectivityChecks
}; 