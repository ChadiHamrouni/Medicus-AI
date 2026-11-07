export const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'file-image';
    if (mimeType === 'application/pdf') return 'file-pdf-box';
    if (mimeType.startsWith('audio/')) return 'file-music';
    return 'file-document';
};

export const getFileIconColor = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return '#EA4335';
    if (mimeType.startsWith('image/')) return '#4285F4';
    if (mimeType.startsWith('audio/')) return '#9C27B0';
    return '#34A853';
};

export const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
        });
    } catch {
        return iso;
    }
};

export const formatTime = (iso: string): string => {
    try {
        return new Date(iso).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '';
    }
};

export const formatFullDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '';
    }
};
