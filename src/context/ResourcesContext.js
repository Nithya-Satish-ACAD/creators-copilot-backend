import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getCourseResources } from '../services/resources';

const ResourcesContext = createContext();

export const useResources = () => {
  const context = useContext(ResourcesContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourcesProvider');
  }
  return context;
};

export const ResourcesProvider = ({ children }) => {
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  const loadResources = useCallback(async (courseId) => {
    if (!courseId) return;
    
    // Prevent duplicate requests
    if (loading[courseId]) return;
    
    try {
      setLoading(prev => ({ ...prev, [courseId]: true }));
      setError(prev => ({ ...prev, [courseId]: null }));
      
      const response = await getCourseResources(courseId);
      setResources(prev => ({ 
        ...prev, 
        [courseId]: response.resources || [] 
      }));
    } catch (err) {
      console.error('Error loading resources for course:', courseId, err);
      setError(prev => ({ 
        ...prev, 
        [courseId]: err.message || 'Failed to load resources' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [courseId]: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateResource = useCallback((courseId, fileId, updates) => {
    setResources(prev => ({
      ...prev,
      [courseId]: prev[courseId]?.map(resource => 
        resource.fileId === fileId 
          ? { ...resource, ...updates }
          : resource
      ) || []
    }));
  }, []);

  const addResource = useCallback((courseId, resource) => {
    setResources(prev => ({
      ...prev,
      [courseId]: [...(prev[courseId] || []), resource]
    }));
  }, []);

  const removeResource = useCallback((courseId, fileId) => {
    setResources(prev => ({
      ...prev,
      [courseId]: prev[courseId]?.filter(resource => resource.fileId !== fileId) || []
    }));
  }, []);

  const getResources = useCallback((courseId) => {
    return resources[courseId] || [];
  }, [resources]);

  const isLoading = useCallback((courseId) => {
    return loading[courseId] || false;
  }, [loading]);

  const getError = useCallback((courseId) => {
    return error[courseId] || null;
  }, [error]);

  const clearError = useCallback((courseId) => {
    setError(prev => ({ ...prev, [courseId]: null }));
  }, []);

  const refreshResources = useCallback(async (courseId) => {
    if (!courseId) return;
    
    try {
      setLoading(prev => ({ ...prev, [courseId]: true }));
      setError(prev => ({ ...prev, [courseId]: null }));
      
      const response = await getCourseResources(courseId);
      setResources(prev => ({ 
        ...prev, 
        [courseId]: response.resources || [] 
      }));
    } catch (err) {
      console.error('Error refreshing resources for course:', courseId, err);
      setError(prev => ({ 
        ...prev, 
        [courseId]: err.message || 'Failed to refresh resources' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [courseId]: false }));
    }
  }, []);

  const value = useMemo(() => ({
    resources,
    loadResources,
    updateResource,
    addResource,
    removeResource,
    getResources,
    isLoading,
    getError,
    clearError,
    refreshResources
  }), [
    resources,
    loadResources,
    updateResource,
    addResource,
    removeResource,
    getResources,
    isLoading,
    getError,
    clearError,
    refreshResources
  ]);

  return (
    <ResourcesContext.Provider value={value}>
      {children}
    </ResourcesContext.Provider>
  );
}; 