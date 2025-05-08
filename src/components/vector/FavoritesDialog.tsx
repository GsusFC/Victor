import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVectorStore } from '@/lib/store';
import { AnimationFavorite } from '@/components/vector/core/types';

interface FavoritesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesDialog({ open, onOpenChange }: FavoritesDialogProps) {
  const [newFavoriteName, setNewFavoriteName] = useState('');
  const [editingFavorite, setEditingFavorite] = useState<AnimationFavorite | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const actions = useVectorStore(state => state.actions);
  const animationFavorites = useVectorStore(state => state.animationFavorites);

  // Ordenar favoritos por timestamp (más recientes primero)
  const sortedFavorites = [...animationFavorites].sort((a, b) => b.timestamp - a.timestamp);

  const handleSave = () => {
    if (!newFavoriteName.trim()) return;
    
    actions.saveAnimationFavorite(newFavoriteName);
    setNewFavoriteName('');
    showSuccessMessage('Configuración guardada');
  };

  const handleUpdate = () => {
    if (editingFavorite && newFavoriteName.trim()) {
      actions.renameAnimationFavorite(editingFavorite.id, newFavoriteName);
      setEditingFavorite(null);
      setNewFavoriteName('');
      showSuccessMessage('Favorito renombrado');
    }
  };

  const handleDelete = (id: string) => {
    actions.deleteAnimationFavorite(id);
    setConfirmDeleteId(null);
    showSuccessMessage('Favorito eliminado');
  };

  const handleLoad = (id: string) => {
    actions.loadAnimationFavorite(id);
    showSuccessMessage('Configuración cargada');
  };

  const startEdit = (favorite: AnimationFavorite) => {
    setEditingFavorite(favorite);
    setNewFavoriteName(favorite.name);
  };

  const cancelEdit = () => {
    setEditingFavorite(null);
    setNewFavoriteName('');
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Favoritos de Animación</DialogTitle>
        </DialogHeader>

        {/* Feedback de éxito */}
        {successMessage && (
          <div className="bg-green-500/10 text-green-600 text-sm p-2 rounded-md border border-green-500/20 mb-4">
            {successMessage}
          </div>
        )}

        {/* Área de guardar/editar favorito */}
        <div className="mb-4 bg-muted/30 p-3 rounded-md">
          <div className="mb-3">
            <Label htmlFor="favorite-name">
              {editingFavorite ? 'Renombrar favorito' : 'Guardar configuración actual'}
            </Label>
            <div className="flex mt-2 gap-2">
              <Input
                id="favorite-name"
                value={newFavoriteName}
                onChange={(e) => setNewFavoriteName(e.target.value)}
                placeholder="Nombre del favorito"
                className="flex-1"
              />
              {editingFavorite ? (
                <>
                  <Button onClick={handleUpdate} disabled={!newFavoriteName.trim()}>
                    Actualizar
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={handleSave} disabled={!newFavoriteName.trim()}>
                  Guardar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de favoritos */}
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted px-4 py-2 font-medium text-sm border-b">
            Mis Configuraciones ({sortedFavorites.length})
          </div>
          
          <div className="max-h-[350px] overflow-y-auto">
            {sortedFavorites.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No hay configuraciones guardadas.
              </div>
            ) : (
              <div className="divide-y">
                {sortedFavorites.map((favorite) => (
                  <div key={favorite.id} className="p-3 hover:bg-muted/50 transition-colors">
                    {confirmDeleteId === favorite.id ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">¿Eliminar "{favorite.name}"?</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(favorite.id)}
                          >
                            Eliminar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{favorite.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(favorite.timestamp).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleLoad(favorite.id)}
                          >
                            Cargar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEdit(favorite)}
                            title="Renombrar"
                          >
                            ✎
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setConfirmDeleteId(favorite.id)}
                            className="text-destructive"
                            title="Eliminar"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
