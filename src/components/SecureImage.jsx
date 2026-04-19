import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';

export default function SecureImage({ path, alt = 'Attached photo', size = 100 }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSignedUrl() {
      if (!path) return;
      try {
        setLoading(true);
        const { data, error: signedUrlError } = await supabase.storage
          .from('notes_photos')
          .createSignedUrl(path, 60 * 60); // 1 hour expiry

        if (signedUrlError) throw signedUrlError;
        
        if (isMounted && data?.signedUrl) {
          setSrc(data.signedUrl);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading image:', err);
          setError('Failed to load image');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (loading) {
    return (
      <div className="secure-image-placeholder" style={{ width: size, height: size, justifyContent: 'center' }}>
        <Loader2 className="spinning" size={16} color="var(--gold-300)" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="secure-image-placeholder error" style={{ width: size, height: size, justifyContent: 'center' }}>
        <ImageIcon size={16} color="var(--error)" />
      </div>
    );
  }

  return (
    <>
      <div className="secure-image-wrapper" onClick={() => setIsFullscreen(true)} style={{ marginTop: 0, marginRight: 0 }}>
        <img src={src} alt={alt} className="secure-image-thumbnail" loading="lazy" style={{ width: size, height: size }} />
        <div className="secure-image-overlay">
          <ExternalLink size={16} />
        </div>
      </div>

      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          <img src={src} alt={alt} className="fullscreen-image" />
          <button className="btn-close-fullscreen" onClick={() => setIsFullscreen(false)}>
            Close
          </button>
        </div>
      )}
    </>
  );
}
