// f:\AI\Ki_9\planmastervn9-new\utils\idUtils.ts
export const generateUniqueId = (prefix: string = 'id'): string => 
  `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;