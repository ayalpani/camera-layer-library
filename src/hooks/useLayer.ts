import { useState, useCallback, useMemo } from 'react';
import { UseLayerReturn, Layer } from '../types';

export function useLayer(initialLayers: Layer[] = []): UseLayerReturn {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  
  // Add a new layer
  const addLayer = useCallback((layer: Layer) => {
    setLayers(prevLayers => {
      // Check if layer already exists
      if (prevLayers.some(l => l.id === layer.id)) {
        console.warn(`Layer with id "${layer.id}" already exists`);
        return prevLayers;
      }
      return [...prevLayers, layer];
    });
  }, []);
  
  // Remove a layer by ID
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prevLayers => prevLayers.filter(l => l.id !== layerId));
  }, []);
  
  // Update a layer
  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, ...updates, id: layer.id } // Preserve ID
          : layer
      )
    );
  }, []);
  
  // Get layer by ID
  const getLayerById = useCallback((layerId: string): Layer | undefined => {
    return layers.find(l => l.id === layerId);
  }, [layers]);
  
  // Memoize sorted layers for rendering
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [layers]);
  
  return {
    layers: sortedLayers,
    addLayer,
    removeLayer,
    updateLayer,
    getLayerById,
  };
}