/**
 * ConfigMenu - Menú para exportar/importar configuraciones
 * Permite guardar y cargar toda la configuración del estado
 */

'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Copy, Clipboard, FileJson } from 'lucide-react';
import { useVectorStore } from '@/store/vectorStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  downloadConfig,
  copyConfigToClipboard,
  pasteConfigFromClipboard,
  importConfigFromFile,
} from '@/lib/config-export';

export function ConfigMenu() {
  const state = useVectorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Simple notification function (placeholder for toast)
  const showNotification = (title: string, description: string, isError = false) => {
    console.log(`[${isError ? 'ERROR' : 'INFO'}] ${title}: ${description}`);
    // TODO: Implement proper toast notifications
  };

  const handleExportJSON = () => {
    downloadConfig(state);
    showNotification('Configuración exportada', 'El archivo JSON ha sido descargado');
    setIsOpen(false);
  };

  const handleCopyToClipboard = async () => {
    const success = await copyConfigToClipboard(state);
    if (success) {
      showNotification('Copiado al portapapeles', 'La configuración ha sido copiada');
    } else {
      showNotification('Error', 'No se pudo copiar al portapapeles', true);
    }
    setIsOpen(false);
  };

  const handlePasteFromClipboard = async () => {
    const config = await pasteConfigFromClipboard();
    if (config) {
      state.actions.importConfig(config.config);
      showNotification(
        'Configuración importada',
        config.name
          ? `"${config.name}" cargada correctamente`
          : 'Configuración cargada desde el portapapeles'
      );
    } else {
      showNotification('Error', 'No se pudo leer la configuración del portapapeles', true);
    }
    setIsOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const config = await importConfigFromFile(file);
    if (config) {
      state.actions.importConfig(config.config);
      showNotification(
        'Configuración importada',
        config.name
          ? `"${config.name}" cargada correctamente`
          : `Archivo "${file.name}" importado`
      );
    } else {
      showNotification('Error', 'El archivo no tiene un formato válido', true);
    }

    // Reset input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2"
            title="Exportar/Importar configuración"
          >
            <FileJson className="w-4 h-4" />
            <span className="hidden md:inline">Config</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-mono uppercase text-muted-foreground">
            Exportar
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExportJSON} className="gap-2 cursor-pointer">
            <Download className="w-4 h-4" />
            <span>Descargar JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyToClipboard} className="gap-2 cursor-pointer">
            <Copy className="w-4 h-4" />
            <span>Copiar al portapapeles</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs font-mono uppercase text-muted-foreground">
            Importar
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleImportClick} className="gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Cargar desde archivo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePasteFromClipboard} className="gap-2 cursor-pointer">
            <Clipboard className="w-4 h-4" />
            <span>Pegar del portapapeles</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
