// f:\AI\Ki_9\planmastervn9-new\utils\helpers.ts

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const cleanForFirestore = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanForFirestore(item));
    }
    if (data !== null && typeof data === 'object') {
        if (typeof data.toDate === 'function') { // Firestore Timestamp
            return data;
        }
        if (data instanceof Date) { // Native Date object
            return data;
        }
        const cleanedData: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (value !== undefined) { // Remove undefined fields
                    cleanedData[key] = cleanForFirestore(value);
                }
            }
        }
        return cleanedData;
    }
    return data;
};

export const formatLastActive = (isoString?: string): { text: string; isOnline: boolean } => {
    if (!isoString) {
        return { text: 'Chưa từng hoạt động', isOnline: false };
    }

    const lastActive = new Date(isoString);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastActive.getTime()) / 1000;

    if (diffSeconds < 300) { // Less than 5 minutes is considered "Online"
        return { text: 'Online', isOnline: true };
    }
    if (diffSeconds < 3600) { // Less than 1 hour
        const minutes = Math.floor(diffSeconds / 60);
        return { text: `${minutes} phút trước`, isOnline: false };
    }
    if (diffSeconds < 86400) { // Less than 1 day
        const hours = Math.floor(diffSeconds / 3600);
        return { text: `${hours} giờ trước`, isOnline: false };
    }
    if (diffSeconds < 86400 * 2) { // Yesterday
        return { text: 'Hôm qua', isOnline: false };
    }
    const days = Math.floor(diffSeconds / 86400);
    return { text: `${days} ngày trước`, isOnline: false };
};