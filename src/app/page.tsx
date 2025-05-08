"use client";

import React, { useState, useEffect } from 'react';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { AnimationControlsUnified } from '@/components/columns/AnimationControlsUnified';
import { VectorPropertiesUnified } from '@/components/columns/VectorPropertiesUnified';
import ExportDialog from '@/components/vector/ExportDialog';
import NewVectorCanvas from '@/components/vector/NewVectorCanvas';
import { exportDialogState } from '@/hooks/vector/useExportDialog';


export default function Home() {
  // Estado local para reflejar el estado global del diálogo
  const [exportDialogOpen, setExportDialogOpen] = useState(exportDialogState.isOpen);
  
  // Sincronizar con el estado global del diálogo
  useEffect(() => {
    const handleExportDialogChange = (e: CustomEvent) => {
      setExportDialogOpen(e.detail);
    };
    
    // Suscribirse al evento personalizado
    window.addEventListener('export-dialog-change', handleExportDialogChange as EventListener);
    
    return () => {
      window.removeEventListener('export-dialog-change', handleExportDialogChange as EventListener);
    };
  }, []);
  
  // Desactivar completamente TODOS los eventos de teclado globales cuando se está en un input
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Verifica si el evento proviene de un input o textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Prevenir que cualquier otro detector de eventos lo maneje
        e.stopPropagation();
      }
    };
    
    // Capturar eventos en la fase de captura, para actuar antes que otros handlers
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('keyup', handleGlobalKeyDown, true);
    document.addEventListener('keypress', handleGlobalKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keyup', handleGlobalKeyDown, true);
      document.removeEventListener('keypress', handleGlobalKeyDown, true);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Layout de tres columnas con controles unificados */}
      <ThreeColumnLayout
        leftContent={<AnimationControlsUnified />}
        centerContent={
          <div className="w-full h-full flex justify-center items-center">
            {/* Contenedor sin padding para maximizar espacio disponible */}
            <NewVectorCanvas />
          </div>
        }
        rightContent={<VectorPropertiesUnified />}
      />
      
      {/* Modal de exportación */}
      <ExportDialog 
        open={exportDialogOpen} 
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          exportDialogState.setIsOpen(open);
        }} 
      />
      
      {/* Información sobre la versión */}
      <div className="fixed bottom-4 right-4 bg-black/50 text-white text-xs p-2 rounded-md">
        <p>Vector Canvas Mejorado</p>
      </div>
    </div>
  );
}
