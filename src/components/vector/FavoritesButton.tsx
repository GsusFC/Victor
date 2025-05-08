import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FavoritesDialog } from './FavoritesDialog';
import { useVectorStore } from '@/lib/store';

export function FavoritesButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const favorites = useVectorStore(state => state.animationFavorites);
  const favoritesCount = favorites.length;

  return (
    <>
      <Button 
        onClick={() => setDialogOpen(true)}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs py-2 px-3 font-mono uppercase flex items-center justify-center"
      >
        <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
            strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
        Favoritos
        {favoritesCount > 0 && (
          <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {favoritesCount}
          </span>
        )}
      </Button>

      <FavoritesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
